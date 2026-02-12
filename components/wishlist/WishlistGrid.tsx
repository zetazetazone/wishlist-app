/**
 * WishlistGrid Component
 *
 * FlashList grid wrapper for wishlist items.
 * Encapsulates FlashList configuration, renderItem logic, and refresh handling.
 * Provides consistent grid layout across My Wishlist and celebration pages.
 *
 * Features:
 * - 2-column uniform grid layout (8px gap between columns)
 * - Virtualization for 60fps scrolling
 * - Pull-to-refresh support
 * - View-context-aware rendering (owner, celebrant, non-celebrant)
 * - Empty state support
 */

import { useCallback } from 'react';
import { StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { WishlistGridCard } from './WishlistGridCard';
import { colors, spacing } from '@/constants/theme';
import type { WishlistItem } from '@/types/database.types';
import type { ClaimWithUser } from '@/lib/claims';

/**
 * Props for WishlistGrid component
 */
export interface WishlistGridProps {
  /** Array of wishlist items to display */
  items: WishlistItem[];
  /** Called when a grid card is tapped */
  onItemPress: (item: WishlistItem) => void;
  /** Called when action button on a card is tapped */
  onItemAction: (item: WishlistItem) => void;

  // View context
  /** True = My Wishlist (owner context), False = celebration page */
  isOwner: boolean;

  // Celebrant view (isOwner=false, isCelebrant=true)
  /** Is the current user the celebrant? (viewing own celebration page) */
  isCelebrant?: boolean;
  /** Item ID -> isTaken (used in celebrant view to show Taken badge) */
  claimStatuses?: Map<string, boolean>;

  // Non-celebrant view (isOwner=false, isCelebrant=false)
  /** Item ID -> claim data (used in non-celebrant view to show claim info) */
  claims?: Map<string, ClaimWithUser>;
  /** Current user ID (for determining isYourClaim) */
  currentUserId?: string;

  // Favorite state
  /** Set of favorited item IDs */
  favoriteItemIds?: Set<string>;

  // Refresh
  /** Whether refresh is in progress */
  refreshing?: boolean;
  /** Called when user pulls to refresh */
  onRefresh?: () => void;

  // Empty state
  /** Component to show when items array is empty */
  ListEmptyComponent?: React.ReactElement;

  // Header (for banners, special items, etc.)
  /** Component to show above the grid items */
  ListHeaderComponent?: React.ReactElement;

  // Nested scroll support
  /** Set to false when inside a ScrollView to use calculated height */
  scrollEnabled?: boolean;
}

/**
 * WishlistGrid Component
 *
 * Wraps FlashList with masonry configuration and consistent rendering logic.
 * Handles three view contexts:
 * 1. Owner view (My Wishlist) - shows options button
 * 2. Celebrant view (viewing own celebration) - shows Taken badges
 * 3. Non-celebrant view (viewing others' celebration) - shows claim indicators
 */
export function WishlistGrid({
  items,
  onItemPress,
  onItemAction,
  isOwner,
  isCelebrant,
  claimStatuses,
  claims,
  currentUserId,
  favoriteItemIds,
  refreshing,
  onRefresh,
  ListEmptyComponent,
  ListHeaderComponent,
  scrollEnabled = true,
}: WishlistGridProps) {
  /**
   * Render individual grid card with appropriate context
   */
  const renderItem = useCallback(
    ({ item, index }: { item: WishlistItem; index: number }) => {
      // Determine if item is favorited by the viewing group
      const isFavorite = favoriteItemIds?.has(item.id) ?? false;

      // Celebrant view: show Taken badge when item is claimed
      if (isCelebrant) {
        const isTaken = claimStatuses?.get(item.id) ?? false;
        return (
          <WishlistGridCard
            item={item}
            onPress={() => onItemPress(item)}
            onActionPress={() => onItemAction(item)}
            index={index}
            isFavorite={isFavorite}
            isTaken={isTaken}
          />
        );
      }

      // Non-celebrant view: show claim indicators
      if (!isOwner && !isCelebrant) {
        const claim = claims?.get(item.id) ?? null;
        const isYourClaim = claim?.claimer?.id === currentUserId;
        return (
          <WishlistGridCard
            item={item}
            onPress={() => onItemPress(item)}
            onActionPress={() => onItemAction(item)}
            index={index}
            isFavorite={isFavorite}
            claim={claim}
            isYourClaim={isYourClaim}
          />
        );
      }

      // Owner view: show options button
      return (
        <WishlistGridCard
          item={item}
          onPress={() => onItemPress(item)}
          onActionPress={() => onItemAction(item)}
          index={index}
          isFavorite={isFavorite}
        />
      );
    },
    [
      onItemPress,
      onItemAction,
      isOwner,
      isCelebrant,
      claimStatuses,
      claims,
      currentUserId,
      favoriteItemIds,
    ]
  );

  /**
   * Extract unique key for each item (required for FlashList)
   */
  const keyExtractor = useCallback((item: WishlistItem) => item.id, []);

  return (
    <FlashList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // Standard 2-column grid (uniform row heights)
      numColumns={2}
      contentContainerStyle={styles.listContent}
      // Pull-to-refresh (conditional)
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={colors.burgundy[600]}
            colors={[colors.burgundy[600]]}
          />
        ) : undefined
      }
      // Empty state
      ListEmptyComponent={ListEmptyComponent}
      // Header
      ListHeaderComponent={ListHeaderComponent}
      // Nested scroll support
      scrollEnabled={scrollEnabled}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.md - spacing.sm / 2,  // 12px (16 - 4) to account for card margins
    paddingTop: spacing.md,                          // 16px top padding
    paddingBottom: 100,                              // Space for FAB at bottom
  },
});
