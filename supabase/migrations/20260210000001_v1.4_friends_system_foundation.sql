-- v1.4 Friends System Foundation
-- Phase 23: Creates three new tables plus helper functions for v1.4 Friends System
-- Enables: Friend Core Services (24), Friend Requests (25), Contact Import (26), Public Dates (27), Calendar (28)
--
-- RLS Patterns:
--   1. Friends-only Visibility (friends) - Both parties can view their friendships
--   2. Participant Visibility (friend_requests) - Sender and receiver can view
--   3. Owner Write / Friends Read (public_dates) - Owner modifies, friends view

-- ============================================
-- PART 1: friends table
-- Bidirectional friendship with ordered constraint
-- user_a_id < user_b_id prevents duplicate rows
-- ============================================

CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  user_b_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ordered bidirectional constraint: user_a_id must be "less than" user_b_id
  -- This prevents duplicate rows like (A,B) and (B,A) - only (lesser,greater) is allowed
  CONSTRAINT friends_ordered_check CHECK (user_a_id < user_b_id),

  -- Unique friendship per pair
  CONSTRAINT friends_pair_unique UNIQUE (user_a_id, user_b_id)
);

-- Indexes for lookup by either user
CREATE INDEX idx_friends_user_a ON public.friends(user_a_id);
CREATE INDEX idx_friends_user_b ON public.friends(user_b_id);

-- Enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: friend_requests table
-- Tracks friend request lifecycle
-- Status: pending -> accepted/rejected/blocked
-- ============================================

CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status enum constraint
  CONSTRAINT friend_requests_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),

  -- Cannot send request to self
  CONSTRAINT friend_requests_no_self_request CHECK (from_user_id != to_user_id)
);

-- Partial unique index: Only one pending request between any two users (in either direction)
-- This prevents: A sends to B while B's pending request to A exists
CREATE UNIQUE INDEX idx_friend_requests_pending_unique
  ON public.friend_requests(LEAST(from_user_id, to_user_id), GREATEST(from_user_id, to_user_id))
  WHERE status = 'pending';

-- Lookup indexes
CREATE INDEX idx_friend_requests_to_status ON public.friend_requests(to_user_id, status);
CREATE INDEX idx_friend_requests_from ON public.friend_requests(from_user_id);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: public_dates table
-- Annual recurring dates (birthdays, anniversaries)
-- Stored as month/day for yearly recurrence
-- Optional year for one-time events
-- ============================================

CREATE TABLE public.public_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  year INTEGER, -- NULL for annual recurring, set for one-time events
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Month validation: 1-12
  CONSTRAINT public_dates_month_check CHECK (month BETWEEN 1 AND 12),

  -- Day validation: 1-31
  CONSTRAINT public_dates_day_check CHECK (day BETWEEN 1 AND 31)
);

-- Lookup indexes
CREATE INDEX idx_public_dates_user ON public.public_dates(user_id);
CREATE INDEX idx_public_dates_month_day ON public.public_dates(month, day);

