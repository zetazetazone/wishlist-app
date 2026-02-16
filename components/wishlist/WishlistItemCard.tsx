import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WishlistItem } from '../../types/database.types';

interface WishlistItemCardProps {
  item: WishlistItem;
  onDelete?: (id: string) => void;
}

export default function WishlistItemCard({ item, onDelete }: WishlistItemCardProps) {
  const { t } = useTranslation();

  const handleOpenLink = async () => {
    if (!item.source_url) {
      Alert.alert(t('alerts.titles.error'), t('wishlist.card.noLinkAvailable'));
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(item.source_url);
      if (canOpen) {
        await Linking.openURL(item.source_url);
      } else {
        Alert.alert(t('alerts.titles.error'), t('wishlist.card.unableToOpenLink'));
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert(t('alerts.titles.error'), t('wishlist.card.failedToOpenLink'));
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('wishlist.card.deleteItem'),
      t('wishlist.card.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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
    if (priority >= 4) return t('wishlist.priority.high');
    if (priority === 3) return t('wishlist.priority.medium');
    return t('wishlist.priority.low');
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
            {t('wishlist.card.viewProduct')}
          </Text>
        </TouchableOpacity>
        {onDelete && (
          <TouchableOpacity
            onPress={handleDelete}
            className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"
          >
            <Text className="text-red-600 font-semibold">{t('common.delete')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Metadata */}
      <View className="mt-3 pt-3 border-t border-gray-100">
        <Text className="text-gray-400 text-xs">
          {t('wishlist.card.added', { date: new Date(item.created_at).toLocaleDateString() })}
        </Text>
      </View>
    </View>
  );
}
