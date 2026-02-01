# Wishlist Group Gifting App

## What This Is

A mobile app (iOS & Android) that helps friend groups coordinate gift-giving for birthdays and celebrations. Members share Amazon wishlists, claim items secretly, and the app automatically assigns a "Gift Leader" for each celebration based on birthday rotation. Built with React Native/Expo and Supabase.

## Core Value

**Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.**

## Requirements

### Validated

- ✓ User can sign up and log in with email/password — existing
- ✓ User session persists across app restarts — existing
- ✓ User can create a group — existing
- ✓ User can join a group via invite code — existing
- ✓ User can view their groups — existing
- ✓ User can add wishlist items with title, URL, price, priority — existing
- ✓ User can view and delete their wishlist items — existing
- ✓ User can view group members — existing

### Active

- [ ] User completes onboarding with birthday and display name before using app
- [ ] User can view and edit their profile (name, birthday, photo)
- [ ] User can view other members' profiles in a group
- [ ] Each celebration has a chat room visible to all members except the celebrant
- [ ] Users can send messages in celebration chat rooms
- [ ] User's birthday automatically creates a calendar event for all group members
- [ ] User can view an in-app calendar showing all group birthdays
- [ ] User can sync birthday events to their device calendar (Google/Apple)
- [ ] Gift Leader is automatically assigned based on birthday order (person after celebrant)
- [ ] Gift Leader can be manually reassigned by group admin
- [ ] Gift Leader sees their responsibilities clearly in UI
- [ ] Gift Leader receives instructions notification when assigned
- [ ] User receives push notifications for birthday reminders (4w/2w/1w before)
- [ ] User can view in-app notification inbox
- [ ] User receives notification when assigned as Gift Leader
- [ ] New members joining mid-year are slotted into the birthday rotation

### Out of Scope

- Email notifications — push + in-app sufficient for v1
- OAuth/social login — email/password works, add later
- Video/voice chat — text chat is enough for gift coordination
- Payment splitting in-app — Gift Leader tracks contributions manually
- Multiple calendars per group — one birthday calendar per group is sufficient

## Context

**Existing codebase:**
- React Native 0.81.5 with Expo 54, TypeScript
- Supabase for auth, database, and realtime
- File-based routing via expo-router
- Gluestack UI + NativeWind for styling
- No notification infrastructure yet
- No calendar functionality yet
- Basic profile exists in auth but no dedicated profile screen/editing

**User flow today:**
1. Sign up/login → lands on wishlist tab
2. Create or join groups
3. Add items to personal wishlist
4. View group members

**What's missing:**
- Onboarding flow to collect birthday
- Profile viewing/editing
- Secret chat per celebration
- Calendar view + device sync
- Gift Leader assignment logic
- Notification system (push + in-app)

## Constraints

- **Platform**: Must work on iOS and Android via Expo managed workflow
- **Backend**: Supabase only — no additional backend services
- **Push notifications**: Must use Expo Push Notifications (expo-notifications)
- **Calendar sync**: Use expo-calendar for device calendar integration
- **Realtime chat**: Use Supabase Realtime for chat messages

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Gift Leader by birthday order | Natural rotation, fair distribution, easy to understand | — Pending |
| Chat per celebration (not per member) | Clean separation, chat only exists when relevant | — Pending |
| 4w/2w/1w reminder sequence | Enough lead time without being annoying | — Pending |
| Manual Gift Leader reassignment only | Keep v1 simple, auto-fallback adds complexity | — Pending |
| Push + in-app notifications (no email) | Mobile-first app, push is the natural channel | — Pending |

---
*Last updated: 2026-02-02 after initialization*
