# Phase 17: Budget Tracking - Research

**Researched:** 2026-02-05
**Domain:** Budget calculation service, progress bar UI, group settings UI (React Native / Expo / Supabase)
**Confidence:** HIGH

## Summary

Phase 17 adds budget tracking to an existing React Native (Expo 54) wishlist/birthday-celebration app that uses Supabase as its backend. The schema foundation already exists: `groups.budget_approach` (per_gift | monthly | yearly | null), `groups.budget_amount` (integer, cents), and `groups.created_at` (for yearly anniversary reset) are all in place from Phase 11's v1.2 migration. Contribution data already flows through `celebration_contributions` (per-celebration, NUMERIC amount in dollars) linked to celebrations which have `group_id` and `event_date`.

The core work is: (1) a budget calculation service that queries `celebration_contributions` filtered by group and date range, (2) a horizontal progress bar component with traffic-light color coding, and (3) budget settings UI in the group settings screen using the existing card-based selector pattern from `CreateGroupModal.tsx`. No new database tables or columns are needed. No new npm dependencies are needed -- `date-fns` (v4.1.0, already installed) handles all date boundary math, and React Native's built-in `View` with percentage widths provides the progress bar.

**Primary recommendation:** Build a pure TypeScript budget calculation service (`lib/budget.ts`) that derives spending from existing `celebration_contributions` data, then create a `BudgetProgressBar` component and a `BudgetSettingsSection` component. No schema changes, no new libraries.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | ^4.1.0 | Date boundary calculations (startOfMonth, endOfMonth, addYears) | Already in project, tree-shakeable, used in 7+ files |
| @supabase/supabase-js | ^2.93.3 | Database queries for contribution aggregation | Already the project's data layer |
| react-native (View) | 0.81.5 | Progress bar via percentage-width nested Views | Zero-dependency, matches existing ContributionProgress pattern |
| moti | ^0.30.0 | Entrance animations for budget section | Already used throughout group views |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @expo/vector-icons (MaterialCommunityIcons) | ^15.0.3 | Icons for budget section headers and badges | Budget section headers, threshold indicators |
| expo-linear-gradient | ~15.0.8 | Gradient backgrounds if needed in header summary | Only for header budget summary area |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| View-based progress bar | react-native-progress | Extra dependency for minimal gain; existing ContributionProgress already uses View-based approach |
| date-fns for boundaries | Manual Date math | date-fns is already installed and provides tested edge-case handling for month boundaries |
| Client-side aggregation | Supabase RPC / SQL function | RPC would be more efficient at scale, but for birthday groups (typically <20 celebrations/year), client-side is simpler and matches existing patterns |

**Installation:**
```bash
# No new packages needed. All dependencies already installed.
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
  budget.ts            # Budget calculation service (NEW)
components/
  groups/
    BudgetProgressBar.tsx    # Progress bar with traffic-light colors (NEW)
    BudgetSettingsSection.tsx # Budget approach/amount settings card (NEW)
app/
  group/
    [id]/
      index.tsx        # Add budget summary in header area (MODIFY)
      settings.tsx     # Add budget settings section (MODIFY)
utils/
  groups.ts            # Add updateGroupBudget function (MODIFY)
```

