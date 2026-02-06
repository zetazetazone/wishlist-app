-- Split Contributions & Claim Enhancements
-- Phase 21: RPC functions for split contribution operations and notification triggers
-- Enables: Split funding workflow, contribution notifications, pledge immutability
--
-- RPC Functions:
--   1. open_split() - Convert full claim to split-open state
--   2. pledge_contribution() - Add split contribution to item
--   3. close_split() - Claimer covers remaining amount
--   4. get_split_status() - Read-only status check
--   5. get_suggested_share() - Helper for equal split UI suggestion
--
-- Notification Triggers:
--   1. notify_item_claimed() - Full claim notification (CLMX-01)
--   2. notify_split_invite() - First split claim invites group members
--   3. notify_split_fully_funded() - All contributors notified when funded
--   4. notify_split_canceled() - Group notified when split canceled
--   5. enforce_pledge_immutability() - Block contributor pledge deletion

-- ============================================
-- PART 1: Add additional_costs column to wishlist_items
-- ============================================

ALTER TABLE public.wishlist_items
ADD COLUMN IF NOT EXISTS additional_costs NUMERIC CHECK (additional_costs IS NULL OR additional_costs >= 0);

COMMENT ON COLUMN public.wishlist_items.additional_costs IS 'Shipping/delivery costs added by claimer when opening split - provided at split open time';

-- ============================================
-- PART 2: Split Contribution RPC Functions
-- ============================================

