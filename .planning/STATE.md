# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** v1.6 Wishlist UI Redesign

## Current Position

Phase: 34 (Grid Layout Implementation) - IN PROGRESS
Plan: 1 of 5 complete
Status: In progress - WishlistGridCard component created
Last activity: 2026-02-12 — Completed 34-01-PLAN.md (Grid Card Component)

Progress: 1/4 phases complete
Phase 33 Progress: ████ 2/2 complete
Phase 34 Progress: █░░░░ 1/5 plans complete

## Milestone History

- **v1.0 MVP** - Shipped 2026-02-02 (5 phases, 10 plans)
- **v1.1 Polish** - Shipped 2026-02-03 (5 phases, 13 plans)
- **v1.2 Group Experience** - Shipped 2026-02-05 (7 phases, 18 plans)
- **v1.3 Gift Claims & Personal Details** - Shipped 2026-02-09 (5 phases, 15 plans)
- **v1.4 Friends System** - Shipped 2026-02-10 (6 phases, 12 plans)
- **v1.5 Localization** - Shipped 2026-02-12 (4 phases, 13 plans)

## Accumulated Context

### Decisions

Key decisions from all milestones archived in PROJECT.md Key Decisions table.

v1.5 decisions archived in `.planning/milestones/v1.5-ROADMAP.md`.

**v1.6 Phase 33 Decisions**:

| ID | Decision | Rationale | Phase-Plan |
|---|----------|-----------|------------|
| D33-01-001 | Use expo-image for image handling | High-performance caching, SDK 54 compatible, built-in loading states | 33-01 |
| D33-01-002 | Comprehensive upfront documentation | 603-line monolithic component needs clear migration path to prevent feature loss | 33-01 |

**v1.6 Phase 34 Decisions**:

| ID | Decision | Rationale | Phase-Plan |
|---|----------|-----------|------------|
| TD-34-01-001 | Use Pressable instead of TouchableOpacity | Future-proof, officially recommended by React Native, consistent cross-platform behavior | 34-01 |
| TD-34-01-002 | Non-null assertion on image_url after hasImage check | hasImage already validates image_url exists and is standard item type | 34-01 |
| TD-34-01-003 | Action button separate Pressable with stopPropagation | Prevents touch conflicts on nested pressables, works consistently iOS/Android | 34-01 |
| TD-34-01-004 | Single default blurhash for all images | Simpler implementation, acceptable UX for v1.6 | 34-01 |

### Pending Todos (Manual Setup)

From v1.0/v1.1:
1. Deploy Edge Function: `npx supabase functions deploy push`
2. Configure webhook following `docs/WEBHOOK-SETUP.md`
3. Create `avatars` storage bucket (public)
4. Enable pg_cron extension in Supabase Dashboard
5. Build development client: `npx eas build --profile development`

From v1.4:
6. Run `npx supabase db reset` to apply all migrations

### Blockers/Concerns

- Pre-existing TypeScript errors (type exports for Group, WishlistItem, FlashList estimatedItemSize) - non-blocking
- npm peer dependency workaround (--legacy-peer-deps) for React 19 - acceptable

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix budget per_gift check constraint violation | 2026-02-05 | a9da654 | [001-fix-budget-per-gift-constraint](./quick/001-fix-budget-per-gift-constraint/) |
| 002 | Fix per-gift budget amount not persisted | 2026-02-05 | 84bb2fa | [002-fix-per-gift-budget-not-persisted](./quick/002-fix-per-gift-budget-not-persisted/) |
| 003 | Fix budget display stale after settings save | 2026-02-05 | 6809669 | [003-fix-budget-display-stale-on-nav](./quick/003-fix-budget-display-stale-on-nav/) |
| 004 | Add delivery address and bank details to personal details | 2026-02-09 | 2bfe625 | [004-add-delivery-address-and-bank-details-to](./quick/004-add-delivery-address-and-bank-details-to/) |

## Session Continuity

Last session: 2026-02-12
Stopped at: Phase 34 Plan 01 complete (Grid Card Component)
Resume file: .planning/phases/34-grid-layout-implementation/34-01-SUMMARY.md
Next: Phase 34 Plan 02 (Grid Wrapper Component)
