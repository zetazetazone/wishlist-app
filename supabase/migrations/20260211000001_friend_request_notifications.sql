-- Friend Request Notification Triggers
-- Phase 25-01: Push notifications for friend request lifecycle events
-- Ensures users are notified when they receive a friend request or when their request is accepted

-- ============================================
-- FUNCTION: notify_friend_request_sent
-- Fires on friend_requests INSERT when status='pending'
-- Creates user_notification for:
--   - The receiver (to_user_id) gets notified of incoming request
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_friend_request_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sender_name TEXT;
  v_sender_avatar TEXT;
BEGIN
  -- Only process pending requests (new friend requests)
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get sender info from users table joined with user_profiles
  SELECT
    COALESCE(u.full_name, up.display_name, u.email) AS name,
    COALESCE(up.avatar_url, u.avatar_url) AS avatar
  INTO v_sender_name, v_sender_avatar
  FROM public.users u
  LEFT JOIN public.user_profiles up ON up.id = u.id
  WHERE u.id = NEW.from_user_id;

  -- Insert notification for the receiver
  INSERT INTO public.user_notifications (
    user_id,
    title,
    body,
    data
  ) VALUES (
    NEW.to_user_id,
    v_sender_name || ' sent you a friend request',
    'Tap to view and respond',
    jsonb_build_object(
      'type', 'friend_request_received',
      'screen', 'requests',
      'request_id', NEW.id,
      'from_user_id', NEW.from_user_id,
      'avatar_url', v_sender_avatar
    )
  );

  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER: on_friend_request_sent
-- Fires after INSERT on friend_requests for pending requests
-- ============================================

DROP TRIGGER IF EXISTS on_friend_request_sent ON public.friend_requests;

CREATE TRIGGER on_friend_request_sent
  AFTER INSERT ON public.friend_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_friend_request_sent();

-- ============================================
-- FUNCTION: notify_friend_request_accepted
-- Fires on friend_requests UPDATE when status changes from 'pending' to 'accepted'
-- Creates user_notification for:
--   - The original sender (from_user_id) gets notified their request was accepted
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_friend_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_accepter_name TEXT;
  v_accepter_avatar TEXT;
BEGIN
  -- Only process when status changes from pending to accepted
  IF OLD.status <> 'pending' OR NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Get accepter info from users table joined with user_profiles
  -- The accepter is the to_user_id (the one who received and accepted the request)
  SELECT
    COALESCE(u.full_name, up.display_name, u.email) AS name,
    COALESCE(up.avatar_url, u.avatar_url) AS avatar
  INTO v_accepter_name, v_accepter_avatar
  FROM public.users u
  LEFT JOIN public.user_profiles up ON up.id = u.id
  WHERE u.id = NEW.to_user_id;

  -- Insert notification for the original sender
  INSERT INTO public.user_notifications (
    user_id,
    title,
    body,
    data
  ) VALUES (
    NEW.from_user_id,
    v_accepter_name || ' accepted your friend request!',
    'You are now friends. Tap to view their profile.',
    jsonb_build_object(
      'type', 'friend_request_accepted',
      'screen', 'member',
      'friend_user_id', NEW.to_user_id,
      'avatar_url', v_accepter_avatar
    )
  );

  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER: on_friend_request_accepted
-- Fires after UPDATE on friend_requests when status changes to accepted
-- ============================================

DROP TRIGGER IF EXISTS on_friend_request_accepted ON public.friend_requests;

CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON public.friend_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'accepted')
  EXECUTE FUNCTION public.notify_friend_request_accepted();

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Friend request notification triggers created!';
  RAISE NOTICE 'Function: notify_friend_request_sent() - notifies receiver of new request';
  RAISE NOTICE 'Trigger: on_friend_request_sent (AFTER INSERT when status=pending)';
  RAISE NOTICE 'Function: notify_friend_request_accepted() - notifies sender when accepted';
  RAISE NOTICE 'Trigger: on_friend_request_accepted (AFTER UPDATE pending->accepted)';
END $$;
