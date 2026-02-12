# Stack Research: Wishlist UI Redesign

**Researched:** 2025-02-12
**Overall confidence:** HIGH

## Summary

**One new npm dependency: `expo-image@~3.0.11`** for product image handling with caching and placeholders. All other capabilities already exist in the current stack:

- **FlashList 2.2.1** (installed) - Supports masonry layout via `masonry` prop
- **@gorhom/bottom-sheet 5.2.8** (installed) - Options sheet (reuse LuxuryBottomSheet pattern)
- **expo-router 6.0.23** (installed) - Detail page routing
- **moti 0.30.0** (installed) - Card entrance animations

The existing wishlist uses `ScrollView` with full-width cards. Migration to FlashList with `masonry` prop enables 2-column Pinterest-style grid with no additional libraries.

---

## Recommended Stack

### New Dependencies

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `expo-image` | `~3.0.11` | Product images in grid and detail page | Caching (memory-disk), blurhash placeholders, `contentFit` for responsive images. Current app uses RN `Image` which lacks these features. |

### Already Installed (No Action Needed)

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@shopify/flash-list` | `2.2.1` | Grid/masonry layout | **v2 supports `masonry` prop** - no separate MasonryFlashList needed |
| `@gorhom/bottom-sheet` | `5.2.8` | Options sheet | LuxuryBottomSheet pattern exists, reuse for options list |
| `moti` | `0.30.0` | Card animations | Entrance animations for grid cards |
| `expo-router` | `6.0.23` | Detail page routing | File-based routing, add `app/(app)/wishlist/[id].tsx` |
| `expo-linear-gradient` | `15.0.8` | Detail page header gradient | Already used in LuxuryWishlistCard |

---

## Installation

```bash
# Only addition needed
npx expo install expo-image
```

**No other changes to package.json required.**

---

## Key API Usage

### 1. FlashList Masonry (Already Available in v2.2.1)

```typescript
import { FlashList } from "@shopify/flash-list";

<FlashList
  data={items}
  masonry                          // Enables Pinterest-style layout
  numColumns={2}                   // 2-column grid
  optimizeItemArrangement={true}   // Default: reduces column height differences
  renderItem={({ item }) => <WishlistGridCard item={item} />}
  estimatedItemSize={200}          // Approximate height for optimization
/>
```

**Migration from current ScrollView:**
```typescript
// FROM (current wishlist-luxury.tsx)
<ScrollView>
  {sortedItems.map((item, index) => (
    <LuxuryWishlistCard key={item.id} item={item} index={index} />
  ))}
</ScrollView>

// TO (new grid view)
<FlashList
  data={sortedItems}
  masonry
  numColumns={2}
  renderItem={({ item }) => <WishlistGridCard item={item} />}
  estimatedItemSize={200}
/>
```

### 2. expo-image (New Addition)

```typescript
import { Image } from 'expo-image';

// Grid card - minimal with placeholder
<Image
  source={item.image_url}
  placeholder={{ blurhash: item.blurhash || 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
  contentFit="cover"
  transition={200}
  style={{ width: '100%', aspectRatio: 1 }}
  cachePolicy="memory-disk"
/>

// Detail page hero - full-bleed
<Image
  source={item.image_url}
  contentFit="cover"
  style={{ width: '100%', height: 400 }}
  transition={300}
  priority="high"
/>
```

**Key props:**
- `contentFit="cover"` - Replaces `resizeMode`, more intuitive naming
- `cachePolicy="memory-disk"` - Aggressive caching for smooth grid scrolling
- `placeholder={{ blurhash }}` - Smooth loading states before image loads
- `transition` - Crossfade duration from placeholder to loaded image
- `priority="high"` - For above-fold images (detail hero)

### 3. Options Bottom Sheet (Existing Pattern)

Reuse `@gorhom/bottom-sheet` with action list:

```typescript
// Create OptionsBottomSheet.tsx based on existing LuxuryBottomSheet pattern
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';

<BottomSheet snapPoints={['40%']} ...>
  <View style={{ gap: 8 }}>
    <OptionRow icon="pencil" label="Edit" onPress={handleEdit} />
    <OptionRow icon="share" label="Share" onPress={handleShare} />
    <OptionRow icon="trash" label="Delete" onPress={handleDelete} destructive />
  </View>
</BottomSheet>
```

### 4. Detail Page Route (expo-router)

```typescript
// app/(app)/wishlist/[id].tsx
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';

export default function WishlistItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScrollView>
      {/* Full-bleed hero */}
      <Image source={item.image_url} style={{ width: '100%', height: 400 }} />

      {/* Item details */}
      <View style={{ padding: 16 }}>
        <Text>{item.title}</Text>
        <Text>${item.price}</Text>
      </View>
    </ScrollView>
  );
}
```

---

## Version Compatibility

| Package | Version | React Native 0.81 | Expo SDK 54 | React 19 |
|---------|---------|-------------------|-------------|----------|
| `expo-image` | `~3.0.11` | Yes | Yes | Yes |
| `@shopify/flash-list` | `2.2.1` | Yes (new arch) | Yes | Yes |
| `@gorhom/bottom-sheet` | `5.2.8` | Yes | Yes | Yes |

**Verified via npm:**
- expo-image@3.0.11 - latest stable, SDK 54 compatible
- @shopify/flash-list@2.2.2 - latest (project has 2.2.1, compatible)

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-native-masonry-list` | Unmaintained, poor performance | FlashList `masonry` prop |
| `react-native-masonry` | Image-only, limited features | FlashList `masonry` prop |
| `react-native-masonry-layout` | Unmaintained since 2020 | FlashList `masonry` prop |
| `MasonryFlashList` (v1 component) | Deprecated in FlashList v2 | FlashList `masonry` prop |
| `react-native-fast-image` | Expo has expo-image | expo-image |
| Any masonry library | FlashList v2 handles this natively | FlashList `masonry` prop |
| New bottom sheet library | Already have @gorhom/bottom-sheet | Existing component |
| Custom image caching | Reinventing the wheel | expo-image |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| FlashList masonry | `react-native-masonry-list` | Never - FlashList already installed, better performance |
| expo-image | react-native `Image` | Only for static bundled assets (icons, logos) |
| expo-image | `react-native-fast-image` | Only for bare RN projects (not Expo managed) |
| @gorhom/bottom-sheet | `react-native-actions-sheet` | Never - already have bottom-sheet working |

