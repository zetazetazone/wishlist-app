-- Birthday Reminder Gap Closure
-- Phase 04: Closes verification gaps identified in 04-VERIFICATION.md
--
-- Gap 1: Same-day birthdays within a group now produce single batched notification
--        Uses array_agg to collect celebration IDs and celebrant names
--
-- Gap 2: New members receive explicit catch-up reminders for missed reminder types
--        Adds 'catch_up' reminder type with differentiated content

-- ============================================
-- 1. ADD 'catch_up' TO REMINDER_TYPE CONSTRAINT
-- ============================================

ALTER TABLE public.reminder_sent
DROP CONSTRAINT IF EXISTS reminder_sent_reminder_type_check;

ALTER TABLE public.reminder_sent
ADD CONSTRAINT reminder_sent_reminder_type_check
CHECK (
  reminder_type IN (
    '4w', '2w', '1w', 'day_of', 'happy_birthday',
    'gift_leader_initial', 'gift_leader_1w', 'catch_up'
  )
);

COMMENT ON COLUMN public.reminder_sent.reminder_type IS
'Reminder type: 4w/2w/1w/day_of for countdowns, happy_birthday for celebrant,
gift_leader_initial/gift_leader_1w for Gift Leaders, catch_up for late joiners.';

-- ============================================
-- 2. REPLACE PROCESS_BIRTHDAY_REMINDERS WITH BATCHING + CATCH-UP
-- ============================================

CREATE OR REPLACE FUNCTION public.process_birthday_reminders()
RETURNS TABLE(
  notification_count INT,
  batch_count INT
) AS $$
DECLARE
  v_user RECORD;
  v_batch RECORD;
  v_celebration RECORD;
  v_days_until INT;
  v_reminder_type TEXT;
  v_notification_id UUID;
  v_notification_count INT := 0;
  v_batch_count INT := 0;
  v_group_name TEXT;
  v_celebrant_name TEXT;
  v_contributed NUMERIC;
  v_goal NUMERIC;
  v_contributor_count INT;
  v_celebration_ids UUID[];
  v_celebrant_names TEXT[];
  v_batch_title TEXT;
  v_batch_body TEXT;
  v_first_avatar_url TEXT;
  v_days_member_missed INT;
  v_missed_types TEXT[];
  v_catch_up_needed BOOLEAN;
