---
status: complete
phase: 21-split-contributions-claim-enhancements
source: [21-01-SUMMARY.md, 21-02-SUMMARY.md, 21-03-SUMMARY.md, 21-04-SUMMARY.md, 21-05-SUMMARY.md]
started: 2026-02-06T12:00:00Z
updated: 2026-02-06T17:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Claim a wishlist item
expected: On a celebration page (not your own), tap an unclaimed wishlist item's Claim button. The item should show as "Your claim" with a gift icon badge. Other group members should see your name/avatar as the claimer.
result: pass

### 2. Open split on your claimed item
expected: On an item you've claimed, tap "Open Split" button. A prompt should ask for additional costs (shipping, etc). After confirming, the item shows as a split-open item with $0 of $[price] funded.
result: issue
reported: "open for split button does nothing"
severity: major

### 3. View split progress as group member
expected: As a different group member (not celebrant), view the split item. You should see a progress bar showing current funding amount vs total, e.g. "$25 of $100".
result: skipped
reason: Blocked by Open Split issue (test 2)

### 4. Pledge contribution to split
expected: As a group member (not claimer/celebrant), tap "Contribute" on a split item. A modal appears with amount input and suggested split. Enter an amount and confirm. Your contribution should be recorded.
result: skipped
reason: Blocked by Open Split issue (test 2) and invite code bug preventing member addition

### 5. See suggested split amount
expected: When opening the contribute modal, a "Suggested: $X" button should appear showing an equal split among remaining contributors. Tapping it fills the amount field.
result: skipped
reason: Blocked by Open Split issue (test 2)

### 6. See contributor avatars with amounts
expected: On a split item with contributions, you should see avatar circles for each contributor. Tapping an avatar shows a modal with "Name contributed $X" for each person.
result: skipped
reason: Blocked by Open Split issue (test 2)

### 7. Close split as claimer
expected: As the original claimer, tap "Close Split" on your split item. The remaining unfunded amount should be covered by you. The item shows as fully funded.
result: skipped
reason: Blocked by Open Split issue (test 2)

### 8. Claim summary in celebration header
expected: As a non-celebrant viewing a celebration page, the header shows a claim summary like "3 of 8 items claimed" with an icon that changes color based on completion (green if all claimed, burgundy if partial).
result: pass

### 9. Celebrant sees "Taken" with no amounts
expected: As the celebrant viewing your own celebration page, claimed/split items show only "Taken" or "In Progress" — no dollar amounts, no contributor names, no percentages visible.
result: issue
reported: "items don't show as claimed/taken/in progress"
severity: major

### 10. Cannot unclaim item with contributions
expected: If you have a split item where others have contributed, trying to unclaim should show an error message like "Cannot unclaim: item has contributions from other members".
result: skipped
reason: Blocked by Open Split issue (test 2)

### 11. Claim timestamp tap-to-reveal
expected: On a claimed item, there should be a clock icon. Tapping it reveals when the item was claimed (relative time like "2 hours ago" or exact date if older than 7 days).
result: issue
reported: "no clock icon shown on claimed items"
severity: minor

### 12. Full vs split claim icon distinction
expected: Items you've fully claimed show a gift icon badge. Items where you've contributed to a split show a gift-open icon. The label also differs: "Your claim" vs "Your split".
result: skipped
reason: Split portion blocked by Open Split issue (test 2)

### 13. Claim status refreshes on tab focus
expected: On My Wishlist tab, navigate away to another tab, then return. The "taken" count and claim statuses should refresh automatically without manual pull-to-refresh.
result: issue
reported: "no taken count in My Wishlist tab and claimed items not showing on cards"
severity: major

## Summary

total: 13
passed: 2
issues: 5
pending: 0
skipped: 7

## Gaps

- truth: "Open Split button prompts for additional costs and converts claim to split-open state"
  status: failed
  reason: "User reported: open for split button does nothing"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Invite code is consistent between group screen and group settings"
  status: failed
  reason: "User reported: invite code function not working, invite code from group screen differs from group settings"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Celebrant sees claimed items marked as Taken or In Progress"
  status: failed
  reason: "User reported: items don't show as claimed/taken/in progress"
  severity: major
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Clock icon appears on claimed items for tap-to-reveal timestamp"
  status: failed
  reason: "User reported: no clock icon shown on claimed items"
  severity: minor
  test: 11
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "My Wishlist tab shows taken count and claimed item indicators"
  status: failed
  reason: "User reported: no taken count in My Wishlist tab and claimed items not showing on cards"
  severity: major
  test: 13
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
