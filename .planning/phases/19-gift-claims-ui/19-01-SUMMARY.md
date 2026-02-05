---
phase: 19-gift-claims-ui
plan: 01
subsystem: ui-components
tags: [react-native, claims, components, ui]

dependency-graph:
  requires: [18-02]
  provides: [ClaimButton, ClaimerAvatar, TakenBadge, YourClaimIndicator]
  affects: [19-02, 19-03]

tech-stack:
  added: []
  patterns: [role-based-rendering, modal-popup, badge-component]

files:
  created:
    - components/wishlist/ClaimButton.tsx
    - components/wishlist/ClaimerAvatar.tsx
    - components/wishlist/TakenBadge.tsx
    - components/wishlist/YourClaimIndicator.tsx
  modified: []

decisions:
  - id: button-states
    choice: "Three visual states: claim (gold), unclaim (outline), loading (spinner)"
    rationale: "Per CONTEXT: loading spinner during claim operation, Unclaim button when user owns claim"
  - id: avatar-popup
    choice: "Modal overlay with backdrop dismissal for claimer name"
    rationale: "Per RESEARCH: Modal popup gives more control than tooltip, better for touch targets"
  - id: taken-badge-icon
    choice: "Gift icon in gold colors, no text"
    rationale: "Per CONTEXT: 'Gift icon for taken indicator' (not text badge or checkmark)"
  - id: your-claim-badge
    choice: "MostWantedBadge pattern with burgundy colors"
    rationale: "Consistent with existing badge patterns, burgundy indicates user-specific status"

metrics:
  duration: "~5 minutes"
  completed: "2026-02-05"
---

# Phase 19 Plan 01: Core Claim Components Summary

Four UI building blocks for claim functionality, ready for card integration.

## One-liner

Created ClaimButton (claim/unclaim/loading), ClaimerAvatar (tappable with name popup), TakenBadge (gift icon), and YourClaimIndicator (badge) components.

## What Was Built

### ClaimButton (`components/wishlist/ClaimButton.tsx`)
- **Props:** onClaim, onUnclaim, isClaimed, isYourClaim, loading, disabled
- **Visual states:**
  - Not claimed: Gold/success background, "Claim" text
  - Your claim: Cream background with burgundy border, "Unclaim" text
  - Loading: ActivityIndicator spinner
  - Disabled: Returns null (for surprise_me/mystery_box items)
- **Exports:** `ClaimButton` (named), `default`

### TakenBadge (`components/wishlist/TakenBadge.tsx`)
- **Props:** style (optional ViewStyle for positioning)
- **Display:** MaterialCommunityIcons "gift" icon (size 18, gold[600] color)
- **Background:** gold[100], circular (borderRadius.full)
- **Purpose:** Celebrant view "taken" indicator (no claimer identity revealed)
- **Exports:** `TakenBadge` (named), `default`

### ClaimerAvatar (`components/wishlist/ClaimerAvatar.tsx`)
- **Props:** claimer ({ id, display_name, avatar_url }), size (default 28)
- **Features:**
  - Avatar image or initial-based placeholder
  - Gold border (gold[300]) for visual distinction
  - Tappable: shows Modal with "Claimed by {name}"
  - Pressable backdrop to dismiss popup
- **Exports:** `ClaimerAvatar` (named), `default`

### YourClaimIndicator (`components/wishlist/YourClaimIndicator.tsx`)
- **Props:** style (optional ViewStyle)
- **Display:** "Your claim" text badge
- **Style:** burgundy[100] background, burgundy[700] text
- **Pattern:** Follows MostWantedBadge structure
- **Exports:** `YourClaimIndicator` (named), `default`

## Commits

| Hash | Message |
|------|---------|
| 0848cdc | feat(19-01): add ClaimButton and TakenBadge components |
| 5617a4a | feat(19-01): add ClaimerAvatar and YourClaimIndicator components |

## Decisions Made

1. **Button visual states**: Three distinct states per CONTEXT requirements (claim/unclaim/loading), with disabled returning null for special item types
2. **Avatar popup implementation**: Used Modal with transparent backdrop rather than tooltip component for better touch target handling and consistent dismissal
3. **Taken badge icon only**: Gift icon without text per CONTEXT ("not text badge or checkmark")
4. **Your claim badge pattern**: Followed existing MostWantedBadge pattern with burgundy colors for visual consistency

## Deviations from Plan

None - plan executed exactly as written.

## What's Next

- **19-02:** Extend LuxuryWishlistCard with claim props to integrate these components
- **19-03:** Wire up claim actions and celebration view integration

## Technical Notes

- All components use theme constants (colors, spacing, borderRadius, shadows)
- StyleSheet.create used for style definitions (performance optimization)
- Both named and default exports for flexibility
- No new dependencies added

## Must-Have Verification

| # | Truth | Status |
|---|-------|--------|
| 1 | ClaimButton shows Claim text when item unclaimed | PASS |
| 2 | ClaimButton shows Unclaim text when user owns the claim | PASS |
| 3 | ClaimButton shows loading spinner during claim operation | PASS |
| 4 | TakenBadge displays gift icon in gold colors | PASS |
| 5 | ClaimerAvatar shows tappable avatar that reveals name popup | PASS |

| # | Artifact | Exports | Status |
|---|----------|---------|--------|
| 1 | components/wishlist/ClaimButton.tsx | ClaimButton | PASS |
| 2 | components/wishlist/ClaimerAvatar.tsx | ClaimerAvatar | PASS |
| 3 | components/wishlist/TakenBadge.tsx | TakenBadge | PASS |
| 4 | components/wishlist/YourClaimIndicator.tsx | YourClaimIndicator | PASS |

| # | Key Link | Pattern | Status |
|---|----------|---------|--------|
| 1 | ClaimButton.tsx -> constants/theme | import.*from.*constants/theme | PASS |
