# Pitfalls Research

**Research Date:** 2026-02-02
**Focus:** Common mistakes when adding notifications, chat, and calendar to mobile apps
**Confidence:** HIGH (verified through official documentation, GitHub issues, and community reports)

## Push Notifications

### Pitfall: Push Token Staleness and Silent Failures

- **What goes wrong:** Push tokens are stored permanently without expiration logic. Tokens become invalid when users reinstall apps, restore from backups, clear app data, or switch devices. FCM marks tokens as expired after 270 days of inactivity. Sending to stale tokens fails silently, making notification delivery appear broken.
- **Warning signs:** Declining notification delivery rates over time; users report not receiving notifications; backend shows successful sends but no receipts; token database grows but active users remain flat.
- **Prevention:**
  - Implement token timestamp tracking in both client and server
  - Refresh/validate tokens at least monthly (weekly provides no additional benefit)
  - Register for a new token on every app open, not just first launch
  - Listen for `onNewToken` callbacks and immediately update backend
  - Implement cleanup for tokens inactive >30 days (Android) or >60 days (iOS)
  - Detect FCM error codes indicating invalid tokens and remove them
- **Phase relevance:** Push Notification Infrastructure phase - token management architecture must be designed from the start

### Pitfall: Testing on Simulators/Emulators

- **What goes wrong:** Developers build and test notification features on simulators where push notifications do not work. Features appear broken in development, causing confusion and wasted debugging time.
- **Warning signs:** Token generation returns null on emulators; notification handlers never fire in development; "works in production but not dev" reports.
- **Prevention:**
  - Use physical devices for all push notification testing
  - Document this limitation in development setup guides
  - Set up a dedicated test device pool for the team
  - Use local notifications for basic UI testing on simulators
- **Phase relevance:** Development environment setup - establish testing protocols before starting push notification work

### Pitfall: Missing Android Notification Channels

- **What goes wrong:** Android 8+ (API 26+) requires notification channels. Without them, notifications silently fail to display even though they're received successfully. Developers don't notice because lower API levels work fine.
- **Warning signs:** Notifications work on older Android devices but not newer ones; `NotificationManager` shows notifications as "blocked"; users on Android 8+ report silence.
- **Prevention:**
  - Create notification channels during app initialization, not lazily
  - Use appropriate importance levels (HIGH for immediate attention, DEFAULT for standard)
  - Create separate channels for different notification types (chat, reminders, system)
  - Test specifically on Android 8+ devices
- **Phase relevance:** Push Notification Infrastructure phase - channel setup must precede first notification send

### Pitfall: Badge Count Management Chaos

- **What goes wrong:** Badge counts become inconsistent between platforms and desync from actual unread state. On iOS, `setBadgeCountAsync(0)` clears both badge AND all notifications from the notification center. On Android, badge counts ADD to existing count rather than replacing. Different Android launchers have inconsistent badge support.
- **Warning signs:** Users report wrong badge numbers; clearing notifications removes badge but doesn't reflect read state; Samsung/Vivo/Redmi devices show different badge behaviors.
- **Prevention:**
  - Maintain badge count server-side as source of truth
  - Send explicit badge count with each push notification
  - Handle iOS badge clearing behavior by separating "clear notifications" from "reset badge"
  - Accept that Android badge support is inconsistent - don't rely on it for critical UX
  - Test on multiple Android manufacturers (Samsung, Xiaomi, Vivo, OnePlus)
- **Phase relevance:** Notification Inbox phase - badge state management is tied to read/unread tracking

### Pitfall: Background Notification Handler Limitations

- **What goes wrong:** Developers assume they can run code when notifications arrive while the app is killed. In Expo/React Native, you can receive notifications when killed but cannot execute listener code. Badge counts, local database updates, and other background processing won't work.
- **Warning signs:** Badge counts only update when app is foregrounded; offline notification counts are wrong; users confused about "missing" notifications.
- **Prevention:**
  - Design architecture assuming no background processing is possible
  - Handle all state updates server-side (badge count, unread count)
  - Sync state when app foregrounds rather than on notification arrival
  - Use push notification payload to carry display data, not trigger client logic
- **Phase relevance:** Push Notification Infrastructure AND Notification Inbox phases - architecture must account for this limitation

### Pitfall: Android 12+ Battery Optimization Killing Notifications

