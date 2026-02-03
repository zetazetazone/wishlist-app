# Phase 9: Favorite Marking - Research

**Researched:** 2026-02-03
**Domain:** React Native UI state management, Supabase upsert, optimistic updates
**Confidence:** HIGH

## Summary

This phase implements a "Most Wanted" favorite marking feature where users can designate one wishlist item per group as their top pick. The research focuses on three core technical domains: (1) UI toggle with heart icon and pulse animation using Moti, (2) database operations using Supabase upsert with automatic replacement behavior, and (3) optimistic update patterns for instant feedback with rollback on error.

The technical foundation is already in place: the `group_favorites` table exists with a UNIQUE(user_id, group_id) constraint enforcing one-per-group, RLS policies are configured, and TypeScript types are generated. The LuxuryWishlistCard component already uses Moti for animations and has an established pattern for the top-right corner actions. The codebase has existing upsert patterns in `lib/contributions.ts` that serve as a template.

The primary complexity is handling the "auto-replace" behavior where favoriting a new item automatically unfavorites the old one. Supabase's upsert with `onConflict: 'user_id,group_id'` handles this atomically at the database level. The UI challenge is coordinating visual transitions when one heart unfills while another fills.

**Primary recommendation:** Use Supabase upsert with onConflict for atomic replacement, optimistic UI updates with immediate visual feedback, and Moti spring animations for the heart pulse effect. Keep server as source of truth for list ordering.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| moti | ^0.30.0 | Declarative animations | Already in codebase, wraps Reanimated 3, simple API for scale/opacity |
| @supabase/supabase-js | ^2.93.3 | Database operations | Already configured, provides upsert with onConflict |
| react-native-reanimated | ~4.1.1 | Animation engine | Powers Moti, already installed |
| @expo/vector-icons | ^15.0.3 | Heart icon | MaterialCommunityIcons already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-linear-gradient | ~15.0.8 | Accent border gradients | Already used in LuxuryWishlistCard |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Moti | Raw Reanimated | More boilerplate, Moti already proven in codebase |
| useState | React Query | Would add dependency; useState with manual rollback is simpler for single-user favorite toggle |
| Custom animation | Lottie | Overkill for simple pulse effect |

**Installation:**
```bash
# No new dependencies required - all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── favorites.ts            # New file: favorite toggle operations
components/
├── wishlist/
│   ├── LuxuryWishlistCard.tsx  # Modified: add heart icon and isFavorite prop
│   └── FavoriteHeart.tsx       # New: animated heart toggle component
```

### Pattern 1: Upsert with onConflict for Auto-Replace
**What:** Use Supabase upsert to atomically insert or replace favorite
**When to use:** When favoriting a new item in a group where user already has a favorite
**Example:**
```typescript
// Source: Existing pattern from lib/contributions.ts + Supabase docs
const { data, error } = await supabase
  .from('group_favorites')
  .upsert(
    {
      user_id: userId,
      group_id: groupId,
      item_id: newItemId,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,group_id',  // UNIQUE constraint handles replacement
    }
  )
  .select()
  .single();
```

### Pattern 2: Optimistic Update with Rollback
**What:** Update UI immediately, revert on error
**When to use:** All favorite toggle operations for instant feedback
**Example:**
```typescript
// Source: React optimistic update pattern
const toggleFavorite = async (itemId: string, groupId: string) => {
  // Store previous state for rollback
  const previousFavoriteId = favoriteItemId;

  // Optimistic update
  setFavoriteItemId(itemId === favoriteItemId ? null : itemId);

  try {
    if (itemId === previousFavoriteId) {
      // Unfavoriting - delete the record
      await supabase
        .from('group_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', groupId);
    } else {
      // Favoriting - upsert replaces any existing
      await supabase
        .from('group_favorites')
        .upsert({ user_id: userId, group_id: groupId, item_id: itemId },
                { onConflict: 'user_id,group_id' });
    }
  } catch (error) {
    // Rollback on error
    setFavoriteItemId(previousFavoriteId);
    console.error('Failed to toggle favorite:', error);
  }
};
```

