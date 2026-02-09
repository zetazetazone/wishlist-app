-- Fix Invite Code Join Flow
-- Creates a SECURITY DEFINER function for joining groups by invite code
--
-- Problem: The existing RLS policy "Users can view their groups" only allows SELECT
-- if user is creator or member. This blocks non-members from looking up groups
-- by invite_code, causing "Invalid invite code" errors during join flow.
--
-- Solution: Create a SECURITY DEFINER function that handles the entire join flow:
-- 1. Looks up the group by invite code (bypassing RLS)
-- 2. Checks if user is already a member
-- 3. Adds user as member if not
-- 4. Returns group info for success message
--
-- This is secure because:
-- - Requires authentication
-- - Requires a valid invite code to match
-- - Uses proper error handling

-- ============================================
-- 1. CREATE join_group_by_invite_code() FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.join_group_by_invite_code(p_invite_code TEXT)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  already_member BOOLEAN
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group_id UUID;
  v_group_name TEXT;
  v_is_member BOOLEAN;
BEGIN
  -- Require authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lookup group by invite code (case-insensitive)
  SELECT id, name INTO v_group_id, v_group_name
  FROM public.groups
  WHERE invite_code = UPPER(p_invite_code);

  -- Check if group exists
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Check if already a member
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = v_group_id
      AND group_members.user_id = v_user_id
  ) INTO v_is_member;

  IF v_is_member THEN
    RETURN QUERY SELECT v_group_id, v_group_name, TRUE;
    RETURN;
  END IF;

  -- Add user as member
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'member');

  RETURN QUERY SELECT v_group_id, v_group_name, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.join_group_by_invite_code IS
  'Join a group by invite code - bypasses RLS for join flow, handles membership check and insert atomically';
