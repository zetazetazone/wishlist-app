# Phase 40: Multi-Wishlist UI - Research

**Researched:** 2026-02-16
**Domain:** React Native UI, wishlist management, drag-and-drop reordering
**Confidence:** HIGH

## Summary

Phase 40 implements the user interface for managing multiple wishlists. The database foundation from Phase 37 provides the `wishlists` table with `name`, `emoji`, `sort_order`, and `is_default` columns. This phase builds CRUD screens for wishlists, enables drag-and-drop reordering, and allows users to move items between wishlists.

The project already uses `react-native-reanimated` and `react-native-gesture-handler` (verified in package.json), making `react-native-draggable-flatlist` the ideal choice for reordering. For emoji selection, a simple modal with categorized emoji grid is sufficient - no external library needed since emojis are just Unicode strings.

**Primary recommendation:** Use existing Modal patterns (like CreateGroupModal) for wishlist CRUD, add a WishlistPickerSheet for item placement, and integrate draggable list for reordering on the main wishlist screen.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-reanimated | 3.x | Animation runtime | Already installed, powers animations |
| react-native-gesture-handler | 2.x | Gesture support | Already installed, required for drag |
| @react-navigation | 6.x | Navigation | Already installed, screen management |
| react-query | 5.x | Server state | Already installed, wishlist data fetching |
| zustand | 4.x | Local state | Already installed, UI state management |

### Supporting (Add for This Phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-draggable-flatlist | ^4.0.1 | Drag-and-drop reordering | Wishlist reordering (WISH-05) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-native-draggable-flatlist | react-native-draglist | Fewer deps but less smooth animations |
| External emoji picker | Custom emoji grid | Custom is simpler, avoids another dep |
| Bottom sheet for CRUD | Modal (existing pattern) | Modal already used for CreateGroupModal |

**Installation:**
```bash
npm install react-native-draggable-flatlist
```

Note: No pod install needed - this is a JS-only library leveraging already-installed native modules (reanimated, gesture handler).

## Architecture Patterns

### Recommended Project Structure
```
components/
  wishlist/
    WishlistManager.tsx       # Main wishlists screen component
    WishlistCard.tsx          # Draggable wishlist row item
    CreateWishlistModal.tsx   # Create/edit wishlist modal
    WishlistPickerSheet.tsx   # Bottom sheet for selecting wishlist
    MoveItemSheet.tsx         # Bottom sheet for moving item between wishlists
    EmojiPickerModal.tsx      # Simple emoji category grid
hooks/
  useWishlists.ts             # React Query hooks for wishlists CRUD
  useWishlistItems.ts         # Extended to support filtering by wishlist
lib/
  wishlists.ts                # Supabase CRUD functions for wishlists
```

### Pattern 1: Wishlists Screen with Draggable List
**What:** Main screen showing all user wishlists with drag-to-reorder
**When to use:** WISH-05 (reorder wishlists for display priority)
**Example:**
```typescript
// Using react-native-draggable-flatlist
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams
} from 'react-native-draggable-flatlist';

const WishlistManager = () => {
  const { data: wishlists, isLoading } = useWishlists();
  const updateSortOrder = useUpdateWishlistOrder();

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Wishlist>) => (
    <ScaleDecorator>
      <WishlistCard
        wishlist={item}
        onLongPress={drag}
        isActive={isActive}
      />
    </ScaleDecorator>
  );

  const handleDragEnd = ({ data }: { data: Wishlist[] }) => {
    // Update sort_order for all affected wishlists
    const updates = data.map((w, index) => ({ id: w.id, sort_order: index }));
    updateSortOrder.mutate(updates);
  };

  return (
    <DraggableFlatList
      data={wishlists}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onDragEnd={handleDragEnd}
    />
  );
};
```

### Pattern 2: Wishlist Picker Sheet (for SCRAPE-10)
**What:** Bottom sheet allowing user to choose which wishlist to add item to
**When to use:** add-from-url screen, share intent handler
**Example:**
```typescript
// Follows GroupPickerSheet pattern already in codebase
interface WishlistPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (wishlistId: string) => void;
  selectedWishlistId?: string;
}

const WishlistPickerSheet = ({ visible, onClose, onSelect, selectedWishlistId }: WishlistPickerSheetProps) => {
  const { data: wishlists } = useWishlists();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('wishlists.selectWishlist')}</Text>
          <FlatList
            data={wishlists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.wishlistRow,
                  item.id === selectedWishlistId && styles.selected
                ]}
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <Text style={styles.emoji}>{item.emoji || '📋'}</Text>
                <Text style={styles.name}>{item.name}</Text>
                {item.is_default && <Text style={styles.badge}>{t('wishlists.default')}</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};
```

### Pattern 3: Aggregate View (WISH-07)
**What:** View all items across all wishlists
**When to use:** "All Items" tab or toggle on wishlist screen
**Example:**
```typescript
// useWishlistItems hook extension
export const useAllWishlistItems = () => {
  return useQuery({
    queryKey: ['wishlistItems', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
          *,
          wishlist:wishlists(id, name, emoji)
        `)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};
