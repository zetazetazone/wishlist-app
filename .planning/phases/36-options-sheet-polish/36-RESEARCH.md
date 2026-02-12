# Phase 36: Options Sheet & Polish - Research

**Researched:** 2026-02-12
**Domain:** React Native Bottom Sheet, Share API, Options Menu Pattern
**Confidence:** HIGH

## Summary

Phase 36 implements an options bottom sheet for wishlist items that opens from the grid card action button (owner view) and from the detail page. The sheet displays an item preview (image, title, price) and provides actions: favorite toggle, priority adjustment (star rating), share, edit navigation, and delete with confirmation.

The project already has `@gorhom/bottom-sheet` v5.2.8 installed and uses it effectively in `LuxuryBottomSheet.tsx`, `GroupPickerSheet.tsx`, and `AddNoteSheet.tsx`. The established pattern uses `forwardRef` with `useImperativeHandle` to expose `open()` and `close()` methods. The Share API can use React Native's built-in `Share` module which is already available (no additional dependencies needed).

The key integration points are: 1) Wire `onActionPress` from `WishlistGridCard` to open the options sheet, 2) Add options button handler to the detail page header, 3) Implement each action using existing lib functions (`setFavorite`, Supabase priority update, navigation, delete), and 4) Use React Native's `Share.share()` for native share dialog.

**Primary recommendation:** Create `OptionsSheet.tsx` following the established `forwardRef + useImperativeHandle` pattern from `LuxuryBottomSheet.tsx`, with dynamic snap points based on content height (~40% for compact options list), and implement all actions using existing lib functions and patterns.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @gorhom/bottom-sheet | 5.2.8 | Options sheet UI | Already installed; v5 with Reanimated 4.1, proven in 3 existing sheets |
| react-native (Share) | 0.81.5 | Native share dialog | Built-in; no external dependency needed for sharing text/URLs |
| expo-router | 6.0.23 | Navigation to edit form | Already used throughout app; `router.push()` for edit navigation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-image | 3.0.11 | Item preview image | For thumbnail in sheet preview section |
| moti | 0.30.0 | Animation feedback | For favorite heart animation on toggle |
| react-native-reanimated | 4.1.1 | Sheet animations | Required by @gorhom/bottom-sheet v5 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @gorhom/bottom-sheet | Modal + custom sheet | Already have proven bottom sheet pattern; Modal requires more custom work |
| React Native Share | expo-sharing | expo-sharing is file-focused; Share API is better for text/URLs |
| Custom action list | @gluestack-ui ActionSheet | Adds dependency; custom implementation matches existing design system |

**Installation:**
```bash
# All dependencies already installed - no installation needed
# Verify with: npm list @gorhom/bottom-sheet react-native
```

## Architecture Patterns

### Recommended Project Structure
```
components/wishlist/
  OptionsSheet.tsx           # NEW: Options bottom sheet component
  WishlistGridCard.tsx        # UPDATE: Wire onActionPress to open sheet
  FavoriteHeart.tsx           # EXISTING: Reuse for favorite toggle in sheet
  index.ts                    # UPDATE: Export OptionsSheet

app/(app)/wishlist/
  [id].tsx                    # UPDATE: Add options button handler in header

lib/
  wishlistItems.ts            # UPDATE: Add updateItem, deleteItem functions
  favorites.ts                # EXISTING: setFavorite, getGroupsWithItemAsFavorite
```

### Pattern 1: Options Sheet with forwardRef
**What:** Expose imperative `open()` and `close()` methods for parent control
**When to use:** All bottom sheets that need programmatic open/close from parent
**Example:**
```typescript
// Source: Established pattern from components/wishlist/LuxuryBottomSheet.tsx
import { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';

export interface OptionsSheetRef {
  open: (item: WishlistItem) => void;
  close: () => void;
}

export const OptionsSheet = forwardRef<OptionsSheetRef, OptionsSheetProps>(
  function OptionsSheet(props, ref) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [currentItem, setCurrentItem] = useState<WishlistItem | null>(null);

    useImperativeHandle(ref, () => ({
      open: (item: WishlistItem) => {
        setCurrentItem(item);
        bottomSheetRef.current?.expand();
      },
      close: () => {
        bottomSheetRef.current?.close();
        setCurrentItem(null);
      },
    }));

    const snapPoints = ['45%'];  // Compact height for options list

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.7}
          pressBehavior="close"
        />
      ),
      []
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.cream[50] }}
        handleIndicatorStyle={{ backgroundColor: colors.burgundy[300] }}
      >
        {/* Content */}
      </BottomSheet>
    );
  }
);
```

