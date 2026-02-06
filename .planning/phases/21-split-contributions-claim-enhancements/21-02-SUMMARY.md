---
phase: 21-split-contributions-claim-enhancements
plan: 02
subsystem: api
tags: [typescript, supabase, rpc, split-contributions, claims]

dependency-graph:
  requires:
    - 21-01 (Split contribution RPC functions)
  provides:
    - TypeScript service library for split contributions
    - 7 exported functions: openSplit, pledgeContribution, closeSplit, getSplitStatus, getSuggestedShare, getContributors, getClaimSummary
    - Typed interfaces for all RPC responses
  affects:
    - 21-03 (UI components will import these functions)
    - 21-04 (Integration will use these for split workflow)

tech-stack:
  added: []
  patterns:
    - RPC wrapper functions with graceful degradation
    - Typed JSONB response parsing
    - Batch profile fetching for contributor display

file-tracking:
  created: []
  modified:
    - lib/contributions.ts
    - types/database.types.ts

decisions:
  - id: contributor-type-renamed
    choice: Renamed Contributor interface to SplitContributor to avoid confusion with celebration Contribution type
    rationale: Same file now exports both split and celebration contribution functions
  - id: legacy-alias
    choice: Added getContributions as alias for getCelebrationContributions
    rationale: Backwards compatibility for existing code

metrics:
  duration: 12 minutes
  completed: 2026-02-06
---

# Phase 21 Plan 02: TypeScript Split Contribution Service Summary

**Type-safe client library for split contribution RPC functions with 7 exported operations and claim summary aggregation**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-06
- **Completed:** 2026-02-06
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created 7 split contribution functions wrapping PostgreSQL RPC calls
- Added TypeScript interfaces for all RPC response types
- Updated database types with additional_costs column and Functions section
- Maintained backwards compatibility with existing celebration contribution exports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create contributions service with types** - `177e40a` (feat)
2. **Task 2: Update database types** - `10f0c23` (chore)

## Files Created/Modified

- `lib/contributions.ts` - Extended with 7 split contribution functions and typed interfaces
- `types/database.types.ts` - Added additional_costs to wishlist_items, Functions section with RPC signatures

## Key Functions Added

| Function | Purpose | Returns |
|----------|---------|---------|
| `openSplit(itemId, additionalCosts?)` | Convert full claim to split | `OpenSplitResult` |
| `pledgeContribution(itemId, amount)` | Add split contribution | `PledgeResult` with remaining |
| `closeSplit(itemId)` | Claimer covers remaining | `CloseSplitResult` with final_amount |
| `getSplitStatus(itemId)` | Get funding progress | `SplitStatus` or null |
| `getSuggestedShare(itemId)` | Equal split suggestion | `SuggestedShare` or null |
| `getContributors(itemId)` | List all contributors | `SplitContributor[]` |
| `getClaimSummary(userId, groupId)` | Celebration header counts | `ClaimSummary` |

## Decisions Made

1. **Renamed Contributor to SplitContributor** - Avoids confusion with the existing `Contribution` type for celebration contributions in the same file

2. **Added legacy alias getContributions** - Existing code importing `getContributions` continues to work, maps to `getCelebrationContributions`

3. **Graceful degradation pattern** - Read functions return null/empty on error (following lib/claims.ts pattern), mutation functions return `{success: false, error}`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Supabase type generation failed (Docker not available) - manually updated types instead
- Original file had existing celebration contribution code - preserved and organized into separate sections

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 21-03:** UI components can now import:
```typescript
import {
  openSplit,
  pledgeContribution,
  closeSplit,
  getSplitStatus,
  getSuggestedShare,
  getContributors,
  getClaimSummary,
} from '@/lib/contributions';
```

All functions are type-safe and follow established error handling patterns.

---
*Phase: 21-split-contributions-claim-enhancements*
*Completed: 2026-02-06*