- **What goes wrong:** Android's battery optimization aggressively kills background processes, causing scheduled/delayed notifications to never fire. Long-term birthday reminders scheduled days in advance may not trigger.
- **Warning signs:** Scheduled notifications work in testing but fail for users; birthday reminders don't fire on the actual day; notifications work after app is opened but not when dormant.
- **Prevention:**
  - Guide users to disable battery optimization for the app during onboarding
  - Use `Notifications.openBatteryOptimizationSettings()` to help users find settings
  - For critical reminders (birthdays), use server-sent push notifications instead of local scheduling
  - Test with app in background for extended periods on various Android devices
- **Phase relevance:** Birthday notification sequence phase - server-side push for reliability

## Real-Time Chat

### Pitfall: Forgetting to Enable Supabase Realtime on Tables

- **What goes wrong:** Developers create message tables and write subscription code, but realtime doesn't work because the "Enable Realtime" toggle wasn't checked in Supabase dashboard. Debugging focuses on client code when the issue is server configuration.
- **Warning signs:** Subscriptions connect but never receive events; `console.log` in handlers never fires; REST queries work but realtime doesn't.
- **Prevention:**
  - Add "Enable Realtime" to table creation checklist
  - Create a test script that verifies realtime is working for each table
  - Document which tables require realtime in schema documentation
- **Phase relevance:** Chat Infrastructure phase - table configuration step

### Pitfall: Race Condition Between Initial Fetch and WebSocket Connection

- **What goes wrong:** Messages sent between the initial data fetch and WebSocket connection establishment are missed. User loads chat, fetch returns, WebSocket connects 500ms later - any message in that window is lost.
- **Warning signs:** Occasional missing messages; "refresh to see new messages" complaints; messages appear when re-entering chat room.
- **Prevention:**
  - Implement an event cache/queue that captures WebSocket events before UI is ready
  - Pattern: Fetch snapshot → Connect WebSocket → Queue events → Re-fetch to confirm → Process queue
  - Use server-assigned sequence numbers per conversation for ordering
  - Verify no gaps in sequence numbers after sync
- **Phase relevance:** Chat Room Implementation phase - core message sync logic

### Pitfall: Subscription Cleanup Memory Leaks

- **What goes wrong:** Supabase realtime subscriptions aren't properly cleaned up on component unmount. Memory grows steadily, especially with long-running sessions. Multiple subscriptions to same channel accumulate.
- **Warning signs:** App becomes sluggish over time; memory profiler shows steady growth; multiple console logs for same message; performance degrades after navigating between chats.
- **Prevention:**
  - Always return cleanup function from useEffect: `return () => supabase.removeChannel(subscription)`
  - Wrap subscription logic in custom hooks that handle cleanup
  - Use React DevTools to verify subscriptions are torn down on unmount
  - Be aware that React Strict Mode double-mounts components - subscriptions may behave unexpectedly in dev
- **Phase relevance:** Chat Infrastructure phase - subscription pattern established early

### Pitfall: Message Ordering and Duplication

- **What goes wrong:** Messages appear out of order or are duplicated when network conditions are poor. Client timestamps can't be trusted for ordering. Reconnections may replay messages already received.
- **Warning signs:** Messages jump around in conversation; same message appears twice; "why is my message at the bottom when I sent it first" complaints.
- **Prevention:**
  - Use server-assigned timestamps and sequence numbers, never client timestamps
  - Implement client-side deduplication using message IDs
  - Store last-seen sequence number and ignore lower sequences on reconnection
  - Accept that perfect ordering requires server-side enforcement
- **Phase relevance:** Chat Room Implementation phase - message handling logic

### Pitfall: Realtime Connection Limits on Free Tier

- **What goes wrong:** Supabase free tier allows 500 concurrent realtime connections. App gains users, hits limit, new users can't connect. Error handling doesn't gracefully degrade.
- **Warning signs:** Supabase dashboard shows connections approaching limit; new users report chat not loading; connection errors in logs.
- **Prevention:**
  - Monitor connection counts in Supabase dashboard
  - Implement connection pooling strategies (one connection per user, not per chat room)
  - Set up alerting before hitting limits
  - Plan upgrade path before launch if significant user growth expected
  - Implement graceful fallback (polling) when connections fail
- **Phase relevance:** Pre-launch readiness - capacity planning

## Calendar Integration

### Pitfall: Permission Request Timing and UX

- **What goes wrong:** Calendar permissions requested at app start with generic explanations. Users deny permissions, feature is broken, and re-requesting is awkward. iOS "Write only" vs "Full access" distinction confuses implementation.
- **Warning signs:** High permission denial rates; users don't understand why calendar access is needed; feature appears broken after denial.
- **Prevention:**
  - Request permissions in context, when user first tries to use calendar feature
  - Provide clear, specific explanation: "We'll sync birthday events to your calendar so you never miss a gift deadline"
  - Handle denial gracefully with in-app alternative (manual date tracking)
  - On iOS, check for "Write only" status (code 34) which still counts as denied for read operations