### Pattern 2: React Native Share API
**What:** Open native share dialog with item URL/text
**When to use:** Sharing item with external apps (Messages, Email, etc.)
**Example:**
```typescript
// Source: https://reactnative.dev/docs/share
import { Share, Alert } from 'react-native';

const handleShare = async (item: WishlistItem) => {
  try {
    const shareContent = {
      message: item.amazon_url
        ? `Check out this item: ${item.title}\n${item.amazon_url}`
        : `Check out this item: ${item.title}`,
      title: item.title,  // iOS only
    };

    const result = await Share.share(shareContent);

    if (result.action === Share.sharedAction) {
      // Successfully shared
      console.log('Shared with activity:', result.activityType);
    } else if (result.action === Share.dismissedAction) {
      // Dismissed (iOS only)
      console.log('Share dismissed');
    }
  } catch (error) {
    Alert.alert(t('alerts.titles.error'), t('common.errors.generic'));
  }
};
```

### Pattern 3: Action Button Row Layout
**What:** Consistent button styling for sheet actions
**When to use:** All option actions in the sheet
**Example:**
```typescript
// Consistent action button pattern from existing sheets
const OptionButton = ({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.optionButton,
      pressed && styles.optionButtonPressed,
    ]}
  >
    <MaterialCommunityIcons
      name={icon}
      size={24}
      color={destructive ? colors.error : colors.burgundy[700]}
    />
    <Text
      style={[
        styles.optionLabel,
        destructive && styles.optionLabelDestructive,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  optionButtonPressed: {
    backgroundColor: colors.cream[100],
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.burgundy[800],
  },
  optionLabelDestructive: {
    color: colors.error,
  },
});
```

### Pattern 4: Delete Confirmation
**What:** Alert confirmation before destructive action
**When to use:** Delete actions
**Example:**
```typescript
// Source: Existing pattern from lib/favorites.ts delete handling
const handleDelete = () => {
  Alert.alert(
    t('wishlist.card.deleteItem'),
    t('wishlist.card.confirmDelete'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await onDelete(item.id);
          bottomSheetRef.current?.close();
        },
      },
    ]
  );
};
```

### Anti-Patterns to Avoid
- **Multiple sheet instances:** Create ONE OptionsSheet at screen level; pass item to `open()`. Don't create sheet per card.
- **State in sheet for item data:** Pass item via `open(item)` method; sheet displays current item. Don't sync external state.
- **TouchableOpacity for option buttons:** Use Pressable for consistent feedback and future-proofing.
- **Hardcoded strings:** Use translation keys; all labels must be translatable.
- **Closing sheet before async completes:** Close after successful operation, not before.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Share dialog | Custom share UI | React Native Share API | Native, familiar, handles all share targets |
| Bottom sheet | Modal + pan gesture | @gorhom/bottom-sheet | Already installed, handles edge cases |
| Delete confirmation | Custom modal | React Native Alert.alert | Native, consistent, accessible |
| Star rating input | Custom touch handler | Existing StarRating component | Already built, tested, themed |
| Favorite toggle | New implementation | Existing lib/favorites.ts functions | Battle-tested, handles multi-group logic |

**Key insight:** All required functionality already exists in the codebase. This phase is primarily about composition - wiring existing components and functions into a new Options Sheet UI.

## Common Pitfalls

### Pitfall 1: Sheet Opens Empty or With Wrong Item
**What goes wrong:** Sheet opens but shows no item data, or shows previous item's data.
**Why it happens:** Item state not set before calling `expand()`, or stale closure captures old item.
**How to avoid:** Set item state BEFORE expanding sheet; use `open(item)` pattern that sets state then expands.
**Warning signs:** Blank preview section, wrong image, mismatched title.

### Pitfall 2: Action Completes But UI Not Updated
**What goes wrong:** User changes priority, closes sheet, grid still shows old priority.
**Why it happens:** Parent component not notified of change; optimistic update not implemented.
**How to avoid:** Pass `onPriorityChange`, `onFavoriteChange`, `onDelete` callbacks; parent updates local state immediately.
**Warning signs:** Need to pull-to-refresh to see changes.

