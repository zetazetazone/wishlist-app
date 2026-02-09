# Domain Pitfalls: Friends System

**Domain:** Friend discovery, social calendar, contact import for gift coordination app
**Researched:** 2026-02-09
**Project Context:** Adding friend layer to existing group-centric React Native + Expo 54 app with Supabase backend

---

## Executive Summary

The critical risks for adding a Friends System center on five themes:

1. **Permission handling for contact import** -- The one-shot nature of permission requests on iOS/Android means users who accidentally deny access are locked out. Combined with GDPR requirements for explicit consent before uploading contact data, the permission flow needs careful design from day one.

2. **Friend request race conditions** -- Two users simultaneously requesting each other is the canonical bidirectional relationship race condition. Unlike groups (where one person creates, others join), friendships are inherently competitive/mutual. The existing group_members patterns don't transfer.

3. **Calendar sync creates duplicates** -- The existing `syncAllBirthdays()` has no deduplication. Adding friend birthdays to sync will compound the problem. Users will accumulate duplicates every time they sync.

4. **RLS policy divergence from groups** -- Friend-based visibility ("can see if mutual friends") requires different RLS patterns than group-based visibility. The existing `is_group_member()` helper can't be copied directly. Views bypass RLS by default in Postgres 15+.

5. **Mental model confusion** -- The app was built around groups. Users may expect "friends" to mean "auto-shared groups" or "see everything about each other." Clear UX separation between friends and groups is essential.

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or major architectural issues.

### Pitfall 1: Contact Import Permission One-Shot Problem

**What goes wrong:** On iOS and Android, the contacts permission request only fires ONCE. If the user denies it initially, subsequent calls to `requestPermissionsAsync()` return the denied status immediately without showing a prompt. Many apps don't handle this, leaving users stuck with no way to import contacts.

**Why it happens:** Native OS permission systems are designed to prevent permission spam. Once denied, the OS won't show the system dialog again. Developers expect the permission prompt to always appear when requested.

