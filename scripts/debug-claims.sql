-- Debug Claims State
-- Run in Supabase SQL Editor to verify claim data

-- 1. Check if any claims exist
SELECT
  gc.id as claim_id,
  gc.wishlist_item_id,
  gc.claimed_by,
  gc.claim_type,
  gc.status,
  gc.created_at,
  wi.title as item_title,
  wi.user_id as item_owner_id,
  owner.full_name as item_owner_name,
  claimer.full_name as claimer_name
FROM public.gift_claims gc
JOIN public.wishlist_items wi ON wi.id = gc.wishlist_item_id
JOIN public.users owner ON owner.id = wi.user_id
JOIN public.users claimer ON claimer.id = gc.claimed_by
ORDER BY gc.created_at DESC;

-- 2. Check Carlos's items and their claim status
-- Replace CARLOS_ID with actual ID
SELECT
  wi.id,
  wi.title,
  wi.item_type,
  wi.user_id as owner_id,
  u.full_name as owner_name,
  CASE WHEN gc.id IS NOT NULL THEN 'CLAIMED' ELSE 'UNCLAIMED' END as claim_status,
  gc.claimed_by as claimer_id
FROM public.wishlist_items wi
JOIN public.users u ON u.id = wi.user_id
LEFT JOIN public.gift_claims gc ON gc.wishlist_item_id = wi.id
WHERE u.full_name ILIKE '%carlos%'
ORDER BY wi.created_at DESC;

-- 3. Test the get_item_claim_status function directly
-- First, get Carlos's user ID
SELECT id, full_name FROM public.users WHERE full_name ILIKE '%carlos%';

-- 4. If you have Carlos's item IDs, test the RPC:
-- Replace the UUID array with actual item IDs from query #2
-- SELECT * FROM get_item_claim_status(ARRAY['item-uuid-1', 'item-uuid-2']::uuid[]);

-- 5. Check if wishlist items have group_id set
SELECT
  wi.id,
  wi.title,
  wi.group_id,
  g.name as group_name,
  wi.user_id
FROM public.wishlist_items wi
LEFT JOIN public.groups g ON g.id = wi.group_id
WHERE wi.user_id IN (
  SELECT id FROM public.users WHERE full_name ILIKE '%carlos%'
)
ORDER BY wi.created_at DESC;