### Pitfall 3: Share Fails Silently on Android
**What goes wrong:** Share dialog opens, user selects app, nothing happens.
**Why it happens:** Android Share intent may fail without clear error; `result.action` always `sharedAction`.
**How to avoid:** Wrap in try-catch; show success toast only on iOS where dismissedAction exists; don't assume Android result indicates actual success.
**Warning signs:** User reports "share doesn't work" on Android only.

### Pitfall 4: Delete Removes Item But Sheet Stays Open
**What goes wrong:** Item deleted successfully but sheet remains open, showing deleted item.
**Why it happens:** Async delete completes but `close()` not called after success.
**How to avoid:** Chain `close()` after successful delete; handle in callback sequence.
**Warning signs:** Sheet still visible after delete, ghost item in preview.

### Pitfall 5: Multiple Sheets Stacking
**What goes wrong:** Opening options from detail page while grid sheet is open causes visual glitch.
**Why it happens:** Two separate sheet instances both mounted and opening.
**How to avoid:** Either share single sheet via context, or ensure grid sheet closes before navigating to detail.
**Warning signs:** Two backdrops visible, sheet appears at wrong height.

### Pitfall 6: Edit Navigation Fails for New Item Types
**What goes wrong:** Edit action crashes or shows wrong form for mystery_box items.
**Why it happens:** Edit form may not support all item_type values.
**How to avoid:** Disable edit for non-standard items, or route to appropriate form per type.
**Warning signs:** Crash on edit, form fields misaligned with item data.

## Code Examples

Verified patterns from official sources and existing codebase:

