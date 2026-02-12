# Architecture Research: Wishlist UI Redesign

**Domain:** React Native Expo Mobile App - Wishlist Feature Enhancement
**Researched:** 2026-02-12
**Confidence:** HIGH (existing codebase analysis, established patterns)

## System Overview

```
+-------------------------------------------------------------------------+
|                        NAVIGATION LAYER (expo-router)                    |
|  app/(app)/(tabs)/index.tsx    app/(app)/wishlist/[id].tsx (NEW)        |
+---------+--------------------------+------------------------------------+
          |                          |
          v                          v
+-------------------+     +-----------------------------------+
|   SCREEN LAYER    |     |        SCREEN LAYER               |
| WishlistScreen    |     |   ItemDetailScreen (NEW)          |
| (Grid View)       |     |   - Full item display             |
+--------+----------+     |   - Options bottom sheet trigger  |
         |                +-----------------------------------+
         v
+-------------------+     +-----------------------------------+
|  COMPONENT LAYER  |     |        COMPONENT LAYER            |
| WishlistGridCard  |     |   ItemOptionsSheet (NEW)          |
| (NEW - Simple)    |     |   - Edit, Delete, Share actions   |
+--------+----------+     +-----------------------------------+
         |                          |
         v                          v
+-------------------------------------------------------------------------+
|                          SERVICE LAYER (lib/)                            |
|  wishlistItems.ts  |  claims.ts  |  favorites.ts  |  supabase.ts        |
+-------------------------------------------------------------------------+
         |
         v
+-------------------------------------------------------------------------+
|                          DATA LAYER (Supabase)                           |
|  wishlist_items  |  gift_claims  |  group_favorites  |  user_profiles   |
+-------------------------------------------------------------------------+
```

## Component Responsibilities

| Component | Responsibility | Reuse Strategy |
|-----------|----------------|----------------|
| `WishlistGridCard` (NEW) | Compact card for grid display, tap to navigate | New component, ~15 props max |
| `ItemDetailScreen` (NEW) | Full item view with all details | New route, reuses existing sub-components |
| `ItemOptionsSheet` (NEW) | Edit/Delete/Share actions | New component, uses `@gorhom/bottom-sheet` |
| `LuxuryWishlistCard` (existing) | Complex card for celebration/detailed views | Keep for celebration context |
| `LuxuryBottomSheet` (existing) | Add/Edit item form | Reuse directly for item editing |
| `lib/wishlistItems.ts` (existing) | CRUD operations | Reuse all functions |
| `lib/claims.ts` (existing) | Claiming logic | Reuse for detail page |
| `lib/favorites.ts` (existing) | Most Wanted tracking | Reuse for badges |

## Recommended Project Structure

```
app/
├── (app)/
│   ├── (tabs)/
│   │   └── index.tsx              # Modified: Grid-based wishlist screen
│   └── wishlist/
│       └── [id].tsx               # NEW: Item detail page route
│
components/
├── wishlist/
│   ├── WishlistGridCard.tsx       # NEW: Simple grid card (navigation only)
│   ├── ItemOptionsSheet.tsx       # NEW: Options bottom sheet
│   ├── LuxuryWishlistCard.tsx     # EXISTING: Keep for detailed views
│   ├── LuxuryBottomSheet.tsx      # EXISTING: Reuse for add/edit
│   ├── MostWantedBadge.tsx        # EXISTING: Reuse in grid card
│   ├── TakenBadge.tsx             # EXISTING: Reuse in grid card
│   └── [other existing...]        # EXISTING: Keep as-is
│
lib/
├── wishlistItems.ts               # EXISTING: Add getWishlistItemById()
├── claims.ts                      # EXISTING: No changes needed
├── favorites.ts                   # EXISTING: No changes needed
└── supabase.ts                    # EXISTING: No changes needed
```

### Structure Rationale

- **`app/(app)/wishlist/[id].tsx`:** New route for item detail follows expo-router convention. Parallel to existing `app/(app)/member/[id].tsx` pattern.
- **`WishlistGridCard.tsx`:** Separate from `LuxuryWishlistCard` because the existing card has 68 props and complex claim/split logic not needed for simple grid display.
- **`ItemOptionsSheet.tsx`:** Different from `LuxuryBottomSheet` - options sheet is action menu, not form. Keeps separation of concerns.

## Architectural Patterns

### Pattern 1: Navigation-First Grid Card

**What:** Grid cards are navigation triggers only, not action containers.
**When to use:** List/grid views where items have detail pages.
**Trade-offs:**
- PRO: Simple props interface, fast rendering, clear UX flow
- CON: Extra navigation step for any action

