/**
 * OpenSplitModal Component
 *
 * Cross-platform modal for opening an item for split contribution.
 * Replaces Alert.prompt which is iOS-only.
 *
 * Allows optional entry of additional costs (shipping, taxes, etc.)
 *
 * KEYBOARD-AWARE: Uses keyboardBehavior="extend" to ensure the input
 * field remains visible above the keyboard when it opens.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface OpenSplitModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (additionalCosts?: number) => void;
  itemTitle: string;
  loading?: boolean;
}

/**
 * OpenSplitModal provides input for additional costs when opening a split.
 */
export function OpenSplitModal({
  visible,
  onClose,
  onConfirm,
  itemTitle,
  loading = false,
}: OpenSplitModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  // Fixed snap point high enough to always show content above keyboard
  const snapPoints = ['75%'];

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setAmount('');
      setError(null);
    }
  }, [visible]);

  // Handle sheet open/close
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleAmountChange = (text: string) => {
    // Allow only numbers and one decimal point
    const filtered = text.replace(/[^0-9.]/g, '');
    const parts = filtered.split('.');
    if (parts.length > 2) {
      return;
    }
    if (parts.length === 2 && parts[1].length > 2) {
      return;
    }
    setAmount(filtered);
    setError(null);
  };

  const handleConfirm = () => {
    // Empty input is valid (no additional costs)
    if (!amount || amount.trim() === '') {
      onConfirm(undefined);
      return;
    }

    const numAmount = parseFloat(amount);

    // If entered, must be a positive number
    if (isNaN(numAmount) || numAmount < 0) {
      setError(t('wishlist.split.enterValidPositiveAmount'));
      return;
    }

    // Zero is treated as no additional costs
    if (numAmount === 0) {
      onConfirm(undefined);
      return;
    }

    onConfirm(numAmount);
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {t('wishlist.split.openForSplit')}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={colors.cream[600]}
            />
          </Pressable>
        </View>

        {/* Item Info */}
        <Text style={styles.itemTitle} numberOfLines={1}>
          {itemTitle}
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {t('wishlist.split.addShippingCosts')}
        </Text>

        {/* Amount Input - Using BottomSheetTextInput for proper keyboard handling */}
        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencySymbol}>$</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="0.00"
              placeholderTextColor={colors.cream[400]}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </Pressable>

          <Pressable
            style={[
              styles.confirmButton,
              loading && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="call-split"
                  size={18}
                  color={colors.white}
                />
                <Text style={styles.confirmButtonText}>{t('wishlist.split.openSplit')}</Text>
              </>
            )}
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.burgundy[800],
    marginRight: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  itemTitle: {
    fontSize: 15,
    color: colors.cream[600],
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: colors.cream[500],
    marginBottom: spacing.lg,
  },
  inputSection: {
    paddingBottom: spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream[100],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cream[200],
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.cream[600],
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: colors.burgundy[800],
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    marginTop: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cream[200],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cream[700],
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.burgundy[700],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.cream[300],
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default OpenSplitModal;
