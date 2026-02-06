/**
 * TagChip Component
 *
 * Displays a single tag with optional delete button.
 * Used for colors, brands, interests, and dislikes preferences.
 *
 * Props:
 * - label: Tag text to display
 * - isCustom: Whether this is a user-added custom tag (different border style)
 * - onRemove: If provided, shows X button and calls this on press
 * - selectable: If true, shows as unselected option (lighter styling, no X)
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '../../constants/theme';

interface TagChipProps {
  label: string;
  isCustom?: boolean;
  onRemove?: () => void;
  selectable?: boolean;
}

export function TagChip({ label, isCustom, onRemove, selectable }: TagChipProps) {
  // Selectable chips are lighter and don't have remove button
  if (selectable) {
    return (
      <View style={[styles.chip, styles.selectableChip]}>
        <Text style={[styles.label, styles.selectableLabel]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.chip, isCustom && styles.customChip]}>
      <Text style={styles.label}>{label}</Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.removeButton}
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={16}
            color={colors.burgundy[400]}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.burgundy[100],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm + 4,
    paddingRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.burgundy[200],
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  customChip: {
    borderColor: colors.burgundy[300],
    borderStyle: 'dashed',
  },
  selectableChip: {
    backgroundColor: colors.cream[100],
    borderColor: colors.cream[300],
  },
  label: {
    fontSize: 14,
    color: colors.burgundy[700],
    fontWeight: '500',
  },
  selectableLabel: {
    color: colors.cream[700],
    fontWeight: '400',
  },
  removeButton: {
    marginLeft: spacing.xs,
  },
});
