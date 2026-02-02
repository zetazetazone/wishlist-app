-- Test Data Seed for Gift Leader Testing
-- Run this in Supabase SQL Editor to add mock users to the "borrachos" group
-- This will allow testing of the celebrations and Gift Leader functionality

-- ============================================
-- STEP 1: Find the borrachos group and current user
-- ============================================

-- First, let's identify the group_id and walter's user_id
-- Run this query to see the values:
-- SELECT g.id as group_id, g.name, u.id as user_id, u.email, u.full_name, u.birthday
-- FROM groups g
-- JOIN group_members gm ON g.id = gm.group_id
-- JOIN users u ON gm.user_id = u.id
-- WHERE g.name = 'borrachos';

-- ============================================
-- STEP 2: Create mock users in auth.users (REQUIRED)
-- ============================================

-- Note: You need to create users through auth first.
-- Option A: Use Supabase Dashboard > Authentication > Users > Add User
-- Option B: Use SQL (service role only - won't work in SQL editor)

-- For testing, we'll create users directly in public.users
-- This is a workaround for testing only - normally users come from auth

-- Mock User 1: Maria (birthday in March - before walter's February birthday in rotation)
INSERT INTO public.users (id, email, full_name, birthday, created_at, updated_at)
VALUES (
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'maria.mock@test.com',
  'Maria Garcia',
  '1990-03-15'::date,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  birthday = EXCLUDED.birthday;

-- Mock User 2: Pedro (birthday in July - after walter's February birthday in rotation)
INSERT INTO public.users (id, email, full_name, birthday, created_at, updated_at)
VALUES (
  'b2222222-2222-2222-2222-222222222222'::uuid,
  'pedro.mock@test.com',
  'Pedro Martinez',
  '1985-07-22'::date,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  birthday = EXCLUDED.birthday;

-- ============================================
-- STEP 3: Add mock users to user_profiles (for display names)
-- ============================================

INSERT INTO public.user_profiles (id, email, display_name, birthday, onboarding_completed, created_at, updated_at)
VALUES (
  'a1111111-1111-1111-1111-111111111111'::uuid,
  'maria.mock@test.com',
  'Maria',
  '1990-03-15'::date,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  birthday = EXCLUDED.birthday;

INSERT INTO public.user_profiles (id, email, display_name, birthday, onboarding_completed, created_at, updated_at)
VALUES (
  'b2222222-2222-2222-2222-222222222222'::uuid,
  'pedro.mock@test.com',
  'Pedro',
  '1985-07-22'::date,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  birthday = EXCLUDED.birthday;

-- ============================================
-- STEP 4: Add mock users to borrachos group
-- ============================================

-- Get the borrachos group ID (you'll need to replace this with actual ID)
-- Run: SELECT id FROM groups WHERE name = 'borrachos';

DO $$
DECLARE
  v_group_id UUID;
  v_walter_id UUID;
BEGIN
  -- Get borrachos group ID
  SELECT id INTO v_group_id FROM public.groups WHERE name = 'borrachos' LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Group "borrachos" not found!';
  END IF;

  RAISE NOTICE 'Found borrachos group: %', v_group_id;

  -- Get walter's user ID
  SELECT user_id INTO v_walter_id
  FROM public.group_members
  WHERE group_id = v_group_id
  LIMIT 1;

  RAISE NOTICE 'Found walter user ID: %', v_walter_id;

  -- Add Maria to the group
  INSERT INTO public.group_members (group_id, user_id, role, joined_at)
  VALUES (v_group_id, 'a1111111-1111-1111-1111-111111111111'::uuid, 'member', NOW())
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- Add Pedro to the group
  INSERT INTO public.group_members (group_id, user_id, role, joined_at)
  VALUES (v_group_id, 'b2222222-2222-2222-2222-222222222222'::uuid, 'member', NOW())
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RAISE NOTICE 'Added Maria and Pedro to borrachos group';
END $$;

-- ============================================
-- STEP 5: Create a test celebration
-- This creates a celebration for Pedro where Walter will be Gift Leader
-- (Based on birthday rotation: Walter Feb -> Maria Mar -> Pedro Jul)
-- ============================================

DO $$
DECLARE
  v_group_id UUID;
  v_walter_id UUID;
  v_celebration_id UUID;
BEGIN
  -- Get borrachos group ID
  SELECT id INTO v_group_id FROM public.groups WHERE name = 'borrachos' LIMIT 1;

  -- Get walter's user ID (the admin)
  SELECT user_id INTO v_walter_id
  FROM public.group_members
  WHERE group_id = v_group_id AND role = 'admin'
  LIMIT 1;

  -- Create a celebration for Pedro (celebrant)
  -- Gift Leader should be Walter (next in birthday rotation after Pedro)
  -- Birthday order: Walter (Feb 3) -> Maria (Mar 15) -> Pedro (Jul 22)
  -- So for Pedro's birthday, Gift Leader = Walter
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
    'b2222222-2222-2222-2222-222222222222'::uuid,  -- Pedro is celebrant
    '2026-07-22'::date,  -- Pedro's birthday
    2026,
    v_walter_id,  -- Walter is Gift Leader
    100.00,  -- $100 target
    'upcoming',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_celebration_id;

  RAISE NOTICE 'Created celebration: %', v_celebration_id;

  -- Create chat room for the celebration
  INSERT INTO public.chat_rooms (celebration_id, created_at)
  VALUES (v_celebration_id, NOW());

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
    NULL,  -- Auto-assigned
    'auto_rotation',
    NOW()
  );

  RAISE NOTICE 'Created chat room and gift leader history';
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check group members
SELECT
  g.name as group_name,
  u.full_name,
  u.email,
  u.birthday,
  gm.role
FROM groups g
JOIN group_members gm ON g.id = gm.group_id
JOIN users u ON gm.user_id = u.id
WHERE g.name = 'borrachos'
ORDER BY u.birthday;

-- Check celebrations
SELECT
  c.id,
  c.event_date,
  c.year,
  c.status,
  c.target_amount,
  celebrant.full_name as celebrant_name,
  leader.full_name as gift_leader_name
FROM celebrations c
JOIN users celebrant ON c.celebrant_id = celebrant.id
LEFT JOIN users leader ON c.gift_leader_id = leader.id
JOIN groups g ON c.group_id = g.id
WHERE g.name = 'borrachos';

-- Check chat rooms
SELECT
  cr.id as chat_room_id,
  c.event_date,
  celebrant.full_name as celebrant_name
FROM chat_rooms cr
JOIN celebrations c ON cr.celebration_id = c.id
JOIN users celebrant ON c.celebrant_id = celebrant.id;
