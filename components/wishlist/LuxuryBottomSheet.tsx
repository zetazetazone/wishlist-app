import { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { useState } from 'react';
import StarRating from '../ui/StarRating';

interface LuxuryBottomSheetProps {
  onAdd: (item: {
    amazon_url: string;
    title: string;
    price?: number;
    priority: number;
  }) => Promise<void>;
}

export interface LuxuryBottomSheetRef {
  open: () => void;
  close: () => void;
}

export default forwardRef<LuxuryBottomSheetRef, LuxuryBottomSheetProps>(
  function LuxuryBottomSheet({ onAdd }, ref) {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [amazonUrl, setAmazonUrl] = useState('');
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [priority, setPriority] = useState(3);
    const [loading, setLoading] = useState(false);

    const snapPoints = ['70%'];

    useImperativeHandle(ref, () => ({
      open: () => {
        console.log('LuxuryBottomSheet: open() called');
        console.log('bottomSheetRef.current:', bottomSheetRef.current);
        bottomSheetRef.current?.expand();
      },
      close: () => bottomSheetRef.current?.close(),
    }));

    const validateUrl = (url: string): boolean => {
      if (!url.trim()) return false;
      try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      } catch {
        return false;
      }
    };

    const handleSubmit = async () => {
      if (!amazonUrl.trim()) {
        Alert.alert('Missing URL', 'Please paste a product link');
        return;
      }

      if (!validateUrl(amazonUrl)) {
        Alert.alert('Invalid URL', 'Please enter a valid URL');
        return;
      }

      if (!title.trim()) {
        Alert.alert('Missing Title', 'Please enter a product name');
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
        bottomSheetRef.current?.close();
      } catch (error) {
        Alert.alert('Error', 'Failed to add item. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.7}
          pressBehavior="close"
        />
      ),
      []
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.cream[50],
          borderTopLeftRadius: borderRadius.xl,
          borderTopRightRadius: borderRadius.xl,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.burgundy[300],
          width: 48,
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, padding: spacing.lg }}>
            {/* Header */}
            <MotiView
              from={{ opacity: 0, translateY: -20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400 }}
            >
              <View style={{ marginBottom: spacing.lg }}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '700',
                    color: colors.burgundy[800],
                    marginBottom: spacing.xs,
                  }}
                >
                  Add a Gift
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: colors.burgundy[400],
                    fontWeight: '400',
                  }}
                >
                  Share what you're wishing for
                </Text>
              </View>
            </MotiView>

            {/* URL Input */}
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 100 }}
              style={{ marginBottom: spacing.md }}
            >
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
                  size={24}
                  color={colors.gold[600]}
                  style={{ marginRight: spacing.sm }}
                />
                <TextInput
                  placeholder="Paste product link..."
                  placeholderTextColor={colors.cream[400]}
                  value={amazonUrl}
                  onChangeText={setAmazonUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: colors.burgundy[900],
                  }}
                />
              </View>
            </MotiView>

            {/* Title Input */}
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 200 }}
              style={{ marginBottom: spacing.md }}
            >
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
                  name="card-text-outline"
                  size={24}
                  color={colors.gold[600]}
                  style={{ marginRight: spacing.sm }}
                />
                <TextInput
                  placeholder="Product name..."
                  placeholderTextColor={colors.cream[400]}
                  value={title}
                  onChangeText={setTitle}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: colors.burgundy[900],
                  }}
                />
              </View>
            </MotiView>

            {/* Price and Priority Row */}
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 300 }}
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                marginBottom: spacing.lg,
              }}
            >
              {/* Price */}
              <View
                style={{
                  flex: 1,
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
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: colors.gold[600],
                    marginRight: spacing.xs,
                  }}
                >
                  $
                </Text>
                <TextInput
                  placeholder="0"
                  placeholderTextColor={colors.cream[400]}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: colors.burgundy[900],
                  }}
                />
              </View>

              {/* Priority Stars */}
              <View style={{ flex: 1.5, justifyContent: 'center' }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.burgundy[600],
                    marginBottom: spacing.xs,
                    fontWeight: '600',
                  }}
                >
                  Priority
                </Text>
                <StarRating
                  rating={priority}
                  onRatingChange={setPriority}
                  size={28}
                />
              </View>
            </MotiView>

            {/* Submit Button */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 400 }}
            >
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={{
                  backgroundColor: colors.burgundy[700],
                  borderRadius: borderRadius.lg,
                  padding: spacing.md + spacing.xs,
                  alignItems: 'center',
                  ...shadows.gold,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 18,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                  }}
                >
                  {loading ? 'Adding to Wishlist...' : 'Add to Wishlist'}
                </Text>
              </TouchableOpacity>
            </MotiView>
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>
    );
  }
);
