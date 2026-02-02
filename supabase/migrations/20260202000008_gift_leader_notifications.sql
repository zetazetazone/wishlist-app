-- Gift Leader Notification Trigger
-- Phase 04-02: Immediate notifications when assigned/reassigned as Gift Leader
-- Ensures Gift Leaders know immediately when they're responsible for coordinating a celebration

-- ============================================
-- FUNCTION: notify_gift_leader_assigned
-- Fires on celebrations INSERT and UPDATE OF gift_leader_id
-- Creates user_notifications for:
--   1. New Gift Leader on INSERT (new celebration)
--   2. New Gift Leader on UPDATE (reassignment)
--   3. Old Gift Leader on UPDATE (relieved)
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_gift_leader_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_celebrant_name TEXT;
  v_celebrant_avatar TEXT;
  v_group_name TEXT;
  v_days_until INTEGER;
  v_formatted_date TEXT;
BEGIN
  -- Only process when gift_leader_id is set
  IF NEW.gift_leader_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only process if gift_leader_id actually changed
  IF TG_OP = 'UPDATE' AND
     OLD.gift_leader_id IS NOT DISTINCT FROM NEW.gift_leader_id THEN
    RETURN NEW;
  END IF;

  -- Get celebrant info from users table (using full_name as display_name)
  SELECT
    COALESCE(u.full_name, u.email) AS name,
    u.avatar_url
  INTO v_celebrant_name, v_celebrant_avatar
  FROM public.users u
  WHERE u.id = NEW.celebrant_id;

  -- Get group name
  SELECT g.name INTO v_group_name
  FROM public.groups g
  WHERE g.id = NEW.group_id;

  -- Calculate days until event
  v_days_until := NEW.event_date - CURRENT_DATE;

  -- Format date for display (e.g., "Feb 15")
  v_formatted_date := TO_CHAR(NEW.event_date, 'Mon DD');

  -- ==========================================
  -- NOTIFY NEW GIFT LEADER
  -- ==========================================
  INSERT INTO public.user_notifications (
    user_id,
    title,
    body,
    data
  ) VALUES (
    NEW.gift_leader_id,
    'You''re the Gift Leader for ' || v_celebrant_name || '!',
    v_group_name || ' - Birthday on ' || v_formatted_date || ' (' || v_days_until || ' days). Tap to view wishlist.',
    jsonb_build_object(
      'type', 'gift_leader_assigned',
      'screen', 'celebration',
      'celebration_id', NEW.id,
      'group_id', NEW.group_id,
      'celebrant_id', NEW.celebrant_id,
      'avatar_url', v_celebrant_avatar
    )
  );

  -- ==========================================
  -- NOTIFY OLD GIFT LEADER (on reassignment only)
  -- ==========================================
  IF TG_OP = 'UPDATE' AND OLD.gift_leader_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      user_id,
      title,
      body,
      data
    ) VALUES (
      OLD.gift_leader_id,
      'Gift Leader role reassigned',
      'You''re no longer Gift Leader for ' || v_celebrant_name || '''s birthday.',
      jsonb_build_object(
        'type', 'gift_leader_relieved',
        'screen', 'celebration',
        'celebration_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER: on_gift_leader_changed
-- Fires after INSERT or UPDATE of gift_leader_id on celebrations
-- ============================================

DROP TRIGGER IF EXISTS on_gift_leader_changed ON public.celebrations;

CREATE TRIGGER on_gift_leader_changed
  AFTER INSERT OR UPDATE OF gift_leader_id ON public.celebrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_gift_leader_assigned();

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Gift Leader notification trigger created!';
  RAISE NOTICE 'Function: notify_gift_leader_assigned()';
  RAISE NOTICE 'Trigger: on_gift_leader_changed (AFTER INSERT OR UPDATE OF gift_leader_id)';
  RAISE NOTICE 'Notifications: New leader on assign, both leaders on reassign';
END $$;
