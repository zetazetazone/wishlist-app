---
status: resolved
trigger: "Open Split button does nothing"
created: 2026-02-06T00:00:00Z
updated: 2026-02-06T00:14:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Handler wiring is incomplete between button and celebration page
test: Trace prop chain from ClaimButton → LuxuryWishlistCard → celebration page
expecting: Find missing prop connection or handler implementation
next_action: Read all files in prop chain starting with ClaimButton

## Symptoms

expected: Tapping "Open Split" button should trigger Alert.prompt for split contribution amount
actual: Button is visible but tapping has no effect
errors: None reported yet
reproduction: Navigate to celebration page, tap "Open Split" button on a claimed item
started: After Phase 21 implementation

## Eliminated

## Evidence

- timestamp: 2026-02-06T00:05:00Z
  checked: ClaimButton.tsx lines 47-64
  found: Button variant="openSplit" requires both variant prop AND onOpenSplit callback
  implication: If either is missing, button won't render openSplit variant

- timestamp: 2026-02-06T00:05:30Z
  checked: LuxuryWishlistCard.tsx lines 485-497
  found: ClaimButton is rendered with variant="openSplit" and onOpenSplit={handleOpenSplit}
  implication: Props ARE being passed correctly from card to button

- timestamp: 2026-02-06T00:06:00Z
  checked: LuxuryWishlistCard.tsx lines 174-197
  found: handleOpenSplit function exists and calls Alert.prompt with onOpenSplit?.(item.id, validCosts)
  implication: Local handler exists and should trigger prop callback

- timestamp: 2026-02-06T00:06:30Z
  checked: celebration/[id].tsx lines 62, 90, 922
  found: onOpenSplit prop is destructured (line 62, 90) and passed to card (line 922)
  implication: Prop is being threaded from page to card

- timestamp: 2026-02-06T00:07:00Z
  checked: celebration/[id].tsx lines 403-418
  found: handleOpenSplit function defined at line 404, calls openSplit RPC
  implication: Handler implementation exists in celebration page

- timestamp: 2026-02-06T00:07:30Z
  checked: ClaimButton condition at line 47
  found: Condition is `if (variant === 'openSplit' && onOpenSplit)`
  implication: Button checks for truthy onOpenSplit, not just existence

- timestamp: 2026-02-06T00:08:00Z
  checked: LuxuryWishlistCard props interface lines 62
  found: onOpenSplit is typed as `(itemId: string, additionalCosts?: number) => void`
  implication: Type signature matches celebration page handler

- timestamp: 2026-02-06T00:08:30Z
  checked: LuxuryWishlistCard rendering condition lines 485-497
  found: Button only renders when `isYourClaim && claim && !isCelebrant && !isSplitItem`
  implication: CRITICAL - All four conditions must be true for button to appear

- timestamp: 2026-02-06T00:09:00Z
  checked: celebration/[id].tsx claim assignment lines 886-909
  found: claim={!isCelebrant ? claim : null} - celebrant gets null claim
  implication: For non-celebrant, claim should have data if item is claimed

- timestamp: 2026-02-06T00:09:30Z
  checked: LuxuryWishlistCard line 104
  found: isSplitItem = claim?.claim_type === 'split' || splitStatus?.isOpen
  implication: If claim_type is already 'split', isSplitItem=true and openSplit button WON'T show

- timestamp: 2026-02-06T00:10:00Z
  checked: Symptom re-analysis
  found: User confirms button IS VISIBLE, just doesn't work when tapped
  implication: All render conditions are met, problem is in handler execution

- timestamp: 2026-02-06T00:10:30Z
  checked: LuxuryWishlistCard line 496
  found: onOpenSplit={handleOpenSplit} - passing local handler, not prop
  implication: CRITICAL BUG - Card defines its own handleOpenSplit (line 175) which calls onOpenSplit?.(item.id), but passes handleOpenSplit to ClaimButton instead of the prop callback directly

- timestamp: 2026-02-06T00:11:00Z
  checked: Handler chain
  found: ClaimButton receives handleOpenSplit → calls it → it calls onOpenSplit?.(item.id) → which should call celebration page's handleOpenSplit
  implication: Chain should work IF onOpenSplit prop is passed from celebration page

- timestamp: 2026-02-06T00:11:30Z
  checked: celebration/[id].tsx line 922
  found: onOpenSplit={handleOpenSplit} passed to LuxuryWishlistCard
  implication: Prop IS being passed, so chain should work

- timestamp: 2026-02-06T00:12:00Z
  checked: ClaimButton line 51
  found: onPress={loading ? undefined : onOpenSplit}
  implication: If loading=true, onPress is undefined and button doesn't respond

- timestamp: 2026-02-06T00:12:30Z
  checked: LuxuryWishlistCard line 494
  found: loading={claiming || false} passed to ClaimButton
  implication: If claiming state is true for this item, button is disabled

- timestamp: 2026-02-06T00:13:00Z
  checked: Alert.prompt cross-platform compatibility
  found: Alert.prompt is iOS-only API, not supported on Android
  implication: CONFIRMED ROOT CAUSE - On Android, Alert.prompt silently fails or does nothing, making button appear to do nothing

- timestamp: 2026-02-06T00:13:30Z
  checked: React Native documentation
  found: Alert.prompt explicitly documented as iOS-only feature
  implication: Need to replace with cross-platform solution like custom modal or @blazejkustra/react-native-alert

## Resolution

root_cause: Alert.prompt() is iOS-only and not supported on Android, causing the Open Split button to silently fail when tapped on Android devices
fix: Replace Alert.prompt with cross-platform solution (custom modal component or @blazejkustra/react-native-alert library)
verification: Test on Android device/emulator after replacement
files_changed: [components/wishlist/LuxuryWishlistCard.tsx]
