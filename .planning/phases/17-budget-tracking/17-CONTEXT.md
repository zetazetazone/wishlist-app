# Phase 17: Budget Tracking - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Track group spending against budget with visual progress indicators. Admin configures budget approach and amount in settings. All members see budget progress. Spending is derived from existing contribution data. Schema foundation (budget_approach, budget_amount columns) and create-group budget selection already exist from Phases 11/13.

</domain>

<decisions>
## Implementation Decisions

### Budget display
- Budget visible in three places: summary in group view header, dedicated section in group view (below members), and in group settings
- Horizontal progress bar style (filling left to right as budget is spent)
- Minimal detail level: spent vs total (e.g., "$120 / $500")
- Visible to all group members, not admin-only

### Tracking mechanics
- Spending derived automatically from contribution amounts already tracked in celebrations
- Per-gift approach = suggested limit only (guideline displayed as reference, not tracked against a pool)
- Monthly pooled approach uses calendar month boundaries (Jan 1-31, Feb 1-28, etc.)
- Yearly approach resets on group creation anniversary date

### Budget settings UX
- Card-based approach selector matching the create group flow (Phase 13 pattern)
- Always show confirmation dialog when switching budget approaches
- Keep all spending history when switching approaches (no data reset)
- Budget can be removed entirely (admin can turn off budget tracking, set to none)

### Threshold behavior
- Traffic light color coding on progress bar: green (normal) -> yellow (75%+) -> red (90%+)
- Soft limit: over-budget state shown visually but contributions not blocked
- Visual-only warning near limit (color change + small label like "Almost at budget"), no toast notifications
- Per-gift: subtle indicator when a celebration exceeds the suggested amount

### Claude's Discretion
- Progress bar exact styling and animation
- Budget section layout and spacing in group view
- How "over budget" state renders on the progress bar (overflow indicator style)
- Budget amount input validation and formatting
- Empty state when no budget is configured
- How contribution amounts map to spending calculations

</decisions>

<specifics>
## Specific Ideas

- Budget settings should reuse the card-based selector pattern from the create group flow (Phase 13) for consistency
- Traffic light colors should feel natural with the existing app color palette
- Per-gift suggested limit is informational only — distinctly lighter touch than monthly/yearly pool tracking

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-budget-tracking*
*Context gathered: 2026-02-05*
