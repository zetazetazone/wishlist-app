-- Seed 15 mock users with random birthdays and add them to santiborzone@gmail.com's groups
-- Run this in Supabase SQL Editor

-- First, clean up any existing mock users from previous runs
DELETE FROM public.group_members WHERE user_id IN (SELECT id FROM public.users WHERE email LIKE '%@example.com');
DELETE FROM public.users WHERE email LIKE '%@example.com';
DELETE FROM auth.users WHERE email LIKE '%@example.com';

DO $$
DECLARE
  target_user_id UUID;
  target_groups UUID[];
  new_user_id UUID;
  group_id UUID;
  mock_users TEXT[][] := ARRAY[
    ARRAY['Emma Rodriguez', 'emma.rodriguez@example.com', '1992-03-15'],
    ARRAY['Liam Chen', 'liam.chen@example.com', '1988-07-22'],
    ARRAY['Sofia Martinez', 'sofia.martinez@example.com', '1995-11-08'],
    ARRAY['Noah Williams', 'noah.williams@example.com', '1990-01-30'],
    ARRAY['Olivia Thompson', 'olivia.thompson@example.com', '1993-05-17'],
    ARRAY['Ethan Garcia', 'ethan.garcia@example.com', '1987-09-03'],
    ARRAY['Isabella Brown', 'isabella.brown@example.com', '1994-12-25'],
    ARRAY['Mason Davis', 'mason.davis@example.com', '1991-04-11'],
    ARRAY['Ava Wilson', 'ava.wilson@example.com', '1989-08-19'],
    ARRAY['Lucas Anderson', 'lucas.anderson@example.com', '1996-02-14'],
    ARRAY['Mia Taylor', 'mia.taylor@example.com', '1992-06-28'],
    ARRAY['James Lee', 'james.lee@example.com', '1988-10-05'],
    ARRAY['Charlotte Moore', 'charlotte.moore@example.com', '1994-03-22'],
    ARRAY['Benjamin Clark', 'benjamin.clark@example.com', '1990-07-09'],
    ARRAY['Amelia White', 'amelia.white@example.com', '1993-11-16']
  ];
  user_data TEXT[];
BEGIN
  -- Find santiborzone@gmail.com's user ID
  SELECT id INTO target_user_id
  FROM public.users
  WHERE email = 'santiborzone@gmail.com';

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User santiborzone@gmail.com not found';
  END IF;

  RAISE NOTICE 'Found target user: %', target_user_id;

  -- Get all groups where the target user is a member
  SELECT ARRAY_AGG(gm.group_id) INTO target_groups
  FROM public.group_members gm
  WHERE gm.user_id = target_user_id;

  IF target_groups IS NULL OR array_length(target_groups, 1) IS NULL THEN
    RAISE EXCEPTION 'User santiborzone@gmail.com is not a member of any groups';
  END IF;

  RAISE NOTICE 'Found % groups', array_length(target_groups, 1);

  -- Create each mock user
  FOREACH user_data SLICE 1 IN ARRAY mock_users
  LOOP
    -- Generate a new UUID for the user
    new_user_id := uuid_generate_v4();

    -- Insert into auth.users (trigger will auto-create public.users entry)
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      user_data[2],
      crypt('password123', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('full_name', user_data[1], 'birthday', user_data[3]),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );

    -- Update public.users to set onboarding_completed (trigger doesn't set this)
    UPDATE public.users
    SET onboarding_completed = TRUE
    WHERE id = new_user_id;

    RAISE NOTICE 'Created user: % (%)', user_data[1], user_data[2];

    -- Add user to all target groups
    FOREACH group_id IN ARRAY target_groups
    LOOP
      INSERT INTO public.group_members (group_id, user_id, role, joined_at)
      VALUES (group_id, new_user_id, 'member', NOW());
    END LOOP;

    RAISE NOTICE 'Added % to % groups', user_data[1], array_length(target_groups, 1);
  END LOOP;

  RAISE NOTICE 'Successfully created 15 mock users and added them to all groups';
END $$;

-- Verify the results
SELECT
  u.full_name,
  u.email,
  u.birthday,
  COUNT(gm.group_id) as groups_joined
FROM public.users u
JOIN public.group_members gm ON gm.user_id = u.id
WHERE u.email LIKE '%@example.com'
GROUP BY u.id, u.full_name, u.email, u.birthday
ORDER BY u.full_name;
