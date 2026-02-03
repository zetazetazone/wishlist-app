import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { WishlistItem } from '../../../types/database.types';
import AddItemModal from '../../../components/wishlist/AddItemModal';
import LuxuryWishlistCard from '../../../components/wishlist/LuxuryWishlistCard';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';
import { setFavorite, removeFavorite, getFavoriteForGroup } from '../../../lib/favorites';

export default function LuxuryWishlistScreen() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [favoriteItemId, setFavoriteItemId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchWishlistItems();
    }
  }, [userId]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id || null);

    // Load user's first group and favorite
    if (user) {
      const { data: membership } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (membership) {
        setActiveGroupId(membership.group_id);
        // Load favorite for this group
        const favId = await getFavoriteForGroup(user.id, membership.group_id);
        setFavoriteItemId(favId);
      }
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
    if (userId && activeGroupId) {
      const favId = await getFavoriteForGroup(userId, activeGroupId);
      setFavoriteItemId(favId);
    }
    setRefreshing(false);
  };

  const handleToggleFavorite = async (itemId: string) => {
    if (!userId || !activeGroupId) return;

    // Store previous for rollback
    const previousFavorite = favoriteItemId;

    // Optimistic update
    if (itemId === favoriteItemId) {
      setFavoriteItemId(null); // Unfavoriting
    } else {
      setFavoriteItemId(itemId); // Favoriting (auto-replaces old)
    }

    try {
      if (itemId === previousFavorite) {
        // Unfavoriting
        await removeFavorite(userId, activeGroupId);
      } else {
        // Favoriting (upsert handles replacement)
        await setFavorite(userId, activeGroupId, itemId);
      }
    } catch (error) {
      // Rollback on error
      console.error('Failed to toggle favorite:', error);
      setFavoriteItemId(previousFavorite);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const handleAddItem = async (itemData: {
    amazon_url: string;
    title: string;
    price?: number;
    priority: number;
    item_type: 'standard' | 'surprise_me' | 'mystery_box';
    mystery_box_tier?: 25 | 50 | 100 | null;
    surprise_me_budget?: number | null;
  }) => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to add items');
      throw new Error('Not logged in');
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
            item_type: itemData.item_type,
            mystery_box_tier: itemData.mystery_box_tier,
            surprise_me_budget: itemData.surprise_me_budget,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setItems([data, ...items]);

      // Success message based on item type
      const successMessages = {
        standard: 'Gift added to your wishlist!',
        surprise_me: 'Added Surprise Me to your wishlist!',
        mystery_box: 'Added Mystery Box to your wishlist!',
      };
      Alert.alert('Success!', successMessages[itemData.item_type]);
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
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.gold[200],
                    fontWeight: '400',
                  }}
                >
                  {items.length} {items.length === 1 ? 'gift' : 'gifts'}
                </Text>
              </View>

              {/* FAB Add Button */}
              <TouchableOpacity
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.7}
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
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingTop: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.burgundy[600]}
              colors={[colors.burgundy[600]]}
            />
          }
        >
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
          ) : items.length === 0 ? (
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
          ) : (
            (() => {
              // Sort items with favorite pinned to top
              const sortedItems = [...items].sort((a, b) => {
                if (a.id === favoriteItemId) return -1;
                if (b.id === favoriteItemId) return 1;
                // Then by priority (stars) descending
                return (b.priority || 0) - (a.priority || 0);
              });

              return sortedItems.map((item, index) => (
                <LuxuryWishlistCard
                  key={item.id}
                  item={item}
                  onDelete={handleDeleteItem}
                  index={index}
                  isFavorite={item.id === favoriteItemId}
                  onToggleFavorite={() => handleToggleFavorite(item.id)}
                  showFavoriteHeart={true}
                />
              ));
            })()
          )}
        </ScrollView>
      </View>

      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItem}
      />
    </>
  );
}
