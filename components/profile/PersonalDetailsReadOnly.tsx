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
 * - Delivery address (if visible based on visibility setting)
 * - Bank details (if visible, partially masked)
 */

import React from 'react';
import { StyleSheet, View, Text, Linking } from 'react-native';
import { HStack, VStack } from '@gluestack-ui/themed';
import { formatDistanceToNow } from 'date-fns';
import type {
  PersonalSizes,
  PersonalPreferences,
  ExternalLink,
  DeliveryAddress,
  BankDetails,
  PersonalDetailsVisibility,
  VisibilitySetting,
} from '../../types/database.types';
import { TagChip } from './TagChip';
import { ExternalLinkRow } from './ExternalLinkRow';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PersonalDetailsReadOnlyProps {
  sizes: PersonalSizes;
  preferences: PersonalPreferences;
  externalLinks: ExternalLink[];
  deliveryAddress?: DeliveryAddress;
  bankDetails?: BankDetails;
  visibility?: PersonalDetailsVisibility;
  updatedAt?: string; // ISO timestamp
  /** Whether viewer is in same group as profile owner (for friends_only visibility) */
  isGroupMember?: boolean;
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
 * Check if delivery address has any filled values.
 */
function hasDeliveryAddress(address?: DeliveryAddress): boolean {
  if (!address) return false;
  return !!(address.street?.trim() || address.city?.trim() || address.postal_code?.trim() || address.country?.trim());
}

/**
 * Check if bank details has any filled values.
 */
function hasBankDetails(details?: BankDetails): boolean {
  if (!details) return false;
  return !!(details.iban?.trim() || details.account_number?.trim() || details.account_holder?.trim());
}

/**
 * Mask sensitive information, showing only last 4 characters.
 */
function maskSensitive(value: string | undefined): string {
  if (!value || value.length <= 4) return value || '';
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

/**
 * Check if section should be visible based on visibility setting.
 * - friends_only: visible only to group members
 * - public: visible to all authenticated users
 */
function isSectionVisible(
  visibilitySetting: VisibilitySetting | undefined,
  isGroupMember: boolean
): boolean {
  const setting = visibilitySetting || 'friends_only';
  if (setting === 'public') return true;
  return isGroupMember;
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
  deliveryAddress,
  bankDetails,
  visibility,
  updatedAt,
  isGroupMember = false,
}: PersonalDetailsReadOnlyProps) {
  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error('Failed to open URL:', err)
    );
  };

  const showDeliveryAddress = hasDeliveryAddress(deliveryAddress) &&
    isSectionVisible(visibility?.delivery_address, isGroupMember);

  const showBankDetails = hasBankDetails(bankDetails) &&
    isSectionVisible(visibility?.bank_details, isGroupMember);

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

      {/* Delivery Address Section */}
      {showDeliveryAddress && deliveryAddress && (
        <View style={styles.card}>
          <HStack style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <MaterialCommunityIcons
              name={visibility?.delivery_address === 'public' ? 'earth' : 'account-group'}
              size={16}
              color={colors.cream[500]}
            />
          </HStack>
          <VStack space="xs">
            {deliveryAddress.street && (
              <Text style={styles.addressText}>{deliveryAddress.street}</Text>
            )}
            <Text style={styles.addressText}>
              {[
                deliveryAddress.city,
                deliveryAddress.postal_code,
              ].filter(Boolean).join(', ')}
            </Text>
            {deliveryAddress.country && (
              <Text style={styles.addressText}>{deliveryAddress.country}</Text>
            )}
          </VStack>
        </View>
      )}

      {/* Bank Details Section */}
      {showBankDetails && bankDetails && (
        <View style={styles.card}>
          <HStack style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bank Details</Text>
            <MaterialCommunityIcons
              name={visibility?.bank_details === 'public' ? 'earth' : 'account-group'}
              size={16}
              color={colors.cream[500]}
            />
          </HStack>
          <View style={styles.bankDetailsGrid}>
            {bankDetails.account_holder && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account Holder</Text>
                <Text style={styles.bankValue}>{bankDetails.account_holder}</Text>
              </View>
            )}
            {bankDetails.iban && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>IBAN</Text>
                <Text style={styles.bankValue}>{maskSensitive(bankDetails.iban)}</Text>
              </View>
            )}
            {bankDetails.account_number && !bankDetails.iban && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account Number</Text>
                <Text style={styles.bankValue}>{maskSensitive(bankDetails.account_number)}</Text>
              </View>
            )}
            {bankDetails.bank_name && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Bank</Text>
                <Text style={styles.bankValue}>{bankDetails.bank_name}</Text>
              </View>
            )}
          </View>
        </View>
      )}
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
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addressText: {
    fontSize: 14,
    color: colors.burgundy[700],
    lineHeight: 20,
  },
  bankDetailsGrid: {
    gap: spacing.sm,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream[200],
  },
  bankLabel: {
    fontSize: 14,
    color: colors.cream[700],
  },
  bankValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.burgundy[700],
    fontFamily: 'monospace',
  },
});