### Pattern 1: Budget Calculation Service (Pure TypeScript, No UI)
**What:** A service module that computes budget spending by querying `celebration_contributions` joined through `celebrations` filtered by group and date range, returning `{ spent: number, budget: number, approach: string, periodLabel: string }`.
**When to use:** Called by any component that needs to display budget status.
**Example:**
```typescript
// lib/budget.ts
import { supabase } from './supabase';
import { startOfMonth, endOfMonth, addYears, parseISO } from 'date-fns';

export interface BudgetStatus {
  approach: 'per_gift' | 'monthly' | 'yearly' | null;
  budgetAmount: number | null;    // in cents
  totalSpent: number;             // in cents
  periodLabel: string;            // e.g. "January 2026" or "Year 2 (Feb 2026 - Feb 2027)"
  periodStart: Date;
  periodEnd: Date;
}

export async function getGroupBudgetStatus(
  groupId: string
): Promise<BudgetStatus | null> {
  // 1. Fetch group's budget config
  const { data: group } = await supabase
    .from('groups')
    .select('budget_approach, budget_amount, created_at')
    .eq('id', groupId)
    .single();

  if (!group?.budget_approach) return null;

  // 2. Calculate period boundaries based on approach
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;
  let periodLabel: string;

  if (group.budget_approach === 'monthly') {
    periodStart = startOfMonth(now);
    periodEnd = endOfMonth(now);
    periodLabel = format(now, 'MMMM yyyy');
  } else if (group.budget_approach === 'yearly') {
    // Anniversary-based: group.created_at determines the year boundary
    const createdAt = parseISO(group.created_at);
    // ... calculate anniversary period
  } else {
    // per_gift: no period tracking needed
    return { approach: 'per_gift', budgetAmount: group.budget_amount, totalSpent: 0, periodLabel: 'Per Gift', periodStart: now, periodEnd: now };
  }

  // 3. Query celebration_contributions within period
  const { data: contributions } = await supabase
    .from('celebration_contributions')
    .select('amount, celebrations!inner(group_id, event_date)')
    .eq('celebrations.group_id', groupId)
    .gte('celebrations.event_date', periodStart.toISOString())
    .lte('celebrations.event_date', periodEnd.toISOString());

  // 4. Sum and return
  const totalSpent = (contributions || []).reduce(
    (sum, c) => sum + Math.round(Number(c.amount) * 100), 0
  );

  return { approach: group.budget_approach, budgetAmount: group.budget_amount, totalSpent, periodLabel, periodStart, periodEnd };
}
```

### Pattern 2: Traffic-Light Progress Bar (View-Based, No Library)
**What:** A horizontal progress bar using nested `View` components with dynamic background color based on fill percentage.
**When to use:** Budget display in group view header summary and dedicated budget section.
**Example:**
```typescript
// Follows existing ContributionProgress.tsx pattern
const getBarColor = (percent: number): string => {
  if (percent >= 90) return colors.error;      // Red - #DC2626
  if (percent >= 75) return colors.warning;    // Yellow/amber - #F59E0B
  return colors.success;                        // Green - #2D7A4F
};

// Progress bar is a View with percentage width, same as ContributionProgress
<View style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
  <View style={{
    height: '100%',
    width: `${Math.min(percent, 100)}%`,
    backgroundColor: getBarColor(percent),
    borderRadius: 4,
  }} />
</View>
```

### Pattern 3: Budget Settings Card Selector (Reuse Create Group Pattern)
**What:** Card-based approach selector matching the existing `CreateGroupModal.tsx` budget approach UI, wrapped in the `SettingsSection` component already used in `settings.tsx`.
**When to use:** Group settings screen, admin-only section for configuring budget.
**Example:**
```typescript
// Reuse the radio-card pattern from CreateGroupModal lines 380-541
// Wrap in SettingsSection component from settings.tsx lines 743-791
<SettingsSection title="Budget" icon="cash-multiple">
  {/* Approach cards: per_gift, monthly, yearly, none */}
  {/* Amount input (visible when approach selected) */}
  {/* Confirmation dialog on approach change */}
</SettingsSection>
```

### Pattern 4: Contribution-to-Spending Data Flow
**What:** Spending is derived by joining `celebration_contributions` -> `celebrations` (via `celebration_id`) -> filtering by `group_id` and date range on `event_date`.
**When to use:** All budget calculations.
**Key insight:** Contributions are stored in dollars as NUMERIC (not cents), while `groups.budget_amount` is stored in cents as INTEGER. The service must convert between these: multiply contribution amounts by 100 to compare with budget_amount, or divide budget_amount by 100 for display.

### Anti-Patterns to Avoid
- **Storing computed spending totals in the database:** Spending should always be derived from `celebration_contributions` to stay in sync. No denormalized `total_spent` column.
- **Using a timer/interval for budget period resets:** Period boundaries are calculated on-demand from dates, not triggered by cron jobs or timers.
- **Blocking contributions when over budget:** Per user decision, this is a soft limit. The progress bar shows over-budget state but never prevents contributions.
- **Creating a separate "budget_spending" table:** No new tables needed; contributions already contain all necessary data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Month start/end calculation | Manual `new Date(year, month, 0)` math | `date-fns` `startOfMonth` / `endOfMonth` | Handles edge cases (DST transitions, different month lengths) correctly |
| Anniversary date calculation | Manual year arithmetic | `date-fns` `addYears` / `differenceInYears` | Leap year handling, timezone safety |
| Currency formatting | `amount.toFixed(2)` everywhere | Centralized `formatCurrency()` utility | Already exists in `ContributionProgress.tsx` line 19-21; extract and reuse |
| Progress bar component | Custom animated SVG | Nested `View` with percentage width | Matches existing `ContributionProgress.tsx` pattern exactly; zero dependencies |
| Card-based selector | New custom toggle component | Copy pattern from `CreateGroupModal.tsx` | Consistency with existing UX; user decision explicitly requires this pattern |