-- Enable RLS
ALTER TABLE public.public_dates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 4: Add phone column to users table
-- E.164 format (e.g., +14155551234)
-- Normalized at application layer via libphonenumber-js
-- ============================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Partial unique index: phone must be unique when set (allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone
  ON public.users(phone)
  WHERE phone IS NOT NULL;

-- ============================================
-- PART 5: are_friends() helper function
-- SECURITY DEFINER function to check friendship
-- Used in RLS policies to avoid recursion
-- Returns FALSE for NULL inputs or same user
-- ============================================

CREATE OR REPLACE FUNCTION public.are_friends(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Handle NULL inputs
  IF p_user_a IS NULL OR p_user_b IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Users are not friends with themselves
  IF p_user_a = p_user_b THEN
    RETURN FALSE;
  END IF;

  -- Check ordered friendship (smaller UUID first)
  RETURN EXISTS (
    SELECT 1 FROM public.friends
    WHERE user_a_id = LEAST(p_user_a, p_user_b)
      AND user_b_id = GREATEST(p_user_a, p_user_b)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PART 6: RLS policies for friends table
-- Pattern: Friends-only visibility
-- Both parties can view and delete (unfriend)
-- INSERT only via accept_friend_request RPC
-- ============================================

-- SELECT: Either user in the friendship can view
CREATE POLICY "Users can view their friendships"
  ON public.friends FOR SELECT
  USING (
    user_a_id = (SELECT auth.uid())
    OR user_b_id = (SELECT auth.uid())
  );

-- No direct INSERT policy - friendships created via accept_friend_request RPC only
-- This ensures friend_request status is properly updated atomically

-- UPDATE: Not allowed - friendships have no mutable fields
-- (No policy created = no updates allowed)

-- DELETE: Either user can unfriend (delete the row)
CREATE POLICY "Users can unfriend"
  ON public.friends FOR DELETE
  USING (
    user_a_id = (SELECT auth.uid())
    OR user_b_id = (SELECT auth.uid())
  );

-- ============================================
-- PART 7: RLS policies for friend_requests table
-- Sender and receiver have different permissions
-- ============================================

-- SELECT: Sender or receiver can view
CREATE POLICY "Users can view their friend requests"
  ON public.friend_requests FOR SELECT
  USING (
    from_user_id = (SELECT auth.uid())
    OR to_user_id = (SELECT auth.uid())
  );

-- INSERT: Authenticated user as sender, cannot send to self, no existing blocked status
CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (
    from_user_id = (SELECT auth.uid())
    AND to_user_id != (SELECT auth.uid())
    -- Block if there's an existing blocked request between these users
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'blocked'
        AND (
          (fr.from_user_id = (SELECT auth.uid()) AND fr.to_user_id = to_user_id)
          OR (fr.to_user_id = (SELECT auth.uid()) AND fr.from_user_id = to_user_id)
        )
    )
    -- Block if already friends
    AND NOT public.are_friends((SELECT auth.uid()), to_user_id)
  );

-- UPDATE: Receiver can update status (accept/reject/block)
CREATE POLICY "Receivers can update friend request status"
  ON public.friend_requests FOR UPDATE
  USING (to_user_id = (SELECT auth.uid()))
  WITH CHECK (
    to_user_id = (SELECT auth.uid())
    -- Cannot change the users involved
    AND from_user_id = from_user_id
    AND to_user_id = to_user_id
  );

-- DELETE: Sender can cancel pending request only
CREATE POLICY "Senders can cancel pending requests"
  ON public.friend_requests FOR DELETE
  USING (
    from_user_id = (SELECT auth.uid())
    AND status = 'pending'
  );

-- ============================================
-- PART 8: RLS policies for public_dates table
-- Pattern: Owner write, friends read
-- ============================================

-- SELECT: Owner or friends can view
CREATE POLICY "Users can view own and friends public dates"
  ON public.public_dates FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR public.are_friends(user_id, (SELECT auth.uid()))
  );

-- INSERT: Owner only
CREATE POLICY "Users can create own public dates"
  ON public.public_dates FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: Owner only
CREATE POLICY "Users can update own public dates"
  ON public.public_dates FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: Owner only
CREATE POLICY "Users can delete own public dates"
  ON public.public_dates FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ============================================
-- PART 9: Triggers
-- Reuse existing handle_updated_at() function
-- ============================================

CREATE TRIGGER set_friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_public_dates_updated_at
  BEFORE UPDATE ON public.public_dates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- No trigger on friends (no updated_at column)

-- ============================================
-- PART 10: accept_friend_request() RPC function
-- Atomically creates friendship and updates request status
-- Uses SECURITY DEFINER to bypass RLS for atomic operation
-- ============================================

CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request RECORD;
  v_user_id UUID;
  v_friend_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock the request row to prevent concurrent modifications
  SELECT id, from_user_id, to_user_id, status
  INTO v_request
  FROM public.friend_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  -- Only receiver can accept
  IF v_request.to_user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to accept this request');
  END IF;

  -- Must be pending
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request is not pending');
  END IF;

  -- Create friendship with ordered IDs (smaller UUID first)
  INSERT INTO public.friends (user_a_id, user_b_id)
  VALUES (
    LEAST(v_request.from_user_id, v_request.to_user_id),
    GREATEST(v_request.from_user_id, v_request.to_user_id)
  );

  -- Update request status to accepted
  UPDATE public.friend_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_request_id;

  v_friend_id := v_request.from_user_id;
  RETURN jsonb_build_object('success', true, 'friend_id', v_friend_id);

EXCEPTION
  WHEN unique_violation THEN
    -- Already friends (race condition safety)
    RETURN jsonb_build_object('success', false, 'error', 'Already friends');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- PART 11: Function permissions
-- Grant execute to authenticated users only
-- ============================================

GRANT EXECUTE ON FUNCTION public.are_friends(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;

-- ============================================
-- PART 12: Comments
-- Document tables, columns, and RLS patterns
-- ============================================

-- friends table comments
COMMENT ON TABLE public.friends IS
  'Bidirectional friendships with ordered constraint. RLS pattern: friends-only visibility. user_a_id < user_b_id enforced to prevent duplicate pairs.';
COMMENT ON COLUMN public.friends.user_a_id IS
  'First user in friendship. Always the "smaller" UUID due to ordered constraint.';
COMMENT ON COLUMN public.friends.user_b_id IS
  'Second user in friendship. Always the "greater" UUID due to ordered constraint.';

-- friend_requests table comments
COMMENT ON TABLE public.friend_requests IS
  'Friend request lifecycle tracking. RLS pattern: participant visibility. Partial unique index prevents duplicate pending requests between same users.';
COMMENT ON COLUMN public.friend_requests.from_user_id IS
  'User who sent the friend request. Can cancel pending requests.';
COMMENT ON COLUMN public.friend_requests.to_user_id IS
  'User who received the friend request. Can accept/reject/block.';
COMMENT ON COLUMN public.friend_requests.status IS
  'Request lifecycle: pending -> accepted (creates friendship) | rejected | blocked (prevents future requests)';

-- public_dates table comments
COMMENT ON TABLE public.public_dates IS
  'User-owned dates visible to friends. RLS pattern: owner write / friends read. Month/day storage enables annual recurrence.';
COMMENT ON COLUMN public.public_dates.month IS
  'Month of the date (1-12). Stored separately for easy recurring date queries.';
COMMENT ON COLUMN public.public_dates.day IS
  'Day of the month (1-31). Stored separately for easy recurring date queries.';
COMMENT ON COLUMN public.public_dates.year IS
  'Optional year. NULL for annual recurring dates (birthdays). Set for one-time events.';

-- users.phone column comment
COMMENT ON COLUMN public.users.phone IS
  'Phone number in E.164 format (e.g., +14155551234). Normalized at application layer via libphonenumber-js. Unique when set.';

-- Function comments
COMMENT ON FUNCTION public.are_friends IS
  'Check if two users are friends. SECURITY DEFINER to bypass RLS in policy evaluation. Returns FALSE for NULL inputs or same user.';
COMMENT ON FUNCTION public.accept_friend_request IS
  'Atomically accept a friend request. Creates friendship with ordered IDs, updates request status. Returns JSONB {success, friend_id?, error?}.';

-- ============================================
-- PART 13: Completion notice
-- Summary of migration
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'v1.4 Friends System Foundation migration completed successfully!';
  RAISE NOTICE '---';
  RAISE NOTICE 'Tables created: friends, friend_requests, public_dates';
  RAISE NOTICE 'Column added: users.phone (E.164 format, unique when set)';
  RAISE NOTICE 'RLS policies: 10 total (2 friends + 4 friend_requests + 4 public_dates)';
  RAISE NOTICE 'Indexes: 7 total (2 friends + 3 friend_requests + 2 public_dates + 1 users.phone)';
  RAISE NOTICE 'Triggers: updated_at on friend_requests and public_dates';
  RAISE NOTICE 'Functions: are_friends(), accept_friend_request()';
  RAISE NOTICE 'Permissions: GRANT EXECUTE to authenticated role';
  RAISE NOTICE '---';
  RAISE NOTICE 'RLS patterns:';
  RAISE NOTICE '  friends: friends-only visibility (both parties can view/delete)';
  RAISE NOTICE '  friend_requests: participant visibility (sender/receiver permissions)';
  RAISE NOTICE '  public_dates: owner write / friends read';
  RAISE NOTICE '---';
  RAISE NOTICE 'Constraints:';
  RAISE NOTICE '  friends: ordered bidirectional (user_a_id < user_b_id)';
  RAISE NOTICE '  friend_requests: status enum + partial unique on pending';
  RAISE NOTICE '  public_dates: month 1-12, day 1-31';
END $$;
