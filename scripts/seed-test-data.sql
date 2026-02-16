-- Seed Test Data for Gift Claims UI Testing
-- Run this in Supabase SQL Editor
--
-- This script creates test profiles and mock data for testing claim functionality.
-- Prerequisites: "Manual Tester" and "Carlos" users must exist in auth.users

-- ============================================
-- STEP 1: Find existing users
-- ============================================

-- First, let's see what users already exist
SELECT id, email, full_name, birthday FROM public.users ORDER BY created_at DESC LIMIT 10;

-- ============================================
-- STEP 2: Create additional test profiles
-- (Run after auth users are created via app signup)
-- ============================================

-- Note: Test users should be created by signing up through the app first.
-- This script assumes you have existing users and will work with them.

-- ============================================
-- STEP 3: Create a test group for claim testing
-- ============================================

-- Create the group (replace {ADMIN_USER_ID} with actual user ID)
-- Example: The admin should be someone other than the celebrant
DO $$
DECLARE
  v_group_id UUID;
  v_manual_tester_id UUID;
  v_carlos_id UUID;
  v_celebrant_id UUID;
  v_celebration_id UUID;
BEGIN
  -- Find Manual Tester user
  SELECT id INTO v_manual_tester_id
  FROM public.users
  WHERE LOWER(full_name) LIKE '%manual%tester%' OR LOWER(email) LIKE '%manual%'
  LIMIT 1;

  -- Find Carlos user
  SELECT id INTO v_carlos_id
  FROM public.users
  WHERE LOWER(full_name) LIKE '%carlos%' OR LOWER(email) LIKE '%carlos%'
  LIMIT 1;

  -- Verify users exist
  IF v_manual_tester_id IS NULL THEN
    RAISE EXCEPTION 'Could not find Manual Tester user. Please create this user first via app signup.';
  END IF;

  IF v_carlos_id IS NULL THEN
    RAISE EXCEPTION 'Could not find Carlos user. Please create this user first via app signup.';
  END IF;

  RAISE NOTICE 'Found Manual Tester: %', v_manual_tester_id;
  RAISE NOTICE 'Found Carlos: %', v_carlos_id;

  -- Use Carlos as the celebrant (birthday person)
  v_celebrant_id := v_carlos_id;

  -- Check if test group already exists
  SELECT id INTO v_group_id
  FROM public.groups
  WHERE name = 'Claim Testing Group';

  IF v_group_id IS NOT NULL THEN
    RAISE NOTICE 'Test group already exists: %', v_group_id;
  ELSE
    -- Create test group
    INSERT INTO public.groups (name, created_by, budget_limit_per_gift, mode, description)
    VALUES ('Claim Testing Group', v_manual_tester_id, 100.00, 'gifts', 'Group for testing gift claims functionality')
    RETURNING id INTO v_group_id;

    RAISE NOTICE 'Created test group: %', v_group_id;

    -- Add Manual Tester as admin
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (v_group_id, v_manual_tester_id, 'admin')
    ON CONFLICT (group_id, user_id) DO NOTHING;

    -- Add Carlos as member
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (v_group_id, v_carlos_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;

    RAISE NOTICE 'Added both users to group';
  END IF;

  -- ============================================
  -- STEP 4: Create wishlist items for Carlos (celebrant)
  -- ============================================

  -- Delete existing test items for clean slate (optional)
  -- DELETE FROM public.wishlist_items WHERE group_id = v_group_id AND user_id = v_celebrant_id;

  -- Standard wishlist items (can be claimed)
  INSERT INTO public.wishlist_items (user_id, group_id, title, source_url, image_url, price, priority, item_type, status)
  VALUES
    -- Standard items - claimable
    (v_celebrant_id, v_group_id, 'Sony WH-1000XM5 Headphones', 'https://amazon.com/dp/B09XS7JWHH', 'https://picsum.photos/seed/headphones/400/400', 348.00, 5, 'standard', 'active'),
    (v_celebrant_id, v_group_id, 'Kindle Paperwhite', 'https://amazon.com/dp/B08KTZ8249', 'https://picsum.photos/seed/kindle/400/400', 139.99, 4, 'standard', 'active'),
    (v_celebrant_id, v_group_id, 'Nintendo Switch Game', 'https://amazon.com/dp/B0BFJWCYTL', 'https://picsum.photos/seed/switch/400/400', 59.99, 3, 'standard', 'active'),
    (v_celebrant_id, v_group_id, 'Lego Star Wars Set', 'https://amazon.com/dp/B09FM2WFXL', 'https://picsum.photos/seed/lego/400/400', 159.99, 4, 'standard', 'active'),
    (v_celebrant_id, v_group_id, 'Instant Pot Duo', 'https://amazon.com/dp/B00FLYWNYQ', 'https://picsum.photos/seed/instantpot/400/400', 89.95, 3, 'standard', 'active'),
    (v_celebrant_id, v_group_id, 'Yeti Tumbler 30oz', 'https://amazon.com/dp/B073WJT77K', 'https://picsum.photos/seed/yeti/400/400', 35.00, 2, 'standard', 'active')
  ON CONFLICT DO NOTHING;

  -- Surprise Me item (should NOT have claim button)
  -- Note: Special items must have source_url = NULL per constraint
  INSERT INTO public.wishlist_items (user_id, group_id, title, source_url, image_url, price, priority, item_type, status)
  VALUES
    (v_celebrant_id, v_group_id, 'Surprise Me - Tech Gadget', NULL, 'https://picsum.photos/seed/surprise/400/400', NULL, 3, 'surprise_me', 'active')
  ON CONFLICT DO NOTHING;

  -- Mystery Box items (should NOT have claim button)
  -- Note: Special items must have source_url = NULL per constraint
  INSERT INTO public.wishlist_items (user_id, group_id, title, source_url, image_url, price, priority, item_type, mystery_box_tier, status)
  VALUES
    (v_celebrant_id, v_group_id, 'Mystery Box - $50 Tier', NULL, 'https://picsum.photos/seed/mystery50/400/400', 50.00, 4, 'mystery_box', 50, 'active'),
    (v_celebrant_id, v_group_id, 'Mystery Box - $100 Tier', NULL, 'https://picsum.photos/seed/mystery100/400/400', 100.00, 5, 'mystery_box', 100, 'active')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created wishlist items for celebrant';

  -- ============================================
  -- STEP 5: Create celebration for Carlos
  -- ============================================

  -- Check if celebration already exists
  SELECT id INTO v_celebration_id
  FROM public.celebrations
  WHERE group_id = v_group_id AND celebrant_id = v_celebrant_id AND year = EXTRACT(YEAR FROM CURRENT_DATE);

  IF v_celebration_id IS NOT NULL THEN
    RAISE NOTICE 'Celebration already exists: %', v_celebration_id;
  ELSE
    -- Create celebration with a birthday coming up soon
    INSERT INTO public.celebrations (group_id, celebrant_id, event_date, year, gift_leader_id, status)
    VALUES (
      v_group_id,
      v_celebrant_id,
      CURRENT_DATE + INTERVAL '7 days',  -- Birthday in 7 days
      EXTRACT(YEAR FROM CURRENT_DATE),
      v_manual_tester_id,  -- Manual Tester is gift leader
      'active'
    )
    RETURNING id INTO v_celebration_id;

    RAISE NOTICE 'Created celebration: %', v_celebration_id;

    -- Create chat room for the celebration
    INSERT INTO public.chat_rooms (celebration_id)
    VALUES (v_celebration_id)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created chat room for celebration';
  END IF;

  -- ============================================
  -- SUMMARY
  -- ============================================

  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'TEST DATA SETUP COMPLETE';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Group: Claim Testing Group (id: %)', v_group_id;
  RAISE NOTICE 'Celebrant (birthday person): Carlos (id: %)', v_carlos_id;
  RAISE NOTICE 'Tester (can claim items): Manual Tester (id: %)', v_manual_tester_id;
  RAISE NOTICE '';
  RAISE NOTICE 'TESTING INSTRUCTIONS:';
  RAISE NOTICE '1. Login as Manual Tester';
  RAISE NOTICE '2. Go to Carlos''s celebration page';
  RAISE NOTICE '3. Standard items should show Claim button';
  RAISE NOTICE '4. Surprise Me / Mystery Box items should NOT show Claim button';
  RAISE NOTICE '5. Claim an item and verify it works';
  RAISE NOTICE '6. Login as Carlos (celebrant)';
  RAISE NOTICE '7. Go to My Wishlist - should see taken badges, no claimer names';
  RAISE NOTICE '==========================================';

END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show all users
SELECT id, email, full_name, birthday FROM public.users ORDER BY created_at;

-- Show all groups with member counts
SELECT g.id, g.name, g.mode, COUNT(gm.user_id) as member_count
FROM public.groups g
LEFT JOIN public.group_members gm ON gm.group_id = g.id
GROUP BY g.id, g.name, g.mode;

-- Show wishlist items for test group
SELECT wi.id, wi.title, wi.item_type, wi.price, wi.priority, u.full_name as owner
FROM public.wishlist_items wi
JOIN public.users u ON u.id = wi.user_id
JOIN public.groups g ON g.id = wi.group_id
WHERE g.name = 'Claim Testing Group'
ORDER BY wi.item_type, wi.priority DESC;

-- Show celebrations
SELECT c.id, c.event_date, c.status,
       celebrant.full_name as celebrant,
       leader.full_name as gift_leader,
       g.name as group_name
FROM public.celebrations c
JOIN public.users celebrant ON celebrant.id = c.celebrant_id
LEFT JOIN public.users leader ON leader.id = c.gift_leader_id
JOIN public.groups g ON g.id = c.group_id
ORDER BY c.event_date;