**Key insight:** This phase has no novel UI or data problems. Every pattern already exists in the codebase -- the budget progress bar is essentially `ContributionProgress` with different colors, and the settings UI is essentially `CreateGroupModal`'s budget section wrapped in `SettingsSection`.

## Common Pitfalls

### Pitfall 1: Currency Unit Mismatch (Dollars vs Cents)
**What goes wrong:** `celebration_contributions.amount` is NUMERIC in dollars (e.g., 25.50), but `groups.budget_amount` is INTEGER in cents (e.g., 2550). Displaying or comparing without conversion shows wildly wrong numbers.
**Why it happens:** Two different schemas designed at different times with different conventions.
**How to avoid:** Convert early and consistently. The budget service should normalize everything to cents internally, and convert to dollars only at the display layer. Add clear JSDoc comments on every function parameter documenting the unit.
**Warning signs:** Budget showing "$2,550 spent" when only $25.50 was contributed; or showing 1% progress when it should be 100%.

### Pitfall 2: Yearly Anniversary Off-By-One
**What goes wrong:** The yearly budget period is supposed to reset on the group creation anniversary. If `created_at` is "2025-03-15" and today is "2026-03-15", is today the last day of year 1 or the first day of year 2?
**Why it happens:** Ambiguity in whether the boundary day belongs to the old or new period.
**How to avoid:** Define clearly: the anniversary date is the START of the new period. Use `date-fns` `addYears(createdDate, n)` for the nth anniversary. The period is `[anniversaryN, anniversaryN+1)` (inclusive start, exclusive end).
**Warning signs:** Contributions on the exact anniversary date being counted in the wrong period.

### Pitfall 3: Querying Contributions Through Celebrations Join
**What goes wrong:** Supabase's `.select()` with nested table filters (e.g., `celebrations!inner(group_id, event_date)`) can be tricky. The filter on the nested table might not work as expected with `.eq()` chaining.
**Why it happens:** Supabase PostgREST syntax for filtering through foreign key relationships requires specific syntax.
**How to avoid:** Use the explicit join filter syntax: `.eq('celebrations.group_id', groupId)` after the `!inner` join in the select. Alternatively, do a two-step query: first get celebration IDs for the group+period, then sum contributions for those celebration IDs. The two-step approach is more readable and matches existing patterns in `lib/celebrations.ts`.
**Warning signs:** Query returning contributions from other groups or outside the date range.

### Pitfall 4: Per-Gift Approach Has No Pool to Track
**What goes wrong:** Trying to show a "spent vs budget" progress bar for per_gift approach when it's just a suggested limit per celebration.
**Why it happens:** Treating all three approaches identically in the UI.
**How to avoid:** Per user decision: per_gift is a "suggested limit only (guideline displayed as reference, not tracked against a pool)". The UI should show the per-gift amount as a reference label on individual celebrations, NOT as a progress bar. The budget progress bar section in the group view should only appear for monthly/yearly approaches. For per_gift, show a simple text label like "Suggested: $50 per gift".
**Warning signs:** A progress bar appearing for per_gift groups with meaningless numbers.

### Pitfall 5: Empty State When No Contributions Exist
**What goes wrong:** Division by zero or confusing UI when budget is configured but no celebrations have happened yet in the current period.
**Why it happens:** Not handling the zero-contributions case explicitly.
**How to avoid:** When totalSpent is 0, show the progress bar at 0% with a friendly message like "$0 / $500 spent this month". The progress bar should render at 0% width (still visible as the track/background).
**Warning signs:** Blank budget section, NaN in display, or crashing on zero division.

