# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** Phase 38 - URL Scraping (v1.7 Global Wishlist)

## Current Position

Phase: 38 of 43 (URL Scraping)
Plan: 2 of 3 in current phase (complete)
Status: In progress
Last activity: 2026-02-16 — Completed 38-02-PLAN.md (URL scraper client service)

Progress: [==================================] 88% (38/43 phases)

## Milestone History

- **v1.0 MVP** - Shipped 2026-02-02 (5 phases, 10 plans)
- **v1.1 Polish** - Shipped 2026-02-03 (5 phases, 13 plans)
- **v1.2 Group Experience** - Shipped 2026-02-05 (7 phases, 18 plans)
- **v1.3 Gift Claims & Personal Details** - Shipped 2026-02-09 (5 phases, 15 plans)
- **v1.4 Friends System** - Shipped 2026-02-10 (6 phases, 12 plans)
- **v1.5 Localization** - Shipped 2026-02-12 (4 phases, 13 plans)
- **v1.6 Wishlist UI Redesign** - Shipped 2026-02-12 (4 phases, 11 plans)
- **v1.7 Global Wishlist** - In progress (7 phases, Phases 37-43)

## Accumulated Context

### Decisions

Key decisions from all milestones archived in PROJECT.md Key Decisions table.

v1.6 decisions archived in `.planning/milestones/v1.6-ROADMAP.md`.

**From Phase 37-01:**
- wishlist_id nullable during v1.7 transition, NOT NULL deferred to Phase 43
- ON DELETE SET NULL for wishlist_id (items orphan rather than delete)
- dual-access RLS preserves legacy group_id access while adding wishlist_id
- gift_claims RLS unchanged - celebrant exclusion uses wi.group_id only

**From Phase 38-01:**
- npm:cheerio@1.0.0 specifier avoids import map configuration in Deno
- Scrape failures return 200 (not 500) for graceful degradation
- 10-second timeout balances slow sites vs user experience
- Fallback chain: OG tags → JSON-LD → HTML selectors for maximum compatibility

**From Phase 38-02:**
- Client-side URL validation before Edge Function call (saves round trip)
- Normalize URL on client before sending to server (consistent format, better caching)
- Re-export types from lib/urlScraper.ts (component convenience)

### Pending Todos (Manual Setup)

From v1.0/v1.1:
1. Deploy Edge Function: `npx supabase functions deploy push`
2. Configure webhook following `docs/WEBHOOK-SETUP.md`
3. Create `avatars` storage bucket (public)
4. Enable pg_cron extension in Supabase Dashboard
5. Build development client: `npx eas build --profile development`

From v1.4:
6. Run `npx supabase db reset` to apply all migrations

From Phase 38-01:
7. Deploy scrape-url Edge Function: `npx supabase functions deploy scrape-url`

### Blockers/Concerns

**From research (2026-02-16):**
- ~~RLS policy conflicts with existing claim_item() when adding wishlist_id~~ RESOLVED: dual-access RLS pattern preserves group_id access
- Share intent cold start data loss if getInitialURL() not implemented
- URL scraper brittleness for JavaScript-rendered sites

**Mitigations documented in research/SUMMARY.md:**
- ~~can_view_wishlist_item() helper before schema migration~~ RESOLVED: dual-access pattern in RLS
- Both getInitialURL() and addEventListener patterns
- Graceful fallback with manual entry option

**Pre-existing:**
- TypeScript errors (type exports for Group, WishlistItem, FlashList estimatedItemSize) - non-blocking
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

Last session: 2026-02-16
Stopped at: Phase 38-02 complete (URL scraper client service)
Resume file: .planning/phases/38-url-scraping/38-02-SUMMARY.md
Next: Execute 38-03-PLAN.md (URL scraper UI integration)
