# Requirements: Wishlist Group Gifting App

**Defined:** 2026-02-16
**Core Value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.

## v1.7 Requirements — Global Wishlist

Requirements for multi-wishlist architecture, URL scraping, and share intent integration.

### Wishlists (Multi-Wishlist CRUD)

- [ ] **WISH-01**: User can create a new named wishlist with emoji identifier
- [ ] **WISH-02**: User can rename an existing wishlist
- [ ] **WISH-03**: User can delete a non-default wishlist (with confirmation)
- [ ] **WISH-04**: User has exactly one default wishlist (cannot be deleted)
- [ ] **WISH-05**: User can reorder wishlists for display priority
- [ ] **WISH-06**: User can move items between wishlists
- [ ] **WISH-07**: User can view all items across all wishlists (aggregate view)

### Visibility (Wishlist Sharing)

- [ ] **VIS-01**: User can set wishlist visibility to public (all groups see it)
- [ ] **VIS-02**: User can set wishlist visibility to private (only owner sees it)
- [ ] **VIS-03**: User can designate a wishlist as "for others" (gift ideas for non-user)
- [ ] **VIS-04**: User can link a "for others" wishlist to a specific group
- [ ] **VIS-05**: Group members can view linked "for others" wishlists in group context
- [ ] **VIS-06**: Group members can add items to collaborative "for others" wishlists
- [ ] **VIS-07**: Public wishlists appear in all groups user belongs to (celebration pages)

### URL Scraping

- [ ] **SCRAPE-01**: User can paste a URL to create a wishlist item
- [ ] **SCRAPE-02**: System extracts title from URL via Open Graph metadata
- [ ] **SCRAPE-03**: System extracts primary image from URL
- [ ] **SCRAPE-04**: System extracts price from URL (when available)
- [ ] **SCRAPE-05**: System extracts description from URL
- [ ] **SCRAPE-06**: System detects store/brand from URL domain
- [ ] **SCRAPE-07**: User sees loading state while metadata is being extracted
- [ ] **SCRAPE-08**: User can edit scraped data before saving item
- [ ] **SCRAPE-09**: User can manually enter item data when scraping fails (graceful fallback)
- [ ] **SCRAPE-10**: User can choose which wishlist to add item to

### Share Intent

- [ ] **SHARE-01**: App appears in iOS share sheet for URL content
- [ ] **SHARE-02**: App appears in Android share sheet for URL content
- [ ] **SHARE-03**: User can share URL from any app to create wishlist item
- [ ] **SHARE-04**: Share intent works when app is not running (cold start)
- [ ] **SHARE-05**: Share intent works when app is in background (warm start)
- [ ] **SHARE-06**: User can quick-add to default wishlist from share (one-tap)
- [ ] **SHARE-07**: System extracts URL from shared text blocks (not just direct links)
- [ ] **SHARE-08**: User sees scraped preview after sharing URL

### Migration (Database)

- [ ] **MIG-01**: Existing wishlist items migrate to user's default wishlist
- [ ] **MIG-02**: Migration preserves all existing claims and contributions
- [ ] **MIG-03**: Migration maintains celebrant exclusion (RLS policies updated)
- [ ] **MIG-04**: Migration is non-destructive (group_id preserved during transition)
- [ ] **MIG-05**: Column amazon_url renamed to source_url across codebase

## v1.8+ Requirements

Deferred to future release. Tracked but not in current roadmap.

### URL Scraping Enhancements

- **SCRAPE-11**: User can select from multiple scraped images
- **SCRAPE-12**: System uses retailer-specific scrapers for top 10 stores
- **SCRAPE-13**: Price tracking with alerts when items go on sale

### Advanced Sharing

- **SHARE-09**: User can batch-add multiple URLs in single share
- **SHARE-10**: User can share images for reverse product lookup

### Wishlist Features

- **WISH-08**: User can create wishlist templates (Birthday, Wedding, Baby)
- **WISH-09**: Collaborative editing with real-time sync
- **WISH-10**: Shareable public links for non-app users

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Client-side URL scraping | CORS blocks most requests; must use Edge Function |
| Custom iOS share view | expo-share-intent doesn't support; significant complexity |
| Background scraping without confirmation | iOS limitations; user confusion about where item went |
| Per-item visibility controls | UX nightmare; share at wishlist level only |
| Real-time collaborative editing | Complex sync; overkill for wishlists in v1.7 |
| Price tracking/alerts | Requires background jobs, cron, notifications; defer to v2+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WISH-01 | — | Pending |
| WISH-02 | — | Pending |
| WISH-03 | — | Pending |
| WISH-04 | — | Pending |
| WISH-05 | — | Pending |
| WISH-06 | — | Pending |
| WISH-07 | — | Pending |
| VIS-01 | — | Pending |
| VIS-02 | — | Pending |
| VIS-03 | — | Pending |
| VIS-04 | — | Pending |
| VIS-05 | — | Pending |
| VIS-06 | — | Pending |
| VIS-07 | — | Pending |
| SCRAPE-01 | — | Pending |
| SCRAPE-02 | — | Pending |
| SCRAPE-03 | — | Pending |
| SCRAPE-04 | — | Pending |
| SCRAPE-05 | — | Pending |
| SCRAPE-06 | — | Pending |
| SCRAPE-07 | — | Pending |
| SCRAPE-08 | — | Pending |
| SCRAPE-09 | — | Pending |
| SCRAPE-10 | — | Pending |
| SHARE-01 | — | Pending |
| SHARE-02 | — | Pending |
| SHARE-03 | — | Pending |
| SHARE-04 | — | Pending |
| SHARE-05 | — | Pending |
| SHARE-06 | — | Pending |
| SHARE-07 | — | Pending |
| SHARE-08 | — | Pending |
| MIG-01 | — | Pending |
| MIG-02 | — | Pending |
| MIG-03 | — | Pending |
| MIG-04 | — | Pending |
| MIG-05 | — | Pending |

**Coverage:**
- v1.7 requirements: 33 total
- Mapped to phases: 0
- Unmapped: 33

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after initial definition*
