# Feature Research: v1.7 URL Scraping, Share Intent, Multi-Wishlist

**Domain:** Wishlist App Enhancement
**Researched:** 2026-02-16
**Confidence:** HIGH

## Summary

This research covers three interconnected features for v1.7: URL scraping (auto-extract product metadata from links), share intent (receive shared URLs from other apps), and multi-wishlist architecture (users own multiple named wishlists). These features are **table stakes** in the competitive wishlist app landscape -- GoWish, Amazon Wishlist, Giftful, and others all support them. Without these, the app feels limited compared to universal wishlist apps.

The key architectural insight is that **items should belong to wishlists, and wishlists should be visible to groups** -- a shift from the current model where items belong directly to groups. This enables users to maintain personal wishlists that can be selectively shared with different friend groups.

URL scraping should be **server-side via Supabase Edge Functions** for reliability, CORS avoidance, and caching. Share intent requires **expo-share-intent** and a custom dev client (no Expo Go support).

---

## 1. URL Scraping Features

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Auto-extract title from URL | Every competitor does this; manual entry feels broken | MEDIUM | Use Open Graph `og:title` or HTML `<title>` fallback |
| Auto-extract primary image | Visual wishlists are standard; blank cards look incomplete | MEDIUM | Priority: `og:image` > `product:image` > first large image |
| Auto-extract price | Price is core wishlist data; Amazon/GoWish auto-populate | MEDIUM | Schema.org Product price, `og:price:amount`, regex fallback |
| Loading state while scraping | Users expect feedback; silent processing feels broken | LOW | Skeleton card or progress indicator |
| Graceful fallback for failed URLs | Not all sites have metadata; app shouldn't crash | LOW | Allow manual entry when scraping fails |
| Edit scraped data before saving | Users need to fix wrong extractions | LOW | Pre-fill form, let user modify |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Store logo/brand detection | Visual polish; shows app "understands" the link | LOW | Extract favicon or use domain-based icon library |
| Multiple image extraction | Let user pick best product image | MEDIUM | Scrape `og:image` array or product gallery |
| Currency detection | International users; proper formatting | LOW | `og:price:currency` or locale detection |
| Description extraction | Richer item context | LOW | `og:description` or meta description |
| Retailer-specific scrapers | Higher accuracy for popular stores (Amazon, Target, Etsy) | HIGH | Custom parsers for top 10 retailers; defer to v2 |
| Price tracking/alerts | Know when wishlist items go on sale | HIGH | Requires periodic re-scraping; defer to v2+ |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full page screenshot | "Show me exactly what I saved" | Heavy on storage/bandwidth; rarely useful | Extract key image + store link |
| Automatic price updates | "Keep prices current" | Requires background jobs, server costs, rate limiting | Manual refresh button; price tracking in v2+ |
| Direct purchase from app | "Buy without leaving" | Legal/affiliate complexity; breaks store relationship | Deep link to retailer |
| AI product recommendations | "Suggest similar items" | Scope creep; not core value; privacy concerns | Let users browse friends' lists |
| Client-side scraping | "No server needed" | CORS blocks, unreliable, battery drain | Server-side Edge Function |

---

## 2. Share Intent Features

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Receive shared URLs from any app | Core share intent behavior; GoWish, Pinterest support this | MEDIUM | expo-share-intent handles iOS/Android |
| Open add-item flow with pre-filled URL | Natural continuation of share action | LOW | Route to AddItemBottomSheet with URL |
| App appears in share sheet | User expectation for wishlist apps | MEDIUM | iOS Share Extension + Android Intent Filter config |
| Handle app not running (cold start) | Share should work even if app closed | MEDIUM | expo-share-intent provider handles this |
| Show loading while scraping shared URL | User feedback during metadata extraction | LOW | Reuse scraping loading state |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Quick-add without opening full form | One-tap to default wishlist; friction reduction | MEDIUM | "Add to [Default List]" action in share sheet |
| Choose wishlist during share | Control where item goes | LOW | List picker in add-item flow |
| Shared text parsing | Extract URLs from shared text blocks | LOW | Regex URL extraction from shared content |
| Batch URL sharing | Add multiple links at once | MEDIUM | Parse multiple URLs from shared text |
| Share intent for images | Save product images directly | HIGH | Reverse image search complexity; defer |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| iOS custom share view | "Native-feeling share experience" | expo-share-intent doesn't support; significant complexity | Launch main app immediately |
| Background scraping without opening app | "Seamless adding" | iOS limitations; user confusion about where item went | Always show confirmation |
| Auto-detect price from screenshots | "I screenshot deals" | OCR complexity; unreliable | Support image as item photo, manual price entry |
| Sharing to specific groups | "Add to work friends group" | Confusing UX; items belong to wishlists, not groups | Share to wishlist; wishlist visibility controls group access |

