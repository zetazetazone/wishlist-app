/**
 * BudgetProgressBar Component
 *
 * Displays group budget progress with traffic-light color coding.
 * - Monthly/Yearly: horizontal progress bar with spent vs budget
 * - Per-gift: text-only suggested limit display
 *
 * Threshold colors:
 *   normal (< 75%)  -> green (#2D7A4F)
 *   warning (75-89%) -> yellow (#F59E0B)
 *   danger (90-99%)  -> red (#DC2626)
 *   over (>= 100%)   -> red (#DC2626)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BudgetStatus } from '../../lib/budget';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface BudgetProgressBarProps {
  status: BudgetStatus;
}

/**
 * Format a dollar amount for display.
 * Whole dollars show without decimals; fractional amounts show 2 decimals.
 * Examples: 500 -> "$500", 120.50 -> "$120.50"
 */
function formatBudgetAmount(amount: number): string {
  if (amount % 1 === 0) {
    return `$${amount}`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Map threshold level to progress bar fill color.
 */
function getThresholdColor(level: BudgetStatus['thresholdLevel']): string {
  switch (level) {
    case 'normal':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
    case 'over':
      return colors.error;
    default:
      return colors.success;
  }
}

export function BudgetProgressBar({ status }: BudgetProgressBarProps) {
  const { t } = useTranslation();

  if (!status) return null;

  const isPoolBudget = status.approach === 'monthly' || status.approach === 'yearly';

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
            name="cash-multiple"
            size={20}
            color={colors.burgundy[800]}
          />
          <Text style={styles.headerTitle}>{t('groups.budget.title')}</Text>
        </View>

        {isPoolBudget ? (
          /* Monthly / Yearly: Progress bar with amounts */
          <>
            {/* Period Label */}
            <Text style={styles.periodLabel}>{status.periodLabel}</Text>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(status.percentage, 100)}%`,
                    backgroundColor: getThresholdColor(status.thresholdLevel),
                  },
                ]}
              />
            </View>

            {/* Amount Row */}
            <View style={styles.amountRow}>
              <Text style={styles.spentText}>
                {t('groups.budget.spent', { amount: formatBudgetAmount(status.spent) })}
              </Text>
              <Text style={styles.ofText}>
                {t('groups.budget.of', { amount: formatBudgetAmount(status.budgetAmount) })}
              </Text>
            </View>

            {/* Over Budget Warning */}
            {status.isOverBudget && (
              <View style={styles.overBudgetRow}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={14}
                  color={colors.error}
                />
                <Text style={styles.overBudgetText}>
                  {t('groups.budget.overBudgetBy', { amount: formatBudgetAmount(Math.abs(status.remaining)) })}
                </Text>
              </View>
            )}
          </>
        ) : (
          /* Per-gift: Text-only suggestion */
          <>
            <Text style={styles.perGiftText}>
              {t('groups.budget.suggestedLimit', { amount: formatBudgetAmount(status.budgetAmount) })}
            </Text>
            <Text style={styles.perGiftSubtext}>
              {t('groups.budget.guidelineNote')}
            </Text>
          </>
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
  periodLabel: {
    fontSize: 12,
    color: colors.cream[600],
    marginBottom: spacing.sm,
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
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spentText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.burgundy[800],
  },
  ofText: {
    fontSize: 14,
    color: colors.cream[600],
  },
  overBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  overBudgetText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  perGiftText: {
    fontSize: 15,
    color: colors.cream[700],
    marginTop: spacing.xs,
  },
  perGiftSubtext: {
    fontSize: 12,
    color: colors.cream[500],
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
