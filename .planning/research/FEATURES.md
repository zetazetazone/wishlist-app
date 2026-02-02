# Features Research: v1.1 Wishlist Polish

**Research Date:** 2026-02-02
**Focus:** Wishlist UX polish features — favorites, surprise options, mystery placeholders, profile editing
**Confidence:** MEDIUM-HIGH — Based on competitive analysis, UX patterns from established wishlist apps, and post-onboarding profile editing conventions

## Summary

Wishlist apps in 2025 emphasize **flexibility and personalization**. Users expect multiple ways to signal gift preferences: explicit items with priorities, open-ended "surprise me" signals, and placeholder options for experiences/gift cards. Priority/favorite highlighting is table stakes with visual prominence (pinned position, distinct styling). Profile editing post-onboarding follows progressive disclosure patterns — users complete minimal onboarding first, then edit details later as needed. Mystery box/gift card placeholders are emerging patterns for monetization and flexibility.

---

## Favorite/Priority Item

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Visual priority distinction** | Users already set 1-5 star priority; needs clear visual difference | Low | Existing priority field |
| **Pinned position** | High-priority items should appear first in list | Low | List sorting logic |
| **Single favorite per context** | One "top pick" signals clearest preference to gift-givers | Low | Favorite flag on item |
| **Icon/badge indicator** | Heart, star, or "favorite" badge on item card | Low | UI component |

**Expected behavior:** Users mark one item as "favorite" (distinct from 1-5 star priority). Favorite item appears first in their wishlist with visual prominence (highlighted border, larger card, badge). When group members view the user's wishlist, favorite item is immediately visible.

**UX Pattern:** Heart icon (empty ↔ filled) or star icon (outline ↔ solid) on item card. Tap to toggle. Only one item can be favorite at a time; tapping another unfavorites the previous.

**Competitive examples:**
- GiftList uses "priority" feature with Must-have/Nice-to-have/Dream labels, ranked items appear at top
- Wishlists App uses folder organization with cover photos to highlight categories
- E-commerce wishlists use heart icon for favoriting with pinned first position

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Favorite per group** | User can have different favorite for each friend group context | Medium | Requires group_id scoping |
| **Auto-favorite highest priority** | If no favorite set, 5-star items auto-promote | Low | Computed property |
| **Favorite notification** | Alert gift-givers when user updates favorite ("Sarah changed her top pick!") | Medium | Notification integration |
| **Historical favorite tracking** | Show past favorites to detect preference patterns | High | Audit log |

**Recommended differentiator for v1.1:** **Favorite per group** — this aligns with the app's group-centric model. Different friend groups may have different budget contexts, so a user's "top pick" for college friends (€25 item) differs from family group (€100 item).

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Multiple favorites** | Dilutes signal; defeats purpose of "top pick" | Single favorite only |
| **Favorite as separate priority system** | Redundant with existing 1-5 stars | Favorite is "pin + highlight" not a priority level |
| **Favorite voting by group** | Adds social pressure, conflicts with personal preference | User chooses own favorite |
| **Favorite expiration** | Unnecessary complexity; user can change anytime | Persistent until manually changed |

---

## Surprise Me Option

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Open-ended gift signal** | Users want to signal "I'm flexible, any gift is welcome" | Low | Special item type or flag |
| **Text description field** | Users provide guidance (interests, size, colors, budget range) | Low | Text input |
| **Clear UI differentiation** | "Surprise Me" items look distinct from specific products | Low | Different card design |
| **Non-claimable** | Multiple people can give surprise gifts; no claiming needed | Low | Skip claiming logic |

**Expected behavior:** Users add a "Surprise Me" entry to their wishlist with optional guidance text. Examples: "Surprise me with anything golf-related" or "I love hiking — surprise me with gear in the €30-50 range". This appears in their wishlist as a distinct card type. Gift-givers see this as permission to choose creatively without claiming.

