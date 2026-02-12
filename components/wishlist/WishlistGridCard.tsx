/**
 * WishlistGridCard Component
 *
 * Compact grid card for wishlist items in 2-column grid layout.
 * Displays image (with expo-image caching), title, price, and action button.
 * Handles special item types (Surprise Me, Mystery Box) with distinct placeholders.
 *
 * Features:
 * - expo-image with recyclingKey for FlashList compatibility
 * - Blur placeholder for loading states
 * - 2-line title truncation
 * - Role-based action button (owner options vs. claim indicator)
 * - Celebrant privacy: "Taken" badge instead of claimer identity
 * - Pressable touch handling with pressed state
 */

import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { formatItemPrice, getImagePlaceholder } from '@/utils/wishlist';
import type { WishlistItem } from '@/types/database.types';
import type { ClaimWithUser } from '@/lib/claims';

/**
 * Props for WishlistGridCard component
 */
export interface WishlistGridCardProps {
  /** The wishlist item to display */
  item: WishlistItem;
  /** Called when card is tapped (navigate to detail) */
  onPress: () => void;
  /** Called when action button is tapped (options/claim actions) */
  onActionPress: () => void;
  /** Index in the list (for animations/keys) */
  index: number;
  /** Whether this item is favorited by the viewing group */
  isFavorite: boolean;

  // Claim context - different views show different information
  /** Celebrant view: Is this item claimed by someone? */
  isTaken?: boolean;
  /** Non-celebrant view: Claim data if item is claimed */
  claim?: ClaimWithUser | null;
  /** Non-celebrant view: Does the current user own this claim? */
  isYourClaim?: boolean;
}

// Calculate card width for 2-column grid with 8px gap
// Each card has 4px horizontal margin (4px left + 4px right = 8px gap between cards)
// Container has 12px padding on each side (16px - 4px card margin)
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_MARGIN = spacing.sm / 2; // 4px margin on each side of card
const CONTAINER_PADDING = spacing.md - CARD_MARGIN; // 12px container padding
const CARD_WIDTH = (SCREEN_WIDTH - CONTAINER_PADDING * 2 - CARD_MARGIN * 4) / 2;

// Default blurhash for image placeholder (warm gold tone matching theme)
const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

/**
 * WishlistGridCard Component
 *
 * Compact card for grid display with:
 * - Square image (1:1 aspect) or placeholder icon
 * - 2-line truncated title
 * - Formatted price
 * - Action button (bottom-right)
 * - Optional "Taken" badge (celebrant view)
 */
export function WishlistGridCard({
  item,
  onPress,
  onActionPress,
  index,
  isFavorite,
  isTaken,
  claim,
  isYourClaim,
}: WishlistGridCardProps) {
  // Get placeholder configuration for items without images
  const placeholder = getImagePlaceholder(item.item_type);

  // Format price based on item type (handles mystery box tier, surprise me budget)
  const priceDisplay = formatItemPrice(item);

  // Determine if item has a valid image URL (standard items only)
  const hasImage = !!item.image_url && item.item_type === 'standard';

  // Determine action button icon based on context
  const getActionIcon = () => {
    // Owner view: always show options menu
    if (!claim && !isTaken) {
      return 'dots-vertical';
    }

    // Non-celebrant view with claim context
    if (claim) {
      // User's own claim
      if (isYourClaim) {
        return 'check-circle';
      }
      // Someone else's claim
      return 'gift';
    }

    // Unclaimed item (non-owner view)
    return 'gift-outline';
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        // Dim the card if taken (celebrant view)
        isTaken && styles.cardDimmed,
        // Pressed state feedback
        pressed && styles.cardPressed,
        // Favorite border accent (future enhancement)
        isFavorite && styles.cardFavorite,
      ]}
    >
      {/* Image Container - Square aspect ratio */}
      <View style={styles.imageContainer}>
        {hasImage ? (
          // Standard item with image - use expo-image with caching
          <Image
            source={{ uri: item.image_url! }}  // Non-null assertion: hasImage verifies image_url exists
            recyclingKey={item.id}              // CRITICAL: Prevents wrong-image flicker in FlashList
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"           // Memory cache with disk fallback
            placeholder={{ blurhash: DEFAULT_BLURHASH }}
            placeholderContentFit="cover"       // Match contentFit to prevent scaling flicker
            transition={200}                    // 200ms crossfade on load
          />
        ) : (
          // Special items or no image - show placeholder icon
          <View style={[styles.placeholder, { backgroundColor: placeholder.backgroundColor }]}>
            <MaterialCommunityIcons
              name={placeholder.iconName}
              size={48}
              color={placeholder.iconColor}
            />
          </View>
        )}

        {/* Taken Badge - Only show in celebrant view when item is claimed */}
        {isTaken && (
          <View style={styles.takenBadge}>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color={colors.success}
            />
            <Text style={styles.takenText}>Taken</Text>
          </View>
        )}
      </View>

      {/* Content Section - Title and Price */}
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>
        {priceDisplay && (
          <Text style={styles.price}>{priceDisplay}</Text>
        )}
      </View>

      {/* Action Button - Bottom-right positioned absolutely */}
      <Pressable
        onPress={(e) => {
          // Prevent parent press event from triggering
          e.stopPropagation?.();
          onActionPress();
        }}
        style={styles.actionButton}
        hitSlop={8}  // Increase touch target for better UX
      >
        <MaterialCommunityIcons
          name={getActionIcon()}
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
    marginHorizontal: CARD_MARGIN,  // 4px on each side = 8px gap between columns
    marginBottom: spacing.sm,       // 8px gap between rows
    ...shadows.sm,
  },
  cardDimmed: {
    opacity: 0.6,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardFavorite: {
    // Future: Add gold border accent for favorited items
    // borderWidth: 2,
    // borderColor: colors.gold[600],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,  // Square image container
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
