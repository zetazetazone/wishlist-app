# Roadmap: Wishlist Group Gifting App

## Milestones

- v1.0 MVP (Phases 1-5) - shipped 2026-02-02
- v1.1 My Wishlist Polish (Phases 6-10) - shipped 2026-02-03
- v1.2 Group Experience (Phases 11-17) - shipped 2026-02-05
- v1.3 Gift Claims (Phases 18-22) - shipped 2026-02-09
- v1.4 Friends System (Phases 23-28) - shipped 2026-02-10
- v1.5 Localization (Phases 29-32) - shipped 2026-02-12
- v1.6 Wishlist UI Redesign (Phases 33-36) - shipped 2026-02-12
- **v1.7 Global Wishlist** (Phases 37-43) - in progress

## Overview

v1.7 transforms wishlist management from group-centric to user-owned architecture. Users gain multiple named wishlists with visibility controls, URL-based item creation via browser share intent, and flexible sharing across groups and friends. The migration path uses expand-and-contract pattern to safely transition existing group-scoped items to user-owned wishlists while preserving all claims and contributions.

## Phases

**Phase Numbering:**
- Integer phases (37, 38, 39): Planned milestone work
- Decimal phases (37.1, 37.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 37: Database Foundation** - Multi-wishlist schema with RLS and migration backfill
- [ ] **Phase 38: URL Scraping** - Edge Function for metadata extraction
- [ ] **Phase 39: Share Intent** - Receive shared URLs from browser/apps
- [ ] **Phase 40: Multi-Wishlist UI** - Wishlist management screens and picker
- [ ] **Phase 41: Column Rename** - amazon_url to source_url migration
- [ ] **Phase 42: Wishlist Visibility** - Public/private and for-others sharing
- [ ] **Phase 43: Enforcement** - NOT NULL constraints and cleanup

## Phase Details

### Phase 37: Database Foundation
**Goal**: Establish multi-wishlist schema with safe migration from group-scoped items
**Depends on**: Phase 36 (v1.6 complete)
**Requirements**: MIG-01, MIG-02, MIG-03, MIG-04, WISH-04
**Success Criteria** (what must be TRUE):
  1. User has exactly one default wishlist created automatically
  2. All existing wishlist items belong to user's default wishlist
  3. Existing gift claims continue to work without data loss
  4. Celebrant exclusion still prevents claim visibility to birthday person
  5. Database supports nullable wishlist_id during transition period
**Plans**: TBD

Plans:
- [ ] 37-01: TBD

### Phase 38: URL Scraping
**Goal**: Server-side metadata extraction from any product URL
**Depends on**: Nothing (can parallel with Phase 37)
**Requirements**: SCRAPE-01, SCRAPE-02, SCRAPE-03, SCRAPE-04, SCRAPE-05, SCRAPE-06, SCRAPE-07, SCRAPE-08, SCRAPE-09
**Success Criteria** (what must be TRUE):
  1. User can paste URL and see extracted title, image, price within 3 seconds
  2. User sees loading indicator while metadata is being extracted
  3. User can edit any scraped field before saving
  4. User can manually enter all fields when scraping fails
  5. Scraping works for Amazon, Target, Etsy, and generic Open Graph sites
**Plans**: TBD

Plans:
- [ ] 38-01: TBD

### Phase 39: Share Intent
**Goal**: Receive shared URLs from browser and store apps
**Depends on**: Phase 38 (URL scraping service must exist)
**Requirements**: SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05, SHARE-06, SHARE-07, SHARE-08
**Success Criteria** (what must be TRUE):
  1. App appears in iOS and Android share sheets for URL content
  2. User can share from Safari/Chrome to create wishlist item
  3. Share works on cold start (app not running) and warm start (app in background)
  4. User sees scraped preview after sharing URL
  5. User can quick-add to default wishlist with one tap
**Plans**: TBD

Plans:
- [ ] 39-01: TBD

### Phase 40: Multi-Wishlist UI
**Goal**: User interface for managing multiple wishlists
**Depends on**: Phase 37 (wishlists table must exist)
**Requirements**: WISH-01, WISH-02, WISH-03, WISH-05, WISH-06, WISH-07, SCRAPE-10
**Success Criteria** (what must be TRUE):
  1. User can create new wishlist with name and emoji
  2. User can rename and delete non-default wishlists
  3. User can move items between wishlists
  4. User can view aggregate of all items across wishlists
  5. User can choose which wishlist to add new item to
**Plans**: TBD

Plans:
- [ ] 40-01: TBD

### Phase 41: Column Rename
**Goal**: Rename amazon_url to source_url reflecting broader URL support
**Depends on**: Phase 40 (all UI using new architecture)
**Requirements**: MIG-05
**Success Criteria** (what must be TRUE):
  1. Database column renamed from amazon_url to source_url
  2. All TypeScript types use source_url
  3. All UI components reference source_url
  4. No references to amazon_url remain in codebase
**Plans**: TBD

Plans:
- [ ] 41-01: TBD

### Phase 42: Wishlist Visibility
**Goal**: Public/private visibility and for-others wishlist sharing
**Depends on**: Phase 37, Phase 40 (wishlists schema and UI)
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05, VIS-06, VIS-07
**Success Criteria** (what must be TRUE):
  1. User can set wishlist as public (visible to all groups) or private (owner only)
  2. User can create "for others" wishlist linked to specific group
  3. Group members can view and add items to collaborative for-others wishlists
  4. Public wishlists appear on user's celebration pages in all groups
  5. Private wishlists do not appear to anyone except owner
**Plans**: TBD

Plans:
- [ ] 42-01: TBD

### Phase 43: Enforcement
**Goal**: Make wishlist_id NOT NULL and add performance indexes
**Depends on**: Phase 42 (full visibility system complete)
**Requirements**: None (cleanup and enforcement)
**Success Criteria** (what must be TRUE):
  1. wishlist_id column is NOT NULL with no orphaned items
  2. Performance indexes exist for wishlist queries
  3. All RLS policies use wishlist-based access patterns
  4. Migration validation confirms zero data corruption
**Plans**: TBD

Plans:
- [ ] 43-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 37 -> 38 -> 39 -> 40 -> 41 -> 42 -> 43
(Phase 38 can start before 37 completes due to no dependencies)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 37. Database Foundation | v1.7 | 0/? | Not started | - |
| 38. URL Scraping | v1.7 | 0/? | Not started | - |
| 39. Share Intent | v1.7 | 0/? | Not started | - |
| 40. Multi-Wishlist UI | v1.7 | 0/? | Not started | - |
| 41. Column Rename | v1.7 | 0/? | Not started | - |
| 42. Wishlist Visibility | v1.7 | 0/? | Not started | - |
| 43. Enforcement | v1.7 | 0/? | Not started | - |

---
*Roadmap created: 2026-02-16*
*Milestone: v1.7 Global Wishlist*
