# Feature Inventory: LuxuryWishlistCard Migration

## Overview

This document maps every prop, feature, and behavior from `LuxuryWishlistCard.tsx` to the new component architecture for v1.6 Wishlist UI Redesign.

**Source Component**: `components/wishlist/LuxuryWishlistCard.tsx` (27 props, 603 lines)
**Target Architecture**:
- **WishlistGridCard**: Compact grid item with essential info
- **ItemDetailScreen**: Full item details and actions
- **ItemOptionsSheet**: Owner-only actions (edit, delete, favorite, priority, share)

## Source Component Analysis

### LuxuryWishlistCardProps Interface (Lines 40-68)

The current card is a monolithic component handling:
- 4 view contexts (owner, celebrant, claimer, viewer)
- 3 item types (standard, surprise_me, mystery_box)
- Multiple interaction patterns (claim, split, favorite, delete)
- Complex conditional rendering based on user role

**Total Props**: 27
- Core props: 4
- Favorite system: 5
- Claim system: 8
- Split contribution: 7
- Deletion: 1
- Priority: 1
- Animation: 1

## Complete Prop Mapping Table

| # | Source Prop | Type | Grid Card | Detail Screen | Options Sheet | Notes |
|---|-------------|------|-----------|---------------|---------------|-------|
| 1 | `item` | WishlistItem | YES | YES | YES (preview) | Core data passed to all components |
| 2 | `onDelete` | (id: string) => void | NO | NO | YES | Moves to options sheet only |
| 3 | `onPriorityChange` | (id: string, priority: number) => void | NO | YES | YES | Quick access in detail + options |
| 4 | `index` | number | YES | NO | NO | For grid animation only |
| 5 | `favoriteGroups` | Array<{groupId, groupName}> | YES (badge) | YES (display) | YES (toggle) | Badge in grid, full UI in detail/options |
| 6 | `onToggleFavorite` | () => void | NO | YES | YES | Action in detail screen + options |
| 7 | `showFavoriteHeart` | boolean | NO | YES | YES | Control visibility in detail/options |
| 8 | `singleGroupName` | string | YES (badge) | YES | NO | Celebration context badge |
| 9 | `totalUserGroups` | number | YES (logic) | YES (logic) | NO | For "all groups" badge logic |
| 10 | `claimable` | boolean | YES (UI state) | YES (button) | NO | Show claim possibility |
| 11 | `onClaim` | () => void | NO | YES | NO | Detail screen action |
| 12 | `onUnclaim` | () => void | NO | YES | NO | Detail screen action |
| 13 | `claiming` | boolean | NO | YES | NO | Loading state for claim button |
| 14 | `claim` | ClaimWithUser \| null | YES (avatar) | YES (details) | NO | Claimer info display |
| 15 | `isYourClaim` | boolean | YES (indicator) | YES (controls) | NO | Your claim badge + unclaim |
| 16 | `isTaken` | boolean | YES (badge) | YES | NO | Celebrant privacy view |
| 17 | `dimmed` | boolean | YES (opacity) | NO | NO | Visual state for taken items |
| 18 | `isCelebrant` | boolean | YES (logic) | YES (logic) | NO | Privacy control logic |
| 19 | `splitStatus` | SplitStatusInfo \| null | YES (indicator) | YES (full UI) | NO | Split progress display |
| 20 | `contributors` | SplitContributorInfo[] | NO | YES | NO | Full contributor list in detail |
| 21 | `userPledgeAmount` | number | NO | YES | NO | User's pledge badge |
| 22 | `suggestedShare` | number | NO | YES | NO | Split modal calculation |
| 23 | `onOpenSplit` | (itemId, additionalCosts?) => void | NO | YES | NO | Open split action |
| 24 | `onPledge` | (itemId, amount) => void | NO | YES | NO | Contribute to split |
| 25 | `onCloseSplit` | (itemId) => void | NO | YES | NO | Close split (cover remaining) |
| 26 | `amazon_url` (from item) | string | NO | YES | NO | "Go to Store" button |
| 27 | `title` (from item) | string | YES | YES | YES (preview) | Display in all views |
| 28 | `price` (from item) | number | YES | YES | NO | Display in grid + detail |
| 29 | `priority` (from item) | number | YES (stars) | YES (stars + edit) | YES (edit) | Star rating everywhere |
| 30 | `item_type` (from item) | 'standard' \| 'surprise_me' \| 'mystery_box' | YES (icon) | YES (behavior) | NO | Special item handling |