```

### Pattern 4: Simple Emoji Picker
**What:** Modal with categorized emoji grid for wishlist emoji selection
**When to use:** Create/edit wishlist modal
**Example:**
```typescript
// No external library needed - just Unicode strings
const EMOJI_CATEGORIES = {
  common: ['🎁', '💝', '🎄', '🎂', '💍', '👗', '👟', '📱', '🎮', '📚'],
  objects: ['⌚', '👜', '💄', '🎒', '👓', '🎧', '💻', '🖥️', '🎸', '🎹'],
  food: ['🍰', '🍫', '☕', '🍷', '🍾', '🧁', '🍪', '🥂', '🍺', '🥤'],
  activities: ['⚽', '🏀', '🎿', '🏊', '🚴', '🧘', '🎨', '🎭', '🎬', '🎤'],
  travel: ['✈️', '🚗', '🏠', '🏖️', '🏔️', '🌴', '🗽', '🗼', '🎢', '⛺'],
  symbols: ['❤️', '⭐', '✨', '🔥', '💎', '🏆', '🎯', '💫', '🌟', '💰'],
};

const EmojiPickerModal = ({ visible, onClose, onSelect, selectedEmoji }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>{t('wishlists.chooseEmoji')}</Text>
          <ScrollView>
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <View key={category}>
                <Text style={styles.categoryLabel}>{t(`wishlists.emojiCategories.${category}`)}</Text>
                <View style={styles.emojiGrid}>
                  {emojis.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiButton,
                        emoji === selectedEmoji && styles.selected
                      ]}
                      onPress={() => {
                        onSelect(emoji);
                        onClose();
                      }}
                    >
                      <Text style={styles.emoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => { onSelect(null); onClose(); }}>
            <Text>{t('wishlists.removeEmoji')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
```

### Anti-Patterns to Avoid
- **Don't use bottom sheet for complex forms:** CreateGroupModal uses Modal, not bottom sheet. Follow same pattern for CreateWishlistModal.
- **Don't fetch wishlists without React Query:** All data should flow through useWishlists hook for caching and optimistic updates.
- **Don't allow deleting default wishlist:** RLS policy blocks this, but UI should also hide delete option for is_default=true.
- **Don't show orphaned items after wishlist delete:** Items get wishlist_id=NULL (ON DELETE SET NULL). UI should filter to user's wishlists only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop list | Custom gesture handling | react-native-draggable-flatlist | Complex gesture math, edge cases |
| Optimistic updates | Manual state reconciliation | React Query mutations | Race conditions, error handling |
| Form validation | Custom validation logic | Simple required checks (existing pattern) | Wishlist form is simple (name required) |
| Sort order persistence | Custom debounce/batch | React Query mutation with invalidation | Consistency with other CRUD |

**Key insight:** The project already has established patterns for modals (CreateGroupModal), bottom sheets (GroupPickerSheet), and data fetching (React Query hooks). Follow these patterns rather than introducing new paradigms.

## Common Pitfalls

### Pitfall 1: Forgetting Default Wishlist Protection
**What goes wrong:** User deletes their default wishlist, breaking item creation
**Why it happens:** UI doesn't check is_default before showing delete option
**How to avoid:** Always check `wishlist.is_default` and hide/disable delete for default
**Warning signs:** RLS policy error when attempting delete

### Pitfall 2: Stale Sort Order After Drag
**What goes wrong:** Sort order reverts to previous state after reorder
**Why it happens:** Optimistic update not invalidating React Query cache properly
**How to avoid:** Use `queryClient.setQueryData` for optimistic update, then invalidate on success
**Warning signs:** List "jumps" back to original order

### Pitfall 3: Items Disappear After Wishlist Delete
**What goes wrong:** User deletes wishlist, items vanish (they're orphaned with wishlist_id=NULL)
**Why it happens:** Query filters by wishlist_id, orphaned items don't match
**How to avoid:** Show confirmation explaining items will be orphaned; consider moving items first
**Warning signs:** Item count decreases unexpectedly after wishlist delete

### Pitfall 4: Emoji Not Displaying Correctly
**What goes wrong:** Emoji shows as empty box or question mark
**Why it happens:** Some emojis require specific font support or are too new
**How to avoid:** Use well-supported emoji from Unicode 12 or earlier; test on older devices
**Warning signs:** Emoji looks different or broken on Android vs iOS

### Pitfall 5: Move Item Sheet Not Refreshing
**What goes wrong:** After moving item, old wishlist still shows it
**Why it happens:** React Query cache not invalidated for source wishlist
**How to avoid:** Invalidate both source and destination wishlist queries after move
**Warning signs:** Item appears in both wishlists until screen refresh

## Code Examples

Verified patterns from existing codebase:

### Supabase CRUD Pattern (from lib/wishlistItems.ts)
```typescript
// lib/wishlists.ts - CRUD operations for wishlists
import { supabase } from './supabase';

export interface CreateWishlistInput {
  name: string;
  emoji?: string | null;
}

export const createWishlist = async (input: CreateWishlistInput) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('wishlists')
    .insert({
      user_id: user.id,
      name: input.name,
      emoji: input.emoji || null,
      is_default: false,
      visibility: 'public',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateWishlist = async (id: string, updates: Partial<CreateWishlistInput>) => {
  const { data, error } = await supabase
    .from('wishlists')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteWishlist = async (id: string) => {
  // RLS policy prevents deleting default wishlist
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const updateWishlistOrder = async (updates: { id: string; sort_order: number }[]) => {
  // Batch update sort_order for multiple wishlists
  const promises = updates.map(({ id, sort_order }) =>
    supabase
      .from('wishlists')
      .update({ sort_order })
      .eq('id', id)
  );

  await Promise.all(promises);
};

export const moveItemToWishlist = async (itemId: string, targetWishlistId: string) => {
  const { error } = await supabase
    .from('wishlist_items')
    .update({ wishlist_id: targetWishlistId })
    .eq('id', itemId);

  if (error) throw error;
};
```

### React Query Hook Pattern (from existing hooks)
```typescript
// hooks/useWishlists.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import * as wishlistsApi from '../lib/wishlists';

export const useWishlists = () => {
  return useQuery({
    queryKey: ['wishlists'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

export const useCreateWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wishlistsApi.createWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });
};

export const useUpdateWishlistOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: wishlistsApi.updateWishlistOrder,
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wishlists'] });

      // Snapshot current value
      const previous = queryClient.getQueryData(['wishlists']);

      // Optimistically update
      queryClient.setQueryData(['wishlists'], (old: any[]) => {
        if (!old) return old;
        return updates.map(u => old.find(w => w.id === u.id)).filter(Boolean);
      });

      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['wishlists'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });
};

export const useMoveItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, targetWishlistId }: { itemId: string; targetWishlistId: string }) =>
      wishlistsApi.moveItemToWishlist(itemId, targetWishlistId),
    onSuccess: () => {
      // Invalidate all wishlist item queries
      queryClient.invalidateQueries({ queryKey: ['wishlistItems'] });
    },
  });
};
```

### Modal Pattern (from CreateGroupModal.tsx)
```typescript
// CreateWishlistModal follows same pattern as CreateGroupModal
// Key elements:
// - Modal with transparent background and slide animation
// - KeyboardAvoidingView for form inputs
// - TouchableOpacity backdrop to close
// - Form state with useState
// - Validation before submit
// - Alert for success/error feedback
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-native-sortable-list | react-native-draggable-flatlist | 2022 | Better performance with Reanimated 2/3 |
| External emoji picker libs | Custom emoji grid | 2023 | Simpler, smaller bundle, sufficient for wishlists |
| Redux for local state | Zustand | 2023 | Already in project, simpler API |
| Manual optimistic updates | React Query mutations | 2023 | Built-in rollback, cache invalidation |

