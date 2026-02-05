/**
 * Budget Calculation Service Tests
 *
 * Tests for lib/budget.ts - getGroupBudgetStatus()
 * Tests for utils/groups.ts - updateGroupBudget()
 *
 * Mocks Supabase client to test pure business logic:
 * - Date boundary calculations (monthly, yearly)
 * - Currency conversion (cents to dollars)
 * - Threshold level computation
 * - Period label formatting
 */

// Mock supabase before imports
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockIn = jest.fn();
const mockGte = jest.fn();
const mockLt = jest.fn();
const mockUpdate = jest.fn();

// Chain builder for fluent supabase API
function createChain(finalData: any, finalError: any = null) {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: finalData, error: finalError }),
    update: jest.fn().mockReturnThis(),
  };
  // Make all methods return chain for chaining
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.gte.mockReturnValue(chain);
  chain.lt.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  return chain;
}

const mockFrom = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import { getGroupBudgetStatus, BudgetStatus } from '../lib/budget';

// We'll test updateGroupBudget separately once it exists
// For now we verify its import will work

describe('getGroupBudgetStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Date to a known value for deterministic tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('no budget configured', () => {
    it('returns null when budget_approach is null', async () => {
      // Group with no budget approach
      const groupChain = createChain({
        budget_approach: null,
        budget_amount: null,
        created_at: '2025-06-01T00:00:00Z',
      });
      mockFrom.mockReturnValue(groupChain);

      const result = await getGroupBudgetStatus('group-123');
      expect(result).toBeNull();
    });
  });

  describe('per_gift approach', () => {
    it('returns BudgetStatus with spent=0 and periodLabel for per_gift', async () => {
      // Group with per_gift approach, budget_amount = 5000 cents ($50)
      const groupChain = createChain({
        budget_approach: 'per_gift',
        budget_amount: 5000,
        created_at: '2025-06-01T00:00:00Z',
      });
      mockFrom.mockReturnValue(groupChain);

      const result = await getGroupBudgetStatus('group-123');

      expect(result).not.toBeNull();
      expect(result!.approach).toBe('per_gift');
      expect(result!.budgetAmount).toBe(50); // 5000 cents = $50
      expect(result!.spent).toBe(0);
      expect(result!.remaining).toBe(50);
      expect(result!.percentage).toBe(0);
      expect(result!.periodLabel).toBe('Per gift suggestion');
      expect(result!.isOverBudget).toBe(false);
      expect(result!.thresholdLevel).toBe('normal');
    });
  });

  describe('monthly approach', () => {
    it('calculates spending within current calendar month', async () => {
      // Now is Feb 15, 2026
      // Group has monthly approach, budget = 10000 cents ($100)
      const groupChain = createChain({
        budget_approach: 'monthly',
        budget_amount: 10000,
        created_at: '2025-06-01T00:00:00Z',
      });

      // Celebrations in February 2026
      const celebrationsChain = createChain(null);
      celebrationsChain.single = undefined; // Not calling single for list queries
      celebrationsChain.eq.mockReturnValue(celebrationsChain);
      celebrationsChain.gte.mockReturnValue(celebrationsChain);
      celebrationsChain.lt.mockReturnValue({
        data: [{ id: 'cel-1' }, { id: 'cel-2' }],
        error: null,
      });

      // Contributions for those celebrations: $25.50 + $30.00 = $55.50
      const contributionsChain = createChain(null);
      contributionsChain.single = undefined;
      contributionsChain.in.mockReturnValue({
        data: [{ amount: '25.50' }, { amount: '30.00' }],
        error: null,
      });

      // Setup mockFrom to return different chains based on table
      mockFrom.mockImplementation((table: string) => {
        if (table === 'groups') return groupChain;
        if (table === 'celebrations') return celebrationsChain;
        if (table === 'celebration_contributions') return contributionsChain;
        return createChain(null);
      });

      const result = await getGroupBudgetStatus('group-123');

      expect(result).not.toBeNull();
      expect(result!.approach).toBe('monthly');
      expect(result!.budgetAmount).toBe(100); // 10000 cents = $100
      expect(result!.spent).toBe(55.50);
      expect(result!.remaining).toBeCloseTo(44.50);
      expect(result!.percentage).toBeCloseTo(55.5);
      expect(result!.periodLabel).toBe('February 2026');
      expect(result!.isOverBudget).toBe(false);
      expect(result!.thresholdLevel).toBe('normal');
    });

    it('returns zero spent when no celebrations in current month', async () => {
      const groupChain = createChain({
        budget_approach: 'monthly',
        budget_amount: 10000,
        created_at: '2025-06-01T00:00:00Z',
      });

      const celebrationsChain = createChain(null);
      celebrationsChain.single = undefined;
      celebrationsChain.eq.mockReturnValue(celebrationsChain);
      celebrationsChain.gte.mockReturnValue(celebrationsChain);
      celebrationsChain.lt.mockReturnValue({
        data: [],
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'groups') return groupChain;
        if (table === 'celebrations') return celebrationsChain;
        return createChain(null);
      });

      const result = await getGroupBudgetStatus('group-123');

      expect(result).not.toBeNull();
      expect(result!.spent).toBe(0);
      expect(result!.remaining).toBe(100);
      expect(result!.percentage).toBe(0);
      expect(result!.thresholdLevel).toBe('normal');
    });
  });

  describe('yearly approach', () => {
    it('calculates spending within group anniversary year', async () => {
      // Now is Feb 15, 2026. Group created Jun 1, 2025.
      // Anniversary period: Jun 1, 2025 - Jun 1, 2026
      const groupChain = createChain({
        budget_approach: 'yearly',
        budget_amount: 50000, // $500
        created_at: '2025-06-01T00:00:00Z',
      });

      // Celebrations in period
      const celebrationsChain = createChain(null);
      celebrationsChain.single = undefined;
      celebrationsChain.eq.mockReturnValue(celebrationsChain);
      celebrationsChain.gte.mockReturnValue(celebrationsChain);
      celebrationsChain.lt.mockReturnValue({
        data: [{ id: 'cel-1' }, { id: 'cel-2' }, { id: 'cel-3' }],
        error: null,
      });

      // Contributions: $120 + $80 + $50 = $250
      const contributionsChain = createChain(null);
      contributionsChain.single = undefined;
      contributionsChain.in.mockReturnValue({
        data: [{ amount: '120.00' }, { amount: '80.00' }, { amount: '50.00' }],
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'groups') return groupChain;
        if (table === 'celebrations') return celebrationsChain;
        if (table === 'celebration_contributions') return contributionsChain;
        return createChain(null);
      });

      const result = await getGroupBudgetStatus('group-123');

      expect(result).not.toBeNull();
      expect(result!.approach).toBe('yearly');
      expect(result!.budgetAmount).toBe(500); // 50000 cents = $500
      expect(result!.spent).toBe(250);
      expect(result!.remaining).toBe(250);
      expect(result!.percentage).toBe(50);
      expect(result!.isOverBudget).toBe(false);
      expect(result!.thresholdLevel).toBe('normal');
    });

    it('correctly identifies anniversary period when past first year', async () => {
      // Now is Feb 15, 2026. Group created Mar 1, 2024.
      // Years elapsed = 1 (since Mar 2024 -> Feb 2026 is not yet 2 years)
      // Anniversary period: Mar 1, 2025 - Mar 1, 2026
      const groupChain = createChain({
        budget_approach: 'yearly',
        budget_amount: 30000, // $300
        created_at: '2024-03-01T00:00:00Z',
      });

      const celebrationsChain = createChain(null);
      celebrationsChain.single = undefined;
      celebrationsChain.eq.mockReturnValue(celebrationsChain);
      celebrationsChain.gte.mockReturnValue(celebrationsChain);
      celebrationsChain.lt.mockReturnValue({
        data: [{ id: 'cel-1' }],
        error: null,
      });

      const contributionsChain = createChain(null);
      contributionsChain.single = undefined;
      contributionsChain.in.mockReturnValue({
        data: [{ amount: '75.00' }],
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'groups') return groupChain;
        if (table === 'celebrations') return celebrationsChain;
        if (table === 'celebration_contributions') return contributionsChain;
        return createChain(null);
      });

      const result = await getGroupBudgetStatus('group-123');

      expect(result).not.toBeNull();
      // Period label should reflect the anniversary range
      expect(result!.periodLabel).toMatch(/Mar 2025/);
      expect(result!.periodLabel).toMatch(/Mar 2026/);
      expect(result!.spent).toBe(75);
      expect(result!.budgetAmount).toBe(300);
    });
  });

  describe('threshold levels', () => {
    // Helper to set up a group with specific spending percentage
    function setupMocksForPercentage(spent: number, budget: number) {
      const budgetCents = budget * 100;
      const groupChain = createChain({
        budget_approach: 'monthly',
        budget_amount: budgetCents,
        created_at: '2025-06-01T00:00:00Z',
      });

      const celebrationsChain = createChain(null);
      celebrationsChain.single = undefined;
      celebrationsChain.eq.mockReturnValue(celebrationsChain);
      celebrationsChain.gte.mockReturnValue(celebrationsChain);
      celebrationsChain.lt.mockReturnValue({
        data: [{ id: 'cel-1' }],
        error: null,
      });

      const contributionsChain = createChain(null);
      contributionsChain.single = undefined;
      contributionsChain.in.mockReturnValue({
        data: [{ amount: String(spent) }],
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'groups') return groupChain;
        if (table === 'celebrations') return celebrationsChain;
        if (table === 'celebration_contributions') return contributionsChain;
        return createChain(null);
      });
    }

    it('returns normal for < 75%', async () => {
      setupMocksForPercentage(50, 100); // 50%
      const result = await getGroupBudgetStatus('group-123');
      expect(result!.thresholdLevel).toBe('normal');
    });

    it('returns warning for 75-89%', async () => {
      setupMocksForPercentage(80, 100); // 80%
      const result = await getGroupBudgetStatus('group-123');
      expect(result!.thresholdLevel).toBe('warning');
    });

    it('returns danger for 90-99%', async () => {
      setupMocksForPercentage(95, 100); // 95%
      const result = await getGroupBudgetStatus('group-123');
      expect(result!.thresholdLevel).toBe('danger');
    });

    it('returns over for >= 100%', async () => {
      setupMocksForPercentage(120, 100); // 120%
      const result = await getGroupBudgetStatus('group-123');
      expect(result!.thresholdLevel).toBe('over');
      expect(result!.isOverBudget).toBe(true);
      expect(result!.remaining).toBe(-20);
    });

    it('returns warning at exactly 75%', async () => {
      setupMocksForPercentage(75, 100); // exactly 75%
      const result = await getGroupBudgetStatus('group-123');
      expect(result!.thresholdLevel).toBe('warning');
    });

    it('returns danger at exactly 90%', async () => {
      setupMocksForPercentage(90, 100); // exactly 90%
      const result = await getGroupBudgetStatus('group-123');
      expect(result!.thresholdLevel).toBe('danger');
    });

    it('returns over at exactly 100%', async () => {
      setupMocksForPercentage(100, 100); // exactly 100%
      const result = await getGroupBudgetStatus('group-123');
      expect(result!.thresholdLevel).toBe('over');
      expect(result!.isOverBudget).toBe(true);
      expect(result!.remaining).toBe(0);
    });
  });

  describe('currency conversion', () => {
    it('converts budget_amount from cents to dollars', async () => {
      // budget_amount = 2550 cents should become $25.50
      const groupChain = createChain({
        budget_approach: 'per_gift',
        budget_amount: 2550,
        created_at: '2025-06-01T00:00:00Z',
      });
      mockFrom.mockReturnValue(groupChain);

      const result = await getGroupBudgetStatus('group-123');
      expect(result!.budgetAmount).toBe(25.50);
    });

    it('sums contribution amounts in dollars correctly', async () => {
      const groupChain = createChain({
        budget_approach: 'monthly',
        budget_amount: 10000, // $100
        created_at: '2025-06-01T00:00:00Z',
      });

      const celebrationsChain = createChain(null);
      celebrationsChain.single = undefined;
      celebrationsChain.eq.mockReturnValue(celebrationsChain);
      celebrationsChain.gte.mockReturnValue(celebrationsChain);
      celebrationsChain.lt.mockReturnValue({
        data: [{ id: 'cel-1' }],
        error: null,
      });

      // Contributions: $10.25 + $15.75 + $5.50 = $31.50
      const contributionsChain = createChain(null);
      contributionsChain.single = undefined;
      contributionsChain.in.mockReturnValue({
        data: [
          { amount: '10.25' },
          { amount: '15.75' },
          { amount: '5.50' },
        ],
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'groups') return groupChain;
        if (table === 'celebrations') return celebrationsChain;
        if (table === 'celebration_contributions') return contributionsChain;
        return createChain(null);
      });

      const result = await getGroupBudgetStatus('group-123');
      expect(result!.spent).toBe(31.50);
      expect(result!.remaining).toBeCloseTo(68.50);
      expect(result!.percentage).toBeCloseTo(31.5);
    });
  });
});

describe('updateGroupBudget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates group budget approach and amount', async () => {
    const updatedGroup = {
      id: 'group-123',
      budget_approach: 'monthly',
      budget_amount: 10000,
    };

    const updateChain = createChain(updatedGroup);
    updateChain.update.mockReturnValue(updateChain);

    mockFrom.mockReturnValue(updateChain);

    // Import dynamically to test when it exists
    const { updateGroupBudget } = require('../utils/groups');
    const result = await updateGroupBudget('group-123', {
      approach: 'monthly',
      amount: 10000,
    });

    expect(result.data).toEqual(updatedGroup);
    expect(result.error).toBeNull();
  });

  it('can remove budget by setting approach to null', async () => {
    const updatedGroup = {
      id: 'group-123',
      budget_approach: null,
      budget_amount: null,
    };

    const updateChain = createChain(updatedGroup);
    updateChain.update.mockReturnValue(updateChain);

    mockFrom.mockReturnValue(updateChain);

    const { updateGroupBudget } = require('../utils/groups');
    const result = await updateGroupBudget('group-123', {
      approach: null,
      amount: null,
    });

    expect(result.data).toEqual(updatedGroup);
    expect(result.error).toBeNull();
  });
});
