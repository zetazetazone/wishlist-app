---
phase: 14-group-view-redesign
plan: 03
subsystem: ui-data
tags: [react-native, group-detail, birthday-sorting, favorites, privacy]

# Dependency graph
requires:
  - phase: 14-01
    provides: GroupViewHeader component
  - phase: 14-02
    provides: MemberCard component, birthday countdown utilities
provides:
  - Redesigned group detail screen with all GVIEW requirements
  - Enhanced fetchGroupDetails returning favorites data
  - Birthday-sorted member list with favorite previews
affects: [15-group-settings, 16-mode-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Batch query pattern for favorites (avoid N+1)
    - Birthday sort with invalid date handling
    - favoritesByUser map for O(1) lookup

key-files:
  created: []
  modified:
    - utils/groups.ts
    - app/group/[id].tsx
    - types/database.types.ts

key-decisions:
  - "Batch query for favorites using .in() to avoid N+1 queries"
  - "Invalid birthday dates (-1 daysUntil) sorted to end of list"
  - "Added users table type with full_name (distinct from user_profiles view)"
  - "favoritesByUser returned as Record for O(1) lookup by user_id"

patterns-established:
  - "Favorites batch query pattern: fetch all members then .in(user_id, memberIds)"
  - "Birthday sort pattern: handle -1 (invalid) by returning 1 to push to end"

# Metrics
duration: 3min
completed: 2026-02-04
---

# Phase 14 Plan 03: Group Detail Integration Summary

**Enhanced fetchGroupDetails with batch favorites query, redesigned group detail screen with new components, birthday sorting, and celebration navigation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-04T20:19:43Z
- **Completed:** 2026-02-04T20:22:31Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- fetchGroupDetails now returns favoritesByUser map with batch query (avoiding N+1)
- Group detail screen uses GroupViewHeader and MemberCard components
- Members sorted by closest upcoming birthday (invalid dates at end)
- Favorite item preview displayed on member cards when available
- Email completely removed from display (GVIEW-03 privacy requirement)
- Member card tap navigates to /celebration/{userId}

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance fetchGroupDetails with favorites** - `c8f18b3` (feat)
2. **Task 2: Refactor GroupDetailScreen with new components** - `22a408a` (feat)

## Files Created/Modified

- `utils/groups.ts` - Added batch favorites query, returns favoritesByUser map
- `app/group/[id].tsx` - Complete redesign with new components, sorting, navigation
- `types/database.types.ts` - Added users table type with full_name field

## Decisions Made

1. **Batch query for favorites**: Single query with `.in()` clause fetches all member favorites at once, avoiding N+1 performance issue
2. **Invalid date handling**: Members with invalid birthdays (no birthday set) sorted to end of list using daysUntil === -1 check
3. **User type definition**: Added separate `users` table type with `full_name` (distinct from `user_profiles` view which uses `display_name`)
4. **favoritesByUser as Record**: Returns `Record<string, FavoriteItem | null>` for O(1) lookup when rendering member cards

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added users table type definition**
- **Found during:** Task 2
- **Issue:** User type was aliased to UserProfile which has display_name, but fetchGroupDetails joins users table which has full_name
- **Fix:** Added proper users table definition to Database interface
- **Files modified:** types/database.types.ts
- **Commit:** c8f18b3 (combined with Task 1)

## Issues Encountered

None - straightforward integration following component contracts from 14-01 and 14-02.

## GVIEW Requirements Satisfied

All 7 GVIEW requirements are now implemented:

1. **GVIEW-01**: Group header displays photo/avatar (via GroupViewHeader)
2. **GVIEW-02**: Group header shows name, description, mode badge (via GroupViewHeader)
3. **GVIEW-03**: Member cards show profile photo and name only - no email
4. **GVIEW-04**: Members sorted by closest upcoming birthday
5. **GVIEW-05**: Member cards show birthday countdown text (via MemberCard)
6. **GVIEW-06**: Member cards show favorite item preview when available
7. **GVIEW-07**: Tapping member card navigates to celebration page

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Group view redesign phase complete (all 3 plans done)
- Ready for Phase 15: Group Settings (GSET-01 through GSET-07)
- Components and data fetching patterns established for settings reuse

---
*Phase: 14-group-view-redesign*
*Completed: 2026-02-04*
