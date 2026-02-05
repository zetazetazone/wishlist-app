# Phase 19: Gift Claims UI - Research

**Researched:** 2026-02-05
**Domain:** React Native UI patterns for claim/unclaim workflows, visual state management, user role-based rendering
**Confidence:** HIGH

## Summary

Phase 19 implements the Gift Claims UI layer on top of the Phase 18 backend services. The core challenges are: (1) integrating claim/unclaim actions into existing `LuxuryWishlistCard` components, (2) managing three distinct visual contexts (celebrant sees "taken", claimer sees "your claim", other members see claimer details), and (3) handling loading states and race condition feedback gracefully.

The research confirms that the existing codebase patterns are sufficient for all requirements. The project already has:
- A mature card component (`LuxuryWishlistCard`) with conditional rendering by `item_type`
- A service layer (`lib/claims.ts`) with all necessary API functions
- Modal patterns (`AddItemModal`) for confirmation dialogs
- Badge patterns (`ItemTypeBadge`, `MostWantedBadge`) for visual indicators
- Animation patterns (`moti`) for loading and state transitions

No new libraries are required. The implementation uses React Native's built-in `Alert.alert()` for confirmation modals (per CONTEXT decision to use "modal confirmation"), small avatar components with tooltip/popup for claimer display, and list sorting to push claimed items to the bottom.

**Primary recommendation:** Extend `LuxuryWishlistCard` with claim-related props rather than creating a separate "claimable" card variant. This preserves the single card abstraction and simplifies the component API.

---

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Native | 0.81.5 | Core framework | Existing project foundation |
| moti | 0.30.0 | Animations | Already used in `LuxuryWishlistCard` for entry animations, loading states |
| @expo/vector-icons | 15.0.3 | Icons | Already used throughout; provides gift icon for "taken" indicator |
| @supabase/supabase-js | 2.93.3 | API client | Already used via `lib/claims.ts` |

### Supporting (Already in Project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-gesture-handler | 2.28.0 | Gestures | Already configured; used for touchable interactions |
| react-native-reanimated | 4.1.1 | Advanced animations | Available for loading spinner if needed |
| @gluestack-ui/themed | 1.1.73 | UI components | Already configured; has Tooltip component available |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `Alert.alert()` | Custom Modal | Alert.alert() is sufficient per CONTEXT decision; custom modal adds complexity |
| gluestack Tooltip | Custom popup component | Custom popup gives more styling control; gluestack Tooltip requires additional setup |
| FlatList with claimed-at-bottom | Manual sort | Manual sort is simpler; FlatList virtualization not needed for typical wishlist sizes (<100 items) |

**Installation:**
```bash
# No new packages required - all dependencies already installed
```

---

## Architecture Patterns

### Recommended Component Structure

```
components/
├── wishlist/
│   ├── LuxuryWishlistCard.tsx     # Extend with claim props (DO NOT duplicate)
│   ├── ClaimButton.tsx            # New: Claim/Unclaim button with loading state
│   ├── ClaimerAvatar.tsx          # New: Small avatar with tooltip on tap
│   ├── TakenBadge.tsx             # New: Gift icon badge for celebrant view
│   └── YourClaimIndicator.tsx     # New: "Your claim" highlight indicator
├── ui/
│   └── ConfirmDialog.tsx          # New: Reusable confirmation dialog wrapper
```

### Pattern 1: Role-Based Conditional Rendering

**What:** Render different UI elements based on viewer role (celebrant, claimer, other member)
**When to use:** Displaying claim status on wishlist item cards

