-- Fix test user's display name
-- Run this in Supabase SQL Editor
-- Note: user_profiles is a VIEW that maps to users table

-- First, let's see what we have for the test user
SELECT
  id,
  email,
  full_name,
  birthday,
  onboarding_completed
FROM public.users
WHERE email = 'testuser@test.com';

-- Update the users table (full_name will appear as display_name in the view)
UPDATE public.users
SET
  full_name = 'Test User',
  onboarding_completed = true,
  updated_at = NOW()
WHERE email = 'testuser@test.com';

-- Verify the fix (check through the view to confirm mapping works)
SELECT
  id,
  email,
  display_name,
  onboarding_completed
FROM public.user_profiles
WHERE email = 'testuser@test.com';
