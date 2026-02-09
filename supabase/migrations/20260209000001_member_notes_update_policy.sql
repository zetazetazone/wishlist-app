-- Phase 22-01: Add UPDATE capability to member_notes table
-- Enables note authors to edit their own notes (NOTE-05 requirement)
--
-- Changes:
-- 1. Adds UPDATE policy for author-only editing
-- 2. Adds updated_at column with default and trigger
-- 3. Backfills existing rows with updated_at = created_at

-- ============================================
-- PART 1: Add updated_at column
-- ============================================

ALTER TABLE public.member_notes
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- PART 2: Backfill existing rows
-- Set updated_at = created_at for rows where updated_at is NULL
-- ============================================

UPDATE public.member_notes
SET updated_at = created_at
WHERE updated_at IS NULL;

-- ============================================
-- PART 3: Create trigger for automatic updated_at maintenance
-- Reuses existing handle_updated_at() function from schema_foundation
-- ============================================

CREATE TRIGGER set_member_notes_updated_at
  BEFORE UPDATE ON public.member_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- PART 4: Add UPDATE policy for author-only editing
-- Pattern: Authors can update their own notes (content only)
-- ============================================

CREATE POLICY "Authors can update own notes"
  ON public.member_notes FOR UPDATE
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

-- ============================================
-- PART 5: Update table comment
-- ============================================

COMMENT ON TABLE public.member_notes IS
  'Short notes about group members for gift coordination. RLS pattern: subject exclusion -- the note subject cannot read notes about themselves. Authors can update their own notes.';

COMMENT ON COLUMN public.member_notes.updated_at IS
  'Timestamp of last modification. Auto-updated via trigger.';

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 22-01: member_notes UPDATE policy migration completed!';
  RAISE NOTICE '---';
  RAISE NOTICE 'Column added: updated_at TIMESTAMPTZ';
  RAISE NOTICE 'Trigger: set_member_notes_updated_at';
  RAISE NOTICE 'Policy: Authors can update own notes';
  RAISE NOTICE 'Backfill: existing rows updated_at = created_at';
END $$;
