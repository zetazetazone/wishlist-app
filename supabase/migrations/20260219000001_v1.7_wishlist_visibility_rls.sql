-- v1.7 Wishlist Visibility RLS
-- Phase 42: Adds linked_group_id column to wishlists and replaces the simple
-- owner-only SELECT policy with a visibility-based policy. Also updates the
-- wishlist_items INSERT policy to allow group members to add items to
-- for-others wishlists they can access.
--
-- Purpose: Enforce visibility rules at the database level (security-critical).
-- Without RLS enforcement, visibility filtering in app code can be bypassed.
--
-- Visibility Rules:
--   private  → owner only
--   public   → users who share any group with the owner
--   friends  → mutual friends (via are_friends() helper)
--   linked   → for-others wishlists visible to linked group members
--
-- Collaborative Access:
--   Group members can add items to for-others wishlists they can view
--
-- Key Constraints:
--   linked_group_id only valid for owner_type IN ('other_manual', 'other_user')

-- ============================================
-- PART 1: Add linked_group_id column
-- Links a for-others wishlist to a specific group for collaborative access
-- ============================================

ALTER TABLE public.wishlists
  ADD COLUMN IF NOT EXISTS linked_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

-- ============================================
-- PART 2: Index for group-based lookups
-- Partial index: only rows with a linked group (majority have NULL)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_wishlists_linked_group
  ON public.wishlists(linked_group_id)
  WHERE linked_group_id IS NOT NULL;

-- ============================================
-- PART 3: CHECK constraint
-- linked_group_id is only meaningful for for-others wishlists
-- ============================================

ALTER TABLE public.wishlists
  DROP CONSTRAINT IF EXISTS wishlists_linked_group_owner_type_check;

ALTER TABLE public.wishlists
  ADD CONSTRAINT wishlists_linked_group_owner_type_check CHECK (
    linked_group_id IS NULL OR owner_type IN ('other_manual', 'other_user')
  );

-- ============================================
-- PART 4: Replace owner-only SELECT policy with visibility-based policy
-- Previous policy: "Users can view own wishlists" (owner-only)
-- New policy: visibility levels + linked group access
-- ============================================

DROP POLICY IF EXISTS "Users can view own wishlists" ON public.wishlists;

CREATE POLICY "Visibility-based wishlist access"
  ON public.wishlists FOR SELECT
  USING (
    -- Owner always sees all their own wishlists (regardless of visibility)
    user_id = (SELECT auth.uid())
    OR
    -- Public wishlists: visible to users who share any group with the owner
    (visibility = 'public' AND owner_type = 'self' AND EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = wishlists.user_id
        AND gm2.user_id = (SELECT auth.uid())
    ))
    OR
    -- Friends visibility: visible to mutual friends only
    (visibility = 'friends' AND public.are_friends(wishlists.user_id, (SELECT auth.uid())))
    OR
    -- Linked group: for-others wishlists visible to all members of linked group
    (linked_group_id IS NOT NULL AND public.is_group_member(linked_group_id, (SELECT auth.uid())))
  );

COMMENT ON POLICY "Visibility-based wishlist access" ON public.wishlists IS
  'Visibility-based access: owner sees all; public wishlists visible to group co-members; '
  'friends wishlists visible to mutual friends (are_friends()); '
  'for-others wishlists with linked_group_id visible to group members (is_group_member()). '
  'Private wishlists are owner-only.';

-- ============================================
-- PART 5: Update wishlist_items INSERT policy for collaborative access
-- Previous policy allowed only owners to insert items.
-- New policy also allows group members to add to linked for-others wishlists.
-- ============================================

DROP POLICY IF EXISTS "Users can add own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can add wishlist items" ON public.wishlist_items;

CREATE POLICY "Users can add wishlist items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (
    -- User's own wishlist (any visibility level)
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.user_id = (SELECT auth.uid())
    )
    OR
    -- For-others wishlist with linked group: group members can add items
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.linked_group_id IS NOT NULL
        AND w.owner_type IN ('other_manual', 'other_user')
        AND public.is_group_member(w.linked_group_id, (SELECT auth.uid()))
    )
  );

COMMENT ON POLICY "Users can add wishlist items" ON public.wishlist_items IS
  'INSERT access: owners can add items to their own wishlists; '
  'group members can add items to for-others wishlists they have access to '
  '(where linked_group_id IS NOT NULL and they are a member of that group).';

