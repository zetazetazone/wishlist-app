/**
 * ForOthersWishlistScreen
 *
 * Displays items in a for-others wishlist linked to a group.
 * Group members can view items and add new ones via FAB.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getForOthersWishlistItems } from '@/lib/wishlists';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

type WishlistItem = {
  id: string;
  title: string;
  source_url: string | null;
  image_url: string | null;
  price: number | null;
  priority: number | null;
  is_favorite: boolean | null;
  is_most_wanted: boolean | null;
};

type WishlistData = {
  id: string;
  name: string;
  emoji: string | null;
  for_name: string | null;
  for_user_id: string | null;
  owner_type: string;
  linked_group_id: string | null;
  items: WishlistItem[];
};

export default function ForOthersWishlistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [wishlist, setWishlist] = useState<WishlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getForOthersWishlistItems(id);
      setWishlist(data);
    } catch (err) {
      console.error('Failed to load for-others wishlist:', err);
      setError(t('common.errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleItemPress = useCallback((item: WishlistItem) => {
    // Open source URL in browser (like celebration page pattern)
    if (item.source_url) {
      Linking.openURL(item.source_url);
    }
  }, []);

  const handleAddItem = useCallback(() => {
    // Navigate to add-from-url screen with wishlist ID pre-selected
    // The add screen should accept wishlistId param to pre-select destination
    router.push(`/(app)/add-from-url?wishlistId=${id}`);
  }, [router, id]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: t('common.loading') }} />
        <ActivityIndicator size="large" color={colors.burgundy[600]} />
      </View>
    );
  }

  // Error state
  if (error || !wishlist) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: t('common.error') }} />
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error || t('wishlists.notFound')}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  const headerTitle = wishlist.for_name
    ? `${wishlist.emoji || '🎁'} ${wishlist.name}`
    : `${wishlist.emoji || '🎁'} ${wishlist.name}`;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerBackTitle: t('common.back'),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Wishlist Header */}
        <View style={styles.headerCard}>
          <Text style={styles.wishlistEmoji}>{wishlist.emoji || '🎁'}</Text>
          <Text style={styles.wishlistName}>{wishlist.name}</Text>
          {wishlist.for_name && (
            <Text style={styles.forName}>
              {t('groups.forOthersFor', { name: wishlist.for_name })}
            </Text>
          )}
          <Text style={styles.itemCount}>
            {t('groups.forOthersItemCount', { count: wishlist.items?.length || 0 })}
          </Text>
        </View>

        {/* Items List */}
        {!wishlist.items || wishlist.items.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="gift-outline" size={48} color={colors.burgundy[300]} />
            <Text style={styles.emptyTitle}>{t('wishlists.noItems')}</Text>
            <Text style={styles.emptyHint}>{t('wishlists.addFirstItem')}</Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {wishlist.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => handleItemPress(item)}
                disabled={!item.source_url}
                activeOpacity={item.source_url ? 0.7 : 1}
              >
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                    <MaterialCommunityIcons name="gift-outline" size={24} color={colors.burgundy[300]} />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                  {item.price != null && (
                    <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                  )}
                </View>
                {item.source_url && (
                  <MaterialCommunityIcons
                    name="open-in-new"
                    size={20}
                    color={colors.burgundy[400]}
                    style={styles.linkIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Item FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAddItem} activeOpacity={0.8}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.burgundy[50],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.burgundy[50],
    padding: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100, // Space for FAB
  },
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  wishlistEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  wishlistName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.burgundy[800],
    textAlign: 'center',
  },
  forName: {
    fontSize: 16,
    color: colors.burgundy[500],
    marginTop: spacing.xs,
  },
  itemCount: {
    fontSize: 14,
    color: colors.burgundy[400],
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.burgundy[600],
    marginTop: spacing.md,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.burgundy[400],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  itemsList: {
    gap: spacing.sm,
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.burgundy[100],
  },
  itemImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.burgundy[800],
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.burgundy[600],
    marginTop: spacing.xs,
  },
  linkIcon: {
    marginLeft: spacing.sm,
  },
  errorText: {
    fontSize: 16,
    color: colors.burgundy[600],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  backButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.burgundy[100],
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.burgundy[700],
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.burgundy[600],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
});