BEGIN
  -- Process users whose local time is 9:00 AM (within 15-minute window)
  -- Using AT TIME ZONE for DST-safe timezone conversion
  FOR v_user IN
    SELECT u.id AS user_id, u.timezone
    FROM public.users u
    WHERE u.timezone IS NOT NULL
      AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE u.timezone)) = 9
      AND EXTRACT(MINUTE FROM (NOW() AT TIME ZONE u.timezone)) < 15
  LOOP

    -- ============================================
    -- PHASE 1: HANDLE CELEBRANT HAPPY BIRTHDAY (not batched)
    -- ============================================
    FOR v_celebration IN
      SELECT
        c.id AS celebration_id,
        c.group_id,
        c.celebrant_id,
        c.event_date,
        g.name AS group_name,
        celebrant.full_name AS celebrant_name,
        celebrant.avatar_url AS celebrant_avatar,
        (c.event_date - CURRENT_DATE)::INT AS days_until
      FROM public.celebrations c
      JOIN public.groups g ON g.id = c.group_id
      JOIN public.users celebrant ON celebrant.id = c.celebrant_id
      WHERE c.status IN ('upcoming', 'active')
        AND (c.event_date - CURRENT_DATE) = 0  -- Day of only
        AND c.celebrant_id = v_user.user_id    -- User is the celebrant
    LOOP
      -- Check if already sent
      IF NOT EXISTS (
        SELECT 1 FROM public.reminder_sent rs
        WHERE rs.celebration_id = v_celebration.celebration_id
          AND rs.user_id = v_user.user_id
          AND rs.reminder_type = 'happy_birthday'
      ) THEN
        -- Insert celebrant's happy birthday notification
        INSERT INTO public.user_notifications (user_id, title, body, data)
        VALUES (
          v_user.user_id,
          'Happy Birthday!',
          'Your group is celebrating you today. Check your gifts!',
          jsonb_build_object(
            'type', 'birthday_reminder',
            'screen', 'celebration',
            'celebration_id', v_celebration.celebration_id,
            'group_id', v_celebration.group_id,
            'avatar_url', v_celebration.celebrant_avatar,
            'reminder_type', 'happy_birthday'
          )
        );

        -- Record in reminder_sent
        INSERT INTO public.reminder_sent (celebration_id, user_id, reminder_type)
        VALUES (v_celebration.celebration_id, v_user.user_id, 'happy_birthday')
        ON CONFLICT DO NOTHING;

        v_notification_count := v_notification_count + 1;
      END IF;
    END LOOP;

    -- ============================================
    -- PHASE 2: HANDLE GIFT LEADER 1-WEEK NUDGE (not batched)
    -- ============================================
    FOR v_celebration IN
      SELECT
        c.id AS celebration_id,
        c.group_id,
        c.celebrant_id,
        c.gift_leader_id,
        c.target_amount,
        c.event_date,
        g.name AS group_name,
        celebrant.full_name AS celebrant_name,
        celebrant.avatar_url AS celebrant_avatar,
        (c.event_date - CURRENT_DATE)::INT AS days_until
      FROM public.celebrations c
      JOIN public.groups g ON g.id = c.group_id
      JOIN public.users celebrant ON celebrant.id = c.celebrant_id
      WHERE c.status IN ('upcoming', 'active')
        AND (c.event_date - CURRENT_DATE) = 7  -- 1 week out
        AND c.gift_leader_id = v_user.user_id  -- User is Gift Leader
    LOOP
      -- Check if not already sent
      IF NOT EXISTS (
        SELECT 1 FROM public.reminder_sent rs
        WHERE rs.celebration_id = v_celebration.celebration_id
          AND rs.user_id = v_user.user_id
          AND rs.reminder_type = 'gift_leader_1w'
      ) THEN
        -- Get contribution progress
        SELECT
          COALESCE(SUM(cc.amount), 0),
          COUNT(DISTINCT cc.user_id)
        INTO v_contributed, v_contributor_count
        FROM public.celebration_contributions cc
        WHERE cc.celebration_id = v_celebration.celebration_id;

        v_goal := COALESCE(v_celebration.target_amount, 0);

        INSERT INTO public.user_notifications (user_id, title, body, data)
        VALUES (
          v_user.user_id,
          '1 week left - have you collected contributions?',
          format('%s''s birthday is in 7 days. $%s of $%s collected from %s people.',
            v_celebration.celebrant_name,
            v_contributed::TEXT,
            v_goal::TEXT,
            v_contributor_count::TEXT
          ),
          jsonb_build_object(
            'type', 'gift_leader_nudge',
            'screen', 'celebration',
            'celebration_id', v_celebration.celebration_id,
            'group_id', v_celebration.group_id,
            'avatar_url', v_celebration.celebrant_avatar,
            'reminder_type', 'gift_leader_1w',
            'contributed', v_contributed,
            'goal', v_goal,
            'contributor_count', v_contributor_count
          )
        );

        -- Record in reminder_sent
        INSERT INTO public.reminder_sent (celebration_id, user_id, reminder_type)
        VALUES (v_celebration.celebration_id, v_user.user_id, 'gift_leader_1w')
        ON CONFLICT DO NOTHING;

        v_notification_count := v_notification_count + 1;
      END IF;
    END LOOP;

    -- ============================================
    -- PHASE 3: NEW MEMBER CATCH-UP REMINDERS
    -- Send consolidated catch-up for users who joined mid-window
    -- ============================================
    FOR v_celebration IN
      SELECT
        c.id AS celebration_id,
        c.group_id,
        c.celebrant_id,
        c.event_date,
        g.name AS group_name,
        celebrant.full_name AS celebrant_name,
        celebrant.avatar_url AS celebrant_avatar,
        gm.joined_at AS member_joined_at,
        (c.event_date - CURRENT_DATE)::INT AS days_until,
        (c.event_date - gm.joined_at::DATE)::INT AS days_member_before_event
      FROM public.celebrations c
      JOIN public.groups g ON g.id = c.group_id
      JOIN public.users celebrant ON celebrant.id = c.celebrant_id
      JOIN public.group_members gm ON gm.group_id = c.group_id AND gm.user_id = v_user.user_id
      WHERE c.status IN ('upcoming', 'active')
        AND (c.event_date - CURRENT_DATE) BETWEEN 0 AND 28
        AND c.celebrant_id != v_user.user_id  -- Not the celebrant
        -- User joined after the 28-day window started
        AND gm.joined_at::DATE > (c.event_date - INTERVAL '28 days')::DATE
        -- Not muted
        AND NOT EXISTS (
          SELECT 1 FROM public.user_group_preferences ugp
          WHERE ugp.user_id = v_user.user_id
            AND ugp.group_id = c.group_id
            AND ugp.mute_reminders = TRUE
        )
        -- Catch-up not already sent
        AND NOT EXISTS (
          SELECT 1 FROM public.reminder_sent rs
          WHERE rs.celebration_id = c.id
            AND rs.user_id = v_user.user_id
            AND rs.reminder_type = 'catch_up'
        )
        -- Only send catch-up if joined within last 15 minutes (same window as cron)
        -- This prevents sending catch-up on subsequent runs
        AND gm.joined_at >= (NOW() - INTERVAL '15 minutes')
    LOOP
      v_days_until := v_celebration.days_until;

      -- Determine which reminder types were missed
      v_missed_types := ARRAY[]::TEXT[];

      -- If user joined after 4w window (28 days before)
      IF v_celebration.days_member_before_event < 28 AND v_celebration.days_until < 28 THEN
        v_missed_types := array_append(v_missed_types, '4-week');
      END IF;

      -- If user joined after 2w window (14 days before)
      IF v_celebration.days_member_before_event < 14 AND v_celebration.days_until < 14 THEN
        v_missed_types := array_append(v_missed_types, '2-week');
      END IF;

      -- If user joined after 1w window (7 days before)
      IF v_celebration.days_member_before_event < 7 AND v_celebration.days_until < 7 THEN
        v_missed_types := array_append(v_missed_types, '1-week');
      END IF;

      -- Only send catch-up if they actually missed at least one reminder type
      IF array_length(v_missed_types, 1) > 0 THEN
        INSERT INTO public.user_notifications (user_id, title, body, data)
        VALUES (
          v_user.user_id,
          format('Heads up: %s''s birthday in %s days!', v_celebration.celebrant_name, v_days_until),
          format('You missed earlier reminders (%s). %s''s birthday is %s.',
            array_to_string(v_missed_types, ', '),
            v_celebration.celebrant_name,
            to_char(v_celebration.event_date, 'Month DD')
          ),
          jsonb_build_object(
            'type', 'birthday_reminder',
            'screen', 'celebration',
            'celebration_id', v_celebration.celebration_id,
            'group_id', v_celebration.group_id,
            'avatar_url', v_celebration.celebrant_avatar,
            'reminder_type', 'catch_up',
            'missed_types', v_missed_types
          )
        );

        -- Record catch-up as sent
        INSERT INTO public.reminder_sent (celebration_id, user_id, reminder_type)
        VALUES (v_celebration.celebration_id, v_user.user_id, 'catch_up')
        ON CONFLICT DO NOTHING;

        v_notification_count := v_notification_count + 1;
      END IF;
    END LOOP;

    -- ============================================
    -- PHASE 4: BATCHED BIRTHDAY REMINDERS (main logic)
    -- Group same-day celebrations per group into single notification
    -- ============================================

    -- Loop through batched groups: (group_id, event_date, reminder_type)
    FOR v_batch IN
      SELECT
        c.group_id,
        c.event_date,
        g.name AS group_name,
        CASE
          WHEN (c.event_date - CURRENT_DATE)::INT = 0 THEN 'day_of'
          WHEN (c.event_date - CURRENT_DATE)::INT BETWEEN 1 AND 7 THEN '1w'
          WHEN (c.event_date - CURRENT_DATE)::INT BETWEEN 8 AND 14 THEN '2w'
          WHEN (c.event_date - CURRENT_DATE)::INT BETWEEN 15 AND 28 THEN '4w'
        END AS reminder_type,
        (c.event_date - CURRENT_DATE)::INT AS days_until,
        array_agg(c.id) AS celebration_ids,
        array_agg(celebrant.full_name) AS celebrant_names,
        (array_agg(celebrant.avatar_url))[1] AS first_avatar_url,
        (array_agg(c.target_amount))[1] AS first_target_amount
      FROM public.celebrations c
      JOIN public.groups g ON g.id = c.group_id
      JOIN public.users celebrant ON celebrant.id = c.celebrant_id
      JOIN public.group_members gm ON gm.group_id = c.group_id AND gm.user_id = v_user.user_id
      WHERE c.status IN ('upcoming', 'active')
        AND (c.event_date - CURRENT_DATE) BETWEEN 0 AND 28
        AND c.celebrant_id != v_user.user_id  -- Exclude celebrant from countdown
        -- Skip if user has muted this group
        AND NOT EXISTS (
          SELECT 1 FROM public.user_group_preferences ugp
          WHERE ugp.user_id = v_user.user_id
            AND ugp.group_id = c.group_id
            AND ugp.mute_reminders = TRUE
        )
        -- Only include if NOT already sent
        AND NOT EXISTS (
          SELECT 1 FROM public.reminder_sent rs
          WHERE rs.celebration_id = c.id
            AND rs.user_id = v_user.user_id
            AND rs.reminder_type = CASE
              WHEN (c.event_date - CURRENT_DATE)::INT = 0 THEN 'day_of'
              WHEN (c.event_date - CURRENT_DATE)::INT BETWEEN 1 AND 7 THEN '1w'
              WHEN (c.event_date - CURRENT_DATE)::INT BETWEEN 8 AND 14 THEN '2w'
              WHEN (c.event_date - CURRENT_DATE)::INT BETWEEN 15 AND 28 THEN '4w'
            END
        )
        -- Exclude new members (handled in catch-up phase)
        AND gm.joined_at::DATE <= (c.event_date - INTERVAL '28 days')::DATE
      GROUP BY c.group_id, c.event_date, g.name
      HAVING COUNT(*) > 0
      ORDER BY c.event_date, c.group_id
    LOOP
      v_celebration_ids := v_batch.celebration_ids;
      v_celebrant_names := v_batch.celebrant_names;
      v_reminder_type := v_batch.reminder_type;
      v_days_until := v_batch.days_until;
      v_first_avatar_url := v_batch.first_avatar_url;

      -- Skip if outside reminder window (safety check)
      IF v_reminder_type IS NULL THEN
        CONTINUE;
      END IF;

      -- Format notification based on batch size
      IF array_length(v_celebrant_names, 1) = 1 THEN
        -- Single person: standard format
        v_batch_title := CASE v_reminder_type
          WHEN '4w' THEN format('%s''s birthday in 4 weeks!', v_celebrant_names[1])
          WHEN '2w' THEN format('%s''s birthday in 2 weeks!', v_celebrant_names[1])
          WHEN '1w' THEN format('1 week until %s''s birthday!', v_celebrant_names[1])
          WHEN 'day_of' THEN format('It''s %s''s birthday today!', v_celebrant_names[1])
        END;

        -- Get contribution progress for single celebration
        SELECT
          COALESCE(SUM(cc.amount), 0),
          COUNT(DISTINCT cc.user_id)
        INTO v_contributed, v_contributor_count
        FROM public.celebration_contributions cc
        WHERE cc.celebration_id = v_celebration_ids[1];

        v_goal := COALESCE(v_batch.first_target_amount, 0);

        v_batch_body := CASE v_reminder_type
          WHEN '4w' THEN format('Start planning in %s!', v_batch.group_name)
          WHEN '2w' THEN format('$%s of $%s collected in %s.', v_contributed::TEXT, v_goal::TEXT, v_batch.group_name)
          WHEN '1w' THEN format('$%s of $%s collected. Tap to contribute!', v_contributed::TEXT, v_goal::TEXT)
          WHEN 'day_of' THEN 'Tap to celebrate.'
        END;

      ELSIF array_length(v_celebrant_names, 1) = 2 THEN
        -- Two people: "Alice and Bob's birthdays in X weeks!"
        v_batch_title := CASE v_reminder_type
          WHEN '4w' THEN format('%s and %s''s birthdays in 4 weeks!', v_celebrant_names[1], v_celebrant_names[2])
          WHEN '2w' THEN format('%s and %s''s birthdays in 2 weeks!', v_celebrant_names[1], v_celebrant_names[2])
          WHEN '1w' THEN format('1 week until %s and %s''s birthdays!', v_celebrant_names[1], v_celebrant_names[2])
          WHEN 'day_of' THEN format('It''s %s and %s''s birthdays today!', v_celebrant_names[1], v_celebrant_names[2])
        END;

        v_batch_body := format('Double celebration in %s!', v_batch.group_name);

      ELSE
        -- 3+ people: "3 birthdays in Family in 2 weeks!"
        v_batch_title := CASE v_reminder_type
          WHEN '4w' THEN format('%s birthdays in %s in 4 weeks!', array_length(v_celebrant_names, 1), v_batch.group_name)
          WHEN '2w' THEN format('%s birthdays in %s in 2 weeks!', array_length(v_celebrant_names, 1), v_batch.group_name)
          WHEN '1w' THEN format('%s birthdays in %s in 1 week!', array_length(v_celebrant_names, 1), v_batch.group_name)
          WHEN 'day_of' THEN format('%s birthdays in %s today!', array_length(v_celebrant_names, 1), v_batch.group_name)
        END;

        v_batch_body := format('%s: Tap to see all celebrations.', array_to_string(v_celebrant_names, ', '));
      END IF;

      -- Insert the batched notification
      INSERT INTO public.user_notifications (user_id, title, body, data)
      VALUES (
        v_user.user_id,
        v_batch_title,
        v_batch_body,
        jsonb_build_object(
          'type', 'birthday_reminder',
          'screen', CASE
            WHEN array_length(v_celebration_ids, 1) = 1 THEN 'celebration'
            ELSE 'group'  -- Navigate to group if multiple celebrations
          END,
          'celebration_id', v_celebration_ids[1],  -- First celebration for deep link
          'celebration_ids', to_jsonb(v_celebration_ids),  -- All celebration IDs
          'group_id', v_batch.group_id,
          'avatar_url', v_first_avatar_url,
          'reminder_type', v_reminder_type,
          'batch_count', array_length(v_celebration_ids, 1)
        )
      );

      v_notification_count := v_notification_count + 1;

      -- Track as batched if multiple celebrations
      IF array_length(v_celebration_ids, 1) > 1 THEN
        v_batch_count := v_batch_count + 1;
      END IF;

      -- Record in reminder_sent for EACH celebration in the batch (prevents duplicates)
      FOR i IN 1..array_length(v_celebration_ids, 1) LOOP
        INSERT INTO public.reminder_sent (celebration_id, user_id, reminder_type)
        VALUES (v_celebration_ids[i], v_user.user_id, v_reminder_type)
        ON CONFLICT DO NOTHING;
      END LOOP;

    END LOOP; -- batched reminders loop

    -- ============================================
    -- PHASE 5: REGULAR REMINDERS FOR NEW MEMBERS (non-catch-up)
    -- Handle members who joined within the 28-day window but already
    -- received catch-up - they should get subsequent normal reminders
    -- ============================================
    FOR v_celebration IN
      SELECT
        c.id AS celebration_id,
        c.group_id,
        c.celebrant_id,
        c.target_amount,
        c.event_date,
        g.name AS group_name,
        celebrant.full_name AS celebrant_name,
        celebrant.avatar_url AS celebrant_avatar,
        gm.joined_at AS member_joined_at,
        (c.event_date - CURRENT_DATE)::INT AS days_until,
        CASE
          WHEN (c.event_date - CURRENT_DATE)::INT = 0 THEN 'day_of'
          WHEN (c.event_date - CURRENT_DATE)::INT BETWEEN 1 AND 7 THEN '1w'
          WHEN (c.event_date - CURRENT_DATE)::INT BETWEEN 8 AND 14 THEN '2w'
          WHEN (c.event_date - CURRENT_DATE)::INT BETWEEN 15 AND 28 THEN '4w'
        END AS reminder_type
      FROM public.celebrations c
      JOIN public.groups g ON g.id = c.group_id
      JOIN public.users celebrant ON celebrant.id = c.celebrant_id
      JOIN public.group_members gm ON gm.group_id = c.group_id AND gm.user_id = v_user.user_id
      WHERE c.status IN ('upcoming', 'active')
        AND (c.event_date - CURRENT_DATE) BETWEEN 0 AND 28
        AND c.celebrant_id != v_user.user_id  -- Not the celebrant
        -- User joined after the 28-day window started (new member)
        AND gm.joined_at::DATE > (c.event_date - INTERVAL '28 days')::DATE
        -- Not muted
        AND NOT EXISTS (
          SELECT 1 FROM public.user_group_preferences ugp
          WHERE ugp.user_id = v_user.user_id
            AND ugp.group_id = c.group_id
            AND ugp.mute_reminders = TRUE
        )
        -- Has received catch-up already (not a fresh join)
        AND EXISTS (
          SELECT 1 FROM public.reminder_sent rs
          WHERE rs.celebration_id = c.id
            AND rs.user_id = v_user.user_id
            AND rs.reminder_type = 'catch_up'
        )
    LOOP
      v_reminder_type := v_celebration.reminder_type;

      -- Skip if outside window or already sent
      IF v_reminder_type IS NULL THEN
        CONTINUE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.reminder_sent rs
        WHERE rs.celebration_id = v_celebration.celebration_id
          AND rs.user_id = v_user.user_id
          AND rs.reminder_type = v_reminder_type
      ) THEN
        CONTINUE;
      END IF;

      -- Get contribution progress
      SELECT
        COALESCE(SUM(cc.amount), 0),
        COUNT(DISTINCT cc.user_id)
      INTO v_contributed, v_contributor_count
      FROM public.celebration_contributions cc
      WHERE cc.celebration_id = v_celebration.celebration_id;

      v_goal := COALESCE(v_celebration.target_amount, 0);

      -- Insert standard reminder
      INSERT INTO public.user_notifications (user_id, title, body, data)
      VALUES (
        v_user.user_id,
        CASE v_reminder_type
          WHEN '4w' THEN format('%s''s birthday in 4 weeks!', v_celebration.celebrant_name)
          WHEN '2w' THEN format('%s''s birthday in 2 weeks!', v_celebration.celebrant_name)
          WHEN '1w' THEN format('1 week until %s''s birthday!', v_celebration.celebrant_name)
          WHEN 'day_of' THEN format('It''s %s''s birthday today!', v_celebration.celebrant_name)
        END,
        CASE v_reminder_type
          WHEN '4w' THEN format('Start planning in %s!', v_celebration.group_name)
          WHEN '2w' THEN format('$%s of $%s collected in %s.', v_contributed::TEXT, v_goal::TEXT, v_celebration.group_name)
          WHEN '1w' THEN format('$%s of $%s collected. Tap to contribute!', v_contributed::TEXT, v_goal::TEXT)
          WHEN 'day_of' THEN 'Tap to celebrate.'
        END,
        jsonb_build_object(
          'type', 'birthday_reminder',
          'screen', 'celebration',
          'celebration_id', v_celebration.celebration_id,
          'group_id', v_celebration.group_id,
          'avatar_url', v_celebration.celebrant_avatar,
          'reminder_type', v_reminder_type,
          'contributed', v_contributed,
          'goal', v_goal
        )
      );

      -- Record in reminder_sent
      INSERT INTO public.reminder_sent (celebration_id, user_id, reminder_type)
      VALUES (v_celebration.celebration_id, v_user.user_id, v_reminder_type)
      ON CONFLICT DO NOTHING;

      v_notification_count := v_notification_count + 1;

    END LOOP; -- new member regular reminders loop

  END LOOP; -- users loop

  notification_count := v_notification_count;
  batch_count := v_batch_count;
  RETURN NEXT;

  RAISE NOTICE 'Birthday reminder job complete. Sent % notifications (% batched).', v_notification_count, v_batch_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.process_birthday_reminders() TO authenticated;

