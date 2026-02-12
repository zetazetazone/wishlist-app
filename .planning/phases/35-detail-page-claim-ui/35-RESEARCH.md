# Phase 35 Research: Detail Page & Claim UI

## Overview

Phase 35 creates the item detail page with full-bleed hero image and moves the claim UI from grid cards to the detail page. This completes the separation of concerns started in Phase 34 - grid cards for browsing, detail page for actions.

## Requirements Analysis

### From ROADMAP.md Success Criteria

1. Tapping grid card navigates to `/wishlist/[id]` detail page
2. Detail page shows full-bleed hero image extending from top
3. Detail page shows title, brand (parsed), price, and "Go to Store" button
4. Detail page shows favorite badge and priority stars
5. Header has back button and share/options button
6. Group members (except celebrant) can claim/unclaim from detail page
7. Split contributions UI displays progress on detail page
8. Celebrant sees "Taken" badge without claimer identity
9. Claim state syncs via Supabase realtime
10. Detail page loads in <200ms from grid tap

### From FEATURE-INVENTORY.md

Detail screen must support 4 view contexts:
- **Owner**: Full item details, no claim UI (own item)
- **Celebrant**: Item details + "Taken" badge (no claimer identity)
- **Claimer**: Item details + unclaim button + split controls
- **Viewer**: Item details + claim button + contribute button (for splits)

## Existing Infrastructure

### Navigation

Current route structure:
```
app/(app)/
├── (tabs)/
│   └── index.tsx (My Wishlist - owner view)
├── celebration/
│   └── [id].tsx (Celebration page - viewer/claimer/celebrant views)
└── wishlist/    # NEW - to be created
    └── [id].tsx (Item detail page)
```

### Grid Card Press Handlers

**index.tsx (My Wishlist)**:
```typescript
const handleWishlistItemPress = useCallback((item: WishlistItem) => {
  // TODO: router.push(`/wishlist/${item.id}`) in Phase 35
  console.log('Wishlist item pressed:', item.id);
}, []);
```

**celebration/[id].tsx**:
```typescript
const handleWishlistItemPress = useCallback((item: WishlistItem) => {
  // TODO: router.push(`/celebration/${id}/item/${item.id}`) in Phase 35
  console.log('Wishlist item pressed:', item.id, 'on celebration');
}, [id]);
```

### Claims Library (lib/claims.ts)

Provides:
- `claimItem(itemId, claimType, amount)` - Claim via RPC
- `unclaimItem(claimId)` - Unclaim via RPC
- `getItemClaimStatus(itemIds)` - Celebrant-safe status check
- `getClaimsForItems(itemIds)` - Full claim details for non-celebrants
- `ClaimWithUser` type - Claim with claimer profile info

### Contributions Library (lib/contributions.ts)

Provides split functionality:
- `getSplitStatus(itemId)` - Get split progress
- `getContributors(itemId)` - Get contributor list
- `getSuggestedShare(itemId)` - Calculate fair share
- `openSplit(itemId, additionalCosts)` - Open item for split
- `pledgeContribution(itemId, amount)` - Contribute to split
- `closeSplit(itemId)` - Cover remaining amount

### Existing Reusable Components

From `components/wishlist/`:
- `SplitContributionProgress.tsx` - Progress bar with celebrant privacy
- `ContributorsDisplay.tsx` - Contributor avatars and amounts
- `SplitModal.tsx` - Pledge contribution modal
- `OpenSplitModal.tsx` - Open split dialog
- `ClaimButton.tsx` - Claim/unclaim/split buttons
- `TakenBadge.tsx` - Celebrant-view "Taken" indicator
- `ClaimerAvatar.tsx` - Claimer profile display
- `MostWantedBadge.tsx` - Favorite badge
- `ClaimTimestamp.tsx` - When item was claimed

### Utilities (utils/wishlist.ts)

From Phase 33:
- `formatItemPrice(item)` - Price formatting for all item types
- `getImagePlaceholder(itemType)` - Placeholder icons for special items
- `parseBrandFromTitle(title)` - Extract brand name from title

## Technical Design

### Route Structure

Create new route: `app/(app)/wishlist/[id].tsx`

