# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** v1.2 Group Experience - Phase 15 in progress (Group Settings)

## Current Position

Phase: 15 of 17 (Group Settings)
Plan: 1 of N in current phase
Status: In progress
Last activity: 2026-02-05 - Completed 15-01-PLAN.md (group settings foundation)

Progress: [##########] 100% v1.0+v1.1 | [#########░] 53% v1.2 (9/17 plans)

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
- Phase 13: Create Group Enhancement (CRGRP-01 through CRGRP-05) - COMPLETE
- Phase 14: Group View Redesign (GVIEW-01 through GVIEW-07) - COMPLETE (+ gap closure 14-04)
- Phase 15: Group Settings (GSET-01 through GSET-07) - IN PROGRESS (plan 01 complete)
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
- Phase 13-01: Added uploadGroupPhotoFromUri for separated pick/upload flow
- Phase 13-01: Upload photo after group creation to avoid orphaned files
- Phase 13-01: Removed legacy budget field in favor of mode-based system
- Phase 13-02: Budget approach options toggleable (tap again to deselect)
- Phase 13-02: Green highlighting for budget vs blue for mode differentiation
- Phase 13-02: Budget validation only when approach selected (optional feature)
- Phase 14-02: Icon fallbacks for special items (help-circle for surprise_me, gift for mystery_box)
- Phase 14-02: Urgency-based coloring from countdown.ts for MemberCard birthday display
- Phase 14-02: No email in MemberCard per GVIEW-03 privacy requirement
- Phase 14-03: Batch query for favorites using .in() to avoid N+1
- Phase 14-03: Invalid birthday dates sorted to end of member list
- Phase 14-03: Added users table type with full_name (distinct from user_profiles view)
- Phase 14-04: Lookup-then-navigate pattern with findCelebrationForMember before router.push
- Phase 14-04: maybeSingle() for graceful null when no celebration exists
- Phase 15-01: is_group_admin() mirrors is_group_member() with SECURITY DEFINER STABLE
- Phase 15-01: regenerate_invite_code() callable by any member (SECURITY DEFINER bypasses admin-only UPDATE RLS)
- Phase 15-01: Route restructured from [id].tsx to [id]/ folder with Stack navigator
- Phase 15-01: Settings sections conditionally rendered based on isAdmin role

### Research Findings (v1.2)

- expo-clipboard added for clipboard operations in group settings
- No new dependencies needed beyond expo-clipboard (expo-image-manipulator added earlier for compression)
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

Last session: 2026-02-05T00:33:00Z
Stopped at: Completed 15-01-PLAN.md (group settings foundation)
Resume file: None
Next: Phase 15 Plan 02 (group info editing) or Plan 03 (member management)
