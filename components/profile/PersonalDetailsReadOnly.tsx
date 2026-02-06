/**
 * PersonalDetailsReadOnly Component
 *
 * Read-only display of personal details for viewing another member's profile.
 * Used in member profile screen for PROF-07 (view another member's details).
 *
 * Sections:
 * - Last updated timestamp
 * - Clothing sizes (table format)
 * - Preferences (color/brand/interest/dislike chips)
 * - External wishlists (clickable links)
 */

import React from 'react';
import { StyleSheet, View, Text, Linking } from 'react-native';
import { HStack, VStack } from '@gluestack-ui/themed';
import { formatDistanceToNow } from 'date-fns';
import type {
  PersonalSizes,
  PersonalPreferences,
  ExternalLink,
} from '../../types/database.types';
import { TagChip } from './TagChip';
import { ExternalLinkRow } from './ExternalLinkRow';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface PersonalDetailsReadOnlyProps {
  sizes: PersonalSizes;
  preferences: PersonalPreferences;
  externalLinks: ExternalLink[];
  updatedAt?: string; // ISO timestamp
}

/**
 * Check if sizes object has any filled values.
 */
function hasSizes(sizes: PersonalSizes): boolean {
  return Object.values(sizes).some((v) => v && v.trim());
}

/**
 * Check if preferences has any tags.
 */
function hasPreferences(preferences: PersonalPreferences): boolean {
  return (
    (preferences.colors?.length || 0) > 0 ||
    (preferences.brands?.length || 0) > 0 ||
    (preferences.interests?.length || 0) > 0 ||
    (preferences.dislikes?.length || 0) > 0
  );
}

/**
 * Get display labels for size fields.
 */
const sizeLabels: Record<keyof PersonalSizes, string> = {
  shirt: 'Shirt',
  pants: 'Pants',
  shoe: 'Shoe',
  ring: 'Ring',
  dress: 'Dress',
  jacket: 'Jacket',
};

export function PersonalDetailsReadOnly({
  sizes,
  preferences,
  externalLinks,
  updatedAt,
}: PersonalDetailsReadOnlyProps) {
  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error('Failed to open URL:', err)
    );
  };

  return (
    <VStack space="lg">
      {/* Last Updated */}
      {updatedAt && (
        <Text style={styles.updatedText}>
          Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
        </Text>
      )}

      {/* Sizes Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Clothing Sizes</Text>
        {hasSizes(sizes) ? (
          <View style={styles.sizesGrid}>
            {(Object.entries(sizeLabels) as [keyof PersonalSizes, string][]).map(
              ([key, label]) => {
                const value = sizes[key];
                if (!value || !value.trim()) return null;
                return (
                  <View key={key} style={styles.sizeRow}>
                    <Text style={styles.sizeLabel}>{label}</Text>
                    <Text style={styles.sizeValue}>{value}</Text>
                  </View>
                );
              }
            )}
          </View>
        ) : (
          <Text style={styles.emptyText}>No sizes added yet</Text>
        )}
      </View>

      {/* Preferences Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {hasPreferences(preferences) ? (
          <VStack space="md">
            {/* Colors */}
            {preferences.colors && preferences.colors.length > 0 && (
              <View>
                <Text style={styles.subSectionTitle}>Favorite Colors</Text>
                <HStack flexWrap="wrap">
                  {preferences.colors.map((tag, idx) => (
                    <TagChip
                      key={`color-${idx}`}
                      label={tag.label}
                      isCustom={tag.custom}
                    />
                  ))}
                </HStack>
              </View>
            )}

            {/* Brands */}
            {preferences.brands && preferences.brands.length > 0 && (
              <View>
                <Text style={styles.subSectionTitle}>Favorite Brands</Text>
                <HStack flexWrap="wrap">
                  {preferences.brands.map((tag, idx) => (
                    <TagChip
                      key={`brand-${idx}`}
                      label={tag.label}
                      isCustom={tag.custom}
                    />
                  ))}
                </HStack>
              </View>
            )}

            {/* Interests */}
            {preferences.interests && preferences.interests.length > 0 && (
              <View>
                <Text style={styles.subSectionTitle}>Interests</Text>
                <HStack flexWrap="wrap">
                  {preferences.interests.map((tag, idx) => (
                    <TagChip
                      key={`interest-${idx}`}
                      label={tag.label}
                      isCustom={tag.custom}
                    />
                  ))}
                </HStack>
              </View>
            )}

            {/* Dislikes */}
            {preferences.dislikes && preferences.dislikes.length > 0 && (
              <View>
                <Text style={styles.subSectionTitle}>Dislikes</Text>
                <HStack flexWrap="wrap">
                  {preferences.dislikes.map((tag, idx) => (
                    <View key={`dislike-${idx}`} style={styles.dislikeChip}>
                      <Text style={styles.dislikeText}>{tag.label}</Text>
                    </View>
                  ))}
                </HStack>
              </View>
            )}
          </VStack>
        ) : (
          <Text style={styles.emptyText}>No preferences added yet</Text>
        )}
      </View>

      {/* External Wishlists Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>External Wishlists</Text>
        {externalLinks.length > 0 ? (
          <VStack space="sm">
            {externalLinks.map((link, idx) => (
              <ExternalLinkRow
                key={`link-${idx}`}
                link={link}
                onOpen={() => handleOpenLink(link.url)}
                onRemove={() => {}} // No-op for read-only
              />
            ))}
          </VStack>
        ) : (
          <Text style={styles.emptyText}>No external wishlists added</Text>
        )}
      </View>
    </VStack>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.burgundy[800],
    marginBottom: spacing.md,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.burgundy[700],
    marginBottom: spacing.xs,
  },
  updatedText: {
    fontSize: 12,
    color: colors.cream[600],
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.cream[500],
    fontStyle: 'italic',
  },
  sizesGrid: {
    gap: spacing.sm,
  },
  sizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream[200],
  },
  sizeLabel: {
    fontSize: 14,
    color: colors.cream[700],
  },
  sizeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.burgundy[700],
  },
  dislikeChip: {
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.warning,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  dislikeText: {
    fontSize: 14,
    color: colors.warning,
    fontWeight: '500',
  },
});
