/**
 * BankDetailsSection Component
 *
 * Form section for bank details input.
 * Fields: Account Holder Name, IBAN, Account Number (alternative), Bank Name
 *
 * Used in personal details form for receiving pooled gift money.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import {
  VStack,
  Heading,
  Input,
  InputField,
} from '@gluestack-ui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BankDetails } from '../../types/database.types';
import { colors, spacing } from '../../constants/theme';

interface BankDetailsSectionProps {
  bankDetails: BankDetails;
  onChange: (details: BankDetails) => void;
}

export function BankDetailsSection({
  bankDetails,
  onChange,
}: BankDetailsSectionProps) {
  const updateField = (key: keyof BankDetails, value: string) => {
    // Clear value if empty string (don't store empty strings)
    onChange({ ...bankDetails, [key]: value || undefined });
  };

  return (
    <VStack space="md" style={styles.section}>
      <VStack space="xs">
        <Heading size="sm">Bank Details</Heading>
        <Text style={styles.helperText}>
          For receiving money when friends pool for your gifts
        </Text>
      </VStack>

      {/* Security Note */}
      <View style={styles.securityNote}>
        <MaterialCommunityIcons
          name="shield-lock-outline"
          size={16}
          color={colors.burgundy[600]}
        />
        <Text style={styles.securityText}>
          Only visible to your group members by default
        </Text>
      </View>

      {/* Account Holder Name */}
      <VStack space="xs">
        <Text style={styles.label}>Account Holder Name</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder="e.g., John Smith"
            value={bankDetails.account_holder || ''}
            onChangeText={(val) => updateField('account_holder', val)}
            autoCapitalize="words"
          />
        </Input>
      </VStack>

      {/* IBAN */}
      <VStack space="xs">
        <Text style={styles.label}>IBAN</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder="e.g., DE89370400440532013000"
            value={bankDetails.iban || ''}
            onChangeText={(val) => updateField('iban', val)}
            autoCapitalize="characters"
          />
        </Input>
        <Text style={styles.fieldHint}>
          European bank account number (International Bank Account Number)
        </Text>
      </VStack>

      {/* Account Number (alternative) */}
      <VStack space="xs">
        <Text style={styles.label}>Account Number (if no IBAN)</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder="e.g., 12345678"
            value={bankDetails.account_number || ''}
            onChangeText={(val) => updateField('account_number', val)}
          />
        </Input>
        <Text style={styles.fieldHint}>
          For non-European bank accounts
        </Text>
      </VStack>

      {/* Bank Name (optional) */}
      <VStack space="xs">
        <Text style={styles.label}>Bank Name (optional)</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder="e.g., ING Bank"
            value={bankDetails.bank_name || ''}
            onChangeText={(val) => updateField('bank_name', val)}
          />
        </Input>
      </VStack>
    </VStack>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
  },
  helperText: {
    fontSize: 14,
    color: colors.cream[600],
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.burgundy[800],
  },
  fieldHint: {
    fontSize: 12,
    color: colors.cream[500],
    marginTop: 2,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.burgundy[50],
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  securityText: {
    fontSize: 13,
    color: colors.burgundy[700],
    flex: 1,
  },
});
