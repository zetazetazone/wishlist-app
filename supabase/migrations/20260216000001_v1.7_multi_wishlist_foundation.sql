-- v1.7 Multi-Wishlist Foundation
-- Phase 37: Creates wishlists table, extends wishlist_items with wishlist_id,
-- backfills existing data, and updates RLS policies for dual-access pattern.
--
-- Purpose: Transition from group-centric to user-owned wishlist architecture.
-- All existing items migrate to user's default wishlist while preserving
-- gift claims and celebrant exclusion.
--
-- RLS Patterns:
--   1. Owner CRUD (wishlists) - Owner can manage, cannot delete default
--   2. Dual-Access (wishlist_items SELECT) - group_id OR wishlist_id access
--   3. Celebrant Exclusion (gift_claims) - UNCHANGED, uses wi.group_id
--
-- Key Constraints:
--   WISH-04: Exactly one default wishlist per user (partial unique index)

-- ============================================
-- PART 1: wishlists table
-- Core table for user-owned wishlists
-- ============================================

CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 2: Partial unique index for one default per user
-- Enforces WISH-04: exactly one default wishlist per user
-- ============================================

CREATE UNIQUE INDEX idx_wishlists_user_default
  ON public.wishlists(user_id)
  WHERE is_default = TRUE;

-- ============================================
-- PART 3: Add wishlist_id column to wishlist_items
-- Nullable during transition period (Phase 43 makes it NOT NULL)
-- ON DELETE SET NULL prevents item deletion if wishlist removed
-- ============================================

ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS wishlist_id UUID REFERENCES public.wishlists(id) ON DELETE SET NULL;

-- ============================================
-- PART 4: Create default wishlists for all existing users
-- Uses NOT EXISTS to prevent duplicates on re-run
-- ============================================

-- First, create default wishlists for users who have wishlist items
INSERT INTO public.wishlists (user_id, name, emoji, visibility, is_default)
SELECT DISTINCT u.id, 'My Wishlist', NULL, 'public', TRUE
FROM public.users u
WHERE EXISTS (
  SELECT 1 FROM public.wishlist_items wi WHERE wi.user_id = u.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.wishlists w WHERE w.user_id = u.id AND w.is_default = TRUE
);

-- Then, create default wishlists for users without items (for completeness)
INSERT INTO public.wishlists (user_id, name, emoji, visibility, is_default)
SELECT u.id, 'My Wishlist', NULL, 'public', TRUE
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.wishlists w WHERE w.user_id = u.id AND w.is_default = TRUE
);

-- ============================================
-- PART 5: Backfill existing items to default wishlists
-- Links all existing items to their owner's default wishlist
-- ============================================

UPDATE public.wishlist_items wi
SET wishlist_id = (
  SELECT w.id FROM public.wishlists w
  WHERE w.user_id = wi.user_id AND w.is_default = TRUE
  LIMIT 1
)
WHERE wi.wishlist_id IS NULL AND wi.user_id IS NOT NULL;

-- ============================================
-- PART 6: Enable RLS and create policies for wishlists table
-- Pattern: Owner CRUD, cannot delete default
-- ============================================

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- SELECT: Owner can view own wishlists
CREATE POLICY "Users can view own wishlists"
  ON public.wishlists FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- INSERT: Owner only (authenticated user = user_id)
CREATE POLICY "Users can create own wishlists"
  ON public.wishlists FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: Owner only, cannot change user_id
CREATE POLICY "Users can update own wishlists"
  ON public.wishlists FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: Owner only, CANNOT delete default wishlist
CREATE POLICY "Users can delete non-default wishlists"
  ON public.wishlists FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    AND is_default = FALSE
  );

-- ============================================
-- PART 7: Updated RLS policy for wishlist_items SELECT
-- Dual-access pattern: group_id OR wishlist_id
-- Preserves legacy group access while adding wishlist access
-- ============================================

-- Drop existing policy and recreate with dual-access pattern
DROP POLICY IF EXISTS "Users can view wishlist items" ON public.wishlist_items;