**UX Pattern:**
- Add button shows "Add Item" and "Add Surprise Me" options
- Surprise Me card has gift box icon 🎁 and dashed border
- Shows user's guidance text prominently
- No claim button; shows "Multiple gifts welcome" hint

**Competitive examples:**
- Gift registries allow "flexible gifting" with open-ended suggestions (Giftster: "sizes, colors and interests like gardening, golf")
- Universal registries support non-specific entries (MyRegistry allows free-text wish entries)
- SoKind Registry embraces open-ended gifts (experiences, homemade items, donations)

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Surprise Me budget tiers** | Users suggest ranges (€0-25, €25-50, €50+) for guidance | Low | Dropdown selection |
| **Category hints** | User selects categories (books, experiences, food, hobbies) | Low | Multi-select tags |
| **Reveal on birthday** | Gift-givers post what they gave; celebrant sees after birthday | Medium | Time-gated visibility |
| **Surprise Me inspiration prompts** | Pre-filled templates ("Books in my favorite genre", "Local restaurant gift card") | Low | Template library |

**Recommended differentiator for v1.1:** **Surprise Me budget tiers** — aligns with existing price field on items, gives gift-givers helpful constraint without being prescriptive.

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **AI gift suggestions** | Scope creep, requires external APIs, can feel impersonal | Let gift-givers choose personally |
| **Required category selection** | Over-constrains; defeats "surprise" purpose | Make categories optional hints |
| **Surprise Me claiming** | Removes flexibility; multiple people should be able to surprise | No claiming for Surprise Me |
| **Mandatory description** | Empty "Surprise Me" is valid (total openness) | Make description optional |

---

## Mystery Box Placeholder

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Predefined tiers** | Common gift card amounts (€25/€50/€100) reduce decision paralysis | Low | Dropdown or button group |
| **Generic gift signaling** | Signals "I want flexibility but here's value guidance" | Low | Special item type |
| **Clear visual design** | Mystery box icon or gift card styling | Low | Icon + card design |
| **Store/category optional** | User can specify ("€50 Amazon" vs "€50 any store") | Low | Optional text field |

**Expected behavior:** Users add a "Mystery Box" placeholder to wishlist by selecting a tier (€25/€50/€100) and optionally specifying a store or category. This appears as a distinct card type with mystery box 📦 or gift card icon. Gift-givers can claim it. When purchased, gift-giver marks as purchased (same as regular item). In future versions, this could become a direct gift card purchase flow.

**UX Pattern:**
- "Add Mystery Box" button alongside "Add Item" and "Add Surprise Me"
- Tier selection: Three buttons for €25 / €50 / €100
- Optional field: "Preferred store or category" (e.g., "Amazon", "Restaurant", "Any")
- Card displays tier amount prominently with mystery box icon
- Claimable by one person (standard claiming flow)

**Competitive examples:**
- Gift registries support cash funds for big-ticket items or flexible categories
- E-commerce wishlists allow gift card items with specific amounts
- Mystery box gifting is popular (Jackpot Candles mystery boxes, subscription mystery boxes)

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Custom tier amounts** | User sets any amount, not just preset tiers | Low | Numeric input |
| **Multi-tier selection** | User adds multiple mystery boxes at different tiers | Low | Multiple items allowed |
| **In-app gift card purchase** | Gift-givers buy digital gift cards directly in app | High | Payment integration, monetization |
| **Mystery box as group pooling** | Multiple people contribute to a single mystery box tier | Medium | Contribution tracking integration |
| **Store integrations** | Direct links to Amazon/iTunes/Steam gift card purchase pages | Medium | External links |

**Recommended differentiator for v1.1:** **Custom tier amounts** — simple extension, empowers users to set exact amounts that fit their group's norms (e.g., €35 for local group budget).

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Physical mystery boxes** | Requires inventory, shipping, curation | Digital placeholder only for v1.1 |
| **In-app payment processing** | Complex compliance, financial liability | External purchase only (future: link to stores) |
| **Forced store selection** | Reduces flexibility; "any store" is valid | Make store field optional |
| **Expiration dates** | Adds complexity; gift cards don't expire in wishlist context | No expiration |

