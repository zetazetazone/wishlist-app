# Milestone v1.6: Wishlist UI Redesign

**Status:** In Progress
**Phases:** 33-36
**Total Plans:** TBD

## Overview

Simplify the wishlist UI with a modern, minimal 2-column grid layout and dedicated item detail pages. Replace complex LuxuryWishlistCard (68+ props) with clean grid cards, move claim UI to detail pages, and add options bottom sheet for item actions.

## Phases

### Phase 33: Foundation & Feature Inventory
**Goal**: Install expo-image, create feature inventory mapping all 68+ props from LuxuryWishlistCard to new components, establish shared utilities
**Depends on**: Phase 32
**Requirements**: PARITY-01, PARITY-02, PARITY-03
**Success Criteria** (what must be TRUE):
  1. expo-image@~3.0.11 installed and working
  2. Complete feature inventory document mapping LuxuryWishlistCard props to grid/detail/options
  3. Shared utility functions created (brand parser, price formatter, image placeholder)
  4. No existing functionality removed in this phase (preparation only)
  5. TypeScript types defined for new components (WishlistGridCard, ItemDetailScreen, ItemOptionsSheet)
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 34: Grid Layout Implementation
**Goal**: Replace current wishlist display with 2-column masonry grid using FlashList, implement WishlistGridCard component
**Depends on**: Phase 33
**Requirements**: GRID-01, GRID-02, GRID-03, GRID-04, GRID-05, GRID-06, PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. FlashList masonry grid renders wishlist items in 2 columns
  2. Grid cards display image (with placeholder), title (2-line truncation), and price
  3. Grid cards show action button (options for owner, claim indicator for others)
  4. Special items (Surprise Me, Mystery Box) render with appropriate icons
  5. expo-image caching works with blur placeholder
  6. Grid scrolls at 60fps on mid-range devices
  7. Grid layout identical on My Wishlist and celebration page
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 35: Detail Page & Claim UI
**Goal**: Create item detail page with full-bleed hero, claim UI for group members, real-time state sync
**Depends on**: Phase 34
**Requirements**: DETAIL-01, DETAIL-02, DETAIL-03, DETAIL-04, DETAIL-05, DETAIL-06, DETAIL-07, CLAIM-01, CLAIM-02, CLAIM-03, CLAIM-04, CLAIM-05, CLAIM-06, PERF-03
**Success Criteria** (what must be TRUE):
  1. Tapping grid card navigates to /wishlist/[id] detail page
  2. Detail page shows full-bleed hero image extending from top
  3. Detail page shows title, brand (parsed), price, and "Go to Store" button
  4. Detail page shows favorite badge and priority stars
  5. Header has back button and share/options button
  6. Group members (except celebrant) can claim/unclaim from detail page
  7. Split contributions UI displays progress on detail page
  8. Celebrant sees "Taken" badge without claimer identity
  9. Claim state syncs via Supabase realtime
  10. Detail page loads in <200ms from grid tap
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 36: Options Sheet & Polish
**Goal**: Implement options bottom sheet with item preview and actions, final polish and regression testing
**Depends on**: Phase 35
**Requirements**: OPTIONS-01, OPTIONS-02, OPTIONS-03, OPTIONS-04, OPTIONS-05, OPTIONS-06, OPTIONS-07
**Success Criteria** (what must be TRUE):
  1. Options sheet opens from grid card action button (owner) and detail page
  2. Sheet shows item preview (image, title, price)
  3. Favorite toggle works and updates UI immediately
  4. Priority (star rating) adjustment works
  5. Share action works (native share sheet)
  6. Edit action navigates to edit form
  7. Delete action shows confirmation and removes item
  8. All existing wishlist functionality verified working (regression test)
**Plans**: TBD

Plans:
- [ ] TBD

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARITY-01 | 33 | Pending |
| PARITY-02 | 33 | Pending |
| PARITY-03 | 33 | Pending |
| GRID-01 | 34 | Pending |
| GRID-02 | 34 | Pending |
| GRID-03 | 34 | Pending |
| GRID-04 | 34 | Pending |
| GRID-05 | 34 | Pending |
| GRID-06 | 34 | Pending |
| PERF-01 | 34 | Pending |
| PERF-02 | 34 | Pending |
| DETAIL-01 | 35 | Pending |
| DETAIL-02 | 35 | Pending |
| DETAIL-03 | 35 | Pending |
| DETAIL-04 | 35 | Pending |
| DETAIL-05 | 35 | Pending |
| DETAIL-06 | 35 | Pending |
| DETAIL-07 | 35 | Pending |
| CLAIM-01 | 35 | Pending |
| CLAIM-02 | 35 | Pending |
| CLAIM-03 | 35 | Pending |
| CLAIM-04 | 35 | Pending |
| CLAIM-05 | 35 | Pending |
| CLAIM-06 | 35 | Pending |
| PERF-03 | 35 | Pending |
| OPTIONS-01 | 36 | Pending |
| OPTIONS-02 | 36 | Pending |
| OPTIONS-03 | 36 | Pending |
| OPTIONS-04 | 36 | Pending |
| OPTIONS-05 | 36 | Pending |
| OPTIONS-06 | 36 | Pending |
| OPTIONS-07 | 36 | Pending |

---

*For current project status, see .planning/PROJECT.md*
