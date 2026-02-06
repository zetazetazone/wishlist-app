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
  const updatePreference = (
    key: keyof PersonalPreferences,
    tags: PreferenceTag[]
  ) => {
    onChange({ ...preferences, [key]: tags });
  };

  return (
    <VStack space="lg" style={styles.section}>
      <Heading size="sm">Preferences</Heading>

      {/* Favorite Colors */}
      <VStack space="xs">
        <Text style={styles.label}>Favorite Colors</Text>
        <TagInput
          tags={preferences.colors || []}
          onChange={(tags) => updatePreference('colors', tags)}
          predefinedOptions={COLOR_OPTIONS}
          placeholder="Add custom color..."
        />
      </VStack>

      {/* Favorite Brands */}
      <VStack space="xs">
        <Text style={styles.label}>Favorite Brands</Text>
        <TagInput
          tags={preferences.brands || []}
          onChange={(tags) => updatePreference('brands', tags)}
          placeholder="Add brands you love"
        />
      </VStack>

      {/* Interests */}
      <VStack space="xs">
        <Text style={styles.label}>Interests</Text>
        <TagInput
          tags={preferences.interests || []}
          onChange={(tags) => updatePreference('interests', tags)}
          placeholder="Add hobbies or interests"
        />
      </VStack>

      {/* Dislikes */}
      <VStack space="xs">
        <Text style={styles.label}>Dislikes</Text>
        <Text style={styles.warningHint}>Things to avoid when choosing gifts</Text>
        <TagInput
          tags={preferences.dislikes || []}
          onChange={(tags) => updatePreference('dislikes', tags)}
          placeholder="Things to avoid"
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