**Deprecated/outdated:**
- react-native-sortable-list: Older library, less smooth than draggable-flatlist
- emoji-mart: Designed for web, not ideal for React Native
- Manual drag gesture implementation: Too complex, use library instead

## Open Questions

1. **Aggregate View Presentation**
   - What we know: WISH-07 requires viewing all items across wishlists
   - What's unclear: Separate screen vs. toggle on existing screen? Show wishlist badge per item?
   - Recommendation: Add "All" as first item in wishlist tabs/list, show wishlist emoji badge on each item

2. **Item Move Confirmation**
   - What we know: User can move items between wishlists (WISH-06)
   - What's unclear: Should moving require confirmation? What if item has claims?
   - Recommendation: No confirmation needed for move (reversible action). Claims stay with item regardless of wishlist.

3. **Empty Wishlist State**
   - What we know: New wishlists start empty
   - What's unclear: What to show when wishlist has no items?
   - Recommendation: Follow existing empty state pattern (see WishlistItemList empty state)

## Sources

### Primary (HIGH confidence)
- Phase 37 migration file: `/home/zetaz/wishlist-app/supabase/migrations/20260216000001_v1.7_multi_wishlist_foundation.sql` - wishlists table schema
- Existing codebase: `package.json` - confirms react-native-reanimated, gesture-handler already installed
- Existing codebase: `CreateGroupModal.tsx` - Modal pattern for forms
- Existing codebase: `GroupPickerSheet.tsx` - Bottom sheet pattern for selection

### Secondary (MEDIUM confidence)
- [react-native-draggable-flatlist GitHub](https://github.com/computerjazz/react-native-draggable-flatlist) - API documentation
- [LogRocket Draggable FlatList Tutorial](https://blog.logrocket.com/react-native-draggable-flatlist/) - Implementation patterns
- [Stackademic DraggableFlatList 2025](https://blog.stackademic.com/drag-and-drop-lists-in-react-native-using-draggableflatlist-in-2025-cea93a79e5b0) - Current best practices

### Tertiary (LOW confidence)
- Emoji picker libraries surveyed but custom solution recommended based on simplicity needs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified in package.json and existing codebase
- Architecture: HIGH - follows established patterns in codebase
- Pitfalls: HIGH - derived from database schema (ON DELETE SET NULL) and common React Query issues

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (stable domain, 30 days)
