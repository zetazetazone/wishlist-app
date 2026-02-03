import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
  LayoutAnimation,
  UIManager,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { WishlistItem } from '../../../types/database.types';
import AddItemModal from '../../../components/wishlist/AddItemModal';
import LuxuryWishlistCard from '../../../components/wishlist/LuxuryWishlistCard';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';
import { getAvatarUrl } from '../../../lib/storage';
import {
  getUserGroups,
  getAllFavoritesForUser,
  setFavorite,
  toggleFavoriteForGroup,
  ensureAllGroupsHaveFavorites,
  isSpecialItem,
} from '../../../lib/favorites';
import { GroupPickerSheet } from '../../../components/wishlist/GroupPickerSheet';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ItemType = 'standard' | 'surprise_me' | 'mystery_box';

export default function LuxuryWishlistScreen() {
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userGroups, setUserGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [favorites, setFavorites] = useState<Array<{ groupId: string; groupName: string; itemId: string }>>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedItemForPicker, setSelectedItemForPicker] = useState<WishlistItem | null>(null);
  const [userProfile, setUserProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({
    display_name: null,
    avatar_url: null,
  });

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchWishlistItems();
    }
  }, [userId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);

    if (user) {
      // Load user's profile (display name and avatar)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserProfile({
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        });
      }

      // Load user's groups
      const groups = await getUserGroups(user.id);
      setUserGroups(groups);

      // Ensure all groups have a favorite (defaults to Surprise Me)
      await ensureAllGroupsHaveFavorites(user.id);

      // Load all favorites across all groups
      const allFavs = await getAllFavoritesForUser(user.id);
      setFavorites(allFavs);
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
    if (userId) {
      // Refresh profile data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .single();

      if (profile) {
        setUserProfile({
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        });
      }

      await ensureAllGroupsHaveFavorites(userId);
      const allFavs = await getAllFavoritesForUser(userId);
      setFavorites(allFavs);
    }
    setRefreshing(false);
  };

  const handleHeartPress = (item: WishlistItem) => {
    if (userGroups.length === 0) {
      Alert.alert('No Groups', 'Join a group to mark favorites');
      return;
    }

    const itemType = (item.item_type || 'standard') as ItemType;

    if (userGroups.length === 1 && !isSpecialItem(itemType)) {
      // Single group + standard item: select directly
      handleSelectFavorite(item.id, userGroups[0].id, itemType);
    } else {
      // Multiple groups OR special item: show picker
      setSelectedItemForPicker(item);
      setPickerVisible(true);
    }
  };

  // For standard items: select as favorite for a single group
  const handleSelectFavorite = async (itemId: string, groupId: string, itemType: ItemType) => {
    if (!userId) return;

    const group = userGroups.find(g => g.id === groupId);

    // Animate list reordering
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Optimistic update: replace favorite for this group, remove from others if standard
    if (!isSpecialItem(itemType)) {
      // Standard item: can only be in one group
      setFavorites(prevFavs => {
        // Remove this item from all groups, then add to selected group
        const withoutThisItem = prevFavs.filter(f => f.itemId !== itemId);
        // Replace favorite for selected group
        const withoutSelectedGroup = withoutThisItem.filter(f => f.groupId !== groupId);
        return [...withoutSelectedGroup, { groupId, groupName: group?.name || '', itemId }];
      });
    } else {
      // Special item: just update this group
      setFavorites(prevFavs => {
        const withoutSelectedGroup = prevFavs.filter(f => f.groupId !== groupId);
        return [...withoutSelectedGroup, { groupId, groupName: group?.name || '', itemId }];
      });
    }

    try {
      await setFavorite(userId, groupId, itemId, itemType);
    } catch (error) {
      console.error('Failed to set favorite:', error);
      // Reload favorites on error
      const allFavs = await getAllFavoritesForUser(userId);
      setFavorites(allFavs);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  // For special items: toggle favorite for a specific group
  const handleToggleSpecialItem = async (itemId: string, groupId: string, itemType: ItemType) => {
    if (!userId) return;

    const currentlySelected = favorites.some(f => f.groupId === groupId && f.itemId === itemId);
    const group = userGroups.find(g => g.id === groupId);

    // Animate list reordering
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Optimistic update
    if (currentlySelected) {
      // Will be replaced by Surprise Me default - we'll reload after
      setFavorites(prevFavs => prevFavs.filter(f => !(f.groupId === groupId && f.itemId === itemId)));
    } else {
      // Add to this group
      setFavorites(prevFavs => {
        const withoutGroup = prevFavs.filter(f => f.groupId !== groupId);
        return [...withoutGroup, { groupId, groupName: group?.name || '', itemId }];
      });
    }

    try {
      await toggleFavoriteForGroup(userId, groupId, itemId, itemType, currentlySelected);
      // Reload to get any default Surprise Me that was set
      const allFavs = await getAllFavoritesForUser(userId);
      setFavorites(allFavs);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      const allFavs = await getAllFavoritesForUser(userId);
      setFavorites(allFavs);
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

  const handlePriorityChange = async (itemId: string, newPriority: number) => {
    // Optimistic update
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, priority: newPriority } : item
      )
    );

    try {
      const { error } = await supabase
        .from('wishlist_items')
        .update({ priority: newPriority })
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating priority:', error);
      // Revert optimistic update on error
      await fetchWishlistItems();
      Alert.alert('Error', 'Failed to update priority');
    }
  };

  const selectedItemType = (selectedItemForPicker?.item_type || 'standard') as ItemType;
  const selectedItemGroupIds = selectedItemForPicker
    ? favorites.filter(f => f.itemId === selectedItemForPicker.id).map(f => f.groupId)
    : [];

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
            {/* Profile Row */}
            <TouchableOpacity
              onPress={() => router.push('/settings/profile')}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              {/* Avatar */}
              {userProfile.avatar_url ? (
                <Image
                  source={{ uri: getAvatarUrl(userProfile.avatar_url) || undefined }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    borderWidth: 2,
                    borderColor: colors.white,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    borderWidth: 2,
                    borderColor: colors.white,
                    backgroundColor: colors.gold[200],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: '700',
                      color: colors.burgundy[800],
                    }}
                  >
                    {userProfile.display_name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              {/* Greeting */}
              <Text
                style={{
                  fontSize: 16,
                  color: colors.gold[200],
                  fontWeight: '500',
                  marginLeft: spacing.sm,
                }}
              >
                Hi, {userProfile.display_name?.split(' ')[0] || 'there'}!
              </Text>
            </TouchableOpacity>

            {/* Title Row */}
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
              // Sort items: favorited items first (any group), then by priority
              const sortedItems = [...items].sort((a, b) => {
                const aFavorited = favorites.some(f => f.itemId === a.id);
                const bFavorited = favorites.some(f => f.itemId === b.id);
                if (aFavorited && !bFavorited) return -1;
                if (!aFavorited && bFavorited) return 1;
                return (b.priority || 0) - (a.priority || 0);
              });

              return sortedItems.map((item, index) => {
                const itemFavorites = favorites
                  .filter(f => f.itemId === item.id)
                  .map(f => ({ groupId: f.groupId, groupName: f.groupName }));

                return (
                  <LuxuryWishlistCard
                    key={item.id}
                    item={item}
                    onDelete={handleDeleteItem}
                    onPriorityChange={handlePriorityChange}
                    index={index}
                    favoriteGroups={itemFavorites}
                    onToggleFavorite={() => handleHeartPress(item)}
                    showFavoriteHeart={true}
                  />
                );
              });
            })()
          )}
        </ScrollView>
      </View>

      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItem}
      />

      <GroupPickerSheet
        visible={pickerVisible}
        onClose={() => {
          setPickerVisible(false);
          setSelectedItemForPicker(null);
        }}
        groups={userGroups}
        selectedGroupIds={selectedItemGroupIds}
        onSelectGroup={(groupId) => {
          if (selectedItemForPicker) {
            handleSelectFavorite(selectedItemForPicker.id, groupId, selectedItemType);
          }
        }}
        onToggleGroup={(groupId) => {
          if (selectedItemForPicker) {
            handleToggleSpecialItem(selectedItemForPicker.id, groupId, selectedItemType);
          }
        }}
        itemTitle={selectedItemForPicker?.title || ''}
        itemType={selectedItemType}
      />
    </>
  );
}
