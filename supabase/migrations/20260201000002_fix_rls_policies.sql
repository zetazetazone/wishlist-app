-- Complete RLS policy fix for groups and users
-- Run this in your Supabase SQL Editor

-- ============================================
-- Fix Users Table Policies
-- ============================================

-- Drop existing user policies
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Recreate user policies with proper permissions
CREATE POLICY "Users can view all users"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- Fix Groups Table Policies
-- ============================================

-- Drop existing group policies
DROP POLICY IF EXISTS "Users can view their groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can update their groups" ON public.groups;

-- Allow users to view groups they're members of
CREATE POLICY "Users can view their groups"
  ON public.groups FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = id AND user_id = auth.uid()
    )
  );

-- Allow authenticated users to create groups
-- The created_by must be the current user
CREATE POLICY "Users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = created_by
  );

-- Allow group admins to update their groups
CREATE POLICY "Admins can update their groups"
  ON public.groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================
-- Verify Group Members Policies
-- ============================================

-- The group_members policies should now be:
-- 1. SELECT: already fixed (USING true)
-- 2. INSERT: users can only insert themselves
-- 3. DELETE: users can only delete themselves

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'All RLS policies fixed successfully!';
  RAISE NOTICE 'You should now be able to create groups.';
  RAISE NOTICE 'Make sure your user profile exists in the users table.';
END $$;
