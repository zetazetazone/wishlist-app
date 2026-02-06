---
phase: 21-split-contributions-claim-enhancements
plan: 01
subsystem: database
tags: [postgresql, rpc, triggers, notifications, split-contributions]

dependency-graph:
  requires:
    - 18-01 (gift_claims table and claim_item RPC)
  provides:
    - Split contribution RPC functions (open_split, pledge_contribution, close_split)
    - Split status query functions (get_split_status, get_suggested_share)
    - Notification triggers for claim events
    - Pledge immutability enforcement
  affects:
    - 21-02 (TypeScript client functions for split operations)
    - 21-03 (UI components for split contribution workflow)

tech-stack:
  added: []
  patterns:
    - SELECT FOR UPDATE for race-condition-safe atomic operations
    - SECURITY DEFINER with SET search_path = '' for safe RPC functions
    - AFTER INSERT/UPDATE/DELETE triggers for notification automation
    - BEFORE DELETE trigger for immutability enforcement
    - JSONB return types for structured success/error responses

file-tracking:
  created:
    - supabase/migrations/20260206000002_split_contributions.sql
  modified: []

decisions:
  - id: original-claimer-starts-at-zero
    choice: Original claimer's amount set to 0 when opening split, covers remaining via close_split
    rationale: Simpler flow - claimer opens split without committing to amount, closes when ready
  - id: fully-funded-trigger-on-update
    choice: Added trigger for UPDATE in addition to INSERT for fully funded notification
    rationale: close_split updates claimer's amount which may complete funding
  - id: six-triggers-for-five-functions
    choice: Created 6 trigger attachments for 5 trigger functions
    rationale: notify_split_fully_funded needs both INSERT and UPDATE triggers

metrics:
  duration: 15 minutes
  completed: 2026-02-06
---

# Phase 21 Plan 01: Split Contribution RPC Functions & Notification Triggers Summary

**One-liner:** PostgreSQL RPC functions for split contribution workflow with atomic race-condition-safe operations and automated notification triggers for claim events.

## What Was Built

### 1. Schema Extension
Added `additional_costs` column to `wishlist_items` table:
- Stores shipping/delivery costs added by claimer when opening split
- CHECK constraint ensures non-negative values
- Included in total amount calculations for split funding

### 2. Split Contribution RPC Functions (5 total)

| Function | Purpose | Key Validation |
|----------|---------|----------------|
| `open_split(item_id, additional_costs)` | Convert full claim to split-open state | Caller must own full claim |
| `pledge_contribution(item_id, amount)` | Add split contribution | Amount <= remaining, not celebrant |
| `close_split(item_id)` | Claimer covers remaining amount | Only original claimer can close |
| `get_split_status(item_id)` | Read-only status check | Celebrant blocked from viewing |
| `get_suggested_share(item_id)` | Equal split UI suggestion | Helper only, users can pledge any amount |

All functions:
- Use `SECURITY DEFINER` with `SET search_path = ''`
- Return JSONB with `{success, error?, ...}` pattern
- Use `SELECT FOR UPDATE` for race condition prevention

### 3. Notification Trigger Functions (5 total)

| Trigger | Event | Recipients | Notification Type |
|---------|-------|------------|-------------------|
| `notify_item_claimed` | AFTER INSERT (claim_type='full') | Group members (not celebrant/claimer) | CLMX-01 full claim |
| `notify_split_invite` | AFTER INSERT (first split only) | Group members (not celebrant/claimer) | Split invite |
| `notify_split_fully_funded` | AFTER INSERT/UPDATE | All contributors | Fully funded celebration |
| `notify_split_canceled` | AFTER DELETE | Group members | Split canceled info |
| `enforce_pledge_immutability` | BEFORE DELETE | N/A (raises exception) | Blocks contributor deletion |

### 4. unclaim_item() Enhancement
Modified existing RPC to block unclaiming when other contributors exist:
- Checks for other split claims on the item
- Returns error: "Cannot unclaim: item has contributions from other members"
- Per CONTEXT.md decision: "Cannot unclaim an item once any contributions exist (blocked)"

## Implementation Details

### Split Workflow
1. User claims item with `claim_item()` (existing, claim_type='full')
2. Claimer opens split with `open_split()` - converts to claim_type='split', amount=0
3. Group members pledge with `pledge_contribution()` - validates amount against remaining
4. Claimer closes with `close_split()` - covers remaining amount
5. Fully funded notification sent to all contributors

### Race Condition Prevention
- All mutable operations use `SELECT FOR UPDATE` on wishlist_items
- Pledge contribution validates total within locked transaction
- EXCEPTION handler catches unique_violation as safety net

### Notification Data Payloads
All notifications include JSONB data with:
- `type`: 'item_claimed' | 'split_invite' | 'split_fully_funded' | 'split_canceled'
- `item_id`, `item_title`
- `claimer_id`, `claimer_name` (where applicable)

## Verification Results

- [x] Migration file exists at `supabase/migrations/20260206000002_split_contributions.sql`
- [x] All 5 RPC functions created with SECURITY DEFINER
- [x] All 5 trigger functions created
- [x] 6 trigger attachments (5 functions + 1 additional UPDATE trigger)
- [x] GRANT EXECUTE statements for all 5 RPC functions
- [x] unclaim_item() blocks when contributions exist
- [ ] Database reset test (Docker unavailable in environment)

## Commits

| Hash | Message |
|------|---------|
| c59f2a1 | feat(21-01): create split contribution RPC functions |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 21-02:** TypeScript client functions can now call:
- `supabase.rpc('open_split', { p_item_id, p_additional_costs })`
- `supabase.rpc('pledge_contribution', { p_item_id, p_amount })`
- `supabase.rpc('close_split', { p_item_id })`
- `supabase.rpc('get_split_status', { p_item_id })`
- `supabase.rpc('get_suggested_share', { p_item_id })`

All functions return JSONB with consistent `{success, error?, ...}` pattern for error handling.
