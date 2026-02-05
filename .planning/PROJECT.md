# Wishlist Group Gifting App

## What This Is

A mobile app (iOS & Android) that helps friend groups coordinate gift-giving for birthdays and celebrations. Members share Amazon wishlists, claim items secretly, and the app automatically assigns a "Gift Leader" for each celebration based on birthday rotation. Features push notifications, secret chat rooms (excluding celebrant), in-app birthday calendar with device sync, and smart reminder sequences. Built with React Native/Expo and Supabase.

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

### Active

**v1.3 — Gift Claims & Personal Details**

- [ ] Member can claim a wishlist item (locked to one claimer at a time)
- [ ] Claims visible to all group members except celebrant
- [ ] Claimer can optionally open item for split contributions
- [ ] Claimer can unclaim an item (releases it for others)
- [ ] Celebrant sees claimed items as "taken" (no name shown)
- [ ] Claiming works in both Gifts and Greetings modes
- [ ] User can fill in personal details (sizes, preferences, external links)
- [ ] Personal details are global (shared across all groups)
- [ ] Group members can add secret notes about other members (hidden from profile owner)
- [ ] Secret notes visible only to other group members for gift-giving context

**Deferred to v1.4+**

- [ ] User can configure notification preferences
- [ ] User can see read receipts in chat
- [ ] User can add reactions to messages
- [ ] Gift Leader progress dashboard with visual coordination status
- [ ] Auto-fallback when Gift Leader is unavailable

### Out of Scope

- Email/SMS notifications — push + in-app sufficient for mobile-first app
- OAuth/social login — email/password works, add later
- Video/voice chat — text chat is enough for gift coordination
- Payment splitting in-app — Gift Leader tracks contributions manually
- AI gift suggestions — scope creep, focus on coordination first
- Location-based reminders — privacy concerns, requires continuous tracking
- Multiple calendars per group — one birthday calendar per group is sufficient
- Mystery Box purchasing — v1.1 adds placeholder only, actual purchasing deferred

## Context

**Shipped v1.0 with:**
- 12,432 lines of TypeScript across 77 files
- React Native 0.81.5 with Expo 54
- Supabase for auth, database, realtime, edge functions, and storage
- 10 database migrations, 2 pg_cron jobs, 1 Edge Function
- Comprehensive RLS security with celebrant exclusion enforcement

**Tech stack:**
- React Native + Expo 54 (managed workflow)
- Supabase (Auth, Database, Realtime, Edge Functions, Storage)
- expo-notifications for push delivery
- expo-calendar for device sync
- react-native-calendars for in-app calendar
- @shopify/flash-list for performant lists

**Manual setup required for full E2E:**
1. Deploy Edge Function: `npx supabase functions deploy push`
2. Configure webhook following `docs/WEBHOOK-SETUP.md`
3. Create `avatars` storage bucket (public)
4. Enable pg_cron extension in Supabase Dashboard

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

## Current Milestone: v1.3 Gift Claims & Personal Details

**Goal:** Enable members to claim wishlist items for coordinated gift-buying and provide rich personal detail profiles for better gift selection.

**Target features:**
- Gift Claims: Claim/unclaim items, split contributions, celebrant exclusion, "taken" indicator
- Personal Details: Sizes (shirt, shoe, ring), preferences (colors, brands, hobbies), external wishlist links
- Secret Notes: Group members can add hidden notes about each other for gift-giving context
- Works across both Gifts and Greetings group modes

---
*Last updated: 2026-02-05 after v1.3 milestone start*
