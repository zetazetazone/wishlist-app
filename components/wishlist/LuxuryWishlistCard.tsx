import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { WishlistItem } from '../../types/database.types';
import StarRating from '../ui/StarRating';
import { LinearGradient } from 'expo-linear-gradient';
import { FavoriteHeart } from './FavoriteHeart';
import { MostWantedBadge } from './MostWantedBadge';
import { ClaimButton } from './ClaimButton';
import { ClaimerAvatar } from './ClaimerAvatar';
import { TakenBadge } from './TakenBadge';
import { YourClaimIndicator } from './YourClaimIndicator';
import { SplitContributionProgress } from './SplitContributionProgress';
import { ContributorsDisplay } from './ContributorsDisplay';
import { SplitModal } from './SplitModal';
import { OpenSplitModal } from './OpenSplitModal';
import type { ClaimWithUser } from '../../lib/claims';

/** Split status for an item */
interface SplitStatusInfo {
  itemPrice: number;
  additionalCosts: number | null;
  totalPledged: number;
  isFullyFunded: boolean;
  isOpen: boolean;
}

/** Contributor for split display */
interface SplitContributorInfo {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  amount: number;
}

interface LuxuryWishlistCardProps {
  item: WishlistItem;
  onDelete?: (id: string) => void;
  onPriorityChange?: (id: string, priority: number) => void;
  index: number;
  favoriteGroups?: Array<{ groupId: string; groupName: string }>; // NEW: groups where this is favorited
  onToggleFavorite?: () => void;
  showFavoriteHeart?: boolean;
  singleGroupName?: string; // NEW: for celebration view where only one group matters
  totalUserGroups?: number; // Total groups user belongs to (for "all groups" badge)
  // Claim-related props (all optional to maintain backward compatibility)
  claimable?: boolean;           // Show claim button (non-celebrant view of unclaimed item)
  onClaim?: () => void;          // Called when user taps Claim
  onUnclaim?: () => void;        // Called when user taps Unclaim
  claiming?: boolean;            // Loading state during claim operation
  claim?: ClaimWithUser | null;  // Claim data (null = unclaimed, has data = claimed)
  isYourClaim?: boolean;         // Current user owns this claim
  isTaken?: boolean;             // Celebrant view: item is claimed (no claimer identity)
  dimmed?: boolean;              // Visual dim for taken items (celebrant view)
  isCelebrant?: boolean;         // Is current user the celebrant
  // Split contribution props
  splitStatus?: SplitStatusInfo | null;
  contributors?: SplitContributorInfo[];
  userPledgeAmount?: number;     // Current user's pledge amount (if any)
  suggestedShare?: number;       // Suggested equal-split amount
  onOpenSplit?: (itemId: string, additionalCosts?: number) => void;
  onPledge?: (itemId: string, amount: number) => void;
  onCloseSplit?: (itemId: string) => void;
}