---

## Integration Points

### Grid Card Component

New minimal `WishlistGridCard` for 2-column layout:

```typescript
// components/wishlist/WishlistGridCard.tsx
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

interface Props {
  item: WishlistItem;
  onLongPress?: () => void;
}

export function WishlistGridCard({ item, onLongPress }: Props) {
  return (
    <Pressable
      onPress={() => router.push(`/wishlist/${item.id}`)}
      onLongPress={onLongPress}  // Opens options sheet
      style={{ margin: 4 }}
    >
      <Image
        source={item.image_url}
        placeholder={{ blurhash: item.blurhash }}
        contentFit="cover"
        style={{ width: '100%', aspectRatio: 1, borderRadius: 8 }}
      />
      <Text numberOfLines={2}>{item.title}</Text>
      {item.price && <Text>${item.price.toFixed(2)}</Text>}
    </Pressable>
  );
}
```

### Database Consideration

Add `blurhash` column to wishlist_items for placeholder generation:

```sql
ALTER TABLE wishlist_items
ADD COLUMN blurhash TEXT;
```

**Options for blurhash generation:**
1. Generate client-side when adding item (adds dependency)
2. Generate server-side via Edge Function (recommended)
3. Use static default blurhash (simplest, less visual polish)

**Recommendation:** Start with static default blurhash, add server-side generation later if product images have varied colors.

---

## Migration Strategy

### Phase 1: Add expo-image (immediate)
- Install expo-image
- Replace `Image` imports in wishlist components
- Keep existing LuxuryWishlistCard for now

### Phase 2: Grid Layout
- Create WishlistGridCard component
- Add FlashList with `masonry` prop
- Add view toggle (list/grid)

### Phase 3: Detail Page
- Create `app/(app)/wishlist/[id].tsx`
- Full-bleed hero image
- Action buttons (edit, share, delete)

### Phase 4: Options Sheet
- Create OptionsBottomSheet component
- Long press on grid card triggers sheet
- Actions: Edit, Share, Delete

---

## Confidence Assessment

| Area | Confidence | Evidence |
|------|------------|----------|
| FlashList masonry in v2.2.1 | HIGH | [Official docs](https://shopify.github.io/flash-list/docs/guides/masonry/), project already on v2 |
| expo-image compatibility | HIGH | npm shows v3.0.11, SDK 54 compatible |
| expo-router detail pages | HIGH | Already using expo-router, pattern is documented |
| bottom-sheet reuse | HIGH | LuxuryBottomSheet exists as reference |
| No additional masonry library needed | HIGH | FlashList docs explicitly deprecate MasonryFlashList |

---

## Sources

### FlashList
- [FlashList Masonry Documentation](https://shopify.github.io/flash-list/docs/guides/masonry/) - v2 masonry API
- [FlashList v2 Changes](https://shopify.github.io/flash-list/docs/v2-changes/) - Migration from MasonryFlashList
- [FlashList Engineering Blog](https://shopify.engineering/flashlist-v2) - Performance details

### expo-image
- [expo-image Documentation](https://docs.expo.dev/versions/latest/sdk/image/) - API reference
- [Medium: React Native Image Optimization](https://medium.com/@engin.bolat/react-native-image-optimization-performance-essentials-9e8ce6a1193e) - Performance comparison

### Package Versions (Verified 2025-02-12)
- `npm view expo-image version` - 3.0.11
- `npm view @shopify/flash-list version` - 2.2.2

---

## Previous Stack Research (Preserved)

### v1.5 Localization (2025-02-11)
Two new dependencies: `expo-localization@~17.0.8` for device locale detection and `i18next@^25.8.5` + `react-i18next@^16.5.4` for translations. Server-side localization via `preferred_language` column in users table.

### v1.4 Friends System (2025-02-09)
One new dependency: `expo-contacts@~15.0.11` for device phonebook access. Single-table friend relationship schema.

### v1.3 Gift Claims & Personal Details (2025-02-05)
No new dependencies. gift_claims table with celebrant-exclusion RLS, personal_details with public-read/owner-write.

### v1.2 Group Experience (2025-02-04)
No new dependencies. expo-image-picker + Supabase Storage for group photos.

### v1.1 Wishlist Polish (2025-02-03)
No new dependencies. Existing components sufficient.

---
*Research completed: 2025-02-12*
