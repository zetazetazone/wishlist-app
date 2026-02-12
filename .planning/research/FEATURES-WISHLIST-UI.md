# Feature Research: Wishlist UI Redesign

**Domain:** Mobile wishlist/shopping app UI patterns
**Researched:** 2026-02-12
**Confidence:** HIGH

## Feature Landscape

This research focuses specifically on NEW UI patterns for wishlist redesign: minimal grid cards, item detail pages, and options bottom sheets. It does NOT cover existing features (claiming, favorites, split contributions) which are already implemented.

### Table Stakes (Users Expect These)

Features users assume exist in modern wishlist/shopping apps. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Grid View: Product Image** | Users identify items visually; shopping apps universally show images first | LOW | Use existing `image_url` field; placeholder icon for items without images |
| **Grid View: Product Title** | Users need to identify what the item is at a glance | LOW | Max 2 lines, truncate with ellipsis |
| **Grid View: Price Display** | Users scan lists for budget-appropriate items | LOW | Use existing `price` field; handle null gracefully |
| **Grid View: Primary Action Button** | Users need quick access to the most common action | MEDIUM | Context-dependent: "View" for owner, "Claim" for non-celebrant |
| **Detail Page: Hero Image** | Full-bleed images are standard for product detail pages; draws attention | LOW | Full-width, 60% of screen height per GoWish pattern |
| **Detail Page: Product Info Section** | Users need title, price, description in one glance | LOW | Below hero image, clear typography hierarchy |
| **Detail Page: Primary CTA Button** | Users expect clear action path from detail view | LOW | "Go to Store" for owner, "Claim" for non-celebrant |
| **Options Sheet: Drag Handle** | Platform convention for dismissible sheets | LOW | Standard @gorhom/bottom-sheet pattern |
| **Options Sheet: Action List** | Users expect organized, tappable action options | LOW | Icon + label pattern, consistent 48dp touch targets |
| **Options Sheet: Destructive Actions Last** | Platform convention (iOS Human Interface Guidelines, Material) | LOW | Delete/Remove styled in red, positioned at bottom |

### Differentiators (Competitive Advantage)

Features that set our app apart. Not required, but valuable for our use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Grid View: Favorite Heart Overlay** | Quick visual indicator of "most wanted" items without leaving grid | LOW | Existing `FavoriteHeart` component; position at top-right of card |
| **Grid View: Priority Stars** | Show importance at a glance - unique to our app | LOW | Existing `StarRating` component; compact 5-star display |
| **Grid View: Claimed Badge Overlay** | Non-celebrants see claim status without opening detail | MEDIUM | Existing `TakenBadge`; overlay on image or card corner |
| **Detail Page: Priority Editor** | Users can adjust priority directly from detail view | LOW | Interactive `StarRating`, already built |
| **Detail Page: Favorite Toggle** | Toggle "most wanted" status from detail view | LOW | Reuse `FavoriteHeart` component |
| **Detail Page: Special Item Type Display** | Show Surprise Me/Mystery Box context and descriptions | LOW | Adapt existing `ItemTypeBadge` patterns |
| **Options Sheet: Item Preview Header** | Shows item image+title at top so user knows context | MEDIUM | Image thumbnail + title + price in sheet header per GoWish |
| **Options Sheet: Move to Group Action** | Users can reorganize items without leaving flow | MEDIUM | Opens `GroupPickerSheet` on tap |
| **Options Sheet: Mark as Received** | Celebrant can confirm gift receipt (status update) | LOW | Updates item status to "received" |
| **Detail Page: Split Contribution Display** | Show split progress and contributors inline | MEDIUM | Reuse existing `SplitContributionProgress`, `ContributorsDisplay` |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for our specific context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Swipe-to-Claim on Grid** | Feels efficient; common in list UIs | Accidental claims are high-cost mistakes; claiming needs confirmation | Tap-to-open-detail, then confirm claim |
| **Bulk Selection Mode** | Users want to claim/move multiple items | Complicates UI significantly; rare use case for wishlists | Use options sheet "Move" for individual items |
| **Inline Editing in Grid** | Quick edits without leaving list | Clutters grid; conflicts with touch targets for navigation | Edit via options sheet or detail page |
| **Real-time Price Refresh** | Prices change on external sites | API calls for each item = slow, expensive; prices are reference only | Show "last updated" date instead |
| **Horizontal Swipe Gallery on Grid Card** | Show multiple product images | Conflicts with list scrolling; adds complexity for minimal value | Single image on grid, gallery on detail page |
| **3D/AR Product Preview** | "Modern" shopping experience | Heavy implementation; requires product model data we don't have | Hero image with zoom capability |

## Feature Dependencies

