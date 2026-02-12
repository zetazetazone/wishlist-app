# Wishlist Group Gifting App

## What This Is

A mobile app (iOS & Android) that helps friend groups coordinate gift-giving for birthdays and celebrations. Members share wishlists, claim items secretly, and the app automatically assigns a "Gift Leader" for each celebration based on birthday rotation. Features push notifications, secret chat rooms (excluding celebrant), in-app birthday calendar with device sync, smart reminder sequences, and a friends network for discovering contacts and seeing friend dates. Built with React Native/Expo and Supabase.

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
- ✓ User completes onboarding with birthday and display name — v1.0
- ✓ User can optionally add profile photo during onboarding — v1.0
- ✓ User can view other members' profiles in a group — v1.0
- ✓ User can receive push notifications for urgent updates — v1.0
- ✓ User receives birthday reminder on day of event — v1.0
- ✓ User receives smart reminders (4w/2w/1w before birthday) — v1.0
- ✓ User can view in-app notification inbox — v1.0
- ✓ User receives notification when assigned as Gift Leader — v1.0
- ✓ Each celebration has a chat room visible to all members except celebrant — v1.0
- ✓ Users can send messages in celebration chat rooms — v1.0
- ✓ Users can link messages to specific wishlist items — v1.0
- ✓ User can view in-app calendar showing all group birthdays — v1.0
- ✓ Celebrations are automatically created from birthdays — v1.0
- ✓ User can sync birthday events to device calendar (Google/Apple) — v1.0
- ✓ User can see planning window countdown to each birthday — v1.0
- ✓ Gift Leader is automatically assigned by birthday order — v1.0
- ✓ Gift Leader sees their responsibilities clearly in UI — v1.0
- ✓ Gift Leader can be manually reassigned by group admin — v1.0
- ✓ Contribution tracking logs who spent what on each gift — v1.0
- ✓ User sees wishlist cards with horizontal star ratings — v1.1
- ✓ User sees their profile picture in the My Wishlist header — v1.1
- ✓ User can mark one item as "favorite" per group (pinned + highlighted) — v1.1
- ✓ User can add a "Surprise Me" item (signals openness to any gift) — v1.1
- ✓ User can add a "Mystery Box" placeholder item (€50/€100 tiers) — v1.1
- ✓ User can edit their profile (name, photo) after onboarding — v1.1

- ✓ User can add group photo and description when creating a group — v1.2
- ✓ User can select group mode: "Greetings only" or "Gifts" — v1.2
- ✓ User can set budget approach: per-gift, monthly pooled, or yearly budget — v1.2
- ✓ Admin can edit group details (name, description, photo) — v1.2
- ✓ Admin can manage members (remove, change admin role) — v1.2
- ✓ Admin can change group mode anytime — v1.2
- ✓ Admin can adjust budget settings — v1.2
- ✓ User sees group header with photo and description in group view — v1.2
- ✓ User sees member cards sorted by closest birthday — v1.2
- ✓ Member cards show profile pic, name, birthday countdown, favorite item preview — v1.2
- ✓ User can tap member card to go to their celebration page — v1.2

- ✓ Member can claim a wishlist item (locked to one claimer at a time) — v1.3
- ✓ Claims visible to all group members except celebrant — v1.3
- ✓ Claimer can optionally open item for split contributions — v1.3
- ✓ Claimer can unclaim an item (releases it for others) — v1.3
- ✓ Celebrant sees claimed items as "taken" (no name shown) — v1.3
- ✓ Claiming works in both Gifts and Greetings modes — v1.3
- ✓ User can fill in personal details (sizes, preferences, external links) — v1.3
- ✓ Personal details are global (shared across all groups) — v1.3
- ✓ Group members can add secret notes about other members (hidden from profile owner) — v1.3
- ✓ Secret notes visible only to other group members for gift-giving context — v1.3

- ✓ User can import phone contacts to find friends who use the app — v1.4
- ✓ User can send friend requests to other users — v1.4
- ✓ User can accept or decline incoming friend requests — v1.4
- ✓ User can view pending friend requests in Requests screen — v1.4
- ✓ User can see friends list with their profiles — v1.4
- ✓ User can add custom public dates (anniversaries, events) to their profile — v1.4
- ✓ Friends can see each other's birthday and custom public dates in calendar — v1.4
- ✓ User can sync friend dates to device calendar (Google/Apple) — v1.4
- ✓ User can remove friends — v1.4
- ✓ User can block another user (prevents future friend requests) — v1.4
- ✓ User can search for other users by name or email — v1.4

- ✓ App auto-detects device language on first launch (fallback to English) — v1.5
- ✓ App supports English and Spanish languages — v1.5
- ✓ All UI strings are localized (buttons, labels, navigation, error messages) — v1.5
- ✓ System messages are localized (push notifications, reminders, auto-generated content) — v1.5
- ✓ User's language preference is stored server-side in profile — v1.5
- ✓ User can change language in profile settings — v1.5
- ✓ Localization architecture supports adding more languages in the future — v1.5

### Active

**v1.6+ — Future Enhancements**

