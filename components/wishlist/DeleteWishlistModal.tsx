import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { useDeleteWishlist } from '../../hooks/useWishlists';
import { Wishlist } from '../../lib/wishlists';
import { supabase } from '../../lib/supabase';

interface DeleteWishlistModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  wishlist: Wishlist | null;
}

export function DeleteWishlistModal({
  visible,
  onClose,
  onSuccess,
  wishlist,
}: DeleteWishlistModalProps) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteWishlist();
  const [error, setError] = useState<string | null>(null);

  // Fetch item count for this wishlist
  const { data: itemCount = 0 } = useQuery({
    queryKey: ['wishlist-item-count', wishlist?.id],
    queryFn: async () => {
      if (!wishlist?.id) return 0;

      const { count, error } = await supabase
        .from('wishlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('wishlist_id', wishlist.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!wishlist?.id && visible,
  });

  const handleDelete = async () => {
    if (!wishlist) return;

    // Prevent deletion of default wishlist
    if (wishlist.is_default) {
      setError(t('wishlists.cannotDeleteDefault'));
      return;
    }

    setError(null);

    try {
      await deleteMutation.mutateAsync(wishlist.id);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || t('common.errors.generic'));
    }
  };

  const isDeleting = deleteMutation.isPending;

  if (!wishlist) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View style={styles.modalContainer}>
          {/* Warning Icon */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="delete-alert"
              size={48}
              color={colors.error}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('wishlists.deleteConfirmTitle')}</Text>

          {/* Message */}
          <Text style={styles.message}>
            {t('wishlists.deleteConfirmMessage', { name: wishlist.name })}
          </Text>

          {/* Item Count Warning */}
          {itemCount > 0 && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                {t('wishlists.deleteItemWarning', { count: itemCount })}
              </Text>
              <Text style={styles.warningSubtext}>
                {t('wishlists.itemsWillMove')}
              </Text>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onClose}
              disabled={isDeleting}
            >
              <Text style={styles.buttonSecondaryText}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.buttonDangerText}>{t('common.delete')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.lg,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.burgundy[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 16,
    color: colors.burgundy[700],
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: spacing.lg,
  },
  warningText: {
    fontSize: 14,
    color: colors.burgundy[900],
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  warningSubtext: {
    fontSize: 13,
    color: colors.burgundy[700],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cream[300],
  },
  buttonSecondaryText: {
    color: colors.burgundy[700],
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDanger: {
    backgroundColor: colors.error,
    ...shadows.sm,
  },
  buttonDangerText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
