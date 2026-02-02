-- Make group_id nullable for wishlist_items
-- This allows users to have personal wishlist items not tied to any group
ALTER TABLE public.wishlist_items
  ALTER COLUMN group_id DROP NOT NULL;

-- Update the RLS policy to allow users to view their own items regardless of group
DROP POLICY IF EXISTS "Users can view group wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can view their wishlist items" ON public.wishlist_items;

CREATE POLICY "Users can view their wishlist items" ON public.wishlist_items FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = wishlist_items.group_id AND user_id = auth.uid()
    )
  );

-- Allow users to insert their own wishlist items
DROP POLICY IF EXISTS "Users can insert their wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can insert their wishlist items" ON public.wishlist_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own wishlist items
DROP POLICY IF EXISTS "Users can update their wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can update their wishlist items" ON public.wishlist_items FOR UPDATE
  USING (user_id = auth.uid());

-- Allow users to delete their own wishlist items
DROP POLICY IF EXISTS "Users can delete their wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can delete their wishlist items" ON public.wishlist_items FOR DELETE
  USING (user_id = auth.uid());
