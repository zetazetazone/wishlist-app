/**
 * SizesSection Component
 *
 * Form section for clothing sizes input.
 * Shirt uses a Select dropdown, others use free text inputs.
 *
 * Used in personal details form (PROF-01).
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  VStack,
  Heading,
  Input,
  InputField,
  Select,
  SelectTrigger,
  SelectInput,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectItem,
} from '@gluestack-ui/themed';
import type { PersonalSizes } from '../../types/database.types';
import { colors, spacing } from '../../constants/theme';

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

interface SizesSectionProps {
  sizes: PersonalSizes;
  onChange: (sizes: PersonalSizes) => void;
}

export function SizesSection({ sizes, onChange }: SizesSectionProps) {
  const { t } = useTranslation();
  const updateSize = (key: keyof PersonalSizes, value: string) => {
    // Clear value if empty string (don't store empty strings)
    onChange({ ...sizes, [key]: value || undefined });
  };

  return (
    <VStack space="md" style={styles.section}>
      <VStack space="xs">
        <Heading size="sm">{t('profile.personalDetails.clothingSizes')}</Heading>
        <Text style={styles.helperText}>
          {t('profile.personalDetails.sizesHelper')}
        </Text>
      </VStack>

      {/* Shirt Size - Select */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.shirt')}</Text>
        <Select
          selectedValue={sizes.shirt || ''}
          onValueChange={(val) => updateSize('shirt', val)}
        >
          <SelectTrigger variant="outline" size="md">
            <SelectInput placeholder={t('profile.personalDetails.selectShirtSize')} />
          </SelectTrigger>
          <SelectPortal>
            <SelectBackdrop />
            <SelectContent>
              {SHIRT_SIZES.map((size) => (
                <SelectItem key={size} label={size} value={size} />
              ))}
            </SelectContent>
          </SelectPortal>
        </Select>
      </VStack>

      {/* Pants Size - Free Text */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.pants')}</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder={t('profile.personalDetails.pantsPlaceholder')}
            value={sizes.pants || ''}
            onChangeText={(val) => updateSize('pants', val)}
          />
        </Input>
      </VStack>

      {/* Shoe Size - Free Text */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.shoe')}</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder={t('profile.personalDetails.shoePlaceholder')}
            value={sizes.shoe || ''}
            onChangeText={(val) => updateSize('shoe', val)}
          />
        </Input>
      </VStack>

      {/* Ring Size - Free Text */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.ring')}</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder={t('profile.personalDetails.ringPlaceholder')}
            value={sizes.ring || ''}
            onChangeText={(val) => updateSize('ring', val)}
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
});
