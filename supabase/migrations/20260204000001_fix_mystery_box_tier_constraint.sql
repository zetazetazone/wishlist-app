-- Fix Mystery Box Tier Constraint
-- Allows mystery_box items to optionally have no tier
--
-- Issue: The original constraint required mystery_box items to ALWAYS have a tier,
-- but the UI intentionally creates mystery boxes without tier selection.
-- Error: "new row for relation \"wishlist_items\" violates check constraint \"mystery_box_tier_requires_type\""

-- ============================================
-- Drop the overly restrictive constraint
-- ============================================

ALTER TABLE public.wishlist_items
DROP CONSTRAINT IF EXISTS mystery_box_tier_requires_type;

-- ============================================
-- Add corrected constraint
-- ============================================

-- New logic:
-- - mystery_box items CAN have a tier (50 or 100) or no tier (NULL)
-- - non-mystery_box items MUST NOT have a tier (mystery_box_tier must be NULL)
-- This allows the simple "Mystery Box" without tier selection

ALTER TABLE public.wishlist_items
ADD CONSTRAINT mystery_box_tier_requires_type CHECK (
  (item_type = 'mystery_box')
  OR
  (item_type != 'mystery_box' AND mystery_box_tier IS NULL)
);

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Mystery Box tier constraint fix completed!';
  RAISE NOTICE 'mystery_box items can now have optional tier (NULL allowed)';
  RAISE NOTICE 'non-mystery_box items still require NULL tier';
END $$;
