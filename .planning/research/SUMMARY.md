# Project Research Summary

**Project:** Wishlist Group Gifting App
**Domain:** Social coordination mobile app (React Native/Expo)
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

This research covers adding four major features to an existing Expo 54 + Supabase wishlist app: push notifications, secret group chat, calendar integration, and a Gift Leader coordination system. The app already has a solid foundation (React 19, React Native 0.81 with New Architecture, Supabase for backend/auth) making it well-positioned for these additions.

**The recommended approach** leverages the existing Supabase infrastructure as the central hub: store push tokens in user profiles, use Supabase Realtime for chat (not third-party chat SDKs), trigger notifications via Edge Functions, and manage all state server-side. The stack additions are minimal and vetted: expo-notifications for push, FlashList for performant lists, react-native-calendars for UI, expo-calendar for device sync, and date-fns for date handling. Total new dependencies: 8 libraries, all compatible with the existing stack.

**Key risks center on three areas:** (1) Row Level Security MUST be enabled on chat tables or celebrants will see their surprise - 83% of Supabase apps have RLS misconfigurations, (2) push token lifecycle management is critical or notifications silently fail for growing user percentages, and (3) race conditions between initial data fetch and WebSocket connection will cause missing messages. Each has clear prevention strategies documented in pitfalls research. Build order follows strict dependency chain: notifications infrastructure first (everything needs alerts), then profiles/birthdays (required for coordination), then celebrations + Gift Leader (container for features), then chat (requires celebrations), then calendar polish.

## Key Findings

### Recommended Stack

The existing stack (Expo 54, React 19, Supabase) is modern and well-suited. Stack additions focus on official Expo SDK packages and Supabase's built-in capabilities rather than third-party services. No external dependencies like Novu, Stream Chat, or Firebase are needed - Supabase provides realtime, storage, and edge functions.

**Core technologies:**
- **expo-notifications ~0.32.16**: Push notifications with unified iOS/APNs and Android/FCM API, free Expo Push Service, deep linking via expo-router
- **Supabase Realtime Broadcast**: Real-time chat with lower latency than postgres_changes, officially recommended for messaging, built into existing @supabase/supabase-js
- **@shopify/flash-list 2.0.2**: Performant list rendering for notification inbox and chat (5x faster than FlatList, required for New Architecture)
- **expo-calendar ~15.0.8**: Device calendar sync to add birthday events to Google/Apple Calendar with system UI integration
- **react-native-calendars 1.1313.0**: In-app calendar view (pure JS, no native code, 10.2k GitHub stars)
- **date-fns 3.x**: Date manipulation and formatting (tree-shakeable, modern, replaces deprecated Moment.js)

**Critical integration points:**
- Supabase Edge Functions trigger push notifications on database events
- Push tokens stored in Supabase device_tokens table
- FlashList used for both notification inbox and chat message lists
- Development builds required (push notifications removed from Expo Go in SDK 53+)

### Expected Features

Research identified clear table stakes versus differentiators through competitive analysis of Giftster, Elfster, Givetastic, and Hip Birthday Reminder.

**Must have (table stakes):**
- **Birthday reminders on day of event** — minimum user expectation for any birthday app
- **Secret chat per celebration (hidden from celebrant)** — core coordination feature, the whole point of secret gifting
- **Configurable reminder timing** — users need control over when they receive alerts
- **Push notifications for urgent updates** — item claimed, gift bought, event approaching
- **Basic text messaging in chat** — coordinate gift purchases without external apps
- **Birthday calendar view** — see upcoming birthdays at a glance
- **Designated Gift Leader per celebration** — formalize the coordinator role that naturally emerges

**Should have (competitive differentiators):**
- **Smart reminder sequences (4w/2w/1w before)** — most apps only do day-of or day-before; this enables actual planning instead of last-minute panic
- **Gift context linking in chat** — attach messages to specific wishlist items ("I'll get the blue one")
- **Automatic celebration creation from birthdays** — when birthday approaches, auto-create coordination event
- **Calendar sync to Google/Apple Calendar** — export birthday events to external calendars
- **Leader progress dashboard** — visual overview of coordination status and claiming

**Defer (v2+):**
- **Voice/video calling** — massive scope increase, not needed for gift coordination
- **AI gift suggestions** — scope creep, focus on coordination first
- **Location-based reminders** — privacy concerns, requires continuous tracking
- **Email/SMS notifications** — users expect push for apps, adds infrastructure complexity
- **Complex calendar features** — don't rebuild Google Calendar, stay birthday-focused