---

## 3. Multi-Wishlist Features

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create multiple named wishlists | GoWish, Amazon, all competitors support this | MEDIUM | New `wishlists` table; items reference wishlist_id |
| Default "My Wishlist" for existing items | Migration path; no data loss | LOW | Create default wishlist per user on migration |
| Rename wishlists | Basic list management | LOW | Simple CRUD |
| Delete wishlists (with confirmation) | Standard list management | LOW | Soft delete or move items to default |
| Move items between wishlists | Organizational flexibility | MEDIUM | Update item's wishlist_id |
| View all items across all wishlists | Overview/search capability | LOW | Query all user's items |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Public vs Private wishlists | Privacy control per list | MEDIUM | `visibility` column: public/friends/private |
| Wishlist for others (gift ideas) | "Save ideas for Mom's birthday" | LOW | `for_user_id` nullable column |
| Wishlist sharing with non-app users | Expand reach; viral growth | MEDIUM | Public shareable links |
| Wishlist templates (Birthday, Wedding, Baby) | Guided experience for new users | LOW | Preset names/icons; UI only |
| Wishlist cover images/themes | Personalization; visual appeal | LOW | Custom or preset cover images |
| Collaborative wishlists | Couples/families share one list | HIGH | Permission system complexity; defer to v2 |
| Wishlist folders/categories | Organize many wishlists | MEDIUM | Hierarchical structure; defer if <10 lists typical |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Unlimited wishlists | "I want total freedom" | UI clutter; decision paralysis | Generous limit (20-50); increase on request |
| Complex permission per item | "Share this item but not that one" | UX nightmare; permission sprawl | Share at wishlist level only |
| Wishlist version history | "Undo my changes" | Storage overhead; rarely used | Soft delete with 30-day recovery |
| Real-time collaborative editing | "Edit together like Google Docs" | Complex sync; overkill for wishlists | Single-owner model; add collaborators later |
| Per-group item visibility | "Show this item to family but not friends" | Current model complexity; confusing | Wishlist-level visibility; different wishlists for different audiences |

---

## Feature Dependencies

```
[URL Scraping]
    |
    +--requires--> [Supabase Edge Function for server-side scraping]
    |                  |
    |                  +--extracts--> [Open Graph metadata]
    |                  |
    |                  +--extracts--> [Schema.org Product data]
    |
    +--enhances--> [Share Intent] (shared URLs get auto-scraped)

[Share Intent]
    |
    +--requires--> [expo-share-intent package]
    |
    +--requires--> [Custom dev client (no Expo Go)]
    |
    +--requires--> [URL Scraping] (to populate item data)
    |
    +--enhances--> [Multi-Wishlist] (choose target list during share)

[Multi-Wishlist]
    |
    +--requires--> [Database migration] (new wishlists table)
    |
    +--requires--> [Items reference wishlist_id]
    |
    +--enhances--> [Share Intent] (list picker in add flow)
    |
    +--CONFLICTS--> [Current group_id on items] (need migration strategy)
```

### Dependency Notes

- **URL Scraping requires server-side Edge Function:** Client-side scraping is unreliable (CORS, blocked by sites, battery drain). Supabase Edge Functions provide the right architecture.
- **Share Intent requires URL Scraping:** The whole point of receiving shared links is to auto-populate item data.
- **Share Intent requires custom dev client:** expo-share-intent uses native code incompatible with Expo Go.
- **Multi-Wishlist conflicts with current group_id model:** Current items belong to groups via `group_id`. New model: items belong to wishlists, wishlists are visible to groups. Requires careful migration.

