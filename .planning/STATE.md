# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** v1.2 Group Experience - Phase 12 complete, Phase 13 ready

## Current Position

Phase: 12 of 17 (Group Photo Storage) - COMPLETE
Plan: 1 of 1 in current phase
Status: Phase complete
Last activity: 2026-02-04 - Completed 12-01-PLAN.md (group photo storage infrastructure)

Progress: [##########] 100% v1.0+v1.1 | [##░░░░░░░░] 12% v1.2 (2/16 plans)

## Milestone History

- **v1.0 MVP** - Shipped 2026-02-02 (5 phases, 10 plans + 1 gap closure)
  - Full birthday gift coordination with push notifications, secret chat, calendar, and smart reminders

- **v1.1 Polish** - Shipped 2026-02-03 (5 phases, 13 plans including gap closures)
  - Schema foundation, profile editing, special item types, favorite marking, wishlist display polish

- **v1.2 Group Experience** - In progress (started 2026-02-04)
  - 7 phases (11-17), 16 planned plans
  - Create group flow, group settings, group view redesign
  - Group modes (greetings/gifts), budget approaches (per-gift/monthly/yearly)

## v1.2 Roadmap Structure

**7 phases (11-17):**
- Phase 11: Schema Foundation (mode, budget, description, photo_url columns) - COMPLETE
- Phase 12: Group Photo Storage (upload service, generated avatars) - COMPLETE
- Phase 13: Create Group Enhancement (CRGRP-01 through CRGRP-05)
- Phase 14: Group View Redesign (GVIEW-01 through GVIEW-07)
- Phase 15: Group Settings (GSET-01 through GSET-07)
- Phase 16: Mode System (MODE-01 through MODE-05)
- Phase 17: Budget Tracking (BUDG-01 through BUDG-05)

**Coverage:** 25/25 requirements mapped (100%)

## Accumulated Context

### Decisions

Key decisions from v1.0/v1.1 archived in PROJECT.md Key Decisions table.

**v1.2 Decisions:**
- Phase 11: Used CHECK constraints (not ENUMs) for mode/budget_approach
- Phase 11: budget_amount in cents as INTEGER, cross-column constraint for validation
- Phase 11: mode DEFAULT 'gifts' for backward compatibility
- Phase 12: Reuse avatars bucket with groups/ subfolder (not separate bucket)
- Phase 12: 16:9 aspect ratio for group photos (vs 1:1 for user avatars)
- Phase 12: Compress to 800px width, 0.8 quality via expo-image-manipulator

### Research Findings (v1.2)

- No new dependencies needed - existing stack sufficient (expo-image-manipulator added for compression)
- Schema changes: add columns to groups table (description, photo_url, mode, budget_approach, budget_amount)
- Group photos use same storage pattern as avatars
- Critical pitfall: mode switching with existing data needs soft-archiving consideration
- Critical pitfall: member removal cascades to Gift Leader reassignment

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

## Session Continuity

Last session: 2026-02-04T18:06:00Z
Stopped at: Completed 12-01-PLAN.md (group photo storage infrastructure)
Resume file: None
Next: Plan Phase 13 (Create Group Enhancement)
