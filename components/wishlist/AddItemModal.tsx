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

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: {
    amazon_url: string;
    title: string;
    price?: number;
    priority: number;
  }) => Promise<void>;
}

export default function AddItemModal({ visible, onClose, onAdd }: AddItemModalProps) {
  const [amazonUrl, setAmazonUrl] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [priority, setPriority] = useState(3);
  const [loading, setLoading] = useState(false);

  const validateAmazonUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('amazon');
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    // Validation
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

    setLoading(true);
    try {
      await onAdd({
        amazon_url: amazonUrl.trim(),
        title: title.trim(),
        price: price ? parseFloat(price) : undefined,
        priority,
      });

      // Reset form
      setAmazonUrl('');
      setTitle('');
      setPrice('');
      setPriority(3);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add item. Please try again.');
      console.error('Error adding item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setAmazonUrl('');
    setTitle('');
    setPrice('');
    setPriority(3);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold">Add Wishlist Item</Text>
              <TouchableOpacity onPress={handleCancel}>
                <Text className="text-gray-500 text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Amazon URL Input */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">
                  Amazon URL *
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-base"
                  placeholder="https://www.amazon.com/..."
                  value={amazonUrl}
                  onChangeText={setAmazonUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  multiline
                />
                <Text className="text-gray-500 text-xs mt-1">
                  Paste the Amazon product link here
                </Text>
              </View>

              {/* Title Input */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">
                  Product Title *
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-base"
                  placeholder="Enter product name"
                  value={title}
                  onChangeText={setTitle}
                  multiline
                />
              </View>

              {/* Price Input */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">
                  Price (Optional)
                </Text>
                <View className="flex-row items-center border border-gray-300 rounded-lg">
                  <Text className="pl-3 text-gray-600 text-base">$</Text>
                  <TextInput
                    className="flex-1 p-3 text-base"
                    placeholder="0.00"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Priority Selector */}
              <View className="mb-6">
                <Text className="text-gray-700 font-semibold mb-2">
                  Priority
                </Text>
                <View className="flex-row justify-between">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setPriority(level)}
                      className={`flex-1 mx-1 py-3 rounded-lg border-2 ${
                        priority === level
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text
                        className={`text-center font-semibold ${
                          priority === level ? 'text-white' : 'text-gray-600'
                        }`}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text className="text-gray-500 text-xs mt-1 text-center">
                  1 = Low priority, 5 = High priority
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleCancel}
                  className="flex-1 bg-gray-200 rounded-lg py-4"
                  disabled={loading}
                >
                  <Text className="text-gray-700 text-center font-semibold text-base">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  className={`flex-1 rounded-lg py-4 ${
                    loading ? 'bg-blue-300' : 'bg-blue-500'
                  }`}
                  disabled={loading}
                >
                  <Text className="text-white text-center font-semibold text-base">
                    {loading ? 'Adding...' : 'Add Item'}
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
