-- v1.3 Claims, Personal Details & Member Notes
-- Phase 18: Creates three new tables with distinct RLS visibility patterns
-- Enables: Gift Claiming (19), Personal Details (20), Split Contributions (21), Member Notes (22)
--
-- RLS Patterns:
--   1. Celebrant Partial Visibility (gift_claims) - item owner blocked from SELECT
--   2. Public Read / Owner Write (personal_details) - any authenticated can read
--   3. Subject Exclusion (member_notes) - note subject cannot read notes about themselves

-- ============================================
-- PART 1: gift_claims table
-- Tracks who claimed which wishlist item
-- Claims are global per item (not per-celebration)
-- ============================================

CREATE TABLE public.gift_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_item_id UUID REFERENCES public.wishlist_items(id) ON DELETE CASCADE NOT NULL,
  claimed_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  claim_type TEXT CHECK (claim_type IN ('full', 'split')) DEFAULT 'full',
  amount NUMERIC CHECK (amount IS NULL OR amount > 0),
  status TEXT CHECK (status IN ('claimed', 'purchased', 'delivered')) DEFAULT 'claimed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one full claim per item (partial unique index)
CREATE UNIQUE INDEX idx_gift_claims_full_unique
  ON public.gift_claims(wishlist_item_id)
  WHERE claim_type = 'full';

-- Lookup indexes
CREATE INDEX idx_gift_claims_item ON public.gift_claims(wishlist_item_id);
CREATE INDEX idx_gift_claims_claimer ON public.gift_claims(claimed_by);

-- Enable RLS
ALTER TABLE public.gift_claims ENABLE ROW LEVEL SECURITY;

-- ============================================
-- gift_claims RLS Policies
-- Pattern: Celebrant Partial Visibility
-- Item owner is BLOCKED from SELECT on this table.
-- They get claim status via get_item_claim_status() RPC.
-- ============================================

-- SELECT: Non-owners who share a group with the item owner can view full claim details
CREATE POLICY "Non-owners can view claims on group items"
  ON public.gift_claims FOR SELECT
  USING (
    -- The viewing user must NOT be the item owner (celebrant exclusion)
    NOT EXISTS (
      SELECT 1 FROM public.wishlist_items wi
      WHERE wi.id = gift_claims.wishlist_item_id
        AND wi.user_id = (SELECT auth.uid())
    )
    AND
    -- The viewing user must share at least one group with the item owner
    EXISTS (
      SELECT 1 FROM public.wishlist_items wi
      JOIN public.group_members gm_owner
        ON gm_owner.group_id = wi.group_id AND gm_owner.user_id = wi.user_id
      JOIN public.group_members gm_viewer
        ON gm_viewer.group_id = wi.group_id AND gm_viewer.user_id = (SELECT auth.uid())
      WHERE wi.id = gift_claims.wishlist_item_id
    )
  );

-- INSERT: Users can claim items they do NOT own, in groups they share with the owner
CREATE POLICY "Users can claim others items"
  ON public.gift_claims FOR INSERT
  WITH CHECK (
    claimed_by = (SELECT auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.wishlist_items wi
      WHERE wi.id = gift_claims.wishlist_item_id
        AND wi.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.wishlist_items wi
      JOIN public.group_members gm
        ON gm.group_id = wi.group_id
      WHERE wi.id = gift_claims.wishlist_item_id
        AND gm.user_id = (SELECT auth.uid())
    )
  );

-- UPDATE: Only the claimer can update their own claim (status progression)
CREATE POLICY "Claimers can update own claims"
  ON public.gift_claims FOR UPDATE
  USING (claimed_by = (SELECT auth.uid()))
  WITH CHECK (claimed_by = (SELECT auth.uid()));

-- DELETE: Only the claimer can delete (unclaim) their own claim
CREATE POLICY "Claimers can delete own claims"
  ON public.gift_claims FOR DELETE
  USING (claimed_by = (SELECT auth.uid()));

-- ============================================
-- PART 2: personal_details table
-- Stores clothing sizes, preferences, external links
-- One row per user (UNIQUE on user_id)
-- ============================================

CREATE TABLE public.personal_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  sizes JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  external_links JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.personal_details ENABLE ROW LEVEL SECURITY;

-- ============================================
-- personal_details RLS Policies
-- Pattern: Public Read / Owner Write
-- Any authenticated user can view; only owner can modify
-- ============================================

-- SELECT: Any authenticated user can view personal details
CREATE POLICY "Authenticated users can view personal details"
  ON public.personal_details FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- INSERT: Owner only
