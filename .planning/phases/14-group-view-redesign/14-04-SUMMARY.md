---
phase: 14-group-view-redesign
plan: 04
subsystem: ui
tags: [navigation, supabase, celebrations, react-native, expo-router]

# Dependency graph
requires:
  - phase: 14-group-view-redesign (plans 01-03)
    provides: Group detail screen with MemberCard components
provides:
  - findCelebrationForMember lookup function
  - Correct member card to celebration navigation using record ID
  - Graceful alert when no celebration exists for a member
affects: [phase-15-group-settings, phase-16-mode-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lookup-then-navigate pattern: resolve entity ID before routing"
    - "Graceful fallback with Alert.alert when target record doesn't exist"

key-files:
  created: []
  modified:
    - lib/celebrations.ts
    - app/group/[id].tsx

key-decisions:
  - "Use maybeSingle() instead of single() to avoid throwing on missing celebration"
  - "Order by event_date descending to get most recent/upcoming celebration first"
  - "No loading spinner for lookup -- brief delay acceptable for simplicity"

patterns-established:
  - "Lookup-then-navigate: resolve record IDs before router.push to avoid passing wrong ID types"

# Metrics
duration: 1min
completed: 2026-02-04
---

# Phase 14 Plan 04: Member Card Navigation Fix (Gap Closure)

**findCelebrationForMember lookup resolves celebration record ID before navigation, replacing buggy user-ID-as-route-param pattern**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-04T22:02:35Z
- **Completed:** 2026-02-04T22:03:44Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Fixed member card navigation to use celebration record UUID instead of user UUID
- Added `findCelebrationForMember()` function that queries celebrations by celebrant_id + group_id
- Added graceful alert when no celebration exists for a member (prevents error page)
- Closed the sole UAT gap from 14-03 (test 6: celebration navigation)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add findCelebrationForMember function and fix navigation** - `d2a49e2` (fix)

## Files Created/Modified
- `lib/celebrations.ts` - Added `findCelebrationForMember()` export: queries celebrations table by celebrant_id + group_id, returns { id, status } or null
- `app/group/[id].tsx` - Replaced inline onPress with `handleMemberPress()` async handler that resolves celebration ID before navigating

## Decisions Made
- Used `maybeSingle()` instead of `single()` to gracefully handle missing celebrations (returns null instead of throwing)
- Order by `event_date` descending so the most recent/upcoming celebration is returned first
- No loading spinner for the lookup -- the query is simple enough that a brief delay is acceptable
- Alert message text explains celebrations are auto-created as birthdays approach

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 14 gap closure complete -- all GVIEW requirements fully satisfied including navigation
- Ready for Phase 15 (Group Settings)
- No blockers

---
*Phase: 14-group-view-redesign (gap closure)*
*Completed: 2026-02-04*
