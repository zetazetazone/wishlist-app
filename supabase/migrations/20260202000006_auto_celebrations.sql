-- Auto-Celebration Creation with pg_cron
-- Creates celebrations automatically when birthdays are within 30 days
-- Runs daily at midnight UTC to ensure celebrations exist before users need them

-- ============================================
-- ENABLE PG_CRON EXTENSION
-- Note: pg_cron must be enabled in Supabase Dashboard first
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- HELPER FUNCTION: Get Gift Leader via Birthday Rotation
-- Matches the algorithm in lib/celebrations.ts
-- ============================================

CREATE OR REPLACE FUNCTION public.get_next_gift_leader(
  p_group_id UUID,
  p_celebrant_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_sorted_members UUID[];
  v_celebrant_index INT;
  v_next_index INT;
  v_member_count INT;
BEGIN
  -- Get all group members sorted by birthday (month, day) with user_id tiebreaker
  -- Members without birthdays go to the end
  SELECT ARRAY_AGG(gm.user_id ORDER BY
    CASE WHEN u.birthday IS NULL THEN 1 ELSE 0 END,
    EXTRACT(MONTH FROM u.birthday),
    EXTRACT(DAY FROM u.birthday),
    gm.user_id
  )
  INTO v_sorted_members
  FROM public.group_members gm
  JOIN public.users u ON u.id = gm.user_id
  WHERE gm.group_id = p_group_id;

  v_member_count := array_length(v_sorted_members, 1);

  -- Need at least 2 members
  IF v_member_count < 2 THEN
    RETURN NULL;
  END IF;

  -- Find celebrant's position (1-indexed in PostgreSQL arrays)
  FOR i IN 1..v_member_count LOOP
    IF v_sorted_members[i] = p_celebrant_id THEN
      v_celebrant_index := i;
      EXIT;
    END IF;
  END LOOP;

  -- If celebrant not found, return NULL
  IF v_celebrant_index IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2-person group: other person is always leader
  IF v_member_count = 2 THEN
    IF v_celebrant_index = 1 THEN
      RETURN v_sorted_members[2];
    ELSE
      RETURN v_sorted_members[1];
    END IF;
  END IF;

  -- Next person in rotation (wrap around)
  IF v_celebrant_index = v_member_count THEN
    v_next_index := 1;
  ELSE
    v_next_index := v_celebrant_index + 1;
  END IF;

  RETURN v_sorted_members[v_next_index];
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- MAIN FUNCTION: Create Upcoming Celebrations
-- ============================================

CREATE OR REPLACE FUNCTION public.create_upcoming_celebrations(
  p_planning_window_days INT DEFAULT 30
)
RETURNS TABLE(
  celebration_id UUID,
  group_id UUID,
  celebrant_id UUID,
  event_date DATE,
  gift_leader_id UUID
) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_target_date DATE := CURRENT_DATE + p_planning_window_days;
  v_current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_user RECORD;
  v_group RECORD;
  v_birthday_this_year DATE;
  v_gift_leader UUID;
  v_celebration_id UUID;
  v_chat_room_id UUID;
  v_celebrations_created INT := 0;
BEGIN
  -- Find all users with birthdays in the planning window
  FOR v_user IN
    SELECT u.id AS user_id, u.birthday
    FROM public.users u
    WHERE u.birthday IS NOT NULL
  LOOP
    -- Calculate this year's birthday
    -- Handle Feb 29 in non-leap years (use Feb 28)
    BEGIN
      IF EXTRACT(MONTH FROM v_user.birthday)::INT = 2 AND
         EXTRACT(DAY FROM v_user.birthday)::INT = 29 THEN
        -- Check if current year is leap year
        IF (v_current_year % 4 = 0 AND v_current_year % 100 != 0) OR v_current_year % 400 = 0 THEN
          v_birthday_this_year := MAKE_DATE(v_current_year, 2, 29);
        ELSE
          v_birthday_this_year := MAKE_DATE(v_current_year, 2, 28);
        END IF;
      ELSE
        v_birthday_this_year := MAKE_DATE(
          v_current_year,
          EXTRACT(MONTH FROM v_user.birthday)::INT,
          EXTRACT(DAY FROM v_user.birthday)::INT
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Skip invalid dates
      CONTINUE;
    END;

    -- Check if birthday is within the planning window
    IF v_birthday_this_year >= v_today AND v_birthday_this_year <= v_target_date THEN
      -- For each group this user belongs to
      FOR v_group IN
        SELECT gm.group_id
        FROM public.group_members gm
        WHERE gm.user_id = v_user.user_id
      LOOP
        -- Check if celebration already exists for this year
        IF NOT EXISTS (
          SELECT 1 FROM public.celebrations c
          WHERE c.group_id = v_group.group_id
            AND c.celebrant_id = v_user.user_id
            AND c.year = v_current_year
        ) THEN
          -- Calculate Gift Leader using birthday rotation
          v_gift_leader := public.get_next_gift_leader(v_group.group_id, v_user.user_id);

          -- Create the celebration
          INSERT INTO public.celebrations (
            group_id,
            celebrant_id,
            event_date,
            year,
            gift_leader_id,
            status
          )
          VALUES (
            v_group.group_id,
            v_user.user_id,
            v_birthday_this_year,
            v_current_year,
            v_gift_leader,
            'upcoming'
          )
          RETURNING id INTO v_celebration_id;

          -- Create the chat room for this celebration
          INSERT INTO public.chat_rooms (celebration_id)
          VALUES (v_celebration_id)
          RETURNING id INTO v_chat_room_id;

          -- Record Gift Leader assignment in history (NULL assigned_by = auto-assigned)
          INSERT INTO public.gift_leader_history (
            celebration_id,
            assigned_to,
            assigned_by,
            reason
          )
          VALUES (
            v_celebration_id,
            v_gift_leader,
            NULL,
            'auto_rotation'
          );

          v_celebrations_created := v_celebrations_created + 1;

          -- Return the created celebration
          celebration_id := v_celebration_id;
          group_id := v_group.group_id;
          celebrant_id := v_user.user_id;
          event_date := v_birthday_this_year;
          gift_leader_id := v_gift_leader;
          RETURN NEXT;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Also create chat rooms for any celebrations without one (maintenance)
  INSERT INTO public.chat_rooms (celebration_id)
  SELECT c.id
  FROM public.celebrations c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_rooms cr WHERE cr.celebration_id = c.id
  );

  RAISE NOTICE 'Auto-celebration job complete. Created % celebrations.', v_celebrations_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for manual testing)
