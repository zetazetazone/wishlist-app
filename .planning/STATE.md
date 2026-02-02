# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** Phase 4 - Smart Reminders (COMPLETE)

## Current Position

Phase: 4 of 4 (Smart Reminders)
Plan: 2 of 2 in current phase
Status: Phase 4 complete - All phases complete!
Last activity: 2026-02-02 - Completed 04-02-PLAN.md (Gift Leader Notifications)

Progress: [##########] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 5.6 minutes
- Total execution time: 0.75 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Foundation | 2 | 13 min | 6.5 min |
| 2 - Celebrations | 2 | 13 min | 6.5 min |
| 3 - Calendar | 2 | 14.5 min | 7.25 min |
| 4 - Smart Reminders | 2 | 4 min | 2 min |

**Recent Trend:**
- Last 5 plans: 02-02 (7 min), 03-01 (8 min), 03-02 (6.5 min), 04-01 (3 min), 04-02 (1 min)
- Trend: Consistent delivery, fast execution

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| ID | Phase | Decision | Impact |
|----|-------|----------|--------|
| notification-001 | 01-01 | Create Android notification channel BEFORE requesting push token | Required for Android 13+ compatibility |
| notification-002 | 01-01 | Use UPSERT with last_active timestamp for device tokens | Enables multi-device support and staleness tracking |
| notification-003 | 01-01 | Use Supabase Edge Function with webhook trigger for push delivery | Low latency, simple deployment, native integration |
| onboarding-001 | 01-02 | Use blocking onboarding pattern with route protection in root layout | Ensures users complete profile setup before accessing main app |
| storage-001 | 01-02 | Use expo-image-picker with ArrayBuffer pattern for Supabase Storage | Matches Supabase recommended upload pattern for React Native |
| notifications-001 | 01-02 | Use FlashList for notification inbox instead of FlatList | Better performance for large lists with estimated item sizing |
| celebrations-001 | 02-01 | Birthday rotation uses month-day sort with user_id tiebreaker | Deterministic Gift Leader assignment even with same birthdays |
| celebrations-002 | 02-01 | Celebrant exclusion enforced at RLS level, not UI | Security-critical: prevents API-level data leakage |
| celebrations-003 | 02-01 | Auto-create chat rooms with celebrations | Chat immediately available after creation |
| calendar-001 | 03-01 | Use react-native-calendars with multi-dot marking for groups | Visual group differentiation with 8-color palette |
| calendar-002 | 03-01 | Feb 29 birthdays show on Feb 28 in non-leap years | Standard convention for leap year handling |
| calendar-003 | 03-02 | Device calendar sync on tap only (not automatic) | Better UX and privacy |
| calendar-004 | 03-02 | Create dedicated "Wishlist Birthdays" calendar | Avoids polluting user's existing calendars |
| calendar-005 | 03-02 | 30-day planning window for auto-celebration creation | Matches countdown display window |
| reminder-001 | 04-01 | 15-minute cron interval for timezone coverage | Matches timezone detection window for 9:00 AM targeting |
| reminder-002 | 04-01 | Celebrant gets 'happy_birthday' only on day-of | They shouldn't see countdown to their own surprise |
| reminder-003 | 04-01 | Gift Leader 1w nudge includes progress | Actionable reminder: "$X of $Y collected from Z people" |
| reminder-004 | 04-01 | Timezone save is non-blocking | Failure shouldn't prevent push registration |
| reminders-003 | 04-02 | Use IS NOT DISTINCT FROM for null-safe gift_leader_id comparison | Handles initial NULL correctly in trigger |
| reminders-004 | 04-02 | Include avatar_url in notification payload for rich push content | Celebrant avatar visible in push notifications |

### Pending Todos

**From 01-01 (Notification Infrastructure):**
1. Deploy Edge Function: `npx supabase functions deploy push`
2. Create database webhook in Supabase Dashboard for user_notifications INSERT
3. Build development client for testing push notifications: `npx eas build --profile development`
4. (Optional) Replace placeholder EAS project ID in app.json with actual ID

**From 01-02 (Onboarding & Notifications):**
1. Create `avatars` storage bucket in Supabase if not exists
2. Set avatars bucket to public for avatar URLs to work
3. Ensure user_profiles table has onboarding_completed, display_name, birthday, avatar_url columns

**From 03-02 (Device Calendar Sync):**
1. Enable pg_cron extension in Supabase Dashboard
2. Apply migration: `npx supabase db push` or run SQL manually
3. Verify cron job: `SELECT * FROM cron.job WHERE jobname = 'create-upcoming-celebrations';`
4. Rebuild dev client for calendar permissions: `npx eas build --profile development`

**From 04-01 (Birthday Reminders):**
1. Apply migration: `npx supabase db push` or run SQL manually
2. Verify cron job: `SELECT * FROM cron.job WHERE jobname = 'process-birthday-reminders';`
3. Test function: `SELECT * FROM public.process_birthday_reminders();`

**From 04-02 (Gift Leader Notifications):**
1. Apply migration: `npx supabase db push` or run SQL manually
2. Verify function: `SELECT proname FROM pg_proc WHERE proname = 'notify_gift_leader_assigned';`
3. Verify trigger: `SELECT tgname FROM pg_trigger WHERE tgname = 'on_gift_leader_changed';`
4. Redeploy Edge Function: `npx supabase functions deploy push`

### Blockers/Concerns

- Pre-existing TypeScript errors (unrelated to calendar) - type exports missing for Group, WishlistItem
- Minor FlashList TypeScript type definition issue (non-blocking, runtime works correctly)
- npm peer dependency conflicts with React 19 - resolved with --legacy-peer-deps

## Session Continuity

Last session: 2026-02-02
Stopped at: Completed Phase 4 (Smart Reminders) - All phases complete!
Resume file: None
Next: All 4 phases complete. Project ready for deployment and testing.
