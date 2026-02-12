/**
 * ItemDetailScreen
 *
 * Full item details with hero image and actions.
 * Supports 4 view contexts: owner, celebrant, claimer, viewer.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  type ItemClaimStatus,
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

  // Claim state
  const [claim, setClaim] = useState<ClaimWithUser | null>(null);
  const [isTaken, setIsTaken] = useState(false);
  const [isCelebrant, setIsCelebrant] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  // Split state
  const [splitStatus, setSplitStatus] = useState<SplitStatus | null>(null);
  const [contributors, setContributors] = useState<SplitContributor[]>([]);
  const [suggestedShare, setSuggestedShare] = useState<number>(0);
  const [userPledgeAmount, setUserPledgeAmount] = useState<number>(0);

  // Derived state
  const isYourClaim = claim?.claimed_by === currentUserId;
  const isClaimed = !!claim || isTaken;

  // Load item data
  const loadItem = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError(t('celebrations.notAuthenticated'));
        return;
      }
      setCurrentUserId(user.id);

      // Fetch item
      const itemData = await getWishlistItem(id);
      if (!itemData) {
        setError(t('wishlist.errors.itemNotFound'));
        return;
      }

      setItem(itemData);
      setIsOwner(itemData.user_id === user.id);
    } catch (err) {
      console.error('Failed to load item:', err);
      setError(err instanceof Error ? err.message : t('common.errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  // Parse brand from title
  const brand = item ? parseBrandFromTitle(item.title) : null;
  const priceDisplay = item ? formatItemPrice(item) : null;

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
        {item.item_type === 'standard' && item.amazon_url && (
          <Pressable
            style={styles.storeButton}
            onPress={() => Linking.openURL(item.amazon_url!)}
          >
            <MaterialCommunityIcons name="open-in-new" size={20} color={colors.white} />
            <Text style={styles.storeButtonText}>{t('wishlist.detail.goToStore')}</Text>
          </Pressable>
        )}
      </View>
    );
  };

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
              onPress={() => {/* TODO: Options sheet in Phase 36 */}}
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

        {/* Claim UI placeholder - Phase 35-02 */}
        {!isOwner && (
          <View style={styles.claimSection}>
            {/* TODO: Add claim UI in 35-02 */}
          </View>
        )}
      </ScrollView>
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
  },
});