COMMENT ON FUNCTION public.process_birthday_reminders IS
'Processes birthday reminders for users at their local 9:00 AM.
Runs every 15 minutes via pg_cron.

Enhanced in gap closure migration (20260202000009):
- Same-day batching: Multiple celebrations on same day in same group = single notification
- Catch-up reminders: New members who missed earlier reminders get explicit catch-up

Reminder types:
- 4w: 4 weeks before birthday
- 2w: 2 weeks before birthday
- 1w: 1 week before birthday
- day_of: On the birthday (non-celebrant)
- happy_birthday: On the birthday (celebrant only)
- gift_leader_1w: 1 week nudge for Gift Leader with progress
- catch_up: Consolidated reminder for new members who missed earlier types

Features:
- Celebrant exclusion: No countdown reminders for birthday person
- Group muting: Respects user_group_preferences.mute_reminders
- Duplicate prevention: Uses reminder_sent with UNIQUE constraint
- Same-day batching: array_agg groups celebrations per (group, date, reminder_type)
- New member catch-up: Late joiners get explicit catch-up with missed types listed
- Gift Leader nudge: Special reminder with contribution progress at 1 week

Deep linking data includes celebration_id, celebration_ids (for batched),
group_id, avatar_url for navigation.';

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Birthday reminder gap closure complete!';
  RAISE NOTICE 'Gap 1: Same-day batching implemented with array_agg';
  RAISE NOTICE 'Gap 2: Catch-up reminders implemented with explicit missed types';
  RAISE NOTICE 'New reminder_type: catch_up added to constraint';
  RAISE NOTICE 'Test manually: SELECT * FROM public.process_birthday_reminders();';
END $$;
