/**
 * DeliveryAddressSection Component
 *
 * Form section for delivery address input.
 * Fields: Street, City, Postal Code, Country
 *
 * Used in personal details form for gift coordination.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  VStack,
  Heading,
  Input,
  InputField,
  HStack,
} from '@gluestack-ui/themed';
import type { DeliveryAddress } from '../../types/database.types';
import { colors, spacing } from '../../constants/theme';

interface DeliveryAddressSectionProps {
  address: DeliveryAddress;
  onChange: (address: DeliveryAddress) => void;
}

export function DeliveryAddressSection({
  address,
  onChange,
}: DeliveryAddressSectionProps) {
  const { t } = useTranslation();
  const updateField = (key: keyof DeliveryAddress, value: string) => {
    // Clear value if empty string (don't store empty strings)
    onChange({ ...address, [key]: value || undefined });
  };

  return (
    <VStack space="md" style={styles.section}>
      <VStack space="xs">
        <Heading size="sm">{t('profile.personalDetails.deliveryAddress')}</Heading>
        <Text style={styles.helperText}>
          {t('profile.personalDetails.deliveryAddressHelper')}
        </Text>
      </VStack>

      {/* Street */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.streetAddress')}</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder={t('profile.personalDetails.streetPlaceholder')}
            value={address.street || ''}
            onChangeText={(val) => updateField('street', val)}
          />
        </Input>
      </VStack>

      {/* City and Postal Code Row */}
      <HStack space="md">
        <VStack space="xs" style={styles.halfWidth}>
          <Text style={styles.label}>{t('profile.personalDetails.city')}</Text>
          <Input variant="outline" size="md">
            <InputField
              placeholder={t('profile.personalDetails.cityPlaceholder')}
              value={address.city || ''}
              onChangeText={(val) => updateField('city', val)}
            />
          </Input>
        </VStack>

        <VStack space="xs" style={styles.halfWidth}>
          <Text style={styles.label}>{t('profile.personalDetails.postalCode')}</Text>
          <Input variant="outline" size="md">
            <InputField
              placeholder={t('profile.personalDetails.postalCodePlaceholder')}
              value={address.postal_code || ''}
              onChangeText={(val) => updateField('postal_code', val)}
            />
          </Input>
        </VStack>
      </HStack>

      {/* Country */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.country')}</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder={t('profile.personalDetails.countryPlaceholder')}
            value={address.country || ''}
            onChangeText={(val) => updateField('country', val)}
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
  halfWidth: {
    flex: 1,
  },
});