### Complete OptionsSheet Structure
```typescript
// components/wishlist/OptionsSheet.tsx
// Source: Pattern from LuxuryBottomSheet.tsx + GroupPickerSheet.tsx

import { forwardRef, useImperativeHandle, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Share } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { formatItemPrice, getImagePlaceholder } from '@/utils/wishlist';
import StarRating from '@/components/ui/StarRating';
import type { WishlistItem } from '@/types/database.types';

interface OptionsSheetProps {
  onFavoriteToggle: (itemId: string) => void;
  onPriorityChange: (itemId: string, priority: number) => void;
  onDelete: (itemId: string) => Promise<void>;
  isFavorite: (itemId: string) => boolean;
}

export interface OptionsSheetRef {
  open: (item: WishlistItem) => void;
  close: () => void;
}

const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export const OptionsSheet = forwardRef<OptionsSheetRef, OptionsSheetProps>(
  function OptionsSheet({ onFavoriteToggle, onPriorityChange, onDelete, isFavorite }, ref) {
    const { t } = useTranslation();
    const router = useRouter();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [item, setItem] = useState<WishlistItem | null>(null);

    useImperativeHandle(ref, () => ({
      open: (newItem: WishlistItem) => {
        setItem(newItem);
        bottomSheetRef.current?.expand();
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }));

    const snapPoints = ['50%'];

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.7}
          pressBehavior="close"
        />
      ),
      []
    );

    const handleShare = async () => {
      if (!item) return;

      try {
        const message = item.amazon_url
          ? `${item.title}\n${item.amazon_url}`
          : item.title;

        await Share.share({
          message,
          title: item.title,
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    };

    const handleEdit = () => {
      if (!item) return;
      bottomSheetRef.current?.close();
      // Navigate to edit form (Phase 36 implementation)
      router.push(`/wishlist/${item.id}/edit`);
    };

    const handleDelete = () => {
      if (!item) return;

      Alert.alert(
        t('wishlist.card.deleteItem'),
        t('wishlist.card.confirmDelete'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              await onDelete(item.id);
              bottomSheetRef.current?.close();
            },
          },
        ]
      );
    };

    const handleFavorite = () => {
      if (!item) return;
      onFavoriteToggle(item.id);
    };

    const handlePriorityChange = (newPriority: number) => {
      if (!item) return;
      onPriorityChange(item.id, newPriority);
      // Update local state for immediate feedback
      setItem({ ...item, priority: newPriority });
    };

    if (!item) return null;

    const placeholder = getImagePlaceholder(item.item_type);
    const hasImage = !!item.image_url && item.item_type === 'standard';
    const priceDisplay = formatItemPrice(item);
    const favorited = isFavorite(item.id);

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <View style={styles.content}>
          {/* Item Preview */}
          <View style={styles.preview}>
            {hasImage ? (
              <Image
                source={{ uri: item.image_url! }}
                style={styles.previewImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                placeholder={{ blurhash: DEFAULT_BLURHASH }}
              />
            ) : (
              <View style={[styles.previewPlaceholder, { backgroundColor: placeholder.backgroundColor }]}>
                <MaterialCommunityIcons
                  name={placeholder.iconName}
                  size={32}
                  color={placeholder.iconColor}
                />
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text numberOfLines={2} style={styles.previewTitle}>{item.title}</Text>
              {priceDisplay && <Text style={styles.previewPrice}>{priceDisplay}</Text>}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Priority Row */}
          <View style={styles.priorityRow}>
            <Text style={styles.priorityLabel}>{t('wishlist.itemPriority')}</Text>
            <StarRating
              rating={item.priority || 3}
              onRatingChange={handlePriorityChange}
              size={28}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Action Buttons */}
          <Pressable
            onPress={handleFavorite}
            style={({ pressed }) => [styles.optionButton, pressed && styles.optionButtonPressed]}
          >
            <MaterialCommunityIcons
              name={favorited ? 'heart' : 'heart-outline'}
              size={24}
              color={colors.burgundy[600]}
            />
            <Text style={styles.optionLabel}>
              {favorited ? t('wishlist.favorite.removeFavorite') : t('wishlist.favorite.markFavorite')}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.optionButton, pressed && styles.optionButtonPressed]}
          >
            <MaterialCommunityIcons name="share-variant" size={24} color={colors.burgundy[600]} />
            <Text style={styles.optionLabel}>{t('common.share')}</Text>
          </Pressable>

          <Pressable
            onPress={handleEdit}
            style={({ pressed }) => [styles.optionButton, pressed && styles.optionButtonPressed]}
          >
            <MaterialCommunityIcons name="pencil" size={24} color={colors.burgundy[600]} />
            <Text style={styles.optionLabel}>{t('common.edit')}</Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.optionButton, pressed && styles.optionButtonPressed]}
          >
            <MaterialCommunityIcons name="delete" size={24} color={colors.error} />
            <Text style={[styles.optionLabel, styles.optionLabelDestructive]}>
              {t('common.delete')}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.cream[50],
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  handleIndicator: {
    backgroundColor: colors.burgundy[300],
    width: 48,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
  },
  previewPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.burgundy[900],
    marginBottom: spacing.xs,
  },
  previewPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gold[700],
  },
  divider: {
    height: 1,
    backgroundColor: colors.cream[200],
    marginVertical: spacing.sm,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  priorityLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.burgundy[700],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderRadius: borderRadius.sm,
  },
  optionButtonPressed: {
    backgroundColor: colors.cream[100],
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.burgundy[800],
  },
  optionLabelDestructive: {
    color: colors.error,
  },
});
```

### Wiring Sheet to Grid Screen
```typescript
// app/(app)/(tabs)/index.tsx - Integration pattern
import { useRef, useCallback } from 'react';
import { OptionsSheet, OptionsSheetRef } from '@/components/wishlist/OptionsSheet';

export default function WishlistScreen() {
  const optionsSheetRef = useRef<OptionsSheetRef>(null);

  // Callback for grid card action button
  const handleItemAction = useCallback((item: WishlistItem) => {
    optionsSheetRef.current?.open(item);
  }, []);

  // Callbacks for sheet actions
  const handleFavoriteToggle = useCallback((itemId: string) => {
    handleHeartPress(items.find(i => i.id === itemId)!);
  }, [items, handleHeartPress]);

  const handlePriorityChange = useCallback(async (itemId: string, newPriority: number) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, priority: newPriority } : i));

    try {
      await supabase
        .from('wishlist_items')
        .update({ priority: newPriority })
        .eq('id', itemId);
    } catch (error) {
      // Revert on error
      await fetchWishlistItems();
    }
  }, []);

  const handleDelete = useCallback(async (itemId: string) => {
    await handleDeleteItem(itemId);
  }, [handleDeleteItem]);

  const isFavorite = useCallback((itemId: string) => {
    return favorites.some(f => f.itemId === itemId);
  }, [favorites]);

  return (
    <>
      {/* ... existing content ... */}

      <WishlistGrid
        items={sortedItems}
        onItemPress={handleItemPress}
        onItemAction={handleItemAction}  // Opens options sheet
        isOwner={true}
        favoriteItemIds={favoriteItemIds}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <OptionsSheet
        ref={optionsSheetRef}
        onFavoriteToggle={handleFavoriteToggle}
        onPriorityChange={handlePriorityChange}
        onDelete={handleDelete}
        isFavorite={isFavorite}
      />
    </>
  );
}
```

