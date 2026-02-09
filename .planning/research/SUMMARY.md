# Project Research Summary: v1.4 Friends System

**Project:** Wishlist Group Gifting App - Friends System Milestone
**Domain:** Social connections, contact import, friend-specific calendars, public dates
**Researched:** 2026-02-09
**Confidence:** HIGH

## Executive Summary

The Friends System adds direct peer-to-peer relationships independent of group membership, enabling users to maintain ongoing gift-giving intelligence about friends across celebrations. Research confirms this is a well-established pattern in social apps with proven implementation approaches: bidirectional relationships via single-table design, request/accept workflows with clear state machines, and contact-based discovery through phone/email matching.

The recommended technical approach leverages one new npm dependency (`expo-contacts@~15.0.11`) while reusing the project's existing patterns: Supabase RLS for privacy enforcement (following proven celebrant-exclusion patterns), calendar integration utilities (`deviceCalendar.ts`), and notification infrastructure. The friends schema uses a single-row bidirectional design with ordering constraint (`user_a_id < user_b_id`) to prevent duplicates, friend requests follow a simple pending-to-accepted state machine, and public dates use month/day storage for annual recurrence.

**Key risks center on three areas:** (1) Phone number normalization for cross-platform contact matching requires E.164 format standardization, (2) RLS policies must correctly enforce friend-only visibility without leaking data to non-friends, and (3) iOS 18's granular contact permissions require graceful handling of "limited access" mode. All three have proven mitigation strategies identified in research and are manageable with careful implementation.

## Key Findings

### Recommended Stack

The Friends System requires minimal new dependencies while maximizing reuse of existing infrastructure. The only new package needed is `expo-contacts@~15.0.11` for device phonebook access, which follows the exact same permission pattern already proven with `expo-calendar` and `expo-notifications` in the codebase.

**Core technologies:**
- **expo-contacts (~15.0.11):** Device phonebook access for friend discovery via contacts — SDK 54 compatible, managed workflow support, iOS 18 limited access handling
- **Existing Supabase RLS patterns:** Friend relationship privacy and public date visibility — proven celebrant-exclusion patterns extend cleanly to friend-visibility patterns
- **Existing deviceCalendar.ts utilities:** Friend date calendar sync — reuses `getOrCreateWishlistCalendar()` and event creation primitives with minimal extension

**Critical dependency note:** The `expo-contacts` config plugin automatically handles iOS `NSContactsUsageDescription` and Android `READ_CONTACTS` permission declarations. The iOS permission string must be specific ("find friends...who already use the app") to pass App Store review — generic strings are rejected by Apple. iOS 18 introduces granular access where users can grant access to only some contacts; the SDK's `accessPrivileges` property enables graceful handling of this "limited" mode.

### Expected Features

Research into friend systems across social apps (Facebook, Instagram contact discovery patterns) and gifting apps (Giftster, DreamList friend relationships) reveals three tiers of features.

**Must have (table stakes):**
- Friend request/accept workflow — users expect explicit control over relationships, not auto-friending
- Contact import for discovery — phone/email matching is the primary discovery mechanism
- Friend list display — simple list with avatars, names, basic info
- Friend dates in calendar — annual dates (birthdays, anniversaries) integrated with existing calendar view
- Public dates management — users create custom recurring dates friends can see

**Should have (differentiators):**
- Public dates with visibility control — "friends_only" vs "public" future-proofs for profile features
- Calendar sync for friend dates — extend existing `deviceCalendar.ts` to create events for friend dates
- Friend-based group suggestions — when creating groups, suggest friends first
- Request notifications — real-time alerts when receiving/accepting friend requests

**Defer (v2+):**
- Friend birthday reminders (separate from calendar events) — can use device calendar notifications for MVP
- Friend wishlists visibility — current milestone focuses on dates, wishlist sharing is separate feature
- Mutual friend display — "You and Sarah have 3 mutual friends" adds complexity without clear v1 value
- Friend search by username — contact import covers primary use case, search is secondary

### Architecture Approach

The Friends System introduces three new database tables (`friends`, `friend_requests`, `public_dates`) following established Supabase patterns, with bidirectional relationships handled via single-row design with ordering constraint to prevent duplicates. The architecture extends existing systems (calendar, notifications, profile) rather than creating parallel infrastructure.

**Major components:**

1. **Friends Schema (3 tables + helper functions)** — `friends` table stores accepted relationships with `user_a_id < user_b_id` constraint; `friend_requests` manages pending state with status enum; `public_dates` stores user-defined recurring dates. Helper functions (`are_friends()`, `accept_friend_request()`, `get_my_friends()`, `match_contacts()`) encapsulate relationship logic and enable clean RLS policies.

