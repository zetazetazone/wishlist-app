# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** v1.3 Phase 19 — Gift Claims UI (in progress)

## Current Position

Phase: 19 of 22 (Gift Claims UI) — IN PROGRESS
Plan: 4/5 complete (19-04)
Status: In progress
Last activity: 2026-02-05 — Completed 19-04 (celebrant taken view)

Progress: [##########] 100% v1.0+v1.1+v1.2 | [######....] 60% v1.3 (6/~10 plans)

## Milestone History

- **v1.0 MVP** - Shipped 2026-02-02 (5 phases, 10 plans + 1 gap closure)
- **v1.1 Polish** - Shipped 2026-02-03 (5 phases, 13 plans including gap closures)
- **v1.2 Group Experience** - Shipped 2026-02-05 (7 phases, 18 plans including gap closures)

## Accumulated Context

### Decisions

Key decisions from v1.0/v1.1/v1.2 archived in PROJECT.md Key Decisions table.

**v1.3 Architectural Decisions:**
- Separate `gift_claims` table (NOT columns on wishlist_items) — prevents RLS leaks
- Atomic claiming via PostgreSQL RPC function with SELECT FOR UPDATE SKIP LOCKED
- SECURITY DEFINER function for celebrant partial visibility (sees "taken" not claimer)
- `personal_details` table with JSONB for flexible storage (avoids schema bloat)
- `member_notes` table with subject-exclusion RLS pattern (new pattern)
- Three RLS patterns coexist: full exclusion (chat), partial visibility (claims), subject exclusion (notes)

**Phase 18 Decisions (18-01):**
- item_type guard in claim_item() blocks claiming surprise_me and mystery_box items
- NULL group_id guard prevents claiming personal items without group context
- Full/split mutual exclusion: full claims block splits, existing splits block full claims
- EXCEPTION WHEN unique_violation as race-condition safety net
- Omitted pg_jsonschema -- client-side validation sufficient

**Phase 18 Decisions (18-02):**
- JSONB typed via separate interfaces (PersonalSizes, PersonalPreferences, ExternalLink) for reuse
- Claims: RPC for mutations, direct queries for reads
- Graceful degradation: read functions return empty arrays on error, mutation functions throw
- personalDetails upsert casts through `unknown` to satisfy Supabase JSONB column types

**Phase 19 Decisions (19-01):**
- ClaimButton: Three visual states (claim/unclaim/loading), disabled returns null for special items
- ClaimerAvatar: Modal popup for name reveal (better touch targets than tooltip)
- TakenBadge: Gift icon only, no text (per CONTEXT decision)
- YourClaimIndicator: MostWantedBadge pattern with burgundy colors

**Phase 19 Decisions (19-02):**
- TakenBadge positioned in actions row (right of header) alongside favorite heart
- ClaimerAvatar positioned before FavoriteHeart in actions row
- YourClaimIndicator positioned below MostWantedBadge, above title
- ClaimButton as separate section below View Product button
- Dimmed opacity 0.6 for celebrant taken view

**Phase 19 Decisions (19-04):**
- TakenCounter positioned in header row alongside gift count text (horizontal layout)
- Claim statuses stored in Map<string, boolean> for O(1) lookup
- Items sorted via useMemo with taken items at bottom, preserving priority within status

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
- Split contribution integration approach: uses gift_claims.claim_type='split' with amount column (decided in 18-01)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix budget per_gift check constraint violation | 2026-02-05 | a9da654 | [001-fix-budget-per-gift-constraint](./quick/001-fix-budget-per-gift-constraint/) |
| 002 | Fix per-gift budget amount not persisted | 2026-02-05 | 84bb2fa | [002-fix-per-gift-budget-not-persisted](./quick/002-fix-per-gift-budget-not-persisted/) |
| 003 | Fix budget display stale after settings save | 2026-02-05 | 6809669 | [003-fix-budget-display-stale-on-nav](./quick/003-fix-budget-display-stale-on-nav/) |

## Session Continuity

Last session: 2026-02-05
Stopped at: Completed 19-04-PLAN.md (celebrant taken view)
Resume file: None
Next: `/gsd:execute-plan 19-05` — Testing and polish
