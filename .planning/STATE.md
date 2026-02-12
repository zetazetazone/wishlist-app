# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** v1.6 Wishlist UI Redesign

## Current Position

Phase: 35 (Detail Page & Claim UI) - COMPLETE
Plan: 3 of 3 complete
Status: Phase complete
Last activity: 2026-02-12 — Completed 35-03-PLAN.md (Navigation & Realtime Sync)

Progress: 3/4 phases complete
Phase 33 Progress: ████ 2/2 complete
Phase 34 Progress: ████ 3/3 complete
Phase 35 Progress: ████ 3/3 complete

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
| TD-34-02-001 | FlashList v2 masonry prop pattern | Use masonry prop instead of deprecated MasonryFlashList component | 34-02 |
| TD-34-02-002 | Omit estimatedItemSize in FlashList v2 | v2 auto-measures items for better accuracy | 34-02 |
| TD-34-02-003 | View-context-aware rendering logic | Three branches: owner, celebrant, non-celebrant for correct prop routing | 34-02 |
| TD-34-02-004 | Conditional RefreshControl | Only render if onRefresh prop provided for flexible reuse | 34-02 |
| TD-34-03-001 | Use index.tsx for My Wishlist tab | _layout.tsx routes "My Wishlist" to index, not wishlist-luxury | 34-03 |
| TD-34-03-002 | Calculated height for nested FlashList | FlashList can't measure when inside ScrollView | 34-03 |
| TD-34-03-003 | Uniform grid (not masonry) | User requirement: rows start and end at same height | 34-03 |
| TD-34-03-004 | 4px card margin for 8px gap | FlashList numColumns doesn't support columnWrapperStyle in types | 34-03 |
| TD-34-03-005 | Action button inside imageContainer | User requirement: button on bottom-right of image | 34-03 |

**v1.6 Phase 35 Decisions**:

| ID | Decision | Rationale | Phase-Plan |
|---|----------|-----------|------------|
| TD-35-01-001 | Use expo-linear-gradient for header overlay | CSS linear-gradient not supported in React Native | 35-01 |
| TD-35-01-002 | Use celebrations.notAuthenticated key | Key already exists, consistent with codebase | 35-01 |
| TD-35-01-003 | Remove description display | WishlistItem type does not have description field | 35-01 |
| 35-02-D01 | Direct claimer object mapping | Map claim.claimer to ClaimerAvatar props directly | 35-02 |
| 35-03-D01 | Use query param celebrationId | Cleaner URL structure vs separate route | 35-03 |
| 35-03-D02 | Parallel fetch item + celebration | Meet <200ms load time target | 35-03 |
| 35-03-D03 | Channel names include item ID | Ensure uniqueness for realtime subscriptions | 35-03 |
| 35-03-D04 | Snake_case SplitStatus properties | Match interface definition from lib/contributions.ts | 35-03 |

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
| 005 | Fix i18n translation keys returning [object Object] | 2026-02-12 | 2cde090 | [005-fix-i18n-translation-keys-returning-obje](./quick/005-fix-i18n-translation-keys-returning-obje/) |

## Session Continuity

Last session: 2026-02-12
Stopped at: Phase 35 complete
Resume file: N/A (phase complete)
Next: Plan Phase 36 (if applicable) or milestone review
