/**
 * ClaimTimestamp Component
 *
 * Shows claim time on tap, formatted based on recency.
 * Per CONTEXT: timestamps shown on tap to keep UI clean.
 *
 * Display logic:
 * - < 7 days: relative format ("2 hours ago", "3 days ago")
 * - >= 7 days: exact format ("Feb 6, 2:30pm")
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface ClaimTimestampProps {
  timestamp: string; // ISO date string
}

/**
 * ClaimTimestamp - Shows claim time on tap
 *
 * Display behavior:
 * - Initially shows clock icon as hint
 * - On tap: reveals timestamp
 * - Tap again to toggle back
 */
export function ClaimTimestamp({ timestamp }: ClaimTimestampProps) {
  const [showTimestamp, setShowTimestamp] = useState(false);

  const date = new Date(timestamp);
  const daysDiff = differenceInDays(new Date(), date);

  // Use relative format for recent claims, exact date for older ones
  const displayText =
    daysDiff < 7
      ? formatDistanceToNow(date, { addSuffix: true })
      : format(date, 'MMM d, h:mma');

  return (
    <TouchableOpacity
      onPress={() => setShowTimestamp(!showTimestamp)}
      style={styles.container}
      activeOpacity={0.7}
      accessibilityLabel={showTimestamp ? displayText : 'Tap to show claim time'}
      accessibilityRole="button"
    >
      {showTimestamp ? (
        <View style={styles.timestampContainer}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={12}
            color={colors.cream[600]}
          />
          <Text style={styles.timestampText}>{displayText}</Text>
        </View>
      ) : (
        <View style={styles.hintContainer}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color={colors.cream[500]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cream[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  timestampText: {
    fontSize: 11,
    color: colors.cream[700],
  },
});

export default ClaimTimestamp;
