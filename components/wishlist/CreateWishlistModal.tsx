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
  ScrollView,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { useAuth } from '../../providers/AuthProvider';
import { useCreateWishlist, useUpdateWishlist } from '../../hooks/useWishlists';
import { Wishlist, WishlistOwnerType, WishlistVisibility } from '../../lib/wishlists';
import { getFriends, FriendWithProfile } from '../../lib/friends';
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

  // New state for visibility and owner type
  const [visibility, setVisibility] = useState<WishlistVisibility>('public');
  const [ownerType, setOwnerType] = useState<WishlistOwnerType>('self');
  const [forName, setForName] = useState('');
  const [forUserId, setForUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const isEditMode = !!editingWishlist;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Initialize form when modal opens or editing wishlist changes
  useEffect(() => {
    if (visible) {
      if (editingWishlist) {
        setName(editingWishlist.name);
        setEmoji(editingWishlist.emoji || DEFAULT_EMOJI);
        setVisibility((editingWishlist.visibility as WishlistVisibility) || 'public');
        setOwnerType((editingWishlist.owner_type as WishlistOwnerType) || 'self');
        setForName(editingWishlist.for_name || '');
        setForUserId(editingWishlist.for_user_id || null);
      } else {
        setName('');
        setEmoji(DEFAULT_EMOJI);
        setVisibility('public');
        setOwnerType('self');
        setForName('');
        setForUserId(null);
      }
      setError(null);
    }
  }, [visible, editingWishlist]);

  // Load friends when owner type is 'other_user'
  useEffect(() => {
    if (visible && ownerType === 'other_user' && friends.length === 0) {
      setLoadingFriends(true);
      getFriends()
        .then(setFriends)
        .catch((err) => {
          console.error('Failed to load friends:', err);
        })
        .finally(() => setLoadingFriends(false));
    }
  }, [visible, ownerType, friends.length]);

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

    // Validate owner type specific fields
    if (ownerType === 'other_manual' && !forName.trim()) {
      setError(t('wishlists.enterName'));
      return;
    }

    if (ownerType === 'other_user' && !forUserId) {
      setError(t('wishlists.selectFriend'));
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
            visibility,
            owner_type: ownerType,
            for_name: ownerType === 'other_manual' ? forName.trim() : null,
            for_user_id: ownerType === 'other_user' ? forUserId : null,
          },
        });
      } else {
        // Create new wishlist
        await createMutation.mutateAsync({
          user_id: user.id,
          name: name.trim(),
          emoji,
          visibility,
          owner_type: ownerType,
          for_name: ownerType === 'other_manual' ? forName.trim() : null,
          for_user_id: ownerType === 'other_user' ? forUserId : null,
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

  const renderVisibilityOption = (
    option: WishlistVisibility,
    icon: 'earth' | 'lock' | 'account-group',
    label: string
  ) => {
    const isSelected = visibility === option;
    return (
      <TouchableOpacity
        style={[
          styles.visibilityOption,
          isSelected && styles.visibilityOptionSelected,
        ]}
        onPress={() => setVisibility(option)}
        disabled={isSubmitting}
      >
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={isSelected ? colors.white : colors.burgundy[600]}
        />
        <Text
          style={[
            styles.visibilityOptionText,
            isSelected && styles.visibilityOptionTextSelected,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderOwnerTypeOption = (
    option: WishlistOwnerType,
    icon: 'account' | 'account-edit' | 'account-heart',
    label: string
  ) => {
    const isSelected = ownerType === option;
    return (
      <TouchableOpacity
        style={[
          styles.ownerTypeOption,
          isSelected && styles.ownerTypeOptionSelected,
        ]}
        onPress={() => setOwnerType(option)}
        disabled={isSubmitting}
      >
        <View style={styles.radioOuter}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={colors.burgundy[700]}
          style={styles.ownerTypeIcon}
        />
        <Text style={styles.ownerTypeText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderFriendPicker = () => {
    if (loadingFriends) {
      return (
        <View style={styles.friendPickerLoading}>
          <ActivityIndicator size="small" color={colors.burgundy[600]} />
        </View>
      );
    }

    if (friends.length === 0) {
      return (
        <View style={styles.noFriendsContainer}>
          <MaterialCommunityIcons
            name="account-group-outline"
            size={24}
            color={colors.cream[500]}
          />
          <Text style={styles.noFriendsText}>{t('wishlists.noFriendsYet')}</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.friendList}
        contentContainerStyle={styles.friendListContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {friends.map((friend) => {
          const isSelected = forUserId === friend.friend_user_id;
          return (
            <TouchableOpacity
              key={friend.id}
              style={[
                styles.friendItem,
                isSelected && styles.friendItemSelected,
              ]}
              onPress={() => setForUserId(friend.friend_user_id)}
              disabled={isSubmitting}
            >
              {friend.friend?.avatar_url ? (
                <Image
                  source={{ uri: friend.friend.avatar_url }}
                  style={styles.friendAvatar}
                />
              ) : (
                <View style={styles.friendAvatarPlaceholder}>
                  <MaterialCommunityIcons
                    name="account"
                    size={18}
                    color={colors.cream[500]}
                  />
                </View>
              )}
              <Text style={styles.friendName} numberOfLines={1}>
                {friend.friend?.display_name || t('profile.unknownUser')}
              </Text>
              {isSelected && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={colors.burgundy[600]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

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

              {/* Form - wrapped in ScrollView for smaller screens */}
              <ScrollView
                style={styles.formScrollView}
                contentContainerStyle={styles.form}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
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

                {/* Visibility Selector */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('wishlists.visibility')}</Text>
                  <View style={styles.visibilityContainer}>
                    {renderVisibilityOption('public', 'earth', t('wishlists.public'))}
                    {renderVisibilityOption('private', 'lock', t('wishlists.private'))}
                    {renderVisibilityOption('friends', 'account-group', t('wishlists.friendsOnly'))}
                  </View>
                </View>

                {/* Owner Type Selector */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>{t('wishlists.ownerType')}</Text>
                  <View style={styles.ownerTypeContainer}>
                    {renderOwnerTypeOption('self', 'account', t('wishlists.forMyself'))}
                    {renderOwnerTypeOption('other_manual', 'account-edit', t('wishlists.forOther'))}
                    {renderOwnerTypeOption('other_user', 'account-heart', t('wishlists.forFriend'))}
                  </View>
                </View>

                {/* Conditional: Name input for 'other_manual' */}
                {ownerType === 'other_manual' && (
                  <View style={styles.formGroup}>
                    <TextInput
                      style={styles.input}
                      value={forName}
                      onChangeText={setForName}
                      placeholder={t('wishlists.enterName')}
                      placeholderTextColor={colors.cream[500]}
                      editable={!isSubmitting}
                    />
                  </View>
                )}

                {/* Conditional: Friend picker for 'other_user' */}
                {ownerType === 'other_user' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.subLabel}>{t('wishlists.selectFriend')}</Text>
                    {renderFriendPicker()}
                  </View>
                )}

                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </ScrollView>

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
    maxHeight: '90%',
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
  formScrollView: {
    maxHeight: 400,
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
  subLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.burgundy[600],
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
  // Visibility selector styles
  visibilityContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cream[300],
    backgroundColor: colors.cream[50],
  },
  visibilityOptionSelected: {
    backgroundColor: colors.burgundy[600],
    borderColor: colors.burgundy[600],
  },
  visibilityOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.burgundy[700],
  },
  visibilityOptionTextSelected: {
    color: colors.white,
  },
  // Owner type selector styles
  ownerTypeContainer: {
    gap: spacing.sm,
  },
  ownerTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cream[300],
    backgroundColor: colors.cream[50],
  },
  ownerTypeOptionSelected: {
    borderColor: colors.burgundy[400],
    backgroundColor: colors.burgundy[50],
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.burgundy[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.burgundy[600],
  },
  ownerTypeIcon: {
    marginRight: spacing.sm,
  },
  ownerTypeText: {
    fontSize: 14,
    color: colors.burgundy[800],
    flex: 1,
  },
  // Friend picker styles
  friendPickerLoading: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noFriendsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.cream[100],
    borderRadius: borderRadius.md,
  },
  noFriendsText: {
    fontSize: 14,
    color: colors.cream[600],
  },
  friendList: {
    maxHeight: 150,
  },
  friendListContent: {
    gap: spacing.sm,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cream[300],
    backgroundColor: colors.cream[50],
  },
  friendItemSelected: {
    borderColor: colors.burgundy[400],
    backgroundColor: colors.burgundy[50],
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm,
  },
  friendAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  friendName: {
    flex: 1,
    fontSize: 14,
    color: colors.burgundy[800],
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
