-- Fix: Allow budget_amount for per_gift approach
-- The per_gift approach stores a "suggested limit per gift" amount.
-- The original constraint incorrectly required budget_amount IS NULL for per_gift.

ALTER TABLE public.groups
DROP CONSTRAINT IF EXISTS budget_amount_requires_approach;

ALTER TABLE public.groups
ADD CONSTRAINT budget_amount_requires_approach CHECK (
  -- No budget configured: both must be NULL
  (budget_approach IS NULL AND budget_amount IS NULL)
  OR
  -- Any approach set: budget_amount is optional
  (budget_approach IN ('per_gift', 'monthly', 'yearly'))
);
