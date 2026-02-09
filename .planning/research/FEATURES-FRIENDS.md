# Feature Landscape: Friends System

**Domain:** Friend Discovery, Social Calendar, and Friends-Groups Integration
**Researched:** 2026-02-09
**Confidence:** HIGH (patterns well-established in social apps, expo-contacts proven)

## Table Stakes

Features users expect from any friend-based social app. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Friend requests (send/accept/decline) | Core social pattern since Facebook | Low | Standard state machine, notifications already exist |
| View friends list | Users need to see who they're connected to | Low | Simple query with pagination |
| Remove friend | Users expect control over connections | Low | Mutual removal (both lose connection) |
| Pending requests view | Users need to manage incoming/outgoing | Low | Filter by status, counts for badges |
| Basic friend search | Find friends by name | Low | Full-text search on display name |
| Friend profile view | See friend's birthday, public wishlist | Low | Extends existing profile view |

**Dependency on existing:** All table stakes depend on existing `users` table and notification system.

## Differentiators

Features that set product apart. Not expected, but valued for a birthday coordination app.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Contact import friend discovery | "Find people you know instantly" - frictionless onboarding | Medium | expo-contacts + phone hash matching |
| Mutual friends suggestions | "People your friends know" - network growth | Medium | Graph traversal, scoring algorithm |
| Shared group suggestions | "You're both in Family Group" - contextual discovery | Low | Leverage existing group_members table |
| Custom public dates | Friends share anniversaries, special events | Medium | New event type beyond birthday |
| Friends calendar view | See all friend dates in one calendar | Low | Extends existing BirthdayCalendar |
| Birthday visibility to friends | "My friends can see my birthday even outside groups" | Low | Privacy control per-user |
| Friends-to-groups bridge | "Invite friend to group" from friend list | Low | Streamlines group invitation flow |

**Key differentiator rationale:** Contact import is the single highest-impact feature for growth. Without it, users must manually search for every friend. With it, they see "15 friends already on app" immediately.

## Anti-Features

Features to explicitly NOT build. These add complexity without serving the core value of birthday coordination.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time contact sync | Privacy nightmare, battery drain, users don't expect it | One-time import with manual refresh |
| Upload full contact list to server | Privacy violation, legal risk (GDPR/CCPA), bad press | Hash phone numbers client-side before upload |
| Friend location sharing | Out of scope, massive complexity, privacy concerns | None - not related to birthday coordination |
| "People You May Know" based on location/IP | Creepy, no clear value for birthday app | Stick to mutual friends + shared groups + contacts |
| Social feed of friend activity | Creates FOMO, competes with core value | Focus on calendar dates, not activity stream |
| Friend "levels" or "best friend" tiers | Gamification creep, social awkwardness | All friends equal, no hierarchy |
| Blocking friends | Overkill for birthday app - just remove | Remove friend is sufficient |
| Friend requests with custom messages | Over-engineering, spam vector | Simple request, no message needed |
| Reverse phone lookup for non-users | Legal gray area, privacy violation | Only match existing app users |
| Auto-accept friend requests | Removes user agency | Always require explicit accept |

## Feature Dependencies

```
Contact Import
    |
    v
Phone Hash Matching  -->  Suggested Friends (Contacts)
    |
    v
Friend Requests  <--  Suggested Friends (Mutual)
    |                        ^
    v                        |
Friends Table  -------> Mutual Friends Algorithm
    |
    +---> Friends Calendar View
    |           |
    |           v
    +---> Custom Public Dates  -->  Calendar Integration
    |
    +---> Friends-to-Groups Bridge  -->  Group Invitations (existing)
```

**Critical path:** Contact Import -> Phone Hash Matching -> Friend Requests -> Friends Table -> All downstream features

## Feature Details

### 1. Contact Import & Friend Discovery

**Expected behavior:**
1. User taps "Find Friends from Contacts"
2. App requests contacts permission (expo-contacts)
3. User grants permission (or declines - show graceful fallback)
4. App extracts phone numbers from contacts, normalizes to E.164 format
5. App hashes phone numbers locally (SHA-256 with app-specific salt)
6. App sends ONLY hashed numbers to server (never raw numbers)
7. Server matches against existing users' hashed phone numbers
8. Server returns matched user IDs with public profile data
9. App displays "X friends already on app" with list

