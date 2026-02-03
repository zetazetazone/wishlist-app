import { useState, useEffect } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import StarRating from '../ui/StarRating';

type ItemType = 'standard' | 'surprise_me' | 'mystery_box';
type MysteryBoxTier = 25 | 50 | 100;

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: {
    amazon_url: string;
    title: string;
    price?: number;
    priority: number;
    item_type: ItemType;
    mystery_box_tier?: MysteryBoxTier | null;
    surprise_me_budget?: number | null;
  }) => Promise<void>;
}

export default function AddItemModal({ visible, onClose, onAdd }: AddItemModalProps) {
  const [amazonUrl, setAmazonUrl] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [priority, setPriority] = useState(3);
  const [loading, setLoading] = useState(false);

  // New state for item types
  const [itemType, setItemType] = useState<ItemType>('standard');
  const [selectedTier, setSelectedTier] = useState<MysteryBoxTier | null>(null);
  const [budget, setBudget] = useState('');

  // Reset type-specific fields when itemType changes
  useEffect(() => {
    if (itemType !== 'mystery_box') {
      setSelectedTier(null);
    }
    if (itemType !== 'surprise_me') {
      setBudget('');
    }
  }, [itemType]);

  const validateAmazonUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('amazon');
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    // Validation based on item type
    if (itemType === 'standard') {
      if (!amazonUrl.trim()) {
        Alert.alert('Error', 'Please enter an Amazon URL');
        return;
      }

      if (!validateAmazonUrl(amazonUrl)) {
        Alert.alert('Error', 'Please enter a valid Amazon URL');
        return;
      }

      if (!title.trim()) {
        Alert.alert('Error', 'Please enter a product title');
        return;
      }
    } else if (itemType === 'mystery_box') {
      if (!selectedTier) {
        Alert.alert('Error', 'Please select a Mystery Box tier');
        return;
      }
    }
    // Surprise Me has no required fields

    setLoading(true);
    try {
      // Build payload based on item type
      let payload: {
        amazon_url: string;
        title: string;
        price?: number;
        priority: number;
        item_type: ItemType;
        mystery_box_tier?: MysteryBoxTier | null;
        surprise_me_budget?: number | null;
      };

      if (itemType === 'standard') {
        payload = {
          amazon_url: amazonUrl.trim(),
          title: title.trim(),
          price: price ? parseFloat(price) : undefined,
          priority,
          item_type: 'standard',
        };
      } else if (itemType === 'surprise_me') {
        payload = {
          amazon_url: '',
          title: 'Surprise Me!',
          priority: 3,
          item_type: 'surprise_me',
          surprise_me_budget: budget ? parseFloat(budget) : null,
        };
      } else {
        // mystery_box
        payload = {
          amazon_url: '',
          title: `€${selectedTier} Mystery Box`,
          price: selectedTier!,
          priority: 3,
          item_type: 'mystery_box',
          mystery_box_tier: selectedTier,
        };
      }

      await onAdd(payload);

      // Reset form
      resetForm();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
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
    setItemType('standard');
    setSelectedTier(null);
    setBudget('');
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const getHeaderTitle = () => {
    switch (itemType) {
      case 'surprise_me':
        return 'Add Surprise Me';
      case 'mystery_box':
        return 'Add Mystery Box';
      default:
        return 'Add a Gift';
    }
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
                {getHeaderTitle()}
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
              {/* Type Selector */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  marginBottom: spacing.lg,
                }}
              >
                {/* Gift Button */}
                <TouchableOpacity
                  onPress={() => setItemType('standard')}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: borderRadius.md,
                    alignItems: 'center',
                    backgroundColor:
                      itemType === 'standard'
                        ? colors.burgundy[700]
                        : colors.cream[100],
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="gift-outline"
                    size={24}
                    color={
                      itemType === 'standard'
                        ? colors.white
                        : colors.burgundy[600]
                    }
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      marginTop: spacing.xs,
                      color:
                        itemType === 'standard'
                          ? colors.white
                          : colors.burgundy[600],
                    }}
                  >
                    Gift
                  </Text>
                </TouchableOpacity>

                {/* Surprise Me Button */}
                <TouchableOpacity
                  onPress={() => setItemType('surprise_me')}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: borderRadius.md,
                    alignItems: 'center',
                    backgroundColor:
                      itemType === 'surprise_me'
                        ? colors.burgundy[700]
                        : colors.cream[100],
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="help-circle-outline"
                    size={24}
                    color={
                      itemType === 'surprise_me'
                        ? colors.white
                        : colors.burgundy[600]
                    }
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      marginTop: spacing.xs,
                      color:
                        itemType === 'surprise_me'
                          ? colors.white
                          : colors.burgundy[600],
                    }}
                  >
                    Surprise
                  </Text>
                </TouchableOpacity>

                {/* Mystery Box Button */}
                <TouchableOpacity
                  onPress={() => setItemType('mystery_box')}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: borderRadius.md,
                    alignItems: 'center',
                    backgroundColor:
                      itemType === 'mystery_box'
                        ? colors.burgundy[700]
                        : colors.cream[100],
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="gift"
                    size={24}
                    color={
                      itemType === 'mystery_box'
                        ? colors.white
                        : colors.burgundy[600]
                    }
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      marginTop: spacing.xs,
                      color:
                        itemType === 'mystery_box'
                          ? colors.white
                          : colors.burgundy[600],
                    }}
                  >
                    Mystery
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Conditional Form Fields */}
              {itemType === 'standard' && (
                <>
                  {/* Amazon URL Input */}
                  <View style={{ marginBottom: spacing.md }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.burgundy[700],
                        marginBottom: spacing.xs,
                      }}
                    >
                      Amazon URL *
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
                        placeholder="Paste Amazon link..."
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
                      Product Title *
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
                        placeholder="Enter product name..."
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
                        Price (Optional)
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
                        Priority
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
                </>
              )}

              {itemType === 'surprise_me' && (
                <>
                  {/* Helper Text */}
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.burgundy[600],
                      marginBottom: spacing.md,
                      textAlign: 'center',
                    }}
                  >
                    Let your group know you're open to any gift!
                  </Text>

                  {/* Budget Input (Optional) */}
                  <View style={{ marginBottom: spacing.lg }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: colors.burgundy[700],
                        marginBottom: spacing.xs,
                      }}
                    >
                      Budget (Optional)
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
                        placeholder="Max budget..."
                        placeholderTextColor={colors.cream[400]}
                        value={budget}
                        onChangeText={setBudget}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </>
              )}

              {itemType === 'mystery_box' && (
                <>
                  {/* Helper Text */}
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.burgundy[600],
                      marginBottom: spacing.md,
                      textAlign: 'center',
                    }}
                  >
                    Select a Mystery Box tier
                  </Text>

                  {/* Tier Selector */}
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.sm,
                      marginBottom: spacing.lg,
                    }}
                  >
                    {([25, 50, 100] as MysteryBoxTier[]).map((tier) => (
                      <TouchableOpacity
                        key={tier}
                        onPress={() => setSelectedTier(tier)}
                        style={{
                          flex: 1,
                          paddingVertical: spacing.md,
                          borderRadius: borderRadius.md,
                          alignItems: 'center',
                          backgroundColor:
                            selectedTier === tier
                              ? colors.burgundy[700]
                              : colors.cream[100],
                          borderWidth: 2,
                          borderColor:
                            selectedTier === tier
                              ? colors.burgundy[700]
                              : colors.gold[200],
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: '700',
                            color:
                              selectedTier === tier
                                ? colors.white
                                : colors.burgundy[700],
                          }}
                        >
                          €{tier}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

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
                    Cancel
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
                    {loading ? 'Adding...' : 'Add to Wishlist'}
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
