---
status: investigating
trigger: "GroupModeBadge stretches too wide across GroupCard on home screen - should be compact"
created: 2026-02-05T00:00:00Z
updated: 2026-02-05T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Parent container has flex: 1 causing badge to stretch
test: Analyzed component hierarchy and styling
expecting: Badge should have alignSelf: 'flex-start' to prevent stretch
next_action: Report findings to user

## Symptoms

expected: Compact badge fitting snugly around icon + text ("Gifts"/"Greetings")
actual: Badge stretches wide across entire card width
errors: None - cosmetic UI issue
reproduction: View group cards on home screen
started: User reported - cosmetic issue

## Eliminated

- hypothesis: Badge component itself has width: '100%' or flex: 1
  evidence: GroupModeBadge.tsx (lines 30-38) has no width/flex properties - only flexDirection: 'row'
  timestamp: 2026-02-05

## Evidence

- timestamp: 2026-02-05
  checked: GroupCard.tsx lines 42-54
  found: Parent View has `flex: 1` (line 42) which forces child elements to stretch
  implication: Badge inherits full width from flex: 1 parent container

- timestamp: 2026-02-05
  checked: GroupModeBadge.tsx lines 30-38
  found: Badge View has flexDirection: 'row' but no alignSelf property
  implication: Badge takes full width of parent without self-constraint

## Resolution

root_cause: Parent container at line 42 in GroupCard.tsx has `flex: 1` which causes all children (including GroupModeBadge) to stretch to full width. The badge needs `alignSelf: 'flex-start'` to constrain itself to content width.

fix: Add `alignSelf: 'flex-start'` to the View style in GroupModeBadge.tsx at line 31 (inside the style object)

verification: Badge should render compact, fitting only icon + text width

files_changed: [components/groups/GroupModeBadge.tsx]