2. **Contact Import Service** — Requests device contacts permission via `expo-contacts`, extracts phone numbers and emails, normalizes to E.164 format for phones, calls `match_contacts()` database function to find existing users, presents matched users with friendship status ("Add", "Pending", "Friends"), initiates friend requests for selected matches.

3. **Calendar Integration Extension** — New `getFriendDates()` service parallels existing `getGroupBirthdays()` pattern, queries `public_dates` for friends via `are_friends()` check, merges friend dates with group birthdays in calendar display with distinct colors (friend dates use teal, group dates use varied colors), extends `deviceCalendar.ts` to sync friend dates to device calendar with yearly recurrence.

4. **Friends Tab Navigation** — New tab at position 2 (My Wishlist | **Friends** | Groups | Celebrations | Calendar), main screen shows friend list with `FlashList` performance, routes to friend requests screen, routes to find friends (contact import) screen, links to settings for managing public dates.

### Critical Pitfalls

Research into contact-based social features, RLS privacy patterns, and bidirectional relationship systems identified five critical risks requiring careful mitigation.

1. **Phone number matching inconsistency across regions** — Device contacts store phone numbers in varied formats (+1-555-123-4567, 5551234567, +15551234567). Matching requires normalization to a canonical format. **Mitigation:** Store all phones in E.164 format (`+[country][number]` with no separators). Use `libphonenumber-js` for robust parsing on both client (contact normalization) and server (user phone storage). Index the normalized column for efficient matching. Accept that some regional variations may not match perfectly (documented limitation).

2. **RLS friend visibility policies leak data via bidirectional queries** — The `user_a_id < user_b_id` ordering constraint means friend queries need `OR` conditions: `WHERE user_a_id = X OR user_b_id = X`. RLS policies with complex `OR` logic can accidentally expose data if not carefully tested. **Mitigation:** Use the `are_friends(user_a, user_b)` helper function in all RLS policies instead of inline `OR` conditions. The helper uses `LEAST/GREATEST` to handle ordering, centralizing the logic. Mark the helper `SECURITY DEFINER STABLE` to prevent per-row re-evaluation.

3. **iOS 18 limited contact access creates degraded UX** — iOS 18 allows users to grant access to only some contacts (new granular permission mode). If user grants limited access, contact import returns incomplete data without clear user understanding. **Mitigation:** Check `accessPrivileges` property in permission response. If `'limited'`, show informational message: "You've shared [X] contacts. You can share more in Settings > Privacy > Contacts if you'd like." Do NOT repeatedly prompt for full access (Apple rejects apps for aggressive permission requests). Proceed with the contacts user shared.

4. **Friend request spam and unwanted relationship pressure** — Without rate limiting, users can spam friend requests. Without blocking capability, users can't prevent unwanted requests. **Mitigation:** (Phase 23) Implement request rate limit: max 20 requests per hour per user (database trigger or Edge Function check). Add `blocked` status to friend_requests: rejected requests can be upgraded to blocked, blocking prevents future requests from that user. (Deferred to post-v1.4) Add reporting mechanism for abusive users.

5. **Public dates privacy model creates confusion** — Users may add sensitive dates (therapy appointments, medical events) thinking they're private, then be surprised when friends see them. The "public_dates" name implies sharing but users may not understand the scope. **Mitigation:** Clear UI labeling: "Dates friends can see" not "Public dates." Show visibility preview: "Your friends will see this date in their calendar." Default new dates to `visibility: 'friends_only'` (explicit privacy choice). Add tooltip: "Only people on your friends list can see these dates. They won't appear on your wishlist or group pages."

## Implications for Roadmap

