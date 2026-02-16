import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { WishlistItem } from '../../../types/database.types';
import AddItemModal from '../../../components/wishlist/AddItemModal';
import WishlistItemCard from '../../../components/wishlist/WishlistItemCard';

export default function WishlistScreen() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
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
    const { data: { user } } = await supabase.auth.getUser();
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
    source_url: string | null;
    title: string;
    price?: number;
    priority: number;
    item_type: 'standard';
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
            source_url: itemData.source_url,
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
      <ScrollView
        className="flex-1 bg-gray-50"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="p-6">
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            className="bg-blue-500 rounded-lg p-4 mb-6 shadow-sm"
          >
            <Text className="text-white text-center font-semibold text-lg">
              + Add Item from Amazon
            </Text>
          </TouchableOpacity>

          {loading ? (
            <View className="bg-white rounded-lg p-8">
              <Text className="text-gray-600 text-center">Loading...</Text>
            </View>
          ) : items.length === 0 ? (
            <View className="bg-white rounded-lg p-8">
              <Text className="text-gray-600 text-center text-lg font-semibold mb-2">
                Your wishlist is empty
              </Text>
              <Text className="text-gray-500 text-center">
                Add items from Amazon to get started
              </Text>
            </View>
          ) : (
            <View>
              <Text className="text-gray-700 font-semibold mb-3 text-base">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </Text>
              {items.map((item) => (
                <WishlistItemCard
                  key={item.id}
                  item={item}
                  onDelete={handleDeleteItem}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItem}
      />
    </>
  );
}
