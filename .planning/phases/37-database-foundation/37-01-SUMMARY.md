---
phase: 37-database-foundation
plan: 01
subsystem: database
tags: [postgres, supabase, rls, migration, wishlist, multi-wishlist]

# Dependency graph
requires:
  - phase: 23-database-foundation
    provides: friends table, are_friends() helper, RLS patterns
  - phase: 18-schema-atomic-functions
    provides: gift_claims table, claim_item() RPC, celebrant exclusion RLS
provides:
  - wishlists table with user ownership and visibility settings
  - partial unique index for WISH-04 (one default wishlist per user)
  - wishlist_id column on wishlist_items (nullable for transition)
  - dual-access RLS pattern on wishlist_items (group_id OR wishlist_id)
  - create_default_wishlist() trigger function for new users
  - backfill logic for existing users and items
affects: [38-core-api, 39-add-item-intent, 40-share-wishlist, 41-wishlist-management-ui, 43-finalization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "partial unique index for one-per-user constraints (WISH-04)"
    - "dual-access RLS pattern for migration compatibility (group_id OR wishlist_id)"
    - "SECURITY DEFINER trigger for cross-table operations"
    - "in-migration validation with DO $$ block"

key-files:
  created:
    - supabase/migrations/20260216000001_v1.7_multi_wishlist_foundation.sql
  modified:
    - supabase/migrations/20260201000003_make_group_id_nullable.sql
    - supabase/migrations/20260214000001_i18n_server_sync.sql

key-decisions:
  - "wishlist_id nullable during v1.7 transition, NOT NULL deferred to Phase 43"
  - "ON DELETE SET NULL for wishlist_id (items orphan rather than delete)"
  - "dual-access RLS preserves legacy group_id access while adding wishlist_id"
  - "gift_claims RLS unchanged - celebrant exclusion uses wi.group_id only"
  - "trigger fires on public.users INSERT (not auth.users) for default wishlist"

patterns-established:
  - "WISH-04: one default per user via partial unique index WHERE is_default = TRUE"
  - "Transition pattern: nullable FK with backfill, NOT NULL enforced later"
  - "Dual-access RLS: OR clause supporting both old and new access patterns"

# Metrics
duration: 9min
completed: 2026-02-16
---

# Phase 37 Plan 01: Database Foundation Summary

**Multi-wishlist schema foundation with wishlists table, partial unique index for WISH-04, dual-access RLS on wishlist_items, and auto-creation trigger for new users**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-16T12:10:29Z
- **Completed:** 2026-02-16T12:19:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created wishlists table with full CRUD RLS policies (owner access, cannot delete default)
- Enforced WISH-04 (exactly one default wishlist per user) via partial unique index
- Extended wishlist_items with nullable wishlist_id FK during transition period
- Updated wishlist_items SELECT policy with dual-access pattern (group_id OR wishlist_id)
- Preserved celebrant exclusion in gift_claims (RLS policy unchanged, uses wi.group_id)
- Created trigger to auto-create default wishlist for new users

## Task Commits

Each task was committed atomically:

1. **Task 1: Create multi-wishlist migration file** - `74e4ea7` (feat)
2. **Task 1 fix: Migration ordering and view recreation** - `9d812ac` (fix)

**Plan metadata:** (pending - docs commit after STATE.md update)

## Files Created/Modified
- `supabase/migrations/20260216000001_v1.7_multi_wishlist_foundation.sql` - Complete multi-wishlist schema (wishlists table, wishlist_id column, RLS, trigger, validation)
- `supabase/migrations/20260201000003_make_group_id_nullable.sql` - Renamed from 001_* for correct migration ordering
- `supabase/migrations/20260214000001_i18n_server_sync.sql` - Fixed DROP VIEW before CREATE for column reordering

## Decisions Made
- **ON DELETE SET NULL:** wishlist_id uses SET NULL rather than CASCADE to preserve items if wishlist deleted during transition
- **Trigger on public.users:** Fires on INSERT to public.users (not auth.users) to match existing patterns and ensure user row exists
- **No gift_claims changes:** Celebrant exclusion uses wi.group_id exclusively, no wishlist_id checks needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration ordering fix**
- **Found during:** Task 1 (db reset attempt)
- **Issue:** `001_make_group_id_nullable.sql` ran before initial schema due to naming
- **Fix:** Renamed to `20260201000003_make_group_id_nullable.sql` for correct timestamp ordering
- **Files modified:** supabase/migrations/ (file rename)
- **Verification:** `npx supabase db reset` completes successfully
- **Committed in:** 9d812ac

**2. [Rule 3 - Blocking] View column reordering fix**
- **Found during:** Task 1 (db reset attempt)
- **Issue:** `CREATE OR REPLACE VIEW` failed when column order changed in i18n_server_sync.sql
- **Fix:** Changed to `DROP VIEW IF EXISTS; CREATE VIEW` pattern
- **Files modified:** supabase/migrations/20260214000001_i18n_server_sync.sql
- **Verification:** `npx supabase db reset` completes successfully
- **Committed in:** 9d812ac (part of same fix commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking)
**Impact on plan:** Both auto-fixes necessary for migration to apply. No scope creep. Task 2 validation was built into Task 1 migration.

## Issues Encountered
None beyond the blocking issues auto-fixed above.

## User Setup Required
None - no external service configuration required. Database migration applies via `npx supabase db reset`.

## Next Phase Readiness
- **Ready for Phase 38 (Core API):** Database schema in place for wishlist CRUD operations
- **Transition notes:** wishlist_id is nullable during v1.7; Phase 43 will enforce NOT NULL after full migration

## Self-Check: PASSED

Verified:
- [x] wishlists table exists with correct columns
- [x] idx_wishlists_user_default partial unique index exists (WISH-04)
- [x] wishlist_id column exists on wishlist_items (nullable)
- [x] 4 RLS policies on wishlists table (SELECT, INSERT, UPDATE, DELETE)
- [x] Dual-access RLS policy on wishlist_items
- [x] on_user_created_create_wishlist trigger exists
- [x] gift_claims celebrant exclusion policy unchanged (uses wi.group_id)
- [x] Commits exist: 74e4ea7, 9d812ac

---
*Phase: 37-database-foundation*
*Completed: 2026-02-16*