GRANT EXECUTE ON FUNCTION public.create_upcoming_celebrations(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_gift_leader(UUID, UUID) TO authenticated;

-- ============================================
-- SCHEDULE THE CRON JOB
-- Runs daily at midnight UTC
-- ============================================

-- Remove existing job if it exists (idempotent)
SELECT cron.unschedule('create-upcoming-celebrations')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'create-upcoming-celebrations'
);

-- Schedule new job
SELECT cron.schedule(
  'create-upcoming-celebrations',  -- job name
  '0 0 * * *',                     -- cron schedule: daily at midnight UTC
  $$SELECT public.create_upcoming_celebrations();$$  -- SQL command
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION public.create_upcoming_celebrations IS
'Automatically creates celebrations for birthdays within the planning window (default 30 days).
Runs daily via pg_cron. For each upcoming birthday in each group:
1. Creates a celebration record
2. Assigns Gift Leader using birthday rotation algorithm
3. Creates the associated chat room
4. Records Gift Leader assignment in history

Edge cases handled:
- Feb 29 birthdays shown on Feb 28 in non-leap years
- Users in multiple groups get celebration per group
- Users without birthdays are skipped
- Existing celebrations are not duplicated';

COMMENT ON FUNCTION public.get_next_gift_leader IS
'Calculate the next Gift Leader using birthday rotation algorithm.
Matches the TypeScript implementation in lib/celebrations.ts.
Sort order: birthday month, birthday day, user_id (tiebreaker).
Members without birthdays sorted to end.';

-- ============================================
-- COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Auto-celebration pg_cron job configured!';
  RAISE NOTICE 'Job: create-upcoming-celebrations';
  RAISE NOTICE 'Schedule: Daily at midnight UTC (0 0 * * *)';
  RAISE NOTICE 'Test manually: SELECT * FROM public.create_upcoming_celebrations();';
END $$;