### Pitfall 6: Switching Budget Approach Mid-Period
**What goes wrong:** User switches from monthly to yearly. Historical contributions exist for the monthly period but don't map cleanly to a yearly period.
**Why it happens:** Period boundaries change when the approach changes, so the "spending in current period" calculation changes meaning.
**How to avoid:** Per user decision: "Keep all spending history when switching approaches (no data reset)." When switching to yearly, recalculate from all contributions in the new yearly period (which may include months already tracked under monthly). The calculation is always derived from raw contribution data + current approach + current period boundaries.
**Warning signs:** Spending resetting to $0 when switching approaches, or double-counting.

## Code Examples

### Date Boundary Calculations with date-fns

```typescript
// Source: date-fns v4.x (already installed at ^4.1.0)
import {
  startOfMonth, endOfMonth,
  addYears, differenceInYears,
  parseISO, format, isWithinInterval,
} from 'date-fns';

// Monthly period boundaries
function getMonthlyPeriod(now: Date): { start: Date; end: Date; label: string } {
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
    label: format(now, 'MMMM yyyy'), // "January 2026"
  };
}

// Yearly period boundaries (anniversary-based)
function getYearlyPeriod(
  now: Date,
  groupCreatedAt: string
): { start: Date; end: Date; label: string } {
  const created = parseISO(groupCreatedAt);
  const yearsElapsed = differenceInYears(now, created);
  const periodStart = addYears(created, yearsElapsed);
  const periodEnd = addYears(created, yearsElapsed + 1);

  // Handle edge: if now is exactly on anniversary, yearsElapsed
  // already accounts for it correctly with differenceInYears
  return {
    start: periodStart,
    end: periodEnd,
    label: `Year ${yearsElapsed + 1}`,
  };
}
```

### Two-Step Contribution Aggregation (Matches Existing Pattern)

```typescript
// Source: follows pattern from lib/celebrations.ts getCelebrations()
// Step 1: Get celebration IDs for group within date range
const { data: celebrations } = await supabase
  .from('celebrations')
  .select('id')
  .eq('group_id', groupId)
  .gte('event_date', periodStart.toISOString().split('T')[0])
  .lte('event_date', periodEnd.toISOString().split('T')[0]);

if (!celebrations || celebrations.length === 0) {
  return { totalSpent: 0 };
}

const celebrationIds = celebrations.map(c => c.id);

// Step 2: Sum contributions for those celebrations
const { data: contributions } = await supabase
  .from('celebration_contributions')
  .select('amount')
  .in('celebration_id', celebrationIds);

// Amount is NUMERIC in dollars, convert to cents for comparison with budget_amount
const totalSpentCents = (contributions || []).reduce(
  (sum, c) => sum + Math.round(Number(c.amount) * 100),
  0
);
```

### Traffic-Light Progress Bar Component

```typescript
// Source: extends pattern from components/celebrations/ContributionProgress.tsx
import { View, Text } from 'react-native';
import { colors } from '../../constants/theme';

function getBarColor(percent: number): string {
  if (percent >= 90) return colors.error;    // Red (#DC2626)
  if (percent >= 75) return colors.warning;  // Amber (#F59E0B)
  return colors.success;                      // Green (#2D7A4F)
}

function getThresholdLabel(percent: number): string | null {
  if (percent >= 90) return 'Almost at budget';
  if (percent >= 75) return 'Nearing budget';
  return null;
}

// Progress bar rendering (same nested-View pattern as ContributionProgress)
<View style={{ height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
  <View
    style={{
      height: '100%',
      width: `${Math.min(percent, 100)}%`,
      backgroundColor: getBarColor(percent),
      borderRadius: 5,
    }}
  />
</View>
// Over-budget: show bar at 100% width with red color + "Over budget" label
```

### Budget Settings Update Function

