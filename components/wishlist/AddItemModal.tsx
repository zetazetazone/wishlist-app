import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import StarRating from '../ui/StarRating';

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: {
    source_url: string | null;
    title: string;
    price?: number;
    priority: number;
    item_type: 'standard';
  }) => Promise<void>;
}

export default function AddItemModal({ visible, onClose, onAdd }: AddItemModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [amazonUrl, setAmazonUrl] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [priority, setPriority] = useState(3);
  const [loading, setLoading] = useState(false);

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    // Validation for standard items
    if (!amazonUrl.trim()) {
      Alert.alert(t('alerts.titles.error'), t('wishlist.form.enterProductUrl'));
      return;
    }

    if (!validateUrl(amazonUrl)) {
      Alert.alert(t('alerts.titles.error'), t('wishlist.errors.invalidUrl'));
      return;
    }

    if (!title.trim()) {
      Alert.alert(t('alerts.titles.error'), t('wishlist.errors.titleRequired'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        source_url: amazonUrl.trim(),
        title: title.trim(),
        price: price ? parseFloat(price) : undefined,
        priority,
        item_type: 'standard' as const,
      };

      await onAdd(payload);

      // Reset form
      resetForm();
      onClose();
    } catch (error) {
      Alert.alert(t('alerts.titles.error'), t('wishlist.form.failedToAdd'));
      console.error('Error adding item:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmazonUrl('');
    setTitle('');
    setPrice('');
    setPriority(3);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleAddFromUrl = () => {
    onClose();
    router.push('/add-from-url');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
        >
          <View
            style={{
              backgroundColor: colors.cream[50],
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: spacing.xl,
              maxHeight: '90%',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '700',
                  color: colors.burgundy[800],
                }}
              >
                {t('wishlist.form.addGift')}
              </Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.burgundy[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.burgundy[700]}
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Quick Add from URL button */}
              <TouchableOpacity
                onPress={handleAddFromUrl}
                activeOpacity={0.7}
                style={{
                  backgroundColor: colors.gold[100],
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                  marginBottom: spacing.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.gold[300],
                  ...shadows.sm,
                }}
              >
                <MaterialCommunityIcons
                  name="link-variant"
                  size={24}
                  color={colors.gold[700]}
                  style={{ marginRight: spacing.sm }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.gold[800],
                  }}
                >
                  {t('addFromUrl.quickAddButton', { defaultValue: 'Add from URL (Auto-fill)' })}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: spacing.lg,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: colors.burgundy[200],
                  }}
                />
                <Text
                  style={{
                    marginHorizontal: spacing.md,
                    fontSize: 14,
                    color: colors.burgundy[400],
                    fontWeight: '600',
                  }}
                >
                  {t('common.or', { defaultValue: 'or' })}
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: colors.burgundy[200],
                  }}
                />
              </View>

              {/* Product URL Input */}
                  <View style={{ marginBottom: spacing.md }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.burgundy[700],
                        marginBottom: spacing.xs,
                      }}
                    >
                      {t('wishlist.form.productUrl')} *
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.white,
                        borderRadius: borderRadius.md,
                        padding: spacing.md,
                        borderWidth: 2,
                        borderColor: colors.gold[200],
                        ...shadows.sm,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="link-variant"
                        size={20}
                        color={colors.gold[600]}
                        style={{ marginRight: spacing.sm }}
                      />
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 15,
                          color: colors.burgundy[900],
                          paddingVertical: 0,
                        }}
                        placeholder={t('wishlist.form.pasteProductLink')}
                        placeholderTextColor={colors.cream[400]}
                        value={amazonUrl}
                        onChangeText={setAmazonUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        multiline
                      />
                    </View>
                  </View>

                  {/* Title Input */}
                  <View style={{ marginBottom: spacing.md }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.burgundy[700],
                        marginBottom: spacing.xs,
                      }}
                    >
                      {t('wishlist.form.productTitle')} *
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.white,
                        borderRadius: borderRadius.md,
                        padding: spacing.md,
                        borderWidth: 2,
                        borderColor: colors.gold[200],
                        ...shadows.sm,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="gift-outline"
                        size={20}
                        color={colors.gold[600]}
                        style={{ marginRight: spacing.sm }}
                      />
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 15,
                          color: colors.burgundy[900],
                          paddingVertical: 0,
                        }}
                        placeholder={t('wishlist.form.enterProductName')}
                        placeholderTextColor={colors.cream[400]}
                        value={title}
                        onChangeText={setTitle}
                        multiline
                      />
                    </View>
                  </View>

                  {/* Price and Priority Row */}
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.md,
                      marginBottom: spacing.lg,
                    }}
                  >
                    {/* Price Input */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: colors.burgundy[700],
                          marginBottom: spacing.xs,
                        }}
                      >
                        {t('wishlist.form.priceOptional')}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: colors.white,
                          borderRadius: borderRadius.md,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.md,
                          borderWidth: 2,
                          borderColor: colors.gold[200],
                          ...shadows.sm,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: '600',
                            color: colors.gold[600],
                            marginRight: spacing.xs,
                          }}
                        >
                          €
                        </Text>
                        <TextInput
                          style={{
                            flex: 1,
                            fontSize: 15,
                            color: colors.burgundy[900],
                            paddingVertical: 0,
                          }}
                          placeholder="0"
                          placeholderTextColor={colors.cream[400]}
                          value={price}
                          onChangeText={setPrice}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>

                    {/* Priority Stars */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: colors.burgundy[700],
                          marginBottom: spacing.xs,
                        }}
                      >
                        {t('wishlist.itemPriority')}
                      </Text>
                      <View
                        style={{
                          backgroundColor: colors.white,
                          borderRadius: borderRadius.md,
                          padding: spacing.sm,
                          borderWidth: 2,
                          borderColor: colors.gold[200],
                          ...shadows.sm,
                          justifyContent: 'center',
                          alignItems: 'center',
                          minHeight: 52,
                        }}
                      >
                        <StarRating
                          rating={priority}
                          onRatingChange={setPriority}
                          size={24}
                        />
                      </View>
                    </View>
                  </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={{
                    flex: 1,
                    backgroundColor: colors.cream[300],
                    borderRadius: borderRadius.lg,
                    paddingVertical: spacing.md + spacing.xs,
                    alignItems: 'center',
                  }}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: colors.burgundy[800],
                      fontSize: 16,
                      fontWeight: '600',
                    }}
                  >
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  style={{
                    flex: 1,
                    backgroundColor: loading ? colors.burgundy[400] : colors.burgundy[700],
                    borderRadius: borderRadius.lg,
                    paddingVertical: spacing.md + spacing.xs,
                    alignItems: 'center',
                    ...shadows.md,
                  }}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      color: colors.white,
                      fontSize: 16,
                      fontWeight: '700',
                    }}
                  >
                    {loading ? t('wishlist.form.adding') : t('wishlist.form.addToWishlist')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