- **Phase relevance:** Calendar Integration phase - permission flow design

### Pitfall: Platform Differences in Calendar API Behavior

- **What goes wrong:** Code works on iOS but fails on Android or vice versa. `createEventInCalendarAsync` ignores calendarId on iOS. Recurring event deletion works on iOS but fails on Android with `instanceStartDate`.
- **Warning signs:** "Works on my phone" issues; platform-specific bug reports; QA passes on one platform only.
- **Prevention:**
  - Test all calendar operations on BOTH platforms explicitly
  - Document known platform limitations in code comments
  - Implement platform-specific code paths where needed
  - Always set `isSynced: true` on Android when creating calendars
  - For recurring events on Android, consider alternatives to `instanceStartDate` deletion
- **Phase relevance:** Calendar Integration phase - platform-specific testing matrix

### Pitfall: Calendar ID Type Mismatch

- **What goes wrong:** `createCalendarAsync` returns an integer ID, but calendar objects store IDs as strings. Using strict equality (`===`) fails; calendar appears to not exist when it does.
- **Warning signs:** Created calendar can't be found; events created in wrong calendar; "calendar not found" errors after successful creation.
- **Prevention:**
  - Use loose equality (`==`) or explicitly convert types when comparing calendar IDs
  - Store calendar IDs as strings consistently
  - Add validation/logging when calendar operations fail
- **Phase relevance:** Calendar Integration phase - implementation detail

### Pitfall: OTA Updates Don't Apply Permission Changes

- **What goes wrong:** Permission descriptions or new permission requirements are added, but changes only take effect after a full native rebuild. OTA updates or Expo Go refresh won't help.
- **Warning signs:** Users on older builds have different permission prompts; new calendar features fail for existing users; "I updated but still don't see calendar permission" reports.
- **Prevention:**
  - Plan permission changes as part of native release cycle, not feature updates
  - Communicate permission changes in release notes
  - Test permission flows on fresh installs vs. updates
- **Phase relevance:** Release planning - any phase adding new permissions

### Pitfall: Event Sync State Inconsistency

- **What goes wrong:** Events created in app don't appear in device calendar, or deleted events persist. Android sync adapter behavior is unpredictable. Users delete events in system calendar expecting app to know.
- **Warning signs:** Events missing from device calendar; "I deleted it but it came back" complaints; duplicate events after reinstall.
- **Prevention:**
  - Set `isSynced: true` when creating calendars on Android
  - Store event IDs in app database, verify existence before operations
  - Consider events in device calendar as "one-way sync" - don't assume bidirectional
  - Document that deleting from system calendar may not sync back
- **Phase relevance:** Calendar Integration phase - sync architecture decision

## Secret/Hidden Features (Chat hidden from celebrant)

### Pitfall: RLS Policies Not Enabled by Default

- **What goes wrong:** Tables are created without Row Level Security enabled. Secret chat rooms are visible to all authenticated users including the celebrant. In January 2025, 170+ apps were found exposed due to this exact mistake (CVE-2025-48757). 83% of exposed Supabase databases involve RLS misconfigurations.
- **Warning signs:** Any authenticated user can query any chat room; celebrant sees "surprise" planning; security audit reveals open tables.
- **Prevention:**
  - Enable RLS immediately when creating tables: `ALTER TABLE messages ENABLE ROW LEVEL SECURITY`
  - Create policies BEFORE inserting any data
  - Audit all tables for RLS status before launch
  - Test as different user roles to verify visibility restrictions
  - RLS with no policies = "deny all" - create explicit allow policies
- **Phase relevance:** Chat Infrastructure phase - CRITICAL security requirement

### Pitfall: Celebrant Exclusion Logic Leaks

- **What goes wrong:** Complex logic to hide content from celebrant has edge cases. Notification about secret chat room goes to celebrant. Member list reveals secret participants. Push notification preview shows message content to wrong user.
- **Warning signs:** "The surprise was ruined" bug reports; celebrant sees notification they shouldn't; user enumeration reveals secret members.
- **Prevention:**
  - Implement celebrant exclusion at database level (RLS), not just UI
  - Create specific RLS policy: `user_id != celebrant_id` for secret rooms
  - Never include secret room content in push notification body
  - Audit all notification pathways for celebrant leakage
  - Test specifically as celebrant user to verify nothing is visible
- **Phase relevance:** Secret Chat Rooms phase - core security architecture

