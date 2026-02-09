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
  getGroupsWithItemAsFavorite,
  setNextHighestPriorityFavorite,
  ensureUniversalSpecialItems,
  getMissingSpecialItems,
  readdSpecialItem,
} from '../../../lib/favorites';
import { GroupPickerSheet } from '../../../components/wishlist/GroupPickerSheet';
import NotificationIconButton from '../../../components/notifications/NotificationIconButton';

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
  const [missingSpecialItems, setMissingSpecialItems] = useState<Array<'surprise_me' | 'mystery_box'>>([]);

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

      // Ensure universal special items exist (Surprise Me and Mystery Box)
      await ensureUniversalSpecialItems(user.id);

      // Ensure all groups have a favorite (defaults to Surprise Me)
      await ensureAllGroupsHaveFavorites(user.id);

      // Load all favorites across all groups
      const allFavs = await getAllFavoritesForUser(user.id);
      setFavorites(allFavs);

      // Check for any missing special items (in case user deleted them)
      const missing = await getMissingSpecialItems(user.id);
      setMissingSpecialItems(missing);
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

      // Check for missing special items
      const missing = await getMissingSpecialItems(userId);
      setMissingSpecialItems(missing);
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
    // Also set priority to 5 stars (Most Wanted = highest priority)
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

    // Optimistic update: set priority to 5 stars for Most Wanted
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, priority: 5 } : item
      )
    );

    try {
      // Set favorite and update priority to 5 stars in parallel
      await Promise.all([
        setFavorite(userId, groupId, itemId, itemType),
        supabase
          .from('wishlist_items')
          .update({ priority: 5 })
          .eq('id', itemId)
      ]);
    } catch (error) {
      console.error('Failed to set favorite:', error);
      // Reload favorites and items on error
      const allFavs = await getAllFavoritesForUser(userId);
      setFavorites(allFavs);
      await fetchWishlistItems();
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  // For special items: batch confirm favorite changes
  const handleConfirmSpecialItemGroups = async (
    itemId: string,
    itemType: ItemType,
    addedGroupIds: string[],
    removedGroupIds: string[]
  ) => {
    if (!userId) return;

    // Animate list reordering
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Optimistic update
    setFavorites(prevFavs => {
      let updated = [...prevFavs];

      // Remove from removed groups
      for (const groupId of removedGroupIds) {
        updated = updated.filter(f => !(f.groupId === groupId && f.itemId === itemId));
      }

      // Add to added groups
      for (const groupId of addedGroupIds) {
        const group = userGroups.find(g => g.id === groupId);
        // Remove any existing favorite for this group first
        updated = updated.filter(f => f.groupId !== groupId);
        updated.push({ groupId, groupName: group?.name || '', itemId });
      }

      return updated;
    });

    // Set priority to 5 stars if adding to any group
    if (addedGroupIds.length > 0) {
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, priority: 5 } : item
        )
      );
    }

    try {
      // Process removals first (will set default Surprise Me)
      for (const groupId of removedGroupIds) {
        await toggleFavoriteForGroup(userId, groupId, itemId, itemType, true);
      }

      // Process additions
      for (const groupId of addedGroupIds) {
        await toggleFavoriteForGroup(userId, groupId, itemId, itemType, false);
      }

      // If adding as Most Wanted, also update priority to 5
      if (addedGroupIds.length > 0) {
        await supabase
          .from('wishlist_items')
          .update({ priority: 5 })
          .eq('id', itemId);
      }

      // Reload to get any default Surprise Me that was set
      const allFavs = await getAllFavoritesForUser(userId);
      setFavorites(allFavs);
    } catch (error) {
      console.error('Failed to update favorites:', error);
      const allFavs = await getAllFavoritesForUser(userId);
      setFavorites(allFavs);
      await fetchWishlistItems();
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const handleAddItem = async (itemData: {
    amazon_url: string | null;
    title: string;
    price?: number;
    priority: number;
    item_type: 'standard';
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
            item_type: 'standard',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setItems([data, ...items]);

      Alert.alert('Success!', 'Gift added to your wishlist!');
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!userId) return;

    try {
      // Find the item to check if it's a special item
      const itemToDelete = items.find(item => item.id === itemId);
      const isSpecialItemType = itemToDelete && isSpecialItem(itemToDelete.item_type as ItemType);

      // Check if this item is a favorite for any groups
      const affectedGroups = await getGroupsWithItemAsFavorite(userId, itemId);

      // Promote next highest priority item as favorite for all affected groups
      for (const groupId of affectedGroups) {
        await setNextHighestPriorityFavorite(userId, groupId, itemId);
      }

      // Delete the item
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setItems(items.filter((item) => item.id !== itemId));

      // If a special item was deleted, update the missing items list
      if (isSpecialItemType && itemToDelete) {
        const itemType = itemToDelete.item_type as 'surprise_me' | 'mystery_box';
        setMissingSpecialItems(prev => [...prev, itemType]);
      }

      // Refresh favorites to reflect the Surprise Me defaults
      if (affectedGroups.length > 0) {
        const allFavs = await getAllFavoritesForUser(userId);
        setFavorites(allFavs);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item');
    }
  };

  const handleReaddSpecialItem = async (itemType: 'surprise_me' | 'mystery_box') => {
    if (!userId) return;

    try {
      const newItemId = await readdSpecialItem(userId, itemType);
      if (newItemId) {
        // Refresh the wishlist to show the new item
        await fetchWishlistItems();
        // Remove from missing items
        setMissingSpecialItems(prev => prev.filter(t => t !== itemType));

        // Item added silently - no alert needed
      }
    } catch (error) {
      console.error('Error re-adding special item:', error);
      Alert.alert('Error', 'Failed to add item');
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
            {/* Title Row with Profile Picture and Notification Icon */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Left: Profile Picture and Title */}
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {/* Profile Picture */}
                <TouchableOpacity
                  onPress={() => router.push('/settings/profile')}
                  activeOpacity={0.8}
                  style={{ marginRight: spacing.md }}
                >
                  {userProfile.avatar_url ? (
                    <Image
                      source={{ uri: getAvatarUrl(userProfile.avatar_url) || undefined }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        borderWidth: 2,
                        borderColor: colors.white,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        borderWidth: 2,
                        borderColor: colors.white,
                        backgroundColor: colors.gold[200],
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: '700',
                          color: colors.burgundy[800],
                        }}
                      >
                        {userProfile.display_name?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Title and Count */}
                <View>
                  <Text
                    style={{
                      fontSize: 32,
                      fontWeight: '700',
                      color: colors.white,
                      marginBottom: spacing.xs,
                    }}
                  >
                    My Wishlist
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: colors.gold[200],
                      fontWeight: '400',
                    }}
                  >
                    {items.length} {items.length === 1 ? 'gift' : 'gifts'}
                  </Text>
                </View>
              </View>

              {/* Right: Notification Icon */}
              <NotificationIconButton size={28} />
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
          {/* Re-add Special Items Banner */}
          {missingSpecialItems.length > 0 && !loading && (
            <View
              style={{
                backgroundColor: colors.cream[100],
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.md,
                borderWidth: 1,
                borderColor: colors.gold[200],
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.burgundy[700],
                  marginBottom: spacing.sm,
                }}
              >
                Add Special Items
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {missingSpecialItems.includes('surprise_me') && (
                  <TouchableOpacity
                    onPress={() => handleReaddSpecialItem('surprise_me')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.burgundy[100],
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: borderRadius.md,
                      gap: spacing.xs,
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="help-circle-outline"
                      size={20}
                      color={colors.burgundy[700]}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.burgundy[700],
                      }}
                    >
                      Surprise Me
                    </Text>
                  </TouchableOpacity>
                )}
                {missingSpecialItems.includes('mystery_box') && (
                  <TouchableOpacity
                    onPress={() => handleReaddSpecialItem('mystery_box')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.gold[100],
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: borderRadius.md,
                      gap: spacing.xs,
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="gift"
                      size={20}
                      color={colors.gold[700]}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.gold[700],
                      }}
                    >
                      Mystery Box
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

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
                  Tap the gift button below to add{'\n'}gifts you're wishing for
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
                    totalUserGroups={userGroups.length}
                  />
                );
              });
            })()
          )}
        </ScrollView>

        {/* Floating Add Button */}
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.gold[500],
            alignItems: 'center',
            justifyContent: 'center',
            ...shadows.gold,
            elevation: 8,
          }}
        >
          <MaterialCommunityIcons
            name="gift-outline"
            size={32}
            color={colors.white}
          />
        </TouchableOpacity>
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
        onConfirmSpecialItemGroups={(addedGroupIds, removedGroupIds) => {
          if (selectedItemForPicker) {
            handleConfirmSpecialItemGroups(
              selectedItemForPicker.id,
              selectedItemType,
              addedGroupIds,
              removedGroupIds
            );
          }
        }}
        itemTitle={selectedItemForPicker?.title || ''}
        itemType={selectedItemType}
      />
    </>
  );
}