- [ ] Instagram integration for friend discovery
- [ ] User can configure notification preferences
- [ ] User can see read receipts in chat
- [ ] User can add reactions to messages
- [ ] Gift Leader progress dashboard with visual coordination status
- [ ] Auto-fallback when Gift Leader is unavailable
- [ ] Suggested friends based on mutual friends/groups
- [ ] Mutual friend display ("You and Sarah have 3 mutual friends")
- [ ] Friend birthday reminders (separate from calendar events)
- [ ] User can invite friends to groups from friend list

### Out of Scope

- Email/SMS notifications — push + in-app sufficient for mobile-first app
- OAuth/social login — email/password works, add later
- Video/voice chat — text chat is enough for gift coordination
- Payment splitting in-app — Gift Leader tracks contributions manually
- AI gift suggestions — scope creep, focus on coordination first
- Location-based reminders — privacy concerns, requires continuous tracking
- Multiple calendars per group — one birthday calendar per group is sufficient
- Mystery Box purchasing — v1.1 adds placeholder only, actual purchasing deferred
- Instagram friend discovery — OAuth complexity, phone contacts sufficient for now
- Auto-friend via group membership — explicit friend requests preferred
- Per-date visibility controls — all dates public to friends is sufficient
- Friend wishlists visibility — v1.4 focuses on dates, wishlist sharing separate feature

## Context

**Shipped v1.5 with:**
- ~47,000 lines of TypeScript across 200+ files
- React Native 0.81.5 with Expo 54
- Supabase for auth, database, realtime, edge functions, and storage
- 15 database migrations, 2 pg_cron jobs, 1 Edge Function
- Complete i18n infrastructure with i18next, react-i18next, expo-localization
- 956 translation keys in English and Spanish with TypeScript-safe keys
- Server-synced language preference with localized push notifications

**Tech stack:**
- React Native + Expo 54 (managed workflow)
- Supabase (Auth, Database, Realtime, Edge Functions, Storage)
- expo-notifications for push delivery
- expo-calendar for device sync
- expo-contacts for contact import (v1.4)
- expo-localization for device language detection (v1.5)
- i18next + react-i18next for localization (v1.5)
- libphonenumber-js for E.164 phone normalization (v1.4)
- react-native-calendars for in-app calendar
- @shopify/flash-list for performant lists

**Manual setup required for full E2E:**
1. Deploy Edge Function: `npx supabase functions deploy push`
2. Configure webhook following `docs/WEBHOOK-SETUP.md`
3. Create `avatars` storage bucket (public)
4. Enable pg_cron extension in Supabase Dashboard
5. Run `npx supabase db reset` to apply all migrations

## Constraints

- **Platform**: Must work on iOS and Android via Expo managed workflow
- **Backend**: Supabase only — no additional backend services
- **Push notifications**: Must use Expo Push Notifications (expo-notifications)
- **Calendar sync**: Use expo-calendar for device calendar integration
- **Realtime chat**: Use Supabase Realtime for chat messages
- **Physical device required**: Push notifications only work on physical devices

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Gift Leader by birthday order | Natural rotation, fair distribution, easy to understand | ✓ Good - deterministic assignment |
| Chat per celebration (not per member) | Clean separation, chat only exists when relevant | ✓ Good - natural coordination |
| 4w/2w/1w reminder sequence | Enough lead time without being annoying | ✓ Good - user-friendly cadence |
| Manual Gift Leader reassignment only | Keep v1 simple, auto-fallback adds complexity | ✓ Good - meets needs |
| Push + in-app notifications (no email) | Mobile-first app, push is the natural channel | ✓ Good - appropriate |
| Celebrant exclusion at RLS level | Security-critical - prevents API-level data leakage | ✓ Good - secure by default |
| 15-minute cron for timezone coverage | Matches 9:00 AM local time targeting | ✓ Good - accurate delivery |
| Nullable TIMESTAMPTZ for read_at | Richer info than boolean, same query pattern | ✓ Good - future-proof |
| Ordered bidirectional friends constraint | `user_a_id < user_b_id` prevents duplicate rows | ✓ Good - clean data model |
| are_friends() SECURITY DEFINER helper | Enables RLS policies without recursion issues | ✓ Good - secure and reusable |
| E.164 phone normalization | Cross-platform contact matching works reliably | ✓ Good - consistent matching |
| Friend dates in teal (#0D9488) | Visual distinction from group birthday colors | ✓ Good - clear differentiation |
| Month/day storage for public dates | Enables efficient annual recurrence queries | ✓ Good - flexible design |
| i18next + react-i18next stack | Expo official recommendation, 25M+ weekly downloads, TypeScript support | ✓ Good - mature ecosystem |
| Three-tier language hierarchy | Server > Local > Device enables cross-device sync and push localization | ✓ Good - flexible and reliable |
| preferred_language in users table | Edge Function service role can access (unlike auth metadata) | ✓ Good - enables localized push |
| Neutral Latin American Spanish | Broader audience (ustedes vs vosotros), avoids regional specificity | ✓ Good - inclusive |
| Single translation namespace | Simpler than separate files, easier maintenance, works with nested keys | ✓ Good - maintainable |
| ESLint v8 for i18n linting | Required for .eslintrc.js compatibility with Expo config | ✓ Good - tooling works |

---
*Last updated: 2026-02-12 after v1.5 milestone*
