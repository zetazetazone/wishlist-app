-- Schema Foundation for Favorites and Special Item Types
-- Phase 06: Extends wishlist_items with item_type and creates group_favorites table
-- Enables Phase 8 (Special Item Types) and Phase 9 (Favorite Marking)

-- ============================================
-- PART 1: Extend wishlist_items table
-- ============================================

-- Add item_type column with CHECK constraint (not ENUM - more flexible for changes)
ALTER TABLE public.wishlist_items
ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('standard', 'surprise_me', 'mystery_box')) DEFAULT 'standard';

-- Add mystery_box_tier column (only valid for mystery_box items)
ALTER TABLE public.wishlist_items
ADD COLUMN IF NOT EXISTS mystery_box_tier NUMERIC CHECK (mystery_box_tier IN (25, 50, 100));

-- Add surprise_me_budget column for optional budget guidance on surprise_me items
ALTER TABLE public.wishlist_items
ADD COLUMN IF NOT EXISTS surprise_me_budget NUMERIC;

-- Add cross-column constraint: mystery_box_tier requires item_type='mystery_box'
-- This prevents invalid combinations like standard items having a tier
ALTER TABLE public.wishlist_items
ADD CONSTRAINT mystery_box_tier_requires_type CHECK (
  (item_type = 'mystery_box' AND mystery_box_tier IS NOT NULL)
  OR
  (item_type != 'mystery_box' AND mystery_box_tier IS NULL)
);

-- Index on item_type for efficient filtering
CREATE INDEX IF NOT EXISTS idx_wishlist_items_type ON public.wishlist_items(item_type);

-- ============================================
-- PART 2: Create group_favorites table
-- One favorite item per user per group
-- ============================================

CREATE TABLE IF NOT EXISTS public.group_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.wishlist_items(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, group_id)  -- Enforces one favorite per user per group
);

-- ============================================
-- PART 3: RLS Policies for group_favorites
-- Uses is_group_member() function to avoid recursion
-- ============================================

ALTER TABLE public.group_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view favorites in their groups
CREATE POLICY "Users can view group favorites"
  ON public.group_favorites FOR SELECT
  USING (
    public.is_group_member(group_id, (SELECT auth.uid()))
  );

-- Users can insert own favorites in their groups
CREATE POLICY "Users can insert own favorites"
  ON public.group_favorites FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_group_member(group_id, (SELECT auth.uid()))
  );

-- Users can update own favorites
CREATE POLICY "Users can update own favorites"
  ON public.group_favorites FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can delete own favorites
CREATE POLICY "Users can delete own favorites"
  ON public.group_favorites FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ============================================
-- PART 4: Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_group_favorites_user ON public.group_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_group_favorites_group ON public.group_favorites(group_id);
CREATE INDEX IF NOT EXISTS idx_group_favorites_item ON public.group_favorites(item_id);

-- ============================================
-- PART 5: Trigger for updated_at
-- Reuses pattern from existing migrations
-- ============================================

-- Create or replace the updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to group_favorites
DROP TRIGGER IF EXISTS on_group_favorites_updated ON public.group_favorites;
CREATE TRIGGER on_group_favorites_updated
  BEFORE UPDATE ON public.group_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Schema Foundation migration completed successfully!';
  RAISE NOTICE 'Added to wishlist_items: item_type, mystery_box_tier, surprise_me_budget';
  RAISE NOTICE 'Created: group_favorites table with RLS policies';
  RAISE NOTICE 'Constraint: mystery_box_tier requires item_type=mystery_box';
END $$;