CREATE POLICY "Users can view wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (
    -- Own items (personal wishlist - always visible to owner)
    user_id = (SELECT auth.uid())
    OR
    -- Group-based access (legacy pattern - items in groups user belongs to)
    (group_id IS NOT NULL AND public.is_group_member(group_id, (SELECT auth.uid())))
    OR
    -- Wishlist-based access (new pattern - items in wishlists owned by current user)
    -- This allows user to see items they've added to their own wishlists
    (wishlist_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.user_id = (SELECT auth.uid())
    ))
  );

-- Comment on the dual-access pattern
COMMENT ON POLICY "Users can view wishlist items" ON public.wishlist_items IS
  'Dual-access pattern: Users can view own items, items in groups they belong to (via group_id), or items in their own wishlists (via wishlist_id). Supports both legacy group-scoped and new user-owned wishlist access.';

-- ============================================
-- PART 8: Trigger for new users
-- Creates default wishlist automatically on user creation
-- Fires AFTER INSERT on public.users (not auth.users)
-- ============================================

CREATE OR REPLACE FUNCTION public.create_default_wishlist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wishlists (user_id, name, is_default, visibility)
  VALUES (NEW.id, 'My Wishlist', TRUE, 'public');
  RETURN NEW;
END;
$$;

-- Drop trigger if exists to allow re-running
DROP TRIGGER IF EXISTS on_user_created_create_wishlist ON public.users;

CREATE TRIGGER on_user_created_create_wishlist
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_wishlist();

-- ============================================
-- PART 9: Indexes
-- Optimize common queries
-- ============================================

-- Lookup wishlists by user
CREATE INDEX idx_wishlists_user ON public.wishlists(user_id);

-- Lookup items by wishlist (partial index for non-null only)
CREATE INDEX idx_wishlist_items_wishlist ON public.wishlist_items(wishlist_id)
  WHERE wishlist_id IS NOT NULL;

-- ============================================
-- PART 10: Triggers
-- Reuse existing handle_updated_at() function
-- ============================================

CREATE TRIGGER set_wishlists_updated_at
  BEFORE UPDATE ON public.wishlists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- PART 11: Comments
-- Document tables, columns, and RLS patterns
-- ============================================

-- wishlists table comments
COMMENT ON TABLE public.wishlists IS
  'User-owned wishlists for v1.7 multi-wishlist support. RLS pattern: owner CRUD with default deletion protection. Partial unique index enforces WISH-04 (one default per user).';

COMMENT ON COLUMN public.wishlists.user_id IS
  'Owner of this wishlist. Foreign key to users table.';

COMMENT ON COLUMN public.wishlists.name IS
  'Display name of the wishlist (e.g., "My Wishlist", "Christmas Ideas").';

COMMENT ON COLUMN public.wishlists.emoji IS
  'Optional emoji icon for the wishlist (e.g., "🎁", "🎄").';

COMMENT ON COLUMN public.wishlists.visibility IS
  'Access level: public (anyone), friends (friends only), private (owner only).';

COMMENT ON COLUMN public.wishlists.is_default IS
  'TRUE for the user''s default wishlist. Exactly one per user (enforced by partial unique index idx_wishlists_user_default). Cannot be deleted via RLS policy.';

COMMENT ON COLUMN public.wishlists.sort_order IS
  'User-defined ordering for wishlist display. Default wishlists typically have sort_order=0.';

-- wishlist_items.wishlist_id column comment
COMMENT ON COLUMN public.wishlist_items.wishlist_id IS
  'Reference to owning wishlist. Nullable during v1.7 transition (becomes NOT NULL in Phase 43). ON DELETE SET NULL preserves items if wishlist deleted.';

-- Function and trigger comments
COMMENT ON FUNCTION public.create_default_wishlist IS
  'SECURITY DEFINER trigger function that creates default wishlist for new users. Fires on public.users INSERT (not auth.users). Ensures WISH-04 compliance from user creation.';

-- ============================================
-- PART 12: Grants
-- Allow authenticated users to execute functions
-- ============================================

GRANT EXECUTE ON FUNCTION public.create_default_wishlist() TO authenticated;

-- ============================================
-- PART 13: Validation and completion notice
-- Verify migration integrity
-- ============================================

DO $$
DECLARE
  v_orphan_users INTEGER;
  v_duplicate_defaults INTEGER;
  v_orphan_items INTEGER;
  v_default_wishlists_created INTEGER;
  v_items_backfilled INTEGER;
  v_index_exists BOOLEAN;