CREATE POLICY "Users can insert own personal details"
  ON public.personal_details FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: Owner only
CREATE POLICY "Users can update own personal details"
  ON public.personal_details FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: Owner only
CREATE POLICY "Users can delete own personal details"
  ON public.personal_details FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ============================================
-- PART 3: member_notes table
-- Short notes about group members (shared intelligence)
-- Per-group scoped, 280-char limit, delete-only (no editing)
-- ============================================

CREATE TABLE public.member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  about_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- No updated_at column: delete-only, no editing

-- Composite index for common query: "all notes about person X in group Y"
CREATE INDEX idx_member_notes_group_about ON public.member_notes(group_id, about_user_id);
-- Index for "notes I wrote" / DELETE policy evaluation
CREATE INDEX idx_member_notes_author ON public.member_notes(author_id);

-- Enable RLS
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- member_notes RLS Policies
-- Pattern: Subject Exclusion
-- Group members can view notes EXCEPT notes about themselves
-- No UPDATE policy (delete-only per design decision)
-- ============================================

-- SELECT: Group members can view notes except notes about themselves
CREATE POLICY "Group members can view notes except about self"
  ON public.member_notes FOR SELECT
  USING (
    about_user_id != (SELECT auth.uid())
    AND public.is_group_member(group_id, (SELECT auth.uid()))
  );

-- INSERT: Group members can write notes about OTHER members
CREATE POLICY "Group members can create notes about others"
  ON public.member_notes FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND about_user_id != (SELECT auth.uid())
    AND public.is_group_member(group_id, (SELECT auth.uid()))
  );

-- DELETE: Author can delete own notes only
CREATE POLICY "Authors can delete own notes"
  ON public.member_notes FOR DELETE
  USING (author_id = (SELECT auth.uid()));

-- ============================================
-- PART 4: Triggers
-- Reuse existing handle_updated_at() function
-- ============================================

CREATE TRIGGER set_gift_claims_updated_at
  BEFORE UPDATE ON public.gift_claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_personal_details_updated_at
  BEFORE UPDATE ON public.personal_details
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- No trigger on member_notes (no updated_at column)

-- ============================================
-- PART 5: Comments
-- Document tables, columns, and RLS patterns
-- ============================================

-- gift_claims comments
COMMENT ON TABLE public.gift_claims IS
  'Tracks gift claims on wishlist items. RLS pattern: celebrant partial visibility -- item owner is blocked from SELECT. Non-owner group members see full claim details.';
COMMENT ON COLUMN public.gift_claims.wishlist_item_id IS
  'The wishlist item being claimed. Claims are global per item (not per-celebration).';
COMMENT ON COLUMN public.gift_claims.claimed_by IS
  'The user who claimed this item. Must not be the item owner.';
COMMENT ON COLUMN public.gift_claims.claim_type IS
  'full = entire item claimed by one person. split = partial contribution toward the item.';
COMMENT ON COLUMN public.gift_claims.amount IS
  'Dollar amount for split contributions. NULL for full claims. Must be positive if set.';
COMMENT ON COLUMN public.gift_claims.status IS
  'Claim lifecycle: claimed -> purchased -> delivered. Hidden from celebrant via RLS.';

-- personal_details comments
COMMENT ON TABLE public.personal_details IS
  'User profile extension for clothing sizes, preferences, and external wishlist links. RLS pattern: public read / owner write -- any authenticated user can view, only owner can modify.';
COMMENT ON COLUMN public.personal_details.sizes IS
  'JSONB object with clothing size categories as keys (shirt, shoe, pants, ring, dress, jacket) and size values as strings.';
COMMENT ON COLUMN public.personal_details.preferences IS
  'JSONB object with preference categories (colors, brands, interests, dislikes) containing arrays of {label, custom?} tag objects.';
COMMENT ON COLUMN public.personal_details.external_links IS
  'JSONB array of external wishlist link objects: [{url, label?, platform?}].';

-- member_notes comments
COMMENT ON TABLE public.member_notes IS
  'Short notes about group members for gift coordination. RLS pattern: subject exclusion -- the note subject cannot read notes about themselves. Delete-only, no editing.';
COMMENT ON COLUMN public.member_notes.about_user_id IS
  'The user this note is about. This user is BLOCKED from reading this note via RLS subject-exclusion policy.';
COMMENT ON COLUMN public.member_notes.author_id IS
  'The user who wrote this note. Only the author can delete it.';
COMMENT ON COLUMN public.member_notes.content IS
  'Note text, max 280 characters. Enforced by CHECK constraint at database level.';
