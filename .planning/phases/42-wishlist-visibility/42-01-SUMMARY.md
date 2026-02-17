---
phase: 42-wishlist-visibility
plan: 01
subsystem: database
tags: [postgres, rls, supabase, migration, visibility, security]

# Dependency graph
requires:
  - phase: 37-multi-wishlist-foundation
    provides: wishlists table, wishlist_items.wishlist_id, owner SELECT policy
  - phase: 40-wishlist-owner-fields
    provides: owner_type, for_user_id, for_name columns on wishlists
  - phase: 29-friends-system
    provides: are_friends() helper function, is_group_member() helper function
provides:
  - linked_group_id column on wishlists (FK to groups, ON DELETE SET NULL)
  - wishlists_linked_group_owner_type_check constraint
  - Visibility-based RLS SELECT policy on wishlists (private/public/friends/linked)
  - Collaborative INSERT policy on wishlist_items for group members
  - TypeScript types updated with linked_group_id
affects:
  - 43-wishlist-assignment
  - Any screen querying wishlists (now governed by visibility RLS)
  - Wishlist item add flows (now allows group collab on for-others wishlists)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Visibility-based RLS: four-way USING clause (owner OR public-group OR friends OR linked-group)
    - Collaborative INSERT pattern: owner OR group-member-with-linked-group check
    - Partial index on nullable FK for performance (WHERE linked_group_id IS NOT NULL)
    - Idempotent constraint: DROP CONSTRAINT IF EXISTS before ADD CONSTRAINT

key-files:
  created:
    - supabase/migrations/20260219000001_v1.7_wishlist_visibility_rls.sql
  modified:
    - types/database.types.ts

key-decisions:
  - "public visibility scoped to group co-members (not all app users) - prevents public broadcast to strangers"
  - "linked_group_id constrained to other_manual/other_user owner_type only - self-wishlists don't link to groups"
  - "for-others INSERT policy checks linked_group_id IS NOT NULL AND owner_type IN ('other_manual','other_user') - double-checks constraint at query level"

patterns-established:
  - "Visibility RLS: always include owner clause first, then each visibility level as OR branch"
  - "are_friends() and is_group_member() used as helpers in USING clause - no inline subquery duplication"

# Metrics
duration: 8min
completed: 2026-02-17
---

# Phase 42 Plan 01: Wishlist Visibility RLS Summary

**Visibility-based RLS migration replacing owner-only policy with four-way access control (private/public/friends/linked-group) and collaborative INSERT for for-others wishlists via linked_group_id**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-17T14:00:00Z
- **Completed:** 2026-02-17T14:08:42Z
- **Tasks:** 2 of 2
- **Files modified:** 2

## Accomplishments

- Replaced the simple owner-only SELECT policy on `wishlists` with a four-branch visibility policy enforcing private, public (group co-members), friends (mutual via `are_friends()`), and linked-group access
- Added `linked_group_id` FK column with partial index and `wishlists_linked_group_owner_type_check` constraint ensuring only for-others wishlists can link to groups
- Updated `wishlist_items` INSERT policy to allow group members to collaboratively add items to linked for-others wishlists
- Database reset confirmed clean with all validation assertions passing
- TypeScript types regenerated including `linked_group_id: string | null` in Row, Insert, Update

## Task Commits

Each task was committed atomically:

1. **Task 1: Create visibility RLS migration** - `cb7b49e` (feat)
2. **Task 2: Regenerate TypeScript types** - `38e91c9` (chore)

## Files Created/Modified

- `supabase/migrations/20260219000001_v1.7_wishlist_visibility_rls.sql` - Migration adding linked_group_id column, constraint, index, visibility-based SELECT policy, and collaborative INSERT policy with DO $$ validation block
- `types/database.types.ts` - Regenerated Supabase TypeScript types including linked_group_id in wishlists Row/Insert/Update

## Decisions Made

- Public wishlist visibility is scoped to users who share any group with the owner — not all app users. This prevents exposing wishlists to strangers who happen to use the app.
- `linked_group_id` is constrained to `owner_type IN ('other_manual', 'other_user')` because self-owned wishlists have no concept of a representative group.
- The INSERT policy double-checks `owner_type` in addition to the DB constraint for defense-in-depth at RLS evaluation time.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Initial `supabase gen types typescript --local` redirect captured a "Connecting to db 5432" progress message in the output file (line 1), causing TS parse errors. Fixed by redirecting stderr to `/dev/null` on the second run. No change to migration or types content.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- RLS visibility enforcement is in place at the database level; Phase 43 can safely assign `wishlist_id` NOT NULL and rely on these policies
- The `linked_group_id` column is available for UI-layer wishlist creation flows that want to link for-others wishlists to specific groups
- Pre-existing TypeScript errors (FlashList `estimatedItemSize`, missing `WishlistItem`/`Group` type exports) remain non-blocking and are unrelated to this migration

---
*Phase: 42-wishlist-visibility*
*Completed: 2026-02-17*

## Self-Check: PASSED

- FOUND: supabase/migrations/20260219000001_v1.7_wishlist_visibility_rls.sql
- FOUND: types/database.types.ts
- FOUND: .planning/phases/42-wishlist-visibility/42-01-SUMMARY.md
- FOUND: commit cb7b49e (feat - visibility RLS migration)
- FOUND: commit 38e91c9 (chore - regenerated TypeScript types)
