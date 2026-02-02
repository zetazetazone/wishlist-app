-- Test Data Seed v2 for Gift Leader Testing
-- This version works around the auth.users foreign key constraint
--
-- OPTION A: Create a celebration where YOU (walter) are the celebrant
--           so you can test the celebrant exclusion (you should NOT see chat)
--
-- OPTION B: You need to create real test users through Supabase Auth first
--           Then run the queries below with their actual user IDs

-- ============================================
-- FIRST: Let's see what we have
-- ============================================

-- Check current group and members
SELECT
  g.id as group_id,
  g.name,
  u.id as user_id,
  u.email,
  u.full_name,
  u.birthday,
  gm.role
FROM groups g
JOIN group_members gm ON g.id = gm.group_id
JOIN users u ON gm.user_id = u.id
WHERE g.name = 'borrachos';

-- ============================================
-- OPTION A: Create celebration where YOU are celebrant
-- This lets you test that celebrant CANNOT see chat/contributions
-- ============================================

DO $$
DECLARE
  v_group_id UUID;
  v_walter_id UUID;
  v_celebration_id UUID;
BEGIN
  -- Get borrachos group ID
  SELECT id INTO v_group_id FROM public.groups WHERE name = 'borrachos' LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Group "borrachos" not found!';
  END IF;

  -- Get walter's user ID (the only member/admin)
  SELECT user_id INTO v_walter_id
  FROM public.group_members
  WHERE group_id = v_group_id
  LIMIT 1;

  RAISE NOTICE 'Group ID: %, Walter ID: %', v_group_id, v_walter_id;

  -- Create a celebration where Walter is BOTH celebrant AND gift_leader
  -- (This is a test scenario - normally gift_leader would be someone else)
  -- This tests that walter CANNOT see the chat for his own celebration
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
    v_walter_id,  -- Walter is celebrant (birthday person)
    '2026-02-03'::date,  -- Walter's birthday from screenshot
    2026,
    v_walter_id,  -- Gift leader (would normally be different)
    100.00,
    'upcoming',
    NOW(),
    NOW()
  )
  ON CONFLICT (group_id, celebrant_id, year) DO UPDATE SET
    target_amount = 100.00,
    status = 'upcoming'
  RETURNING id INTO v_celebration_id;

  RAISE NOTICE 'Created/updated celebration: %', v_celebration_id;

  -- Create chat room for the celebration (if not exists)
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

  RAISE NOTICE 'Setup complete! Walter is celebrant - should NOT see chat.';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the celebration was created
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

-- Check chat room exists
SELECT cr.id, c.event_date, u.full_name as celebrant
FROM chat_rooms cr
JOIN celebrations c ON cr.celebration_id = c.id
JOIN users u ON c.celebrant_id = u.id;