### Pitfall: Metadata Leaks Revealing Secrets

- **What goes wrong:** While message content is hidden, metadata reveals the secret. Celebrant sees notification count increase, group member count change, or activity indicators. Read receipts or typing indicators leak presence.
- **Warning signs:** Celebrant asks "why did you all get so active in the app suddenly?"; unread badges reveal hidden activity; "online" status shows during secret planning.
- **Prevention:**
  - Exclude celebrant from all activity metrics for secret groups
  - Don't show secret group activity in notification counts visible to celebrant
  - Consider separate notification channels for secret vs. regular content
  - Disable typing indicators for secret rooms
- **Phase relevance:** Secret Chat Rooms phase AND Notification Inbox phase - coordinate metadata handling

### Pitfall: Realtime Broadcast Leaks to Wrong Users

- **What goes wrong:** Supabase Realtime broadcasts may go to connected clients before RLS is checked, depending on implementation. A celebrant with an open WebSocket connection might receive broadcasts about their own secret room before client-side filtering.
- **Warning signs:** Console logs show secret room events on celebrant's device; race condition between broadcast and RLS check.
- **Prevention:**
  - Use Supabase RLS for broadcast authorization policies
  - Create policy: authenticated users can only receive broadcasts for rooms they're members of AND not the celebrant of
  - Verify celebrant exclusion in realtime subscription tests
  - Double-filter on client side as defense in depth
- **Phase relevance:** Chat Infrastructure phase - realtime authorization setup

## Gift Leader System

### Pitfall: Role Assignment Without Permission Matrix

- **What goes wrong:** Gift Leader role is added without clear definition of what actions it enables. Scope creep gives leaders too much power. No way to transfer or revoke leadership. Multiple leaders have conflicting permissions.
- **Warning signs:** "I'm the leader but can't do X" complaints; role confusion between group creator and gift leader; permission escalation bugs.
- **Prevention:**
  - Define explicit permission matrix before implementation
  - Document: What can ONLY the leader do? What can members do? What can the celebrant NOT do?
  - Implement role hierarchy: Creator > Leader > Member
  - Build role transfer and revocation from day one
  - Use principle of least privilege - start restrictive, expand carefully
- **Phase relevance:** Gift Leader Role phase - role definition document required first

### Pitfall: Leader Actions Without Audit Trail

- **What goes wrong:** Gift Leader makes changes (removes member, edits wishlist) with no record. Disputes arise about who did what. Abuse can't be traced or reversed.
- **Warning signs:** "Who deleted my gift idea?" questions; no way to investigate complaints; inability to undo leader mistakes.
- **Prevention:**
  - Log all leader actions with timestamp and actor ID
  - Store before/after state for reversible actions
  - Consider soft-delete over hard-delete for recoverable history
  - Show action history in admin/debug UI
- **Phase relevance:** Gift Leader Role phase - audit logging infrastructure

### Pitfall: Orphaned Groups When Leader Leaves

- **What goes wrong:** Gift Leader leaves group or deletes account. No succession plan exists. Group is stuck with no one able to perform leader actions. Or worse, leader role transfers incorrectly.
- **Warning signs:** Groups become unmanageable after leader departure; automatic role assignment surprises wrong person; "I can't edit anything anymore" complaints.
- **Prevention:**
  - Require leader to transfer role before leaving group
  - Implement fallback succession (oldest member, creator)
  - Allow group creator to always reclaim leadership
  - Notify group when leadership changes
- **Phase relevance:** Gift Leader Role phase - succession logic

### Pitfall: Role State Desync Between Clients

- **What goes wrong:** User granted leadership on one device, but other clients still show them as member. Actions fail with permission errors on un-synced clients. Realtime role updates not propagated.
- **Warning signs:** "It says I'm not the leader but I was just made leader"; permission errors after role change; requires app restart to see new role.
- **Prevention:**
  - Include role changes in realtime subscriptions
  - Force re-fetch of group membership on critical actions
  - Optimistic UI update followed by server confirmation
  - Handle stale role state gracefully in error messages
- **Phase relevance:** Gift Leader Role phase - realtime sync consideration

## Birthday-Based Notification Timing

### Pitfall: Timezone Handling Across Notification Sequence

- **What goes wrong:** Birthday stored without timezone, notifications scheduled in wrong timezone. User in Tokyo gets "birthday tomorrow" notification when it's already the birthday locally. Or 30-day advance notice arrives 29 days early.
- **Warning signs:** "Wrong day" complaints; notification timing varies for same event; international users report worst issues.
- **Prevention:**
  - Store birthdays with timezone or explicitly as UTC date-only
  - Calculate notification times relative to user's current timezone
  - Update scheduled notifications if user changes timezone
  - Server-side scheduling with timezone-aware calculations
