/**
 * ContributionProgress Component
 * Progress bar showing total contributed vs optional target
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ContributionProgressProps {
  totalContributed: number;
  targetAmount?: number | null;
  contributorCount?: number;
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * ContributionProgress displays:
 * - If targetAmount is set: progress bar with percentage
 * - Always: total contributed as currency
 * - Optional: contributor count
 */
export function ContributionProgress({
  totalContributed,
  targetAmount,
  contributorCount,
}: ContributionProgressProps) {
  const { t } = useTranslation();
  // Calculate progress percentage
  const hasTarget = targetAmount !== undefined && targetAmount !== null && targetAmount > 0;
  const progressPercent = hasTarget
    ? Math.min(100, (totalContributed / targetAmount) * 100)
    : 0;
  const isComplete = hasTarget && totalContributed >= targetAmount;

  return (
    <View style={styles.container}>
      {/* Progress bar (only if target is set) */}
      {hasTarget && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
                isComplete && styles.progressFillComplete,
              ]}
            />
          </View>
          <Text style={styles.progressPercent}>
            {Math.round(progressPercent)}%
          </Text>
        </View>
      )}

      {/* Amount display */}
      <View style={styles.amountContainer}>
        <View style={styles.amountRow}>
          <MaterialCommunityIcons
            name="cash-multiple"
            size={20}
            color={isComplete ? '#22c55e' : '#6b7280'}
          />
          <Text style={styles.totalAmount}>
            {formatCurrency(totalContributed)}
          </Text>
          {hasTarget && (
            <Text style={styles.targetAmount}>
              {' '}{t('common.of')} {formatCurrency(targetAmount!)} {t('celebrations.contributions.target')}
            </Text>
          )}
        </View>

        {/* Contributor count */}
        {contributorCount !== undefined && contributorCount > 0 && (
          <View style={styles.contributorRow}>
            <MaterialCommunityIcons
              name="account-group"
              size={16}
              color="#9ca3af"
            />
            <Text style={styles.contributorCount}>
              {t('celebrations.contributions.contributorCount', { count: contributorCount })}
            </Text>
          </View>
        )}
      </View>

      {/* Complete badge */}
      {isComplete && (
        <View style={styles.completeBadge}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#22c55e" />
          <Text style={styles.completeText}>{t('celebrations.contributions.targetReached')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B1538',
    borderRadius: 4,
  },
  progressFillComplete: {
    backgroundColor: '#22c55e',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    width: 40,
    textAlign: 'right',
  },
  amountContainer: {
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  targetAmount: {
    fontSize: 14,
    color: '#6b7280',
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 26, // Align with text
  },
  contributorCount: {
    fontSize: 13,
    color: '#9ca3af',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  completeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#15803d',
  },
});
