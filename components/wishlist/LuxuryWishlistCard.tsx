import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { WishlistItem } from '../../types/database.types';
import StarRating from '../ui/StarRating';
import { LinearGradient } from 'expo-linear-gradient';

interface LuxuryWishlistCardProps {
  item: WishlistItem;
  onDelete?: (id: string) => void;
  index: number;
}

export default function LuxuryWishlistCard({
  item,
  onDelete,
  index,
}: LuxuryWishlistCardProps) {
  const handleOpenLink = async () => {
    try {
      const canOpen = await Linking.canOpenURL(item.amazon_url);
      if (canOpen) {
        await Linking.openURL(item.amazon_url);
      } else {
        Alert.alert('Error', 'Unable to open this link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const handleDelete = () => {
    Alert.alert('Remove Gift', 'Remove this item from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onDelete?.(item.id),
      },
    ]);
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return `$${price.toFixed(2)}`;
  };

  return (
    <MotiView
      from={{
        opacity: 0,
        scale: 0.9,
        translateY: 50,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        translateY: 0,
      }}
      transition={{
        type: 'spring',
        delay: index * 100,
        damping: 20,
        stiffness: 200,
      }}
      style={{
        marginBottom: spacing.md,
      }}
    >
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.gold[100],
          ...shadows.md,
        }}
      >
        {/* Gold accent border */}
        <LinearGradient
          colors={[colors.gold[400], colors.gold[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            height: 4,
            width: '100%',
          }}
        />

        <View style={{ padding: spacing.md }}>
          {/* Header Row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: spacing.sm,
            }}
          >
            {/* Icon & Title */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: borderRadius.sm,
                  backgroundColor: colors.burgundy[50],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.sm,
                }}
              >
                <MaterialCommunityIcons
                  name="gift"
                  size={28}
                  color={colors.burgundy[600]}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 17,
                    fontWeight: '600',
                    color: colors.burgundy[900],
                    lineHeight: 22,
                  }}
                >
                  {item.title}
                </Text>
              </View>
            </View>

            {/* Delete Button */}
            {onDelete && (
              <TouchableOpacity
                onPress={handleDelete}
                style={{
                  padding: spacing.xs,
                  marginLeft: spacing.xs,
                }}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={24}
                  color={colors.burgundy[300]}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Price & Stars Row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            {item.price ? (
              <View
                style={{
                  backgroundColor: colors.gold[50],
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: borderRadius.sm,
                }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: colors.gold[700],
                  }}
                >
                  {formatPrice(item.price)}
                </Text>
              </View>
            ) : (
              <View />
            )}

            <StarRating rating={item.priority} readonly size={20} />
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleOpenLink}
            style={{
              backgroundColor: colors.burgundy[700],
              borderRadius: borderRadius.md,
              padding: spacing.md,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              ...shadows.sm,
            }}
          >
            <MaterialCommunityIcons
              name="shopping"
              size={20}
              color={colors.white}
              style={{ marginRight: spacing.xs }}
            />
            <Text
              style={{
                color: colors.white,
                fontSize: 16,
                fontWeight: '600',
                letterSpacing: 0.3,
              }}
            >
              View on Amazon
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </MotiView>
  );
}
