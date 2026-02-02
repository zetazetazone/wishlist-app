-- Fix infinite recursion in group_members RLS policy
-- The original policy referenced group_members from within group_members policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;

-- Create a non-recursive policy
-- Users can view group_members rows where they are a member of that group
-- Use a direct check instead of subquery to avoid recursion
CREATE POLICY "Users can view group members"
  ON public.group_members FOR SELECT
  USING (
    -- User can see their own membership
    user_id = auth.uid()
    OR
    -- User can see other members if they're also in the same group
    -- This uses a subquery on groups table (not group_members) to avoid recursion
    group_id IN (
      SELECT gm.group_id
      FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
    )
  );

-- Note: The above still has potential recursion. Let's use a security definer function instead.

-- Drop the policy we just created
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;

-- Create a security definer function to check membership without RLS
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id AND user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Now create the policy using the function
CREATE POLICY "Users can view group members"
  ON public.group_members FOR SELECT
  USING (
    public.is_group_member(group_id, auth.uid())
  );

COMMENT ON FUNCTION public.is_group_member IS 'Check if user is member of group - bypasses RLS to avoid recursion';
