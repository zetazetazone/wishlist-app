import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { WishlistItem } from '../../../types/database.types';
import { getItemClaimStatus } from '../../../lib/claims';
import LuxuryBottomSheet, {
  LuxuryBottomSheetRef,
} from '../../../components/wishlist/LuxuryBottomSheet';
import LuxuryWishlistCard from '../../../components/wishlist/LuxuryWishlistCard';
import { TakenCounter } from '../../../components/wishlist/TakenCounter';
import { WishlistGrid } from '../../../components/wishlist';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';

export default function LuxuryWishlistScreen() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [claimStatuses, setClaimStatuses] = useState<Map<string, boolean>>(new Map());
  const [favoriteItemIds, setFavoriteItemIds] = useState<Set<string>>(new Set());
  const bottomSheetRef = useRef<LuxuryBottomSheetRef>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchWishlistItems();
    }
  }, [userId]);

  // Fetch claim statuses when items change
  useEffect(() => {
    if (items.length > 0) {
      fetchClaimStatuses(items.map((i) => i.id));
    }
  }, [items]);

  // Refresh claim statuses when tab is focused (per CLMX-02 requirement)
  useFocusEffect(
    useCallback(() => {
      if (items.length > 0) {
        // Filter out special item types that cannot be claimed
        const claimableItemIds = items
          .filter(
            (item) =>
              item.item_type !== 'surprise_me' && item.item_type !== 'mystery_box'
          )
          .map((item) => item.id);
        if (claimableItemIds.length > 0) {
          fetchClaimStatuses(claimableItemIds);
        }
      }
    }, [items])
  );

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  /**
   * Fetch claim statuses for the celebrant's own items
   * Uses getItemClaimStatus which only returns boolean is_claimed
   * without leaking claimer identity to the item owner
   */
  const fetchClaimStatuses = async (itemIds: string[]) => {
    if (itemIds.length === 0) return;

    console.log('[Wishlist] Fetching claim statuses for', itemIds.length, 'items');

    try {
      const statuses = await getItemClaimStatus(itemIds);
      console.log('[Wishlist] Received statuses:', statuses);

      const statusMap = new Map<string, boolean>();
      statuses.forEach((s) => statusMap.set(s.wishlist_item_id, s.is_claimed));

      const takenItems = statuses.filter(s => s.is_claimed);
      console.log('[Wishlist] Taken items count:', takenItems.length);

      setClaimStatuses(statusMap);
    } catch (err) {
      console.error('[Wishlist] Failed to fetch claim statuses:', err);
    }
  };

  const fetchWishlistItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching wishlist items:', error);
      Alert.alert('Error', 'Failed to load wishlist items');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWishlistItems();
    setRefreshing(false);
  };

  const handleItemPress = useCallback((item: WishlistItem) => {
    // For Phase 34: Navigate to item detail (placeholder)
    // Phase 35 will add actual detail navigation
    console.log('Item pressed:', item.id);
    // TODO: router.push(`/wishlist/${item.id}`) in Phase 35
  }, []);

  const handleItemAction = useCallback((item: WishlistItem) => {
    // For Phase 34: Open bottom sheet (existing behavior)
    bottomSheetRef.current?.open();
  }, []);

  const handleAddItem = async (itemData: {
    amazon_url: string;
    title: string;
    price?: number;
    priority: number;
  }) => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to add items');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .insert([
          {
            user_id: userId,
            amazon_url: itemData.amazon_url,
            title: itemData.title,
            price: itemData.price,
            priority: itemData.priority,
            status: 'active',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setItems([data, ...items]);
      Alert.alert('Added!', 'Gift added to your wishlist');
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item');
    }
  };

  // Calculate taken count for TakenCounter (exclude special item types)
  const standardItems = items.filter(
    (item) => item.item_type !== 'surprise_me' && item.item_type !== 'mystery_box'
  );
  const takenCount = standardItems.filter((item) => claimStatuses.get(item.id)).length;
  const standardItemCount = standardItems.length;

  // Sort items with taken at bottom (unclaimed items stay more visible)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aIsTaken = claimStatuses.get(a.id) || false;
      const bIsTaken = claimStatuses.get(b.id) || false;

      // Unclaimed items first
      if (aIsTaken && !bIsTaken) return 1;
      if (!aIsTaken && bIsTaken) return -1;

      // Within same status, sort by priority (higher first)
      return (b.priority || 0) - (a.priority || 0);
    });
  }, [items, claimStatuses]);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: colors.cream[50] }}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[colors.burgundy[800], colors.burgundy[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 60,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.lg,
          }}
        >
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 36,
                    fontWeight: '700',
                    color: colors.white,
                    marginBottom: spacing.xs,
                  }}
                >
                  My Wishlist
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text
                    style={{
                      fontSize: 16,
                      color: colors.gold[200],
                      fontWeight: '400',
                    }}
                  >
                    {items.length} {items.length === 1 ? 'gift' : 'gifts'}
                  </Text>
                  {takenCount > 0 && (
                    <TakenCounter takenCount={takenCount} totalCount={standardItemCount} />
                  )}
                </View>
              </View>

              {/* FAB Add Button */}
              <TouchableOpacity
                onPress={() => bottomSheetRef.current?.open()}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: colors.gold[500],
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...shadows.gold,
                }}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={32}
                  color={colors.white}
                />
              </TouchableOpacity>
            </View>
          </MotiView>
        </LinearGradient>

        {/* Content */}
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={{ paddingVertical: spacing.xxl }}>
              <Text
                style={{
                  textAlign: 'center',
                  color: colors.burgundy[400],
                  fontSize: 16,
                }}
              >
                Loading...
              </Text>
            </View>
          ) : (
            <WishlistGrid
              items={sortedItems}
              onItemPress={handleItemPress}
              onItemAction={handleItemAction}
              isOwner={true}
              favoriteItemIds={favoriteItemIds}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              ListEmptyComponent={
                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', delay: 200 }}
                >
                  <View
                    style={{
                      backgroundColor: colors.white,
                      borderRadius: borderRadius.xl,
                      padding: spacing.xxl,
                      alignItems: 'center',
                      marginTop: spacing.xxl,
                      borderWidth: 2,
                      borderColor: colors.gold[100],
                      borderStyle: 'dashed',
                    }}
                  >
                    <View
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        backgroundColor: colors.burgundy[50],
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: spacing.lg,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="gift-outline"
                        size={60}
                        color={colors.burgundy[400]}
                      />
                    </View>

                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: '700',
                        color: colors.burgundy[800],
                        marginBottom: spacing.sm,
                        textAlign: 'center',
                      }}
                    >
                      Start Your Wishlist
                    </Text>

                    <Text
                      style={{
                        fontSize: 16,
                        color: colors.burgundy[400],
                        textAlign: 'center',
                        lineHeight: 24,
                      }}
                    >
                      Tap the golden + button above to add{'\n'}gifts you're wishing for
                    </Text>
                  </View>
                </MotiView>
              }
            />
          )}
        </View>
      </View>

      <LuxuryBottomSheet ref={bottomSheetRef} onAdd={handleAddItem} />
    </>
  );
}
