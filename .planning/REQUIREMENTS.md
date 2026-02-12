# Requirements: Wishlist Group Gifting App

**Defined:** 2026-02-12
**Core Value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.

## v1.6 Requirements

Requirements for the Wishlist UI Redesign milestone. Each maps to roadmap phases.

### Grid Layout

- [ ] **GRID-01**: Wishlist displays as 2-column masonry grid using FlashList
- [ ] **GRID-02**: Grid cards show item image with placeholder icon when no URL exists
- [ ] **GRID-03**: Grid cards show title (truncated to 2 lines) and price
- [ ] **GRID-04**: Grid cards show action button in bottom-right corner (options for owner, claim for others)
- [ ] **GRID-05**: Grid layout is consistent between My Wishlist and celebration page views
- [ ] **GRID-06**: Special items (Surprise Me, Mystery Box) display with appropriate icons and styling

### Item Detail Page

- [ ] **DETAIL-01**: Tapping a grid card opens item detail page via expo-router
- [ ] **DETAIL-02**: Detail page shows full-bleed hero image (top to fold)
- [ ] **DETAIL-03**: Detail page shows title, brand (parsed from title), and price
- [ ] **DETAIL-04**: Detail page shows "Go to Store" button linking to item URL
- [ ] **DETAIL-05**: Detail page shows favorite badge and priority stars
- [ ] **DETAIL-06**: Detail page has back button and share/options button in header
- [ ] **DETAIL-07**: Celebrant sees "Taken" badge when item is claimed (no claimer identity shown)

### Claim UI

- [ ] **CLAIM-01**: Claim UI appears on detail page (not grid cards)
- [ ] **CLAIM-02**: Group members (except celebrant) can claim items from detail page
- [ ] **CLAIM-03**: Claimer can unclaim items from detail page
- [ ] **CLAIM-04**: Claimer can open item for split contributions from detail page
- [ ] **CLAIM-05**: Split contribution progress displays on detail page for group members
- [ ] **CLAIM-06**: Claim state syncs in real-time across views

### Options Sheet

- [ ] **OPTIONS-01**: Options sheet opens via action button on grid card (owner) or detail page
- [ ] **OPTIONS-02**: Options sheet shows item preview (image, title, price)
- [ ] **OPTIONS-03**: Options sheet provides favorite toggle action
- [ ] **OPTIONS-04**: Options sheet provides priority (star rating) adjustment
- [ ] **OPTIONS-05**: Options sheet provides share action
- [ ] **OPTIONS-06**: Options sheet provides edit action (placeholder alert - edit form deferred)
- [ ] **OPTIONS-07**: Options sheet provides delete action with confirmation

### Performance

- [ ] **PERF-01**: Images load with expo-image caching and blur placeholder
- [ ] **PERF-02**: Grid renders smoothly at 60fps during scroll
- [ ] **PERF-03**: Detail page loads in <200ms from grid tap

### Feature Parity

- [ ] **PARITY-01**: All existing wishlist actions remain functional after redesign
- [ ] **PARITY-02**: All existing badge types (favorite, claimed, split) display correctly
- [ ] **PARITY-03**: Celebrant privacy rules enforced (sees "taken" not claimer identity)

## v1.7+ Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Grid

- **EGRID-01**: Tablet-optimized responsive grid (3+ columns)
- **EGRID-02**: Grid item reordering via drag-and-drop
- **EGRID-03**: Grid filtering and sorting options

### Social Features

- **SOCIAL-01**: Share wishlist item to external apps with preview card
- **SOCIAL-02**: Copy item link to clipboard

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Brand database field | User chose "parse from title" - no schema change needed |
| Image upload for items | URL-only items sufficient for v1.6; adds complexity |
| Multiple images per item | Single hero image sufficient; gallery deferred |
| Swipe gestures on grid | Tap + options sheet simpler and more discoverable |
| Infinite scroll | Current pagination sufficient for typical wishlist sizes |
| Offline wishlist caching | Online-first acceptable for gift coordination app |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PARITY-01 | Phase 33 | Pending |
| PARITY-02 | Phase 33 | Pending |
| PARITY-03 | Phase 33 | Pending |
| GRID-01 | Phase 34 | Pending |
| GRID-02 | Phase 34 | Pending |
| GRID-03 | Phase 34 | Pending |
| GRID-04 | Phase 34 | Pending |
| GRID-05 | Phase 34 | Pending |
| GRID-06 | Phase 34 | Pending |
| PERF-01 | Phase 34 | Pending |
| PERF-02 | Phase 34 | Pending |
| DETAIL-01 | Phase 35 | Pending |
| DETAIL-02 | Phase 35 | Pending |
| DETAIL-03 | Phase 35 | Pending |
| DETAIL-04 | Phase 35 | Pending |
| DETAIL-05 | Phase 35 | Pending |
| DETAIL-06 | Phase 35 | Pending |
| DETAIL-07 | Phase 35 | Pending |
| CLAIM-01 | Phase 35 | Pending |
| CLAIM-02 | Phase 35 | Pending |
| CLAIM-03 | Phase 35 | Pending |
| CLAIM-04 | Phase 35 | Pending |
| CLAIM-05 | Phase 35 | Pending |
| CLAIM-06 | Phase 35 | Pending |
| PERF-03 | Phase 35 | Pending |
| OPTIONS-01 | Phase 36 | Pending |
| OPTIONS-02 | Phase 36 | Pending |
| OPTIONS-03 | Phase 36 | Pending |
| OPTIONS-04 | Phase 36 | Pending |
| OPTIONS-05 | Phase 36 | Pending |
| OPTIONS-06 | Phase 36 | Pending |
| OPTIONS-07 | Phase 36 | Pending |

**Coverage:**
- v1.6 requirements: 31 total
- Mapped to phases: 31
- Complete: 0

---
*Last updated: 2026-02-12*
