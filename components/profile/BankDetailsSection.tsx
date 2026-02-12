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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const updateField = (key: keyof BankDetails, value: string) => {
    // Clear value if empty string (don't store empty strings)
    onChange({ ...bankDetails, [key]: value || undefined });
  };

  return (
    <VStack space="md" style={styles.section}>
      <VStack space="xs">
        <Heading size="sm">{t('profile.personalDetails.bankDetails')}</Heading>
        <Text style={styles.helperText}>
          {t('profile.personalDetails.bankDetailsHelper')}
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
          {t('profile.personalDetails.bankSecurityNote')}
        </Text>
      </View>

      {/* Account Holder Name */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.accountHolder')}</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder={t('profile.personalDetails.accountHolderPlaceholder')}
            value={bankDetails.account_holder || ''}
            onChangeText={(val) => updateField('account_holder', val)}
            autoCapitalize="words"
          />
        </Input>
      </VStack>

      {/* IBAN */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.iban')}</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder={t('profile.personalDetails.ibanPlaceholder')}
            value={bankDetails.iban || ''}
            onChangeText={(val) => updateField('iban', val)}
            autoCapitalize="characters"
          />
        </Input>
        <Text style={styles.fieldHint}>
          {t('profile.personalDetails.ibanHint')}
        </Text>
      </VStack>

      {/* Account Number (alternative) */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.accountNumber')}</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder={t('profile.personalDetails.accountNumberPlaceholder')}
            value={bankDetails.account_number || ''}
            onChangeText={(val) => updateField('account_number', val)}
          />
        </Input>
        <Text style={styles.fieldHint}>
          {t('profile.personalDetails.accountNumberHint')}
        </Text>
      </VStack>

      {/* Bank Name (optional) */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.bankName')}</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder={t('profile.personalDetails.bankNamePlaceholder')}
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