**Example:**
```typescript
// WishlistGridCard.tsx - SIMPLIFIED
interface WishlistGridCardProps {
  item: WishlistItem;
  isTaken: boolean;
  isFavorite: boolean;
  onPress: () => void;  // Just navigation - no delete/edit here
}

export function WishlistGridCard({ item, isTaken, isFavorite, onPress }: WishlistGridCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      {isFavorite && <MostWantedBadge compact />}
      {isTaken && <TakenBadge />}
      <Text numberOfLines={2}>{item.title}</Text>
      {item.price && <Text>${item.price}</Text>}
      <StarRating rating={item.priority} readonly size={14} />
    </Pressable>
  );
}
```

### Pattern 2: Route-Based Detail Page with Stack Navigation

**What:** Detail pages as separate routes with expo-router, enabling back navigation and deep linking.
**When to use:** Items that need full-screen detail view with multiple actions.
**Trade-offs:**
- PRO: Deep linkable, shareable, standard mobile UX
- CON: Navigation transition (mitigated by pre-loading)

**Example:**
```typescript
// app/(app)/wishlist/[id].tsx
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<WishlistItem | null>(null);
  const optionsSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    loadItem(id);
  }, [id]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: item?.title ?? 'Item' }} />
      {/* Full item display */}
      <ItemOptionsSheet
        ref={optionsSheetRef}
        item={item}
        onEdit={() => editSheetRef.current?.open()}
        onDelete={handleDelete}
        onShare={handleShare}
      />
    </View>
  );
}
```

### Pattern 3: Action Sheets for Destructive/Secondary Actions

**What:** Options in bottom sheet rather than inline buttons or swipe actions.
**When to use:** Destructive actions (delete), secondary actions (share, edit).
**Trade-offs:**
- PRO: Safer UX, less accidental taps, consistent with iOS/Android patterns
- CON: Extra tap required

**Example:**
```typescript
// ItemOptionsSheet.tsx
interface ItemOptionsSheetProps {
  item: WishlistItem;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}

// Uses @gorhom/bottom-sheet (already in project)
// Presents: Edit, Share, Delete (red), Cancel
```

## Data Flow

### Grid View Flow

```
[User opens wishlist tab]
    |
    v
[WishlistScreen loads items] --> [lib/wishlistItems.ts: getWishlistItemsByUserId()]
    |                                        |
    v                                        v
[Fetch claim statuses] --> [lib/claims.ts: getItemClaimStatus()]
    |
    v
[Render FlashList with WishlistGridCard]
    |
    v
[User taps card] --> router.push(`/wishlist/${item.id}`)
```

### Detail Page Flow

```
[User navigates to /wishlist/[id]]
    |
    v
[ItemDetailScreen loads] --> [lib/wishlistItems.ts: getWishlistItemById()] (NEW)
    |
    v
[Display full item details]
    |
    +---> [User taps options] --> [ItemOptionsSheet opens]
    |                                    |
    |                                    +---> Edit --> LuxuryBottomSheet (reuse)
    |                                    +---> Delete --> Alert confirm --> delete
    |                                    +---> Share --> Share API
    |
    +---> [User taps "View Product"] --> Linking.openURL()
```

### State Management

```
[Screen State (useState)]
    |
    +---> items: WishlistItem[]
    +---> claimStatuses: Map<string, boolean>
    +---> loading: boolean
    +---> refreshing: boolean
    |
    v
[No Global State Required]
    |
    (Screen fetches its own data, no Redux/Zustand needed)
```

### Key Data Flows

1. **Grid Load:** Screen mounts -> fetch items -> fetch claim statuses -> render
2. **Item Tap:** Card tap -> navigate to detail route -> detail screen fetches single item
3. **Delete Flow:** Options sheet -> confirm alert -> delete via Supabase -> navigate back
4. **Edit Flow:** Options sheet -> open LuxuryBottomSheet (prefilled) -> save -> refresh

## Integration Points

### Existing Services to Reuse

| Service | Function | New Usage |
|---------|----------|-----------|
| `lib/wishlistItems.ts` | `getWishlistItemsByUserId()` | Grid view fetch |
| `lib/wishlistItems.ts` | NEW: `getWishlistItemById()` | Detail page fetch |
| `lib/claims.ts` | `getItemClaimStatus()` | Grid badges |
| `lib/claims.ts` | `getClaimsForItems()` | Detail page (if showing claim info) |
| `lib/favorites.ts` | `getAllFavoritesForUser()` | Most Wanted badges |
| `lib/supabase.ts` | Direct delete | Delete operation |

### New Service Function Needed

```typescript
// Add to lib/wishlistItems.ts
export async function getWishlistItemById(itemId: string): Promise<WishlistItem | null> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) {
    console.error('Failed to fetch wishlist item:', error);
    return null;
  }

  return data;
}
```

### Navigation Integration

| From | To | Method |
|------|---|--------|
| Grid Card tap | Item Detail | `router.push(\`/wishlist/${item.id}\`)` |
| Options Sheet Edit | LuxuryBottomSheet | `editSheetRef.current?.open()` |
| Delete success | Back to grid | `router.back()` |

