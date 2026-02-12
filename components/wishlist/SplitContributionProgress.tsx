/**
 * SplitContributionProgress Component
 *
 * Progress bar showing split funding progress toward item price.
 * For celebrant view: shows only "Taken" or "In Progress" status.
 * For non-celebrant view: shows "$X of $Y funded" with progress bar.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface SplitContributionProgressProps {
  itemPrice: number;
  additionalCosts?: number | null;
  totalPledged: number;
  isFullyFunded: boolean;
  isCelebrant?: boolean; // Show boolean-only view
}

/**
 * Format currency amount for display.
 * Whole dollars show without decimals; fractional amounts show 2 decimals.
 */
function formatCurrency(amount: number): string {
  if (amount % 1 === 0) {
    return `$${amount}`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * SplitContributionProgress displays:
 * - Celebrant view: "Taken" or "In Progress" text only (no amounts)
 * - Non-celebrant view: Progress bar + "$X of $Y funded"
 */
export function SplitContributionProgress({
  itemPrice,
  additionalCosts,
  totalPledged,
  isFullyFunded,
  isCelebrant = false,
}: SplitContributionProgressProps) {
  const { t } = useTranslation();
  // Calculate total target (item price + additional costs)
  const additionalAmount = additionalCosts ?? 0;
  const totalTarget = itemPrice + additionalAmount;

  // Calculate progress percentage
  const progressPercent = totalTarget > 0
    ? Math.min(100, (totalPledged / totalTarget) * 100)
    : 0;

  // Celebrant view: boolean status only
  if (isCelebrant) {
    return (
      <View style={styles.celebrantContainer}>
        <MaterialCommunityIcons
          name={isFullyFunded ? 'gift' : 'gift-outline'}
          size={16}
          color={isFullyFunded ? colors.success : colors.cream[600]}
        />
        <Text
          style={[
            styles.celebrantText,
            isFullyFunded && styles.celebrantTextComplete,
          ]}
        >
          {isFullyFunded ? t('wishlist.split.taken') : t('wishlist.split.inProgress')}
        </Text>
      </View>
    );
  }

  // Non-celebrant view: full progress display
  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: isFullyFunded
                ? colors.success
                : colors.burgundy[600],
            },
          ]}
        />
      </View>

      {/* Amount display */}
      <View style={styles.amountContainer}>
        <View style={styles.amountRow}>
          <Text style={styles.fundedAmount}>
            {formatCurrency(totalPledged)}
          </Text>
          <Text style={styles.ofText}> {t('common.of')} </Text>
          <Text style={styles.targetAmount}>
            {formatCurrency(totalTarget)}
          </Text>
          <Text style={styles.fundedLabel}> {t('wishlist.split.funded')}</Text>
        </View>

        {/* Cost breakdown if additional costs exist */}
        {additionalAmount > 0 && (
          <Text style={styles.breakdownText}>
            {t('wishlist.split.item')}: {formatCurrency(itemPrice)} + {t('wishlist.split.shipping')}: {formatCurrency(additionalAmount)}
          </Text>
        )}
      </View>

      {/* Fully funded badge */}
      {isFullyFunded && (
        <View style={styles.completeBadge}>
          <MaterialCommunityIcons
            name="check-circle"
            size={14}
            color={colors.success}
          />
          <Text style={styles.completeText}>{t('wishlist.split.fullyFunded')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.cream[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  amountContainer: {
    gap: spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fundedAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.burgundy[800],
  },
  ofText: {
    fontSize: 14,
    color: colors.cream[600],
  },
  targetAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cream[700],
  },
  fundedLabel: {
    fontSize: 14,
    color: colors.cream[600],
  },
  breakdownText: {
    fontSize: 12,
    color: colors.cream[500],
    fontStyle: 'italic',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  completeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
  },
  celebrantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  celebrantText: {
    fontSize: 14,
    color: colors.cream[600],
  },
  celebrantTextComplete: {
    color: colors.success,
    fontWeight: '600',
  },
});

export default SplitContributionProgress;
