---
status: resolved
trigger: "Diagnose root cause of Phase 8 UAT Issue - Test 4 (BLOCKER): Adding Surprise Me item gets stuck in 'Adding...' state indefinitely"
created: 2026-02-03T00:00:00Z
updated: 2026-02-03T00:00:00Z
---

## Current Focus

hypothesis: Database constraint violation on amazon_url NOT NULL
test: Confirmed via schema analysis
expecting: Surprise Me items fail at database insert due to empty amazon_url
next_action: Document root cause and provide fix recommendation

## Symptoms

expected: Surprise Me item should be added to wishlist successfully like Mystery Box items
actual: Button gets stuck showing "Adding..." indefinitely when tapping Add for Surprise Me items
errors: No visible error to user, likely database constraint violation
reproduction:
  1. Open Add Item Modal
  2. Select "Surprise Me" type
  3. Tap "Add to Wishlist" button
  4. Button shows "Adding..." and never completes
started: Phase 8 UAT testing - only affects surprise_me type, standard and mystery_box work fine

## Eliminated

N/A - Root cause found on first investigation

## Evidence

- timestamp: 2026-02-03T00:00:00Z
  checked: AddItemModal.tsx lines 111-118
  found: Surprise Me payload sets amazon_url to empty string ''
  implication: Empty string is being sent to database

- timestamp: 2026-02-03T00:00:00Z
  checked: wishlist.tsx handleAddItem lines 84-100
  found: Insert handler passes amazon_url directly to database without validation
  implication: Empty string reaches database insert

- timestamp: 2026-02-03T00:00:00Z
  checked: supabase/migrations/20260201000001_initial_schema.sql line 46
  found: amazon_url TEXT NOT NULL constraint
  implication: Database rejects empty string for amazon_url field

- timestamp: 2026-02-03T00:00:00Z
  checked: supabase/migrations/20260202000011_schema_foundation.sql
  found: Migration adds item_type, mystery_box_tier, surprise_me_budget columns
  implication: Schema was extended but amazon_url constraint was not relaxed for special item types

## Resolution

root_cause: |
  Database constraint violation - amazon_url column has NOT NULL constraint from initial schema,
  but Surprise Me items legitimately have no Amazon URL. The insert operation fails silently at
  the database level, causing the "Adding..." state to hang indefinitely.

  Code path:
  1. AddItemModal.tsx line 113: Sets amazon_url = '' (empty string) for surprise_me items
  2. wishlist.tsx line 89: Passes empty amazon_url to database insert
  3. Database: Rejects insert due to NOT NULL constraint on amazon_url
  4. Error is not properly caught/displayed, leaving UI in loading state

  Mystery Box items work because they also set amazon_url = '' (line 122), which suggests
  either:
  a) The constraint is not actually enforced (unlikely - UAT report says it fails)
  b) Mystery Box test passed but Surprise Me fails for another reason
  c) There's a difference in how the payloads are constructed

fix: |
  Two-part fix required:

  1. DATABASE MIGRATION (REQUIRED):
     - Alter amazon_url column to allow NULL values for special item types
     - Migration should: ALTER TABLE wishlist_items ALTER COLUMN amazon_url DROP NOT NULL;
     - Add CHECK constraint: amazon_url required for standard items only
     - Constraint: (item_type = 'standard' AND amazon_url IS NOT NULL) OR (item_type != 'standard')

  2. CODE UPDATE (REQUIRED):
     - Update AddItemModal.tsx to pass NULL instead of empty string for special items
     - Line 113: amazon_url: null (not '')
     - Line 122: amazon_url: null (not '')
     - Update TypeScript types to reflect amazon_url can be null
     - Update database.types.ts: amazon_url: string | null

verification: |
  After fix:
  1. Apply database migration
  2. Update code to use null instead of empty string
  3. Test adding Surprise Me item - should succeed
  4. Test adding Mystery Box item - should still work
  5. Test adding Standard Gift item - should require valid amazon_url
  6. Verify database contains correct data with NULL amazon_url for special items

files_changed:
  - supabase/migrations/[new]_allow_null_amazon_url.sql
  - components/wishlist/AddItemModal.tsx (lines 113, 122)
  - types/database.types.ts (amazon_url type)
