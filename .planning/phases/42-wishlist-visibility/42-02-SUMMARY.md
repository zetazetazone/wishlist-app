---
phase: 42-wishlist-visibility
plan: 02
subsystem: api
tags: [react-query, supabase, wishlists, visibility, typescript]

# Dependency graph
requires:
  - phase: 42-01
    provides: RLS policies for visibility, linked_group_id column, visibility column
  - phase: 40-01
    provides: getWishlists, createWishlist, updateWishlist, deleteWishlist base functions
provides:
  - getCelebrantPublicWishlists: fetches public+self wishlists for celebration page display
  - getGroupForOthersWishlists: fetches for-others wishlists linked to a group
  - updateWishlistVisibility: updates wishlist visibility field
  - linkWishlistToGroup: links or unlinks for-others wishlist to a group
  - useCelebrantPublicWishlists: React Query hook for celebration page wishlist display
  - useGroupForOthersWishlists: React Query hook for group for-others wishlists
  - useUpdateVisibility: React Query mutation hook for visibility updates
  - useLinkWishlistToGroup: React Query mutation hook for group linking
affects: [celebration/[id].tsx, group/[id]/index.tsx, 42-03, 43]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Visibility query hooks use celebrantId/groupId as query key segment for cache isolation"
    - "Mutation hooks invalidate ['wishlists'] broad key to refresh all wishlist-related queries"
    - "Lib functions throw on Supabase error, hooks let React Query handle error state"

key-files:
  created: []
  modified:
    - lib/wishlists.ts
    - hooks/useWishlists.ts

key-decisions:
  - "getCelebrantPublicWishlists filters .eq('owner_type', 'self') to exclude for-others wishlists from celebration pages"
  - "getGroupForOthersWishlists uses .in('owner_type', ['other_manual', 'other_user']) for correct filtering"
  - "Mutation onSuccess invalidates broad ['wishlists'] key (not user-scoped) since visibility queries use different key shapes"
  - "linkWishlistToGroup accepts null groupId to support unlinking in a single function"

patterns-established:
  - "Visibility query hooks: enabled: !!id guard pattern with id! assertion in queryFn"
  - "Wishlist mutations invalidate queryKey: ['wishlists'] to cover all wishlist cache variants"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 42 Plan 02: Visibility Service Layer Summary

**4 typed Supabase query functions and 4 React Query hooks enabling celebration-page wishlist display and group for-others wishlist access**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-17T14:12:29Z
- **Completed:** 2026-02-17T14:14:01Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Extended lib/wishlists.ts with getCelebrantPublicWishlists, getGroupForOthersWishlists, updateWishlistVisibility, linkWishlistToGroup
- Extended hooks/useWishlists.ts with useCelebrantPublicWishlists, useGroupForOthersWishlists, useUpdateVisibility, useLinkWishlistToGroup
- All functions/hooks follow existing project patterns with correct Supabase filtering and React Query invalidation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add visibility lib functions** - `3183572` (feat)
2. **Task 2: Add visibility React Query hooks** - `0e1d562` (feat)

**Plan metadata:** see final commit below

## Files Created/Modified
- `lib/wishlists.ts` - Added 4 visibility service functions (getCelebrantPublicWishlists, getGroupForOthersWishlists, updateWishlistVisibility, linkWishlistToGroup)
- `hooks/useWishlists.ts` - Added 4 React Query hooks + updated imports to include WishlistVisibility type

## Decisions Made
- Mutation hooks use broad `['wishlists']` queryKey invalidation (not user-scoped) since the new visibility queries use different key shapes (`['wishlists', 'public', id]`, `['wishlists', 'for-others', id]`)
- linkWishlistToGroup accepts `string | null` groupId to support both link and unlink in one function
- getCelebrantPublicWishlists selects nested wishlist_items with full item fields for direct rendering
- getGroupForOthersWishlists selects `items:wishlist_items(count)` only, since group view only needs item counts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - pre-existing TypeScript errors (FlashList estimatedItemSize, WishlistItem export) were confirmed as pre-existing per STATE.md, not introduced by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Service layer complete; celebration/[id].tsx can now call useCelebrantPublicWishlists(celebrantId)
- Group context can now call useGroupForOthersWishlists(groupId)
- Wishlist settings UI can call useUpdateVisibility and useLinkWishlistToGroup
- Ready for Phase 43: Wishlist Assignment (make wishlist_id NOT NULL)

---
*Phase: 42-wishlist-visibility*
*Completed: 2026-02-17*
