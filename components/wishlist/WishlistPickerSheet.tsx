import { Modal, Pressable, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { useWishlists } from '../../hooks/useWishlists';

interface WishlistPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (wishlistId: string) => void;
  selectedWishlistId?: string; // Optional: highlight currently selected
  title?: string; // Optional: custom title (default: "Choose Wishlist")
  excludeWishlistId?: string; // Optional: exclude a wishlist (e.g., current one when moving)
}

export function WishlistPickerSheet({
  visible,
  onClose,
  onSelect,
  selectedWishlistId,
  title,
  excludeWishlistId,
}: WishlistPickerSheetProps) {
  const { t } = useTranslation();
  const { data: wishlists = [] } = useWishlists();

  // Filter out excluded wishlist if provided
  const filteredWishlists = excludeWishlistId
    ? wishlists.filter((w) => w.id !== excludeWishlistId)
    : wishlists;

  const handleSelect = (wishlistId: string) => {
    onSelect(wishlistId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
        onPress={onClose}
      >
        {/* Sheet */}
        <Pressable
          style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            paddingBottom: spacing.xl,
            maxHeight: '70%',
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View
            style={{
              alignItems: 'center',
              paddingTop: spacing.sm,
              paddingBottom: spacing.md,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: colors.burgundy[200],
                borderRadius: 2,
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.burgundy[900],
              }}
            >
              {title || t('wishlists.chooseWishlist')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.burgundy[400]}
              />
            </TouchableOpacity>
          </View>

          {/* Wishlist List */}
          <ScrollView style={{ paddingHorizontal: spacing.lg }}>
            {filteredWishlists.map((wishlist) => {
              const isSelected = selectedWishlistId === wishlist.id;
              return (
                <TouchableOpacity
                  key={wishlist.id}
                  onPress={() => handleSelect(wishlist.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    backgroundColor: isSelected
                      ? colors.burgundy[50]
                      : colors.cream[50],
                    borderRadius: borderRadius.md,
                    borderWidth: 2,
                    borderColor: isSelected
                      ? colors.burgundy[400]
                      : colors.gold[100],
                  }}
                >
                  {/* Emoji */}
                  <Text style={{ fontSize: 24, marginRight: spacing.md }}>
                    {wishlist.emoji || '📝'}
                  </Text>

                  {/* Name and default badge */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '500',
                          color: colors.burgundy[800],
                        }}
                      >
                        {wishlist.name}
                      </Text>
                      {wishlist.is_default && (
                        <View
                          style={{
                            backgroundColor: colors.gold[100],
                            paddingHorizontal: spacing.xs,
                            paddingVertical: 2,
                            borderRadius: borderRadius.sm,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '600',
                              color: colors.gold[700],
                              textTransform: 'uppercase',
                            }}
                          >
                            {t('wishlists.default')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Checkmark if selected */}
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color={colors.burgundy[400]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {filteredWishlists.length === 0 && (
              <View
                style={{
                  padding: spacing.lg,
                  alignItems: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name="clipboard-list-outline"
                  size={48}
                  color={colors.burgundy[300]}
                />
                <Text
                  style={{
                    marginTop: spacing.md,
                    fontSize: 16,
                    color: colors.burgundy[400],
                    textAlign: 'center',
                  }}
                >
                  {t('wishlists.noWishlists')}
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
