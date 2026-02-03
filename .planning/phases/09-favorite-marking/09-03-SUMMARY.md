---
phase: 09
plan: 03
subsystem: ui-features
tags: [celebrations, wishlist, favorites, react-native]
requires: [09-01, 09-02]
provides: [celebrant-wishlist-view]
affects: []
tech-stack:
  added: []
  patterns: [viewer-only-cards, favorite-display-without-interaction]
key-files:
  created:
    - lib/wishlistItems.ts
  modified:
    - app/(app)/celebration/[id].tsx
key-decisions:
  - "showFavoriteHeart=false for viewing others' wishlists"
  - "Celebrant favorite shown in celebration info view"
  - "No interactive elements on celebrant's wishlist cards"
duration: 5 min
completed: 2026-02-03
---

# Phase 9 Plan 03: Celebrant Wishlist Display Summary

**One-liner:** Celebrant's wishlist display in celebration screen with favorite highlighting (gold border, MostWantedBadge) but no heart interaction

## What Was Built

Added celebrant's wishlist section to the celebration info view:

1. **lib/wishlistItems.ts** - Wishlist items service layer
   - `getWishlistItemsByUserId()`: Fetches wishlist items for a specific user
   - Orders by priority descending
   - Error handling matches codebase patterns (contributions.ts)
   - Used for viewing others' wishlists

2. **app/(app)/celebration/[id].tsx** - Celebrant wishlist integration
   - Added celebrant wishlist state (items, favoriteId, loading)
   - `loadCelebrantWishlist()`: Loads items and favorite in parallel
   - Sorting logic: favorite pinned to top, then by priority
   - New "Celebrant's Wishlist" section in Info view
   - Positioned after Contributions, before Gift Leader History
   - Uses LuxuryWishlistCard with viewer-only mode

3. **Card Props for Viewer Mode**
   - `isFavorite={item.id === celebrantFavoriteId}`: Shows gold border and MostWantedBadge
   - `showFavoriteHeart={false}`: No heart icon (users can't toggle others' favorites)
   - No `onDelete` or `onToggleFavorite`: Read-only display

## Architectural Decisions

**Viewer-Only Card Pattern**
- LuxuryWishlistCard supports both owner and viewer modes
- Owner mode: showFavoriteHeart=true, interactive
- Viewer mode: showFavoriteHeart=false, display-only
- Same visual treatment (gold border, badge) but no interaction

**Service Layer Pattern**
- Created dedicated lib/wishlistItems.ts for reusable item fetching
- Matches existing pattern (contributions.ts, celebrations.ts)
- Single responsibility: fetch items by user ID
- No business logic - pure data retrieval

**Locked User Decision Honored**
- Favorites appear in BOTH My Wishlist AND celebration view
- Celebrates the "Most Wanted" concept in group context
- Visual consistency between owner and viewer perspectives

## Technical Implementation

**Parallel Data Loading**
```typescript
const [items, favoriteId] = await Promise.all([
  getWishlistItemsByUserId(celebration.celebrant_id),
  getFavoriteForGroup(celebration.celebrant_id, celebration.group_id),
]);
```

**Favorite Pinning Sort**
```typescript
const sortedCelebrantItems = [...celebrantItems].sort((a, b) => {
  if (a.id === celebrantFavoriteId) return -1;
  if (b.id === celebrantFavoriteId) return 1;
  return (b.priority || 0) - (a.priority || 0);
});
```

**Conditional Rendering**
- Loading state: ActivityIndicator
- Empty state: "No wishlist items yet"
- Data state: Sorted cards with favorite visual treatment

## Visual Treatment

**Favorite Item Display**
- Gold border (colors.gold[400], 2px width) - automatic from isFavorite prop
- "MOST WANTED" badge above title - automatic from isFavorite prop
- Pinned to top of list - manual sort logic

**Special Items with Favorites**
- Mystery Box or Surprise Me can be favorites
- MostWantedBadge stacks above ItemTypeBadge
- Special item border colors preserved (not overridden by favorite)

**No Interactive Elements**
- No heart icon (showFavoriteHeart=false)
- No delete button (onDelete not passed)
- Cards are display-only for viewers

## Integration Points

**Dependencies Met**
- 09-01: favorites.ts service layer (getFavoriteForGroup)
- 09-02: LuxuryWishlistCard favorite props (isFavorite, showFavoriteHeart)
- Group data: celebration.celebrant_id and celebration.group_id available

**Data Flow**
1. Celebration loaded → celebrant_id and group_id available
2. loadCelebrantWishlist effect fires
3. Parallel fetch: items + favorite
4. State updates trigger sort and render
5. Cards display with appropriate visual treatment

## User Experience

**Celebration Info View**
- New section: "{Celebrant}'s Wishlist"
- Gift icon in section header (matches visual language)
- Section appears after Contributions (natural flow)
- Loading state during fetch
- Empty state if no items yet

**Favorite Highlighting**
- Group members see celebrant's favorite prominently
- Visual consistency with My Wishlist screen
- Clear "Most Wanted" designation
- No confusion about interaction (no hearts shown)

## Testing Verification

**Manual Testing Checklist**
1. Visit a celebration page (where you are not the celebrant)
2. Scroll to "Celebrant's Wishlist" section in Info view
3. Verify celebrant's wishlist items displayed
4. If celebrant has a favorite:
   - Appears first in list
   - Has gold border
   - Shows "MOST WANTED" badge
5. Verify NO heart icons on any cards
6. Verify NO delete buttons on any cards

**Edge Cases Handled**
- No wishlist items: Empty state shown
- No favorite set: Items sorted by priority only
- Special items as favorite: MostWantedBadge stacks above ItemTypeBadge
- Loading state: ActivityIndicator during fetch

## Dependencies

**Upstream (Required)**
- Phase 09-01: Favorites service layer (getFavoriteForGroup)
- Phase 09-02: LuxuryWishlistCard favorite props

**Downstream (None)**
- This is the final plan in Phase 9

## Deviations from Plan

**None** - Plan executed exactly as written.

## Next Phase Readiness

**Phase 9 Complete**
- Favorite marking feature fully implemented
- Users can mark favorites on My Wishlist (09-02)
- Group members see favorites in celebration view (09-03)
- Visual treatment consistent across both views

**Ready for Phase 10**
- No blockers or concerns
- All favorite marking functionality delivered
- Locked user decision honored (favorites in both locations)

## Commit History

```
e3b5742 feat(09-03): add wishlist items service layer
ee731ed feat(09-03): add celebrant wishlist to celebration screen
```

**Files Changed**: 2 files, 113 insertions(+)
- lib/wishlistItems.ts (created)
- app/(app)/celebration/[id].tsx (modified)

## Success Metrics

- Celebrant's wishlist visible in celebration info view: ✓
- Celebrant's favorite (if set) has gold border: ✓
- Celebrant's favorite (if set) has MostWantedBadge: ✓
- Celebrant's favorite (if set) pinned to top: ✓
- No heart icons shown: ✓
- No delete buttons shown: ✓
- Empty state handled: ✓
- Loading state handled: ✓
- Matches visual treatment from My Wishlist: ✓