-- ============================================
-- PART 6: Column comment
-- ============================================

COMMENT ON COLUMN public.wishlists.linked_group_id IS
  'For for-others wishlists: links to a specific group so all group members can '
  'view the wishlist and add items to it collaboratively. '
  'NULL for self-owned wishlists. Only valid when owner_type IN (''other_manual'', ''other_user'') '
  '(enforced by wishlists_linked_group_owner_type_check constraint).';

-- ============================================
-- PART 7: Validation block
-- Verify migration integrity before completing
-- ============================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_constraint_exists BOOLEAN;
  v_select_policy_exists BOOLEAN;
  v_insert_policy_exists BOOLEAN;
  v_index_exists BOOLEAN;
BEGIN
  -- 1. Verify linked_group_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wishlists'
      AND column_name = 'linked_group_id'
  ) INTO v_column_exists;

  -- 2. Verify constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'wishlists'
      AND constraint_name = 'wishlists_linked_group_owner_type_check'
  ) INTO v_constraint_exists;

  -- 3. Verify SELECT policy exists on wishlists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wishlists'
      AND policyname = 'Visibility-based wishlist access'
  ) INTO v_select_policy_exists;

  -- 4. Verify INSERT policy exists on wishlist_items
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wishlist_items'
      AND policyname = 'Users can add wishlist items'
  ) INTO v_insert_policy_exists;

  -- 5. Verify index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'wishlists'
      AND indexname = 'idx_wishlists_linked_group'
  ) INTO v_index_exists;

  -- Raise exceptions if any validation fails
  IF NOT v_column_exists THEN
    RAISE EXCEPTION 'VALIDATION FAILED: linked_group_id column not found on wishlists';
  END IF;

  IF NOT v_constraint_exists THEN
    RAISE EXCEPTION 'VALIDATION FAILED: wishlists_linked_group_owner_type_check constraint not found';
  END IF;

  IF NOT v_select_policy_exists THEN
    RAISE EXCEPTION 'VALIDATION FAILED: "Visibility-based wishlist access" policy not found on wishlists';
  END IF;

  IF NOT v_insert_policy_exists THEN
    RAISE EXCEPTION 'VALIDATION FAILED: "Users can add wishlist items" policy not found on wishlist_items';
  END IF;

  IF NOT v_index_exists THEN
    RAISE EXCEPTION 'VALIDATION FAILED: idx_wishlists_linked_group index not found';
  END IF;

  -- All validations passed
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'v1.7 Wishlist Visibility RLS - Migration Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'SCHEMA CHANGES:';
  RAISE NOTICE '  - Added: wishlists.linked_group_id (UUID FK → groups.id)';
  RAISE NOTICE '';
  RAISE NOTICE 'CONSTRAINTS:';
  RAISE NOTICE '  - wishlists_linked_group_owner_type_check';
  RAISE NOTICE '    (linked_group_id only valid for other_manual / other_user)';
  RAISE NOTICE '';
  RAISE NOTICE 'INDEXES:';
  RAISE NOTICE '  - idx_wishlists_linked_group (partial: linked_group_id IS NOT NULL)';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS POLICIES:';
  RAISE NOTICE '  - wishlists SELECT: replaced "Users can view own wishlists"';
  RAISE NOTICE '    with "Visibility-based wishlist access"';
  RAISE NOTICE '  - wishlist_items INSERT: replaced owner-only policy';
  RAISE NOTICE '    with "Users can add wishlist items" (adds group collab access)';
  RAISE NOTICE '';
  RAISE NOTICE 'VISIBILITY RULES ENFORCED:';
  RAISE NOTICE '  - private  → owner only';
  RAISE NOTICE '  - public   → users sharing any group with owner';
  RAISE NOTICE '  - friends  → mutual friends (are_friends())';
  RAISE NOTICE '  - linked   → for-others wishlists → linked group members';
  RAISE NOTICE '';
  RAISE NOTICE 'VALIDATIONS PASSED:';
  RAISE NOTICE '  - linked_group_id column exists';
  RAISE NOTICE '  - Check constraint exists';
  RAISE NOTICE '  - Visibility-based SELECT policy exists on wishlists';
  RAISE NOTICE '  - Collaborative INSERT policy exists on wishlist_items';
  RAISE NOTICE '  - Partial index exists';
  RAISE NOTICE '==============================================';
END $$;
