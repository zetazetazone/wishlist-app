# Project Milestones: Wishlist Group Gifting App

## v1.4 Friends System (Shipped: 2026-02-10)

**Delivered:** Friends network outside of groups with contact discovery, friend requests, public dates, and calendar integration.

**Phases completed:** 23-28 (12 plans total)

**Key accomplishments:**

- Friends database foundation with ordered bidirectional constraint and `are_friends()` SECURITY DEFINER helper for RLS policies
- Friends tab with friend list display, profile navigation, and remove functionality using bidirectional OR queries
- Complete friend request lifecycle (send/accept/decline/block) with push notification triggers for new requests and acceptances
- Contact import with iOS 18 limited access handling, E.164 phone normalization via libphonenumber-js, and user search by name/email
- Public dates management screen for anniversaries and special events with annual recurrence support
- Calendar integration displaying friend dates in distinct teal color (#0D9488) with source indicators and device sync

**Stats:**

- 65 files created/modified
- 14,210 lines added
- 6 phases, 12 plans, ~31 tasks
- 2 days from start to ship (2026-02-09 → 2026-02-10)

**Git range:** `feat(23-01)` → `fix(28-02)`

**What's next:** Instagram friend discovery, notification preferences, chat read receipts/reactions, Gift Leader dashboard

---

## v1.3 Gift Claims & Personal Details (Shipped: 2026-02-09)

**Delivered:** Gift claiming with split contributions, personal detail profiles, and secret notes for collaborative gift-giving intelligence.

**Phases completed:** 18-22 (15 plans total)

**Key accomplishments:**

- Atomic gift claiming via PostgreSQL RPC with celebrant-safe partial visibility (sees "taken" not claimer)
- Split contribution system with progress bars and contributor notifications
- Personal details profile with sizes, preferences, external wishlist links, and completeness indicators
- Secret notes with subject-exclusion RLS pattern (hidden from note subject, visible to other group members)
- Claim enhancements with push notifications and celebration page summaries

**Git range:** `feat(18-01)` → `docs(22-03)`

---

## v1.2 Group Experience (Shipped: 2026-02-05)

**Delivered:** Rich group creation with photos and descriptions, group modes (Greetings vs Gifts), budget tracking, and redesigned group view with birthday countdowns.

**Phases completed:** 11-17 (18 plans total)

**Key accomplishments:**

- Group photo upload with compression and generated avatars for photo-less groups
- Group mode system (Greetings/Gifts) controlling feature visibility with smooth transitions
- Budget tracking with per-gift, monthly pooled, and yearly approaches with progress indicators
- Redesigned group view with member cards sorted by birthday, countdown text, and favorite previews
- Comprehensive group settings for admin editing and member management

**Git range:** `feat(11-01)` → `docs(17-03)`

---

## v1.1 My Wishlist Polish + Profile Editing (Shipped: 2026-02-03)

**Delivered:** Profile editing, special wishlist items (Surprise Me, Mystery Box), favorite marking, and wishlist display polish.

**Phases completed:** 6-10 (13 plans total)

**Key accomplishments:**

- Profile settings screen with name/photo editing and locked birthday
- Special item types: Surprise Me and Mystery Box with €50/€100 tiers
- Per-group favorite marking with visual distinction and pinning
- Wishlist display polish with profile picture header and horizontal star ratings

**Git range:** `feat(06-01)` → `docs(10-02)`

---

## v1.0 MVP (Shipped: 2026-02-02)

**Delivered:** Full birthday gift coordination with push notifications, secret chat rooms, in-app calendar, and smart reminder sequences.

**Phases completed:** 1-5 (10 plans total)

**Key accomplishments:**

- Complete push notification infrastructure with Expo Push Service integration and Supabase Edge Function delivery
- Blocking onboarding flow collecting user birthday, display name, and optional profile photo with realtime notification inbox
- Secret chat coordination system with RLS-enforced celebrant exclusion and automatic Gift Leader assignment using birthday rotation algorithm
- In-app birthday calendar with multi-dot group marking, countdown cards, and device calendar sync (Google/Apple)
- Smart birthday reminder sequences (4w/2w/1w/day-of) delivered at user's local 9:00 AM with Gift Leader nudges and new member catch-up
- Schema migration fixing is_read/read_at mismatch with comprehensive webhook setup documentation

**Stats:**

- 77 files created/modified
- 12,432 lines of TypeScript
- 5 phases, 10 plans, ~85 tasks
- 2 days from start to ship (2026-02-01 → 2026-02-02)

**Git range:** `feat(01-02)` → `docs(05)`

**What's next:** Profile editing, notification preferences, chat read receipts/reactions, Gift Leader dashboard

---

*Milestone history for Wishlist Group Gifting App*
