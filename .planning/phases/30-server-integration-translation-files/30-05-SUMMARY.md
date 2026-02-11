---
phase: 30-server-integration-translation-files
plan: 05
subsystem: i18n
tags: [useLanguage, auth-session, language-sync, react-hooks, i18next]

# Dependency graph
requires:
  - phase: 29-foundation-tooling
    provides: i18n infrastructure, initI18n function
  - phase: 30-server-integration-translation-files
    plan: 02
    provides: useLanguage hook with syncFromServer function
provides:
  - useLanguage hook wired to auth session in app root layout
  - Automatic language sync when user logs in
  - i18n initialization guard in root layout
affects: [31-root-integration-settings-ui, 32-ui-component-migration]

# Tech tracking
tech-stack:
  added: []
  patterns: [hook-wiring-with-auth-state, i18n-initialization-guard]

key-files:
  created: []
  modified:
    - app/_layout.tsx

key-decisions:
  - "Extract userId from both getSession() and onAuthStateChange() to handle initial load and subsequent logins"
  - "Guard rendering with i18nReady state to prevent flash of untranslated content"
  - "Use useEffect with userId and i18nReady dependencies to trigger syncFromServer"

patterns-established:
  - "Auth state extraction: setUserId(session?.user?.id) in both supabase auth callbacks"
  - "i18n initialization: initI18n().then(() => setI18nReady(true)) before any translation usage"
  - "Language sync trigger: useEffect watching userId + i18nReady calling syncFromServer()"

# Metrics
duration: 2min
completed: 2026-02-11
---

# Phase 30 Plan 05: Language Sync Wiring Summary

**useLanguage hook integrated with auth session to sync language preference from server on login, closing PERS-03 gap**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-11T14:38:09Z
- **Completed:** 2026-02-11T14:39:36Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Wired useLanguage hook into app/_layout.tsx root layout
- Language preference now syncs automatically when user logs in
- Added i18n initialization guard to prevent flash of untranslated content
- Extracted userId from both getSession() and onAuthStateChange() for complete coverage
- PERS-03 requirement fully implemented (hook was orphaned, now integrated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Integrate useLanguage hook with auth session in root layout** - `addbd27` (feat)
2. **Task 2: Verify integration wiring with grep checks** - No commit needed (verification-only task, confirms Task 1 correctness)

## Files Created/Modified

- `app/_layout.tsx` - Added useLanguage hook integration with auth session state extraction

## Decisions Made

1. **Dual setUserId extraction** - Called setUserId in both getSession() callback (for app launch with existing session) and onAuthStateChange() callback (for login events). This ensures language syncs regardless of how session becomes available.

2. **i18nReady guard pattern** - Added `if (!i18nReady) return null;` before render to prevent flash of untranslated content. This is a common pattern for async i18n initialization.

3. **useEffect dependency array** - Included `[userId, i18nReady, syncFromServer]` to ensure sync triggers when any of these change, particularly when userId transitions from undefined to a value on login.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - integration followed the explicit wiring steps in the plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Language sync wiring complete - ready for Settings UI implementation (Phase 31)
- useLanguage hook now accessible throughout app via root layout integration
- Runtime verification (actual login with multi-device language sync) should be tested during UAT

## Self-Check: PASSED

- FOUND: app/_layout.tsx contains useLanguage import (line 12)
- FOUND: app/_layout.tsx contains syncFromServer useEffect (lines 31-35)
- FOUND: app/_layout.tsx contains setUserId in both auth callbacks (lines 42, 76)
- FOUND: commit addbd27 exists in git log

---
*Phase: 30-server-integration-translation-files*
*Completed: 2026-02-11*
