-- Fix infinite recursion in friend_requests INSERT policy
-- The original policy had a NOT EXISTS subquery that queried friend_requests,
-- causing RLS recursion when evaluating the INSERT policy.
--
-- Solution: Create a SECURITY DEFINER helper function that bypasses RLS

-- ============================================
-- PART 1: Create helper function to check blocked status
-- Similar pattern to are_friends() - bypasses RLS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_blocked(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Handle NULL inputs
  IF p_user_a IS NULL OR p_user_b IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check for any blocked request between these users (either direction)
  RETURN EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE status = 'blocked'
      AND (
        (from_user_id = p_user_a AND to_user_id = p_user_b)
        OR (from_user_id = p_user_b AND to_user_id = p_user_a)
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_blocked(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.is_blocked IS
  'Check if there is a blocked relationship between two users. SECURITY DEFINER to bypass RLS in policy evaluation.';

-- ============================================
-- PART 2: Drop and recreate the INSERT policy
-- Using the new is_blocked() function instead of inline subquery
-- ============================================

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friend_requests;

CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (
    from_user_id = (SELECT auth.uid())
    AND to_user_id != (SELECT auth.uid())
    -- Block if there's a blocked relationship (uses SECURITY DEFINER function)
    AND NOT public.is_blocked((SELECT auth.uid()), to_user_id)
    -- Block if already friends
    AND NOT public.are_friends((SELECT auth.uid()), to_user_id)
  );

-- ============================================
-- PART 3: Completion notice
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Fixed friend_requests INSERT policy recursion!';
  RAISE NOTICE 'Created is_blocked() SECURITY DEFINER function';
  RAISE NOTICE 'Recreated INSERT policy using helper function';
END $$;