### Detail Page Options Button
```typescript
// app/(app)/wishlist/[id].tsx - Header options button handler
// Source: Existing header pattern in detail page

// Add state for options sheet
const optionsSheetRef = useRef<OptionsSheetRef>(null);

// Header right button
<Stack.Screen
  options={{
    headerRight: () => (
      <Pressable
        onPress={() => {
          if (isOwner && item) {
            optionsSheetRef.current?.open(item);
          }
        }}
        style={[styles.headerButton, { marginRight: spacing.sm }]}
      >
        <MaterialCommunityIcons
          name="dots-vertical"
          size={24}
          color={colors.white}
        />
      </Pressable>
    ),
  }}
/>

// Add OptionsSheet at end of component
{isOwner && (
  <OptionsSheet
    ref={optionsSheetRef}
    onFavoriteToggle={handleFavoriteToggle}
    onPriorityChange={handlePriorityChange}
    onDelete={handleDelete}
    isFavorite={isFavorite}
  />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ActionSheetIOS | Cross-platform bottom sheet | 2020+ | Consistent UX across iOS/Android |
| Modal + custom backdrop | @gorhom/bottom-sheet | v3+ stable | Gesture handling, snap points included |
| expo-sharing (file focus) | React Native Share | Native | Better for text/URL sharing |
| TouchableOpacity in sheets | Pressable | RN 0.64+ | Consistent press feedback |

**Deprecated/outdated:**
- `ActionSheetIOS`: iOS only; use cross-platform bottom sheet instead
- Custom pan gesture sheets: Use @gorhom/bottom-sheet which handles all edge cases
- `Share.open()` from react-native-share: Adds dependency; built-in Share API sufficient for text/URLs

## Open Questions

1. **Edit Form Route**
   - What we know: Need to navigate to edit form from options sheet
   - What's unclear: Does edit form route exist? What's the route structure?
   - Recommendation: Check if `/wishlist/[id]/edit` exists; if not, add to Phase 36 scope or create placeholder that shows alert

2. **Special Item Edit Restrictions**
   - What we know: Mystery Box and Surprise Me items have different fields than standard items
   - What's unclear: Should edit be disabled for special items? What fields are editable?
   - Recommendation: Disable edit for non-standard item_type; only allow priority change via sheet

3. **Favorite Context in Sheet**
   - What we know: Favorite is per-group; sheet doesn't know which group context
   - What's unclear: Should sheet show group picker for favorite? Or toggle in "any group"?
   - Recommendation: For v1, sheet shows generic favorite toggle that opens existing GroupPickerSheet

## Sources

### Primary (HIGH confidence)
- [@gorhom/bottom-sheet Documentation](https://gorhom.dev/react-native-bottom-sheet/) - Props, methods, modal usage
- [React Native Share API](https://reactnative.dev/docs/share) - Built-in sharing functionality
- Existing codebase: `components/wishlist/LuxuryBottomSheet.tsx` - Proven forwardRef pattern
- Existing codebase: `components/wishlist/GroupPickerSheet.tsx` - Modal-based sheet pattern
- Existing codebase: `lib/favorites.ts` - Favorite toggle functions
- Existing codebase: `components/ui/StarRating.tsx` - Priority input component

### Secondary (MEDIUM confidence)
- [@gorhom/bottom-sheet v5 Discussion](https://github.com/gorhom/react-native-bottom-sheet/discussions/1125) - v5 changes
- [Expo Sharing Documentation](https://docs.expo.dev/versions/latest/sdk/sharing/) - Alternative for file sharing

### Tertiary (LOW confidence)
- None - all patterns verified in existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in existing sheets
- Architecture: HIGH - Pattern directly from existing LuxuryBottomSheet.tsx
- Pitfalls: HIGH - Based on similar sheet implementations in codebase + React Native Share docs

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (30 days - stable APIs, proven patterns)
