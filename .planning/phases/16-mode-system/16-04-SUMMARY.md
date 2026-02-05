---
meta:
  phase: 16-mode-system
  plan: 04
  title: "Gap closure: fix GroupModeBadge width"
  type: gap_closure
  subsystem: ui-components
  tags: [react-native, flexbox, layout, badge, gap-closure]

dependency-graph:
  requires: ["16-01"]
  provides: ["Compact GroupModeBadge layout"]
  affects: ["17"]

tech-stack:
  added: []
  patterns:
    - "alignSelf: flex-start for content-sized badges inside flex parents"

file-tracking:
  key-files:
    modified:
      - "components/groups/GroupModeBadge.tsx"

decisions:
  - id: "16-04-01"
    decision: "alignSelf flex-start on badge View (not parent container change)"
    rationale: "Fix belongs in the badge component itself for all contexts, not just GroupCard"

metrics:
  duration: "<1 min"
  completed: "2026-02-05"
---

# Phase 16 Plan 04: Fix GroupModeBadge Width (Gap Closure) Summary

**One-liner:** alignSelf flex-start on GroupModeBadge View to prevent full-width stretch inside flex parents

## What Was Done

Added `alignSelf: 'flex-start'` to the badge's root View style in `GroupModeBadge.tsx`. This constrains the badge to its content width instead of inheriting the full width from parent containers with `flex: 1`.

## Root Cause

GroupCard's text container (line 42) has `flex: 1`, which causes all children -- including GroupModeBadge -- to stretch to full width. The badge had `flexDirection: 'row'` but no self-constraint, so it expanded to fill available space.

## Task Log

1. **Task 1: Add alignSelf to GroupModeBadge** - `8b29a99` (fix)
   - Added `alignSelf: 'flex-start'` at line 34 of GroupModeBadge.tsx
   - Single-line change, no side effects on other badge consumers

## Files Modified

- `components/groups/GroupModeBadge.tsx` - Added alignSelf: 'flex-start' to View style

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- Badge View now has alignSelf constraint preventing stretch
- Change is safe for all 4 usage contexts: GroupCard, GroupViewHeader, celebration page, settings page
- alignSelf: 'flex-start' is a standard React Native layout pattern for content-sized elements

## Impact

- GroupCard on home screen: badge now compact around icon + text
- GroupViewHeader: no visual change (already constrained by parent)
- Celebration page: no visual change (already constrained by parent)
- Settings page: no visual change (already constrained by parent)