This route handles ALL contexts - the screen determines context based on:
1. Is current user the item owner? → Owner view
2. Is user viewing via celebration page? (passed as query param) → Check claim status
3. Is user the celebrant of that celebration? → Celebrant view
4. Does user have a claim on this item? → Claimer view
5. Otherwise → Viewer view

### Navigation Patterns

**From My Wishlist (owner)**:
```typescript
router.push(`/wishlist/${item.id}`)
// No extra params - owner context
```

**From Celebration Page (viewer/claimer/celebrant)**:
```typescript
router.push(`/wishlist/${item.id}?celebrationId=${celebrationId}`)
// celebrationId determines context lookup
```

### Data Fetching Strategy

**Single item fetch** (for owner view):
```typescript
const { data: item } = await supabase
  .from('wishlist_items')
  .select('*')
  .eq('id', itemId)
  .single();
```

**With claim context** (for celebration view):
```typescript
// 1. Fetch item
const item = await getWishlistItem(itemId);

// 2. Fetch claim status based on role
if (isCelebrant) {
  // Use RPC for celebrant-safe check
  const [status] = await getItemClaimStatus([itemId]);
  // Only get isTaken boolean
} else {
  // Full claim data
  const [claim] = await getClaimsForItems([itemId]);
  // Get claimer info, split status, etc.
}
```

### Hero Image Implementation

Using expo-image with full-bleed pattern:
```typescript
<Image
  source={{ uri: item.image_url }}
  style={styles.heroImage}
  contentFit="cover"
  cachePolicy="memory-disk"
  placeholder={{ blurhash: DEFAULT_BLURHASH }}
  transition={200}
/>

// Styles
heroImage: {
  width: '100%',
  height: SCREEN_HEIGHT * 0.45, // ~45% of screen
}
```

**Header overlay** - Transparent header with back button and options:
```typescript
<Stack.Screen
  options={{
    headerTransparent: true,
    headerTitle: '',
    headerLeft: () => <BackButton />,
    headerRight: () => <OptionsButton />,
  }}
/>
```

### Realtime Subscription

Subscribe to claim changes for the specific item:
```typescript
useEffect(() => {
  if (!itemId || isOwner) return;

  const channel = supabase
    .channel(`claim-${itemId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'gift_claims',
        filter: `wishlist_item_id=eq.${itemId}`,
      },
      (payload) => {
        // Refetch claim data on change
        loadClaimData();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [itemId, isOwner]);
```

### Performance Considerations

**Target: <200ms load time**

1. **Parallel data fetching**:
   ```typescript
   const [item, claim, splitStatus, contributors] = await Promise.all([
     getWishlistItem(itemId),
     getClaimsForItems([itemId]),
     getSplitStatus(itemId),
     getContributors(itemId),
   ]);
   ```

2. **Image preloading** (optional for Phase 36):
   - Preload detail image when grid card comes into view
   - Use expo-image's prefetch API

3. **Skeleton loading**:
   - Show skeleton UI while data loads
   - Hero image placeholder with blurhash

## Plan Breakdown

### 35-01: ItemDetailScreen Foundation
- Create route `app/(app)/wishlist/[id].tsx`
- Hero image with expo-image
- Item info section (title, brand, price, description)
- Priority stars display
- "Go to Store" button (opens URL)
- Transparent header with back button
- Loading and error states

### 35-02: Claim UI Integration
- Add claim context detection
- Integrate existing ClaimButton component
- Integrate SplitContributionProgress
- Integrate ContributorsDisplay
- Integrate SplitModal and OpenSplitModal
- Celebrant privacy (TakenBadge only)
- Claimer controls (unclaim, open split, close split)
- Viewer actions (claim, contribute)

### 35-03: Navigation & Realtime
- Wire up grid card onPress to navigate
- Pass celebrationId context where needed
- Add Supabase realtime subscription
- Handle claim state refresh
- Test all 4 view contexts
- Verify <200ms performance target

## File Changes Summary

### New Files
- `app/(app)/wishlist/[id].tsx` - Item detail screen

### Modified Files
- `app/(app)/(tabs)/index.tsx` - Add navigation handler
- `app/(app)/celebration/[id].tsx` - Add navigation handler with context

### Existing Components (Reused)
- All wishlist components listed above
- No modifications needed to existing claim/split components