```
[Grid Card Component]
    |--displays--> [Image URL from WishlistItem]
    |--displays--> [FavoriteHeart] (existing component)
    |--displays--> [StarRating] (existing component)
    |--navigates--> [Item Detail Page]

[Item Detail Page]
    |--requires--> [Navigation from Grid]
    |--displays--> [StarRating] (editable)
    |--displays--> [FavoriteHeart] (toggleable)
    |--displays--> [ClaimButton] (non-celebrant context)
    |--displays--> [SplitContributionProgress] (if split active)
    |--triggers--> [Options Bottom Sheet]

[Options Bottom Sheet]
    |--requires--> [Item context (id, title, image)]
    |--triggers--> [GroupPickerSheet] (for Move action)
    |--requires--> [Existing claim/unclaim logic]
    |--requires--> [Share API] (for Share action)

[Claiming Flow]
    |--requires--> [ClaimButton] (existing component)
    |--requires--> [claim_item database function] (existing)
    |--updates--> [Grid Card display state]
```

### Dependency Notes

- **Grid Card requires WishlistItem data:** All display fields (title, price, image_url, priority) already exist in database
- **Detail Page requires navigation params:** Item ID passed via Expo Router params
- **Options Sheet requires item context:** Full WishlistItem object needed for preview header and action context
- **Claiming requires existing infrastructure:** `claim_item`, `unclaim_item` database functions already implemented
- **Favorite toggle requires group context:** Uses existing `group_favorites` table; needs group ID for favorite scope
- **Split display requires claim data:** Reuses existing split status logic from `LuxuryWishlistCard`

## MVP Definition

### Launch With (v1 - Minimal Grid + Detail)

Minimum viable product for UI migration.

- [x] **Grid Card: Image + Title + Price** - Core identification
- [x] **Grid Card: Tap to Navigate** - Opens detail page
- [x] **Detail Page: Hero Image** - Full visual context
- [x] **Detail Page: Title + Price + Priority Display** - Core information
- [x] **Detail Page: "Go to Store" Button** - Primary external action
- [x] **Detail Page: Back Navigation** - Return to grid
- [ ] **Options Sheet: Basic Actions** - Edit, Delete, Share

### Add After Validation (v1.x)

Features to add once core grid/detail flow is working.

- [ ] **Grid Card: Favorite Heart Overlay** - Add after verifying grid layout works
- [ ] **Grid Card: Claimed Badge** - Add after verifying claim status display
- [ ] **Detail Page: Priority Editor** - Interactive star rating
- [ ] **Detail Page: Favorite Toggle** - Toggle from detail view
- [ ] **Options Sheet: Move to Group** - Cross-group item management
- [ ] **Options Sheet: Mark as Received** - Status update flow

### Future Consideration (v2+)

Features to defer until UI patterns are stable.

- [ ] **Detail Page: Image Gallery Carousel** - Multiple product images
- [ ] **Grid View: Filter/Sort Options** - By priority, price, claimed status
- [ ] **Detail Page: Related Items** - "You might also like" section
- [ ] **Options Sheet: Add Note to Item** - Gifter notes for coordination

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Grid Card: Image + Title + Price | HIGH | LOW | P1 |
| Grid Card: Action Button | HIGH | MEDIUM | P1 |
| Detail Page: Hero Image + Info | HIGH | LOW | P1 |
| Detail Page: Go to Store Button | HIGH | LOW | P1 |
| Options Sheet: Basic Actions | HIGH | MEDIUM | P1 |
| Grid Card: Favorite Heart | MEDIUM | LOW | P2 |
| Grid Card: Priority Stars | MEDIUM | LOW | P2 |
| Detail Page: Priority Editor | MEDIUM | LOW | P2 |
| Options Sheet: Move to Group | MEDIUM | MEDIUM | P2 |
| Grid Card: Claimed Badge | MEDIUM | MEDIUM | P2 |
| Detail Page: Split Progress | LOW | LOW | P3 |
| Options Sheet: Item Preview | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch - core navigation and display
- P2: Should have - differentiating features using existing components
- P3: Nice to have - polish items for later phases

## Competitor Feature Analysis

| Feature | GoWish (Reference) | Amazon | Pinterest | Our Approach |
|---------|-------------------|--------|-----------|--------------|
| **Grid Layout** | 2-column, uniform cards | 2-3 column adaptive | Masonry (varied heights) | 2-column uniform, like GoWish - simpler, predictable |
| **Image Size** | Square, 60% of card | Square, product-focused | Variable aspect ratio | Square, matches GoWish reference |
| **Action Button** | Blue "+" overlay on image | Below image | Heart icon overlay | Contextual: "+" for add, "Claim" for claim |
| **Detail Hero** | Full-bleed, 60% screen | Product carousel | Pinterest-style | Full-bleed single image, like GoWish |
| **Options Trigger** | Three-dot menu on detail | Dropdown menu | Share button | Ellipsis icon button opens bottom sheet |
| **Options Format** | Bottom sheet with preview | Dropdown/modal | Share sheet | Bottom sheet with item preview header |
| **Move/Organize** | Move to another list | Move between lists | Move to board | Move to group (via GroupPickerSheet) |
| **Priority Display** | None | None | None | **Unique:** 5-star priority rating |
| **Favorite Marking** | Heart on card | Heart on card | Heart on pin | Heart overlay on card |

