---
phase: 28-calendar-integration
plan: 02
subsystem: calendar
tags: [friends, calendar, device-sync, ui]
dependencies:
  requires: [28-01-friend-dates-service]
  provides: [source-indicators, device-calendar-sync]
  affects: [components/calendar/CountdownCard.tsx, utils/deviceCalendar.ts, components/calendar/CalendarSyncButton.tsx, app/(app)/(tabs)/calendar.tsx]
tech_stack:
  added: []
  patterns: [type-guard-union, source-aware-events, combined-sync]
key_files:
  created: []
  modified: [components/calendar/CountdownCard.tsx, utils/deviceCalendar.ts, components/calendar/CalendarSyncButton.tsx, app/(app)/(tabs)/calendar.tsx]
decisions:
  - source-badge-friend-dates
  - combined-calendar-sync
  - header-flex-layout-fix
metrics:
  tasks_completed: 4
  duration_minutes: 15
  completed_date: 2026-02-10
---

# Phase 28 Plan 02: Source Indicator UI and Device Sync Extension Summary

Calendar events now display source indicators distinguishing Friend from Group events, and device calendar sync includes both group birthdays and friend dates.

## One-Liner

Source indicators on CountdownCard with type guard for Friend/Group events, extended device calendar sync supporting friend dates, and header layout fix for sync button visibility.

## Implementation Summary

### Modified Files

**components/calendar/CountdownCard.tsx**
- Added FriendDate type import and CalendarEvent union type
- Type guard `isFriendDate()` distinguishes friend vs group events
- Derives display values based on event source (name, label, color)
- Shows teal source badge for friend dates ("Birthday" or "Date" label)
- Uses friend name for public dates, "Friend" label for birthdays

**utils/deviceCalendar.ts**
- Added FriendDate type import and re-export
- New `getNextOccurrence()` helper for month/day to Date conversion
- New `syncFriendDateEvent()` syncs individual friend date to device calendar
- New `syncAllCalendarEvents()` syncs both group birthdays and friend dates
- Source-aware event titles and notes in device calendar

**components/calendar/CalendarSyncButton.tsx**
- Updated props to accept optional `friendDates` array
- Both button variants use `syncAllCalendarEvents()` for combined sync
- Updated alert messages to reference "events" instead of "birthdays"

**app/(app)/(tabs)/calendar.tsx**
- Passes `friendDates` prop to CalendarSyncIconButton
- Fixed header layout: `flex: 1` on title, `flexShrink: 0` on headerRight
- Prevents sync button from being clipped on narrow screens

## Deviations from Plan

**Header Layout Fix** - Added during verification when sync button was found to be clipped on physical device. Added flex properties to ensure button visibility.

## Key Technical Decisions

### Decision: Type guard for union type
**Context:** CountdownCard needs to handle both GroupBirthday and FriendDate
**Choice:** Use type guard `isFriendDate()` checking for 'source' property
**Rationale:** Clean runtime type narrowing without type assertion
**Alternative:** Separate components (rejected - duplicates most logic)

### Decision: Combined calendar sync function
**Context:** Need to sync both group birthdays and friend dates to device
**Choice:** Single `syncAllCalendarEvents(birthdays, friendDates)` function
**Rationale:** Ensures consistent calendar access and error handling
**Alternative:** Separate sync calls (rejected - less efficient, error-prone)

### Decision: Header flex layout fix
**Context:** Sync button clipped on narrow screens due to long title
**Choice:** `flex: 1` on title (allows shrink), `flexShrink: 0` on headerRight
**Rationale:** Title can truncate if needed, buttons always visible
**Alternative:** Smaller title font (rejected - impacts visual hierarchy)

## Testing Notes

### Verification Completed
- Friend dates appear as teal dots on calendar (visual verified)
- Friend Dates section shows with teal styling (visual verified)
- Group birthdays show with group color and name (visual verified)
- TypeScript compilation passes

### Human Verification Results
- Physical device: Calendar integration working correctly
- Sync button was initially clipped - fixed with header layout adjustment
- Approved after layout fix committed

## Dependencies & Next Steps

### Dependencies Satisfied
- 28-01 (Friend Dates Service) - getFriendDates, FriendDate type, FRIEND_DATE_COLOR

### Phase Complete
This completes Phase 28 Calendar Integration. All FCAL requirements satisfied:
- FCAL-01: Friend birthdays appear in in-app calendar (teal dots)
- FCAL-02: Friend public dates appear in in-app calendar (teal dots)
- FCAL-03: Friend dates use distinct teal color (#0D9488)
- FCAL-04: Source indicator distinguishes Friend from Group
- FCAL-05: User can sync friend dates to device calendar

### Blockers/Issues
None. Implementation complete.

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| 12274bf | feat(28-02): add source indicator to CountdownCard | components/calendar/CountdownCard.tsx |
| 4569c0d | feat(28-02): extend device calendar sync for friend dates | utils/deviceCalendar.ts |
| 923dbad | feat(28-02): update CalendarSyncButton for combined sync | components/calendar/CalendarSyncButton.tsx, app/(app)/(tabs)/calendar.tsx |
| 863f12e | fix(28-02): prevent header sync button from being clipped | app/(app)/(tabs)/calendar.tsx |

## Self-Check

### File Modification Verification
- CountdownCard.tsx contains 'source' and 'FriendDate' - VERIFIED
- deviceCalendar.ts exports syncFriendDateEvent, syncAllCalendarEvents - VERIFIED
- CalendarSyncButton.tsx uses syncAllCalendarEvents - VERIFIED
- calendar.tsx passes friendDates to CalendarSyncIconButton - VERIFIED

### Commit Hash Verification
- 12274bf, 4569c0d, 923dbad, 863f12e all present in git log - VERIFIED

## Self-Check: PASSED

All modifications verified, all commits present, human verification approved with layout fix.