### Pattern 3: Moti Pulse Animation on Toggle
**What:** Scale pulse effect when tapping heart icon
**When to use:** Visual feedback during favorite status change
**Example:**
```typescript
// Source: Moti documentation - https://moti.fyi/animations
import { MotiView } from 'moti';

<MotiView
  from={{ scale: 1 }}
  animate={{ scale: animating ? [1, 1.3, 1] : 1 }}
  transition={{
    type: 'spring',
    damping: 10,
    stiffness: 200,
  }}
>
  <MaterialCommunityIcons
    name={isFavorite ? 'heart' : 'heart-outline'}
    size={24}
    color={isFavorite ? colors.gold[500] : colors.burgundy[300]}
  />
</MotiView>
```

### Pattern 4: List Sorting with Favorite Pinned
**What:** Sort wishlist items with favorite at top, then by priority
**When to use:** Displaying wishlist items in My Wishlist and celebrant event view
**Example:**
```typescript
// Source: Standard JavaScript sorting pattern
const sortedItems = [...items].sort((a, b) => {
  // Favorite always first
  if (a.id === favoriteItemId) return -1;
  if (b.id === favoriteItemId) return 1;
  // Then by priority (stars) descending
  return b.priority - a.priority;
});
```

### Anti-Patterns to Avoid
- **Optimistic list reordering:** Don't move items in the list optimistically; only toggle the heart icon. Refetch or use server-returned order to prevent UI jumps.
- **Multiple useState for same data:** Don't track favorite status separately from items array; use a single `favoriteItemId` state alongside items.
- **Silent failures:** Always handle errors and provide visual feedback or rollback.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| One-per-group enforcement | Application-level checks | UNIQUE(user_id, group_id) + upsert | Database guarantees atomicity, no race conditions |
| Animation timing | Manual setTimeout | Moti's transition system | Handles interruptions, cancelation, spring physics |
| Icon library | Custom SVG hearts | MaterialCommunityIcons | Already imported, consistent with app |
| Error rollback | Try-catch with manual state | useState with previous value capture | Standard React pattern, reliable |

**Key insight:** The UNIQUE constraint and upsert pattern make the "auto-replace" behavior trivial - no application code needed to unfavorite the old item. Let the database handle it.

## Common Pitfalls

### Pitfall 1: Forgetting to Handle Delete Case
**What goes wrong:** Code only handles upsert but not unfavoriting (tapping filled heart to remove favorite)
**Why it happens:** Upsert only inserts/updates, it doesn't delete
**How to avoid:** Check if tapping the already-favorited item and call delete instead of upsert
**Warning signs:** Heart stays filled after tapping to unfavorite

### Pitfall 2: UI Flicker on List Reorder
**What goes wrong:** List items visibly jump positions during optimistic update
**Why it happens:** Sorting items immediately after toggle before server confirms
**How to avoid:** Don't optimistically reorder; only change heart icon state. Server is source of truth for order.
**Warning signs:** Items flash to top then back down

### Pitfall 3: Missing RLS Check for Insert
**What goes wrong:** Upsert silently fails with no error
**Why it happens:** Supabase upsert requires SELECT, INSERT, and UPDATE RLS policies to all pass
**How to avoid:** RLS already configured in Phase 6 migration; verify policies if issues arise
**Warning signs:** Favorite doesn't persist after app refresh

### Pitfall 4: Animation Interruption Glitches
**What goes wrong:** Rapid tapping causes animation state to desync from actual favorite state
**Why it happens:** Animation not tied to final state, or multiple animations queued
**How to avoid:** Use Moti's animate prop directly tied to isFavorite boolean; Moti handles interruptions
**Warning signs:** Heart animation out of sync with filled/outline state

### Pitfall 5: Special Items Edge Case
**What goes wrong:** Surprise Me or Mystery Box items look weird as favorites
**Why it happens:** These items have different visual treatment (burgundy borders, special icons)
**How to avoid:** Allow favoriting but ensure badge doesn't clash with "Most Wanted" badge visually
**Warning signs:** Visual clutter, overlapping badges

## Code Examples

Verified patterns from official sources and codebase:

### FavoriteHeart Component
```typescript
// Source: Moti docs + codebase patterns from LuxuryWishlistCard.tsx
import { TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

interface FavoriteHeartProps {
  isFavorite: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function FavoriteHeart({ isFavorite, onPress, disabled }: FavoriteHeartProps) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <MotiView
        animate={{ scale: [1, 1.2, 1] }}
        transition={{
          type: 'spring',
          damping: 15,
          stiffness: 300,
        }}
        key={isFavorite ? 'filled' : 'outline'} // Trigger animation on change
      >
        <MaterialCommunityIcons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={24}
          color={isFavorite ? colors.gold[500] : colors.burgundy[300]}
        />
      </MotiView>
    </TouchableOpacity>
  );
}
```

