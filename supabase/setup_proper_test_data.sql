-- Proper Test Data Setup for Gift Leader Testing
-- This creates a celebration where:
-- - Test User (testuser@test.com) is the CELEBRANT (birthday person)
-- - Walter (santiborzone@gmail.com) is the GIFT LEADER
-- This allows walter to test all Gift Leader features (chat, contributions, etc.)

-- ============================================
-- STEP 1: First, fix the test user's display name
-- ============================================

-- Update the test user's name in the users table
UPDATE public.users
SET full_name = 'Test User'
WHERE email = 'testuser@test.com';

-- Also ensure user_profiles has display_name
INSERT INTO public.user_profiles (id, email, display_name, onboarding_completed, created_at, updated_at)
SELECT
  id,
  email,
  'Test User',
  true,
  NOW(),
  NOW()
FROM public.users
WHERE email = 'testuser@test.com'
ON CONFLICT (id) DO UPDATE SET
  display_name = 'Test User',
  onboarding_completed = true,
  updated_at = NOW();

-- ============================================
-- STEP 2: Create/Update the celebration
-- Make test user the celebrant, walter the gift leader
-- ============================================

DO $$
DECLARE
  v_group_id UUID;
  v_walter_id UUID;
  v_test_user_id UUID;
  v_celebration_id UUID;
BEGIN
  -- Get borrachos group ID
  SELECT id INTO v_group_id FROM public.groups WHERE name = 'borrachos' LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Group "borrachos" not found!';
  END IF;

  -- Get walter's user ID (admin)
  SELECT u.id INTO v_walter_id
  FROM public.users u
  WHERE u.email = 'santiborzone@gmail.com';

  IF v_walter_id IS NULL THEN
    RAISE EXCEPTION 'Walter (santiborzone@gmail.com) not found!';
  END IF;

  -- Get test user's ID
  SELECT u.id INTO v_test_user_id
  FROM public.users u
  WHERE u.email = 'testuser@test.com';

  IF v_test_user_id IS NULL THEN
    RAISE EXCEPTION 'Test user (testuser@test.com) not found! Create through Supabase Auth first.';
  END IF;

  RAISE NOTICE 'Group ID: %', v_group_id;
  RAISE NOTICE 'Walter ID: %', v_walter_id;
  RAISE NOTICE 'Test User ID: %', v_test_user_id;

  -- Delete any existing celebration for test user in 2026 (to start fresh)
  DELETE FROM public.celebrations
  WHERE group_id = v_group_id
    AND celebrant_id = v_test_user_id
    AND year = 2026;

  -- Create a celebration where Test User is celebrant, Walter is gift leader
  INSERT INTO public.celebrations (
    group_id,
    celebrant_id,
    event_date,
    year,
    gift_leader_id,
    target_amount,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_group_id,
    v_test_user_id,  -- TEST USER is celebrant (birthday person)
    '2026-06-15'::date,  -- June 15 birthday
    2026,
    v_walter_id,  -- WALTER is gift leader (can see chat/contributions)
    100.00,
    'upcoming',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_celebration_id;

  RAISE NOTICE 'Created celebration: %', v_celebration_id;

  -- Create chat room for the celebration
  INSERT INTO public.chat_rooms (celebration_id, created_at)
  VALUES (v_celebration_id, NOW())
  ON CONFLICT (celebration_id) DO NOTHING;

  -- Record gift leader history
  INSERT INTO public.gift_leader_history (
    celebration_id,
    assigned_to,
    assigned_by,
    reason,
    created_at
  )
  VALUES (
    v_celebration_id,
    v_walter_id,
    NULL,
    'auto_rotation',
    NOW()
  );

  RAISE NOTICE '✅ Setup complete!';
  RAISE NOTICE '   - Test User is the CELEBRANT (birthday person) - should NOT see chat';
  RAISE NOTICE '   - Walter is the GIFT LEADER - should see everything and can coordinate';
END $$;

-- ============================================
-- STEP 3: Verification queries
-- ============================================

-- Show all celebrations
SELECT
  c.id,
  c.event_date,
  c.year,
  c.status,
  c.target_amount,
  celebrant.email as celebrant_email,
  COALESCE(celebrant_p.display_name, celebrant.full_name) as celebrant_name,
  leader.email as gift_leader_email,
  COALESCE(leader_p.display_name, leader.full_name) as gift_leader_name
FROM public.celebrations c
JOIN public.users celebrant ON c.celebrant_id = celebrant.id
LEFT JOIN public.user_profiles celebrant_p ON celebrant.id = celebrant_p.id
LEFT JOIN public.users leader ON c.gift_leader_id = leader.id
LEFT JOIN public.user_profiles leader_p ON leader.id = leader_p.id
JOIN public.groups g ON c.group_id = g.id
WHERE g.name = 'borrachos';

-- Show group members
SELECT
  u.email,
  COALESCE(up.display_name, u.full_name) as name,
  gm.role
FROM public.group_members gm
JOIN public.users u ON gm.user_id = u.id
LEFT JOIN public.user_profiles up ON u.id = up.id
JOIN public.groups g ON gm.group_id = g.id
WHERE g.name = 'borrachos';
