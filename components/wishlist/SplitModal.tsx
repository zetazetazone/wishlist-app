/**
 * SplitModal Component
 *
 * Modal for entering a pledge amount toward a split contribution.
 * Shows progress info, validates amount, and handles keyboard properly.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface SplitModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  itemTitle: string;
  itemPrice: number;
  additionalCosts?: number | null;
  totalPledged: number;
  suggestedAmount?: number; // Equal share calculation
  loading?: boolean;
}

/**
 * Format currency amount for display.
 */
function formatCurrency(amount: number): string {
  if (amount % 1 === 0) {
    return `$${amount}`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * SplitModal provides pledge input with validation.
 */
export function SplitModal({
  visible,
  onClose,
  onConfirm,
  itemTitle,
  itemPrice,
  additionalCosts,
  totalPledged,
  suggestedAmount,
  loading = false,
}: SplitModalProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = ['60%'];

  // Calculate remaining amount
  const additionalAmount = additionalCosts ?? 0;
  const totalTarget = itemPrice + additionalAmount;
  const remaining = Math.max(0, totalTarget - totalPledged);

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
    const numAmount = parseFloat(amount);

    // Validate positive amount
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter a positive amount');
      return;
    }

    // Validate not exceeding remaining
    if (numAmount > remaining) {
      setError(`Amount exceeds remaining (${formatCurrency(remaining)})`);
      return;
    }

    onConfirm(numAmount);
  };

  const handleUseSuggested = () => {
    if (suggestedAmount) {
      // Cap at remaining amount
      const capped = Math.min(suggestedAmount, remaining);
      setAmount(capped.toFixed(2));
      setError(null);
    }
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

  // Check if confirm is valid
  const numAmount = parseFloat(amount);
  const isValidAmount = !isNaN(numAmount) && numAmount > 0 && numAmount <= remaining;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              Contribute to {itemTitle}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.cream[600]}
              />
            </Pressable>
          </View>

          {/* Progress Info */}
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {formatCurrency(totalPledged)} of {formatCurrency(totalTarget)} funded
            </Text>
            <Text style={styles.remainingText}>
              {formatCurrency(remaining)} remaining
            </Text>
          </View>

          {/* Amount Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Your Pledge</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor={colors.cream[400]}
                keyboardType="decimal-pad"
                autoFocus
                editable={!loading}
              />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          {/* Suggested Amount Button */}
          {suggestedAmount && suggestedAmount > 0 && (
            <Pressable
              style={styles.suggestedButton}
              onPress={handleUseSuggested}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="account-group"
                size={18}
                color={colors.burgundy[600]}
              />
              <Text style={styles.suggestedText}>
                Split equally: {formatCurrency(Math.min(suggestedAmount, remaining))}
              </Text>
            </Pressable>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[
                styles.confirmButton,
                (!isValidAmount || loading) && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!isValidAmount || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="hand-heart"
                    size={18}
                    color={colors.white}
                  />
                  <Text style={styles.confirmButtonText}>
                    Pledge {amount ? formatCurrency(parseFloat(amount) || 0) : '$0'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream[200],
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.burgundy[800],
    marginRight: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  progressInfo: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cream[700],
  },
  remainingText: {
    fontSize: 14,
    color: colors.cream[600],
  },
  inputSection: {
    paddingVertical: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.cream[600],
    marginBottom: spacing.sm,
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
  suggestedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.burgundy[50],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.burgundy[100],
    marginBottom: spacing.md,
  },
  suggestedText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.burgundy[600],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 'auto',
    marginBottom: spacing.lg,
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

export default SplitModal;
