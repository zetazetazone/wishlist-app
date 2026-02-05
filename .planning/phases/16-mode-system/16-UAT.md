---
status: diagnosed
phase: 16-mode-system
source: [16-01-SUMMARY.md, 16-02-SUMMARY.md, 16-03-SUMMARY.md]
started: 2026-02-05T13:30:00Z
updated: 2026-02-05T13:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Mode Badge on Group Card (Home Screen)
expected: On the home screen, each group card displays a mode badge. Groups in "Gifts" mode show a burgundy badge. Groups in "Greetings" mode show a gold badge. No budget text appears on the card.
result: issue
reported: "badge should fit to contents - badge stretches wide across the card instead of being compact around icon+text"
severity: cosmetic

### 2. Favorite Preview Hidden in Greetings Mode
expected: In a Greetings-mode group, member cards do NOT show favorite item previews. In a Gifts-mode group, member cards still show favorite previews as before.
result: pass

### 3. Admin Mode Switch in Settings
expected: As a group admin, open group settings. Between "Group Info" and "Members" sections, there's a "Mode" section with two side-by-side cards (Greetings and Gifts). The current mode card is highlighted (gold for Greetings, burgundy for Gifts).
result: skipped
reason: expo-clipboard native module error crashes settings screen (pre-existing Phase 15 issue, requires development client build)

### 4. Mode Switch Confirmation Dialog
expected: Tap on the inactive mode card. A confirmation dialog appears warning about features that will be hidden or shown. Switching to Greetings warns about hiding wishlists, Gift Leader, and contributions. Confirming updates the mode immediately.
result: skipped
reason: expo-clipboard native module error crashes settings screen (pre-existing Phase 15 issue, requires development client build)

### 5. Non-Admin Mode View in Settings
expected: As a non-admin member, open group settings. The Mode section shows the current mode badge (read-only GroupModeBadge). There are no toggle cards or switch options.
result: skipped
reason: expo-clipboard native module error crashes settings screen (pre-existing Phase 15 issue, requires development client build)

### 6. Celebration Page in Greetings Mode
expected: Open a celebration in a Greetings-mode group. The page shows a birthday card layout: large avatar with gold border, celebrant name, birthday date, countdown text, a warm message, and a "Send a Greeting" button (shows "Coming Soon" when tapped). Gift Leader, Contributions, Wishlist, and History sections are NOT visible. Chat toggle is still accessible.
result: skipped
reason: Test greetings group has no members/celebrations to test with (needs mock users)

### 7. Celebration Page in Gifts Mode
expected: Open a celebration in a Gifts-mode group. The page shows the normal gifts layout with Gift Leader, Contributions, Wishlist, and History sections visible. A subtle mode badge appears in the header.
result: skipped
reason: Test greetings group has no members/celebrations to test with (needs mock users for greetings comparison)

## Summary

total: 7
passed: 1
issues: 1
pending: 0
skipped: 5

## Gaps

- truth: "Mode badge on GroupCard should be compact, fitting snugly around its content (icon + text)"
  status: failed
  reason: "User reported: badge should fit to contents - badge stretches wide across the card instead of being compact around icon+text"
  severity: cosmetic
  test: 1
  root_cause: "GroupModeBadge View missing alignSelf: 'flex-start' — inherits full width from flex:1 parent in GroupCard"
  artifacts:
    - path: "components/groups/GroupModeBadge.tsx"
      issue: "Line 31: View style missing alignSelf: 'flex-start'"
    - path: "components/groups/GroupCard.tsx"
      issue: "Line 42: Parent View has flex: 1 causing badge to stretch"
  missing:
    - "Add alignSelf: 'flex-start' to GroupModeBadge View style"
  debug_session: ".planning/debug/group-mode-badge-stretch.md"