```typescript
// Pattern for role-based claim display
interface ClaimDisplayProps {
  item: WishlistItem;
  currentUserId: string;
  itemOwnerId: string;  // The celebrant
  claim: ClaimWithUser | null;
  claimStatus: ItemClaimStatus | null;  // For celebrant view
}

function getClaimDisplay(props: ClaimDisplayProps) {
  const { item, currentUserId, itemOwnerId, claim, claimStatus } = props;

  // Celebrant viewing their own item
  if (currentUserId === itemOwnerId) {
    if (claimStatus?.is_claimed) {
      return { type: 'taken', showTakenBadge: true };
    }
    return { type: 'unclaimed' };
  }

  // Non-celebrant viewing: can see full claim details
  if (claim) {
    if (claim.claimed_by === currentUserId) {
      return { type: 'your_claim', claim, showYourClaimIndicator: true };
    }
    return { type: 'other_claim', claim, showClaimerAvatar: true };
  }

  // Not claimed: show claim button
  return { type: 'claimable', showClaimButton: true };
}
```

### Pattern 2: Loading State with Deliberate Feedback

**What:** Show loading spinner during claim operation before updating UI
**When to use:** When user taps Claim button (per CONTEXT: "Brief loading state when claiming")

```typescript
// Pattern for claim loading state
const [claiming, setClaiming] = useState(false);

const handleClaim = async (itemId: string) => {
  setClaiming(true);
  try {
    const result = await claimItem(itemId, 'full');
    if (!result.success) {
      Alert.alert('Unable to Claim', result.error || 'This item may already be claimed.');
    }
    // Refresh claims after operation
    await refreshClaims();
  } catch (error) {
    Alert.alert('Error', 'Failed to claim item. Please try again.');
  } finally {
    setClaiming(false);
  }
};
```

### Pattern 3: List Sorting with Claimed Items at Bottom

**What:** Sort wishlist items so unclaimed items appear first
**When to use:** Displaying celebrant's wishlist in celebration view

```typescript
// Pattern for sorting items with claims at bottom
function sortItemsWithClaimsAtBottom(
  items: WishlistItem[],
  claimsByItemId: Map<string, ClaimWithUser>,
  claimStatusByItemId: Map<string, boolean>,  // For celebrant view
  isCelebrantView: boolean
): WishlistItem[] {
  return [...items].sort((a, b) => {
    const aIsClaimed = isCelebrantView
      ? claimStatusByItemId.get(a.id) || false
      : claimsByItemId.has(a.id);
    const bIsClaimed = isCelebrantView
      ? claimStatusByItemId.get(b.id) || false
      : claimsByItemId.has(b.id);

    // Unclaimed items first
    if (aIsClaimed && !bIsClaimed) return 1;
    if (!aIsClaimed && bIsClaimed) return -1;

    // Within same claimed status, sort by priority (higher first)
    return (b.priority || 0) - (a.priority || 0);
  });
}
```

### Pattern 4: Tooltip/Popup for Claimer Avatar

**What:** Show claimer name when avatar is tapped
**When to use:** Non-celebrant viewing claimed items (per CONTEXT: "Tapping claimer avatar shows tooltip/popup with claimer's name")

```typescript
// Pattern for claimer avatar with popup
const [showTooltip, setShowTooltip] = useState(false);

return (
  <TouchableOpacity onPress={() => setShowTooltip(true)}>
    <Image source={{ uri: claimer.avatar_url }} style={styles.claimerAvatar} />
    {showTooltip && (
      <View style={styles.tooltipContainer}>
        <Text style={styles.tooltipText}>{claimer.display_name}</Text>
      </View>
    )}
  </TouchableOpacity>
);
```

### Anti-Patterns to Avoid

- **Duplicating LuxuryWishlistCard:** Do NOT create a separate "ClaimableWishlistCard". Extend the existing card with optional claim props.
- **Optimistic UI without error handling:** CONTEXT specifies loading spinner approach, not instant optimistic updates. Show spinner, then confirmed state.
- **Showing claimer identity to celebrant:** RLS blocks this, but UI must also never attempt to display claimer info when `currentUserId === itemOwnerId`.
- **Claiming surprise_me or mystery_box items:** The backend blocks this, but UI should also hide claim button for these item types.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialog | Custom full modal | `Alert.alert()` with buttons | Native feel, zero setup, per CONTEXT decision |
| Avatar display | Custom image component | Existing Image with fallback pattern from codebase | `MemberCard` already has this pattern |
| Loading spinner | Custom animation | `ActivityIndicator` or moti animation | Both already used in codebase |
| Claim/unclaim API calls | Direct supabase queries | `lib/claims.ts` functions | Already implemented in Phase 18-02 |
| Item type guards | Manual checks | `item.item_type !== 'standard'` | Schema enforces valid item_type values |

