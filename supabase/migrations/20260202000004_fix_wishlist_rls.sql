-- Fix wishlist_items RLS policies to avoid group_members recursion
-- and allow personal wishlist items (items without a group)

-- Drop all existing wishlist_items policies
DROP POLICY IF EXISTS "Users can view group wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can view their wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can create own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can insert their wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can update own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can update their wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can delete their wishlist items" ON public.wishlist_items;

-- SELECT: Users can view their own items OR items in groups they belong to
CREATE POLICY "Users can view wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (
    -- User's own items (personal wishlist)
    user_id = auth.uid()
    OR
    -- Items in groups they're a member of (uses helper function to avoid recursion)
    (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  );

-- INSERT: Users can insert their own items (with or without a group)
CREATE POLICY "Users can insert wishlist items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Personal item (no group)
      group_id IS NULL
      OR
      -- Group item - must be a member
      public.is_group_member(group_id, auth.uid())
    )
  );

-- UPDATE: Users can update their own items only
CREATE POLICY "Users can update wishlist items"
  ON public.wishlist_items FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own items only
CREATE POLICY "Users can delete wishlist items"
  ON public.wishlist_items FOR DELETE
  USING (user_id = auth.uid());

-- Add comment
COMMENT ON POLICY "Users can view wishlist items" ON public.wishlist_items IS
  'Users can view their own items and items in groups they belong to';