export default function LuxuryWishlistCard({
  item,
  onDelete,
  onPriorityChange,
  index,
  favoriteGroups,
  onToggleFavorite,
  showFavoriteHeart,
  singleGroupName,
  totalUserGroups,
  claimable,
  onClaim,
  onUnclaim,
  claiming,
  claim,
  isYourClaim,
  isTaken,
  dimmed,
  isCelebrant,
  splitStatus,
  contributors,
  userPledgeAmount,
  suggestedShare,
  onOpenSplit,
  onPledge,
  onCloseSplit,
}: LuxuryWishlistCardProps) {
  // State for split modals
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showOpenSplitModal, setShowOpenSplitModal] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);

  // Determine if this item is favorited (for any group or single group context)
  const isFavorite = (favoriteGroups && favoriteGroups.length > 0) || !!singleGroupName;
  // Detect special item types
  const isSpecialItem = item.item_type && item.item_type !== 'standard';

  // Check if item is in split mode
  const isSplitItem = claim?.claim_type === 'split' || splitStatus?.isOpen;

  // Get appropriate icon for item type
  const getCardIcon = (): 'help-circle' | 'gift' | 'gift-outline' => {
    switch (item.item_type) {
      case 'surprise_me':
        return 'help-circle';
      case 'mystery_box':
        return 'gift';
      default:
        return 'gift-outline';
    }
  };

  // Get border color based on item type
  const getCardBorderColor = () => {
    // Favorite items get burgundy border (unless they're special items)
    if (isFavorite && !isSpecialItem) {
      return colors.burgundy[300];
    }

    switch (item.item_type) {
      case 'surprise_me':
        return colors.burgundy[200];
      case 'mystery_box':
        return colors.gold[300];
      default:
        return colors.gold[100];
    }
  };

  // Get gradient colors for accent bar
  const getGradientColors = (): [string, string] => {
    switch (item.item_type) {
      case 'surprise_me':
        return [colors.burgundy[400], colors.burgundy[600]];
      case 'mystery_box':
        return [colors.gold[400], colors.gold[600]];
      default:
        return [colors.gold[400], colors.gold[600]];
    }
  };

  const handleOpenLink = async () => {
    // Guard against opening for special items or empty URLs
    if (isSpecialItem || !item.amazon_url) return;

    try {
      const canOpen = await Linking.canOpenURL(item.amazon_url);
      if (canOpen) {
        await Linking.openURL(item.amazon_url);
      } else {
        Alert.alert('Error', 'Unable to open this link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const handleDelete = () => {
    Alert.alert('Remove Gift', 'Remove this item from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onDelete?.(item.id),
      },
    ]);
  };

  // Handle opening a split - show cross-platform modal
  const handleOpenSplit = () => {
    setShowOpenSplitModal(true);
  };

  // Callback when user confirms open split
  const handleOpenSplitConfirm = (additionalCosts?: number) => {
    onOpenSplit?.(item.id, additionalCosts);
    setShowOpenSplitModal(false);
  };

  // Handle pledging to a split
  const handlePledgeConfirm = async (amount: number) => {
    setSplitLoading(true);
    try {
      await onPledge?.(item.id, amount);
      setShowSplitModal(false);
    } finally {
      setSplitLoading(false);
    }
  };

  // Handle closing a split
  const handleCloseSplit = () => {
    const remaining = splitStatus
      ? (splitStatus.itemPrice + (splitStatus.additionalCosts || 0)) - splitStatus.totalPledged
      : 0;

    Alert.alert(
      'Cover Remaining Amount',
      `You'll cover the remaining $${remaining.toFixed(2)} to complete this split.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cover It',
          onPress: () => onCloseSplit?.(item.id),
        },
      ]
    );
  };

  const formatPrice = (price?: number | null) => {
    // Handle special item types
    if (item.item_type === 'mystery_box' && item.mystery_box_tier) {
      return `€${item.mystery_box_tier}`;
    }
    if (item.item_type === 'surprise_me' && item.surprise_me_budget) {
      return `Budget: €${item.surprise_me_budget}`;
    }
    if (!price) return null;
    return `$${price.toFixed(2)}`;
  };

  return (
    <MotiView
      from={{
        opacity: 0,
        scale: 0.9,
        translateY: 50,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        translateY: 0,
      }}
      transition={{
        type: 'spring',
        delay: index * 100,
        damping: 20,
        stiffness: 200,
      }}
      style={{
        marginBottom: spacing.md,
      }}
    >
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          borderWidth: isFavorite ? 2 : 1,
          borderColor: getCardBorderColor(),
          opacity: dimmed ? 0.6 : 1, // Per CONTEXT: "Taken items appear dimmed/faded"
          ...shadows.md,
        }}
      >
        {/* Accent border - color varies by item type */}
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            height: 4,
            width: '100%',
          }}
        />

        <View style={{ padding: spacing.md, flexDirection: 'row' }}>
          {/* Icon - spans both rows */}
          <View
            style={{
              width: 72,
              height: 100,
              borderRadius: borderRadius.md,
              backgroundColor: colors.burgundy[50],
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.md,
            }}
          >
            <MaterialCommunityIcons
              name={getCardIcon()}
              size={40}
              color={colors.burgundy[600]}
            />
          </View>

          {/* Content Column */}
          <View style={{ flex: 1 }}>
            {/* Header Row */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: spacing.xs,
              }}
            >
              {/* Title */}
              <View style={{ flex: 1 }}>
                {/* Most Wanted badges */}
                {singleGroupName && <MostWantedBadge />}
                {!singleGroupName && favoriteGroups && favoriteGroups.length > 0 && (
                  // Show single "all groups" badge if favorited in all groups, otherwise show individual badges
                  totalUserGroups && totalUserGroups > 1 && favoriteGroups.length === totalUserGroups ? (
                    <MostWantedBadge allGroups />
                  ) : (
                    favoriteGroups.map(fg => (
                      <MostWantedBadge key={fg.groupId} groupName={fg.groupName} />
                    ))
                  )
                )}
                {/* Your claim indicator - shows when user owns the claim */}
                {isYourClaim && <YourClaimIndicator style={{ marginBottom: spacing.xs }} />}
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 17,
                    fontWeight: '600',
                    color: colors.burgundy[900],
                    lineHeight: 22,
                  }}
                >
                  {item.title}
                </Text>
                {/* Description for surprise_me items */}
                {item.item_type === 'surprise_me' && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.burgundy[500],
                      marginTop: spacing.xs,
                      lineHeight: 18,
                      fontStyle: 'italic',
                    }}
                  >
                    Open to any gift, as long as it comes with care 💝
                  </Text>
                )}
              </View>

              {/* Actions: Claim indicators, Favorite Heart, Delete Button */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                {/* TakenBadge - celebrant view: shows item is claimed (no claimer identity) */}
                {isTaken && <TakenBadge />}
                {/* ClaimerAvatar - non-celebrant view: shows who claimed (if not your claim) */}
                {claim?.claimer && !isYourClaim && (
                  <ClaimerAvatar claimer={claim.claimer} />
                )}
                {showFavoriteHeart && (
                  <FavoriteHeart
                    isFavorite={isFavorite || false}
                    onPress={() => onToggleFavorite?.()}
                  />
                )}
                {onDelete && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={{
                      padding: spacing.xs,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={22}
                      color={colors.burgundy[300]}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Price & Stars Row */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.xs,
                paddingVertical: spacing.xs,
              }}
            >
            {formatPrice(item.price) ? (
              <View
                style={{
                  backgroundColor: colors.gold[50],
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                  borderRadius: borderRadius.sm,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.gold[700],
                  }}
                >
                  {formatPrice(item.price)}
                </Text>
              </View>
            ) : (
              <View />
            )}

            <StarRating
              rating={item.priority}
              onRatingChange={(newPriority) => onPriorityChange?.(item.id, newPriority)}
              size={24}
            />
            </View>
          </View>
        </View>

        {/* Action Button - hidden for special items */}
        {!isSpecialItem && (
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
            <TouchableOpacity
              onPress={handleOpenLink}
              style={{
                backgroundColor: colors.burgundy[700],
                borderRadius: borderRadius.md,
                padding: spacing.md,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                ...shadows.sm,
              }}
            >
              <MaterialCommunityIcons
                name="shopping"
                size={20}
                color={colors.white}
                style={{ marginRight: spacing.xs }}
              />
              <Text
                style={{
                  color: colors.white,
                  fontSize: 16,
                  fontWeight: '600',
                  letterSpacing: 0.3,
                }}
              >
                View Product
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Claim Button - shown for claimable items OR your own claims (to unclaim) */}
        {(claimable || isYourClaim) && !isSpecialItem && !isSplitItem && (
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
            <ClaimButton
              onClaim={onClaim || (() => {})}
              onUnclaim={onUnclaim || (() => {})}
              isClaimed={!!claim}
              isYourClaim={isYourClaim || false}
              loading={claiming || false}
              disabled={isSpecialItem}
            />
          </View>
        )}

        {/* Split Contribution UI - role-based visibility */}
        {!isSpecialItem && (
          <>
            {/* Claimer view: Open for Split or manage split */}
            {isYourClaim && claim && !isCelebrant && (
              <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
                {!isSplitItem ? (
                  // Not yet split - show "Open for Split" button
                  <ClaimButton
                    onClaim={() => {}}
                    onUnclaim={() => {}}
                    isClaimed={false}
                    isYourClaim={false}
                    loading={claiming || false}
                    variant="openSplit"
                    onOpenSplit={handleOpenSplit}
                  />
                ) : splitStatus && (
                  // Already split - show progress and controls
                  <View style={{ gap: spacing.md }}>
                    <SplitContributionProgress
                      itemPrice={splitStatus.itemPrice}
                      additionalCosts={splitStatus.additionalCosts}
                      totalPledged={splitStatus.totalPledged}
                      isFullyFunded={splitStatus.isFullyFunded}
                    />
                    {contributors && contributors.length > 0 && (
                      <ContributorsDisplay contributors={contributors} />
                    )}
                    {/* Close split button - disabled if fully funded */}
                    {!splitStatus.isFullyFunded && (
                      <ClaimButton
                        onClaim={() => {}}
                        onUnclaim={() => {}}
                        isClaimed={false}
                        isYourClaim={false}
                        loading={claiming || false}
                        variant="closeSplit"
                        onCloseSplit={handleCloseSplit}
                      />
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Non-claimer non-celebrant view: See split progress and contribute */}
            {!isYourClaim && !isCelebrant && isSplitItem && splitStatus && (
              <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
                <View style={{ gap: spacing.md }}>
                  <SplitContributionProgress
                    itemPrice={splitStatus.itemPrice}
                    additionalCosts={splitStatus.additionalCosts}
                    totalPledged={splitStatus.totalPledged}
                    isFullyFunded={splitStatus.isFullyFunded}
                  />
                  {contributors && contributors.length > 0 && (
                    <ContributorsDisplay contributors={contributors} />
                  )}
                  {/* Contribute button or your contribution badge */}
                  {userPledgeAmount && userPledgeAmount > 0 ? (
                    <View style={{
                      backgroundColor: colors.success + '20',
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: borderRadius.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}>
                      <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
                      <Text style={{ color: colors.success, fontWeight: '600' }}>
                        Your contribution: ${userPledgeAmount.toFixed(2)}
                      </Text>
                    </View>
                  ) : !splitStatus.isFullyFunded && (
                    <ClaimButton
                      onClaim={() => {}}
                      onUnclaim={() => {}}
                      isClaimed={false}
                      isYourClaim={false}
                      loading={claiming || false}
                      variant="contribute"
                      onContribute={() => setShowSplitModal(true)}
                    />
                  )}
                </View>
              </View>
            )}

            {/* Celebrant view: Only show "Taken" - no split details */}
            {isCelebrant && isSplitItem && splitStatus && (
              <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
                <SplitContributionProgress
                  itemPrice={0}
                  totalPledged={0}
                  isFullyFunded={splitStatus.isFullyFunded}
                  isCelebrant={true}
                />
              </View>
            )}
          </>
        )}

        {/* Split Modal for pledging */}
        <SplitModal
          visible={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          onConfirm={handlePledgeConfirm}
          itemTitle={item.title}
          itemPrice={splitStatus?.itemPrice || item.price || 0}
          additionalCosts={splitStatus?.additionalCosts}
          totalPledged={splitStatus?.totalPledged || 0}
          suggestedAmount={suggestedShare}
          loading={splitLoading}
        />

        {/* Open Split Modal - cross-platform replacement for Alert.prompt */}
        <OpenSplitModal
          visible={showOpenSplitModal}
          onClose={() => setShowOpenSplitModal(false)}
          onConfirm={handleOpenSplitConfirm}
          itemTitle={item.title}
        />
      </View>
    </MotiView>
  );
}