**Key insight:** The codebase already has all necessary patterns. Phase 19 is primarily integration work connecting existing UI patterns to existing service functions.

---

## Common Pitfalls

### Pitfall 1: Forgetting to Refresh After Claim Operation

**What goes wrong:** User claims item, but UI doesn't update until manual refresh
**Why it happens:** Forgetting to invalidate/refetch claims data after mutation
**How to avoid:** Always call refresh function after successful claim/unclaim
**Warning signs:** Item appears unclaimed after claiming until pull-to-refresh

```typescript
// CORRECT pattern
const handleClaim = async () => {
  const result = await claimItem(itemId, 'full');
  if (result.success) {
    await refreshClaims();  // <-- Essential
  }
};
```

### Pitfall 2: Displaying Claimer Avatar to Wrong User

**What goes wrong:** Celebrant somehow sees claimer identity
**Why it happens:** Not checking user role before rendering claimer avatar
**How to avoid:** Always gate claimer-display components on `currentUserId !== itemOwnerId`
**Warning signs:** RLS should block the data, but double-check UI conditions

### Pitfall 3: Race Condition Error Feedback

**What goes wrong:** Two users claim simultaneously, one gets confusing error
**Why it happens:** Backend returns error, but UI doesn't explain clearly
**How to avoid:** Per CONTEXT: "Claude's discretion for error feedback approach" -- show friendly message like "This item was just claimed by someone else"
**Warning signs:** Error message shows technical details like "unique_violation"

```typescript
// RECOMMENDED error handling
if (!result.success) {
  if (result.error?.includes('already claimed')) {
    Alert.alert('Already Claimed', 'Someone else just claimed this item.');
  } else {
    Alert.alert('Unable to Claim', result.error || 'Please try again.');
  }
}
```

### Pitfall 4: Not Hiding Claim Button for Special Items

**What goes wrong:** Claim button shows on surprise_me or mystery_box items
**Why it happens:** UI check missing, relying only on backend guard
**How to avoid:** Check `item.item_type === 'standard'` before rendering claim button
**Warning signs:** Backend error when trying to claim special items

### Pitfall 5: Celebrant Counter Mismatch

**What goes wrong:** "X of Y items taken" count doesn't match visible items
**Why it happens:** Not accounting for items without claims in the count
**How to avoid:** Calculate from actual `claimStatus` array length and items array length
**Warning signs:** Counter shows "3 of 10" but only 2 items appear visually as taken

---

## Code Examples

### Example 1: ClaimButton Component

```typescript
// Source: Follows existing LuxuryWishlistCard button pattern
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface ClaimButtonProps {
  onClaim: () => void;
  onUnclaim: () => void;
  isClaimed: boolean;
  isYourClaim: boolean;
  loading: boolean;
  disabled?: boolean;  // For special item types
}

export function ClaimButton({
  onClaim,
  onUnclaim,
  isClaimed,
  isYourClaim,
  loading,
  disabled
}: ClaimButtonProps) {
  if (disabled) return null;  // Don't show for surprise_me/mystery_box

  const handlePress = () => {
    if (loading) return;
    if (isClaimed && isYourClaim) {
      // This is the user's own claim - show unclaim
      onUnclaim();
    } else if (!isClaimed) {
      // Not claimed - show claim
      onClaim();
    }
    // If claimed by someone else, button shouldn't be pressable
  };

  // Button text/style varies by state
  const buttonText = loading
    ? ''
    : isClaimed && isYourClaim
      ? 'Unclaim'
      : 'Claim';

  const buttonStyle = isClaimed && isYourClaim
    ? { backgroundColor: colors.cream[300], borderWidth: 2, borderColor: colors.burgundy[300] }
    : { backgroundColor: colors.success, ...shadows.sm };

  return (
    <TouchableOpacity
      style={[{
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
        minHeight: 40,
      }, buttonStyle]}
      onPress={handlePress}
      disabled={loading || (isClaimed && !isYourClaim)}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <Text style={{
          color: isClaimed && isYourClaim ? colors.burgundy[700] : colors.white,
          fontWeight: '600',
          fontSize: 14,
        }}>
          {buttonText}
        </Text>
      )}
    </TouchableOpacity>
  );
}
```

