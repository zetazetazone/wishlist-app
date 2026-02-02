---
phase: 03-calendar
plan: 02
subsystem: calendar
tags: [expo-calendar, pg_cron, device-sync, google-calendar, apple-calendar, birthday-automation]

# Dependency graph
requires:
  - phase: 02-celebrations
    provides: celebrations table and Gift Leader rotation algorithm
  - phase: 03-01
    provides: in-app calendar with birthday data layer
provides:
  - Device calendar sync to Google Calendar and Apple Calendar
  - CalendarSyncButton component for UI integration
  - pg_cron job for automatic celebration creation
  - Birthday rotation Gift Leader assignment in SQL
affects: [04-wishlist, deployment, notifications]

# Tech tracking
tech-stack:
  added: [expo-calendar@15.0.8]
  patterns:
    - Device calendar integration with permission handling
    - pg_cron scheduled database functions
    - SQL-based birthday rotation algorithm

key-files:
  created:
    - utils/deviceCalendar.ts
    - components/calendar/CalendarSyncButton.tsx
    - supabase/migrations/20260202000006_auto_celebrations.sql
  modified:
    - app.json
    - app/(app)/(tabs)/calendar.tsx
    - package.json

key-decisions:
  - "Device calendar sync only on user tap (not automatic on app launch)"
  - "Create 'Wishlist Birthdays' calendar for app events (not polluting user calendars)"
  - "30-day planning window for auto-celebration creation (configurable in SQL function)"
  - "iOS 17 permission workaround: double-check status after grant"

patterns-established:
  - "Calendar permission request: check -> request -> verify pattern"
  - "pg_cron function with SECURITY DEFINER for system-level operations"
  - "SQL Gift Leader calculation matching TypeScript algorithm"

# Metrics
duration: 6.5min
completed: 2026-02-02
---

# Phase 3 Plan 2: Device Calendar Sync and Auto-Celebrations Summary

**expo-calendar integration for device sync with yearly recurring birthday events, plus pg_cron job for automatic celebration creation within 30-day planning window**

## Performance

- **Duration:** 6.5 min
- **Started:** 2026-02-02T12:01:11Z
- **Completed:** 2026-02-02T12:07:42Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Installed expo-calendar for native Google Calendar and Apple Calendar integration
- Created CalendarSyncButton component with syncing states and permission handling
- Built pg_cron migration with Gift Leader rotation algorithm in SQL
- Added iOS 17 permission workaround for calendar access
- Events sync as yearly recurring with 1-week and 1-day advance alarms

## Task Commits

Each task was committed atomically:

1. **Task 1: Install expo-calendar and create device calendar sync utility** - `b64f5e1` (feat)
2. **Task 2: Create CalendarSyncButton component and integrate into calendar screen** - `387e3cc` (feat)
3. **Task 3: Create pg_cron migration for automatic celebration creation** - `0bc4777` (feat)

## Files Created/Modified

- `utils/deviceCalendar.ts` - Device calendar sync with permission handling, yearly events
- `components/calendar/CalendarSyncButton.tsx` - Button and icon button variants for sync UI
- `supabase/migrations/20260202000006_auto_celebrations.sql` - pg_cron job and Gift Leader SQL function
- `app.json` - iOS calendar permission descriptions and expo-calendar plugin
- `app/(app)/(tabs)/calendar.tsx` - Integrated CalendarSyncIconButton in header
- `package.json` - Added expo-calendar dependency

## Decisions Made

1. **Device calendar sync on tap only** - Calendar permission requested only when user taps sync button, not on app launch. Better user experience and privacy.

2. **Dedicated "Wishlist Birthdays" calendar** - Creates separate calendar on device rather than adding to existing calendars. Users can easily toggle visibility or delete all events.

3. **30-day planning window** - Auto-celebration creation window matches countdown display. Configurable in SQL function parameter.

4. **iOS 17 permission double-check** - After requesting permission, verify status again due to known iOS 17 quirk where status may not update immediately.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **npm peer dependency conflict** - expo-calendar installation failed with React version mismatch. Resolved using `--legacy-peer-deps` flag.

2. **GroupBirthday type mismatch** - deviceCalendar.ts had its own GroupBirthday type with `Date` instead of `string`. Fixed by re-exporting from lib/birthdays.ts and updating functions to accept both types.

## User Setup Required

**External services require manual configuration:**

1. **Enable pg_cron in Supabase:**
   - Go to Supabase Dashboard > Database > Extensions
   - Enable pg_cron extension

2. **Apply migration:**
   ```bash
   # Via Supabase CLI
   npx supabase db push

   # Or manually in SQL Editor
   # Paste contents of migrations/20260202000006_auto_celebrations.sql
   ```

3. **Verify cron job:**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'create-upcoming-celebrations';
   ```

4. **Test manually:**
   ```sql
   SELECT * FROM public.create_upcoming_celebrations();
   ```

5. **Rebuild development client for calendar permissions:**
   ```bash
   npx eas build --profile development
   ```

## Next Phase Readiness

- Device calendar sync ready for testing on physical devices
- pg_cron migration ready to deploy to Supabase
- Calendar screen has sync button integrated
- Phase 3 Calendar is feature complete

**Remaining:** Phase 4 (Wishlist refinements if any), then deployment readiness

---
*Phase: 03-calendar*
*Completed: 2026-02-02*
