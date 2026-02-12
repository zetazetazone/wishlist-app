/**
 * TagInput Component
 *
 * Tag selector that offers predefined options and allows custom text entries.
 * Used for PROF-02 (colors), PROF-03 (brands, interests), PROF-04 (dislikes).
 *
 * Features:
 * - Displays selected tags with remove buttons
 * - Shows predefined options as selectable chips (unselected only)
 * - Custom input field for adding new tags
 * - Case-insensitive duplicate prevention
 * - Respects maxTags limit
 */

import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { VStack } from '@gluestack-ui/themed';
import { Input, InputField } from '@gluestack-ui/themed';
import type { PreferenceTag } from '../../types/database.types';
import { TagChip } from './TagChip';
import { colors, spacing } from '../../constants/theme';

interface TagInputProps {
  tags: PreferenceTag[];
  onChange: (tags: PreferenceTag[]) => void;
  predefinedOptions?: string[];
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({
  tags,
  onChange,
  predefinedOptions = [],
  placeholder,
  maxTags = 20,
}: TagInputProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const placeholderText = placeholder || t('profile.personalDetails.addCustom');

  const addTag = (label: string, isCustom: boolean) => {
    const normalized = label.trim();
    if (!normalized) return;

    // Case-insensitive duplicate check
    if (tags.some((t) => t.label.toLowerCase() === normalized.toLowerCase())) {
      return;
    }

    // Respect maxTags limit
    if (tags.length >= maxTags) {
      return;
    }

    onChange([...tags, { label: normalized, custom: isCustom }]);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handlePredefinedSelect = (option: string) => {
    // Predefined options are not custom
    addTag(option, false);
  };

  const handleCustomSubmit = () => {
    // Custom input entries are custom tags
    addTag(inputValue, true);
  };

  // Filter predefined options to show only unselected ones
  const availableOptions = predefinedOptions.filter(
    (opt) => !tags.some((t) => t.label.toLowerCase() === opt.toLowerCase())
  );

  return (
    <VStack space="sm">
      {/* Selected tags */}
      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.map((tag, index) => (
            <TagChip
              key={`${tag.label}-${index}`}
              label={tag.label}
              isCustom={tag.custom}
              onRemove={() => removeTag(index)}
            />
          ))}
        </View>
      )}

      {/* Predefined options (show unselected only) */}
      {availableOptions.length > 0 && (
        <View style={styles.tagsRow}>
          {availableOptions.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => handlePredefinedSelect(option)}
            >
              <TagChip label={option} selectable />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Custom input */}
      <Input variant="outline" size="sm">
        <InputField
          placeholder={placeholderText}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleCustomSubmit}
          returnKeyType="done"
        />
      </Input>
    </VStack>
  );
}

const styles = StyleSheet.create({
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
});