### Favorite Service Functions
```typescript
// Source: lib/contributions.ts pattern + Supabase upsert docs
import { supabase } from './supabase';

export async function setFavorite(
  userId: string,
  groupId: string,
  itemId: string
): Promise<void> {
  const { error } = await supabase
    .from('group_favorites')
    .upsert(
      {
        user_id: userId,
        group_id: groupId,
        item_id: itemId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,group_id' }
    );

  if (error) {
    throw new Error(`Failed to set favorite: ${error.message}`);
  }
}

export async function removeFavorite(
  userId: string,
  groupId: string
): Promise<void> {
  const { error } = await supabase
    .from('group_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('group_id', groupId);

  if (error) {
    throw new Error(`Failed to remove favorite: ${error.message}`);
  }
}

export async function getFavoriteForGroup(
  userId: string,
  groupId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('group_favorites')
    .select('item_id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No row found
    throw new Error(`Failed to get favorite: ${error.message}`);
  }

  return data?.item_id || null;
}
```

### "Most Wanted" Badge Component
```typescript
// Source: ItemTypeBadge pattern from components/wishlist/ItemTypeBadge.tsx
import { View, Text } from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

export function MostWantedBadge() {
  return (
    <View
      style={{
        backgroundColor: colors.gold[100],
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginBottom: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.gold[700],
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        }}
      >
        MOST WANTED
      </Text>
    </View>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual favorite toggle with separate unfavorite | Upsert with onConflict for atomic replace | Supabase v2+ | Eliminates race conditions |
| Animated API from React Native | Reanimated 3 via Moti | 2023-2024 | Better performance, simpler API |
| React 18 optimistic with dual state | React 19 useOptimistic hook | Dec 2024 | Note: Project uses React 19; could use useOptimistic but useState pattern is simpler here |

**Deprecated/outdated:**
- React Native Animated API: Still works but Reanimated/Moti preferred for performance
- Explicit ON CONFLICT in raw SQL: Supabase JS handles this with onConflict option

## Open Questions

Things that couldn't be fully resolved:

1. **Special items as favorites (Claude's Discretion)**
   - What we know: Surprise Me and Mystery Box items can technically be favorited
   - What's unclear: Should the "Most Wanted" badge appear alongside the item type badge, or replace it?
   - Recommendation: Allow favoriting special items; stack badges vertically (item type badge above, "Most Wanted" below)

2. **Heart icon size and exact positioning (Claude's Discretion)**
   - What we know: Top-right corner of card is decided; existing delete button is 24px
   - What's unclear: Exact offset from edge, whether heart replaces or coexists with delete button
   - Recommendation: Heart at 24px, positioned where delete button currently is on owner's view; heart takes precedence (delete via swipe or long-press if needed)

3. **Animation timing (Claude's Discretion)**
   - What we know: "Subtle pulse" is specified
   - What's unclear: Exact duration and easing
   - Recommendation: Use spring animation with damping: 15, stiffness: 300, scale: 1 -> 1.2 -> 1. Duration approximately 200-300ms.

## Sources

### Primary (HIGH confidence)
- Supabase JavaScript Upsert Documentation - https://supabase.com/docs/reference/javascript/upsert
- Moti Animation Documentation - https://moti.fyi/animations
- Existing codebase: `lib/contributions.ts` (upsert pattern), `LuxuryWishlistCard.tsx` (Moti usage)

### Secondary (MEDIUM confidence)
- React Optimistic Update Patterns - https://react.dev/reference/react/useOptimistic
- TanStack Query Optimistic Updates - https://tanstack.com/query/v4/docs/framework/react/guides/optimistic-updates

### Tertiary (LOW confidence)
- Community patterns for heart icon toggles (various blog posts)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase, patterns verified
- Architecture: HIGH - Follows existing codebase patterns exactly
- Pitfalls: HIGH - Based on existing PITFALLS.md research and common React Native patterns

**Research date:** 2026-02-03
**Valid until:** 60 days (stable libraries, patterns well-established)