---

## Profile Editing

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Edit display name** | Users want to update nickname/display name post-onboarding | Low | Update users.full_name |
| **Edit profile photo** | Users want to change avatar after initial setup | Medium | Avatar upload flow |
| **Edit birthday** | Users may have entered wrong date or want to correct | Low | Update users.birthday |
| **Settings/Profile page access** | Clear navigation to edit profile | Low | Settings screen |

**Expected behavior:** Users tap Settings or Profile icon, see their current profile information (name, photo, birthday), and can edit each field. Changes save immediately or with "Save" button. Validation ensures birthday is valid date and name is not empty. Photo upload follows same flow as onboarding (camera or library picker).

**UX Pattern:**
- Profile/Settings screen with editable fields (name, birthday) and avatar tap-to-change
- Edit modes: Inline editing (tap field to edit) or dedicated Edit Profile screen
- Validation messages for required fields or invalid dates
- Confirmation for sensitive changes ("Are you sure you want to change your birthday?")

**Competitive examples:**
- WishList.com: Edit profile picture (pencil icon), edit profile info, delete profile
- Wish app: Update first/last name, birthday, gender via Account Settings
- Standard app patterns: Settings screen with editable fields, inline or modal editing

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Birthday verification** | Prevent accidental changes with confirmation dialog | Low | Modal confirmation |
| **Email change flow** | Users can update email with verification | Medium | Auth re-verification required |
| **Privacy controls** | Hide birthday/age from certain groups or members | Medium | Per-group privacy settings |
| **Profile version history** | See past profile changes (audit log) | Medium | Audit trail |
| **Notification preferences** | Configure reminder timing, mute certain notifications | Medium | Notification settings integration |

**Recommended differentiator for v1.1:** **Birthday verification** — simple safeguard against accidental changes. Birthday is critical for celebration triggers, so confirmation dialog ("Your birthday is used for automatic reminders. Are you sure?") prevents mistakes.

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Profile visibility levels** | Over-engineering; group members need basic info to coordinate gifts | Keep profiles visible within groups |
| **Username/handle system** | Adds complexity; display name is sufficient | Use full_name as display |
| **Profile themes/customization** | Scope creep; not core to gift coordination | Standard profile layout |
| **Bio/about me section** | Not needed for gift coordination context | Focus on actionable fields (name, birthday, photo) |
| **Social features** (friend requests, followers) | Not a social network; groups are explicit | Group membership only |

---

## Feature Dependencies

### Existing Foundation (Already Built)
```
users table
├── full_name → Edit Profile: Display name
├── avatar_url → Edit Profile: Profile photo
├── birthday → Edit Profile: Birthday field
└── user_id → All features tie to user

wishlist_items table
├── priority (1-5) → Favorite builds on this
├── group_id → Favorite per group scoping
├── user_id → Owner of item
└── status → Claiming flow (reuse for Mystery Box)

groups table
└── group_id → Context for favorite per group
```

### New Capabilities Required
```
Favorite Item
├── Add: is_favorite BOOLEAN to wishlist_items (default FALSE)
├── Constraint: Only one favorite per user per group
└── UI: Favorite toggle, pinned sorting, highlight styling

Surprise Me
├── Add: item_type ENUM('item', 'surprise', 'mystery_box') to wishlist_items
├── Add: surprise_description TEXT (optional guidance)
├── Add: surprise_budget_min, surprise_budget_max NUMERIC (optional)
└── UI: Surprise Me card design, no claiming

Mystery Box
├── Reuse: item_type ENUM (add 'mystery_box')
├── Add: mystery_tier NUMERIC (preset or custom)
├── Add: mystery_store_preference TEXT (optional)
└── UI: Mystery Box card design, tier selection

Profile Editing
├── Reuse: users.full_name, users.avatar_url, users.birthday
├── Add: Profile/Settings screen with edit capability
└── Validation: Non-empty name, valid date, birthday confirmation
```