### Example 2: TakenBadge Component (Celebrant View)

```typescript
// Source: Follows ItemTypeBadge pattern
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface TakenBadgeProps {
  style?: object;
}

export function TakenBadge({ style }: TakenBadgeProps) {
  // Gift icon for "taken" indicator per CONTEXT decision
  return (
    <View
      style={[{
        backgroundColor: colors.gold[100],
        padding: spacing.xs,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}
    >
      <MaterialCommunityIcons
        name="gift"
        size={18}
        color={colors.gold[600]}
      />
    </View>
  );
}
```

### Example 3: Confirmation Dialog Pattern

```typescript
// Source: React Native Alert API
import { Alert } from 'react-native';

function showClaimConfirmation(itemTitle: string, onConfirm: () => void) {
  Alert.alert(
    'Claim this item?',
    `You are about to claim "${itemTitle}". This lets others know you'll get this gift.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Claim', onPress: onConfirm },
    ],
    { cancelable: true }
  );
}

function showUnclaimConfirmation(itemTitle: string, onConfirm: () => void) {
  Alert.alert(
    'Unclaim this item?',
    `Release your claim on "${itemTitle}"? Someone else will be able to claim it.`,
    [
      { text: 'Keep Claim', style: 'cancel' },
      { text: 'Unclaim', style: 'destructive', onPress: onConfirm },
    ],
    { cancelable: true }
  );
}
```

### Example 4: ClaimerAvatar with Tooltip Popup

```typescript
// Source: Follows existing avatar patterns from MemberCard
import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Pressable, Modal } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface ClaimerAvatarProps {
  claimer: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  size?: number;
}

