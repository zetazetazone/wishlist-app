---
phase: 21
plan: 06
subsystem: ui-claims
tags: [gap-closure, cross-platform, uat-fixes]

dependency_graph:
  requires: [21-05]
  provides: [cross-platform-open-split, consistent-invite-codes, celebrant-taken-view, claim-timestamps]
  affects: []

tech_stack:
  added: []
  patterns: [bottom-sheet-modal-pattern]

key_files:
  created:
    - components/wishlist/OpenSplitModal.tsx
  modified:
    - components/wishlist/LuxuryWishlistCard.tsx
    - app/group/[id]/index.tsx
    - app/(app)/celebration/[id].tsx
    - types/database.types.ts

decisions:
  - id: "21-06-01"
    decision: "OpenSplitModal follows SplitModal pattern"
    rationale: "Consistent UX, reusable bottom sheet modal with TextInput"
  - id: "21-06-02"
    decision: "Use created_at not claimed_at for timestamp"
    rationale: "GiftClaim type uses created_at field for claim timestamp"

metrics:
  duration: "4 minutes"
  completed: "2026-02-06"
---

# Phase 21 Plan 06: Gap Closure Summary

**One-liner:** Fixed 4 UAT issues: cross-platform Open Split modal, invite code consistency, celebrant Taken status, and claim timestamps.

## What Was Built

This gap closure plan resolved all diagnosed UAT issues from Phase 21 verification testing.

### Issue 1: Open Split Button (Android)
**Problem:** Alert.prompt() is iOS-only, causing Open Split to silently fail on Android.

**Solution:** Created `OpenSplitModal.tsx` component following the SplitModal pattern:
- BottomSheetModal with TextInput for additional costs
- Cross-platform (works on iOS and Android)
- Same UX: optional amount entry, Cancel/Open Split buttons

### Issue 2: Invite Code Inconsistency
**Problem:** Group screen was showing UUID instead of 6-character invite code.

**Solution:**
- Changed `handleShare` to use `group.invite_code`
- Changed `copyInviteCode` to display `group.invite_code`
- Added `invite_code` to Group type (was missing from generated types)

### Issue 3: Celebrant Taken Status
**Problem:** Celebrant not seeing "Taken" badge on claimed items.

**Solution:** Added missing props to LuxuryWishlistCard in celebration page:
- `isTaken={isCelebrant && !!claim}` - Shows Taken badge
- `dimmed={isCelebrant && !!claim}` - Dims taken items

### Issue 4: Clock Icon Missing
**Problem:** ClaimTimestamp component existed but was never integrated.

**Solution:**
- Imported ClaimTimestamp in LuxuryWishlistCard
- Rendered in actions row after ClaimerAvatar (non-celebrant only)
- Uses `created_at` field from GiftClaim type

## Commits

| Hash | Type | Description |
|------|------|-------------|
| b22ff50 | feat | Replace Alert.prompt with cross-platform OpenSplitModal |
| 73de223 | fix | Use invite_code instead of group.id in share message |
| 918643d | fix | Add isTaken prop and ClaimTimestamp to celebration view |

## Files Changed

### Created
- `components/wishlist/OpenSplitModal.tsx` - Cross-platform modal for Open Split

### Modified
- `components/wishlist/LuxuryWishlistCard.tsx` - Added OpenSplitModal, ClaimTimestamp integration
- `app/group/[id]/index.tsx` - Changed to use invite_code
- `app/(app)/celebration/[id].tsx` - Added isTaken and dimmed props
- `types/database.types.ts` - Added invite_code to Group type

## UAT Resolution

| UAT Test | Before | After |
|----------|--------|-------|
| Test 2: Open Split | FAIL (Android) | PASS |
| Test 9: Invite Code | FAIL | PASS |
| Test 11: Celebrant Taken | FAIL | PASS |
| Clock icon | Missing | PASS |

## Decisions Made

1. **OpenSplitModal pattern:** Followed existing SplitModal pattern for consistency and reusability
2. **Timestamp field:** Used `created_at` from GiftClaim (not `claimed_at` which doesn't exist)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing invite_code in Group type**
- **Found during:** Task 2
- **Issue:** TypeScript error - invite_code not in GroupWithMembers type
- **Fix:** Added invite_code to groups Row type in database.types.ts
- **Files modified:** types/database.types.ts
- **Commit:** 73de223

**2. [Rule 1 - Bug] Wrong timestamp field name**
- **Found during:** Task 3
- **Issue:** GiftClaim uses `created_at` not `claimed_at`
- **Fix:** Changed ClaimTimestamp to use `claim.created_at`
- **Files modified:** components/wishlist/LuxuryWishlistCard.tsx
- **Commit:** 918643d

## Next Phase Readiness

Phase 21 is now complete with all UAT issues resolved. Ready for Phase 22 or v1.3 release.

### Verification Checklist
- [x] TypeScript compiles (only pre-existing errors)
- [x] All 4 UAT issues addressed
- [x] Cross-platform Open Split modal works
- [x] Invite code uses proper column
- [x] Celebrant sees Taken badge
- [x] Clock icon shows for non-celebrants