### Architecture Approach

The architecture integrates around **celebrations as the central entity** connecting birthdays, chat rooms, and Gift Leaders. This provides clean data modeling and enables per-celebration features without complex cross-table queries. Secret chat exclusion is enforced at the database level via Row Level Security policies (`celebrant_id != auth.uid()`) rather than relying on UI filtering.

**Major components:**
1. **Notification System** — Two-table design (notification_messages + user_notifications) for scalability, Supabase Edge Functions for push delivery, token lifecycle management with staleness tracking
2. **Chat Infrastructure** — Supabase Realtime Broadcast for low-latency messaging, chat rooms tied 1:1 to celebrations, RLS policies prevent celebrant access, message persistence in PostgreSQL
3. **Calendar Service** — In-app view (react-native-calendars) + device sync (expo-calendar), birthday-order Gift Leader rotation via pg_cron, celebration auto-creation 30 days before birthdays
4. **Gift Leader System** — Birthday-order rotation algorithm, assignment history audit trail, manual reassignment with logging, succession handling when leader leaves

**Key patterns:**
- Single Supabase client instance prevents connection management issues
- FlashList with inverted prop for chat-style scrolling
- Server-assigned timestamps and sequence numbers for message ordering (never trust client timestamps)
- Push notifications sent server-side via cron/webhooks (not client-scheduled) for reliability against Android battery optimization

### Critical Pitfalls

Top 5 pitfalls based on official documentation, GitHub issues, and CVE reports:

1. **RLS Not Enabled on Secret Chat Tables** — In January 2025, 170+ apps exposed data due to missing RLS (CVE-2025-48757). 83% of Supabase databases have RLS misconfigurations. Enable RLS immediately on table creation, create explicit allow policies, audit all tables before launch, test as different user roles.

2. **Push Token Staleness and Silent Failures** — Tokens expire after 270 days inactivity (FCM), become invalid on reinstall/restore/device switch. Prevention: refresh tokens on every app open, implement monthly validation, listen for onNewToken callbacks, cleanup inactive tokens >30 days, detect FCM error codes and remove invalid tokens.

3. **Race Condition Between Initial Fetch and WebSocket Connection** — Messages sent in the 500ms window between data fetch and WebSocket connection are lost. Prevention: implement event queue pattern (fetch snapshot → connect WebSocket → queue events → re-fetch to confirm → process queue), use server-assigned sequence numbers, verify no gaps after sync.

4. **Badge Count Management Chaos** — iOS `setBadgeCountAsync(0)` clears badge AND notification center. Android badge counts ADD rather than replace. Different launchers have inconsistent support. Prevention: maintain badge count server-side as source of truth, send explicit count with each push, separate "clear notifications" from "reset badge" on iOS.

5. **Calendar Permission Request Timing** — Requesting at app start with generic explanations leads to high denial rates. Prevention: request in context when user first tries calendar feature, provide specific explanation ("We'll sync birthday events so you never miss a gift deadline"), handle denial gracefully with in-app alternative.

## Implications for Roadmap

Based on research, suggested phase structure follows strict dependency chain and risk mitigation order:

### Phase 1: Notification Infrastructure
**Rationale:** All subsequent features depend on push notifications (Gift Leader assignment alerts, chat message notifications, birthday reminders). Must establish reliable foundation before building dependent features. Addresses critical pitfall #2 (token staleness) at architecture level.

**Delivers:** Push notification registration, token lifecycle management, Supabase Edge Function for sending, basic in-app notification inbox

**Addresses:** Push notifications for urgent updates (table stakes), configurable reminder timing (table stakes)

**Avoids:** Push token staleness, background handler limitations, Android notification channel issues

**Research flag:** Standard patterns well-documented by Expo — skip `/gsd:research-phase`

---

### Phase 2: Profile & Birthday Data
**Rationale:** Birthday data is required for calendar, celebrations, and Gift Leader rotation. Onboarding flow needed to collect this information before users can participate in groups.

**Delivers:** User profiles with birthday field, onboarding screen, profile edit capability, birthday validation

**Addresses:** Foundation for calendar view, celebration creation, Gift Leader assignment

**Avoids:** Missing required data causing downstream failures

**Research flag:** Standard CRUD patterns — skip `/gsd:research-phase`

---

### Phase 3: Celebrations & Gift Leader System
**Rationale:** Celebrations are the central entity connecting chat rooms, Gift Leaders, and coordination. Gift Leader assignment logic must be established before chat (leader receives special notifications about chat activity).