```typescript
// Source: follows pattern from utils/groups.ts updateGroupMode()
export interface UpdateGroupBudgetOptions {
  budget_approach: 'per_gift' | 'monthly' | 'yearly' | null;
  budget_amount: number | null; // in cents, null for per_gift or removing budget
}

export async function updateGroupBudget(
  groupId: string,
  options: UpdateGroupBudgetOptions
) {
  try {
    const { data, error } = await supabase
      .from('groups')
      .update({
        budget_approach: options.budget_approach,
        budget_amount: options.budget_amount,
      })
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `date-fns` v3 with CommonJS | `date-fns` v4 with ESM-first, tree-shakeable | 2024 | Import individual functions, not the whole library; already done correctly in project |
| Supabase JS v1 `.select()` | Supabase JS v2 with TypeScript generics | 2023 | Type-safe queries; project already uses v2 patterns |
| Custom progress bar libraries (react-native-progress) | View-based progress bars | Standard practice | No extra dependency; matches existing codebase pattern |

**Deprecated/outdated:**
- `budget_limit_per_gift` column on `groups`: This is the legacy column from the initial schema. The v1.2 migration added `budget_approach` and `budget_amount` as the new system. The old column is kept for backward compatibility (default 50, set on group creation) but should NOT be used for Phase 17 budget tracking.

## Open Questions

1. **Over-budget progress bar rendering**
   - What we know: User decided "soft limit" and "visual-only warning." The bar should show red at 90%+.
   - What's unclear: When spending exceeds 100% of budget, should the bar stay at 100% full (with a label "Over budget by $X"), or should it overflow visually (e.g., bar extends past its container)?
   - Recommendation: Keep bar at 100% width but change to red with an "Over budget" label showing the overage amount. Simpler implementation, cleaner UX. This is in Claude's Discretion area.

2. **Per-gift celebration indicator**
   - What we know: User decided "subtle indicator when a celebration exceeds the suggested amount."
   - What's unclear: Where exactly this indicator appears -- on the celebration detail screen's contribution progress, or on the member card in group view?
   - Recommendation: Show on the existing `ContributionProgress` component in the celebration detail view. Add a small text label like "Above suggested $50" when `totalContributed > budget_amount / 100`. This is the most natural place since contributions are visible there.

3. **Budget display in group view header vs. dedicated section**
   - What we know: User decided both: "summary in group view header" and "dedicated section below members."
   - What's unclear: How much detail in each location.
   - Recommendation: Header shows compact one-liner (e.g., "$120 / $500 this month" with a small inline progress bar). Dedicated section shows full progress bar, period label, threshold label, and breakdown context. This avoids redundancy while serving both glance and detail use cases.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct reading of all relevant source files:
  - `types/database.types.ts` - groups table schema with budget_approach, budget_amount
  - `supabase/migrations/20260205000001_v1.2_groups_schema.sql` - budget columns, constraints
  - `supabase/migrations/20260202000005_celebrations.sql` - celebration_contributions schema (NUMERIC amount)
  - `lib/contributions.ts` - existing contribution query patterns
  - `lib/celebrations.ts` - existing celebration query patterns with joins
  - `components/celebrations/ContributionProgress.tsx` - existing progress bar pattern
  - `components/groups/CreateGroupModal.tsx` - existing card-based budget selector
  - `app/group/[id]/settings.tsx` - existing SettingsSection component
  - `app/group/[id]/index.tsx` - group view structure
  - `utils/countdown.ts` - existing date-fns usage patterns
  - `constants/theme.ts` - color palette including semantic colors (success, warning, error)
  - `package.json` - dependency versions (date-fns ^4.1.0, supabase-js ^2.93.3)

### Secondary (MEDIUM confidence)
- **date-fns v4 API** - `startOfMonth`, `endOfMonth`, `addYears`, `differenceInYears`, `format` are stable APIs that have existed since v2. Verified available in v4 via existing project usage of `differenceInDays`, `setYear`, `getYear`, `parseISO`, `format`, `formatDistanceToNow`.
- **Supabase PostgREST join filtering** - The `!inner` join syntax and `.eq('table.column', value)` filtering through relationships is used in existing codebase (`lib/celebrations.ts` line 377-383).

### Tertiary (LOW confidence)
- None. All findings verified through direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new dependencies
- Architecture: HIGH - all patterns derived from existing codebase (ContributionProgress, CreateGroupModal, SettingsSection)
- Pitfalls: HIGH - identified through direct schema analysis (dollars vs cents mismatch, anniversary calculation, join filtering)
- Code examples: HIGH - based on existing code patterns in the same codebase

**Research date:** 2026-02-05
**Valid until:** 2026-03-07 (30 days - stable domain, no fast-moving external dependencies)
