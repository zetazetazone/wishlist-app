-- Fix Special Items Constraints
-- Phase 08 Gap Closure: Address UAT findings for Surprise Me and Mystery Box items
--
-- Issues addressed:
-- 1. amazon_url NOT NULL blocks Surprise Me inserts (special items have no URL)
-- 2. mystery_box_tier allows 25 but UAT requires only 50 and 100

-- ============================================
-- PART 1: Fix amazon_url constraint
-- ============================================

-- Make amazon_url nullable (was NOT NULL from initial schema)
ALTER TABLE public.wishlist_items ALTER COLUMN amazon_url DROP NOT NULL;

-- Add smart constraint: standard items MUST have URL, special items MUST NOT
-- This prevents both missing URLs on standard items AND URLs on special items
ALTER TABLE public.wishlist_items
ADD CONSTRAINT amazon_url_by_item_type CHECK (
  (item_type = 'standard' AND amazon_url IS NOT NULL AND amazon_url != '')
  OR
  (item_type != 'standard' AND (amazon_url IS NULL OR amazon_url = ''))
);

-- ============================================
-- PART 2: Fix mystery_box_tier constraint
-- ============================================

-- Drop the existing tier CHECK constraint (allows 25, 50, 100)
-- The constraint was added inline: CHECK (mystery_box_tier IN (25, 50, 100))
ALTER TABLE public.wishlist_items
DROP CONSTRAINT IF EXISTS wishlist_items_mystery_box_tier_check;

-- Add new tier constraint: only 50 and 100 allowed
-- Per UAT feedback: 25 euro tier is not a valid option
ALTER TABLE public.wishlist_items
ADD CONSTRAINT wishlist_items_mystery_box_tier_check CHECK (
  mystery_box_tier IS NULL OR mystery_box_tier IN (50, 100)
);

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Special Items fix migration completed successfully!';
  RAISE NOTICE 'amazon_url: now nullable with smart constraint by item_type';
  RAISE NOTICE 'mystery_box_tier: now only accepts 50 or 100 (removed 25)';
END $$;