## Context-Specific Mapping

### Owner Context (My Wishlist)

**User Role**: Item owner viewing their own wishlist

#### WishlistGridCard
- Shows: Title, price, priority stars, item type icon, favorite badge
- Actions: Tap to open detail, long-press for options sheet
- Special: No claim UI, no "taken" indicators

#### ItemDetailScreen
- Shows: Full item details, description, image, price, priority, favorite groups
- Actions: Star rating (inline), "Go to Store" button, favorite toggle, options button (top-right)
- Special: No claim/split UI (it's your own item)

#### ItemOptionsSheet
- Shows: Item preview (title, price, image thumbnail)
- Actions:
  - **Favorite in Groups**: Toggle favorite status per group
  - **Set Priority**: Quick star rating adjuster
  - **Share Item**: Share link or details
  - **Edit Item**: Open edit form
  - **Delete Item**: Remove from wishlist (with confirmation)
- Special: Only accessible to item owner

**Props Flow**:
```
Grid: item, index, favoriteGroups, totalUserGroups, singleGroupName
Detail: item, favoriteGroups, onToggleFavorite, onPriorityChange, showFavoriteHeart
Options: item, favoriteGroups, onToggleFavorite, onPriorityChange, onDelete
```

---

### Celebrant Context (Viewing own items on celebration page)

**User Role**: Birthday person viewing their wishlist on their celebration page

#### WishlistGridCard
- Shows: Title, price, priority stars, item type icon, "Taken" badge (if claimed)
- Visual: Dimmed opacity (0.6) if taken
- Actions: Tap to open detail (read-only)
- Privacy: No claimer identity, no claim details

#### ItemDetailScreen
- Shows: Full item details, "Taken" badge (if claimed), no claimer identity
- Actions: None (read-only view)
- Special: No claim button, no unclaim, no split details visible
- Privacy: Split progress hidden (only shows "Taken" state)

#### ItemOptionsSheet
- Not accessible (not the owner in this context)

**Props Flow**:
```
Grid: item, index, isTaken, dimmed, isCelebrant
Detail: item, isTaken, isCelebrant
Options: N/A
```

**Privacy Rules**:
- `isTaken=true` → Show "Taken" badge, hide claimer
- `dimmed=true` → Visual feedback item is claimed
- `isCelebrant=true` → Prevent split details visibility

---

### Claimer Context (User who claimed the item)

**User Role**: Group member who claimed an item viewing it on celebration page

#### WishlistGridCard
- Shows: Title, price, priority stars, "Your Claim" indicator, split progress indicator (if split)
- Actions: Tap to open detail for split management or unclaim

#### ItemDetailScreen
- Shows: Full item details, "Your Claim" header, unclaim button (if not split)
- Split Controls (if opened for split):
  - **Progress Bar**: Total pledged vs. item price + additional costs
  - **Contributors List**: Display all contributors with amounts
  - **Close Split Button**: Cover remaining amount (if not fully funded)
  - **Open Split Button**: Convert regular claim to split (if not yet split)
- Actions: Unclaim (regular claim), Open/Close split, view contributions

#### ItemOptionsSheet
- Not accessible (not the item owner)

**Props Flow**:
```
Grid: item, index, claim, isYourClaim, splitStatus
Detail: item, claim, isYourClaim, onUnclaim, splitStatus, contributors,
        onOpenSplit, onCloseSplit, claiming
Options: N/A
```

**Split Logic**:
- Regular claim: Show unclaim + "Open for Split" button
- Split claim: Show progress + contributors + close split (if needed)
- Fully funded: Only show progress + contributors (no actions)

---

### Viewer Context (Group member who can claim)

**User Role**: Group member viewing claimable items on celebration page

#### WishlistGridCard
- Shows: Title, price, priority stars, claim status
- Indicators:
  - Unclaimed: Default border, no overlay
  - Claimed by someone else: ClaimerAvatar, ClaimTimestamp
  - Split open: Contributor count indicator
- Actions: Tap to open detail for claim or contribution

#### ItemDetailScreen
- Shows: Full item details, claim button (if unclaimed), contribute button (if split open)
- Claim Flow:
  - **Unclaimed**: "Claim This Gift" button → claim action
  - **Split Open**: Progress bar + "Contribute" button → pledge modal
  - **User Contributed**: Badge showing user's pledge amount
- Actions: Claim (unclaimed items), Contribute (open splits)

#### ItemOptionsSheet
- Not accessible (not the item owner)

**Props Flow**:
```
Grid: item, index, claim, claimable, splitStatus
Detail: item, claimable, onClaim, claiming, splitStatus, contributors,
        userPledgeAmount, suggestedShare, onPledge
Options: N/A
```

**Claimability Rules**:
- `claimable=true` + `claim=null` → Show claim button
- `claimable=true` + `splitStatus.isOpen=true` → Show contribute button
- `userPledgeAmount > 0` → Show contribution badge instead of button
- `splitStatus.isFullyFunded=true` → Hide contribute button

---

## Special Item Types Mapping

### surprise_me Items

**Characteristics**:
- No image, no URL
- User provides description text
- User sets budget amount
- Not claimable

#### WishlistGridCard
- Icon: `help-circle` (question mark)
- Border: Burgundy-200
- Gradient: Burgundy accent bar
- Price: "Budget: €X"
- Description: Italic text preview

#### ItemDetailScreen
- No image placeholder
- Description text prominently displayed
- No "Go to Store" button
- Budget amount instead of price
- Not claimable (no claim button)

#### ItemOptionsSheet
- Same actions as standard items (if owner)

**Props Required**:
```typescript
item.item_type === 'surprise_me'
item.surprise_me_budget: number
item.description: string (for surprise description)
```

---

### mystery_box Items

**Characteristics**:
- Predefined tiers: €50 or €100
- Special gift icon
- No specific URL or image
- Not claimable

#### WishlistGridCard
- Icon: `gift` (wrapped gift box)
- Border: Gold-300
- Gradient: Gold accent bar
- Price: "€50" or "€100" (tier badge)
- Badge: Tier indicator

#### ItemDetailScreen
- Gift box icon/illustration
- Tier badge prominently displayed
- Description of mystery box concept
- No "Go to Store" button
- Not claimable (no claim button)

#### ItemOptionsSheet
- Same actions as standard items (if owner)

**Props Required**:
```typescript
item.item_type === 'mystery_box'
item.mystery_box_tier: 50 | 100
```

---

### Standard Items

**Default behavior**: Image, URL, claimable, full feature set

#### WishlistGridCard
- Icon: `gift-outline`
- Border: Gold-100 (or Burgundy-300 if favorite)
- Gradient: Gold accent bar
- Price: "$X.XX" format

#### ItemDetailScreen
- Product image (expo-image)
- "Go to Store" button (opens amazon_url)
- Claim/unclaim buttons (based on role)
- Split contribution UI (if applicable)

#### ItemOptionsSheet
- Full action set for owner

---

## Split Contribution Feature Mapping

Split contributions are complex and role-dependent. Here's the complete flow:

### Split States

1. **Regular Claim** (not split): Single user claimed, no split opened
2. **Split Open** (in progress): Claimer opened for contributions, accepting pledges
3. **Fully Funded** (complete): Total pledges = item price + additional costs

### Split UI Components (to migrate)

| Component | Current Location | Target Location | Props |
|-----------|------------------|-----------------|-------|
| `SplitContributionProgress` | Card body | ItemDetailScreen | itemPrice, additionalCosts, totalPledged, isFullyFunded, isCelebrant |
| `ContributorsDisplay` | Card body | ItemDetailScreen | contributors: SplitContributorInfo[] |
| `SplitModal` | Modal overlay | ItemDetailScreen | visible, onClose, onConfirm, itemTitle, itemPrice, additionalCosts, totalPledged, suggestedAmount, loading |
| `OpenSplitModal` | Modal overlay | ItemDetailScreen | visible, onClose, onConfirm, itemTitle |

### Role-Based Split UI (Detail Screen)

#### Claimer View (isYourClaim=true)
```
[Your Claim Header]
[Product Details]

If not split yet:
  [Open for Split Button] → OpenSplitModal

If split open:
  [Split Progress Bar]
  [Contributors List]

  If not fully funded:
    [Close Split Button] → Alert confirmation → cover remaining
```

#### Contributor View (!isYourClaim && !isCelebrant)
```
[Product Details]
[Claimer Avatar + Name]

If split open:
  [Split Progress Bar]
  [Contributors List]

  If user hasn't contributed:
    [Contribute Button] → SplitModal

  If user contributed:
    [Your Contribution Badge: €X.XX]
```

#### Celebrant View (isCelebrant=true)
```
[Product Details]
[Taken Badge] (no split details)

Privacy: Split progress hidden completely
```

### Split Props Summary

**Grid Card** (split indicators only):
- `splitStatus.isOpen`: boolean indicator
- Contributor count badge

**Detail Screen** (full split UI):
- `splitStatus`: SplitStatusInfo (itemPrice, additionalCosts, totalPledged, isFullyFunded, isOpen)
- `contributors`: SplitContributorInfo[] (id, display_name, avatar_url, amount)
- `userPledgeAmount`: number (for badge)
- `suggestedShare`: number (for modal)
- `onOpenSplit`: (itemId, additionalCosts?) => void
- `onPledge`: (itemId, amount) => void
- `onCloseSplit`: (itemId) => void

---

## Badge & Indicator Mapping

### Badges (Visual Tags)

| Badge | Current Location | New Location | Conditions |
|-------|------------------|--------------|------------|
| **Most Wanted** | Card header | Grid + Detail | `favoriteGroups.length > 0` OR `singleGroupName` |
| **All Groups** | Card header | Grid + Detail | `favoriteGroups.length === totalUserGroups` |
| **Group-Specific** | Card header | Grid + Detail | Individual badges per group |
| **Your Claim** | Card header | Grid + Detail | `isYourClaim=true` |
| **Taken** | Card top-right | Grid + Detail | `isTaken=true` (celebrant view) |
| **Tier Badge** | Card body | Detail | `item_type=mystery_box` + tier value |

### Indicators (Interactive Elements)

| Indicator | Current Location | New Location | Conditions |
|-----------|------------------|--------------|------------|
| **ClaimerAvatar** | Card top-right | Grid + Detail | `claim?.claimer && !isYourClaim` |
| **ClaimTimestamp** | Card top-right | Detail only | `claim?.created_at && !isCelebrant` |
| **FavoriteHeart** | Card top-right | Detail + Options | `showFavoriteHeart=true` (owner only) |
| **Split Progress** | Card body | Detail only | `splitStatus.isOpen=true` |
| **Contributor Count** | None (new) | Grid | `contributors.length > 0` |

### Visual States

| State | Property | Grid Card | Detail Screen |
|-------|----------|-----------|---------------|
| **Dimmed** | `dimmed=true` | Opacity 0.6 | Normal (dimming only in grid) |
| **Favorite Border** | `isFavorite` | 2px Burgundy-300 | Same |
| **Special Item Border** | `item_type` | surprise_me: Burgundy-200<br>mystery_box: Gold-300 | Same |
| **Loading** | `claiming=true` | N/A | Button spinner |

---

## Internal Logic Migration

The current component has helper functions that need to be replicated:

### Icon Selection Logic (lines 112-121)

```typescript
getCardIcon(): 'help-circle' | 'gift' | 'gift-outline' {
  switch (item.item_type) {
    case 'surprise_me': return 'help-circle';
    case 'mystery_box': return 'gift';
    default: return 'gift-outline';
  }
}
```

**Target**: Utility function in `lib/itemHelpers.ts` or inline in WishlistGridCard

---

### Border Color Logic (lines 124-138)

```typescript
getCardBorderColor() {
  // Favorite items (non-special) → burgundy
  if (isFavorite && !isSpecialItem) return colors.burgundy[300];

  // Special items → type-specific
  switch (item.item_type) {
    case 'surprise_me': return colors.burgundy[200];
    case 'mystery_box': return colors.gold[300];
    default: return colors.gold[100];
  }
}
```

**Target**: Utility function or inline in WishlistGridCard

---

### Gradient Colors Logic (lines 141-150)

```typescript
getGradientColors(): [string, string] {
  switch (item.item_type) {
    case 'surprise_me': return [colors.burgundy[400], colors.burgundy[600]];
    case 'mystery_box': return [colors.gold[400], colors.gold[600]];
    default: return [colors.gold[400], colors.gold[600]];
  }
}
```

**Target**: Utility function for accent bars in grid card

---

### Price Formatting Logic (lines 220-230)

```typescript
formatPrice(price?: number | null) {
  // Mystery box: tier price
  if (item.item_type === 'mystery_box' && item.mystery_box_tier) {
    return `€${item.mystery_box_tier}`;
  }
  // Surprise me: budget label
  if (item.item_type === 'surprise_me' && item.surprise_me_budget) {
    return `Budget: €${item.surprise_me_budget}`;
  }
  // Standard: dollar price
  if (!price) return null;
  return `$${price.toFixed(2)}`;
}
```

**Target**: Utility function in `lib/itemHelpers.ts`

---

## Animation Migration

### Current Animation (lines 233-252)

```typescript
<MotiView
  from={{ opacity: 0, scale: 0.9, translateY: 50 }}
  animate={{ opacity: 1, scale: 1, translateY: 0 }}
  transition={{
    type: 'spring',
    delay: index * 100,
    damping: 20,
    stiffness: 200,
  }}
>
```

**Target**: WishlistGridCard component
**Props Required**: `index` (for staggered animation)
**Note**: FlashList compatibility - animation should not affect layout measurements

---

## Requirements Traceability

### PARITY-01: All actions functional

| Action | Source Location | Target Location | Status |
|--------|----------------|-----------------|--------|
| Delete item | Card delete button | ItemOptionsSheet | ✅ Mapped |
| Edit priority | Card star rating | Detail inline + Options | ✅ Mapped |
| Toggle favorite | Card heart icon | Detail button + Options | ✅ Mapped |
| Claim item | Card claim button | Detail claim button | ✅ Mapped |
| Unclaim item | Card unclaim button | Detail unclaim button | ✅ Mapped |
| Open split | Card button | Detail button | ✅ Mapped |
| Contribute to split | Card contribute button | Detail contribute button | ✅ Mapped |
| Close split | Card close split button | Detail close split button | ✅ Mapped |
| Go to store | Card "View Product" button | Detail "Go to Store" button | ✅ Mapped |
| View details | Card tap (implicit) | Grid tap → Detail screen | ✅ Mapped |

**All 10 actions mapped to appropriate destinations.**

---

### PARITY-02: All badges display correctly

| Badge/Indicator | Source | Target | Conditions |
|----------------|--------|--------|------------|
| Most Wanted (single) | Card header | Grid + Detail | `singleGroupName` OR `favoriteGroups.length === 1` |
| Most Wanted (all groups) | Card header | Grid + Detail | `favoriteGroups.length === totalUserGroups > 1` |
| Most Wanted (per group) | Card header | Detail only | `favoriteGroups.map(...)` |
| Your Claim | Card header | Grid + Detail | `isYourClaim=true` |
| Taken | Card top-right | Grid + Detail | `isTaken=true` (celebrant) |
| Tier Badge | Card body | Detail | `mystery_box_tier` value |
| Claimer Avatar | Card top-right | Grid + Detail | `claim?.claimer && !isYourClaim` |
| Claim Timestamp | Card top-right | Detail only | `claim?.created_at && !isCelebrant` |
| Your Contribution | Card body | Detail | `userPledgeAmount > 0` |

**All 9 badge types mapped.**

---

### PARITY-03: Celebrant privacy rules

| Privacy Rule | Implementation | Target Components |
|--------------|----------------|-------------------|
| Hide claimer identity | `isTaken=true` → TakenBadge (no ClaimerAvatar) | Grid + Detail |
| Hide split details | `isCelebrant=true` → no SplitContributionProgress (detail) | Detail |
| Hide contribution amounts | Celebrant sees "Taken" only (no contributors list) | Detail |
| Dim claimed items | `dimmed=true` → opacity: 0.6 | Grid only |
| Block split UI | `isCelebrant=true` → hide all split controls | Detail |

**Props controlling privacy**:
- `isTaken`: boolean (show generic "taken" state)
- `isCelebrant`: boolean (hide split details completely)
- `dimmed`: boolean (visual feedback in grid)

**Privacy logic**: When `isCelebrant=true`, the system:
1. Shows `isTaken=true` instead of `claim` object
2. Hides `ClaimerAvatar` and `ClaimTimestamp`
3. Hides `SplitContributionProgress` and `ContributorsDisplay`
4. Dims card in grid (`dimmed=true`)

**All privacy rules documented and mapped.**

---

## Migration Checklist

### Phase 1: Foundation (Current Phase)
- [x] Install expo-image
- [x] Document complete prop mapping
- [x] Document all view contexts
- [x] Document special item types
- [x] Trace PARITY requirements

### Phase 2: Core Components (Next)
- [ ] Create `lib/itemHelpers.ts` with utility functions
- [ ] Build `WishlistGridCard` component
- [ ] Build `ItemDetailScreen` component
- [ ] Build `ItemOptionsSheet` component

### Phase 3: Split System (After Core)
- [ ] Migrate `SplitContributionProgress` to detail screen
- [ ] Migrate `ContributorsDisplay` to detail screen
- [ ] Migrate `SplitModal` to detail screen
- [ ] Migrate `OpenSplitModal` to detail screen

### Phase 4: Integration (Final)
- [ ] Update screen containers to use new components
- [ ] Verify all 4 view contexts work correctly
- [ ] Verify all 3 item types render correctly
- [ ] Verify split flows work correctly
- [ ] Remove `LuxuryWishlistCard` (deprecate)

---

## Key Files Reference

### Source Files
- `components/wishlist/LuxuryWishlistCard.tsx` (603 lines, 27 props)
- `components/wishlist/FavoriteHeart.tsx` (favorite toggle UI)
- `components/wishlist/MostWantedBadge.tsx` (favorite badge)
- `components/wishlist/ClaimButton.tsx` (claim/unclaim/split buttons)
- `components/wishlist/ClaimerAvatar.tsx` (claimer display)
- `components/wishlist/TakenBadge.tsx` (celebrant privacy)
- `components/wishlist/YourClaimIndicator.tsx` (your claim badge)
- `components/wishlist/SplitContributionProgress.tsx` (split progress bar)
- `components/wishlist/ContributorsDisplay.tsx` (contributor avatars)
- `components/wishlist/SplitModal.tsx` (pledge modal)
- `components/wishlist/OpenSplitModal.tsx` (open split dialog)
- `components/wishlist/ClaimTimestamp.tsx` (claim timestamp)

### Target Files (to create)
- `components/wishlist/WishlistGridCard.tsx` (new grid item)
- `components/wishlist/ItemDetailScreen.tsx` (new detail screen)
- `components/wishlist/ItemOptionsSheet.tsx` (new options sheet)
- `lib/itemHelpers.ts` (shared utility functions)

### Integration Points
- `screens/MyWishlistScreen.tsx` (owner context)
- `screens/CelebrationScreen.tsx` (celebrant/viewer/claimer contexts)
- `types/database.types.ts` (WishlistItem, ClaimWithUser types)

---

## Summary

This inventory documents the complete migration path from the monolithic `LuxuryWishlistCard` (603 lines, 27 props) to a clean, focused architecture:

- **WishlistGridCard**: Compact, fast, grid-optimized (handles props 1, 4-5, 8-9, 14-18, 27-30)
- **ItemDetailScreen**: Full details, all actions, split management (handles props 1, 3, 5-7, 10-26, 27-30)
- **ItemOptionsSheet**: Owner-only actions (handles props 2-3, 5-7, 27, 29)

**Total props mapped**: 30 (including derived props from `item` object)
**View contexts documented**: 4 (owner, celebrant, claimer, viewer)
**Special item types covered**: 3 (standard, surprise_me, mystery_box)
**PARITY requirements traced**: All 3 (actions, badges, privacy)

Migration ensures **zero feature loss** and **improved maintainability** through separation of concerns.