---

## Migration Strategy: group_id to wishlist_id

### Current Model
```
wishlist_items.group_id → groups.id
```
Items belong directly to groups. Users see one wishlist per group.

### Target Model
```
wishlists.user_id → users.id
wishlist_items.wishlist_id → wishlists.id
wishlist_group_visibility (or visibility settings)
```
Items belong to user's wishlists. Wishlists are visible to groups based on settings.

### Migration Steps
1. Create `wishlists` table with `user_id`, `name`, `visibility`, `is_default`
2. For each user, create a default wishlist ("My Wishlist")
3. Add `wishlist_id` column to `wishlist_items` (nullable initially)
4. Migrate existing items:
   - If item has `group_id`, assign to user's default wishlist
   - Set `wishlist_id` on all existing items
5. Make `wishlist_id` NOT NULL
6. `group_id` can remain for backward compatibility or be deprecated
7. Update RLS policies for new model

### Risk Assessment
- **Medium risk:** Significant schema change affecting core data
- **Mitigation:** Additive migration (don't remove `group_id` immediately), thorough testing

---

## MVP Definition

### Launch With (v1.7 Core)

- [ ] **URL Scraping Edge Function** - Extract og:title, og:image, og:price from any URL
- [ ] **AddItem URL paste + auto-scrape** - User pastes URL, metadata fills automatically
- [ ] **Share Intent basic** - Receive shared URLs, open add-item with pre-filled URL
- [ ] **Multi-wishlist CRUD** - Create/rename/delete multiple wishlists
- [ ] **Default wishlist migration** - Existing items move to user's default list
- [ ] **Wishlist picker in add-item** - Choose which list to add item to
- [ ] **Public/Private wishlist toggle** - Basic visibility control

### Add After Validation (v1.x)

- [ ] **Wishlist for others** - Add `for_user_id` when users request it
- [ ] **Multiple image selection** - When single-image extraction is limiting
- [ ] **Batch URL sharing** - When users complain about one-at-a-time
- [ ] **Wishlist templates** - When new user onboarding needs improvement
- [ ] **Retailer-specific scrapers** - When generic scraping fails too often
- [ ] **Shareable wishlist links** - When users want to share with non-app users

### Future Consideration (v2+)

- [ ] **Price tracking/alerts** - Requires background jobs, significant infrastructure
- [ ] **Collaborative wishlists** - Complex permission model, real-time sync
- [ ] **AI product recommendations** - Scope creep, privacy implications
- [ ] **Reverse image search** - High complexity, unclear value

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| URL metadata scraping | HIGH | MEDIUM | P1 |
| Share intent receive URLs | HIGH | MEDIUM | P1 |
| Multiple wishlists | HIGH | MEDIUM | P1 |
| Wishlist visibility (public/private) | MEDIUM | LOW | P1 |
| Edit scraped data before save | HIGH | LOW | P1 |
| Scraping loading state | MEDIUM | LOW | P1 |
| Choose wishlist during add | MEDIUM | LOW | P1 |
| Store logo/brand detection | LOW | LOW | P2 |
| Multiple image extraction | MEDIUM | MEDIUM | P2 |
| Wishlist for others | MEDIUM | LOW | P2 |
| Wishlist templates | LOW | LOW | P2 |
| Batch URL sharing | MEDIUM | MEDIUM | P3 |
| Retailer-specific scrapers | MEDIUM | HIGH | P3 |
| Price tracking | HIGH | HIGH | P3 |
| Collaborative wishlists | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.7 launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | GoWish | Amazon Wishlist | Giftful | Wishlists App | Our Approach |
|---------|--------|-----------------|---------|---------------|--------------|
| **URL scraping** | Yes, any store | Amazon only (since 2023) | Yes, any store | Yes, any store | Yes, server-side Edge Function |
| **Share intent** | Yes | Limited (Amazon app) | Yes | Yes | Yes, expo-share-intent |
| **Multiple lists** | Unlimited | Unlimited | Multiple | Multiple | Yes, generous limit (20-50) |
| **Public/private** | Yes | Yes | Yes | Yes | Yes, per-wishlist |
| **For others** | Yes (partner lists) | No | Yes | Yes | v1.x, based on demand |
| **Price tracking** | No | Yes (Amazon only) | No | Some | v2+, deferred |
| **Collaborative** | Yes (partner only) | No | Limited | No | v2+, deferred |
| **Group gifting** | No | No | Limited | No | **Our differentiator** |

### Competitive Positioning

Our differentiator is **group gifting coordination**, not the wishlist features themselves. URL scraping, share intent, and multi-wishlist are **table stakes** to be competitive. The unique value is:
- Celebrations with coordinated gift-giving
- Secret chat rooms for gift planning
- Split contributions on expensive items
- Gift leader rotation
- Hidden claims from celebrant

Multi-wishlist enhances this by letting users share different lists with different groups (birthday list for family, wedding registry for friends, tech wishlist for work colleagues).

---

## Technical Architecture Implications

### URL Scraping: Server-Side Edge Function

**Recommendation:** Supabase Edge Function (Deno runtime)

```
Mobile App                    Supabase Edge Function
    |                               |
    +-- POST /scrape-url ---------->|
    |   { url: "https://..." }      |
    |                               +-- Fetch URL HTML
    |                               +-- Parse Open Graph tags
    |                               +-- Parse Schema.org Product
    |                               +-- Extract fallback metadata
    |<-- { title, image, price } ---|
```

**Why server-side:**
- CORS not an issue (can fetch any URL)
- Better rate limiting and abuse prevention
- Can cache results for popular products
- Consistent behavior across devices
- Can add retailer-specific logic later
- Lower battery/bandwidth impact on mobile

**Extraction Priority:**
1. Open Graph: `og:title`, `og:image`, `og:price:amount`, `og:price:currency`
2. Schema.org Product JSON-LD: `name`, `image`, `offers.price`, `offers.priceCurrency`
3. Twitter Cards: `twitter:title`, `twitter:image`
4. HTML fallback: `<title>`, first large `<img>`, price regex patterns

**Libraries (Deno-compatible):**
- HTML parsing: Deno DOM or `node-html-parser` (npm compatible)
- JSON-LD extraction: manual parsing from `<script type="application/ld+json">`

### Share Intent: expo-share-intent

**Library:** expo-share-intent v5.1.1

**app.json Configuration:**
```json
{
  "plugins": [
    [
      "expo-share-intent",
      {
        "iosActivationRules": {
          "NSExtensionActivationSupportsWebURLWithMaxCount": 1,
          "NSExtensionActivationSupportsWebPageWithMaxCount": 1,
          "NSExtensionActivationSupportsText": true
        },
        "androidIntentFilters": ["text/*"]
      }
    ]
  ]
}
```

**Flow:**
1. User shares URL from Safari/Chrome/any app
2. Our app appears in iOS/Android share sheet
3. App opens with shared URL (cold start or existing)
4. ShareIntentProvider captures the URL
5. Navigate to AddItem flow with URL pre-filled
6. Trigger URL scraping
7. Present pre-filled form for user to review/edit
8. User selects target wishlist and saves

**Requirement:** Custom dev client (no Expo Go support)
- Use `npx expo prebuild` + `npx expo run:ios` or `npx expo run:android`
- EAS Build for production

### Multi-Wishlist: Database Schema

```sql
-- New wishlists table
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'friends', 'private')),
  for_user_id UUID REFERENCES auth.users(id), -- nullable, for "gift ideas for X"
  is_default BOOLEAN DEFAULT FALSE,
  cover_image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT one_default_per_user UNIQUE (user_id, is_default)
    WHERE is_default = TRUE
);

-- Index for common queries
CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX idx_wishlists_visibility ON wishlists(visibility);

-- Migration: Add wishlist_id to existing items
ALTER TABLE wishlist_items
  ADD COLUMN wishlist_id UUID REFERENCES wishlists(id);

-- RLS for wishlists
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Users can manage own wishlists"
  ON wishlists FOR ALL
  USING (user_id = auth.uid());

-- Friends can view friends-visibility wishlists
CREATE POLICY "Friends can view friends wishlists"
  ON wishlists FOR SELECT
  USING (
    visibility = 'friends' AND
    user_id IN (
      SELECT friend_id FROM friendships
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Anyone can view public wishlists
CREATE POLICY "Anyone can view public wishlists"
  ON wishlists FOR SELECT
  USING (visibility = 'public');
```

**Migration Script:**
```sql
-- Create default wishlist for each existing user
INSERT INTO wishlists (user_id, name, is_default, visibility)
SELECT DISTINCT user_id, 'My Wishlist', TRUE, 'friends'
FROM wishlist_items
WHERE user_id IS NOT NULL;

-- Assign existing items to their user's default wishlist
UPDATE wishlist_items wi
SET wishlist_id = w.id
FROM wishlists w
WHERE wi.user_id = w.user_id AND w.is_default = TRUE;

-- Make wishlist_id NOT NULL after migration
ALTER TABLE wishlist_items
  ALTER COLUMN wishlist_id SET NOT NULL;
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| URL scraping architecture | HIGH | Server-side Edge Functions are well-documented; Open Graph extraction is mature |
| expo-share-intent | HIGH | Actively maintained (v5.1.1), good documentation, clear configuration |
| Multi-wishlist schema | HIGH | Standard relational pattern; similar to competitor implementations |
| Migration strategy | MEDIUM | Schema change is significant; needs thorough testing and rollback plan |
| Group visibility integration | MEDIUM | Shift from group_id model to wishlist visibility needs careful UX design |
| Retailer-specific scraping | LOW | Deferred; generic OG extraction should cover 80%+ of use cases initially |
| Price tracking | LOW | Deferred; requires significant infrastructure (cron jobs, storage, notifications) |

---

## Sources

### URL Scraping
- [Open Graph Protocol](https://ogp.me/) - Official OG specification
- [open-graph-scraper npm](https://www.npmjs.com/package/open-graph-scraper) - Node.js reference implementation
- [metascraper GitHub](https://github.com/microlinkhq/metascraper) - Comprehensive metadata extraction
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) - Official docs
- [Web Scraping Best Practices 2025 - ScrapingBee](https://www.scrapingbee.com/blog/web-scraping-best-practices/)
- [Geekflare Meta Scraping API](https://geekflare.com/api/metascraping/) - API approach reference

### Share Intent
- [expo-share-intent GitHub](https://github.com/achorein/expo-share-intent) - Official repo
- [expo-share-intent npm](https://www.npmjs.com/package/expo-share-intent) - Package docs
- [Supporting iOS Share Extensions & Android Intents on React Native](https://www.devas.life/supporting-ios-share-extensions-android-intents-on-react-native/) - Implementation guide
- [react-native-receive-sharing-intent](https://github.com/ajith-ab/react-native-receive-sharing-intent) - Alternative approach

### Multi-Wishlist & Competitor Analysis
- [GoWish App](https://gowish.com/en) - Multi-wishlist leader
- [How GoWish Became Popular](https://www.sevensquaretech.com/how-gowish-became-popular-wishlist-app/) - UX patterns
- [10 Best Universal Wishlist Apps 2025](https://www.wishlists-app.com/blog/best-universal-wishlist-apps-2025) - Feature comparison
- [10 Best Universal Wishlist Apps - GiftList](https://giftlist.com/blog/10-best-universal-wishlist-apps-in-2025-ranked-and-reviewed) - Additional comparison
- [Shopee Wishlist UX Case Study](https://medium.com/@fadhil.ibrhm12/how-to-improve-the-experience-of-wishlist-feature-in-e-commerce-app-shopee-ux-case-study-eaa0e97ffca1) - Folder/category UX
- [How to Choose Wishlist App 2025 - Giftwhale](https://giftwhale.com/blog/how-to-choose-the-right-wish-list-app-in-2025) - Feature expectations
- [Amazon Wishlist Features](https://www.sellerapp.com/blog/amazon-wish-list/) - Amazon reference
- [Best Wishlist Sites 2025 - Listful](https://www.listful.com/blog/best-wishlist-sites-2025) - Market overview

---

*Feature research for: Wishlist App v1.7 - URL Scraping, Share Intent, Multi-Wishlist*
*Researched: 2026-02-16*