**Privacy considerations (HIGH confidence - industry standard):**
- Phone numbers are hashed client-side before transmission
- Server never receives raw phone numbers
- Users see only matches who are already app users
- Contacts without accounts are not stored or tracked
- One-way hash prevents server-side reconstruction

**Technical note:** Simple SHA-256 hashing is theoretically vulnerable to rainbow table attacks on the small phone number space (~10^10 numbers). For an MVP birthday app, this is acceptable risk. True privacy-preserving contact discovery (Private Set Intersection) is enterprise-grade complexity. The hash + salt approach is what most apps use.

**Platform behavior:**
- iOS: `Contacts.requestPermissionsAsync()` shows system dialog
- Android: Runtime permission request for READ_CONTACTS
- Both: Store permission status, don't re-ask if denied

### 2. Friend Request Flow

**State machine:**
```
[none] --> pending --> [accepted|declined]
                           |
                      [removed]
```

**Expected UX:**
- **Send request:** One tap from profile/search/suggestions
- **Pending outgoing:** "Pending" badge, option to cancel
- **Pending incoming:** Badge in header, dedicated inbox
- **Accept:** One tap, instant mutual friendship
- **Decline:** One tap, silent removal (no notification to sender)

**Notification triggers:**
- Friend request received: "Alice wants to be your friend"
- Friend request accepted: "Bob accepted your friend request"
- Friend removed: No notification (silent removal)

### 3. Suggested Friends Algorithm

**Scoring system (recommendation):**

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Contact match (both have each other) | 100 | Strongest signal - real-world relationship |
| Mutual friends (count * 10, max 50) | 10-50 | More mutuals = higher confidence |
| Shared group membership (count * 15, max 45) | 15-45 | App-specific context |
| Contact match (one-way: they have you) | 30 | They know you, you may know them |

**Exclusions:**
- Already friends: Never suggest
- Pending requests (either direction): Move to separate "Pending" section
- Declined in last 30 days: Cooldown period
- Removed in last 30 days: Cooldown period

**Display order:** Score descending, then by recency of signal

**Presentation:**
- "From your contacts" section (contact matches)
- "Friends of friends" section (mutual friends)
- "From your groups" section (shared group membership)

### 4. Custom Public Dates

**What:** Friends can share dates beyond birthdays (anniversaries, custom events) that appear on friends' calendars.

**Event types:**
| Type | Recurrence | Example |
|------|------------|---------|
| Birthday | Yearly | Built-in, already exists |
| Anniversary | Yearly | Wedding anniversary, dating anniversary |
| Custom annual | Yearly | Adoption day, sobriety date |
| One-time | Once | Graduation, baby due date |

**Visibility levels:**
- Friends only (default)
- Friends + groups (visible in shared groups)
- Private (only on own calendar)

**Expected behavior:**
1. User taps "Add Event" in calendar or profile
2. Selects event type (anniversary, custom)
3. Enters date and optional title
4. Sets visibility (friends/groups/private)
5. Event appears on user's calendar
6. If friends visibility, appears on friends' calendars with user's name

### 5. Friends Calendar Integration

**Extension to existing calendar:**

Current state:
- Calendar shows group member birthdays
- Grouped by group with color coding
- Countdown cards for upcoming

New with friends:
- Add "Friends" as a source alongside groups
- Friends' birthdays visible even if not in shared group
- Friends' custom public dates visible
- Color coding: Group = group color, Friends-only = friend-specific color

**UI considerations:**
- Toggle to show/hide friend dates
- Toggle to show/hide group dates
- Combined "all dates" view (default)
- Filter by: Groups | Friends | All

**Calendar marking:**
- Dot color indicates source (group vs friends)
- Multiple dots for same-day events
- Tap date shows all events for that day

### 6. Friends-to-Groups Bridge

**Expected behavior:**
1. User views friend profile
2. Sees "Invite to Group" button
3. Taps button, sees list of their groups
4. Selects group, confirms invitation
5. Friend receives group invitation notification
6. Friend can accept/decline group invite

**Reverse flow:**
1. In group, user sees non-member friends
2. "Invite Friends" shows friends not in this group
3. One-tap invite sends group invitation

**Dependencies:** Uses existing group invitation system, just adds friend list as source.

## MVP Recommendation

