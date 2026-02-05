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
 */

export interface BudgetStatus {
  approach: 'per_gift' | 'monthly' | 'yearly';
  budgetAmount: number;       // in dollars (converted from cents)
  spent: number;              // in dollars (sum of contributions)
  remaining: number;          // budgetAmount - spent (can be negative)
  percentage: number;         // spent / budgetAmount * 100 (capped at 100 for bar, actual for display)
  periodLabel: string;        // e.g. "January 2026", "Feb 2025 - Feb 2026"
  isOverBudget: boolean;      // spent > budgetAmount
  thresholdLevel: 'normal' | 'warning' | 'danger' | 'over';
}

// TODO: Implement in GREEN phase
export async function getGroupBudgetStatus(
  _groupId: string
): Promise<BudgetStatus | null> {
  throw new Error('Not implemented');
}