- **Phase relevance:** Birthday Notification Sequence phase - date handling architecture

### Pitfall: Notification Fatigue Sequence Design

- **What goes wrong:** Too many reminders (30 day, 14 day, 7 day, 3 day, 1 day, day-of) train users to ignore notifications. Or single notification is forgotten. Sequence doesn't account for user action.
- **Warning signs:** Notification opt-out rates increase; users report "too many notifications"; birthdays still missed despite reminders.
- **Prevention:**
  - Allow user customization of reminder frequency
  - Stop sequence once user takes action (marks gift as purchased)
  - Progressive urgency: gentle at 30 days, more prominent at 1 day
  - A/B test notification sequences to find optimal balance
  - Default to fewer notifications rather than more
- **Phase relevance:** Birthday Notification Sequence phase - UX design

### Pitfall: Scheduled Notification Reliability

- **What goes wrong:** Birthday 30 days away, local notification scheduled. User doesn't open app for 25 days. Android battery optimization kills scheduled notification. Birthday arrives, no reminder.
- **Warning signs:** Long-term scheduled notifications fail; works in testing but not for dormant users; Android users affected more than iOS.
- **Prevention:**
  - Use server-side push notifications for all birthday reminders, not local scheduling
  - Backend cron job checks for upcoming birthdays daily
  - Multiple notification attempts if first fails (morning, afternoon)
  - In-app reminder as backup when user opens app near birthday
- **Phase relevance:** Birthday Notification Sequence phase - reliability architecture

## Summary

### Top 3 Most Critical Pitfalls

1. **RLS Not Enabled on Secret Chat Tables** (Secret Chat Security)
   - Impact: Complete feature failure - celebrant sees surprise
   - Likelihood: High - 83% of Supabase apps have RLS misconfigurations
   - Phase: Address in Chat Infrastructure phase as BLOCKING requirement
   - Prevention cost: Low (configuration), Fix cost: High (reputation damage, data exposed)

2. **Push Token Staleness and Silent Failures** (Push Notifications)
   - Impact: Notifications stop working for growing percentage of users over time
   - Likelihood: Certain if not addressed - tokens WILL expire
   - Phase: Address in Push Notification Infrastructure phase with proper token lifecycle management
   - Prevention cost: Medium (architecture), Fix cost: High (retroactive token cleanup, user re-engagement)

3. **Race Condition Between Fetch and WebSocket Connection** (Real-Time Chat)
   - Impact: Messages randomly missing, trust in chat reliability destroyed
   - Likelihood: High in real-world network conditions
   - Phase: Address in Chat Room Implementation phase with event queue pattern
   - Prevention cost: Medium (careful implementation), Fix cost: High (core sync logic rewrite)

---

## Sources

### Push Notifications
- [Expo Push Notifications FAQ](https://docs.expo.dev/push-notifications/faq/)
- [Firebase FCM Token Management Best Practices](https://firebase.google.com/docs/cloud-messaging/manage-tokens)
- [Making Expo Notifications Work on Android 12+ and iOS](https://medium.com/@gligor99/making-expo-notifications-actually-work-even-on-android-12-and-ios-206ff632a845)
- [Push Token Lifecycle](https://medium.com/@chunilalkukreja/lifecycle-of-fcm-device-tokens-61681bb6fbcf)

### Real-Time Chat
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Realtime Memory Leak Issue](https://github.com/supabase/supabase-js/issues/1204)
- [WebSocket Architecture Best Practices](https://ably.com/topic/websocket-architecture-best-practices)
- [Handling Race Conditions in Real-Time Apps](https://dev.to/mattlewandowski93/handling-race-conditions-in-real-time-apps-49c8)

### Calendar Integration
- [Expo Calendar Documentation](https://docs.expo.dev/versions/latest/sdk/calendar/)
- [Android Calendar Sync Issues](https://github.com/expo/expo/issues/2449)
- [Expo Permissions Guide](https://docs.expo.dev/guides/permissions/)
- [Calendar Permission Issues iOS](https://github.com/expo/expo/issues/36001)

### Row Level Security
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Complete Guide](https://vibeappscanner.com/supabase-row-level-security)
- [RLS Real Examples](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c)

### Role-Based Access Control
- [RBAC Best Practices](https://budibase.com/blog/app-building/role-based-access-control/)
- [Auth0 RBAC Documentation](https://auth0.com/docs/manage-users/access-control/rbac)
