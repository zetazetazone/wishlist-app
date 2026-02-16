import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import StarRating from '../ui/StarRating';

interface AddItemBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: {
    source_url: string;
    title: string;
    price?: number;
    priority: number;
  }) => Promise<void>;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

export default function AddItemBottomSheet({
  visible,
  onClose,
  onAdd,
}: AddItemBottomSheetProps) {
  const { t } = useTranslation();
  const [amazonUrl, setAmazonUrl] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [priority, setPriority] = useState(3);
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [titleError, setTitleError] = useState('');

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const titleInputRef = useRef<TextInput>(null);

  // Validate URL in real-time
  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('');
      return false;
    }
    try {
      const urlObj = new URL(url);
      const isValid = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      setUrlError(isValid ? '' : t('wishlist.errors.invalidUrl'));
      return isValid;
    } catch {
      setUrlError(t('wishlist.errors.invalidUrl'));
      return false;
    }
  };

  // Validate title in real-time
  const validateTitle = (text: string) => {
    if (text.trim().length > 0) {
      setTitleError('');
    }
  };

  // Pan responder for swipe down gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return gesture.dy > 5; // Only respond to downward swipes
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleSubmit = async () => {
    // Validation
    if (!amazonUrl.trim()) {
      setUrlError(t('wishlist.form.pasteProductLink'));
      return;
    }

    if (!validateUrl(amazonUrl)) {
      return;
    }

    if (!title.trim()) {
      setTitleError(t('wishlist.form.enterProductName'));
      return;
    }

    setLoading(true);
    try {
      await onAdd({
        source_url: amazonUrl.trim(),
        title: title.trim(),
        price: price ? parseFloat(price) : undefined,
        priority,
      });

      // Reset form
      resetForm();
      handleClose();
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
    setUrlError('');
    setTitleError('');
  };

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      resetForm();
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={handleClose}
          />

          <Animated.View
            style={{
              transform: [{ translateY }],
            }}
            className="bg-white rounded-t-3xl"
          >
            {/* Drag Handle */}
            <View {...panResponder.panHandlers} className="items-center pt-3 pb-2">
              <View className="w-12 h-1 bg-gray-300 rounded-full" />
            </View>

            <View className="px-6 pb-8">
              {/* Header */}
              <Text className="text-2xl font-bold text-gray-900 mb-6">
                {t('wishlist.form.addToWishlist')}
              </Text>

              {/* Product URL Input */}
              <View className="mb-4">
                <View className="flex-row items-center border-2 border-gray-200 rounded-xl p-4 focus:border-blue-500">
                  <Text className="text-xl mr-2">🔗</Text>
                  <TextInput
                    className="flex-1 text-base text-gray-900"
                    placeholder={t('wishlist.form.pasteProductLink')}
                    placeholderTextColor="#9ca3af"
                    value={amazonUrl}
                    onChangeText={(text) => {
                      setAmazonUrl(text);
                      validateUrl(text);
                    }}
                    onSubmitEditing={() => titleInputRef.current?.focus()}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="next"
                    autoFocus
                  />
                </View>
                {urlError ? (
                  <Text className="text-red-500 text-sm mt-1 ml-1">
                    ⚠️ {urlError}
                  </Text>
                ) : null}
              </View>

              {/* Title Input */}
              <View className="mb-4">
                <View className="flex-row items-center border-2 border-gray-200 rounded-xl p-4 focus:border-blue-500">
                  <Text className="text-xl mr-2">📝</Text>
                  <TextInput
                    ref={titleInputRef}
                    className="flex-1 text-base text-gray-900"
                    placeholder={t('wishlist.form.productName')}
                    placeholderTextColor="#9ca3af"
                    value={title}
                    onChangeText={(text) => {
                      setTitle(text);
                      validateTitle(text);
                    }}
                    returnKeyType="done"
                  />
                </View>
                {titleError ? (
                  <Text className="text-red-500 text-sm mt-1 ml-1">
                    ⚠️ {titleError}
                  </Text>
                ) : null}
              </View>

              {/* Price and Priority Row */}
              <View className="flex-row items-center justify-between mb-6">
                {/* Price Input */}
                <View className="flex-row items-center border-2 border-gray-200 rounded-xl px-4 py-3 w-28">
                  <Text className="text-gray-600 text-base font-semibold mr-1">$</Text>
                  <TextInput
                    className="flex-1 text-base text-gray-900"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Priority Stars */}
                <View className="flex-1 ml-4">
                  <Text className="text-gray-600 text-sm mb-1">{t('wishlist.itemPriority')}</Text>
                  <StarRating
                    rating={priority}
                    onRatingChange={setPriority}
                    size={28}
                  />
                </View>
              </View>

              {/* Add Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                className={`rounded-xl py-4 ${
                  loading ? 'bg-blue-300' : 'bg-blue-500'
                }`}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {loading ? t('wishlist.form.adding') : t('wishlist.form.addToWishlist')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
