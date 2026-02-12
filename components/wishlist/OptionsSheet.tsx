import { forwardRef, useImperativeHandle, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Share,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { formatItemPrice, getImagePlaceholder } from '@/utils/wishlist';
import StarRating from '@/components/ui/StarRating';
import { WishlistItem } from '@/types/database.types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;
const DRAG_THRESHOLD = 50; // Minimum drag distance to trigger close

interface OptionsSheetProps {
  onFavoriteToggle: (item: WishlistItem) => void;
  onPriorityChange: (itemId: string, priority: number) => void;
  onDelete: (itemId: string) => Promise<void>;
  isFavorite: (itemId: string) => boolean;
}

export interface OptionsSheetRef {
  open: (item: WishlistItem) => void;
  close: () => void;
}

export const OptionsSheet = forwardRef<OptionsSheetRef, OptionsSheetProps>(
  function OptionsSheet({ onFavoriteToggle, onPriorityChange, onDelete, isFavorite }, ref) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [item, setItem] = useState<WishlistItem | null>(null);

    // Animation values
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const dragY = useRef(new Animated.Value(0)).current;

    // Combined transform for sheet (base position + drag offset)
    const sheetTransform = Animated.add(sheetTranslateY, dragY);

    // Pan responder for drag-to-close
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to downward drags
          return gestureState.dy > 5;
        },
        onPanResponderMove: (_, gestureState) => {
          // Only allow dragging down (positive dy)
          if (gestureState.dy > 0) {
            dragY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > DRAG_THRESHOLD) {
            // Close the sheet
            closeWithAnimation();
          } else {
            // Snap back
            Animated.spring(dragY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }).start();
          }
        },
      })
    ).current;

    const openWithAnimation = useCallback(() => {
      setVisible(true);
      dragY.setValue(0);
      // Animate backdrop fade in and sheet slide up simultaneously
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    }, [backdropOpacity, sheetTranslateY, dragY]);

    const closeWithAnimation = useCallback(() => {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SHEET_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        dragY.setValue(0);
      });
    }, [backdropOpacity, sheetTranslateY, dragY]);

    useImperativeHandle(ref, () => ({
      open: (newItem: WishlistItem) => {
        setItem(newItem);
        // Reset animation values before opening
        sheetTranslateY.setValue(SHEET_HEIGHT);
        backdropOpacity.setValue(0);
        // Small delay to ensure state is set before animation
        setTimeout(() => openWithAnimation(), 10);
      },
      close: () => {
        closeWithAnimation();
      },
    }));

    const handleClose = useCallback(() => {
      closeWithAnimation();
    }, [closeWithAnimation]);

    const handlePriorityChange = useCallback(
      (newPriority: number) => {
        if (!item) return;
        setItem({ ...item, priority: newPriority });
        onPriorityChange(item.id, newPriority);
      },
      [item, onPriorityChange]
    );

    const handleFavorite = useCallback(() => {
      if (!item) return;
      onFavoriteToggle(item);
      handleClose();
    }, [item, onFavoriteToggle, handleClose]);

    const handleShare = useCallback(async () => {
      if (!item) return;
      try {
        let message = item.title;
        if (item.amazon_url) {
          message += `\n\n${item.amazon_url}`;
        }
        await Share.share({ message, title: item.title });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    }, [item]);

    const handleEdit = useCallback(() => {
      Alert.alert(
        t('common.edit'),
        'Edit feature coming soon. You can delete and re-add the item for now.',
        [{ text: t('common.ok') }]
      );
    }, [t]);

    const handleDelete = useCallback(() => {
      if (!item) return;
      Alert.alert(
        t('common.delete'),
        t('wishlist.card.confirmDelete'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await onDelete(item.id);
                handleClose();
              } catch (error) {
                Alert.alert(t('alerts.titles.error'), t('wishlist.failedToDelete'));
              }
            },
          },
        ]
      );
    }, [item, onDelete, t, handleClose]);

    if (!item) return null;

    const placeholder = getImagePlaceholder(item.item_type);
    const formattedPrice = formatItemPrice(item);
    const favorite = isFavorite(item.id);

    return (
      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={handleClose}
      >
        <View style={styles.container}>
          {/* Animated backdrop */}
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          >
            <Pressable style={styles.backdropPressable} onPress={handleClose} />
          </Animated.View>

          {/* Animated sheet */}
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: sheetTransform }] },
            ]}
          >
            {/* Drag handle */}
            <View {...panResponder.panHandlers} style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Item Preview Section */}
            <View style={styles.previewSection}>
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.image}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              ) : (
                <View
                  style={[
                    styles.imagePlaceholder,
                    { backgroundColor: placeholder.backgroundColor },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={placeholder.iconName}
                    size={32}
                    color={placeholder.iconColor}
                  />
                </View>
              )}

              <View style={styles.previewText}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                {formattedPrice && (
                  <Text style={styles.price}>{formattedPrice}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Priority Section */}
            <View style={styles.prioritySection}>
              <Text style={styles.priorityLabel}>
                {t('wishlist.itemPriority')}
              </Text>
              <StarRating
                rating={item.priority}
                onRatingChange={handlePriorityChange}
                size={28}
              />
            </View>

            <View style={styles.divider} />

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={handleFavorite}
              >
                <MaterialCommunityIcons
                  name={favorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={favorite ? colors.burgundy[600] : colors.burgundy[400]}
                />
                <Text style={styles.actionText}>
                  {favorite
                    ? t('wishlist.favorite.removeFavorite')
                    : t('wishlist.favorite.markFavorite')}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={handleShare}
              >
                <MaterialCommunityIcons
                  name="share-variant"
                  size={24}
                  color={colors.burgundy[400]}
                />
                <Text style={styles.actionText}>{t('common.share')}</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={handleEdit}
              >
                <MaterialCommunityIcons
                  name="pencil"
                  size={24}
                  color={colors.burgundy[400]}
                />
                <Text style={styles.actionText}>{t('common.edit')}</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={handleDelete}
              >
                <MaterialCommunityIcons
                  name="delete"
                  size={24}
                  color={colors.error}
                />
                <Text style={[styles.actionText, styles.deleteText]}>
                  {t('common.delete')}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.cream[50],
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: 40,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: colors.burgundy[300],
    borderRadius: 2.5,
  },
  previewSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.burgundy[900],
    marginBottom: spacing.xs,
  },
  price: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gold[600],
  },
  divider: {
    height: 1,
    backgroundColor: colors.cream[200],
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  prioritySection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  priorityLabel: {
    fontSize: 12,
    color: colors.burgundy[600],
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  actionsSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionButtonPressed: {
    backgroundColor: colors.cream[100],
  },
  actionText: {
    fontSize: 16,
    color: colors.burgundy[700],
    fontWeight: '500',
  },
  deleteText: {
    color: colors.error,
  },
});
