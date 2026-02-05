---
quick-task: 001
type: bugfix
tags: [budget, check-constraint, per_gift]
duration: 3min
completed: 2026-02-05
---

# Quick Task 001: Fix budget per_gift check constraint violation

**Bug:** Saving budget settings with `per_gift` approach failed with PostgreSQL check constraint error `budget_amount_requires_approach`.

**Root Cause:** `BudgetSettingsSection.tsx` `handleSave` computed `amountCents` for all approaches including `per_gift`. The DB constraint (`supabase/migrations/20260205000001_v1.2_groups_schema.sql:64`) requires `budget_amount IS NULL` when `budget_approach = 'per_gift'`.

**Fix:** Added `selectedApproach !== 'per_gift'` guard to the `amountCents` calculation in `handleSave` (line 127), ensuring `per_gift` always sends `NULL` for `budget_amount`.

**File Modified:** `components/groups/BudgetSettingsSection.tsx` (1 line change)

**Commit:** `a9da654` fix(17): enforce NULL budget_amount for per_gift approach

---
*Quick task completed: 2026-02-05*
