# Phase 34: Grid Layout Implementation - Research

**Researched:** 2026-02-12
**Domain:** React Native FlashList Grid, expo-image, Performance Optimization
**Confidence:** HIGH

## Summary

Phase 34 implements a 2-column masonry grid layout for wishlist items using FlashList v2 with the `masonry` prop. The grid replaces the current `ScrollView` + `.map()` pattern (performance-limited) with virtualized rendering capable of 60fps on mid-range devices. Each grid card (`WishlistGridCard`) displays: image (with expo-image caching and blur placeholder), title (2-line truncation), price, and an action button (options for owner, claim indicator for others).

FlashList v2.2.1 (already installed) provides the `masonry` prop for Pinterest-style layouts with varying item heights. The key improvement over v1 is that size estimates are no longer required - FlashList v2 automatically measures items. expo-image 3.0.11 (also installed) provides high-performance image loading with `cachePolicy="memory-disk"`, blur placeholders, and the critical `recyclingKey` prop for preventing image flickering in recycled list views.

The critical success factors are: 1) Using `recyclingKey` on expo-image to prevent wrong-image flicker during scroll, 2) Using Pressable (not TouchableOpacity) for future-proof tap handling, 3) Ensuring grid layout consistency between My Wishlist and celebration page views by sharing the same `WishlistGridCard` component, and 4) Handling special items (Surprise Me, Mystery Box) with distinct visual treatment.

**Primary recommendation:** Use FlashList with `masonry` prop and `numColumns={2}`, expo-image with `recyclingKey={item.id}` and `cachePolicy="memory-disk"`, and Pressable for the card wrapper. Keep action button outside the main press area to prevent touch conflicts.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @shopify/flash-list | 2.2.1 | Masonry grid with virtualization | Already installed; v2 eliminates estimatedItemSize requirement, supports `masonry` prop, 60fps scrolling |
| expo-image | 3.0.11 | High-performance image loading | Already installed; disk+memory caching, blur placeholders, recyclingKey for FlashList |
| react-native (Pressable) | 0.81.5 | Touch handling | Built-in; future-proof replacement for TouchableOpacity, consistent cross-platform behavior |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| moti | 0.30.0 | Entrance animations | Already installed; use sparingly for grid items (performance impact in lists) |
| expo-linear-gradient | 15.0.8 | Gradient overlays | Already installed; reuse for card accent styling |
| @expo/vector-icons | 15.0.3 | MaterialCommunityIcons | Already installed; for placeholder icons and action buttons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FlashList masonry | FlatList numColumns | FlatList requires all items same height; masonry allows variable heights |
| FlashList masonry | MasonryFlashList (v1) | Deprecated in v2; masonry prop is the new pattern |
| expo-image | react-native-fast-image | expo-image is native to Expo, better maintained, same features |
| Pressable | TouchableOpacity | TouchableOpacity is legacy; Pressable is officially recommended |

**Installation:**
```bash
# All dependencies already installed - no installation needed
# Verify with: npm list @shopify/flash-list expo-image
```

## Architecture Patterns

### Recommended Project Structure
```
components/wishlist/
├── WishlistGridCard.tsx      # NEW: Grid item component
├── WishlistGrid.tsx          # NEW: FlashList wrapper with masonry config
├── LuxuryWishlistCard.tsx    # EXISTING: Keep during migration
├── types.ts                  # EXISTING: Add WishlistGridCardProps
├── ...existing components

utils/
├── wishlist.ts               # EXISTING: formatItemPrice, getImagePlaceholder, parseBrandFromTitle

app/(app)/(tabs)/
├── wishlist-luxury.tsx       # EXISTING: Update to use WishlistGrid
```

