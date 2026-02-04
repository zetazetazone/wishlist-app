import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { WishlistItem } from '../../types/database.types';
import StarRating from '../ui/StarRating';
import { useState } from 'react';

interface WishlistItemCardSimpleProps {
  item: WishlistItem;
  onDelete?: (id: string) => void;
}

export default function WishlistItemCardSimple({
  item,
  onDelete,
}: WishlistItemCardSimpleProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleOpenLink = async () => {
    if (!item.amazon_url) {
      Alert.alert('Error', 'No link available for this item');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(item.amazon_url);
      if (canOpen) {
        await Linking.openURL(item.amazon_url);
      } else {
        Alert.alert('Error', 'Unable to open this link');
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Item',
      'Remove this item from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(item.id),
        },
      ]
    );
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return `$${price.toFixed(2)}`;
  };

  return (
    <View className="bg-white rounded-xl p-4 mb-3 border border-gray-100">
      {/* Title Row */}
      <View className="flex-row items-start mb-2">
        <Text className="text-xl mr-2">📦</Text>
        <Text
          className="flex-1 text-base font-semibold text-gray-900 leading-5"
          numberOfLines={2}
        >
          {item.title}
        </Text>
      </View>

      {/* Price and Priority Row */}
      <View className="flex-row items-center justify-between mb-3">
        {item.price ? (
          <Text className="text-xl font-bold text-blue-600">
            {formatPrice(item.price)}
          </Text>
        ) : (
          <View />
        )}
        <StarRating rating={item.priority} readonly size={18} />
      </View>

      {/* Action Row */}
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={handleOpenLink}
          className="flex-1 bg-blue-500 rounded-lg py-3"
          activeOpacity={0.8}
        >
          <Text className="text-white text-center font-semibold text-sm">
            View Product
          </Text>
        </TouchableOpacity>

        {onDelete && (
          <TouchableOpacity
            onPress={() => setShowMenu(!showMenu)}
            className="bg-gray-100 rounded-lg px-4 py-3"
            activeOpacity={0.8}
          >
            <Text className="text-gray-600 text-lg font-bold">⋮</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Context Menu */}
      {showMenu && (
        <View className="absolute right-4 top-16 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10">
          <TouchableOpacity
            onPress={handleDelete}
            className="px-4 py-3 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Text className="text-red-600 font-medium">Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowMenu(false)}
            className="px-4 py-3"
            activeOpacity={0.7}
          >
            <Text className="text-gray-600 font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
