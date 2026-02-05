---
quick-task: 002
type: bugfix
tags: [budget, check-constraint, per_gift, migration]
duration: 5min
completed: 2026-02-05
---

# Quick Task 002: Fix per-gift budget amount not persisted

**Bug:** Setting per-gift budget to $100 in group settings saved successfully (no error) but the amount was not stored in the database. Group page showed "Suggested limit: $0 per gift".

**Root Cause:** The DB constraint `budget_amount_requires_approach` (from Phase 11 migration) required `budget_amount IS NULL` when `budget_approach = 'per_gift'`. Quick Task 001 worked around the constraint violation by forcing NULL, which "fixed" the error but caused data loss — the per-gift suggested amount was never stored.

**Fix:**
1. New migration `20260205000004_fix_per_gift_budget_constraint.sql` relaxes the constraint to allow `budget_amount` for all three approaches (per_gift, monthly, yearly). Only `budget_approach IS NULL` requires `budget_amount IS NULL`.
2. Reverted Quick Task 001 workaround in `BudgetSettingsSection.tsx` — all approaches can now send their amount to the DB.

**Files Modified:**
- `supabase/migrations/20260205000004_fix_per_gift_budget_constraint.sql` (new)
- `components/groups/BudgetSettingsSection.tsx` (reverted QT-001 guard)

**Commit:** `84bb2fa` fix(17): allow budget_amount storage for per_gift approach

**Note:** Requires running `supabase db push` or applying migration to update the constraint in the database.

---
*Quick task completed: 2026-02-05*
