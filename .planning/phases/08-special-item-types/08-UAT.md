---
status: complete
phase: 08-special-item-types
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md]
started: 2026-02-03T10:15:00Z
updated: 2026-02-03T10:30:00Z
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
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Mystery Box should only have €50 and €100 tier options (no €25)"
  status: failed
  reason: "User reported: delete the 25 euros option. We will expand on what the 50 and 100 euro versions contain later"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Adding Surprise Me item completes successfully"
  status: failed
  reason: "User reported: when tapping add it gets stuck in adding state - button shows 'Adding...' indefinitely"
  severity: blocker
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
