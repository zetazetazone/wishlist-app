# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.
**Current focus:** v1.4 Friends System — Phase 26 in progress

## Current Position

Phase: 27 of 6 (Public Dates Management)
Plan: 1 of 2 complete
Status: In progress
Last activity: 2026-02-10 — Completed 27-01 Public Dates Service & Card Component (lib/publicDates.ts, PublicDateCard.tsx)

Progress: [##########] 100% v1.0+v1.1+v1.2+v1.3 | [#######░  ] 67% v1.4 (4/6 phases complete, 27 in progress)

## v1.4 Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 23 | Database Foundation | Foundation for all | Complete |
| 24 | Friend Core Services & Tab | FRND-05,06 FTAB-01,02,05 | Complete |
| 25 | Friend Requests Flow | FRND-01-04,07-09 FTAB-03 | Complete |
| 26 | Contact Import & Discovery | DISC-01-06 FTAB-04 | Complete |
| 27 | Public Dates Management | DATE-01-05 | Plan 1/2 complete |
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

**Phase 24 Decisions:**
- Bidirectional OR query via `.or()` for friends lookup (more efficient than two separate queries)
- Avatar URLs converted at fetch time in getFriends() for display readiness
- Three-dot menu triggers remove directly (dropdown deferred to Phase 25 if more actions needed)

**Phase 25 Decisions:**
- Notification triggers use WHEN clause for efficiency (only fire when conditions met)
- Rate limit of 20 requests/hour enforced in TypeScript (not DB constraint) for better UX feedback
- Block check queries bidirectionally before INSERT to prevent blocked user circumvention
- Segment control uses white fill for active tab on semi-transparent burgundy background
- Block option presented as third Alert button in decline flow (Decline vs Block & Decline)
- Badge count refreshes on tab focus via useFocusEffect (not real-time push)
- Inline getIncomingRequestId helper in member profile (profile-specific use case)
- Relationship status loaded in loadMemberData for single-fetch efficiency

**Phase 26 Plan 01 Decisions:**
- Permission strings explain WHY (find friends) not just WHAT (access contacts)
- search_users escapes ILIKE special chars (%, _, \) via regexp_replace for security
- search_users orders by match quality: exact match first, starts-with second, contains third
- Both RPC functions use same bidirectional blocked user check pattern from accept_friend_request

**Phase 26 Plan 02 Decisions:**
- Import CountryCode type directly from libphonenumber-js/mobile (types module path doesn't exist)
- Batch size of 100 phones per RPC call for API performance
- Skip blocked users defensively even though RPC filters them (TypeScript type safety)

**Phase 26 Plan 03 Decisions:**
- Accept button navigates to /requests screen (MatchedUser doesn't include requestId)
- Find Friends button placed on left side of header to balance requests icon on right
- Search debounced at 300ms to prevent excessive API calls
- MatchedContactCard supports both MatchedUser and SearchResult types via union

**Phase 27 Plan 01 Decisions:**
- Use month - 1 when constructing Date objects for formatting (database 1-12, Date constructor 0-11)
- Calendar heart icon for public dates to distinguish from friend cards
- Separate onEdit and onDelete handlers to prevent accidental deletions

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
- Docker not running blocked local migration verification (Phase 23)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix budget per_gift check constraint violation | 2026-02-05 | a9da654 | [001-fix-budget-per-gift-constraint](./quick/001-fix-budget-per-gift-constraint/) |
| 002 | Fix per-gift budget amount not persisted | 2026-02-05 | 84bb2fa | [002-fix-per-gift-budget-not-persisted](./quick/002-fix-per-gift-budget-not-persisted/) |
| 003 | Fix budget display stale after settings save | 2026-02-05 | 6809669 | [003-fix-budget-display-stale-on-nav](./quick/003-fix-budget-display-stale-on-nav/) |
| 004 | Add delivery address and bank details to personal details | 2026-02-09 | 2bfe625 | [004-add-delivery-address-and-bank-details-to](./quick/004-add-delivery-address-and-bank-details-to/) |

## Session Continuity

Last session: 2026-02-10
Stopped at: Phase 27 Plan 01 complete
Resume file: .planning/phases/27-public-dates-management/27-02-PLAN.md
Next: Phase 27 Plan 02 (Public Dates Screen)
