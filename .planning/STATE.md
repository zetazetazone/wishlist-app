# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** Phase 3 - Calendar

## Current Position

Phase: 3 of 4 (Calendar)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-02 - Completed 03-01-PLAN.md (In-App Calendar)

Progress: [██████----] 62.5%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 6.8 minutes
- Total execution time: 0.57 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Foundation | 2 | 13 min | 6.5 min |
| 2 - Celebrations | 2 | 13 min | 6.5 min |
| 3 - Calendar | 1 | 8 min | 8 min |

**Recent Trend:**
- Last 5 plans: 01-02 (8 min), 02-01 (6 min), 02-02 (7 min), 03-01 (8 min)
- Trend: Consistent delivery

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
| calendar-001 | 03-01 | Use react-native-calendars multi-dot marking for birthdays | Multiple group birthdays visible on same date |
| calendar-002 | 03-01 | Feb 29 birthdays show on Feb 28 in non-leap years | Standard convention for leap year handling |
| calendar-003 | 03-01 | 30-day planning window for upcoming birthdays | Reasonable lookahead for gift planning |

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

**From 02-01 (Celebrations Foundation):**
1. ~~Run migration: Apply 20260202000005_celebrations.sql to create 5 new tables~~ Done
2. ~~Test RLS policies: Verify celebrant cannot see chat/contributions via API~~ Verified

### Blockers/Concerns

- Pre-existing TypeScript errors (unrelated to calendar) - type exports missing for Group, WishlistItem
- Minor FlashList TypeScript type definition issue (non-blocking, runtime works correctly)
- npm peer dependency conflicts with React 19 - resolved with --legacy-peer-deps

## Session Continuity

Last session: 2026-02-02
Stopped at: Completed 03-01-PLAN.md (In-App Calendar View)
Resume file: None
Next: Execute 03-02-PLAN.md (Device Calendar Sync)
