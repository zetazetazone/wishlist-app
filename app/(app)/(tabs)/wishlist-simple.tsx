import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import { WishlistItem } from '../../../types/database.types';
import AddItemBottomSheet from '../../../components/wishlist/AddItemBottomSheet';
import WishlistItemCardSimple from '../../../components/wishlist/WishlistItemCardSimple';

export default function WishlistScreenSimple() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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

      // Add the new item to the list
      setItems([data, ...items]);
      Alert.alert('Success', 'Item added to your wishlist!');
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

      // Remove the item from the list
      setItems(items.filter((item) => item.id !== itemId));
      Alert.alert('Success', 'Item removed from wishlist');
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item');
    }
  };

  return (
    <>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">My Wishlist</Text>
          <TouchableOpacity
            onPress={() => setShowAddSheet(true)}
            className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center shadow-sm"
            activeOpacity={0.8}
          >
            <Text className="text-white text-2xl font-light">+</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {loading ? (
            <View className="py-12">
              <Text className="text-gray-400 text-center">Loading...</Text>
            </View>
          ) : items.length === 0 ? (
            <View className="py-16 items-center">
              <Text className="text-6xl mb-4">🎁</Text>
              <Text className="text-xl font-semibold text-gray-900 mb-2">
                Start Your Wishlist
              </Text>
              <Text className="text-gray-500 text-center px-8">
                Tap the + button above to add items from Amazon
              </Text>
            </View>
          ) : (
            <>
              {items.map((item) => (
                <WishlistItemCardSimple
                  key={item.id}
                  item={item}
                  onDelete={handleDeleteItem}
                />
              ))}
            </>
          )}
        </ScrollView>
      </View>

      <AddItemBottomSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={handleAddItem}
      />
    </>
  );
}