### Component Reuse Map

| Existing Component | Reuse Location | Notes |
|-------------------|----------------|-------|
| `MostWantedBadge` | Grid card, Detail page | Use `compact` variant for grid |
| `TakenBadge` | Grid card, Detail page | Direct reuse |
| `StarRating` | Grid card, Detail page | `readonly={true}` in grid, editable in detail |
| `LuxuryBottomSheet` | Detail page edit | Pass `item` prop for prefill |
| `FavoriteHeart` | Detail page only | Not needed in grid (tap navigates) |

## Anti-Patterns

### Anti-Pattern 1: Overloaded Card Components

**What people do:** Add all possible props and actions to one card component (like current LuxuryWishlistCard with 68 props).
**Why it's wrong:**
- Hard to maintain
- Poor performance (unnecessary re-renders)
- Confusing API
- Tight coupling between contexts (celebrant vs owner view)
**Do this instead:** Create context-specific card variants:
- `WishlistGridCard` - Simple, navigation-only (~5 props)
- `LuxuryWishlistCard` - Complex, for celebration view (~20 core props)

### Anti-Pattern 2: Inline Delete Without Confirmation

**What people do:** Add swipe-to-delete or single-tap delete on list items.
**Why it's wrong:**
- Accidental deletions
- No recovery path
- Bad mobile UX for destructive actions
**Do this instead:** Options sheet with explicit delete button + Alert confirmation.

### Anti-Pattern 3: Form in List Item

**What people do:** Enable inline editing in list cards (e.g., tap title to edit).
**Why it's wrong:**
- Cluttered UX
- Keyboard handling issues in lists
- Inconsistent edit experiences
**Do this instead:** Navigate to detail page or open dedicated edit sheet.

### Anti-Pattern 4: Duplicating Service Logic

**What people do:** Write Supabase queries directly in screen components.
**Why it's wrong:**
- Code duplication
- Inconsistent error handling
- Hard to test
**Do this instead:** Use existing `lib/*.ts` services. Add new functions there if needed.

## Build Order (Dependency-Based)

```
Phase 1: Foundation (No dependencies)
├── 1.1 Add getWishlistItemById() to lib/wishlistItems.ts
└── 1.2 Create WishlistGridCard component (uses existing MostWantedBadge, TakenBadge, StarRating)

Phase 2: Routes (Depends on 1.1)
└── 2.1 Create app/(app)/wishlist/[id].tsx detail page route

Phase 3: Actions (Depends on 2.1)
├── 3.1 Create ItemOptionsSheet component
└── 3.2 Wire edit flow to LuxuryBottomSheet

Phase 4: Integration (Depends on 1.2, 2.1)
├── 4.1 Modify app/(app)/(tabs)/index.tsx to use grid layout
└── 4.2 Replace LuxuryWishlistCard with WishlistGridCard in grid view
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (< 100 items per user) | Current approach is fine. FlashList handles well. |
| 100-1000 items | Consider pagination or infinite scroll. Add item search. |
| > 1000 items | Add categories/folders. Server-side filtering. Virtualized sections. |

### Performance Notes

- **FlashList:** Already in use, excellent for large lists
- **Image loading:** Consider adding image caching for item thumbnails (if added later)
- **Navigation:** Pre-load detail data on long-press for faster transition (future optimization)

## Files Summary

### New Files to Create

| File | Type | Purpose |
|------|------|---------|
| `app/(app)/wishlist/[id].tsx` | Route | Item detail page |
| `components/wishlist/WishlistGridCard.tsx` | Component | Simple grid card |
| `components/wishlist/ItemOptionsSheet.tsx` | Component | Actions bottom sheet |

### Existing Files to Modify

| File | Change |
|------|--------|
| `lib/wishlistItems.ts` | Add `getWishlistItemById()` function |
| `app/(app)/(tabs)/index.tsx` | Switch to grid layout, use WishlistGridCard |

### Existing Files to Reuse (No Changes)

| File | Reuse Context |
|------|---------------|
| `components/wishlist/LuxuryBottomSheet.tsx` | Edit item form |
| `components/wishlist/MostWantedBadge.tsx` | Grid card, Detail page |
| `components/wishlist/TakenBadge.tsx` | Grid card, Detail page |
| `components/ui/StarRating.tsx` | Grid card, Detail page |
| `lib/claims.ts` | Claim status fetching |
| `lib/favorites.ts` | Most Wanted detection |

## Sources

- Existing codebase analysis: `/home/zetaz/wishlist-app/`
- expo-router documentation patterns (established in current app)
- @gorhom/bottom-sheet usage patterns (already integrated)
- React Native performance best practices (FlashList already in use)

---
*Architecture research for: Wishlist UI Redesign*
*Researched: 2026-02-12*
