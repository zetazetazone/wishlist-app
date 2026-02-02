---
phase: 04-smart-reminders
plan: 01
subsystem: database, notifications
tags: [pg_cron, timezone, reminders, postgresql, supabase, intl]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: notification infrastructure (user_notifications, device_tokens)
  - phase: 02-celebrations-coordination
    provides: celebrations schema (celebrations, group_members, celebration_contributions)
  - phase: 03-calendar
    provides: pg_cron extension enabled, auto-celebration job pattern
provides:
  - Birthday reminder scheduling at 9:00 AM local time
  - reminder_sent table for duplicate prevention
  - user_group_preferences table for mute functionality
  - process_birthday_reminders() function with 4w/2w/1w/day_of reminders
  - Celebrant exclusion and happy_birthday notification
  - Gift Leader 1-week nudge with contribution progress
  - New member catch-up for late joiners
  - Automatic timezone detection via Intl API
affects: [04-02 (gift leader notifications), notifications, push delivery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Timezone-aware pg_cron job using AT TIME ZONE"
    - "15-minute polling window for 9:00 AM local delivery"
    - "UNIQUE constraint with ON CONFLICT DO NOTHING for idempotency"
    - "Intl.DateTimeFormat for timezone detection"

key-files:
  created:
    - supabase/migrations/20260202000007_reminder_scheduling.sql
  modified:
    - hooks/usePushNotifications.ts

key-decisions:
  - "15-minute cron interval matches timezone detection window"
  - "Celebrant gets 'happy_birthday' on day-of, not countdown reminders"
  - "Gift Leader 1w nudge includes contribution progress info"
  - "New member catch-up uses current appropriate reminder (not all missed)"
  - "Timezone detection non-blocking (failure doesn't affect push registration)"

patterns-established:
  - "AT TIME ZONE for DST-safe timezone conversion in PostgreSQL"
  - "reminder_sent UNIQUE(celebration, user, type) for deduplication"
  - "SECURITY DEFINER function for cross-table access in cron jobs"

# Metrics
duration: 2min
completed: 2026-02-02
---

# Phase 4 Plan 1: Reminder Scheduling Summary

**pg_cron birthday reminder system with 4w/2w/1w/day-of reminders at 9:00 AM local time, celebrant exclusion, Gift Leader nudges, and auto timezone detection**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-02T17:22:28Z
- **Completed:** 2026-02-02T17:24:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Birthday reminder scheduling at user's local 9:00 AM using AT TIME ZONE
- Comprehensive reminder types: 4w, 2w, 1w, day_of, happy_birthday, gift_leader_1w
- Celebrant exclusion from countdown reminders (gets only happy_birthday on day-of)
- Gift Leader 1-week nudge with contribution progress ($X of $Y collected from Z people)
- New member catch-up for late joiners (get current appropriate reminder)
- Group muting via user_group_preferences table
- Duplicate prevention via reminder_sent UNIQUE constraint
- Automatic timezone detection using Intl.DateTimeFormat API

## Task Commits

Each task was committed atomically:

1. **Task 1: Create reminder scheduling migration** - `956d048` (feat)
2. **Task 2: Add automatic timezone detection** - `9542116` (feat)

## Files Created/Modified

- `supabase/migrations/20260202000007_reminder_scheduling.sql` - Complete reminder infrastructure
  - users.timezone column
  - reminder_sent tracking table
  - user_group_preferences for muting
  - process_birthday_reminders() function
  - pg_cron job every 15 minutes
- `hooks/usePushNotifications.ts` - Added saveUserTimezone() function using Intl API

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| reminder-001 | 15-minute cron interval | Matches timezone detection window for 9:00 AM targeting |
| reminder-002 | Celebrant gets 'happy_birthday' only | They shouldn't see countdown to their own surprise |
| reminder-003 | Gift Leader 1w nudge with progress | Actionable reminder: "$X of $Y collected from Z people" |
| reminder-004 | New member catch-up is single reminder | Avoid notification spam - just give current appropriate one |
| reminder-005 | Timezone save is non-blocking | Failure shouldn't prevent push registration |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in node_modules (documented in STATE.md) - not introduced by this plan, no blocking impact

## User Setup Required

**External services require manual configuration:**

1. **Enable pg_cron extension** in Supabase Dashboard (if not already enabled from 03-02)
2. **Apply migration**: `npx supabase db push` or run SQL manually
3. **Verify cron job**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-birthday-reminders';
   ```
4. **Test function manually**:
   ```sql
   SELECT * FROM public.process_birthday_reminders();
   ```

## Next Phase Readiness

- Reminder infrastructure complete and ready for use
- Next plan (04-02) can focus on Gift Leader notification UI and contribution management
- Timezone detection ready for immediate use on app open

---
*Phase: 04-smart-reminders*
*Completed: 2026-02-02*
