# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** v1.3 Phase 18 — Schema & Atomic Functions

## Current Position

Phase: 18 of 22 (Schema & Atomic Functions)
Plan: — (phase not yet planned)
Status: Ready to plan
Last activity: 2026-02-05 — Roadmap created for v1.3 (5 phases, 30 requirements)

Progress: [##########] 100% v1.0+v1.1+v1.2 | [......................] 0% v1.3

## Milestone History

- **v1.0 MVP** - Shipped 2026-02-02 (5 phases, 10 plans + 1 gap closure)
- **v1.1 Polish** - Shipped 2026-02-03 (5 phases, 13 plans including gap closures)
- **v1.2 Group Experience** - Shipped 2026-02-05 (7 phases, 18 plans including gap closures)

## Accumulated Context

### Decisions

Key decisions from v1.0/v1.1/v1.2 archived in PROJECT.md Key Decisions table.

**v1.3 Architectural Decisions:**
- Separate `gift_claims` table (NOT columns on wishlist_items) — prevents RLS leaks
- Atomic claiming via PostgreSQL RPC function (`UPDATE WHERE claimed_by IS NULL`)
- SECURITY DEFINER function for celebrant partial visibility (sees "taken" not claimer)
- `personal_details` table with JSONB for flexible storage (avoids schema bloat)
- `member_notes` table with subject-exclusion RLS pattern (new pattern)
- Three RLS patterns coexist: full exclusion (chat), partial visibility (claims), subject exclusion (notes)

### Pending Todos (Manual Setup)

From v1.0/v1.1:
1. Deploy Edge Function: `npx supabase functions deploy push`
2. Configure webhook following `docs/WEBHOOK-SETUP.md`
3. Create `avatars` storage bucket (public)
4. Enable pg_cron extension in Supabase Dashboard
5. Build development client: `npx eas build --profile development`

### Blockers/Concerns

- Pre-existing TypeScript errors (type exports for Group, WishlistItem) - non-blocking
- npm peer dependency workaround (--legacy-peer-deps) for React 19 - acceptable
- Split contribution integration approach TBD: extend `celebration_contributions` vs separate table

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix budget per_gift check constraint violation | 2026-02-05 | a9da654 | [001-fix-budget-per-gift-constraint](./quick/001-fix-budget-per-gift-constraint/) |
| 002 | Fix per-gift budget amount not persisted | 2026-02-05 | 84bb2fa | [002-fix-per-gift-budget-not-persisted](./quick/002-fix-per-gift-budget-not-persisted/) |
| 003 | Fix budget display stale after settings save | 2026-02-05 | 6809669 | [003-fix-budget-display-stale-on-nav](./quick/003-fix-budget-display-stale-on-nav/) |

## Session Continuity

Last session: 2026-02-05
Stopped at: Roadmap created for v1.3 — 5 phases (18-22), 30 requirements mapped
Resume file: None
Next: `/gsd:plan-phase 18` to plan Schema & Atomic Functions
