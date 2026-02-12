# Milestone v1.6: Wishlist UI Redesign

**Status:** In Progress
**Phases:** 33-36
**Total Plans:** 2 (Phase 33) + 3 (Phase 34) + 3 (Phase 35) + 3 (Phase 36) = 11 plans

## Overview

Simplify the wishlist UI with a modern, minimal 2-column grid layout and dedicated item detail pages. Replace complex LuxuryWishlistCard (68+ props) with clean grid cards, move claim UI to detail pages, and add options bottom sheet for item actions.

## Phases

### Phase 33: Foundation & Feature Inventory ✓
**Goal**: Install expo-image, create feature inventory mapping all 68+ props from LuxuryWishlistCard to new components, establish shared utilities
**Depends on**: Phase 32
**Requirements**: PARITY-01, PARITY-02, PARITY-03
**Status**: Complete (2026-02-12)
**Success Criteria** (what must be TRUE):
  1. expo-image@~3.0.11 installed and working ✓
  2. Complete feature inventory document mapping LuxuryWishlistCard props to grid/detail/options ✓
  3. Shared utility functions created (brand parser, price formatter, image placeholder) ✓
  4. No existing functionality removed in this phase (preparation only) ✓
  5. TypeScript types defined for new components (WishlistGridCard, ItemDetailScreen, ItemOptionsSheet) ✓
**Plans:** 2 plans

Plans:
- [x] 33-01-PLAN.md — Install expo-image and create feature inventory document
- [x] 33-02-PLAN.md — Create shared TypeScript types and utility functions

### Phase 34: Grid Layout Implementation ✓
**Goal**: Replace current wishlist display with 2-column grid using FlashList, implement WishlistGridCard component
**Depends on**: Phase 33
**Requirements**: GRID-01, GRID-02, GRID-03, GRID-04, GRID-05, GRID-06, PERF-01, PERF-02
**Status**: Complete (2026-02-12)
**Success Criteria** (what must be TRUE):
  1. FlashList grid renders wishlist items in 2 columns ✓
  2. Grid cards display image (with placeholder), title (2-line truncation), and price ✓
  3. Grid cards show action button (options for owner, claim indicator for others) ✓
  4. Special items (Surprise Me, Mystery Box) render with appropriate icons ✓
  5. expo-image caching works with blur placeholder ✓
  6. Grid scrolls at 60fps on mid-range devices ✓
  7. Grid layout identical on My Wishlist and celebration page ✓
**Plans:** 3 plans

Plans:
- [x] 34-01-PLAN.md — Create WishlistGridCard component with expo-image and action button
- [x] 34-02-PLAN.md — Create WishlistGrid FlashList wrapper with grid configuration
- [x] 34-03-PLAN.md — Integrate WishlistGrid into My Wishlist and Celebration screens

### Phase 35: Detail Page & Claim UI ✓
**Goal**: Create item detail page with full-bleed hero, claim UI for group members, real-time state sync
**Depends on**: Phase 34
**Requirements**: DETAIL-01, DETAIL-02, DETAIL-03, DETAIL-04, DETAIL-05, DETAIL-06, DETAIL-07, CLAIM-01, CLAIM-02, CLAIM-03, CLAIM-04, CLAIM-05, CLAIM-06, PERF-03
**Status**: Complete (2026-02-12)
**Success Criteria** (what must be TRUE):
  1. Tapping grid card navigates to /wishlist/[id] detail page ✓
  2. Detail page shows full-bleed hero image extending from top ✓
  3. Detail page shows title, brand (parsed), price, and "Go to Store" button ✓
  4. Detail page shows favorite badge and priority stars ✓
  5. Header has back button and share/options button ✓
  6. Group members (except celebrant) can claim/unclaim from detail page ✓
  7. Split contributions UI displays progress on detail page ✓
  8. Celebrant sees "Taken" badge without claimer identity ✓
  9. Claim state syncs via Supabase realtime ✓
  10. Detail page loads in <200ms from grid tap ✓
**Plans:** 3 plans

Plans:
- [x] 35-01-PLAN.md — Create ItemDetailScreen with hero image, item info, header
- [x] 35-02-PLAN.md — Add claim UI (claim/unclaim, split contribution) to detail
- [x] 35-03-PLAN.md — Integrate navigation and realtime sync

### Phase 36: Options Sheet & Polish ✓
**Goal**: Implement options bottom sheet with item preview and actions, final polish and regression testing
**Depends on**: Phase 35
**Requirements**: OPTIONS-01, OPTIONS-02, OPTIONS-03, OPTIONS-04, OPTIONS-05, OPTIONS-06, OPTIONS-07
**Status**: Complete (2026-02-12)
**Success Criteria** (what must be TRUE):
  1. Options sheet opens from grid card action button (owner) and detail page ✓
  2. Sheet shows item preview (image, title, price) ✓
  3. Favorite toggle works and updates UI immediately ✓
  4. Priority (star rating) adjustment works ✓
  5. Share action works (native share sheet) ✓
  6. Edit action shows placeholder (edit form deferred to future) ✓
  7. Delete action shows confirmation and removes item ✓
  8. All existing wishlist functionality verified working (regression test) ✓
**Plans:** 3 plans

Plans:
- [x] 36-01-PLAN.md — Create OptionsSheet component with preview and actions
- [x] 36-02-PLAN.md — Wire OptionsSheet to My Wishlist and Detail page
- [x] 36-03-PLAN.md — Final verification and regression testing

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARITY-01 | 33 | ✓ Complete |
| PARITY-02 | 33 | ✓ Complete |
| PARITY-03 | 33 | ✓ Complete |
| GRID-01 | 34 | ✓ Complete |
| GRID-02 | 34 | ✓ Complete |
| GRID-03 | 34 | ✓ Complete |
| GRID-04 | 34 | ✓ Complete |
| GRID-05 | 34 | ✓ Complete |
| GRID-06 | 34 | ✓ Complete |
| PERF-01 | 34 | ✓ Complete |
| PERF-02 | 34 | ✓ Complete |
| DETAIL-01 | 35 | ✓ Complete |
| DETAIL-02 | 35 | ✓ Complete |
| DETAIL-03 | 35 | ✓ Complete |
| DETAIL-04 | 35 | ✓ Complete |
| DETAIL-05 | 35 | ✓ Complete |
| DETAIL-06 | 35 | ✓ Complete |
| DETAIL-07 | 35 | ✓ Complete |
| CLAIM-01 | 35 | ✓ Complete |
| CLAIM-02 | 35 | ✓ Complete |
| CLAIM-03 | 35 | ✓ Complete |
| CLAIM-04 | 35 | ✓ Complete |
| CLAIM-05 | 35 | ✓ Complete |
| CLAIM-06 | 35 | ✓ Complete |
| PERF-03 | 35 | ✓ Complete |
| OPTIONS-01 | 36 | ✓ Complete |
| OPTIONS-02 | 36 | ✓ Complete |
| OPTIONS-03 | 36 | ✓ Complete |
| OPTIONS-04 | 36 | ✓ Complete |
| OPTIONS-05 | 36 | ✓ Complete |
| OPTIONS-06 | 36 | ✓ Complete |
| OPTIONS-07 | 36 | ✓ Complete |

---

*For current project status, see .planning/PROJECT.md*
