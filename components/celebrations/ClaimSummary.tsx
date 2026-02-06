/**
 * ClaimSummary Component
 *
 * Compact claim count summary for header placement.
 * Shows "X of Y items claimed" with optional breakdown for splits.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';

interface ClaimSummaryProps {
  totalItems: number;
  claimedItems: number; // Full claims only
  splitItems: number; // Items with split contributions
}

/**
 * ClaimSummary displays claim count in header format.
 * Format: "3 of 8 items claimed" with optional "(2 full, 1 split)"
 */
export function ClaimSummary({
  totalItems,
  claimedItems,
  splitItems,
}: ClaimSummaryProps) {
  // Don't render if no items
  if (totalItems === 0) {
    return null;
  }

  const totalClaimed = claimedItems + splitItems;
  const hasSplits = splitItems > 0;

  // Choose icon based on claim status
  const iconName = totalClaimed > 0 ? 'gift' : 'gift-outline';
  const iconColor =
    totalClaimed === totalItems
      ? colors.success
      : totalClaimed > 0
      ? colors.burgundy[600]
      : colors.cream[500];

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={iconName} size={16} color={iconColor} />
      <Text style={styles.summaryText}>
        {totalClaimed} of {totalItems} items claimed
      </Text>
      {hasSplits && (
        <Text style={styles.detailText}>
          ({claimedItems} full, {splitItems} split)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  summaryText: {
    fontSize: 14,
    color: colors.cream[700],
    fontWeight: '500',
  },
  detailText: {
    fontSize: 12,
    color: colors.cream[500],
    fontStyle: 'italic',
  },
});

export default ClaimSummary;
