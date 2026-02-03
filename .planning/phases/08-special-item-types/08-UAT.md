---
status: diagnosed
phase: 08-special-item-types
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md]
started: 2026-02-03T10:15:00Z
updated: 2026-02-03T10:35:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Type Selector Display
expected: In Add Item modal, you see 3 type buttons in a horizontal row: "Gift", "Surprise", "Mystery". One button (Gift) appears selected by default with burgundy background and white text.
result: pass

### 2. Surprise Me Form Fields
expected: When you tap "Surprise" button, the form changes to show only a helper text message and an optional budget field. No URL, title, or priority fields visible.
result: issue
reported: "There should not be an option for budget here because that should be group specific."
severity: major

### 3. Mystery Box Form Fields
expected: When you tap "Mystery" button, the form shows helper text and 3 tier buttons (€25, €50, €100). Selecting a tier highlights it. No URL, title, or manual price fields.
result: issue
reported: "delete the 25 euros option. We will expand on what the 50 and 100 euro versions contain later"
severity: major

### 4. Add Surprise Me Item
expected: With "Surprise" selected, entering an optional budget and tapping Add creates an item. Success message confirms "Surprise Me item added".
result: issue
reported: "when tapping add it gets stuck in adding state - button shows 'Adding...' indefinitely"
severity: blocker

### 5. Add Mystery Box Item
expected: With "Mystery" selected and a tier chosen (e.g., €50), tapping Add creates an item. Success message confirms "Mystery Box added".
result: pass

### 6. Surprise Me Card Display
expected: On your wishlist, the Surprise Me item shows a burgundy "Surprise Me" badge, a question mark icon, and NO "View on Amazon" button.
result: skipped
reason: Cannot test - Surprise Me item add is blocked (Test 4)

### 7. Mystery Box Card Display
expected: On your wishlist, the Mystery Box item shows a gold "Mystery Box" badge with the tier price (e.g., €50), a gift icon, and NO "View on Amazon" button.
result: pass

### 8. Standard Gift Still Works
expected: Switching back to "Gift" type shows the normal form (URL, title, price, priority). Adding a standard gift still works as before with "View on Amazon" button visible on the card.
result: pass

## Summary

total: 8
passed: 4
issues: 3
pending: 0
skipped: 1

## Gaps

- truth: "Surprise Me form should not show budget field - budget is group-specific"
  status: failed
  reason: "User reported: There should not be an option for budget here because that should be group specific."
  severity: major
  test: 2
  root_cause: "Budget for Surprise Me incorrectly implemented as per-item field. Database has groups.budget_limit_per_gift which is correct place for budget constraints."
  artifacts:
    - path: "components/wishlist/AddItemModal.tsx"
      issue: "Lines 571-620 render budget input, line 44 budget state, line 117 surprise_me_budget in payload"
  missing:
    - "Remove budget input section (lines 571-620) from Surprise Me form"
    - "Remove surprise_me_budget from payload object"
  debug_session: ".planning/debug/surprise-me-budget-field.md"

- truth: "Mystery Box should only have €50 and €100 tier options (no €25)"
  status: failed
  reason: "User reported: delete the 25 euros option. We will expand on what the 50 and 100 euro versions contain later"
  severity: major
  test: 3
  root_cause: "Tier selector hardcoded to display all three options (€25, €50, €100). Type definition, UI array, and database constraint all include 25."
  artifacts:
    - path: "components/wishlist/AddItemModal.tsx"
      issue: "Line 18 MysteryBoxTier type includes 25, line 646 maps over [25,50,100]"
    - path: "supabase/migrations/20260202000011_schema_foundation.sql"
      issue: "Line 15 CHECK constraint allows 25"
    - path: "types/database.types.ts"
      issue: "Line 107 includes 25 in type"
  missing:
    - "Remove 25 from MysteryBoxTier type definition"
    - "Change tier array to [50, 100]"
    - "Update database CHECK constraint to (50, 100)"
    - "Update TypeScript types"
  debug_session: ""

- truth: "Adding Surprise Me item completes successfully"
  status: failed
  reason: "User reported: when tapping add it gets stuck in adding state - button shows 'Adding...' indefinitely"
  severity: blocker
  test: 4
  root_cause: "Database constraint violation - amazon_url column has NOT NULL constraint but Surprise Me items have no URL. Insert fails silently."
  artifacts:
    - path: "supabase/migrations/20260201000001_initial_schema.sql"
      issue: "Line 46 has amazon_url TEXT NOT NULL constraint"
    - path: "components/wishlist/AddItemModal.tsx"
      issue: "Lines 113,122 send empty string instead of null for special items"
  missing:
    - "Create migration to ALTER amazon_url DROP NOT NULL"
    - "Add smart CHECK: (item_type='standard' AND amazon_url IS NOT NULL) OR (item_type!='standard')"
    - "Update AddItemModal to use null instead of empty string"
    - "Update TypeScript types for amazon_url: string | null"
  debug_session: ".planning/debug/surprise-me-stuck-adding.md"