**Consequences:**
- Users who accidentally tap "Deny" cannot use contact import feature
- App Store reviews complain about "broken" feature
- Support tickets asking "how do I enable contacts?"
- Expo issue [#29528](https://github.com/expo/expo/issues/29528) documents iOS throwing exceptions when denied

**Prevention:**
1. Check permission status BEFORE attempting to request
2. If status is "denied" or "blocked", show custom UI explaining why contacts are needed
3. Provide a "Go to Settings" button using `Linking.openSettings()`
4. Never call `requestPermissionsAsync()` if permission was already denied
5. Store permission denial state locally to show appropriate UI on next session

**Detection:** Users reporting "import contacts doesn't work" after initial denial; crash analytics showing expo-contacts exceptions on iOS.

**Phase to Address:** Contact Import Implementation phase - build permission flow before import UI.

---

### Pitfall 2: Friend Request Race Condition - Bidirectional Collision

**What goes wrong:** User A sends friend request to User B at the exact moment User B sends one to User A. Without proper database constraints, this creates duplicate relationship records, inconsistent states (both "pending" or one accepted/one pending), or the second request fails silently.

**Why it happens:** The naive approach creates a row for each request (A->B, B->A). Without atomic operations or unique constraints, concurrent inserts succeed, leaving the database in an inconsistent state that application logic can't resolve.

**Consequences:**
- Two pending friend requests between same users
- Accepting one doesn't clear the other
- Duplicate notifications to both users
- `friends` count off by 2x for some relationships
- Edge cases where unfriending one direction leaves the other

**Prevention:**
1. **Ordered ID Constraint:** Store relationships with `user_id_1 < user_id_2` constraint. Always store the smaller UUID first.
   ```sql
   CREATE TABLE friendships (
     user_id_1 UUID NOT NULL,
     user_id_2 UUID NOT NULL,
     status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')),
     requester_id UUID NOT NULL, -- who initiated
     CONSTRAINT ordered_ids CHECK (user_id_1 < user_id_2),
     PRIMARY KEY (user_id_1, user_id_2)
   );
   ```
2. **Database Function for Requests:** Use a SECURITY DEFINER function that:
   - Normalizes the order (smaller ID first)
   - Checks for existing relationship
   - Handles both "new request" and "accepting existing request" cases atomically
3. **SELECT FOR UPDATE:** Lock the row if relationship exists before modifying

**Detection:** Duplicate relationship rows in database; notifications sent twice; friend count inconsistencies; accepting request doesn't work.

**Phase to Address:** Friend Schema Design phase - MUST be designed correctly from the start, retrofitting is painful.

---

### Pitfall 3: Calendar Sync Creates Duplicates Every Sync

**What goes wrong:** The existing `syncAllBirthdays()` function in `utils/deviceCalendar.ts` creates NEW events every time it runs. There's no deduplication. Users who sync twice get two birthday events for each friend. Users who sync monthly accumulate 12x events per year.

**Why it happens:** The current implementation (lines 182-217) calls `Calendar.createEventAsync()` without checking if an event for that birthday already exists. The code was built for one-time sync, not repeated use.

**Consequences:**
- Device calendar becomes unusable with hundreds of duplicate events
- Users blame app and leave negative reviews
- Storage bloat on device calendar database
- Multiple reminder notifications for same birthday
- Google Calendar API change (Nov 2024) compounds this by now showing birthdays on primary calendar + birthday calendar

**Prevention:**
1. **Track Synced Events:** Store event IDs in AsyncStorage or Supabase
   ```typescript
   // Store: { [birthdayKey]: eventId }
   const syncedEvents = await AsyncStorage.getItem('syncedCalendarEvents');
   ```
2. **Check Before Create:** Before creating, search for existing event with matching title/date
3. **Update Instead of Create:** If event exists, call `Calendar.updateEventAsync()`
4. **Provide "Unsync" Option:** Allow users to remove all Wishlist events
5. **Use Unique Notes Field:** Include unique identifier in event notes for matching

**Detection:** User complaints about duplicate events; device calendar shows multiple events for same birthday.

**Phase to Address:** Calendar Integration Enhancement phase - fix BEFORE adding friend birthday sync.

---

### Pitfall 4: RLS Policy Fails for Friend-Based Visibility

**What goes wrong:** Your existing RLS patterns check group membership. Friend-based visibility requires a different pattern: "can see if we're mutual friends." Naive implementation either allows access to non-friends (security hole) or blocks access to friends (broken feature). Views bypass RLS entirely by default.

**Why it happens:** RLS for friendships requires checking a DIFFERENT table (friendships) with bidirectional lookup. The existing group_members pattern doesn't translate directly. Additionally, Postgres 15+ views use `security_definer` by default, bypassing all RLS.

**Consequences:**
- Users see birthdays of non-friends (privacy violation)
- OR users can't see friends' public dates (feature broken)
- 83% of Supabase security issues involve RLS misconfiguration (CVE-2025-48757)
- Views created for friend queries expose all data

**Prevention:**
1. **Create Helper Function:** Use SECURITY DEFINER function for friend lookups
   ```sql
   CREATE FUNCTION are_friends(user_a UUID, user_b UUID)
   RETURNS BOOLEAN AS $$
     SELECT EXISTS (
       SELECT 1 FROM friendships
       WHERE status = 'accepted'
         AND ((user_id_1 = user_a AND user_id_2 = user_b)
              OR (user_id_1 = user_b AND user_id_2 = user_a))
     );
   $$ LANGUAGE SQL SECURITY DEFINER;
   ```
2. **RLS Using Function:**
   ```sql
   CREATE POLICY "Friends can see public dates"
   ON public_dates FOR SELECT
   USING (
     owner_id = auth.uid()
     OR (visibility = 'friends_only' AND are_friends(owner_id, auth.uid()))
   );
   ```
3. **Views Need `security_invoker`:** For Postgres 15+, set `security_invoker = true` on views
4. **Test RLS Thoroughly:** Test as different users, verify blocked access

**Detection:** Security audit finds exposed data; users report seeing strangers' info; friends can't see each other's dates.

**Phase to Address:** Friend Schema Design + Visibility Rules phase - must be architected before any friend queries.

---

### Pitfall 5: Contact Import Performance Death Spiral

**What goes wrong:** User with 5000+ contacts taps "Import Contacts." App fetches all contacts, then loops through each to check against database for existing users. UI freezes for 30+ seconds, then crashes from memory pressure.

**Why it happens:** `expo-contacts` returns ALL contacts in one call. Checking 5000 phone numbers against database one-by-one creates N+1 queries. React Native single-threaded JS can't handle this without blocking UI.

**Consequences:**
- App freezes during import (ANR on Android)
- Memory crash on low-end devices
- Users think app is broken and force-quit
- If they wait, massive battery drain
- Supabase rate limits hit (429 errors)

**Prevention:**
1. **Pagination at Contact Level:** Use `pageSize` and `pageOffset` in `getContactsAsync()`
   ```typescript
   let allContacts: Contact[] = [];
   let page = 0;
   const pageSize = 100;

   while (true) {
     const { data } = await Contacts.getContactsAsync({
       pageSize,
       pageOffset: page * pageSize,
       fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
     });
     if (data.length === 0) break;
     allContacts = [...allContacts, ...data];
     page++;
     // Allow UI to breathe
     await new Promise(resolve => setTimeout(resolve, 0));
   }
   ```
2. **Batch Database Lookups:** Send all phone numbers in one query
   ```sql
   SELECT id, phone_number FROM users
   WHERE phone_number = ANY($1::text[])
   ```
3. **Background Processing:** Use Expo TaskManager for heavy lifting
4. **Progress Indicator:** Show progress bar, not spinner
5. **Limit Initial Scope:** Only import contacts with phone numbers (skip email-only)

**Detection:** Crash reports during contact import; ANR reports on Android; users reporting freezes.

**Phase to Address:** Contact Import Implementation phase - design for scale from day one.

---

## Moderate Pitfalls

Issues that cause significant UX problems or require multiple iterations to fix.

### Pitfall 6: GDPR Violation - Contact Upload Without Consent

**What goes wrong:** App uploads raw contact data (phone numbers, names, emails) to server for friend matching without explicit consent. This violates GDPR Article 23 (data minimization) and exposes app to legal liability. Users in EU have grounds for complaint.

**Prevention:**
1. **Hash Before Upload:** Hash phone numbers client-side, match against hashed values in DB
   ```typescript
   const hash = await Crypto.digestStringAsync(
     Crypto.CryptoDigestAlgorithm.SHA256,
     normalizedPhoneNumber
   );
   ```
2. **Explicit Consent Modal:** Show what data will be used and why BEFORE import
3. **Local-Only Option:** Offer "match locally" that downloads friend list instead of uploading contacts
4. **Privacy Policy Update:** Document contact usage clearly
5. **Data Retention:** Don't store uploaded contacts - match and discard

**Detection:** App store rejection citing privacy policy; GDPR complaint; security audit.

**Phase to Address:** Contact Import Implementation phase - consent flow before technical implementation.

---

### Pitfall 7: Friend Request Notification Spam

**What goes wrong:** Every friend request triggers a push notification. Popular users get bombarded. Worse: if there's a retry bug, same request sends multiple notifications. Users disable notifications entirely, missing important ones.

**Prevention:**
1. **Notification Batching:** "You have 5 new friend requests" instead of 5 separate notifications
2. **Cooldown Period:** Max 1 friend request notification per 15 minutes
3. **Deduplication:** Track notification IDs to prevent duplicates
4. **Notification Preferences:** Let users mute friend request notifications separately
5. **Rate Limit at DB Level:** Prevent spam requests with request cooldown per sender

**Detection:** Users complaining about notification spam; high notification opt-out rate.

**Phase to Address:** Friend Request Flow phase - implement batching from the start.

---

### Pitfall 8: Friends-Groups Integration Confusion

**What goes wrong:** User adds a friend, expects friend to automatically see their group birthdays. Or user creates group, expects friends to auto-join. The mental model of "friends" vs "groups" isn't clear, leading to support requests and user frustration.

**Why it happens:** The app was designed around groups. Friends are being added later. The relationship between concepts isn't obvious. Users from Facebook/Instagram expect friends to "just work."

**Prevention:**
1. **Clear Separation:** Friends see your PUBLIC dates. Groups have their OWN calendars.
2. **Onboarding:** Explain distinction when user first adds a friend
3. **Quick Actions:** "Invite friend to group" CTA on friend profile
4. **Visual Distinction:** Different icons/colors for friend dates vs group dates
5. **FAQ Section:** "Why can't my friend see my group's events?"

**Detection:** Support tickets asking about friend/group relationship; users confused in reviews.

**Phase to Address:** Friends/Groups Integration phase - plan UX before building features.

---

### Pitfall 9: Stale Calendar State After Birthday Update

**What goes wrong:** User updates their birthday in app. The old birthday event remains in device calendar. Now they have wrong date synced. If using yearly recurrence, it's wrong forever.

**Prevention:**
1. **Track Sync State:** Store mapping of `{ userId: { eventId, syncedBirthday } }`
2. **Compare on Sync:** If birthday changed, delete old event, create new
3. **Centralized Birthday Source:** When birthday updates, trigger calendar cleanup
4. **Event Notes Include Version:** `"Birthday sync v2 - 2026-02-09"` helps identify outdated events

**Detection:** Users report wrong birthday in calendar; events don't match app data.

**Phase to Address:** Calendar Enhancement phase - add update capability before friend sync.

---

### Pitfall 10: Visibility Setting Defaults Cause Privacy Surprise

**What goes wrong:** User adds birthday, default visibility is "public" (or "friends"). They didn't realize friends could see it. Privacy violation, trust broken.

**Prevention:**
1. **Default to Private:** New dates should be private by default
2. **Explicit Choice:** Force visibility selection when adding date (no default)
3. **Clear UI:** Show who can see each date (icon: "Visible to 12 friends")
4. **Bulk Privacy:** "Make all dates friends-only" option
5. **First-Time Education:** Explain visibility on first date creation

**Detection:** Support requests about privacy; users surprised friends can see their info.

**Phase to Address:** Visibility/Privacy Controls phase - design privacy UX carefully.

---

## Minor Pitfalls

Issues that cause friction but are recoverable.

### Pitfall 11: Phone Number Normalization Inconsistency

**What goes wrong:** User stores `+1 (555) 123-4567` in app. Their friend has `5551234567` in their contacts. Match fails because strings don't match.

**Prevention:**
1. **Normalize on Save:** Strip all non-digits, add country code
2. **Normalize on Lookup:** Same normalization for contact import
3. **Use Library:** `libphonenumber-js` handles international formats
4. **Country Code Handling:** Prompt for country if ambiguous

**Detection:** Users report friends not found even though they have their number.

**Phase to Address:** Contact Import Implementation phase - normalize before any matching.

---

### Pitfall 12: Friend Request Pending State Limbo

**What goes wrong:** User sends friend request, never gets response. Request sits "pending" forever. No way to cancel or resend. Clutters UI.

**Prevention:**
1. **Expiration:** Auto-expire requests after 30 days
2. **Cancel Option:** Let sender withdraw pending request
3. **Resend Cooldown:** After expiration, allow one resend
4. **Pending List UI:** Show pending requests with timestamps

**Detection:** Users asking how to cancel request; "pending" list grows unbounded.

**Phase to Address:** Friend Request Flow phase - design full lifecycle.

---

### Pitfall 13: Calendar Permission vs Calendar Access Confusion

**What goes wrong:** User grants calendar permission but has no calendars set up on device, or only has "read-only" calendars (shared calendars). App can't create events, shows confusing error.

**Prevention:**
1. **Check Available Calendars:** After permission, verify writable calendar exists
2. **Create Dedicated Calendar:** The existing `getOrCreateWishlistCalendar()` does this
3. **Handle No-Source Edge Case:** Current code (line 106) throws generic error - improve message
4. **iCloud/Google Detection:** Guide user to enable specific calendar provider

**Detection:** Error reports "No calendar source available"; users with permission still can't sync.

**Phase to Address:** Calendar Enhancement phase - improve error handling.

---

### Pitfall 14: Blocking User Doesn't Block Completely

**What goes wrong:** User blocks someone, but blocked person can still see public dates through group membership or mutual friends. Block feels ineffective.

**Prevention:**
1. **Block is Universal:** Blocked users can't see you in ANY context
2. **Hide from Groups:** If blocked user is in same group, hide your content from them
3. **Block Both Directions:** Blocking A also hides A from B
4. **Clear Expectations:** Show what blocking does in confirmation dialog

**Detection:** Users complaining block doesn't work; blocked users still seeing content.

**Phase to Address:** Friend Relationship Management phase - design block semantics carefully.

---

### Pitfall 15: Migration Nightmare - Existing Users Have No Friends

**What goes wrong:** Friends feature launches. All existing users start with 0 friends. App feels empty. No one discovers the feature naturally. Groups still work, so users never explore friends.

**Prevention:**
1. **Feature Announcement:** In-app banner when friends feature launches
2. **Contact Import Prompt:** "Find friends already on Wishlist" on first app open after update
3. **Group-to-Friends Bridge:** "Add group members as friends?" prompt
4. **Social Proof:** Show "X of your contacts use Wishlist"
5. **Feature Tour:** Brief walkthrough of friends feature

**Detection:** Low friends feature adoption; analytics show feature isn't used.

**Phase to Address:** Launch/Migration phase - plan adoption strategy.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Contact Import | Permission one-shot (#1), Performance (#5), GDPR (#6), Normalization (#11) | Design permission flow first; batch all operations; hash before upload |
| Friend Schema | Race condition (#2), RLS failures (#4) | Ordered ID constraint; helper function for friend checks |
| Friend Requests | Spam (#7), Pending limbo (#12) | Batch notifications; add expiration |
| Calendar Enhancement | Duplicates (#3), Stale state (#9), Permission confusion (#13) | Track synced events; update vs create; better error messages |
| Visibility/Privacy | Defaults (#10), Block semantics (#14) | Private by default; explicit choice UI |
| Friends/Groups Integration | Mental model confusion (#8) | Clear UX distinction; onboarding flow |
| Launch/Migration | Empty state (#15) | Feature announcement; contact import prompt |

---

## Integration Pitfalls: Adding Friends to Group-Centric App

These pitfalls are specific to ADDING a friends layer to an existing group-based system.

### I1: Two Relationship Systems Diverge

**What goes wrong:** Groups use `group_members` table. Friends use `friendships` table. Over time, features reference one but not the other. "Invite to group" works from friends but not groups. Inconsistent behavior.

**Prevention:**
- Define clear APIs that work across both systems
- "getUserRelationships()" returns both friends AND group memberships
- UI components accept generic "relationship" type

### I2: Calendar Now Has Three Data Sources

**What goes wrong:** Existing calendar shows group birthdays. Now adding friend birthdays. Soon: custom dates. Three queries, three sync paths, three places for bugs.

**Prevention:**
- Create unified `BirthdaySource` type: `{ source: 'group' | 'friend' | 'custom', ... }`
- Single sync function handles all sources
- Single calendar display component with source filtering

### I3: Notification Logic Becomes Spaghetti

**What goes wrong:** Existing notifications for group events. Add friend request notifications. Add friend birthday notifications. Different code paths, different templates, race conditions between them.

**Prevention:**
- Notification service with queue
- Generic notification type with payload
- Central dispatcher handles all notification creation

### I4: Search/Discovery Now Spans Multiple Tables

**What goes wrong:** "Find users" search now needs to check: users table, group_members (for existing connections), friendships (for pending/accepted). Slow, complex queries.

**Prevention:**
- Denormalized "user connections" view or table
- Pre-computed relationship status for display
- Background job keeps derived data fresh

---

## Sources

- [Expo Contacts Documentation](https://docs.expo.dev/versions/latest/sdk/contacts/)
- [Expo Permissions Guide](https://docs.expo.dev/guides/permissions/)
- [Expo Calendar Documentation](https://docs.expo.dev/versions/latest/sdk/calendar/)
- [expo-contacts requestPermissionsAsync iOS issue #29528](https://github.com/expo/expo/issues/29528)
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [PostgreSQL Social Relationships Practice - DZone](https://dzone.com/articles/social-friend-relationship-system-practice-in-post)
- [Database Race Conditions with PostgreSQL](https://dev.to/mistval/winning-race-conditions-with-postgresql-54gn)
- [GDPR Mobile App Compliance - ComplyDog](https://complydog.com/blog/gdpr-mobile-app-compliance-development-guide)
- [GDPR Compliance for Apps - GDPR Local 2025](https://gdprlocal.com/gdpr-compliance-for-apps/)
- [Mobile App Permissions and GDPR - CNIL (Jan 2025)](https://techgdpr.com/blog/data-protection-digest-17012025-mobile-app-permissions-should-work-in-conjunction-with-consent-requirements-cnil/)
- [Social Network Anti-Patterns - Microformats Wiki](https://microformats.org/wiki/social-network-anti-patterns)
- [Race Conditions in React - DEV Community](https://dev.to/paulocappa/race-conditions-in-react-native-5bjb)
- [Google Calendar Birthdays API Change (Nov 2024)](https://discussions.apple.com/thread/255294534)
- Existing codebase analysis: `utils/deviceCalendar.ts`, `utils/groups.ts`, RLS policies in migrations, `types/database.types.ts`

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Contact Import Permission Pitfalls | HIGH | Verified via Expo docs and GitHub issues |
| Friend Request Race Conditions | HIGH | Standard database concurrency problem with documented solutions |
| Calendar Sync Duplicates | HIGH | Observed in existing codebase (`syncAllBirthdays` creates without checking) |
| RLS/Privacy for Friends | HIGH | Documented Supabase patterns, requires different pattern than groups |
| GDPR Contact Import | HIGH | Well-documented legal requirement, CNIL guidance Jan 2025 |
| Integration Pitfalls (friends + groups) | MEDIUM | Derived from codebase analysis, patterns from similar systems |
| Migration/Adoption | MEDIUM | Standard feature launch considerations |

---

*Research completed: 2026-02-09*