BEGIN
  -- Count users without default wishlist (should be 0)
  SELECT COUNT(*) INTO v_orphan_users
  FROM public.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.wishlists w
    WHERE w.user_id = u.id AND w.is_default = TRUE
  );

  -- Count users with multiple default wishlists (should be 0)
  SELECT COUNT(*) INTO v_duplicate_defaults
  FROM (
    SELECT user_id, COUNT(*)
    FROM public.wishlists
    WHERE is_default = TRUE
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) duplicates;

  -- Count items without wishlist_id that have user_id (should be 0)
  SELECT COUNT(*) INTO v_orphan_items
  FROM public.wishlist_items
  WHERE wishlist_id IS NULL AND user_id IS NOT NULL;

  -- Count default wishlists created
  SELECT COUNT(*) INTO v_default_wishlists_created
  FROM public.wishlists
  WHERE is_default = TRUE;

  -- Count items backfilled
  SELECT COUNT(*) INTO v_items_backfilled
  FROM public.wishlist_items
  WHERE wishlist_id IS NOT NULL;

  -- Check partial unique index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'wishlists' AND indexname = 'idx_wishlists_user_default'
  ) INTO v_index_exists;

  -- Raise exception if validation fails
  IF v_orphan_users > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % users without default wishlist', v_orphan_users;
  END IF;

  IF v_duplicate_defaults > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % users with multiple default wishlists', v_duplicate_defaults;
  END IF;

  IF v_orphan_items > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: % items without wishlist_id', v_orphan_items;
  END IF;

  IF NOT v_index_exists THEN
    RAISE EXCEPTION 'VALIDATION FAILED: idx_wishlists_user_default index not found';
  END IF;

  -- All validations passed
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'v1.7 Multi-Wishlist Foundation - Migration Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLES:';
  RAISE NOTICE '  - Created: wishlists';
  RAISE NOTICE '  - Extended: wishlist_items (added wishlist_id column)';
  RAISE NOTICE '';
  RAISE NOTICE 'DATA:';
  RAISE NOTICE '  - Default wishlists created: %', v_default_wishlists_created;
  RAISE NOTICE '  - Items backfilled: %', v_items_backfilled;
  RAISE NOTICE '';
  RAISE NOTICE 'INDEXES:';
  RAISE NOTICE '  - idx_wishlists_user (lookup by user)';
  RAISE NOTICE '  - idx_wishlists_user_default (WISH-04 enforcement)';
  RAISE NOTICE '  - idx_wishlist_items_wishlist (lookup by wishlist)';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS POLICIES:';
  RAISE NOTICE '  - wishlists: 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - wishlist_items: SELECT updated with dual-access pattern';
  RAISE NOTICE '';
  RAISE NOTICE 'TRIGGERS:';
  RAISE NOTICE '  - on_user_created_create_wishlist (creates default wishlist for new users)';
  RAISE NOTICE '  - set_wishlists_updated_at (maintains updated_at column)';
  RAISE NOTICE '';
  RAISE NOTICE 'FUNCTIONS:';
  RAISE NOTICE '  - create_default_wishlist() (SECURITY DEFINER)';
  RAISE NOTICE '';
  RAISE NOTICE 'VALIDATIONS PASSED:';
  RAISE NOTICE '  - All users have exactly one default wishlist';
  RAISE NOTICE '  - No duplicate default wishlists (WISH-04)';
  RAISE NOTICE '  - All items with user_id have wishlist_id';
  RAISE NOTICE '  - Partial unique index exists';
  RAISE NOTICE '';
  RAISE NOTICE 'GIFT CLAIMS CELEBRANT EXCLUSION:';
  RAISE NOTICE '  - gift_claims RLS policy UNCHANGED';
  RAISE NOTICE '  - Celebrant exclusion uses wi.group_id (not wishlist_id)';
  RAISE NOTICE '  - Item owner still blocked from viewing claims on their items';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: wishlist_id is nullable during transition.';
  RAISE NOTICE 'Phase 43 will make wishlist_id NOT NULL.';
  RAISE NOTICE '==============================================';
END $$;