-- open_split: Convert a full claim to split-open state
-- Validates caller owns the full claim on this item
-- Updates existing claim to claim_type='split' (claimer's pledge stays as their contribution)
-- Stores additional_costs in wishlist_items table
CREATE OR REPLACE FUNCTION public.open_split(
  p_item_id UUID,
  p_additional_costs NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_item RECORD;
  v_claim RECORD;
BEGIN
  -- Get current user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate additional_costs if provided
  IF p_additional_costs IS NOT NULL AND p_additional_costs < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Additional costs cannot be negative');
  END IF;

  -- Lock the item to prevent concurrent modifications
  SELECT wi.id, wi.user_id, wi.group_id, wi.price
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = p_item_id
  FOR UPDATE;

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Find the caller's full claim on this item
  SELECT gc.id, gc.claimed_by, gc.claim_type
  INTO v_claim
  FROM public.gift_claims gc
  WHERE gc.wishlist_item_id = p_item_id
    AND gc.claimed_by = v_user_id
    AND gc.claim_type = 'full'
  FOR UPDATE;

  IF v_claim IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must have a full claim on this item to open a split');
  END IF;

  -- Update the claim to split type
  -- The claimer's existing claim becomes their contribution (amount = NULL initially, can be set later)
  UPDATE public.gift_claims
  SET claim_type = 'split',
      amount = 0, -- Claimer starts with 0, will cover remaining via close_split
      updated_at = NOW()
  WHERE id = v_claim.id;

  -- Store additional_costs on the item
  IF p_additional_costs IS NOT NULL THEN
    UPDATE public.wishlist_items
    SET additional_costs = p_additional_costs,
        updated_at = NOW()
    WHERE id = p_item_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- pledge_contribution: Add a split contribution to an item
-- Validates user is group member (not celebrant)
-- Validates split is open (EXISTS claim with claim_type='split')
-- Validates user hasn't already pledged to this item
-- Validates total pledges + p_amount <= item price + additional_costs
CREATE OR REPLACE FUNCTION public.pledge_contribution(
  p_item_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_item RECORD;
  v_total_pledged NUMERIC;
  v_max_amount NUMERIC;
  v_remaining NUMERIC;
  v_claim_id UUID;
BEGIN
  -- Get current user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pledge amount must be positive');
  END IF;

  -- Lock the item to prevent concurrent modifications
  SELECT wi.id, wi.user_id, wi.group_id, wi.price, COALESCE(wi.additional_costs, 0) AS additional_costs
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = p_item_id
  FOR UPDATE;

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Cannot pledge to own item (celebrant check)
  IF v_item.user_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot contribute to your own item');
  END IF;

  -- Item must be in a group
  IF v_item.group_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item is not in a group');
  END IF;

  -- Verify caller is a group member
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = v_item.group_id
      AND gm.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this group');
  END IF;

  -- Verify split is open (must have at least one split claim)
  IF NOT EXISTS (
    SELECT 1 FROM public.gift_claims gc
    WHERE gc.wishlist_item_id = p_item_id
      AND gc.claim_type = 'split'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Split not open for this item');
  END IF;

  -- Check if user already pledged
  IF EXISTS (
    SELECT 1 FROM public.gift_claims gc
    WHERE gc.wishlist_item_id = p_item_id
      AND gc.claimed_by = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already pledged to this item');
  END IF;

  -- Calculate total pledged so far
  SELECT COALESCE(SUM(gc.amount), 0) INTO v_total_pledged
  FROM public.gift_claims gc
  WHERE gc.wishlist_item_id = p_item_id
    AND gc.claim_type = 'split';

  -- Calculate max amount allowed (item price + additional costs)
  v_max_amount := COALESCE(v_item.price, 0) + v_item.additional_costs;

  -- Check if pledge would exceed max amount
  IF v_total_pledged + p_amount > v_max_amount THEN
    v_remaining := v_max_amount - v_total_pledged;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pledge exceeds remaining amount',
      'remaining', v_remaining
    );
  END IF;

  -- Insert the pledge
  INSERT INTO public.gift_claims (wishlist_item_id, claimed_by, claim_type, amount)
  VALUES (p_item_id, v_user_id, 'split', p_amount)
  RETURNING id INTO v_claim_id;

  -- Calculate new remaining
  v_remaining := v_max_amount - v_total_pledged - p_amount;

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'remaining', v_remaining
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already pledged to this item');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- close_split: Claimer covers the remaining amount
-- Validates caller is the original claimer (owns the first split claim)
-- Calculates remaining amount needed
-- Updates caller's existing claim amount to cover remaining
CREATE OR REPLACE FUNCTION public.close_split(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_item RECORD;
  v_original_claim RECORD;
  v_total_pledged NUMERIC;
  v_max_amount NUMERIC;
  v_remaining NUMERIC;
BEGIN
  -- Get current user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock the item to prevent concurrent modifications
  SELECT wi.id, wi.price, COALESCE(wi.additional_costs, 0) AS additional_costs
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = p_item_id
  FOR UPDATE;

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Find the original claimer's claim (first split claim for this item)
  SELECT gc.id, gc.claimed_by, gc.amount
  INTO v_original_claim
  FROM public.gift_claims gc
  WHERE gc.wishlist_item_id = p_item_id
    AND gc.claim_type = 'split'
  ORDER BY gc.created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_original_claim IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No split claim found for this item');
  END IF;

  -- Only the original claimer can close the split
  IF v_original_claim.claimed_by != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the original claimer can close the split');
  END IF;

  -- Calculate total pledged from OTHER contributors (not including original claimer)
  SELECT COALESCE(SUM(gc.amount), 0) INTO v_total_pledged
  FROM public.gift_claims gc
  WHERE gc.wishlist_item_id = p_item_id
    AND gc.claim_type = 'split'
    AND gc.claimed_by != v_user_id;

  -- Calculate max amount and remaining
  v_max_amount := COALESCE(v_item.price, 0) + v_item.additional_costs;
  v_remaining := v_max_amount - v_total_pledged;

  -- Update the original claimer's amount to cover remaining
  UPDATE public.gift_claims
  SET amount = v_remaining,
      updated_at = NOW()
  WHERE id = v_original_claim.id;

  RETURN jsonb_build_object(
    'success', true,
    'final_amount', v_remaining
  );
END;
$$;

-- get_split_status: Read-only status check
-- Returns item_price, additional_costs, total_pledged, is_fully_funded, is_open, contributor_count
-- Caller must be group member (not celebrant) - RLS-style check
CREATE OR REPLACE FUNCTION public.get_split_status(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_item RECORD;
  v_total_pledged NUMERIC;
  v_max_amount NUMERIC;
  v_contributor_count INTEGER;
  v_is_open BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get item details
  SELECT wi.id, wi.user_id, wi.group_id, wi.price, COALESCE(wi.additional_costs, 0) AS additional_costs
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = p_item_id;

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Celebrant cannot see split status
  IF v_item.user_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot view split status for your own item');
  END IF;

  -- Verify caller is a group member
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = v_item.group_id
      AND gm.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a member of this group');
  END IF;

  -- Check if split is open
  v_is_open := EXISTS (
    SELECT 1 FROM public.gift_claims gc
    WHERE gc.wishlist_item_id = p_item_id
      AND gc.claim_type = 'split'
  );

  IF NOT v_is_open THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_open', false,
      'item_price', v_item.price,
      'additional_costs', v_item.additional_costs,
      'total_pledged', 0,
      'is_fully_funded', false,
      'contributor_count', 0
    );
  END IF;

  -- Calculate totals
  SELECT
    COALESCE(SUM(gc.amount), 0),
    COUNT(*)
  INTO v_total_pledged, v_contributor_count
  FROM public.gift_claims gc
  WHERE gc.wishlist_item_id = p_item_id
    AND gc.claim_type = 'split';

  v_max_amount := COALESCE(v_item.price, 0) + v_item.additional_costs;

  RETURN jsonb_build_object(
    'success', true,
    'is_open', true,
    'item_price', v_item.price,
    'additional_costs', v_item.additional_costs,
    'total_pledged', v_total_pledged,
    'is_fully_funded', v_total_pledged >= v_max_amount,
    'contributor_count', v_contributor_count
  );
END;
$$;

-- get_suggested_share: Helper function for "equal split" UI suggestion
-- Calculates: (item_price + COALESCE(additional_costs, 0) - total_pledged) / remaining_member_count
-- remaining_member_count = group members who haven't pledged yet and aren't the celebrant
CREATE OR REPLACE FUNCTION public.get_suggested_share(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_item RECORD;
  v_total_pledged NUMERIC;
  v_max_amount NUMERIC;
  v_remaining_amount NUMERIC;
  v_remaining_members INTEGER;
  v_suggested_amount NUMERIC;
BEGIN
  -- Get current user
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get item details
  SELECT wi.id, wi.user_id, wi.group_id, wi.price, COALESCE(wi.additional_costs, 0) AS additional_costs
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = p_item_id;

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Verify split is open
  IF NOT EXISTS (
    SELECT 1 FROM public.gift_claims gc
    WHERE gc.wishlist_item_id = p_item_id
      AND gc.claim_type = 'split'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Split not open for this item');
  END IF;

  -- Calculate total pledged so far
  SELECT COALESCE(SUM(gc.amount), 0) INTO v_total_pledged
  FROM public.gift_claims gc
  WHERE gc.wishlist_item_id = p_item_id
    AND gc.claim_type = 'split';

  v_max_amount := COALESCE(v_item.price, 0) + v_item.additional_costs;
  v_remaining_amount := v_max_amount - v_total_pledged;

  -- Already fully funded
  IF v_remaining_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'suggested_amount', 0,
      'remaining_members', 0,
      'remaining_amount', 0
    );
  END IF;

  -- Count remaining members who haven't pledged yet (excluding celebrant and those who already pledged)
  SELECT COUNT(DISTINCT gm.user_id) INTO v_remaining_members
  FROM public.group_members gm
  WHERE gm.group_id = v_item.group_id
    AND gm.user_id != v_item.user_id  -- Not celebrant
    AND NOT EXISTS (
      SELECT 1 FROM public.gift_claims gc
      WHERE gc.wishlist_item_id = p_item_id
        AND gc.claimed_by = gm.user_id
    );

  -- No remaining members
  IF v_remaining_members = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'suggested_amount', v_remaining_amount,
      'remaining_members', 0,
      'remaining_amount', v_remaining_amount
    );
  END IF;

  -- Calculate suggested share (equal split among remaining members)
  v_suggested_amount := ROUND(v_remaining_amount / v_remaining_members, 2);

  RETURN jsonb_build_object(
    'success', true,
    'suggested_amount', v_suggested_amount,
    'remaining_members', v_remaining_members,
    'remaining_amount', v_remaining_amount
  );
END;
$$;

-- ============================================
-- PART 3: Notification Trigger Functions
-- ============================================

-- notify_item_claimed: Fires for full claims (CLMX-01)
-- Notifies all group members EXCEPT celebrant and claimer
CREATE OR REPLACE FUNCTION public.notify_item_claimed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item RECORD;
  v_claimer RECORD;
  v_celebrant RECORD;
  v_member RECORD;
BEGIN
  -- Only trigger for full claims
  IF NEW.claim_type != 'full' THEN
    RETURN NEW;
  END IF;

  -- Get item details
  SELECT wi.id, wi.title, wi.user_id AS celebrant_id, wi.group_id
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = NEW.wishlist_item_id;

  IF v_item IS NULL OR v_item.group_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get claimer name
  SELECT u.full_name AS display_name
  INTO v_claimer
  FROM public.users u
  WHERE u.id = NEW.claimed_by;

  -- Get celebrant name
  SELECT u.full_name AS display_name
  INTO v_celebrant
  FROM public.users u
  WHERE u.id = v_item.celebrant_id;

  -- Notify all group members except celebrant and claimer
  FOR v_member IN
    SELECT DISTINCT gm.user_id
    FROM public.group_members gm
    WHERE gm.group_id = v_item.group_id
      AND gm.user_id != v_item.celebrant_id
      AND gm.user_id != NEW.claimed_by
  LOOP
    INSERT INTO public.user_notifications (user_id, title, body, data)
    VALUES (
      v_member.user_id,
      'Item Claimed',
      COALESCE(v_claimer.display_name, 'Someone') || ' claimed ' || v_item.title || ' for ' || COALESCE(v_celebrant.display_name, 'someone'),
      jsonb_build_object(
        'type', 'item_claimed',
        'item_id', v_item.id,
        'item_title', v_item.title,
        'claimer_id', NEW.claimed_by,
        'claimer_name', v_claimer.display_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- notify_split_invite: Fires for the FIRST split claim
-- Invites all group members to contribute
CREATE OR REPLACE FUNCTION public.notify_split_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item RECORD;
  v_claimer RECORD;
  v_celebrant RECORD;
  v_member RECORD;
  v_split_count INTEGER;
BEGIN
  -- Only trigger for split claims
  IF NEW.claim_type != 'split' THEN
    RETURN NEW;
  END IF;

  -- Check if this is the first split claim for this item
  SELECT COUNT(*) INTO v_split_count
  FROM public.gift_claims gc
  WHERE gc.wishlist_item_id = NEW.wishlist_item_id
    AND gc.claim_type = 'split';

  -- Only fire for the first split claim
  IF v_split_count != 1 THEN
    RETURN NEW;
  END IF;

  -- Get item details
  SELECT wi.id, wi.title, wi.user_id AS celebrant_id, wi.group_id
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = NEW.wishlist_item_id;

  IF v_item IS NULL OR v_item.group_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get claimer name
  SELECT u.full_name AS display_name
  INTO v_claimer
  FROM public.users u
  WHERE u.id = NEW.claimed_by;

  -- Get celebrant name
  SELECT u.full_name AS display_name
  INTO v_celebrant
  FROM public.users u
  WHERE u.id = v_item.celebrant_id;

  -- Notify all group members except celebrant and claimer
  FOR v_member IN
    SELECT DISTINCT gm.user_id
    FROM public.group_members gm
    WHERE gm.group_id = v_item.group_id
      AND gm.user_id != v_item.celebrant_id
      AND gm.user_id != NEW.claimed_by
  LOOP
    INSERT INTO public.user_notifications (user_id, title, body, data)
    VALUES (
      v_member.user_id,
      'Split Invite',
      COALESCE(v_claimer.display_name, 'Someone') || ' invited you to split ' || v_item.title || ' for ' || COALESCE(v_celebrant.display_name, 'someone'),
      jsonb_build_object(
        'type', 'split_invite',
        'item_id', v_item.id,
        'item_title', v_item.title,
        'claimer_id', NEW.claimed_by,
        'claimer_name', v_claimer.display_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- notify_split_fully_funded: Fires when split becomes fully funded
-- Notifies all contributors
CREATE OR REPLACE FUNCTION public.notify_split_fully_funded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item RECORD;
  v_celebrant RECORD;
  v_total_pledged NUMERIC;
  v_max_amount NUMERIC;
  v_contributor RECORD;
BEGIN
  -- Only trigger for split claims
  IF NEW.claim_type != 'split' THEN
    RETURN NEW;
  END IF;

  -- Get item details
  SELECT wi.id, wi.title, wi.user_id AS celebrant_id, wi.group_id, wi.price, COALESCE(wi.additional_costs, 0) AS additional_costs
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = NEW.wishlist_item_id;

  IF v_item IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate total pledged
  SELECT COALESCE(SUM(gc.amount), 0) INTO v_total_pledged
  FROM public.gift_claims gc
  WHERE gc.wishlist_item_id = NEW.wishlist_item_id
    AND gc.claim_type = 'split';

  -- Calculate max amount
  v_max_amount := COALESCE(v_item.price, 0) + v_item.additional_costs;

  -- Only notify if fully funded
  IF v_total_pledged < v_max_amount THEN
    RETURN NEW;
  END IF;

  -- Get celebrant name
  SELECT u.full_name AS display_name
  INTO v_celebrant
  FROM public.users u
  WHERE u.id = v_item.celebrant_id;

  -- Notify ALL contributors
  FOR v_contributor IN
    SELECT DISTINCT gc.claimed_by
    FROM public.gift_claims gc
    WHERE gc.wishlist_item_id = NEW.wishlist_item_id
      AND gc.claim_type = 'split'
  LOOP
    INSERT INTO public.user_notifications (user_id, title, body, data)
    VALUES (
      v_contributor.claimed_by,
      'Split Fully Funded!',
      v_item.title || ' for ' || COALESCE(v_celebrant.display_name, 'someone') || ' is fully funded!',
      jsonb_build_object(
        'type', 'split_fully_funded',
        'item_id', v_item.id,
        'item_title', v_item.title
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- notify_split_canceled: Fires when original claimer unclaims (before others pledge)
-- Notifies all group members (informational)
CREATE OR REPLACE FUNCTION public.notify_split_canceled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item RECORD;
  v_member RECORD;
  v_other_contributors INTEGER;
BEGIN
  -- Only trigger for split claims
  IF OLD.claim_type != 'split' THEN
    RETURN OLD;
  END IF;

  -- Check if this was the original claimer (first split claim by created_at)
  -- If there are other contributors, this trigger shouldn't fire (blocked by immutability)
  -- This trigger only fires when original claimer unclaims before anyone else pledges

  -- Count other contributors
  SELECT COUNT(*) INTO v_other_contributors
  FROM public.gift_claims gc
  WHERE gc.wishlist_item_id = OLD.wishlist_item_id
    AND gc.claim_type = 'split'
    AND gc.claimed_by != OLD.claimed_by;

  -- If there are other contributors, this shouldn't happen (blocked by unclaim_item)
  -- But as a safety, just return
  IF v_other_contributors > 0 THEN
    RETURN OLD;
  END IF;

  -- Get item details
  SELECT wi.id, wi.title, wi.user_id AS celebrant_id, wi.group_id
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = OLD.wishlist_item_id;

  IF v_item IS NULL OR v_item.group_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Notify all group members (informational, since no one contributed yet)
  FOR v_member IN
    SELECT DISTINCT gm.user_id
    FROM public.group_members gm
    WHERE gm.group_id = v_item.group_id
      AND gm.user_id != v_item.celebrant_id
      AND gm.user_id != OLD.claimed_by
  LOOP
    INSERT INTO public.user_notifications (user_id, title, body, data)
    VALUES (
      v_member.user_id,
      'Split Canceled',
      'The split for ' || v_item.title || ' was canceled',
      jsonb_build_object(
        'type', 'split_canceled',
        'item_id', v_item.id,
        'item_title', v_item.title
      )
    );
  END LOOP;

  RETURN OLD;
END;
$$;

-- ============================================
-- PART 4: Pledge Immutability Trigger
-- ============================================

-- enforce_pledge_immutability: Prevents contributors from withdrawing pledges
-- Original claimer CAN unclaim if no other contributors (checked in unclaim_item RPC)
-- This trigger blocks DELETE by non-original claimers
CREATE OR REPLACE FUNCTION public.enforce_pledge_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_original_claimer UUID;
  v_deleting_user UUID;
BEGIN
  -- Only apply to split claims
  IF OLD.claim_type != 'split' THEN
    RETURN OLD;
  END IF;

  -- Get the deleting user
  v_deleting_user := (SELECT auth.uid());

  -- Find the original claimer (first split claim for this item by created_at)
  SELECT gc.claimed_by INTO v_original_claimer
  FROM public.gift_claims gc
  WHERE gc.wishlist_item_id = OLD.wishlist_item_id
    AND gc.claim_type = 'split'
  ORDER BY gc.created_at ASC
  LIMIT 1;

  -- If the deleting user is NOT the original claimer, block the delete
  IF v_deleting_user IS NOT NULL AND v_deleting_user != v_original_claimer THEN
    RAISE EXCEPTION 'Pledges cannot be withdrawn. Contact the original claimer if you need to cancel your contribution.';
  END IF;

  RETURN OLD;
END;
$$;

-- ============================================
-- PART 5: Update unclaim_item to block when contributions exist
-- ============================================

-- Recreate unclaim_item with contribution check
CREATE OR REPLACE FUNCTION public.unclaim_item(p_claim_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_claim RECORD;
  v_deleted INTEGER;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get the claim first to check for contributions
  SELECT gc.id, gc.wishlist_item_id, gc.claimed_by, gc.claim_type
  INTO v_claim
  FROM public.gift_claims gc
  WHERE gc.id = p_claim_id AND gc.claimed_by = v_user_id;

  IF v_claim IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found or not yours');
  END IF;

  -- For split claims, check if there are other contributors
  -- Per CONTEXT.md: "Cannot unclaim an item once any contributions exist (blocked)"
  IF v_claim.claim_type = 'split' THEN
    IF EXISTS (
      SELECT 1 FROM public.gift_claims gc
      WHERE gc.wishlist_item_id = v_claim.wishlist_item_id
        AND gc.claimed_by != v_user_id
        AND gc.claim_type = 'split'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot unclaim: item has contributions from other members');
    END IF;
  END IF;

  -- Delete only if caller is the claimer (instant unclaim, no time limit)
  DELETE FROM public.gift_claims
  WHERE id = p_claim_id AND claimed_by = v_user_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found or not yours');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================
-- PART 6: Attach Triggers
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_item_claimed ON public.gift_claims;
DROP TRIGGER IF EXISTS trigger_notify_split_invite ON public.gift_claims;
DROP TRIGGER IF EXISTS trigger_notify_split_fully_funded ON public.gift_claims;
DROP TRIGGER IF EXISTS trigger_notify_split_canceled ON public.gift_claims;
DROP TRIGGER IF EXISTS trigger_enforce_pledge_immutability ON public.gift_claims;

-- Create triggers
CREATE TRIGGER trigger_notify_item_claimed
  AFTER INSERT ON public.gift_claims
  FOR EACH ROW
  WHEN (NEW.claim_type = 'full')
  EXECUTE FUNCTION public.notify_item_claimed();

CREATE TRIGGER trigger_notify_split_invite
  AFTER INSERT ON public.gift_claims
  FOR EACH ROW
  WHEN (NEW.claim_type = 'split')
  EXECUTE FUNCTION public.notify_split_invite();

CREATE TRIGGER trigger_notify_split_fully_funded
  AFTER INSERT ON public.gift_claims
  FOR EACH ROW
  WHEN (NEW.claim_type = 'split')
  EXECUTE FUNCTION public.notify_split_fully_funded();

-- Also fire on UPDATE (for close_split)
CREATE TRIGGER trigger_notify_split_fully_funded_update
  AFTER UPDATE ON public.gift_claims
  FOR EACH ROW
  WHEN (NEW.claim_type = 'split')
  EXECUTE FUNCTION public.notify_split_fully_funded();

CREATE TRIGGER trigger_notify_split_canceled
  AFTER DELETE ON public.gift_claims
  FOR EACH ROW
  WHEN (OLD.claim_type = 'split')
  EXECUTE FUNCTION public.notify_split_canceled();

CREATE TRIGGER trigger_enforce_pledge_immutability
  BEFORE DELETE ON public.gift_claims
  FOR EACH ROW
  WHEN (OLD.claim_type = 'split')
  EXECUTE FUNCTION public.enforce_pledge_immutability();

-- ============================================
-- PART 7: Function Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.open_split(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pledge_contribution(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_split(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_split_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suggested_share(UUID) TO authenticated;

-- Function comments
COMMENT ON FUNCTION public.open_split IS
  'Convert a full claim to split-open state. Only the claimer who owns the full claim can open a split. Stores additional_costs (shipping/delivery) on the item. Returns JSONB {success, error?}.';

COMMENT ON FUNCTION public.pledge_contribution IS
  'Add a split contribution to an item. Validates user is group member (not celebrant), split is open, user hasnt already pledged, and total wont exceed item price + additional costs. Returns JSONB {success, claim_id?, remaining?, error?}.';

COMMENT ON FUNCTION public.close_split IS
  'Claimer covers the remaining amount to fully fund the split. Only the original claimer can close. Updates their pledge amount to cover remaining. Returns JSONB {success, final_amount?, error?}.';

COMMENT ON FUNCTION public.get_split_status IS
  'Read-only status check for split contributions. Returns item_price, additional_costs, total_pledged, is_fully_funded, is_open, contributor_count. Celebrant blocked from viewing.';

COMMENT ON FUNCTION public.get_suggested_share IS
  'Helper function for equal split UI suggestion. Calculates suggested amount based on remaining amount divided by remaining members who havent pledged. This is just a SUGGESTION - users can pledge any amount.';

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Split Contributions migration completed successfully!';
  RAISE NOTICE '---';
  RAISE NOTICE 'Column added: wishlist_items.additional_costs';
  RAISE NOTICE '---';
  RAISE NOTICE 'RPC Functions created:';
  RAISE NOTICE '  - open_split(item_id, additional_costs)';
  RAISE NOTICE '  - pledge_contribution(item_id, amount)';
  RAISE NOTICE '  - close_split(item_id)';
  RAISE NOTICE '  - get_split_status(item_id) [STABLE]';
  RAISE NOTICE '  - get_suggested_share(item_id) [STABLE]';
  RAISE NOTICE '---';
  RAISE NOTICE 'Triggers created:';
  RAISE NOTICE '  - trigger_notify_item_claimed (AFTER INSERT, claim_type=full)';
  RAISE NOTICE '  - trigger_notify_split_invite (AFTER INSERT, claim_type=split, first only)';
  RAISE NOTICE '  - trigger_notify_split_fully_funded (AFTER INSERT/UPDATE, claim_type=split)';
  RAISE NOTICE '  - trigger_notify_split_canceled (AFTER DELETE, claim_type=split)';
  RAISE NOTICE '  - trigger_enforce_pledge_immutability (BEFORE DELETE, claim_type=split)';
  RAISE NOTICE '---';
  RAISE NOTICE 'unclaim_item() updated to block when contributions exist';
  RAISE NOTICE 'Permissions: GRANT EXECUTE to authenticated role';
END $$;