### Pattern 1: FlashList v2 Masonry Grid
**What:** 2-column masonry layout with automatic item sizing
**When to use:** Variable-height grid items (images + text of different lengths)
**Example:**
```typescript
// Source: https://shopify.github.io/flash-list/docs/guides/masonry/
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  masonry                      // Enable masonry layout (v2 only)
  numColumns={2}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  optimizeItemArrangement      // Default true; reduces column height differences
  contentContainerStyle={{ paddingHorizontal: spacing.md }}
/>
```

### Pattern 2: expo-image with FlashList recyclingKey
**What:** Prevent image flickering when FlashList recycles views
**When to use:** ANY image inside FlashList
**Example:**
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/image/
import { Image } from 'expo-image';

<Image
  source={{ uri: item.image_url }}
  recyclingKey={item.id}           // CRITICAL: Prevents wrong-image flicker
  style={{ width: '100%', aspectRatio: 1 }}
  contentFit="cover"
  cachePolicy="memory-disk"        // Optimal: memory cache with disk fallback
  placeholder={blurhashPlaceholder}
  placeholderContentFit="cover"    // Match contentFit to prevent scaling flicker
  transition={200}                 // Smooth crossfade on load
/>
```

### Pattern 3: Action Button Positioning
**What:** Bottom-right action button that doesn't interfere with card tap
**When to use:** Grid cards with both tap-to-navigate and secondary actions
**Example:**
```typescript
// Card wrapper uses Pressable for main tap area
<Pressable onPress={onCardPress} style={styles.card}>
  {/* Image, title, price content */}

  {/* Action button positioned absolutely - has its own Pressable */}
  <Pressable
    onPress={(e) => {
      e.stopPropagation?.();  // Prevent parent press
      onActionPress();
    }}
    style={styles.actionButton}
    hitSlop={8}  // Increase touch target
  >
    <MaterialCommunityIcons name="dots-vertical" size={20} />
  </Pressable>
</Pressable>