**Phase 1: Core Friends (ship first)**
1. Friend requests (send/accept/decline) - table stakes
2. View friends list - table stakes
3. Remove friend - table stakes
4. Pending requests view - table stakes
5. Basic friend search - table stakes

**Phase 2: Discovery (ship second)**
1. Contact import friend discovery - highest impact differentiator
2. Shared group suggestions - leverages existing data
3. Mutual friends suggestions - network growth

**Phase 3: Calendar & Events (ship third)**
1. Friends calendar view - extends existing feature
2. Birthday visibility to friends - privacy control
3. Custom public dates - differentiator

**Phase 4: Integration (ship last)**
1. Friends-to-groups bridge - nice-to-have

**Defer indefinitely:**
- All anti-features listed above
- Any "social feed" or activity stream
- Any real-time or background sync features

## Complexity Notes

| Feature | Complexity | Why |
|---------|------------|-----|
| Contact import | Medium | Permission handling, E.164 normalization, hash generation, batch matching |
| Phone hash matching | Low | Simple RPC function with index lookup |
| Friend requests | Low | Standard state machine, reuse notification system |
| Suggested friends (contacts) | Low | Query hashed phone table |
| Suggested friends (mutual) | Medium | Graph traversal query, needs optimization for scale |
| Suggested friends (groups) | Low | Simple JOIN on group_members |
| Custom public dates | Medium | New table, visibility logic, calendar integration |
| Friends calendar view | Low | Extends existing calendar, additional data source |
| Friends-to-groups bridge | Low | UI flow only, uses existing invitation system |

## Schema Impact Summary

New tables needed:
- `friendships` - relationship between users
- `friend_requests` - pending/declined requests
- `phone_hashes` - hashed phone numbers for matching
- `custom_dates` - user-defined events (anniversaries, etc.)

Extensions to existing:
- `users` table: `phone_hash` column for matching
- `users` table: `friends_can_see_birthday` boolean
- Existing notifications table: new notification types

## Sources

### Contact Discovery & Privacy
- [Bluesky's Find Friends Privacy Model](https://bsky.social/about/blog/12-16-2025-find-friends) - Mutual consent approach
- [TikTok PETAce Privacy Approach](https://developers.tiktok.com/blog/tiktok-practices-in-privacy-enhancing-technologies) - PSI for contact matching
- [Signal's Contact Discovery](https://signal.org/blog/contact-discovery/) - Why simple hashing is broken for true privacy
- [Mobile Private Contact Discovery Research](https://contact-discovery.github.io/) - Academic analysis of contact discovery attacks

### Friend Suggestion Algorithms
- [Facebook Friend Suggestion Algorithm](https://medium.com/@shreyash9m/facebook-friend-suggestion-algorithm-ff9319e2ad7f) - Mutual friends scoring
- [Social Media Friend Recommendations](https://www.sciencedirect.com/science/article/pii/S2666285X21000406) - ML approaches
- [Instagram Friend Suggestions](https://buzzvoice.com/blog/how-instagram-suggests-friends-and-contacts/) - Multi-signal approach

### Social Calendar Apps
- [Howbout Shared Calendar](https://howbout.app/) - Friends-first calendar patterns
- [hip Birthday Reminder](https://www.hip.app/) - Birthday + custom events UX
- [TimeTree](https://apps.apple.com/us/app/timetree-shared-calendar/id952578473) - Shared calendar with groups

### Technical (expo-contacts)
- [Expo Contacts Documentation](https://docs.expo.dev/versions/latest/sdk/contacts/) - API reference
- [React Native Contacts Permission Handling](https://medium.com/@iLuckyisrael/mastering-sms-contacts-and-location-in-react-native-expo-permissions-8fe4adc4bcd8) - Permission patterns

## Confidence Assessment

| Feature Area | Confidence | Rationale |
|--------------|------------|-----------|
| Friend requests | HIGH | Standard pattern, no unknowns |
| Contact import | HIGH | expo-contacts well-documented, pattern established |
| Phone hash matching | MEDIUM | Simple approach works, true privacy requires PSI |
| Suggested friends (mutual) | MEDIUM | Algorithm clear, query optimization may need tuning |
| Custom public dates | MEDIUM | Design clear, UX needs validation |
| Calendar integration | HIGH | Extends proven existing implementation |

---
*Research date: 2026-02-09*
*Valid until: 30 days (stable domain, mature patterns)*
