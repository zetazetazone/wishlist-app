-- Contact Matching RPC Functions
-- Phase 26 Plan 01: Contact Import Foundation
-- Provides: match_phones() for phone number matching, search_users() for name/email search
--
-- Both functions:
--   - Require authentication
--   - Exclude current user from results
--   - Exclude blocked users (bidirectional check)
--   - Use SECURITY DEFINER for consistent access

-- ============================================
-- PART 1: match_phones() function
-- Match device contacts against registered users by phone number
-- Uses existing idx_users_phone index for performance
-- ============================================

CREATE OR REPLACE FUNCTION public.match_phones(p_phone_numbers TEXT[])
RETURNS TABLE (
  user_id UUID,
  phone TEXT,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Require authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Return matching users
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.phone,
    u.full_name AS display_name,
    u.avatar_url
  FROM public.users u
  WHERE u.phone = ANY(p_phone_numbers)
    -- Exclude current user
    AND u.id != v_user_id
    -- Exclude blocked users (bidirectional check)
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'blocked'
        AND (
          (fr.from_user_id = v_user_id AND fr.to_user_id = u.id)
          OR (fr.to_user_id = v_user_id AND fr.from_user_id = u.id)
        )
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.match_phones(TEXT[]) TO authenticated;

-- Document the function
COMMENT ON FUNCTION public.match_phones IS
  'Match phone numbers against registered users. Returns user_id, phone, display_name, avatar_url. Excludes current user and blocked users. Requires authentication.';

-- ============================================
-- PART 2: search_users() function
-- Search users by name or email with ILIKE
-- Escapes special characters, orders by match quality
-- ============================================

CREATE OR REPLACE FUNCTION public.search_users(p_query TEXT)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_escaped_query TEXT;
  v_pattern TEXT;
BEGIN
  -- Require authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Escape special ILIKE characters (%, _, \)
  v_escaped_query := regexp_replace(p_query, '([%_\\])', '\\\1', 'g');
  v_pattern := '%' || v_escaped_query || '%';

  -- Return matching users, ordered by match quality
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.full_name AS display_name,
    u.email,
    u.avatar_url
  FROM public.users u
  WHERE (
      u.full_name ILIKE v_pattern
      OR u.email ILIKE v_pattern
    )
    -- Exclude current user
    AND u.id != v_user_id
    -- Exclude blocked users (bidirectional check)
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'blocked'
        AND (
          (fr.from_user_id = v_user_id AND fr.to_user_id = u.id)
          OR (fr.to_user_id = v_user_id AND fr.from_user_id = u.id)
        )
    )
  ORDER BY
    -- Exact match first
    CASE WHEN LOWER(u.full_name) = LOWER(p_query) OR LOWER(u.email) = LOWER(p_query) THEN 0
    -- Starts-with second
         WHEN LOWER(u.full_name) ILIKE LOWER(p_query) || '%' OR LOWER(u.email) ILIKE LOWER(p_query) || '%' THEN 1
    -- Contains third
         ELSE 2
    END,
    u.full_name ASC
  LIMIT 20;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.search_users(TEXT) TO authenticated;

-- Document the function
COMMENT ON FUNCTION public.search_users IS
  'Search users by name or email using ILIKE. Returns up to 20 results ordered by match quality (exact, starts-with, contains). Excludes current user and blocked users. Requires authentication.';

-- ============================================
-- PART 3: Completion notice
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Contact matching migration completed successfully!';
  RAISE NOTICE '---';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  match_phones(TEXT[]) - Match phone numbers against users table';
  RAISE NOTICE '  search_users(TEXT) - Search users by name or email with ILIKE';
  RAISE NOTICE '---';
  RAISE NOTICE 'Security features:';
  RAISE NOTICE '  - Both functions require authentication';
  RAISE NOTICE '  - Both functions use SECURITY DEFINER with empty search_path';
  RAISE NOTICE '  - Both functions exclude current user from results';
  RAISE NOTICE '  - Both functions exclude blocked users (bidirectional check)';
  RAISE NOTICE '---';
  RAISE NOTICE 'Permissions:';
  RAISE NOTICE '  - GRANT EXECUTE to authenticated role for both functions';
END $$;
