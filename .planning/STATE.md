# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** v1.5 Localization

## Current Position

Phase: 30 - Server Integration & Translation Files (2 of 4)
Plan: 05 of 06
Status: In progress (gap closure plans)
Last activity: 2026-02-11 - Completed 30-05-PLAN.md (useLanguage hook wiring)

Progress: [#######---] 78% v1.5 in progress (7/9 plans complete)

## Milestone History

- **v1.0 MVP** - Shipped 2026-02-02 (5 phases, 10 plans)
- **v1.1 Polish** - Shipped 2026-02-03 (5 phases, 13 plans)
- **v1.2 Group Experience** - Shipped 2026-02-05 (7 phases, 18 plans)
- **v1.3 Gift Claims & Personal Details** - Shipped 2026-02-09 (5 phases, 15 plans)
- **v1.4 Friends System** - Shipped 2026-02-10 (6 phases, 12 plans)

## v1.5 Phase Summary

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 29 | Foundation & Tooling | INFRA-01, INFRA-02, INFRA-03, PERS-01 | Complete (2/2) |
| 30 | Server Integration & Translation Files | PERS-02, PERS-03, NOTIF-01, NOTIF-02, TRANS-04, TRANS-05 | In progress (5/6) |
| 31 | Root Integration & Settings UI | SETT-01, SETT-02 | Pending |
| 32 | UI Component Migration | TRANS-01, TRANS-02, TRANS-03 | Pending |

## Accumulated Context

### Decisions

Key decisions from all milestones archived in PROJECT.md Key Decisions table.

v1.4 decisions archived in `.planning/milestones/v1.4-ROADMAP.md`.

v1.5 key architectural decisions:
- i18next + react-i18next + expo-localization stack (Expo official recommendation)
- Three-tier language preference hierarchy: Server > Local > Device
- Server-side language storage enables Edge Function push notification localization
- `notification_translations` table for all notification type templates
- TypeScript-safe translation keys via automated tooling
- Neutral Latin American Spanish for initial release
- Store preferred_language in users table (not auth metadata) for Edge Function service role access (30-01)
- Push Edge Function fallback chain: user language → English → original title/body for backward compatibility (30-03)
- Variable interpolation excludes notification_type and avatar_url to avoid recursion (30-03)
- Single 'translation' namespace with nested JSON structure (simpler than separate namespace files) (30-04)
- 286 translation keys across 12 namespaces with i18next interpolation and pluralization (30-04)
- useLanguage hook wired to auth session via userId extraction from both getSession() and onAuthStateChange() (30-05)
- i18n initialization guard in root layout prevents flash of untranslated content (30-05)

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

- Pre-existing TypeScript errors (type exports for Group, WishlistItem) - non-blocking
- npm peer dependency workaround (--legacy-peer-deps) for React 19 - acceptable

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix budget per_gift check constraint violation | 2026-02-05 | a9da654 | [001-fix-budget-per-gift-constraint](./quick/001-fix-budget-per-gift-constraint/) |
| 002 | Fix per-gift budget amount not persisted | 2026-02-05 | 84bb2fa | [002-fix-per-gift-budget-not-persisted](./quick/002-fix-per-gift-budget-not-persisted/) |
| 003 | Fix budget display stale after settings save | 2026-02-05 | 6809669 | [003-fix-budget-display-stale-on-nav](./quick/003-fix-budget-display-stale-on-nav/) |
| 004 | Add delivery address and bank details to personal details | 2026-02-09 | 2bfe625 | [004-add-delivery-address-and-bank-details-to](./quick/004-add-delivery-address-and-bank-details-to/) |

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 30-05-PLAN.md (useLanguage hook wiring) - Gap closure plan
Resume file: .planning/phases/30-server-integration-translation-files/30-05-SUMMARY.md
Next: 30-06-PLAN.md (gap closure) then Phase 31 - Root Integration & Settings UI
