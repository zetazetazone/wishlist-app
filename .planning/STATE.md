# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** v1.2 Group Experience - Phase 17 in progress (Budget Tracking), plan 01 of 05 complete

## Current Position

Phase: 17 of 17 (Budget Tracking)
Plan: 1 of 5 in current phase
Status: In progress
Last activity: 2026-02-05 - Completed 17-01-PLAN.md (Budget Calculation Service)

Progress: [##########] 100% v1.0+v1.1 | [################-] 94% v1.2 (16/17 plans)

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
- Phase 15: Group Settings (GSET-01 through GSET-07) - COMPLETE (plans 01-03)
- Phase 16: Mode System (MODE-01 through MODE-05) - COMPLETE (plans 01-03 + gap closure 16-04)
- Phase 17: Budget Tracking (BUDG-01 through BUDG-05) - IN PROGRESS (plan 01 complete)

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
- Phase 15-02: Separate updateGroupInfo() from legacy updateGroup() to avoid breaking callers
- Phase 15-02: Cast supabase as any for invite_code query (column not in generated types)
- Phase 15-02: Photo change is independent action, not part of form Save flow
- Phase 15-02: Optimistic update with rollback for name/description saves
- Phase 15-03: Static import for getNextGiftLeader (no circular dependency)
- Phase 15-03: Admin Danger Zone shows info text instead of disabled Leave button
- Phase 15-03: Members sorted admin-first then alphabetical in settings list
- Phase 15-03: NULL gift_leader_id fallback when reassignment fails on member removal
- Phase 16-01: Hard hide (not disabled) for favorite preview in Greetings mode
- Phase 16-01: Replaced inline mode icon/text in GroupCard with reusable GroupModeBadge
- Phase 16-01: Removed budget_limit_per_gift from GroupCard (Phase 17 owns budget display)
- Phase 16-02: Separate updateGroupMode() from updateGroupInfo() (different UX flows)
- Phase 16-02: Gold colors for Greetings card, burgundy for Gifts card (matches GroupModeBadge)
- Phase 16-02: Destructive button for Greetings switch (hides features), default for Gifts
- Phase 16-02: Cross-user mode change toast deferred -- GroupModeBadge visibility is self-evident
- Phase 16-03: Default to gifts mode when group.mode is undefined (backward compatibility)
- Phase 16-03: Chat remains accessible in both modes (greetings hides gift sections, not navigation)
- Phase 16-03: Greetings mode hard-hides Gift Leader, Contributions, Wishlist, History sections
- Phase 16-03: Send a Greeting button is future feature hook with Coming Soon alert
- Phase 16-04: alignSelf flex-start on GroupModeBadge (fix in component, not parent)
- Phase 17-01: addMonths(startOfMonth, 1) for exclusive monthly end boundary (avoids midnight edge case)
- Phase 17-01: getSpendingInRange returns 0 on error (graceful degradation for budget display)
- Phase 17-01: isOverBudget at exactly 100% (>= comparison)
- Phase 17-01: Jest with ts-jest for project test infrastructure

### Research Findings (v1.2)

- expo-clipboard added for clipboard operations in group settings
- No new dependencies needed beyond expo-clipboard (expo-image-manipulator added earlier for compression)
- Schema changes: add columns to groups table (description, photo_url, mode, budget_approach, budget_amount)
- Group photos use same storage pattern as avatars
- Critical pitfall: mode switching with existing data needs soft-archiving consideration
- Critical pitfall: member removal cascades to Gift Leader reassignment
- Jest, ts-jest, @types/jest added as devDependencies for TDD workflow

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

Last session: 2026-02-05
Stopped at: Completed 17-01-PLAN.md (Budget Calculation Service)
Resume file: None
Next: 17-02-PLAN.md (Budget Progress Bar component)
