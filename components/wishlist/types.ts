/**
 * Shared TypeScript types for wishlist components
 *
 * This module provides reusable type definitions for all wishlist-related
 * components, ensuring consistency and avoiding duplication.
 *
 * These types are designed to support multiple rendering contexts:
 * - Grid view (compact display)
 * - Detail view (full functionality)
 * - Options sheet (item management)
 */

import type { WishlistItem } from '@/types/database.types';
import type { ClaimWithUser } from '@/lib/claims';

/**
 * Split status information for an item
 *
 * Represents the current financial status of a split gift,
 * including total pledged amounts and funding progress.
 */
export interface SplitStatusInfo {
  itemPrice: number;
  additionalCosts: number | null;
  totalPledged: number;
  isFullyFunded: boolean;
  isOpen: boolean;
}

/**
 * Contributor information for split display
 *
 * Represents a single contributor to a split gift,
 * used for displaying avatars and amounts in split UI.
 */
export interface SplitContributorInfo {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  amount: number;
}

/**
 * Favorite group information
 *
 * Represents a group where this item is favorited,
 * used for displaying favorite badges.
 */
export interface FavoriteGroupInfo {
  groupId: string;
  groupName: string;
}

/**
 * Claim context discriminated union
 *
 * Represents the viewing context for rendering claim-related UI:
 * - celebrant: The item owner's view (sees if taken, not who claimed)
 * - claimer: The person who claimed the item (can unclaim)
 * - viewer: Other group members (can claim if unclaimed)
 * - none: No claim functionality (e.g., item owner in manage view)
 */
export type ClaimContext =
  | { type: 'celebrant'; isTaken: boolean }
  | { type: 'claimer'; claim: ClaimWithUser }
  | { type: 'viewer'; claim: ClaimWithUser | null; claimable: boolean }
  | { type: 'none' };

/**
 * Props for WishlistGridCard component
 *
 * Minimal props for compact grid display with essential claim information.
 * Used in grid/list views where space is limited.
 */
export interface WishlistGridCardProps {
  /** The wishlist item to display */
  item: WishlistItem;
  /** Whether this item is favorited by the viewing group */
  isFavorite: boolean;
  /** Called when card is tapped */
  onPress: () => void;
  /** Index in the list (for animations/keys) */
  index: number;

  // Claim context - different views show different information
  /** Celebrant view: Is this item claimed by someone? */
  isTaken?: boolean;
  /** Non-celebrant view: Claim data if item is claimed */
  claim?: ClaimWithUser | null;
  /** Non-celebrant view: Does the current user own this claim? */
  isYourClaim?: boolean;
}

/**
 * Props for ItemDetailScreen component
 *
 * Full functionality for the detail page, including:
 * - All claim operations (claim, unclaim)
 * - All split operations (pledge, manage split)
 * - Favorite management
 * - Item options/settings
 */
export interface ItemDetailScreenProps {
  /** The wishlist item being displayed */
  item: WishlistItem;

  // Claim functionality
  /** Show claim button (non-celebrant view of unclaimed item) */
  claimable?: boolean;
  /** Called when user taps Claim */
  onClaim?: () => void;
  /** Called when user taps Unclaim */
  onUnclaim?: () => void;
  /** Loading state during claim operation */
  claiming?: boolean;
  /** Claim data (null = unclaimed, has data = claimed) */
  claim?: ClaimWithUser | null;
  /** Current user owns this claim */
  isYourClaim?: boolean;
  /** Celebrant view: item is claimed (no claimer identity) */
  isTaken?: boolean;
  /** Is current user the celebrant */
  isCelebrant?: boolean;

  // Split functionality
  /** Current split status for the item */
  splitStatus?: SplitStatusInfo | null;
  /** List of contributors to the split */
  contributors?: SplitContributorInfo[];
  /** Current user's pledge amount */
  userPledgeAmount?: number | null;
  /** Suggested share amount (equal split) */
  suggestedShare?: number;
  /** Called to open split modal */
  onOpenSplit?: () => void;
  /** Called to pledge an amount */
  onPledge?: (amount: number) => void;
  /** Called to close/cancel split */
  onCloseSplit?: () => void;

  // Favorite functionality
  /** Is this item favorited by the viewing group */
  isFavorite: boolean;
  /** Groups where this item is favorited */
  favoriteGroups?: FavoriteGroupInfo[];
  /** Called to toggle favorite status */
  onToggleFavorite?: () => void;

  // Navigation
  /** Called to open item options/settings sheet */
  onOpenOptions?: () => void;
}

/**
 * Props for ItemOptionsSheet component
 *
 * Actions for item owner to manage their wishlist item:
 * - Toggle favorite
 * - Change priority
 * - Share item
 * - Edit details
 * - Delete item
 */
export interface ItemOptionsSheetProps {
  /** The wishlist item being managed */
  item: WishlistItem;
  /** Is this item favorited */
  isFavorite: boolean;
  /** Current priority (1-5) */
  priority: number;
  /** Called to toggle favorite status */
  onToggleFavorite: () => void;
  /** Called when priority changes */
  onPriorityChange: (priority: number) => void;
  /** Called to share item */
  onShare: () => void;
  /** Called to edit item details */
  onEdit: () => void;
  /** Called to delete item */
  onDelete: () => void;
  /** Called to close sheet */
  onClose: () => void;
}