**Delivers:** Celebrations table, auto-creation via pg_cron 30 days before birthdays, birthday-order Gift Leader rotation, assignment history audit trail, manual reassignment capability

**Addresses:** Designated Gift Leader (table stakes), automatic celebration creation (differentiator), leader rotation (differentiator)

**Avoids:** Role assignment without permission matrix, orphaned groups when leader leaves, role state desync

**Research flag:** Gift Leader rotation algorithm needs validation during implementation — consider `/gsd:research-phase` if edge cases emerge

---

### Phase 4: Secret Chat Rooms
**Rationale:** Chat depends on celebrations existing (1:1 relationship). This is the highest security risk phase - RLS misconfiguration would expose surprises to celebrants. Must be implemented with extreme care.

**Delivers:** Chat rooms table with RLS policies, real-time message subscription via Supabase Broadcast, message persistence, celebrant exclusion enforcement, chat UI components

**Addresses:** Secret chat per celebration (table stakes), basic text messaging (table stakes), gift context linking (differentiator)

**Avoids:** RLS not enabled (CRITICAL), race condition between fetch and WebSocket, subscription cleanup memory leaks, celebrant exclusion leaks

**Research flag:** Security-critical phase — **MUST** use `/gsd:research-phase` to validate RLS policies, test celebrant exclusion thoroughly, review message sync pattern

---

### Phase 5: Calendar Integration
**Rationale:** Can be built in parallel with or after chat - no hard dependency. Provides UX polish and device integration. Lower risk than chat security.

**Delivers:** In-app calendar view showing all group birthdays, device calendar sync with expo-calendar, birthday event creation with multi-stage alarms

**Addresses:** Birthday calendar view (table stakes), calendar sync to Google/Apple Calendar (differentiator), planning window visualization (differentiator)

**Avoids:** Permission request timing issues, platform differences in calendar API, event sync state inconsistency

**Research flag:** Standard patterns well-documented — skip `/gsd:research-phase`

---

### Phase 6: Smart Reminder Sequences
**Rationale:** Final phase builds on notification infrastructure from Phase 1 and birthday/celebration data from Phases 2-3. Differentiating feature that enables planning versus last-minute panic.

**Delivers:** 4w/2w/1w birthday reminder cron jobs, user-configurable reminder preferences, reminder cancellation when gift purchased, in-app reminders as backup

**Addresses:** Smart reminder sequences (differentiator), relationship-based timing (differentiator)

**Avoids:** Notification fatigue, timezone handling issues, scheduled notification reliability on Android

**Research flag:** Notification timing and user preference logic may need validation — consider `/gsd:research-phase` if complex rules emerge

---

### Phase Ordering Rationale

- **Notifications first** because Gift Leader assignment, chat messages, and birthday reminders all trigger notifications. Building dependent features before notification infrastructure would require rework.

- **Profiles/birthdays before celebrations** because celebrations are auto-created from birthday data. Missing birthday information breaks the entire coordination flow.

- **Celebrations before chat** because chat rooms have 1:1 relationship with celebrations. Chat without celebrations would require complex refactoring.

- **Chat is highest security risk** so it gets dedicated phase with mandatory research validation. RLS misconfiguration would expose secrets to celebrants - unacceptable.

- **Calendar independent** so it can overlap with chat or come after without blocking. Device integration is polish, not core coordination.

- **Reminder sequences last** because they need celebrations, birthdays, and notifications all working. Also the most experimental feature (differentiator, not table stakes) so failure has lower impact.

### Research Flags

Phases requiring `/gsd:research-phase` during planning:

- **Phase 4 (Secret Chat Rooms):** MANDATORY — Security-critical phase. Must validate RLS policies prevent celebrant access, test race condition mitigation, verify subscription cleanup, audit all notification pathways for celebrant metadata leaks.

Phases with standard patterns (skip research-phase):

- **Phase 1 (Notification Infrastructure):** Well-documented by Expo, Supabase push notification guide covers Edge Function patterns
- **Phase 2 (Profile & Birthday):** Standard CRUD operations, onboarding flow is established pattern
- **Phase 5 (Calendar Integration):** expo-calendar and react-native-calendars have comprehensive documentation

Consider research-phase if implementation reveals gaps:

- **Phase 3 (Gift Leader):** Birthday rotation algorithm is novel - may need validation if edge cases like 2-person groups, same birthdays, or timezone handling become complex
- **Phase 6 (Reminder Sequences):** User preference logic and timezone-aware scheduling may need deeper research if requirements become complex

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified with official Expo/Supabase documentation, version compatibility confirmed, existing stack (Expo 54, React 19) is modern |
| Features | MEDIUM | Based on competitive analysis via WebSearch, not direct user research. Table stakes identified from multiple apps, differentiators inferred from market patterns |
| Architecture | HIGH | Verified with Supabase documentation (Realtime, RLS, Edge Functions), Expo patterns, scalable notification design validated via Medium article, database schema follows PostgreSQL best practices |
| Pitfalls | HIGH | Sourced from official Expo/Supabase docs, GitHub issues with reproduction cases, CVE reports (RLS misconfiguration), community experience reports with evidence |

**Overall confidence:** HIGH

### Gaps to Address

Areas where research was inconclusive or needs validation during implementation:

- **react-native-calendars React 19 compatibility:** Library doesn't explicitly declare React 19 peer dependency support. Pure JS library so should work, but may require `--legacy-peer-deps`. Validation needed during Phase 5 installation.

- **Gift Leader rotation edge cases:** Birthday-order algorithm needs validation for edge cases like 2-person groups (leader can't be celebrant), members with same birthday (tie-breaking logic), timezone differences affecting "next person" calculation.

- **Notification timing optimization:** 4w/2w/1w sequence is hypothesis based on competitor patterns. May need A/B testing or user feedback during Phase 6 to optimize frequency and reduce notification fatigue.

- **Supabase Realtime connection limits:** Free tier allows 500 concurrent connections. If app gains significant users before launch, need upgrade plan or connection pooling strategy. Monitor dashboard during beta testing.

- **FlashList performance on low-end devices:** While FlashList v2 is 5x faster than FlatList, real-world performance on budget Android devices (common for family coordination apps) needs validation with actual user data volumes.

## Sources

### Primary (HIGH confidence)
- [Expo Notifications SDK Reference](https://docs.expo.dev/versions/latest/sdk/notifications/) — Push notification setup, permissions, testing requirements
- [Expo Push Notifications Setup Guide](https://docs.expo.dev/push-notifications/push-notifications-setup/) — FCM/APNs configuration, development build requirements
- [Expo Calendar SDK Reference](https://docs.expo.dev/versions/latest/sdk/calendar/) — Device calendar API, permissions, platform differences
- [Supabase Realtime Broadcast Documentation](https://supabase.com/docs/guides/realtime/broadcast) — Chat architecture, why Broadcast over postgres_changes
- [Supabase Push Notifications Guide](https://supabase.com/docs/guides/functions/examples/push-notifications) — Edge Function patterns for sending push
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) — Row Level Security setup and policies
- [FlashList v2 Documentation](https://shopify.github.io/flash-list/) — New Architecture compatibility, performance characteristics
- [react-native-calendars GitHub](https://github.com/wix/react-native-calendars) — 10.2k stars, calendar UI component patterns

### Secondary (MEDIUM confidence)
- [Scalable Notifications Database Design](https://medium.com/@aboud-khalaf/building-scalable-notifications-a-journey-to-the-perfect-database-design-part-1-a7818edad0ba) — Two-table architecture pattern
- [Giftwhale Blog - Wishlist App Guide 2025](https://giftwhale.com/blog/how-to-choose-the-right-wish-list-app-in-2025) — Competitive feature analysis
- [Braze Push Notification Best Practices](https://www.braze.com/resources/articles/push-notifications-best-practices) — Notification timing and frequency patterns
- [Making Expo Notifications Work on Android 12+](https://medium.com/@gligor99/making-expo-notifications-actually-work-even-on-android-12-and-ios-206ff632a845) — Battery optimization pitfalls
- [Push Token Lifecycle](https://medium.com/@chunilalkukreja/lifecycle-of-fcm-device-tokens-61681bb6fbcf) — FCM token expiration patterns
- [WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices) — Race condition handling
- [Supabase Row Level Security Complete Guide](https://vibeappscanner.com/supabase-row-level-security) — RLS patterns and common misconfigurations

### Tertiary (LOW confidence, needs validation)
- Giftster, Elfster, Givetastic, Hip Birthday Reminder apps — Feature analysis via WebSearch, not direct testing
- Notification frequency preferences (4w/2w/1w) — Inferred from competitor patterns, not user research

---
*Research completed: 2026-02-02*
*Ready for roadmap: yes*
