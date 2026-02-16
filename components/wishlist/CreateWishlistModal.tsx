import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../providers/AuthProvider';
import { useCreateWishlist, useUpdateWishlist } from '../../hooks/useWishlists';
import { Wishlist } from '../../lib/wishlists';
import { EmojiPickerModal } from './EmojiPickerModal';

interface CreateWishlistModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingWishlist?: Wishlist | null;
}

const MAX_NAME_LENGTH = 50;
const DEFAULT_EMOJI = '📋';

export function CreateWishlistModal({
  visible,
  onClose,
  onSuccess,
  editingWishlist,
}: CreateWishlistModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const createMutation = useCreateWishlist();
  const updateMutation = useUpdateWishlist();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editingWishlist;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Initialize form when modal opens or editing wishlist changes
  useEffect(() => {
    if (visible) {
      if (editingWishlist) {
        setName(editingWishlist.name);
        setEmoji(editingWishlist.emoji || DEFAULT_EMOJI);
      } else {
        setName('');
        setEmoji(DEFAULT_EMOJI);
      }
      setError(null);
    }
  }, [visible, editingWishlist]);

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setError(t('wishlists.nameRequired'));
      return;
    }

    if (name.length > MAX_NAME_LENGTH) {
      setError(t('wishlists.nameTooLong'));
      return;
    }

    if (!user) {
      setError(t('wishlist.mustBeLoggedIn'));
      return;
    }

    setError(null);

    try {
      if (isEditMode && editingWishlist) {
        // Update existing wishlist
        await updateMutation.mutateAsync({
          id: editingWishlist.id,
          updates: {
            name: name.trim(),
            emoji,
          },
        });
      } else {
        // Create new wishlist
        await createMutation.mutateAsync({
          user_id: user.id,
          name: name.trim(),
          emoji,
          is_default: false,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || t('common.errors.generic'));
    }
  };

  const handleEmojiSelect = (selectedEmoji: string) => {
    setEmoji(selectedEmoji);
  };

  const characterCount = name.length;
  const isNameValid = name.trim().length > 0 && name.length <= MAX_NAME_LENGTH;
  const canSubmit = isNameValid && !isSubmitting;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.backdrop}>
            <Pressable style={styles.backdropPress} onPress={onClose} />
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  {isEditMode ? t('wishlists.editWishlist') : t('wishlists.createWishlist')}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.burgundy[600]} />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View style={styles.form}>
                {/* Emoji Selector */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('wishlists.chooseEmoji')}</Text>
                  <TouchableOpacity
                    style={styles.emojiButton}
                    onPress={() => setShowEmojiPicker(true)}
                  >
                    <Text style={styles.emojiButtonText}>{emoji}</Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={24}
                      color={colors.burgundy[600]}
                    />
                  </TouchableOpacity>
                </View>

                {/* Name Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('wishlists.wishlistName')}</Text>
                  <TextInput
                    style={[styles.input, !isNameValid && name.length > 0 && styles.inputError]}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('wishlists.wishlistNamePlaceholder')}
                    placeholderTextColor={colors.cream[500]}
                    maxLength={MAX_NAME_LENGTH}
                    autoFocus={!isEditMode}
                    editable={!isSubmitting}
                  />
                  <Text
                    style={[
                      styles.characterCount,
                      characterCount > MAX_NAME_LENGTH && styles.characterCountError,
                    ]}
                  >
                    {characterCount}/{MAX_NAME_LENGTH}
                  </Text>
                </View>

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={onClose}
                  disabled={isSubmitting}
                >
                  <Text style={styles.buttonSecondaryText}>{t('common.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.buttonPrimary,
                    !canSubmit && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.buttonPrimaryText}>
                      {isEditMode ? t('common.save') : t('wishlists.createWishlist')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Emoji Picker Modal */}
      <EmojiPickerModal
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={handleEmojiSelect}
        selectedEmoji={emoji}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    ...shadows.lg,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.burgundy[900],
  },
  closeButton: {
    padding: spacing.xs,
  },
  form: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.burgundy[800],
    marginBottom: spacing.sm,
  },
  emojiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.cream[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cream[300],
  },
  emojiButtonText: {
    fontSize: 32,
  },
  input: {
    padding: spacing.md,
    backgroundColor: colors.cream[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cream[300],
    fontSize: 16,
    color: colors.burgundy[900],
  },
  inputError: {
    borderColor: colors.error,
  },
  characterCount: {
    fontSize: 12,
    color: colors.cream[600],
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  characterCountError: {
    color: colors.error,
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
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cream[200],
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
  buttonPrimary: {
    backgroundColor: colors.burgundy[600],
    ...shadows.sm,
  },
  buttonPrimaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
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
  buttonDisabled: {
    backgroundColor: colors.cream[400],
  },
});