const styles = StyleSheet.create({
  card: { /* card styles */ },
  actionButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

### Pattern 4: Consistent Grid Dimensions
**What:** Calculate card width based on screen width and spacing
**When to use:** 2-column grid with consistent gutters
**Example:**
```typescript
import { Dimensions } from 'react-native';
import { spacing } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 2;
const HORIZONTAL_PADDING = spacing.md;  // 16px
const COLUMN_GAP = spacing.sm;          // 8px

// Card width calculation
const CARD_WIDTH = (SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - (COLUMN_GAP * (NUM_COLUMNS - 1))) / NUM_COLUMNS;
// For 375px width: (375 - 32 - 8) / 2 = 167.5px per card

// Fixed aspect ratio for image
const IMAGE_ASPECT_RATIO = 1;  // Square
const IMAGE_HEIGHT = CARD_WIDTH * IMAGE_ASPECT_RATIO;
```

### Anti-Patterns to Avoid
- **Adding key prop to renderItem component:** FlashList recycles views; adding key prevents recycling. Use `keyExtractor` on FlashList instead.
- **Moti animations on every grid item:** Performance impact multiplies with item count. Reserve animations for hero elements only.
- **TouchableOpacity inside TouchableOpacity:** Causes gesture conflicts. Use Pressable with `stopPropagation`.
- **Missing recyclingKey on expo-image:** Causes wrong-image flicker during fast scroll.
- **Inline object styles in renderItem:** Creates new objects each render. Use StyleSheet or memoize.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image caching | Custom AsyncStorage cache | expo-image cachePolicy="memory-disk" | Native-optimized, automatic cleanup |
| Masonry layout | Manual column balancing | FlashList masonry + optimizeItemArrangement | Handles edge cases, tested at scale |
| Virtualized list | ScrollView + .map() | FlashList | Memory efficiency, 60fps, cell recycling |
| Blur placeholder | Manual Image + blur overlay | expo-image placeholder prop | Native performance, automatic sizing |
| Touch feedback | Custom animated opacity | Pressable with style callback | Cross-platform, accessible, maintained |

**Key insight:** FlashList v2 + expo-image handle all the hard problems (virtualization, recycling, caching, placeholders). Focus implementation effort on business logic (special items, action buttons, status indicators).

## Common Pitfalls

### Pitfall 1: Image Flicker During Scroll
**What goes wrong:** As FlashList recycles views, images briefly show previous content before loading new image.
**Why it happens:** FlashList reuses components for efficiency; expo-image doesn't automatically clear on source change.
**How to avoid:** Always set `recyclingKey={item.id}` on expo-image inside FlashList.
**Warning signs:** Wrong images appear briefly when scrolling fast, especially noticeable on slower connections.

### Pitfall 2: Placeholder Size Mismatch
**What goes wrong:** Blur placeholder appears at wrong size, then "jumps" when actual image loads.
**Why it happens:** Default `placeholderContentFit` is `scale-down`, which differs from `contentFit` default.
**How to avoid:** Set `placeholderContentFit` to match `contentFit` (both should be "cover" for grid cards).
**Warning signs:** Visual "jump" when images load, especially with non-square images.

### Pitfall 3: Nested Pressable Touch Conflicts
**What goes wrong:** Tapping action button also triggers card navigation, or card tap doesn't work near action button.
**Why it happens:** Touch events propagate through nested touchables; Android handles this differently than iOS.
**How to avoid:** Use explicit hit slop on action button, ensure button is positioned with absolute, keep it outside the natural flow of content.
**Warning signs:** Double navigation, action not triggering, inconsistent behavior iOS vs Android.

### Pitfall 4: Memory Pressure with Large Lists
**What goes wrong:** App becomes sluggish or crashes with 100+ items with images.
**Why it happens:** Even with virtualization, images loaded but off-screen may remain in memory.
**How to avoid:** Use `cachePolicy="disk"` instead of `memory-disk` for very large lists; monitor memory usage.
**Warning signs:** Memory usage climbing during scroll, app slowdown after extended use.

### Pitfall 5: Grid Layout Inconsistency Between Views
**What goes wrong:** Grid looks different on My Wishlist vs celebration page (spacing, card size).
**Why it happens:** Each screen defines its own FlashList configuration; copy-paste introduces drift.
**How to avoid:** Extract `WishlistGrid` component that encapsulates all configuration; both screens import same component.
**Warning signs:** Cards appear larger on one screen, different padding, inconsistent spacing.

### Pitfall 6: Special Items Lost in Refactor
**What goes wrong:** Surprise Me and Mystery Box items render as standard items, losing distinct styling.
**Why it happens:** Special item logic buried in old LuxuryWishlistCard; not extracted to new grid card.
**How to avoid:** Use existing `getImagePlaceholder()` utility from Phase 33; test with all item_type values.
**Warning signs:** All items look the same, special icons missing, budget display wrong.

## Code Examples

Verified patterns from official sources and existing codebase:

### WishlistGridCard Component Structure
```typescript
// components/wishlist/WishlistGridCard.tsx
// Source: Architecture based on Phase 33 FEATURE-INVENTORY.md + FlashList docs

import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { formatItemPrice, getImagePlaceholder } from '@/utils/wishlist';
import type { WishlistItem } from '@/types/database.types';

interface WishlistGridCardProps {
  item: WishlistItem;
  onPress: () => void;
  onActionPress: () => void;
  index: number;
  // Context-specific display
  isTaken?: boolean;        // Celebrant view: shows "Taken" badge
  isOwner?: boolean;        // True for My Wishlist, determines action button type
  claimIndicator?: 'claimed' | 'your-claim' | 'split-open' | null;  // Non-celebrant view
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - spacing.sm) / 2;

export function WishlistGridCard({
  item,
  onPress,
  onActionPress,
  index,
  isTaken,
  isOwner,
  claimIndicator,
}: WishlistGridCardProps) {
  const placeholder = getImagePlaceholder(item.item_type);
  const priceDisplay = formatItemPrice(item);
  const hasImage = !!item.image_url && item.item_type === 'standard';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isTaken && styles.cardDimmed,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Image or Placeholder */}
      <View style={styles.imageContainer}>
        {hasImage ? (
          <Image
            source={{ uri: item.image_url }}
            recyclingKey={item.id}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            placeholderContentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: placeholder.backgroundColor }]}>
            <MaterialCommunityIcons
              name={placeholder.iconName}
              size={48}
              color={placeholder.iconColor}
            />
          </View>
        )}

        {/* Taken Badge (celebrant view) */}
        {isTaken && (
          <View style={styles.takenBadge}>
            <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
            <Text style={styles.takenText}>Taken</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        {priceDisplay && (
          <Text style={styles.price}>{priceDisplay}</Text>
        )}
      </View>

      {/* Action Button */}
      <Pressable
        onPress={onActionPress}
        style={styles.actionButton}
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name={isOwner ? 'dots-vertical' : 'gift-outline'}
          size={18}
          color={colors.burgundy[600]}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardDimmed: {
    opacity: 0.6,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.cream[100],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  takenBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  takenText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  content: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.burgundy[900],
    lineHeight: 18,
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold[700],
  },
  actionButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});
```

### WishlistGrid Component (FlashList Wrapper)
```typescript
// components/wishlist/WishlistGrid.tsx
// Source: FlashList v2 docs https://shopify.github.io/flash-list/docs/guides/masonry/

import { useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { WishlistGridCard } from './WishlistGridCard';
import { colors, spacing } from '@/constants/theme';
import type { WishlistItem } from '@/types/database.types';

interface WishlistGridProps {
  items: WishlistItem[];
  onItemPress: (item: WishlistItem) => void;
  onItemAction: (item: WishlistItem) => void;
  isOwner: boolean;
  claimStatuses?: Map<string, boolean>;  // Celebrant view
  refreshing?: boolean;
  onRefresh?: () => void;
  ListEmptyComponent?: React.ReactElement;
}

export function WishlistGrid({
  items,
  onItemPress,
  onItemAction,
  isOwner,
  claimStatuses,
  refreshing = false,
  onRefresh,
  ListEmptyComponent,
}: WishlistGridProps) {
  const renderItem = useCallback(({ item, index }: { item: WishlistItem; index: number }) => {
    const isTaken = claimStatuses?.get(item.id) ?? false;

    return (
      <WishlistGridCard
        item={item}
        onPress={() => onItemPress(item)}
        onActionPress={() => onItemAction(item)}
        index={index}
        isTaken={!isOwner && isTaken}  // Only show taken for non-owners (celebrant view)
        isOwner={isOwner}
      />
    );
  }, [onItemPress, onItemAction, isOwner, claimStatuses]);

  const keyExtractor = useCallback((item: WishlistItem) => item.id, []);

  return (
    <FlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      masonry
      numColumns={2}
      optimizeItemArrangement
      contentContainerStyle={styles.listContent}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.burgundy[600]}
            colors={[colors.burgundy[600]]}
          />
        ) : undefined
      }
      ListEmptyComponent={ListEmptyComponent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 100,  // Space for FAB
  },
});
```

### FlashList Masonry Configuration
```typescript
// Source: https://shopify.github.io/flash-list/docs/guides/masonry/
// Note: In FlashList v2, estimatedItemSize is NOT required

<FlashList
  data={items}
  masonry                            // Enable masonry layout
  numColumns={2}                     // 2-column grid
  optimizeItemArrangement={true}     // Default true; reduces column height differences
  renderItem={renderItem}
  keyExtractor={(item) => item.id}   // Use item.id, NOT index
  contentContainerStyle={{ paddingHorizontal: 16 }}
  // NO estimatedItemSize needed in v2
/>
```

### expo-image with Blur Placeholder
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/image/

import { Image } from 'expo-image';

// Default blurhash for gift items (warm gold tone)
const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

<Image
  source={{ uri: item.image_url }}
  recyclingKey={item.id}              // CRITICAL for FlashList
  style={{ width: '100%', aspectRatio: 1 }}
  contentFit="cover"
  cachePolicy="memory-disk"           // Memory cache + disk fallback
  placeholder={{ blurhash: DEFAULT_BLURHASH }}
  placeholderContentFit="cover"       // Match contentFit to prevent flicker
  transition={200}                    // 200ms crossfade
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MasonryFlashList | FlashList + masonry prop | FlashList v2 (2024) | Simpler API, better integration |
| estimatedItemSize required | Auto-sizing | FlashList v2 (2024) | Eliminates size calculation errors |
| TouchableOpacity | Pressable | React Native 0.64+ | Future-proof, consistent feedback |
| react-native-fast-image | expo-image | Expo SDK 49+ | Native Expo support, same features |
| FlatList numColumns | FlashList masonry | FlashList launch | True masonry vs uniform grid |

**Deprecated/outdated:**
- `MasonryFlashList` component: Use `FlashList` with `masonry` prop instead
- `estimatedItemSize` prop: No longer required in v2 (auto-measured)
- `overrideItemLayout` for sizes: Only use for `span` now, not size estimates
- `TouchableOpacity`: Legacy; use `Pressable` for new development

## Open Questions

1. **Blurhash Generation**
   - What we know: expo-image supports blurhash placeholders; we can use a default
   - What's unclear: Should we generate per-image blurhashes for better UX?
   - Recommendation: Use single default blurhash for v1.6; consider per-image generation in v1.7

2. **Action Button Behavior for Non-Owner**
   - What we know: Owner sees options button; non-celebrant viewer needs claim context
   - What's unclear: Should non-owner action button open detail page or show claim status?
   - Recommendation: Non-owner action shows claim status indicator; tap card opens detail for claim action

3. **Column Gap Handling**
   - What we know: FlashList masonry doesn't have explicit columnGap prop
   - What's unclear: Best approach for consistent gutters between columns
   - Recommendation: Use card margin + contentContainerStyle padding; test visually

## Sources

### Primary (HIGH confidence)
- [FlashList Masonry Layout Guide](https://shopify.github.io/flash-list/docs/guides/masonry/) - Official masonry documentation
- [FlashList v2 Changes](https://shopify.github.io/flash-list/docs/v2-changes/) - v2 migration guide, masonry prop
- [Expo Image Documentation](https://docs.expo.dev/versions/latest/sdk/image/) - cachePolicy, recyclingKey, placeholder
- [FlashList v2 Shopify Engineering](https://shopify.engineering/flashlist-v2) - Architecture, performance details
- Existing codebase: `components/wishlist/LuxuryWishlistCard.tsx` - Source for visual patterns
- Existing codebase: `utils/wishlist.ts` - formatItemPrice, getImagePlaceholder utilities
- Existing codebase: `.planning/phases/33-foundation-feature-inventory/FEATURE-INVENTORY.md` - Prop mapping

### Secondary (MEDIUM confidence)
- [expo-image recyclingKey GitHub Issue](https://github.com/expo/expo/issues/21211) - FlashList integration patterns
- [Pressable vs TouchableOpacity 2025](https://codercrafter.in/blogs/react-native/touchableopacity-vs-pressable-in-react-native-2025-which-should-you-use) - Touch handling comparison

### Tertiary (LOW confidence)
- [Moti + FlashList Performance](https://github.com/nandorojo/moti/issues/322) - Animation impact in lists (needs validation in our context)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries already installed, versions verified, official docs consulted
- Architecture: HIGH - Based on official FlashList v2 docs, expo-image docs, existing codebase patterns
- Pitfalls: HIGH - Based on prior PITFALLS-WISHLIST-UI.md research + verified GitHub issues

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (30 days - stable APIs, no major releases expected)
