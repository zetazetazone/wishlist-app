import { useState } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { WishlistPickerSheet } from './WishlistPickerSheet';
import { useMoveItemToWishlist, useWishlists } from '../../hooks/useWishlists';
import { getImagePlaceholder } from '../../utils/wishlist';
import type { WishlistItem } from '../../types/database.types';

interface MoveItemSheetProps {
  visible: boolean;
  onClose: () => void;
  item: WishlistItem | null;
  onSuccess?: () => void;
}

export function MoveItemSheet({ visible, onClose, item, onSuccess }: MoveItemSheetProps) {
  const { t } = useTranslation();
  const [isMoving, setIsMoving] = useState(false);
  const moveItemMutation = useMoveItemToWishlist();
  const { data: wishlists = [] } = useWishlists();

  // Find current wishlist
  const currentWishlist = wishlists.find((w) => w.id === item?.wishlist_id);

  const handleWishlistSelect = async (targetWishlistId: string) => {
    if (!item) return;

    setIsMoving(true);
    try {
      await moveItemMutation.mutateAsync({
        itemId: item.id,
        targetWishlistId,
      });

      // Success
      Alert.alert(
        t('alerts.titles.success'),
        t('wishlists.itemMoved'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              onSuccess?.();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to move item:', error);
      Alert.alert(
        t('alerts.titles.error'),
        t('wishlists.moveFailed')
      );
    } finally {
      setIsMoving(false);
    }
  };

  if (!item) return null;

  const placeholder = getImagePlaceholder(item.item_type);

  return (
    <>
      <WishlistPickerSheet
        visible={visible && !isMoving}
        onClose={onClose}
        onSelect={handleWishlistSelect}
        excludeWishlistId={item.wishlist_id || undefined}
        title={t('wishlists.moveToWishlist')}
      />

      {/* Loading overlay */}
      {isMoving && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: borderRadius.lg,
              padding: spacing.xl,
              alignItems: 'center',
              minWidth: 200,
            }}
          >
            <ActivityIndicator size="large" color={colors.burgundy[600]} />
            <Text
              style={{
                marginTop: spacing.md,
                fontSize: 16,
                fontWeight: '600',
                color: colors.burgundy[800],
              }}
            >
              {t('common.loading')}
            </Text>
            {currentWishlist && (
              <Text
                style={{
                  marginTop: spacing.sm,
                  fontSize: 14,
                  color: colors.burgundy[400],
                  textAlign: 'center',
                }}
              >
                {t('wishlists.currentlyIn', { name: currentWishlist.name })}
              </Text>
            )}
          </View>
        </View>
      )}
    </>
  );
}