## Existing Feature Integration

The new UI components must integrate with these existing features (already built):

### Claiming System
- **ClaimButton:** Reuse in detail page for non-celebrants
- **ClaimerAvatar:** Show who claimed in detail page
- **TakenBadge:** Adapt for grid card overlay (celebrant view)
- **YourClaimIndicator:** Show in detail page when user owns claim

### Favorite System
- **FavoriteHeart:** Reuse as grid card overlay and detail page toggle
- **MostWantedBadge:** Show in detail page for favorited items
- **group_favorites table:** Existing database infrastructure

### Split Contributions
- **SplitContributionProgress:** Show in detail page for split items
- **ContributorsDisplay:** Show contributor avatars in detail page
- **SplitModal/OpenSplitModal:** Trigger from detail page or options sheet

### Special Item Types
- **ItemTypeBadge:** Show in detail page for surprise_me/mystery_box
- **item_type field:** Determine display variants (no external link for special items)

### Priority System
- **StarRating:** Reuse in grid card (compact, read-only) and detail page (interactive)
- **priority field:** 1-5 integer, existing in all items

## Implementation Recommendations

### Grid Card Design

**Structure (based on GoWish reference):**
```
+---------------------------+
|  [IMAGE - square]         |
|  [Favorite Heart overlay] |
|  [Claimed badge overlay]  |
+---------------------------+
|  Title (2 lines max)      |
|  Price                    |
|  [Stars] [Action Button]  |
+---------------------------+
```

**Key decisions:**
- 2-column layout using FlatList with `numColumns={2}`
- Card aspect ratio: Roughly 4:5 (image square + info section)
- Touch target: Entire card navigates to detail
- Action button: Small, bottom-right, context-dependent

### Detail Page Design

**Structure (based on GoWish reference):**
```
+---------------------------+
| [Back]              [...] |  <- Header
+---------------------------+
|                           |
|     [HERO IMAGE]          |
|     (full-width, 60%)     |
|                           |
+---------------------------+
| [Favorite] Title          |
| Price                     |
| [***** ] Priority         |
| [Special item badge]      |
+---------------------------+
| [GO TO STORE / CLAIM]     |  <- Primary CTA
+---------------------------+
| [Split progress if any]   |
+---------------------------+
```

**Key decisions:**
- Hero image: Full bleed, ~60% of safe area height
- Info section: Scrollable if content overflows
- Single primary CTA: "Go to Store" (owner) or "Claim" (non-celebrant)
- Ellipsis button in header triggers options sheet

### Options Bottom Sheet Design

**Structure (based on GoWish reference):**
```
+---------------------------+
|       [Drag Handle]       |
+---------------------------+
| [Img] Title               |
|       Price               |  <- Item Preview
+---------------------------+
| [icon] Move to Group      |
| [icon] Share              |
| [icon] Mark as Received   |  <- Actions
| [icon] Edit               |
|---------------------------|
| [icon] Delete        [red]|  <- Destructive
+---------------------------+
```

**Key decisions:**
- Item preview header provides context
- Actions organized by frequency/importance
- Destructive actions at bottom, styled differently
- Uses existing @gorhom/bottom-sheet infrastructure
- 48dp minimum touch target per Material guidelines

## Sources

### Primary (HIGH confidence)
- [GoWish App Screenshots](user-provided) - Direct reference for visual patterns
- [Mobbin Bottom Sheet Patterns](https://mobbin.com/explore/mobile/ui-elements/bottom-sheet) - Industry-standard bottom sheet designs
- [Material Design Bottom Sheets](https://m1.material.io/components/bottom-sheets.html) - Official specifications
- [NN/g Bottom Sheet Guidelines](https://www.nngroup.com/articles/bottom-sheet/) - UX best practices
- Existing codebase components: `LuxuryWishlistCard`, `FavoriteHeart`, `ClaimButton`, `StarRating`

### Secondary (MEDIUM confidence)
- [Mobbin Action Sheet Patterns](https://mobbin.com/glossary/action-sheet) - Action list design patterns
- [Mobbin Product Detail Screens](https://mobbin.com/explore/mobile/screens/product-detail) - Detail page patterns
- [Dribbble Wishlist Designs](https://dribbble.com/tags/wishlist-app) - Visual inspiration
- [DesignRush Mobile Design Patterns](https://www.designrush.com/best-designs/apps/trends/mobile-design-patterns) - Card-based design guidance

### Tertiary (LOW confidence)
- [Justinmind Wishlist Prototyping](https://www.justinmind.com/blog/how-to-prototype-a-wish-list-app/) - General wishlist app patterns
- [Plotline Bottom Sheet Examples](https://www.plotline.so/blog/mobile-app-bottom-sheets) - Mobile-specific examples

---
*Feature research for: Wishlist UI Redesign (Grid View, Detail Page, Options Sheet)*
*Researched: 2026-02-12*
