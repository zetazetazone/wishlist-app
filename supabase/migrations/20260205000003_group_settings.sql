-- Group Settings Migration
-- Adds invite_code column, admin helper functions, and updated RLS policies
-- for group settings functionality (Phase 15)

-- ============================================
-- 1. ADD invite_code COLUMN TO groups TABLE
-- ============================================

-- Add the column (nullable initially for backfill)
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Backfill existing groups with random 6-character alphanumeric codes
UPDATE public.groups
SET invite_code = UPPER(SUBSTRING(md5(random()::text || id::text) FROM 1 FOR 6))
WHERE invite_code IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.groups ALTER COLUMN invite_code SET NOT NULL;

-- Set default for new groups
ALTER TABLE public.groups ALTER COLUMN invite_code SET DEFAULT UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));

-- ============================================
-- 2. CREATE is_group_admin() SECURITY DEFINER FUNCTION
-- ============================================

-- Mirrors the existing is_group_member() pattern from migration 20260202000003
-- SECURITY DEFINER avoids RLS recursion when used in policies on group_members
CREATE OR REPLACE FUNCTION public.is_group_admin(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id
      AND user_id = check_user_id
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_group_admin IS 'Check if user is admin of group - bypasses RLS to avoid recursion';

-- ============================================
-- 3. UPDATE DELETE POLICY ON group_members
-- ============================================

-- Drop the old self-only leave policy
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

-- Create new policy allowing both self-leave and admin-remove
CREATE POLICY "Users can leave or be removed from groups"
  ON public.group_members FOR DELETE
  USING (
    -- Users can remove themselves (leave)
    auth.uid() = user_id
    OR
    -- Admins can remove other members
    public.is_group_admin(group_id, auth.uid())
  );

-- ============================================
-- 4. ADD UPDATE POLICY ON group_members FOR ADMIN ROLE CHANGES
-- ============================================

CREATE POLICY "Admins can update member roles"
  ON public.group_members FOR UPDATE
  USING (public.is_group_admin(group_id, auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

-- ============================================
-- 5. CREATE transfer_admin_role() DATABASE FUNCTION
-- ============================================

-- Atomic admin transfer: demotes current admin, promotes new admin
-- Runs in a single transaction to prevent zero-admin or double-admin states
CREATE OR REPLACE FUNCTION public.transfer_admin_role(
  p_group_id UUID,
  p_new_admin_id UUID
) RETURNS VOID AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
BEGIN
  -- Verify caller is current admin
  IF NOT public.is_group_admin(p_group_id, v_current_user_id) THEN
    RAISE EXCEPTION 'Only the current admin can transfer the admin role';
  END IF;

  -- Verify new admin is a group member
  IF NOT public.is_group_member(p_group_id, p_new_admin_id) THEN
    RAISE EXCEPTION 'New admin must be a group member';
  END IF;

  -- Demote current admin to member
  UPDATE public.group_members
  SET role = 'member'
  WHERE group_id = p_group_id AND user_id = v_current_user_id;

  -- Promote new admin
  UPDATE public.group_members
  SET role = 'admin'
  WHERE group_id = p_group_id AND user_id = p_new_admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.transfer_admin_role IS 'Atomically transfer admin role from current user to another group member';

-- ============================================
-- 6. CREATE regenerate_invite_code() DATABASE FUNCTION
-- ============================================

-- Any group member can regenerate the invite code
-- Uses SECURITY DEFINER to bypass groups UPDATE RLS (which is admin-only)
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_group_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_new_code TEXT;
BEGIN
  -- Verify caller is a group member
  IF NOT public.is_group_member(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only group members can regenerate invite codes';
  END IF;

  -- Generate new 6-character alphanumeric code
  v_new_code := UPPER(SUBSTRING(md5(random()::text || p_group_id::text || now()::text) FROM 1 FOR 6));

  -- Update the group's invite code
  UPDATE public.groups SET invite_code = v_new_code WHERE id = p_group_id;

  RETURN v_new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.regenerate_invite_code IS 'Regenerate invite code for a group - callable by any group member';
