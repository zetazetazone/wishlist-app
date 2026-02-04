-- v1.2 Groups Schema Extension
-- Phase 11: Extends groups table for Group Experience features
-- Enables: Create Group Enhancement (13), Group View Redesign (14),
--          Group Settings (15), Mode System (16), Budget Tracking (17)

-- ============================================
-- PART 1: Add new columns to groups table
-- Single ALTER TABLE for atomicity
-- ============================================

-- mode: Group operating mode (greetings vs gifts)
-- DEFAULT 'gifts' maintains backward compatibility for existing groups
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'gifts'
  CHECK (mode IN ('greetings', 'gifts'));

COMMENT ON COLUMN public.groups.mode IS
  'Group operating mode: greetings (birthday messages only) or gifts (full gift coordination)';

-- budget_approach: How budget is calculated for the group
-- Nullable: groups can use existing budget_limit_per_gift or no budget tracking
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS budget_approach TEXT
  CHECK (budget_approach IS NULL OR budget_approach IN ('per_gift', 'monthly', 'yearly'));

COMMENT ON COLUMN public.groups.budget_approach IS
  'Budget calculation method: per_gift (per-gift limit), monthly (pooled monthly), yearly (pooled yearly)';

-- budget_amount: Pooled budget amount in cents for monthly/yearly approaches
-- Nullable: only used with monthly/yearly approaches
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS budget_amount INTEGER
  CHECK (budget_amount IS NULL OR budget_amount > 0);

COMMENT ON COLUMN public.groups.budget_amount IS
  'Pooled budget amount in cents. Only valid with monthly/yearly budget_approach';

-- description: Optional group description/tagline
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.groups.description IS
  'Optional group description or tagline';

-- photo_url: Storage path to group photo (uses avatars bucket)
-- Store paths only, not full URLs
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN public.groups.photo_url IS
  'Storage path to group photo in avatars bucket';

-- ============================================
-- PART 2: Cross-column constraint
-- budget_amount requires monthly/yearly approach
-- ============================================

-- Drop if exists for idempotency
ALTER TABLE public.groups
DROP CONSTRAINT IF EXISTS budget_amount_requires_approach;

-- Add constraint: budget_amount only valid with monthly/yearly approach
ALTER TABLE public.groups
ADD CONSTRAINT budget_amount_requires_approach CHECK (
  -- budget_amount must be NULL if budget_approach is NULL or 'per_gift'
  (budget_approach IS NULL AND budget_amount IS NULL)
  OR
  (budget_approach = 'per_gift' AND budget_amount IS NULL)
  OR
  -- budget_amount can be set (or NULL) for monthly/yearly
  (budget_approach IN ('monthly', 'yearly'))
);

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'v1.2 Groups Schema migration completed successfully!';
  RAISE NOTICE 'Added to groups: mode, budget_approach, budget_amount, description, photo_url';
  RAISE NOTICE 'Constraint: budget_amount requires monthly/yearly budget_approach';
  RAISE NOTICE 'Existing groups will have mode=gifts (default)';
END $$;
