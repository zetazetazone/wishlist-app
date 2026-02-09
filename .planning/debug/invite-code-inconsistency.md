---
status: resolved
trigger: "Invite code inconsistent between group screen and group settings"
created: 2026-02-06T00:00:00Z
updated: 2026-02-06T00:01:04Z
---

## Current Focus

hypothesis: Both screens fetch invite_code but one uses cached/stale data
test: Compare data fetching patterns in both screens
expecting: Different refresh strategies or cache usage
next_action: Read both screen files and group utility functions

## Symptoms

expected: Same invite code displayed on both group screen and group settings
actual: Different invite codes shown on each screen
errors: None reported
reproduction: View group screen, then view group settings - codes differ
started: Blocking split contribution testing (needs test members)

## Eliminated

## Evidence

- timestamp: 2026-02-06T00:01:00Z
  checked: app/group/[id]/index.tsx lines 122-123
  found: Using `group.id` (UUID) as invite code in share message
  implication: Group screen shows UUID instead of actual invite_code

- timestamp: 2026-02-06T00:01:01Z
  checked: app/group/[id]/settings.tsx line 669
  found: Using `group.invite_code` from database
  implication: Settings screen correctly shows actual invite_code column

- timestamp: 2026-02-06T00:01:02Z
  checked: utils/groups.ts fetchGroupDetails function
  found: Does NOT select invite_code column (line 170)
  implication: Group detail screen never receives invite_code data

- timestamp: 2026-02-06T00:01:03Z
  checked: app/group/[id]/settings.tsx loadSettingsData function
  found: Explicitly selects invite_code column (line 90)
  implication: Settings screen gets invite_code, detail screen does not

## Resolution

root_cause: Group detail screen uses group.id (UUID) as invite code because fetchGroupDetails() does not fetch the invite_code column from database
fix: Add invite_code to the SELECT query in utils/groups.ts fetchGroupDetails() and use it in index.tsx
verification: Verify both screens show same 6-character invite code after fix
files_changed: [
  "utils/groups.ts - add invite_code to fetchGroupDetails SELECT",
  "app/group/[id]/index.tsx - use group.invite_code instead of group.id"
]
