import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { WishlistItem } from '../../types/database.types';

interface WishlistItemCardProps {
  item: WishlistItem;
  onDelete?: (id: string) => void;
}

export default function WishlistItemCard({ item, onDelete }: WishlistItemCardProps) {
  const handleOpenLink = async () => {
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
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this item from your wishlist?',
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

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'bg-red-500';
    if (priority === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 4) return 'High';
    if (priority === 3) return 'Medium';
    return 'Low';
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return `$${price.toFixed(2)}`;
  };

  return (
    <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3">
      {/* Header with Priority Badge */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-2">
          <Text className="text-lg font-semibold text-gray-900" numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        <View
          className={`${getPriorityColor(item.priority)} px-3 py-1 rounded-full`}
        >
          <Text className="text-white text-xs font-semibold">
            {getPriorityLabel(item.priority)}
          </Text>
        </View>
      </View>

      {/* Price */}
      {item.price && (
        <Text className="text-xl font-bold text-blue-600 mb-3">
          {formatPrice(item.price)}
        </Text>
      )}

      {/* Status Badge */}
      <View className="mb-3">
        <View className="bg-gray-100 px-3 py-1 rounded-full self-start">
          <Text className="text-gray-700 text-xs font-medium capitalize">
            {item.status}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={handleOpenLink}
          className="flex-1 bg-blue-500 rounded-lg py-3"
        >
          <Text className="text-white text-center font-semibold">
            View on Amazon
          </Text>
        </TouchableOpacity>
        {onDelete && (
          <TouchableOpacity
            onPress={handleDelete}
            className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"
          >
            <Text className="text-red-600 font-semibold">Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Metadata */}
      <View className="mt-3 pt-3 border-t border-gray-100">
        <Text className="text-gray-400 text-xs">
          Added {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}
