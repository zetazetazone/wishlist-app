# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** v1.4 Friends System — Phase 23: Database Foundation

## Current Position

Phase: 23 of 6 (Database Foundation)
Plan: 1 of 1 complete
Status: Phase complete
Last activity: 2026-02-09 — Completed 23-01 Database Foundation

Progress: [##########] 100% v1.0+v1.1+v1.2+v1.3 | [#         ] 17% v1.4 (1/6 phases)

## v1.4 Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 23 | Database Foundation | Foundation for all | Complete |
| 24 | Friend Core Services & Tab | FRND-05,06 FTAB-01,02,05 | Not started |
| 25 | Friend Requests Flow | FRND-01-04,07-09 FTAB-03 | Not started |
| 26 | Contact Import & Discovery | DISC-01-06 FTAB-04 | Not started |
| 27 | Public Dates Management | DATE-01-05 | Not started |
| 28 | Calendar Integration | FCAL-01-05 | Not started |

## Milestone History

- **v1.0 MVP** - Shipped 2026-02-02 (5 phases, 10 plans + 1 gap closure)
- **v1.1 Polish** - Shipped 2026-02-03 (5 phases, 13 plans including gap closures)
- **v1.2 Group Experience** - Shipped 2026-02-05 (7 phases, 18 plans including gap closures)
- **v1.3 Gift Claims & Personal Details** - Shipped 2026-02-09 (5 phases, 15 plans including gap closures)

## Accumulated Context

### Decisions

Key decisions from v1.0/v1.1/v1.2/v1.3 archived in PROJECT.md Key Decisions table and previous STATE.md versions.

**v1.4 Architectural Decisions (from research):**
- `friends` table with ordered bidirectional constraint (`user_a_id < user_b_id`) prevents duplicate rows
- `friend_requests` table with status enum (pending/accepted/rejected/blocked)
- `public_dates` table with month/day storage for annual recurrence
- `are_friends()` helper function centralizes bidirectional query logic for RLS policies
- Phone number normalization to E.164 format via `libphonenumber-js`
- Friend dates use teal color in calendar, group dates use varied colors
- iOS 18 limited contact access handled via `accessPrivileges` property check
- Rate limiting: max 20 friend requests per hour per user

**Phase 23 Decisions:**
- No direct INSERT on friends table - friendships created only via accept_friend_request RPC
- Partial unique index on friend_requests uses LEAST/GREATEST for bidirectional dedup

### Pending Todos (Manual Setup)

From v1.0/v1.1:
1. Deploy Edge Function: `npx supabase functions deploy push`
2. Configure webhook following `docs/WEBHOOK-SETUP.md`
3. Create `avatars` storage bucket (public)
4. Enable pg_cron extension in Supabase Dashboard
5. Build development client: `npx eas build --profile development`

From v1.4 Phase 23:
6. Start Docker Desktop and run `npx supabase db reset` to apply migration

### Blockers/Concerns

- Pre-existing TypeScript errors (type exports for Group, WishlistItem) - non-blocking
- npm peer dependency workaround (--legacy-peer-deps) for React 19 - acceptable
- Phase 26 needs deeper research: `libphonenumber-js` integration, iOS 18 permission edge cases
- Docker not running blocked local migration verification (Phase 23)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix budget per_gift check constraint violation | 2026-02-05 | a9da654 | [001-fix-budget-per-gift-constraint](./quick/001-fix-budget-per-gift-constraint/) |
| 002 | Fix per-gift budget amount not persisted | 2026-02-05 | 84bb2fa | [002-fix-per-gift-budget-not-persisted](./quick/002-fix-per-gift-budget-not-persisted/) |
| 003 | Fix budget display stale after settings save | 2026-02-05 | 6809669 | [003-fix-budget-display-stale-on-nav](./quick/003-fix-budget-display-stale-on-nav/) |
| 004 | Add delivery address and bank details to personal details | 2026-02-09 | 2bfe625 | [004-add-delivery-address-and-bank-details-to](./quick/004-add-delivery-address-and-bank-details-to/) |

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed Phase 23 Plan 01
Resume file: None
Next: /gsd:plan-phase 24
