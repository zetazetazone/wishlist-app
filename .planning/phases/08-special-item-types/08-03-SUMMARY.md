---
phase: 08
plan: 03
subsystem: wishlist-special-items
tags: [fix, database, typescript, uat-gap-closure]
dependency-graph:
  requires: [08-01, 08-02]
  provides: [fixed-amazon-url-constraint, fixed-tier-constraint, removed-budget-field]
  affects: []
tech-stack:
  added: []
  patterns: [smart-check-constraint, nullable-with-validation]
file-tracking:
  key-files:
    created:
      - supabase/migrations/20260203000001_fix_special_items.sql
    modified:
      - components/wishlist/AddItemModal.tsx
      - types/database.types.ts
decisions:
  - id: D-0803-1
    choice: Smart CHECK constraint for amazon_url (standard requires URL, special forbids)
    rationale: Enforces data integrity while allowing null for special items
  - id: D-0803-2
    choice: Remove surprise_me_budget from UI (budget is group-level)
    rationale: Per UAT feedback - budget_limit_per_gift is on groups table, not per-item
metrics:
  duration: 4 minutes
  completed: 2026-02-03
---

# Phase 08 Plan 03: Fix Special Items UAT Gaps - Summary

**One-liner:** Database constraints fixed for special items (amazon_url nullable, tier 50/100 only) and budget field removed from Surprise Me form.

## What Was Done

### Task 1: Database Migration
Created migration `20260203000001_fix_special_items.sql`:
- Made `amazon_url` nullable (was NOT NULL blocking special item inserts)
- Added smart CHECK constraint: standard items require URL, special items forbid URL
- Updated `mystery_box_tier` CHECK to only allow 50 and 100 (removed 25)

### Task 2: AddItemModal Updates
- Removed `budget` state and related useEffect cleanup
- Removed budget input field from Surprise Me form section
- Removed `surprise_me_budget` from payload and interface
- Updated `MysteryBoxTier` type to `50 | 100` (was `25 | 50 | 100`)
- Updated tier selector array to `[50, 100]`
- Changed `amazon_url` to `null` for special items (was empty string `''`)
- Updated interface to allow `amazon_url: string | null`

### Task 3: TypeScript Types
Updated `types/database.types.ts`:
- `amazon_url`: `string` -> `string | null` (Row, Insert, Update)
- `mystery_box_tier`: `25 | 50 | 100 | null` -> `50 | 100 | null` (Row, Insert, Update)

## Commits

| Hash | Message |
|------|---------|
| 87e1631 | fix(08-03): make amazon_url nullable and update tier constraint |
| d6eeed1 | fix(08-03): remove budget field and update tier array in AddItemModal |
| f9640c8 | fix(08-03): update TypeScript types for special items schema |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- Migration applied successfully to remote database
- Budget field completely removed (0 grep matches)
- Tier array now `[50, 100]` only
- `amazon_url` uses `null` for special items
- TypeScript compilation: no new errors in modified files

## UAT Gap Closure Status

| Gap | Status | Evidence |
|-----|--------|----------|
| Budget field in Surprise Me form | FIXED | Removed from AddItemModal (lines 44, 51-53, 117, 151, 571-620) |
| 25 euro tier in Mystery Box | FIXED | Type changed to `50 \| 100`, array is `[50, 100]` |
| Surprise Me insert hanging | FIXED | amazon_url constraint allows null for special items |

## Files Changed

```
supabase/migrations/20260203000001_fix_special_items.sql  +49 lines (new)
components/wishlist/AddItemModal.tsx                       +7/-66 lines
types/database.types.ts                                    +6/-6 lines
```

## Key Patterns Established

**Smart CHECK Constraint Pattern:**
```sql
ALTER TABLE table_name
ADD CONSTRAINT column_by_type CHECK (
  (type = 'type_a' AND column IS NOT NULL)
  OR
  (type != 'type_a' AND column IS NULL)
);
```
This pattern allows nullable columns while enforcing type-specific requirements.

## Next Steps

Phase 08 gap closure complete. Ready to proceed to:
- Phase 9: Favorite Marking (FAV-01, FAV-02, FAV-03)
