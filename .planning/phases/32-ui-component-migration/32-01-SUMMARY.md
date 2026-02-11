---
phase: 32-ui-component-migration
plan: 01
subsystem: i18n
tags: [i18next, react-i18next, date-fns, eslint, localization, hooks]

# Dependency graph
requires:
  - phase: 31-root-integration-settings-ui
    provides: i18n infrastructure with useLanguage hook
  - phase: 30-server-integration-translation-files
    provides: Translation files and notification system
  - phase: 29-foundation-tooling
    provides: i18next configuration and type declarations
provides:
  - useLocalizedFormat hook for date formatting with automatic locale
  - ESLint plugin for detecting hardcoded UI strings
  - Automated verification tooling for migration progress
affects: [32-02-high-traffic-screens, 32-03-alerts-toasts, 32-04-remaining-components]

# Tech tracking
tech-stack:
  added: [eslint-plugin-i18next@6.1.3, eslint@8.57.1, eslint-config-expo, eslint-config-prettier]
  patterns: [useLocalizedFormat hook pattern, ESLint verification workflow]

key-files:
  created: [hooks/useLocalizedFormat.ts, .eslintrc.js]
  modified: [package.json, package-lock.json]

key-decisions:
  - "Use useLocalizedFormat hook pattern for all date formatting needs"
  - "Configure eslint-plugin-i18next at warn level to allow incremental migration"
  - "Install ESLint v8 for .eslintrc.js compatibility with Expo"

patterns-established:
  - "Date formatting: Always use useLocalizedFormat hook, never call date-fns directly with hardcoded locale"
  - "Verification: Run npx eslint on files to detect remaining hardcoded strings"

# Metrics
duration: 3min
completed: 2026-02-11
---

# Phase 32 Plan 01: UI Migration Foundation Summary

**useLocalizedFormat hook for date localization and eslint-plugin-i18next for automated hardcoded string detection**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-02-11T15:21:30Z
- **Completed:** 2026-02-11T15:24:13Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created useLocalizedFormat hook wrapping date-fns with automatic en/es locale selection
- Installed and configured eslint-plugin-i18next for automated detection of hardcoded JSX strings
- Established verification workflow for tracking migration progress

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useLocalizedFormat hook** - `d6eca80` (feat)
2. **Task 2: Configure eslint-plugin-i18next** - `aa7ab0c` (chore)

## Files Created/Modified
- `hooks/useLocalizedFormat.ts` - Hook for localized date formatting with automatic locale based on i18n.language
- `.eslintrc.js` - ESLint configuration with i18next/no-literal-string rule at warn level
- `package.json` - Added eslint, eslint-config-expo, eslint-config-prettier, eslint-plugin-i18next
- `package-lock.json` - Dependency lockfile updated

## Decisions Made
- **ESLint v8 over v10:** Installed ESLint v8 for .eslintrc.js compatibility since Expo config requires legacy format
- **Warn level rule:** Configured i18next/no-literal-string at warn level (not error) to allow incremental migration without blocking builds
- **markupOnly: true:** Configured rule to only check JSX markup, not all strings in code

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed ESLint and Expo config packages**
- **Found during:** Task 2 (ESLint plugin configuration)
- **Issue:** ESLint was not installed in the project, causing npx eslint to use global version incompatible with .eslintrc.js
- **Fix:** Installed eslint@8.57.0, eslint-config-expo, and eslint-config-prettier
- **Files modified:** package.json, package-lock.json
- **Verification:** npx eslint successfully runs and detects hardcoded strings
- **Committed in:** aa7ab0c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary to make ESLint functional. No scope creep - standard tooling installation.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for phase 32-02 (high-traffic screens migration):
- useLocalizedFormat hook available for all date formatting needs
- ESLint verification available to detect remaining hardcoded strings
- Pattern established: useTranslation() for text, useLocalizedFormat() for dates

No blockers. All verification criteria met:
- ✅ TypeScript compiles without errors related to new files
- ✅ useLocalizedFormat hook exports format, formatDistanceToNow, formatRelative, locale
- ✅ eslint-plugin-i18next installed in devDependencies
- ✅ ESLint rule configured and detects hardcoded strings in unmigrated files

## Self-Check: PASSED

All claims verified:
- ✅ FOUND: hooks/useLocalizedFormat.ts
- ✅ FOUND: .eslintrc.js
- ✅ FOUND: d6eca80 (Task 1 commit)
- ✅ FOUND: aa7ab0c (Task 2 commit)

---
*Phase: 32-ui-component-migration*
*Completed: 2026-02-11*
