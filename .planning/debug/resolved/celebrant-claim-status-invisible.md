---
status: resolved
trigger: "Celebrant items don't show as claimed/taken/in progress"
created: 2026-02-06T00:00:00Z
updated: 2026-02-06T00:03:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: CONFIRMED - isTaken prop never passed to LuxuryWishlistCard
test: verified celebration/[id].tsx lines 897-925
expecting: root cause identified
next_action: document resolution

## Symptoms

expected: Celebrant viewing their own celebration page should see "Taken" badge on claimed items
actual: Claimed items show no status indicator at all
errors: None reported
reproduction: Log in as celebrant, view own celebration page with claimed items
started: Phase 21 implementation (split contributions)

## Eliminated

## Evidence

- timestamp: 2026-02-06T00:01:00Z
  checked: LuxuryWishlistCard.tsx line 362
  found: TakenBadge rendered when isTaken={true}
  implication: component logic correct, badge shows when prop is true

- timestamp: 2026-02-06T00:01:30Z
  checked: celebration/[id].tsx lines 897-925
  found: LuxuryWishlistCard receives claim, isYourClaim, isCelebrant props BUT no isTaken prop
  implication: isTaken prop never passed to card component for celebrant view

- timestamp: 2026-02-06T00:02:00Z
  checked: celebration/[id].tsx line 908
  found: claim={!isCelebrant ? claim : null} - claim is nullified for celebrant
  implication: claim data is available but intentionally hidden from celebrant

- timestamp: 2026-02-06T00:02:30Z
  checked: celebration/[id].tsx lines 885-887
  found: claim variable computed from getClaimForItem(item.id), available for all users
  implication: claim data exists, just needs to be passed as isTaken={!!claim} for celebrant view

## Resolution

root_cause: celebration/[id].tsx lines 897-925 - LuxuryWishlistCard component receives isCelebrant prop but is missing the isTaken prop, which is required to display TakenBadge for claimed items in celebrant view
fix: Add isTaken={isCelebrant && !!claim} prop to LuxuryWishlistCard at line 910 (after isCelebrant prop)
verification: Celebrant should see gold gift icon (TakenBadge) on claimed items while still not seeing claimer identity
files_changed:
  - app/(app)/celebration/[id].tsx