### Build Order Recommendation
1. **Profile Editing** (Low risk, independent) — Foundational UX improvement
2. **Favorite Item** (Builds on existing priority, straightforward) — Highest user value
3. **Mystery Box** (New item type, introduces pattern for Surprise Me) — Monetization foundation
4. **Surprise Me** (Reuses item type pattern from Mystery Box) — Completes flexibility options

---

## Confidence Assessment

| Area | Level | Reasoning |
|------|-------|-----------|
| Favorite/Priority | **HIGH** | Well-established pattern across e-commerce and wishlist apps; clear UX conventions |
| Surprise Me | **MEDIUM** | Pattern exists in gift registries but less standardized; terminology varies ("flexible", "open-ended", "any gift") |
| Mystery Box | **MEDIUM** | Gift card placeholders are common; mystery box framing is newer but growing (mystery subscription boxes, gamification trend) |
| Profile Editing | **HIGH** | Standard post-onboarding pattern across all apps; conventions are mature and well-documented |

**Overall Confidence:** MEDIUM-HIGH — Table stakes features are well-validated; differentiators have reasonable evidence from competitive analysis. Some terminology choices (e.g., "Surprise Me" vs "Flexible Gift") may need user validation, but core patterns are solid.

---

## Sources

**Favorite/Priority Patterns:**
- [Wishlists Design - How to design Wishlists for E-Commerce?](https://thestory.is/en/journal/designing-wishlists-in-e-commerce/)
- [Favorite Button - Add to Wishlist UX best design practise](https://www.abeerm.com/save-favorite-wishllst-ux-design.html)
- [How to Improve the Experience of "Wishlist" Feature in e-commerce app: Shopee UX case study](https://medium.com/@fadhil.ibrhm12/how-to-improve-the-experience-of-wishlist-feature-in-e-commerce-app-shopee-ux-case-study-eaa0e97ffca1)
- [GiftList Blog - Best Practices for Managing Wishlists Over Time](https://giftlist.com/blog/best-practices-for-managing-wishlists-over-time)

**Surprise Me / Flexible Gifting:**
- [Gift Registry vs. Wish List: What's the Difference & Which One Should You Use?](https://giftlist.com/blog/gift-registry-vs-wish-list-whats-the-difference-and-which-one-should-you-use)
- [Giftster - How to make a family wish list or gift registry](https://www.giftster.com/getting-started/)
- [11 Best Universal Registry Sites That Make Gift-Giving Easy in 2025](https://withjoy.com/blog/11-best-universal-registry-sites-that-make-gift-giving-easy-in-2025/)
- [SoKind Registry - More fun, less stuff!](https://sokindregistry.org/)

**Mystery Box / Gift Card Patterns:**
- [20 Wishlist Templates for Gifts, Goals & More in 2026](https://clickup.com/blog/wishlist-templates/)
- [7 Unforgettable Mystery Box Gift Ideas for 2025](https://www.jackpotcandles.com/blogs/news/mystery-box-gift-ideas)
- [The Ultimate Guide to Creating a Universal Wishlist (2025 Edition)](https://giftlist.com/blog/the-ultimate-guide-to-creating-a-universal-wishlist-2025-edition)

**Profile Editing / Post-Onboarding:**
- [Mobile UX design examples from apps that convert (2025)](https://www.eleken.co/blog-posts/mobile-ux-design-examples)
- [The Ultimate Guide to In-App Onboarding in 2025](https://www.appcues.com/blog/in-app-onboarding)
- [User Onboarding in Mobile Apps – What Patterns Work in 2025?](https://be-dev.pl/blog/user-onboarding-in-mobile-apps-what-patterns-work-in-2025)
- [WishList.com FAQ - Profile Editing](https://www.wishlist.com/faq/)
- [Wish App - Updating my Wish profile](https://cs-help.wish.com/hc/en-us/articles/360027878732-How-do-I-update-my-profile-)
