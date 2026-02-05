/**
 * Budget Calculation Service
 *
 * Derives group budget spending from celebration_contributions data.
 * Handles three approaches: per_gift (suggestion only), monthly (calendar month),
 * yearly (group creation anniversary).
 *
 * CURRENCY NOTE:
 * - celebration_contributions.amount is NUMERIC in DOLLARS
 * - groups.budget_amount is INTEGER in CENTS
 * - This service converts budget_amount from cents to dollars for all comparisons
 *
 * DATA FLOW (monthly/yearly):
 * 1. Query groups table for budget_approach, budget_amount, created_at
 * 2. Calculate date range based on approach
 * 3. Query celebrations for the group within date range -> get celebration IDs
 * 4. Query celebration_contributions for those celebration IDs -> sum amounts
 * 5. Return BudgetStatus with calculated values
 */

import { supabase } from './supabase';
import {
  startOfMonth, addYears, differenceInYears,
  parseISO, format, addMonths,
} from 'date-fns';

export interface BudgetStatus {
  approach: 'per_gift' | 'monthly' | 'yearly';
  budgetAmount: number;       // in dollars (converted from cents)
  spent: number;              // in dollars (sum of contributions)
  remaining: number;          // budgetAmount - spent (can be negative)
  percentage: number;         // spent / budgetAmount * 100
  periodLabel: string;        // e.g. "January 2026", "Feb 2025 - Feb 2026"
  isOverBudget: boolean;      // spent >= budgetAmount
  thresholdLevel: 'normal' | 'warning' | 'danger' | 'over';
}

/**
 * Get the threshold level based on spending percentage.
 * - normal: < 75%
 * - warning: 75% to < 90%
 * - danger: 90% to < 100%
 * - over: >= 100%
 */
function getThresholdLevel(percentage: number): 'normal' | 'warning' | 'danger' | 'over' {
  if (percentage >= 100) return 'over';
  if (percentage >= 90) return 'danger';
  if (percentage >= 75) return 'warning';
  return 'normal';
}

/**
 * Calculate date range and label based on budget approach.
 *
 * Monthly: current calendar month (startOfMonth to start of next month, exclusive)
 * Yearly: group creation anniversary to next anniversary [anniversaryN, anniversaryN+1)
 */
function getDateRange(
  approach: 'monthly' | 'yearly',
  createdAt: string,
  now: Date
): { start: Date; end: Date; label: string } {
  if (approach === 'monthly') {
    return {
      start: startOfMonth(now),
      end: addMonths(startOfMonth(now), 1), // Exclusive end: start of next month
      label: format(now, 'MMMM yyyy'), // e.g. "February 2026"
    };
  }

  // Yearly: anniversary-based
  const created = parseISO(createdAt);
  const yearsElapsed = differenceInYears(now, created);
  const periodStart = addYears(created, yearsElapsed);
  const periodEnd = addYears(created, yearsElapsed + 1);

  const startLabel = format(periodStart, 'MMM yyyy');
  const endLabel = format(periodEnd, 'MMM yyyy');

  return {
    start: periodStart,
    end: periodEnd,
    label: `${startLabel} - ${endLabel}`, // e.g. "Jun 2025 - Jun 2026"
  };
}

/**
 * Sum spending for a group within a date range.
 * Uses two-step query pattern:
 * 1. Get celebration IDs for group within date range
 * 2. Sum contribution amounts for those celebration IDs
 *
 * @returns Total spending in dollars
 */
async function getSpendingInRange(
  groupId: string,
  start: Date,
  end: Date
): Promise<number> {
  // Step 1: Get celebration IDs for group within date range
  // event_date is DATE type, so use ISO date strings (YYYY-MM-DD)
  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];

  const { data: celebrations, error: celError } = await supabase
    .from('celebrations')
    .select('id')
    .eq('group_id', groupId)
    .gte('event_date', startDate)
    .lt('event_date', endDate);

  if (celError) {
    console.error('Failed to fetch celebrations for budget:', celError);
    return 0;
  }

  if (!celebrations || celebrations.length === 0) {
    return 0;
  }

  const celebrationIds = celebrations.map((c: { id: string }) => c.id);

  // Step 2: Sum contributions for those celebrations
  // contribution.amount is NUMERIC in DOLLARS
  const { data: contributions, error: contError } = await supabase
    .from('celebration_contributions')
    .select('amount')
    .in('celebration_id', celebrationIds);

  if (contError) {
    console.error('Failed to fetch contributions for budget:', contError);
    return 0;
  }

  if (!contributions || contributions.length === 0) {
    return 0;
  }

  // Sum dollar amounts
  return contributions.reduce(
    (sum: number, c: { amount: number | string }) => sum + Number(c.amount),
    0
  );
}

/**
 * Get the budget status for a group.
 *
 * Returns null if no budget is configured (approach is null).
 * For per_gift: returns status with spent=0 (suggestion only, no pool tracking).
 * For monthly/yearly: queries contributions within the period and calculates spending.
 *
 * @param groupId - The group UUID
 * @returns BudgetStatus or null if no budget configured
 */
export async function getGroupBudgetStatus(
  groupId: string
): Promise<BudgetStatus | null> {
  // 1. Fetch group's budget config
  const { data: group, error } = await supabase
    .from('groups')
    .select('budget_approach, budget_amount, created_at')
    .eq('id', groupId)
    .single();

  if (error || !group) {
    console.error('Failed to fetch group budget config:', error);
    return null;
  }

  // No budget configured
  if (!group.budget_approach) {
    return null;
  }

  const approach = group.budget_approach as 'per_gift' | 'monthly' | 'yearly';

  // Convert budget_amount from cents to dollars
  const budgetAmountDollars = (group.budget_amount || 0) / 100;

  // Per-gift: suggestion only, no spending calculation
  if (approach === 'per_gift') {
    return {
      approach: 'per_gift',
      budgetAmount: budgetAmountDollars,
      spent: 0,
      remaining: budgetAmountDollars,
      percentage: 0,
      periodLabel: 'Per gift suggestion',
      isOverBudget: false,
      thresholdLevel: 'normal',
    };
  }

  // Monthly or yearly: calculate spending
  const now = new Date();
  const { start, end, label } = getDateRange(approach, group.created_at, now);
  const spent = await getSpendingInRange(groupId, start, end);

  const remaining = budgetAmountDollars - spent;
  const percentage = budgetAmountDollars > 0
    ? (spent / budgetAmountDollars) * 100
    : 0;
  const isOverBudget = spent >= budgetAmountDollars;
  const thresholdLevel = getThresholdLevel(percentage);

  return {
    approach,
    budgetAmount: budgetAmountDollars,
    spent,
    remaining,
    percentage,
    periodLabel: label,
    isOverBudget,
    thresholdLevel,
  };
}