export function ClaimerAvatar({ claimer, size = 28 }: ClaimerAvatarProps) {
  const [showName, setShowName] = useState(false);

  return (
    <View>
      <TouchableOpacity onPress={() => setShowName(true)}>
        {claimer.avatar_url ? (
          <Image
            source={{ uri: claimer.avatar_url }}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 2,
              borderColor: colors.gold[300],
            }}
          />
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.burgundy[100],
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.gold[300],
            }}
          >
            <Text style={{ color: colors.burgundy[600], fontSize: size * 0.45, fontWeight: '600' }}>
              {(claimer.display_name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Simple popup on tap */}
      <Modal
        visible={showName}
        transparent
        animationType="fade"
        onRequestClose={() => setShowName(false)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}
          onPress={() => setShowName(false)}
        >
          <View style={{
            backgroundColor: colors.white,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderRadius: borderRadius.md,
            ...shadows.md,
          }}>
            <Text style={{ color: colors.burgundy[800], fontSize: 16, fontWeight: '600' }}>
              Claimed by {claimer.display_name || 'Unknown'}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
```

### Example 5: Celebrant Taken Counter

```typescript
// Source: Follows existing pattern from celebration/[id].tsx
interface TakenCounterProps {
  takenCount: number;
  totalCount: number;
}

export function TakenCounter({ takenCount, totalCount }: TakenCounterProps) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.gold[50],
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    }}>
      <MaterialCommunityIcons name="gift" size={16} color={colors.gold[600]} />
      <Text style={{
        marginLeft: spacing.xs,
        color: colors.gold[700],
        fontSize: 13,
        fontWeight: '600',
      }}>
        {takenCount} of {totalCount} items taken
      </Text>
    </View>
  );
}
```

---

## Visual States Summary

Per CONTEXT decisions, the card visual states are:

| Viewer | Item State | Visual Treatment |
|--------|------------|------------------|
| Celebrant | Unclaimed | Normal card |
| Celebrant | Claimed (by anyone) | Gift icon badge + dimmed/faded card |
| Non-celebrant (not claimer) | Unclaimed | Normal card + Claim button |
| Non-celebrant (not claimer) | Claimed by other | Claimer avatar (tappable) + no button |
| Non-celebrant (claimer) | Their own claim | "Your claim" highlight + Unclaim button |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom modal for confirmation | `Alert.alert()` | Standard practice | Simpler, native feel |
| Inline tooltips | Modal popup on tap | Mobile best practice | Better for touch targets |
| Optimistic UI | Loading spinner + confirmed state | Per CONTEXT decision | More deliberate user experience |

**Deprecated/outdated:**
- Optimistic UI for claim operations: CONTEXT explicitly requests loading spinner approach

---

## Integration Points

### Data Flow

1. **Celebration View (non-celebrant):**
   - Fetch claims via `getClaimsForItems(itemIds)` from `lib/claims.ts`
   - Returns claims with claimer profiles
   - Map to items for display

2. **My Wishlist View (celebrant):**
   - Fetch claim status via `getItemClaimStatus(itemIds)` from `lib/claims.ts`
   - Returns only boolean `is_claimed` per item
   - Show "taken" badge for claimed items

3. **Claim/Unclaim Actions:**
   - `claimItem(itemId, 'full')` for claiming
   - `unclaimItem(claimId)` for unclaiming
   - Both return `{ success, error?, claim_id? }`

### Where to Integrate Claim UI

| Screen | Current File | Integration |
|--------|--------------|-------------|
| Celebration Detail | `app/(app)/celebration/[id].tsx` | Add claim controls to wishlist cards in "Celebrant's Wishlist" section |
| My Wishlist | `app/(app)/(tabs)/wishlist-luxury.tsx` | Add "taken" badges and counter for celebrant's own view |
| Group Member View | (implicit via celebration) | Same as Celebration Detail |

---

## Open Questions

### Resolved by Research

1. **Modal vs Alert for confirmation:** Use `Alert.alert()` -- simpler, native feel, per CONTEXT decision
2. **Tooltip library:** Use custom Modal popup -- gluestack Tooltip available but custom gives more control
3. **New dependencies:** None required -- all patterns achievable with existing stack

### Remaining for Planner

1. **Exact button position on card:** Claude's discretion per CONTEXT. Research suggests bottom-right or inline with action buttons based on existing card layout.
2. **Avatar position on card:** Claude's discretion per CONTEXT. Research suggests top-right corner or next to title.
3. **"Your claim" visual treatment:** Claude's discretion per CONTEXT. Research suggests highlighted border + badge, similar to "Most Wanted" pattern.

---

## Sources

### Primary (HIGH confidence)
- Project codebase analysis: `components/wishlist/LuxuryWishlistCard.tsx` - existing card patterns
- Project codebase analysis: `lib/claims.ts` - service layer functions
- Project codebase analysis: `components/wishlist/ItemTypeBadge.tsx` - badge pattern
- Project codebase analysis: `app/(app)/celebration/[id].tsx` - wishlist display in celebration view
- [React Native Alert API](https://reactnative.dev/docs/alert) - confirmation dialog pattern

### Secondary (MEDIUM confidence)
- [gluestack-ui Tooltip](https://gluestack.io/ui/docs/components/tooltip) - available but not needed
- [Expo Router Modals](https://docs.expo.dev/router/advanced/modals/) - modal patterns reference

### Project Sources (HIGH confidence)
- Phase 18 Research: `.planning/phases/18-schema-atomic-functions/18-RESEARCH.md`
- Phase 19 Context: `.planning/phases/19-gift-claims-ui/19-CONTEXT.md`
- Types: `types/database.types.ts` - `GiftClaim`, `WishlistItem` types

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using only existing project dependencies
- Architecture: HIGH - extending existing patterns, not introducing new ones
- Visual states: HIGH - clearly defined in CONTEXT.md
- Integration points: HIGH - service layer already complete from Phase 18-02

**Research date:** 2026-02-05
**Valid until:** 60 days (stable React Native patterns, existing project architecture)
