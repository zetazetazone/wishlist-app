/**
 * CompletenessIndicator Component
 *
 * Displays profile completeness as a progress bar with color coding.
 * Follows the BudgetProgressBar pattern for visual consistency.
 *
 * Color coding:
 * - >= 80%: success green
 * - >= 50%: warning yellow
 * - < 50%: burgundy
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { CompletenessResult } from '../../lib/profileCompleteness';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface CompletenessIndicatorProps {
  result: CompletenessResult;
}

/**
 * Get progress bar color based on percentage.
 */
function getProgressColor(percentage: number): string {
  if (percentage >= 80) return colors.success;
  if (percentage >= 50) return colors.warning;
  return colors.burgundy[400];
}

export function CompletenessIndicator({ result }: CompletenessIndicatorProps) {
  const progressColor = getProgressColor(result.percentage);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 15 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: 200 }}
    >
      <View style={styles.card}>
        {/* Section Header */}
        <View style={styles.headerRow}>
          <MaterialCommunityIcons
            name="account-check"
            size={20}
            color={colors.burgundy[800]}
          />
          <Text style={styles.headerTitle}>Profile Completeness</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${result.percentage}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Text style={[styles.percentageText, { color: progressColor }]}>
            {result.percentage}%
          </Text>
          <Text style={styles.sectionsText}>
            {result.filledCount} of {result.totalCount} sections
          </Text>
        </View>

        {/* Missing Sections Hint */}
        {result.missingSections.length > 0 && result.percentage < 100 && (
          <Text style={styles.hintText}>
            Add: {result.missingSections.slice(0, 2).join(', ')}
            {result.missingSections.length > 2 && ' ...'}
          </Text>
        )}
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.burgundy[800],
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: colors.cream[200],
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionsText: {
    fontSize: 14,
    color: colors.cream[600],
  },
  hintText: {
    fontSize: 12,
    color: colors.cream[500],
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
