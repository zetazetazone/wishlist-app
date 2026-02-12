/**
 * PreferencesSection Component
 *
 * Form section for preferences: colors, brands, interests, dislikes.
 * Uses TagInput components for each preference category.
 *
 * Used in personal details form (PROF-02, PROF-03, PROF-04).
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { VStack, Heading } from '@gluestack-ui/themed';
import type { PersonalPreferences, PreferenceTag } from '../../types/database.types';
import { TagInput } from './TagInput';
import { colors, spacing } from '../../constants/theme';

// Common color options for the colors TagInput
const COLOR_OPTIONS = [
  'Red',
  'Blue',
  'Green',
  'Black',
  'White',
  'Pink',
  'Purple',
  'Orange',
  'Yellow',
  'Gray',
  'Brown',
  'Navy',
  'Teal',
];

interface PreferencesSectionProps {
  preferences: PersonalPreferences;
  onChange: (prefs: PersonalPreferences) => void;
}

export function PreferencesSection({ preferences, onChange }: PreferencesSectionProps) {
  const { t } = useTranslation();
  const updatePreference = (
    key: keyof PersonalPreferences,
    tags: PreferenceTag[]
  ) => {
    onChange({ ...preferences, [key]: tags });
  };

  return (
    <VStack space="lg" style={styles.section}>
      <Heading size="sm">{t('profile.personalDetails.preferences')}</Heading>

      {/* Favorite Colors */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.favoriteColors')}</Text>
        <TagInput
          tags={preferences.colors || []}
          onChange={(tags) => updatePreference('colors', tags)}
          predefinedOptions={COLOR_OPTIONS}
          placeholder={t('profile.personalDetails.addCustomColor')}
        />
      </VStack>

      {/* Favorite Brands */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.favoriteBrands')}</Text>
        <TagInput
          tags={preferences.brands || []}
          onChange={(tags) => updatePreference('brands', tags)}
          placeholder={t('profile.personalDetails.addBrands')}
        />
      </VStack>

      {/* Interests */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.interests')}</Text>
        <TagInput
          tags={preferences.interests || []}
          onChange={(tags) => updatePreference('interests', tags)}
          placeholder={t('profile.personalDetails.addInterests')}
        />
      </VStack>

      {/* Dislikes */}
      <VStack space="xs">
        <Text style={styles.label}>{t('profile.personalDetails.dislikes')}</Text>
        <Text style={styles.warningHint}>{t('profile.personalDetails.dislikesHint')}</Text>
        <TagInput
          tags={preferences.dislikes || []}
          onChange={(tags) => updatePreference('dislikes', tags)}
          placeholder={t('profile.personalDetails.addDislikes')}
        />
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.burgundy[800],
  },
  warningHint: {
    fontSize: 12,
    color: colors.warning,
    fontStyle: 'italic',
  },
});
