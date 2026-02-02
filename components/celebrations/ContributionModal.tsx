/**
 * ContributionModal Component
 * Bottom sheet modal for adding/updating contributions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import {
  getContributions,
  addContribution,
  type Contribution,
} from '../../lib/contributions';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  celebrationId: string;
  existingContribution?: Contribution | null;
  onSave?: () => void;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function ContributionModal({
  isOpen,
  onClose,
  celebrationId,
  existingContribution,
  onSave,
}: ContributionModalProps) {
  const [amount, setAmount] = useState('');
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = ['70%'];

  // Load contributions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadContributions();
      // Set initial amount if editing
      if (existingContribution) {
        setAmount(existingContribution.amount.toString());
      } else {
        setAmount('');
      }
    }
  }, [isOpen, celebrationId, existingContribution]);

  // Handle sheet open/close
  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const loadContributions = async () => {
    try {
      setLoading(true);
      const data = await getContributions(celebrationId);
      setContributions(data);
    } catch (err) {
      console.error('Failed to load contributions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Parse and validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await addContribution(celebrationId, numAmount);
      onSave?.();
      onClose();
    } catch (err) {
      console.error('Failed to save contribution:', err);
      setError(err instanceof Error ? err.message : 'Failed to save contribution');
    } finally {
      setSaving(false);
    }
  };

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

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  // Calculate total from other contributors
  const otherContributions = contributions.filter(
    c => c.id !== existingContribution?.id
  );
  const othersTotal = otherContributions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={isOpen ? 0 : -1}
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
            <Text style={styles.title}>
              {existingContribution ? 'Update Contribution' : 'Add Contribution'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>

          {/* Amount Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Your Contribution</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          {/* Contributors List */}
          <View style={styles.contributorsSection}>
            <Text style={styles.sectionTitle}>
              Other Contributors ({otherContributions.length})
            </Text>

            {loading ? (
              <ActivityIndicator size="small" color="#8B1538" />
            ) : otherContributions.length === 0 ? (
              <Text style={styles.noContributors}>
                No other contributions yet. Be the first!
              </Text>
            ) : (
              <ScrollView
                style={styles.contributorsList}
                showsVerticalScrollIndicator={false}
              >
                {otherContributions.map(contribution => {
                  const name =
                    contribution.contributor?.display_name || 'Unknown';
                  const initial = name.charAt(0).toUpperCase();

                  return (
                    <View key={contribution.id} style={styles.contributorItem}>
                      {contribution.contributor?.avatar_url ? (
                        <Image
                          source={{ uri: contribution.contributor.avatar_url }}
                          style={styles.contributorAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.contributorAvatar,
                            styles.contributorAvatarPlaceholder,
                          ]}
                        >
                          <Text style={styles.contributorInitial}>
                            {initial}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.contributorName}>{name}</Text>
                      <Text style={styles.contributorAmount}>
                        {formatCurrency(contribution.amount)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {otherContributions.length > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Others' Total:</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(othersTotal)}
                </Text>
              </View>
            )}
          </View>

          {/* Save Button */}
          <Pressable
            style={[
              styles.saveButton,
              (!amount || saving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!amount || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>
                  {existingContribution ? 'Update' : 'Add'} Contribution
                </Text>
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  inputSection: {
    paddingVertical: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 8,
  },
  contributorsSection: {
    flex: 1,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  noContributors: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  contributorsList: {
    flex: 1,
    maxHeight: 200,
  },
  contributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contributorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  contributorAvatarPlaceholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contributorInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  contributorName: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
  },
  contributorAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22c55e',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B1538',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
