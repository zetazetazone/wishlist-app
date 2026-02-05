# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** v1.3 Gift Claims & Personal Details

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-05 — Milestone v1.3 started

Progress: [##########] 100% v1.0+v1.1+v1.2 | [....................] 0% v1.3

## Milestone History

- **v1.0 MVP** - Shipped 2026-02-02 (5 phases, 10 plans + 1 gap closure)
  - Full birthday gift coordination with push notifications, secret chat, calendar, and smart reminders

- **v1.1 Polish** - Shipped 2026-02-03 (5 phases, 13 plans including gap closures)
  - Schema foundation, profile editing, special item types, favorite marking, wishlist display polish

- **v1.2 Group Experience** - Shipped 2026-02-05 (7 phases, 18 plans including gap closures)
  - Create group flow, group settings, group view redesign
  - Group modes (greetings/gifts), budget approaches (per-gift/monthly/yearly)
  - Budget tracking with progress indicators

## Accumulated Context

### Decisions

Key decisions from v1.0/v1.1/v1.2 archived in PROJECT.md Key Decisions table.

**v1.2 Decisions (summary):**
- CHECK constraints (not ENUMs) for mode/budget_approach
- budget_amount in cents as INTEGER
- Reuse avatars bucket with groups/ subfolder
- 16:9 aspect ratio for group photos, compressed to 800px width
- is_group_admin() SECURITY DEFINER STABLE helper function
- Route restructured from [id].tsx to [id]/ folder with Stack navigator
- Separate updateGroupInfo/updateGroupMode/updateGroupBudget service functions
- Hard hide (not disabled) for mode-conditional UI elements
- Jest with ts-jest for project test infrastructure
- Traffic-light pattern for budget progress indicators

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

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix budget per_gift check constraint violation | 2026-02-05 | a9da654 | [001-fix-budget-per-gift-constraint](./quick/001-fix-budget-per-gift-constraint/) |
| 002 | Fix per-gift budget amount not persisted | 2026-02-05 | 84bb2fa | [002-fix-per-gift-budget-not-persisted](./quick/002-fix-per-gift-budget-not-persisted/) |
| 003 | Fix budget display stale after settings save | 2026-02-05 | 6809669 | [003-fix-budget-display-stale-on-nav](./quick/003-fix-budget-display-stale-on-nav/) |

## Session Continuity

Last session: 2026-02-05
Stopped at: Starting milestone v1.3 — Gift Claims & Personal Details
Resume file: None
Next: Define requirements and create roadmap for v1.3
