import { View, Text, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface FavoritePreviewProps {
  item: {
    title: string;
    image_url: string | null;
    item_type: 'standard' | 'surprise_me' | 'mystery_box';
  };
}

/**
 * FavoritePreview - Compact display for a member's favorite wishlist item
 *
 * Shows thumbnail (40x40) with title. Uses icon fallbacks for:
 * - surprise_me: help-circle icon (burgundy)
 * - mystery_box: gift icon (gold)
 * - standard with no image: image-off icon (gray)
 */
export function FavoritePreview({ item }: FavoritePreviewProps) {
  const showImage = item.item_type === 'standard' && item.image_url;

  // Determine icon for non-standard items or missing images
  const getIconConfig = () => {
    if (item.item_type === 'surprise_me') {
      return { name: 'help-circle' as const, color: colors.burgundy[500] };
    }
    if (item.item_type === 'mystery_box') {
      return { name: 'gift' as const, color: colors.gold[500] };
    }
    // Standard item with no image
    return { name: 'image-off' as const, color: colors.cream[500] };
  };

  const iconConfig = getIconConfig();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.cream[100],
        borderRadius: borderRadius.sm,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
      }}
    >
      {/* Thumbnail or Icon */}
      {showImage ? (
        <Image
          source={{ uri: item.image_url! }}
          style={{
            width: 40,
            height: 40,
            borderRadius: borderRadius.sm,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: borderRadius.sm,
            backgroundColor: colors.cream[200],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons
            name={iconConfig.name}
            size={20}
            color={iconConfig.color}
          />
        </View>
      )}

      {/* Title */}
      <Text
        style={{
          fontSize: 12,
          color: colors.burgundy[600],
          flex: 1,
        }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.title}
      </Text>
    </View>
  );
}

export default FavoritePreview;
