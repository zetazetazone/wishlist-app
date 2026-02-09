/**
 * VisibilityToggle Component
 *
 * Toggle component for visibility settings.
 * Options: "Friends Only" (default) and "Public"
 *
 * Used in personal details form for delivery address and bank details sections.
 */

import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { HStack } from '@gluestack-ui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { VisibilitySetting } from '../../types/database.types';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface VisibilityToggleProps {
  label: string;
  value: VisibilitySetting;
  onChange: (value: VisibilitySetting) => void;
}

export function VisibilityToggle({
  label,
  value,
  onChange,
}: VisibilityToggleProps) {
  const isFriendsOnly = value === 'friends_only';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <HStack style={styles.toggleContainer}>
        {/* Friends Only Option */}
        <Pressable
          style={[
            styles.option,
            styles.optionLeft,
            isFriendsOnly && styles.optionSelected,
          ]}
          onPress={() => onChange('friends_only')}
        >
          <MaterialCommunityIcons
            name="account-group"
            size={16}
            color={isFriendsOnly ? colors.white : colors.burgundy[600]}
          />
          <Text
            style={[
              styles.optionText,
              isFriendsOnly && styles.optionTextSelected,
            ]}
          >
            Friends Only
          </Text>
        </Pressable>

        {/* Public Option */}
        <Pressable
          style={[
            styles.option,
            styles.optionRight,
            !isFriendsOnly && styles.optionSelected,
          ]}
          onPress={() => onChange('public')}
        >
          <MaterialCommunityIcons
            name="earth"
            size={16}
            color={!isFriendsOnly ? colors.white : colors.burgundy[600]}
          />
          <Text
            style={[
              styles.optionText,
              !isFriendsOnly && styles.optionTextSelected,
            ]}
          >
            Public
          </Text>
        </Pressable>
      </HStack>
      <Text style={styles.hint}>
        {isFriendsOnly
          ? 'Visible only to members of your groups'
          : 'Visible to all authenticated users'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.burgundy[700],
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.burgundy[200],
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.white,
  },
  optionLeft: {
    borderRightWidth: 1,
    borderRightColor: colors.burgundy[200],
  },
  optionRight: {},
  optionSelected: {
    backgroundColor: colors.burgundy[600],
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.burgundy[600],
  },
  optionTextSelected: {
    color: colors.white,
  },
  hint: {
    fontSize: 11,
    color: colors.cream[600],
    marginTop: spacing.xs,
  },
});
