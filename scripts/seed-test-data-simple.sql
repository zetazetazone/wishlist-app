-- Simple Test Data Seed for Gift Claims Testing
-- Run each section separately in Supabase SQL Editor

-- ============================================
-- SECTION 1: Find your existing users
-- Run this first to get the user IDs
-- ============================================

SELECT id, email, full_name, birthday
FROM public.users
ORDER BY created_at DESC;

-- Copy the IDs for "Manual Tester" and "Carlos" users
-- Then replace the placeholders below

-- ============================================
-- SECTION 2: Set your user IDs
-- Replace these with actual UUIDs from Section 1
-- ============================================

-- Example (replace with your actual IDs):
-- Manual Tester ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
-- Carlos ID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy


-- ============================================
-- SECTION 3: Create test group
-- Replace the USER_ID_HERE with Manual Tester's ID
-- ============================================

INSERT INTO public.groups (id, name, created_by, budget_limit_per_gift, mode, description)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Fixed group ID for easy reference
  'Claim Testing Group',
  'USER_ID_HERE',  -- Replace with Manual Tester's ID
  100.00,
  'gifts',
  'Group for testing gift claims functionality'
);


-- ============================================
-- SECTION 4: Add members to the group
-- Replace USER_IDs with actual IDs
-- ============================================

-- Manual Tester as admin
INSERT INTO public.group_members (group_id, user_id, role)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'MANUAL_TESTER_ID_HERE', 'admin');

-- Carlos as member (will be the celebrant)
INSERT INTO public.group_members (group_id, user_id, role)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CARLOS_ID_HERE', 'member');


-- ============================================
-- SECTION 5: Create wishlist items for Carlos
-- Replace CARLOS_ID_HERE with Carlos's actual ID
-- ============================================

-- Standard items (CAN be claimed)
INSERT INTO public.wishlist_items (user_id, group_id, title, amazon_url, image_url, price, priority, item_type, status)
VALUES
  ('CARLOS_ID_HERE', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sony WH-1000XM5 Headphones', 'https://amazon.com/dp/B09XS7JWHH', 'https://picsum.photos/seed/headphones/400/400', 348.00, 5, 'standard', 'active'),
  ('CARLOS_ID_HERE', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kindle Paperwhite', 'https://amazon.com/dp/B08KTZ8249', 'https://picsum.photos/seed/kindle/400/400', 139.99, 4, 'standard', 'active'),
  ('CARLOS_ID_HERE', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nintendo Switch Game', 'https://amazon.com/dp/B0BFJWCYTL', 'https://picsum.photos/seed/switch/400/400', 59.99, 3, 'standard', 'active'),
  ('CARLOS_ID_HERE', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lego Star Wars Set', 'https://amazon.com/dp/B09FM2WFXL', 'https://picsum.photos/seed/lego/400/400', 159.99, 4, 'standard', 'active'),
  ('CARLOS_ID_HERE', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Instant Pot Duo', 'https://amazon.com/dp/B00FLYWNYQ', 'https://picsum.photos/seed/instantpot/400/400', 89.95, 3, 'standard', 'active'),
  ('CARLOS_ID_HERE', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Yeti Tumbler 30oz', 'https://amazon.com/dp/B073WJT77K', 'https://picsum.photos/seed/yeti/400/400', 35.00, 2, 'standard', 'active');

-- Surprise Me item (CANNOT be claimed - no claim button should appear)
-- Note: Special items must have amazon_url = NULL per database constraint
INSERT INTO public.wishlist_items (user_id, group_id, title, amazon_url, image_url, price, priority, item_type, status)
VALUES
  ('CARLOS_ID_HERE', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Surprise Me - Tech Gadget', NULL, 'https://picsum.photos/seed/surprise/400/400', NULL, 3, 'surprise_me', 'active');

-- Mystery Box items (CANNOT be claimed - no claim button should appear)
-- Note: Special items must have amazon_url = NULL per database constraint
INSERT INTO public.wishlist_items (user_id, group_id, title, amazon_url, image_url, price, priority, item_type, mystery_box_tier, status)
VALUES
  ('CARLOS_ID_HERE', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mystery Box - $50 Tier', NULL, 'https://picsum.photos/seed/mystery50/400/400', 50.00, 4, 'mystery_box', 50, 'active'),
  ('CARLOS_ID_HERE', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mystery Box - $100 Tier', NULL, 'https://picsum.photos/seed/mystery100/400/400', 100.00, 5, 'mystery_box', 100, 'active');


-- ============================================
-- SECTION 6: Create celebration for Carlos
-- Replace IDs accordingly
-- ============================================

INSERT INTO public.celebrations (group_id, celebrant_id, event_date, year, gift_leader_id, status)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Group ID
  'CARLOS_ID_HERE',                        -- Carlos is the celebrant
  CURRENT_DATE + INTERVAL '7 days',        -- Birthday in 7 days
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  'MANUAL_TESTER_ID_HERE',                 -- Manual Tester is gift leader
  'active'
);

-- Create chat room for the celebration (get celebration ID first)
INSERT INTO public.chat_rooms (celebration_id)
SELECT id FROM public.celebrations
WHERE group_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
AND celebrant_id = 'CARLOS_ID_HERE';


-- ============================================
-- VERIFICATION: Check your test data
-- ============================================

-- View all items in test group
SELECT wi.title, wi.item_type, wi.price, wi.priority
FROM public.wishlist_items wi
WHERE wi.group_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ORDER BY wi.item_type, wi.priority DESC;

-- View celebration
SELECT c.event_date, c.status, u.full_name as celebrant
FROM public.celebrations c
JOIN public.users u ON u.id = c.celebrant_id
WHERE c.group_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';


-- ============================================
-- TESTING INSTRUCTIONS
-- ============================================
--
-- Test 1 (Non-celebrant claim flow):
-- 1. Login as "Manual Tester"
-- 2. Navigate to Carlos's celebration page
-- 3. Standard items should show "Claim" button
-- 4. "Surprise Me" and "Mystery Box" items should NOT show Claim button
-- 5. Tap Claim on a standard item → confirm → see "Your claim" indicator
--
-- Test 2 (Celebrant taken view):
-- 1. Login as "Carlos"
-- 2. Go to My Wishlist tab
-- 3. Should see gift icon badges on claimed items
-- 4. Should see "X of Y items taken" counter
-- 5. Should NOT see who claimed items (no names/avatars)
-- ============================================