Based on dependency analysis and risk assessment, the Friends System should be implemented in six phases starting from Phase 23 (continuing from v1.3's Phase 22). The ordering follows architectural dependencies: schema before services, core relationships before discovery features, friend management before calendar integration.

### Phase 23: Database Foundation & Schema
**Rationale:** All features depend on the database schema. Friends table is the core relationship model that enables all other features. RLS policies must be correct from day one to prevent privacy leaks.

**Delivers:**
- Migration: `friends` table with ordered bidirectional constraint
- Migration: `friend_requests` table with status enum
- Migration: `public_dates` table with month/day storage
- Migration: Add `phone` column to `users` table with E.164 normalization
- Migration: Helper functions (`are_friends()`, `accept_friend_request()`, `get_my_friends()`, `match_contacts()`)
- Migration: RLS policies for all three tables with friend-visibility patterns
- Types: Add new tables to `database.types.ts`

**Addresses features:** Foundation for all friend-related features

**Avoids pitfalls:**
- **Phone matching inconsistency** — E.164 normalization and indexed phone column defined in schema
- **RLS leak via bidirectional queries** — `are_friends()` helper centralizes ordering logic, all policies use it
- **Public dates privacy confusion** — `visibility` column with default `'friends_only'` baked into schema

**Research flag:** Standard Supabase RLS patterns (skip research-phase)

### Phase 24: Friend Core Services & Tab
**Rationale:** Core friend CRUD operations enable all subsequent features. Friends tab provides navigation home and establishes UI patterns. Testing friend operations in isolation before adding discovery/calendar complexity reduces integration risk.

**Delivers:**
- Service: `lib/friends.ts` with `getFriends()`, `sendFriendRequest()`, `acceptFriendRequest()`, `rejectFriendRequest()`, `removeFriend()`, `areFriends()`
- Route: `app/(app)/(tabs)/friends.tsx` (friend list screen with FlashList)
- Component: `FriendCard.tsx` for list display
- Component: `FriendStatusBadge.tsx` for profile integration
- Modified: `app/(app)/(tabs)/_layout.tsx` to add Friends tab at position 2

**Addresses features:**
- Friend list display (table stakes)
- Friend-based group suggestions foundation (service layer ready for Phase 25)

**Avoids pitfalls:**
- **Friend request spam** — Rate limiting implemented in `sendFriendRequest()` service function (max 20/hour check)

**Research flag:** Standard CRUD patterns (skip research-phase)

### Phase 25: Friend Requests Flow
**Rationale:** Request/accept workflow is the only way to create friendships. This phase completes the friend relationship lifecycle. Profile integration makes requests discoverable. Notifications provide real-time awareness.

**Delivers:**
- Route: `app/(app)/friends/requests.tsx` (pending requests screen)
- Component: `FriendRequestCard.tsx` with accept/reject buttons
- Component: `AddFriendButton.tsx` for profile pages
- Modified: `app/profile/[id].tsx` to show friend status and add button
- Migration: Notification triggers for friend request events (INSERT on friend_requests → notify `to_user_id`, UPDATE to 'accepted' → notify `from_user_id`)
- Service: Request notification handlers in `lib/notifications.ts`

**Addresses features:**
- Friend request/accept workflow (table stakes)
- Request notifications (differentiator)

**Avoids pitfalls:**
- **Request spam continued** — Accept/reject UI includes block option (upgrades rejected request to blocked status)
- **RLS leak** — Friend status badge uses `areFriends()` helper, not direct query (prevents bidirectional query errors)

**Research flag:** Standard request patterns (skip research-phase)

### Phase 26: Contact Import & Discovery
**Rationale:** Contact import is the primary friend discovery mechanism. Requires `expo-contacts` dependency and platform-specific permission handling. Built on top of friend request flow (Phase 25) so discovery can immediately trigger requests.

**Delivers:**
- Package: Install `expo-contacts@~15.0.11` via `npx expo install expo-contacts`
- Config: Update `app.json` with expo-contacts plugin and iOS/Android permission strings
- Service: `lib/contactImport.ts` with `importContacts()`, `normalizePhone()`, `matchContacts()`
- Route: `app/(app)/friends/find.tsx` (contact import + matched users list)
- Component: `ContactMatchList.tsx` for displaying matched users with friendship status
- Link: "Find Friends" button in Friends tab header

**Addresses features:**
- Contact import for discovery (table stakes)
- Phone/email matching against existing users (table stakes)

**Avoids pitfalls:**
- **Phone matching inconsistency** — Uses `libphonenumber-js` for E.164 normalization (client-side before server call)
- **iOS 18 limited access** — Checks `accessPrivileges` property, shows informational message if `'limited'`, proceeds with shared contacts without re-prompting
- **Android permissions** — Config plugin handles `READ_CONTACTS` automatically (no manual manifest editing needed)

**Research flag:** Needs phase-level research for `libphonenumber-js` integration patterns and iOS 18 permission edge cases

### Phase 27: Public Dates Management
**Rationale:** Users must be able to create/edit public dates before friends can see them in calendar. This phase is independent of contact import (Phase 26) and can run in parallel, but must complete before calendar integration (Phase 28).

**Delivers:**
- Service: `lib/publicDates.ts` with `getMyPublicDates()`, `addPublicDate()`, `updatePublicDate()`, `deletePublicDate()`
- Route: `app/(app)/settings/public-dates.tsx` (manage own dates screen)
- Component: `PublicDateCard.tsx` for displaying/editing a single date
- Component: `PublicDateForm.tsx` for add/edit modal
- Modified: `app/(app)/settings/profile.tsx` to link to "My Public Dates" section

**Addresses features:**
- Public dates management (table stakes)
- Public dates with visibility control (differentiator)

**Avoids pitfalls:**
- **Public dates privacy confusion** — UI labels as "Dates friends can see", shows visibility preview before saving, tooltips explain scope
- **Date validation** — Month/day validation (February 29 handled gracefully for non-leap years), year optional (for age calculation vs. recurrence-only)

**Research flag:** Standard CRUD patterns (skip research-phase)

### Phase 28: Calendar Integration
**Rationale:** Final integration phase. Requires both friendships (Phase 24) and public dates (Phase 27) to exist. Extends existing calendar system with minimal changes. Reuses proven `deviceCalendar.ts` patterns.

**Delivers:**
- Service: `lib/friendDates.ts` with `getFriendDates()`, `getPublicDatesForCalendar()`
- Modified: `lib/birthdays.ts` to export `GroupBirthday` type for reuse
- Modified: `app/(app)/(tabs)/calendar.tsx` to fetch and merge friend dates with group birthdays
- Modified: `components/BirthdayCalendar.tsx` to support friend date colors (teal dots)
- Modified: `components/CountdownCard.tsx` to show source indicator ("Friend" vs "Group")
- Modified: `utils/deviceCalendar.ts` to add `syncFriendDates()` function (parallel to existing `syncBirthdayEvent()`)

**Addresses features:**
- Friend dates in calendar (table stakes)
- Calendar sync for friend dates (differentiator)

**Avoids pitfalls:**
- **Performance on large friend lists** — Uses single batched query for friend dates via `IN (friendIds)`, not N+1 queries per friend
- **Calendar permission conflicts** — Reuses existing `expo-calendar` permission handling (already proven in codebase)
- **Duplicate calendar events** — `syncFriendDates()` uses same event ID pattern as birthdays (deduplication via calendar API)

**Research flag:** Standard calendar integration patterns (skip research-phase)

### Phase Ordering Rationale

- **Schema first (Phase 23):** All features require database foundation. RLS policies must be correct before any data is written to prevent retroactive privacy fixes.
- **Core relationships before discovery (Phases 24-25 before 26):** Friend request flow must work before contact import can trigger requests. Establishing and testing CRUD in isolation reduces integration complexity.
- **Public dates parallel to discovery (Phase 27 alongside 26):** These features are independent. Phase 27 can run concurrently with Phase 26 to optimize timeline.
- **Calendar integration last (Phase 28):** Requires both friends (Phase 24) and public dates (Phase 27) to exist. Integration testing is cleaner when dependencies are stable.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 26 (Contact Import):** Complex integration with `libphonenumber-js` for phone normalization, iOS 18 permission edge cases require testing, Android contact format variations need validation. Recommend `/gsd:research-phase` for contact matching implementation patterns and regional phone number handling.

**Phases with standard patterns (skip research-phase):**
- **Phase 23 (Database):** Standard Supabase RLS patterns already proven in codebase (celebrant-exclusion extends to friend-visibility)
- **Phase 24 (Friend Services):** Standard CRUD operations with existing RLS patterns
- **Phase 25 (Friend Requests):** Standard request/accept state machine with notification triggers
- **Phase 27 (Public Dates):** Standard form CRUD with validation
- **Phase 28 (Calendar Integration):** Extends existing `deviceCalendar.ts` patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only one new dependency (`expo-contacts`); all other capabilities reuse existing stack. SDK 54 compatibility verified via NPM and Expo changelog. |
| Features | HIGH | Friend systems are well-established patterns across social apps. Table stakes features identified from user research and competitive analysis (Giftster, DreamList). |
| Architecture | HIGH | Bidirectional single-row friendship design is standard pattern. RLS friend-visibility extends proven celebrant-exclusion patterns. Calendar integration parallels existing `getGroupBirthdays()` flow. |
| Pitfalls | MEDIUM-HIGH | Phone normalization risk is mitigated with E.164 standard and `libphonenumber-js`. RLS leak risk addressed via `are_friends()` helper. iOS 18 limited access handled via `accessPrivileges` check. Remaining uncertainty is around edge cases in contact matching (regional variations, number portability). |

**Overall confidence:** HIGH

The Friends System builds on proven patterns with minimal new dependencies. The primary technical risks (phone normalization, RLS friend-visibility, iOS 18 permissions) have clear mitigation strategies identified in research. The feature set is well-scoped to table stakes + select differentiators, avoiding scope creep into advanced features (mutual friends, friend search, friend wishlists).

### Gaps to Address During Planning

Areas where research was inconclusive or needs validation during implementation:

- **Phone number regional variations:** E.164 normalization handles most cases, but international number portability and regional formats (especially non-US) may have edge cases. **Mitigation:** Test contact matching with international numbers during Phase 26 implementation. Document known limitations (e.g., "Contacts without country codes may not match"). Consider fallback to email-only matching if phone normalization fails.

- **Friend request spam long-term:** Rate limiting (20 requests/hour) prevents immediate spam, but determined bad actors could still abuse over time. **Mitigation:** Phase 24 implements basic rate limit. Post-v1.4, add reporting mechanism and admin tooling for blocking abusive users at account level (not just relationship level).

- **Public dates visibility model edge cases:** What happens when user adds 50 public dates? Does calendar become cluttered? What if two friends have same date? **Mitigation:** Phase 27 implements basic CRUD. During Phase 28 calendar integration, test with realistic data (10-15 dates across multiple friends). If cluttered, add calendar filtering UI (show/hide friend dates toggle) in post-v1.4 polish.

- **Contact permission denial paths:** Research focused on granted/limited access flows. What if user denies contacts entirely? **Mitigation:** Phase 26 must provide clear alternative: manual username/email search (deferred feature, but needs design consideration). For v1.4, show graceful fallback message: "To find friends from contacts, allow access in Settings. You can also invite friends by sharing your profile link."

## Sources

### Primary (HIGH confidence)

**Stack:**
- [Expo Contacts SDK Documentation](https://docs.expo.dev/versions/latest/sdk/contacts/) — API reference, permission handling, iOS 18 limited access
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) — Version compatibility verification
- [expo-contacts npm package v15.0.11](https://www.npmjs.com/package/expo-contacts) — Confirmed SDK 54 compatible version
- [GitHub PR #35772: iOS Limited Access Support](https://github.com/expo/expo/pull/35772) — `accessPrivileges` property implementation

**Database Patterns:**
- [User Friends System & Database Design](https://www.coderbased.com/p/user-friends-system-and-database) — Single-table bidirectional design rationale
- [Modeling Mutual Friendship](https://minimalmodeling.substack.com/p/modeling-mutual-friendship) — Ordered constraint pattern
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) — Friend-visibility policy patterns
- [Neon: Modelling Authorization for Social Networks](https://neon.com/blog/modelling-authorization-for-a-social-network-with-postgres-rls-and-drizzle-orm) — RLS best practices for relationships

**Existing Codebase:**
- `lib/notifications.ts` lines 44-56 — Permission request pattern (template for contacts permission)
- `utils/deviceCalendar.ts` — Calendar sync pattern (template for friend dates sync)
- `supabase/migrations/20260206000001_v1.3_claims_details_notes.sql` — Status field RLS pattern (template for friend request status)

### Secondary (MEDIUM confidence)

**iOS 18 Permissions:**
- [Apple: Meet the Contact Access Button (WWDC24)](https://developer.apple.com/videos/play/wwdc2024/10121/) — iOS 18 contact permission changes (informational, not directly actionable for Expo managed workflow)
- [GitHub Issue #894: react-native-permissions iOS 18](https://github.com/zoontek/react-native-permissions/issues/894) — Community discussion on limited access UX patterns

**Phone Normalization:**
- [E.164 Standard (ITU-T)](https://www.itu.int/rec/T-REC-E.164/) — International phone number format (reference standard, not implementation guide)
- [libphonenumber-js GitHub](https://github.com/catamphetamine/libphonenumber-js) — Library for E.164 parsing (implementation patterns need Phase 26 research)

### Tertiary (LOW confidence, needs validation)

- [Apple App Store Rejection for Generic Permission Strings](https://developer.apple.com/forums/thread/725111) — Anecdotal evidence from developer forums; mitigation is to use specific permission strings as documented in research
- Contact matching success rates across platforms — No published metrics found; will need A/B testing and analytics during Phase 26 to optimize matching algorithm

---
*Research completed: 2026-02-09*
*Ready for roadmap: yes*
