/**
 * ItemDetailScreen
 *
 * Full item details with hero image and actions.
 * Supports 4 view contexts: owner, celebrant, claimer, viewer.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { getWishlistItem } from '@/lib/wishlistItems';
import {
  getClaimsForItems,
  getItemClaimStatus,
  claimItem,
  unclaimItem,
  type ClaimWithUser,
} from '@/lib/claims';
import {
  getSplitStatus,
  getContributors,
  getSuggestedShare,
  openSplit,
  pledgeContribution,
  closeSplit,
  type SplitStatus,
  type SplitContributor,
} from '@/lib/contributions';
import { formatItemPrice, getImagePlaceholder, parseBrandFromTitle } from '@/utils/wishlist';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { SplitContributionProgress } from '@/components/wishlist/SplitContributionProgress';
import { ContributorsDisplay } from '@/components/wishlist/ContributorsDisplay';
import { SplitModal } from '@/components/wishlist/SplitModal';
import { OpenSplitModal } from '@/components/wishlist/OpenSplitModal';
import { TakenBadge } from '@/components/wishlist/TakenBadge';
import { ClaimerAvatar } from '@/components/wishlist/ClaimerAvatar';
import { ClaimButton } from '@/components/wishlist/ClaimButton';
import { OptionsSheet, OptionsSheetRef } from '@/components/wishlist';
import type { WishlistItem } from '@/types/database.types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.45;
const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export default function ItemDetailScreen() {
  const { id, celebrationId } = useLocalSearchParams<{
    id: string;
    celebrationId?: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();

  // Item state
  const [item, setItem] = useState<WishlistItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User context
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const optionsSheetRef = useRef<OptionsSheetRef>(null);

  // Claim state
  const [claim, setClaim] = useState<ClaimWithUser | null>(null);
  const [isTaken, setIsTaken] = useState(false);
  const [isCelebrant, setIsCelebrant] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  // Favorite state (owner only)
  const [isFavorited, setIsFavorited] = useState(false);

  // Split state
  const [splitStatus, setSplitStatus] = useState<SplitStatus | null>(null);
  const [contributors, setContributors] = useState<SplitContributor[]>([]);
  const [suggestedShare, setSuggestedShare] = useState<number>(0);
  const [userPledgeAmount, setUserPledgeAmount] = useState<number>(0);

  // Derived state
  const isYourClaim = claim?.claimed_by === currentUserId;

  // Modal state
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [openSplitModalVisible, setOpenSplitModalVisible] = useState(false);

  // Load item data with performance monitoring
  const loadItem = useCallback(async () => {
    if (!id) return;

    const startTime = performance.now();

    try {
      setLoading(true);
      setError(null);

      // Get current user first (required for context)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError(t('celebrations.notAuthenticated'));
        return;
      }
      setCurrentUserId(user.id);

      // Parallel fetch: item + celebration (if context provided)
      const promises: Promise<any>[] = [getWishlistItem(id)];

      if (celebrationId) {
        promises.push(
          (async () => {
            const result = await supabase
              .from('celebrations')
              .select('celebrant_id')
              .eq('id', celebrationId)
              .single();
            return result;
          })()
        );
      }

      const [itemData, celebrationData] = await Promise.all(promises);

      if (!itemData) {
        setError(t('wishlist.errors.itemNotFound'));
        return;
      }

      setItem(itemData);
      const isItemOwner = itemData.user_id === user.id;
      setIsOwner(isItemOwner);

      // Load favorite status for owner view
      if (isItemOwner) {
        const { data: favs } = await supabase
          .from('group_favorites')
          .select('item_id')
          .eq('user_id', user.id)
          .eq('item_id', id);
        setIsFavorited(!!favs && favs.length > 0);
      }

      // Set celebrant status from parallel fetch
      if (celebrationData?.data) {
        setIsCelebrant(celebrationData.data.celebrant_id === user.id);
      }
    } catch (err) {
      console.error('Failed to load item:', err);
      setError(err instanceof Error ? err.message : t('common.errors.generic'));
    } finally {
      setLoading(false);

      const loadTime = performance.now() - startTime;
      console.log(`[Performance] Item detail loaded in ${loadTime.toFixed(0)}ms`);

      if (loadTime > 200) {
        console.warn(`[Performance] Load time exceeded 200ms target: ${loadTime.toFixed(0)}ms`);
      }
    }
  }, [id, celebrationId, t]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  // Load claim context based on user role
  const loadClaimContext = useCallback(async () => {
    if (!id || !currentUserId || isOwner) return;

    try {
      // Celebrant view: only get boolean status (isCelebrant set in loadItem from parallel fetch)
      if (isCelebrant) {
        const statuses = await getItemClaimStatus([id]);
        const status = statuses.find(s => s.wishlist_item_id === id);
        setIsTaken(status?.is_claimed ?? false);
        return;
      }

      // Non-celebrant view: get full claim data
      const claims = await getClaimsForItems([id]);
      const itemClaim = claims.find(c => c.wishlist_item_id === id);
      setClaim(itemClaim || null);

      // Load split data if claim exists and is split type
      if (itemClaim?.claim_type === 'split') {
        const [status, contribs, suggested] = await Promise.all([
          getSplitStatus(id),
          getContributors(id),
          getSuggestedShare(id),
        ]);
        setSplitStatus(status);
        setContributors(contribs);
        if (suggested) {
          setSuggestedShare(suggested.suggested_amount);
        }
        // Check user's pledge
        const userContrib = contribs.find(c => c.id === currentUserId);
        setUserPledgeAmount(userContrib?.amount ?? 0);
      }
    } catch (err) {
      console.error('Failed to load claim context:', err);
    }
  }, [id, currentUserId, isOwner, isCelebrant]);

  useEffect(() => {
    if (item && currentUserId) {
      loadClaimContext();
    }
  }, [item, currentUserId, loadClaimContext]);

  // Realtime subscription for claim changes
  useEffect(() => {
    // Only subscribe if we're in a claim-relevant context
    if (!id || isOwner) return;

    const channel = supabase
      .channel(`item-claim-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'gift_claims',
          filter: `wishlist_item_id=eq.${id}`,
        },
        (payload) => {
          console.log('[Realtime] Claim change detected:', payload.eventType);
          // Refresh claim data when any change occurs
          loadClaimContext();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Claim subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from claim channel');
      supabase.removeChannel(channel);
    };
  }, [id, isOwner, loadClaimContext]);

  // Realtime subscription for split contribution changes
  useEffect(() => {
    if (!id || isOwner || isCelebrant) return;
    if (!splitStatus?.is_open) return;

    const channel = supabase
      .channel(`split-contrib-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'split_contributions',
          filter: `wishlist_item_id=eq.${id}`,
        },
        (payload) => {
          console.log('[Realtime] Split contribution change:', payload.eventType);
          // Refresh split data
          loadClaimContext();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Split subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from split channel');
      supabase.removeChannel(channel);
    };
  }, [id, isOwner, isCelebrant, splitStatus?.is_open, loadClaimContext]);

  // Claim item handler
  const handleClaim = useCallback(async () => {
    if (!id || !item) return;

    Alert.alert(
      t('wishlist.claim.confirmTitle'),
      t('wishlist.claim.confirmMessage', { title: item.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('wishlist.claim.claim'),
          onPress: async () => {
            setClaimLoading(true);
            try {
              const result = await claimItem(id, 'full');
              if (result.success) {
                await loadClaimContext();
              } else {
                Alert.alert(
                  t('alerts.titles.unableToClaim'),
                  result.error || t('common.errors.generic')
                );
              }
            } catch (err) {
              Alert.alert(t('alerts.titles.error'), t('wishlist.claim.failedToClaim'));
            } finally {
              setClaimLoading(false);
            }
          },
        },
      ]
    );
  }, [id, item, t, loadClaimContext]);

  // Unclaim item handler
  const handleUnclaim = useCallback(async () => {
    if (!claim) return;

    Alert.alert(
      t('wishlist.claim.unclaimTitle'),
      t('wishlist.claim.unclaimMessage', { title: item?.title }),
      [
        { text: t('wishlist.claim.keepClaim'), style: 'cancel' },
        {
          text: t('wishlist.claim.unclaim'),
          style: 'destructive',
          onPress: async () => {
            setClaimLoading(true);
            try {
              const result = await unclaimItem(claim.id);
              if (result.success) {
                setClaim(null);
                setSplitStatus(null);
                setContributors([]);
              } else {
                Alert.alert(
                  t('alerts.titles.unableToUnclaim'),
                  result.error || t('common.errors.generic')
                );
              }
            } catch (err) {
              Alert.alert(t('alerts.titles.error'), t('wishlist.claim.failedToUnclaim'));
            } finally {
              setClaimLoading(false);
            }
          },
        },
      ]
    );
  }, [claim, item, t]);

  // Open for split handler
  const handleOpenSplit = useCallback(async (additionalCosts?: number) => {
    if (!id) return;

    setClaimLoading(true);
    try {
      const result = await openSplit(id, additionalCosts);
      if (result.success) {
        await loadClaimContext();
      } else {
        Alert.alert(t('alerts.titles.error'), result.error || t('wishlist.split.failedToOpenSplit'));
      }
    } catch (err) {
      Alert.alert(t('alerts.titles.error'), t('wishlist.split.failedToOpenSplit'));
    } finally {
      setClaimLoading(false);
    }
  }, [id, t, loadClaimContext]);

  // Pledge contribution handler
  const handlePledge = useCallback(async (amount: number) => {
    if (!id) return;

    setClaimLoading(true);
    try {
      const result = await pledgeContribution(id, amount);
      if (result.success) {
        await loadClaimContext();
      } else {
        Alert.alert(t('alerts.titles.error'), result.error || t('wishlist.split.failedToPledge'));
      }
    } catch (err) {
      Alert.alert(t('alerts.titles.error'), t('wishlist.split.failedToPledge'));
    } finally {
      setClaimLoading(false);
    }
  }, [id, t, loadClaimContext]);

  // Close split (cover remaining) handler
  const handleCloseSplit = useCallback(async () => {
    if (!id) return;

    setClaimLoading(true);
    try {
      const result = await closeSplit(id);
      if (result.success) {
        await loadClaimContext();
      } else {
        Alert.alert(t('alerts.titles.error'), result.error || t('wishlist.split.failedToCloseSplit'));
      }
    } catch (err) {
      Alert.alert(t('alerts.titles.error'), t('wishlist.split.failedToCloseSplit'));
    } finally {
      setClaimLoading(false);
    }
  }, [id, t, loadClaimContext]);

  // OptionsSheet callbacks (owner view only)
  const handleFavoriteToggle = useCallback(async (toggleItem: WishlistItem) => {
    // Show alert that favorite must be changed from My Wishlist
    // (GroupPickerSheet needs full group context not available here)
    Alert.alert(
      t('wishlist.favorite.changeFromList'),
      t('wishlist.favorite.changeFromListMessage')
    );
  }, [t]);

  const handlePriorityChange = useCallback(async (itemId: string, newPriority: number) => {
    // Optimistic update
    if (item) {
      setItem({ ...item, priority: newPriority });
    }

    try {
      await supabase
        .from('wishlist_items')
        .update({ priority: newPriority })
        .eq('id', itemId);
    } catch (error) {
      console.error('Error updating priority:', error);
      // Reload on error
      loadItem();
    }
  }, [item, loadItem]);

  const handleDelete = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Navigate back after successful delete
      router.back();
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert(t('alerts.titles.error'), t('wishlist.failedToDelete'));
    }
  }, [router, t]);

  const isFavoriteCallback = useCallback((itemId: string) => {
    return isFavorited;
  }, [isFavorited]);

  // Parse brand from title
  const brand = item ? parseBrandFromTitle(item.title) : null;
  const priceDisplay = item ? formatItemPrice(item) : null;

  // Render claim section based on user context
  const renderClaimSection = () => {
    // Owner view - no claim UI
    if (isOwner) return null;

    // Celebrant view - show taken status only
    if (isCelebrant) {
      if (!isTaken) return null;
      return (
        <View style={styles.claimSection}>
          <TakenBadge />
        </View>
      );
    }

    // Not claimable item types
    if (item?.item_type === 'surprise_me' || item?.item_type === 'mystery_box') {
      return (
        <View style={styles.claimSection}>
          <View style={styles.notClaimableNote}>
            <MaterialCommunityIcons name="information-outline" size={20} color={colors.cream[600]} />
            <Text style={styles.notClaimableText}>
              {t('wishlist.claim.notClaimable')}
            </Text>
          </View>
        </View>
      );
    }

    // Your claim view
    if (isYourClaim) {
      return (
        <View style={styles.claimSection}>
          <View style={styles.yourClaimHeader}>
            <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
            <Text style={styles.yourClaimTitle}>{t('wishlist.claim.yourClaim')}</Text>
          </View>

          {/* Split progress if opened */}
          {splitStatus?.is_open && (
            <>
              <SplitContributionProgress
                itemPrice={item?.price || 0}
                additionalCosts={splitStatus.additional_costs}
                totalPledged={splitStatus.total_pledged}
                isFullyFunded={splitStatus.is_fully_funded}
              />
              <ContributorsDisplay contributors={contributors} />
            </>
          )}

          {/* Actions */}
          <View style={styles.claimActions}>
            {/* Open split button (if not already split) */}
            {!splitStatus?.is_open && (
              <ClaimButton
                variant="openSplit"
                onClaim={() => {}}
                onUnclaim={() => {}}
                isClaimed={true}
                isYourClaim={true}
                loading={claimLoading}
                onOpenSplit={() => setOpenSplitModalVisible(true)}
              />
            )}

            {/* Close split button (if split open and not fully funded) */}
            {splitStatus?.is_open && !splitStatus.is_fully_funded && (
              <ClaimButton
                variant="closeSplit"
                onClaim={() => {}}
                onUnclaim={() => {}}
                isClaimed={true}
                isYourClaim={true}
                loading={claimLoading}
                onCloseSplit={handleCloseSplit}
              />
            )}

            {/* Unclaim button (if not split) */}
            {!splitStatus?.is_open && (
              <Pressable
                style={styles.unclaimButton}
                onPress={handleUnclaim}
                disabled={claimLoading}
              >
                <Text style={styles.unclaimButtonText}>{t('wishlist.claim.unclaim')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      );
    }

    // Claimed by someone else view
    if (claim) {
      return (
        <View style={styles.claimSection}>
          {/* Claimer info */}
          {claim.claimer && (
            <View style={styles.claimerSection}>
              <ClaimerAvatar
                claimer={{
                  id: claim.claimer.id,
                  display_name: claim.claimer.display_name,
                  avatar_url: claim.claimer.avatar_url,
                }}
              />
              <View style={styles.claimerInfo}>
                <Text style={styles.claimedByLabel}>{t('wishlist.claim.claimedBy', { name: '' }).replace('{{name}}', '')}</Text>
                <Text style={styles.claimerName}>{claim.claimer.display_name || t('common.unknown')}</Text>
              </View>
            </View>
          )}

          {/* Split progress if open */}
          {splitStatus?.is_open && (
            <>
              <SplitContributionProgress
                itemPrice={item?.price || 0}
                additionalCosts={splitStatus.additional_costs}
                totalPledged={splitStatus.total_pledged}
                isFullyFunded={splitStatus.is_fully_funded}
              />
              <ContributorsDisplay contributors={contributors} />

              {/* User's contribution badge */}
              {userPledgeAmount > 0 && (
                <View style={styles.userPledgeBadge}>
                  <MaterialCommunityIcons name="hand-heart" size={18} color={colors.success} />
                  <Text style={styles.userPledgeText}>
                    {t('wishlist.split.yourContribution', { amount: userPledgeAmount.toFixed(2) })}
                  </Text>
                </View>
              )}

              {/* Contribute button (if split open and not fully funded and user hasn't pledged) */}
              {!splitStatus.is_fully_funded && userPledgeAmount === 0 && (
                <ClaimButton
                  variant="contribute"
                  onClaim={() => {}}
                  onUnclaim={() => {}}
                  isClaimed={true}
                  isYourClaim={false}
                  loading={claimLoading}
                  onContribute={() => setSplitModalVisible(true)}
                />
              )}
            </>
          )}
        </View>
      );
    }

    // Unclaimed - show claim button
    return (
      <View style={styles.claimSection}>
        <ClaimButton
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          isClaimed={false}
          isYourClaim={false}
          loading={claimLoading}
        />
      </View>
    );
  };

  // Render hero image or placeholder
  const renderHero = () => {
    if (!item) return null;

    const hasImage = !!item.image_url && item.item_type === 'standard';
    const placeholder = getImagePlaceholder(item.item_type);

    if (hasImage) {
      return (
        <Image
          source={{ uri: item.image_url! }}
          style={styles.heroImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={{ blurhash: DEFAULT_BLURHASH }}
          placeholderContentFit="cover"
          transition={200}
        />
      );
    }

    // Special item placeholder
    return (
      <View style={[styles.heroPlaceholder, { backgroundColor: placeholder.backgroundColor }]}>
        <MaterialCommunityIcons
          name={placeholder.iconName}
          size={80}
          color={placeholder.iconColor}
        />
        <Text style={styles.placeholderText}>
          {item.item_type === 'surprise_me'
            ? t('wishlist.itemType.surpriseMe')
            : t('wishlist.itemType.mysteryBox')}
        </Text>
      </View>
    );
  };

  const renderItemInfo = () => {
    if (!item) return null;

    return (
      <View style={styles.infoSection}>
        {/* Brand if parsed */}
        {brand && (
          <Text style={styles.brand}>{brand}</Text>
        )}

        {/* Title */}
        <Text style={styles.title}>{item.title}</Text>

        {/* Price */}
        {priceDisplay && (
          <Text style={styles.price}>{priceDisplay}</Text>
        )}

        {/* Priority Stars */}
        {item.priority && item.priority > 0 && (
          <View style={styles.priorityRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <MaterialCommunityIcons
                key={star}
                name={star <= (item.priority || 0) ? 'star' : 'star-outline'}
                size={20}
                color={star <= (item.priority || 0) ? colors.gold[600] : colors.cream[400]}
              />
            ))}
          </View>
        )}

        {/* Go to Store button - only for standard items with URL */}
        {item.item_type === 'standard' && item.source_url && (
          <Pressable
            style={styles.storeButton}
            onPress={() => Linking.openURL(item.source_url!)}
          >
            <MaterialCommunityIcons name="open-in-new" size={20} color={colors.white} />
            <Text style={styles.storeButtonText}>{t('wishlist.detail.goToStore')}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  // Invalid item ID error boundary
  if (!id) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: t('common.error') }} />
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{t('wishlist.errors.invalidItemId')}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: '', headerShown: false }} />
        <ActivityIndicator size="large" color={colors.burgundy[600]} />
      </View>
    );
  }

  // Error state
  if (error || !item) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: t('common.error') }} />
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error || t('wishlist.errors.itemNotFound')}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen
        options={{
          headerTransparent: true,
          headerTitle: '',
          headerTintColor: colors.white,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={[styles.headerButton, { marginLeft: spacing.sm }]}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => {
                if (isOwner && item) {
                  optionsSheetRef.current?.open(item);
                }
              }}
              style={[styles.headerButton, { marginRight: spacing.sm }]}
            >
              <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.white} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {renderHero()}
          {/* Gradient overlay for header visibility */}
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
            style={styles.heroGradient}
          />
        </View>

        {/* Item Info */}
        {renderItemInfo()}

        {/* Claim UI Section */}
        {renderClaimSection()}
      </ScrollView>

      {/* Split Modal - for pledging contribution */}
      <SplitModal
        visible={splitModalVisible}
        onClose={() => setSplitModalVisible(false)}
        onConfirm={handlePledge}
        itemTitle={item?.title || ''}
        itemPrice={item?.price || 0}
        additionalCosts={splitStatus?.additional_costs}
        totalPledged={splitStatus?.total_pledged || 0}
        suggestedAmount={suggestedShare}
        loading={claimLoading}
      />

      {/* Open Split Modal - for opening item to split */}
      <OpenSplitModal
        visible={openSplitModalVisible}
        onClose={() => setOpenSplitModalVisible(false)}
        onConfirm={handleOpenSplit}
        itemTitle={item?.title || ''}
      />

      {/* OptionsSheet - owner view only */}
      {isOwner && (
        <OptionsSheet
          ref={optionsSheetRef}
          onFavoriteToggle={handleFavoriteToggle}
          onPriorityChange={handlePriorityChange}
          onDelete={handleDelete}
          isFavorite={isFavoriteCallback}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.cream[50],
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  backButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.burgundy[600],
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    backgroundColor: colors.cream[100],
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.cream[700],
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  infoSection: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  brand: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.cream[600],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.burgundy[900],
    lineHeight: 32,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gold[700],
    marginTop: spacing.xs,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: spacing.sm,
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.burgundy[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    ...shadows.md,
  },
  storeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  claimSection: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cream[200],
    gap: spacing.md,
  },
  yourClaimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  yourClaimTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.success,
  },
  claimActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  unclaimButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.burgundy[300],
    backgroundColor: colors.cream[100],
    alignItems: 'center',
  },
  unclaimButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.burgundy[600],
  },
  claimerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  claimerInfo: {
    flex: 1,
  },
  claimedByLabel: {
    fontSize: 12,
    color: colors.cream[600],
  },
  claimerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.burgundy[800],
  },
  userPledgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#dcfce7',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  userPledgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
  },
  notClaimableNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cream[100],
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  notClaimableText: {
    fontSize: 14,
    color: colors.cream[600],
    flex: 1,
  },
});
