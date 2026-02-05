---
quick-task: 003
type: bugfix
tags: [budget, navigation, useFocusEffect, stale-data]
duration: 5min
completed: 2026-02-05
---

# Quick Task 003: Fix budget display stale after settings save

**Bug:** Per-gift budget set to $100 in settings saved successfully, but group page still showed "Suggested limit: $0 per gift". Required killing and reopening the app to see updated value.

**Root Cause:** The budget `useEffect` in `app/group/[id]/index.tsx` had dependencies `[group?.id, group?.mode]`. When navigating back from settings after saving budget, neither dependency changed, so the effect didn't re-run. The stale `budgetStatus` from the initial load persisted.

**Fix:** Replaced `useEffect` with `useFocusEffect` (from `expo-router`) for budget status fetching. This re-fetches `getGroupBudgetStatus()` every time the group view screen regains focus, picking up any changes made in settings. This matches the existing pattern used in `calendar.tsx` and `celebrations.tsx`.

**File Modified:** `app/group/[id]/index.tsx` (useEffect → useFocusEffect, added useCallback and useFocusEffect imports)

**Commit:** `6809669` fix(17): refresh budget status on group view focus

---
*Quick task completed: 2026-02-05*
