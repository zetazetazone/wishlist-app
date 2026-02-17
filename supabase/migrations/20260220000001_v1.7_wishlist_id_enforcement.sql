-- v1.7 Wishlist ID Enforcement
-- Phase 43: Enforces NOT NULL constraint on wishlist_id and optimizes indexes.
--
-- Purpose: Phase 37 introduced wishlist_id as nullable during the v1.7 transition.
-- Now that all items are backfilled and visibility system is complete (Phase 42),
-- we enforce NOT NULL to prevent orphaned items and upgrade to full index.
--
-- Changes:
--   1. Pre-migration validation (ensure no NULL values exist)
--   2. Change FK from ON DELETE SET NULL to ON DELETE CASCADE
--   3. Set wishlist_id NOT NULL
--   4. Replace partial index with full index
--   5. Post-migration validation
--
-- CRITICAL: gift_claims RLS policies are NOT modified. Celebrant exclusion
-- uses wi.group_id and must remain unchanged.

-- ============================================
-- PART 1: Pre-migration validation
-- Ensure no NULL wishlist_id values exist before proceeding
-- ============================================

DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM public.wishlist_items
  WHERE wishlist_id IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'PRE-MIGRATION VALIDATION FAILED: Found % items with NULL wishlist_id. Cannot proceed with NOT NULL enforcement until all items are backfilled.', v_null_count;
  END IF;

  RAISE NOTICE 'Pre-migration validation passed: No NULL wishlist_id values found.';
END $$;

-- ============================================
-- PART 2: Change FK behavior from SET NULL to CASCADE
-- PostgreSQL cannot ALTER a FK constraint directly, so we must:
--   1. DROP the existing FK constraint
--   2. ADD new FK constraint with ON DELETE CASCADE
-- ============================================

-- Drop the existing FK constraint
ALTER TABLE public.wishlist_items
  DROP CONSTRAINT IF EXISTS wishlist_items_wishlist_id_fkey;

-- Add new FK constraint with ON DELETE CASCADE
ALTER TABLE public.wishlist_items
  ADD CONSTRAINT wishlist_items_wishlist_id_fkey
    FOREIGN KEY (wishlist_id)
    REFERENCES public.wishlists(id)
    ON DELETE CASCADE;

-- ============================================
-- PART 3: Set NOT NULL constraint
-- Prevents orphaned items from being created
-- ============================================

ALTER TABLE public.wishlist_items
  ALTER COLUMN wishlist_id SET NOT NULL;

-- ============================================
-- PART 4: Replace partial index with full index
-- The partial index had WHERE wishlist_id IS NOT NULL, which is now
-- redundant since the column is NOT NULL. Full index is more efficient.
-- ============================================

-- Drop the partial index
DROP INDEX IF EXISTS public.idx_wishlist_items_wishlist;

-- Create full index (no WHERE clause)
CREATE INDEX idx_wishlist_items_wishlist ON public.wishlist_items(wishlist_id);

-- ============================================
-- PART 5: Update column comment
-- Reflect NOT NULL and CASCADE behavior
-- ============================================

COMMENT ON COLUMN public.wishlist_items.wishlist_id IS
  'Reference to owning wishlist. Required field (NOT NULL enforced in Phase 43). ON DELETE CASCADE ensures items are deleted when wishlist is deleted, maintaining referential integrity.';

-- ============================================
-- PART 6: Post-migration validation
-- Verify all changes were applied correctly
-- ============================================

DO $$
DECLARE
  v_is_nullable TEXT;
  v_fk_delete_rule TEXT;
  v_index_is_partial BOOLEAN;
  v_index_exists BOOLEAN;
BEGIN
  -- Check column is NOT NULL
  SELECT is_nullable INTO v_is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'wishlist_items'
    AND column_name = 'wishlist_id';

  IF v_is_nullable != 'NO' THEN
    RAISE EXCEPTION 'VALIDATION FAILED: wishlist_id column is not NOT NULL (is_nullable = %)', v_is_nullable;
  END IF;

  -- Check FK constraint exists with CASCADE delete rule
  SELECT rc.delete_rule INTO v_fk_delete_rule
  FROM information_schema.referential_constraints rc
  JOIN information_schema.table_constraints tc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.constraint_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'wishlist_items'
    AND rc.constraint_name = 'wishlist_items_wishlist_id_fkey';

  IF v_fk_delete_rule IS NULL THEN
    RAISE EXCEPTION 'VALIDATION FAILED: FK constraint wishlist_items_wishlist_id_fkey not found';
  END IF;

  IF v_fk_delete_rule != 'CASCADE' THEN
    RAISE EXCEPTION 'VALIDATION FAILED: FK delete rule is % (expected CASCADE)', v_fk_delete_rule;
  END IF;

  -- Check index exists and is NOT partial
  SELECT
    EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'wishlist_items'
        AND indexname = 'idx_wishlist_items_wishlist'
    ) INTO v_index_exists;

  IF NOT v_index_exists THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Index idx_wishlist_items_wishlist not found';
  END IF;

  -- Check index is not partial (no WHERE clause in definition)
  SELECT
    (indexdef LIKE '%WHERE%') INTO v_index_is_partial
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'wishlist_items'
    AND indexname = 'idx_wishlist_items_wishlist';

  IF v_index_is_partial THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Index idx_wishlist_items_wishlist is still partial (has WHERE clause)';
  END IF;

  -- All validations passed
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'v1.7 Wishlist ID Enforcement - Migration Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'SCHEMA CHANGES:';
  RAISE NOTICE '  - wishlist_id: NOT NULL enforced (was nullable)';
  RAISE NOTICE '  - FK delete rule: CASCADE (was SET NULL)';
  RAISE NOTICE '  - Index: Full index (was partial with WHERE clause)';
  RAISE NOTICE '';
  RAISE NOTICE 'VALIDATIONS PASSED:';
  RAISE NOTICE '  - Column is NOT NULL (is_nullable = NO)';
  RAISE NOTICE '  - FK constraint uses ON DELETE CASCADE';
  RAISE NOTICE '  - Full index exists (no WHERE clause)';
  RAISE NOTICE '';
  RAISE NOTICE 'UNCHANGED:';
  RAISE NOTICE '  - gift_claims RLS policies (celebrant exclusion preserved)';
  RAISE NOTICE '  - wishlist_items dual-access RLS (group_id OR wishlist_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'DATA INTEGRITY:';
  RAISE NOTICE '  - No orphaned items possible (NOT NULL constraint)';
  RAISE NOTICE '  - Items cascade-delete with wishlist (ON DELETE CASCADE)';
  RAISE NOTICE '  - Better query performance (full index vs partial)';
  RAISE NOTICE '==============================================';
END $$;
