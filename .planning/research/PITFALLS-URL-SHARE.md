# Pitfalls Research

**Domain:** URL Scraping, Share Intents, Multi-Wishlist Migration for React Native/Expo
**Researched:** 2026-02-16
**Confidence:** HIGH (based on existing codebase analysis + verified external research)

---

## Critical Pitfalls

### Pitfall 1: RLS Policy Conflicts During Wishlist Restructure

**What goes wrong:**
Adding a `wishlists` table that owns items (moving from `wishlist_items.group_id` to `wishlist_items.wishlist_id`) while existing RLS policies on `gift_claims` and `celebration_contributions` still reference `group_id` via joins. The existing `claim_item()` function validates "shared group membership" which will break when items can exist in user-owned wishlists outside any group.

**Why it happens:**
The current `claim_item()` RPC (line 318-325 in v1.3 migration) does:
```sql
IF NOT EXISTS (
  SELECT 1 FROM public.group_members gm_owner
  JOIN public.group_members gm_claimer
    ON gm_claimer.group_id = gm_owner.group_id
  WHERE gm_owner.user_id = v_item.user_id
    AND gm_claimer.user_id = v_user_id
)
```
This fails silently when items aren't in groups or when multi-wishlist introduces friend-based visibility instead of group-based.

**How to avoid:**
1. Create new visibility helper function `can_view_wishlist_item(item_id, viewer_id)` that handles both group-based AND friend-based visibility
2. Update `claim_item()` to use the new helper
3. Use expand-and-contract migration: add `wishlist_id` column, run dual-write for a migration period, then drop `group_id` reference
4. Test RLS policies from client SDK, not SQL editor (SQL editor bypasses RLS)

**Warning signs:**
- "Permission denied" errors when claiming items that were previously claimable
- Empty results when querying gift_claims for items in new wishlists
- Celebrant exclusion breaking (they can suddenly see claims)

**Phase to address:**
Phase 1 (Database Foundation) - Must be resolved before any feature implementation

---

### Pitfall 2: Share Intent Data Loss on Cold Start

**What goes wrong:**
User shares a URL from Safari/Chrome to your app, but the app doesn't receive the data. The share sheet dismisses, the app launches, but no item is created. User thinks it worked and closes the app.

**Why it happens:**
- Only using `addEventListener('url', callback)` without `getInitialURL()` - misses cold start links
- iOS Share Extensions have memory constraints (~120MB) - React Native + Hermes uses ~80MB leaving little room
- `getInitialURL()` bug on Android (facebook/react-native#25675) can cause it to never resolve
- Remote JS Debugging active causes `getInitialURL()` to return null

**How to avoid:**
1. Always implement BOTH `getInitialURL()` AND `addEventListener` patterns:
```typescript
// Cold start
const initialUrl = await Linking.getInitialURL();
if (initialUrl) handleSharedUrl(initialUrl);

// Warm start
const subscription = Linking.addEventListener('url', ({url}) => handleSharedUrl(url));
```
2. Add timeout to `getInitialURL()` (max 3 seconds) with fallback
3. Use `expo-share-intent` which handles these edge cases
4. Persist incoming URLs to AsyncStorage immediately before processing
5. Set `launchMode="singleTask"` in AndroidManifest.xml

**Warning signs:**
- Share works in development but fails in production builds
- Share works when app is already open but fails when app is closed
- Intermittent "lost" shares with no pattern

**Phase to address:**
Phase 2 (Share Intent Foundation) - Critical path for the entire feature

---

### Pitfall 3: URL Scraper Brittleness (Silent Failures)

**What goes wrong:**
Scraper works perfectly for Amazon URLs during development, then silently returns empty/wrong metadata in production for Target, Etsy, small retailers. Users add items with missing images, wrong titles, or $0 prices.

**Why it happens:**
- JavaScript-rendered content (React/Vue SPAs) not visible to basic HTTP requests
- Sites return different HTML to bots vs browsers (User-Agent sniffing)
- OpenGraph tags missing, malformed, or duplicated
- Price/image in dynamic JavaScript, not static HTML
- Rate limiting / bot detection blocking scraper
- CORS preventing client-side scraping entirely

**How to avoid:**
1. Use server-side scraping (Edge Function) - never client-side
2. Implement graceful degradation with manual entry fallback:
```typescript
const metadata = await scrapeUrl(url);
return {
  title: metadata.ogTitle || metadata.title || '', // User must fill if empty
  image_url: metadata.ogImage || null, // Show placeholder
  price: metadata.price || null, // Optional field
  needs_review: !metadata.ogTitle // Flag for user attention
};
```
3. Cache successful scrapes (avoid re-scraping same URL)
4. Add proper User-Agent and accept headers mimicking real browser
5. Build retailer-specific parsers for top 5-10 sites (Amazon, Target, Walmart, Etsy, Best Buy)

**Warning signs:**
- Works for Amazon but fails for other retailers
- Image URLs that 404 after a few days (CDN signed URLs)
- Prices showing as $0 or missing entirely
- Same product showing different metadata on retry

**Phase to address:**
Phase 3 (URL Metadata Extraction) - Build with fallbacks from day one

---

### Pitfall 4: Migration Data Corruption (Existing Wishlists)

**What goes wrong:**
Running migration to add `wishlist_id` column and create default wishlists, but existing `gift_claims` become orphaned or point to wrong items. Users lose their claim history, or claims appear on wrong people's items.

**Why it happens:**
- Migration creates new `wishlists` entries but doesn't update foreign key references atomically
- Partial migration failure leaves database in inconsistent state
- Production database has edge cases not in development (items with NULL group_id that were valid under old schema)
- RLS policies evaluated during migration with different context than expected

**How to avoid:**
1. Use expand-and-contract pattern strictly:
   - Phase A: Add `wishlist_id` column as NULLABLE, add `wishlists` table
   - Phase B: Backfill `wishlist_id` for all existing items (batch of 1000)
   - Phase C: Deploy app version that writes to BOTH columns
   - Phase D: Validate all data has `wishlist_id`
   - Phase E: Make `wishlist_id` NOT NULL, drop old constraint
2. Create pre-migration validation query:
```sql
-- Run before migration to identify edge cases
SELECT COUNT(*) FROM wishlist_items WHERE group_id IS NULL AND user_id IS NULL;
SELECT COUNT(*) FROM gift_claims gc
JOIN wishlist_items wi ON gc.wishlist_item_id = wi.id
WHERE wi.group_id IS NULL;
```
3. Keep rollback script ready and tested
4. Run migration during low-traffic period
5. Create snapshot of `gift_claims` and `wishlist_items` before migration

**Warning signs:**
- Migration takes >5 minutes (production data larger than expected)
- Foreign key constraint errors during migration
- User reports missing claims immediately after deploy
- Null pointer errors in claim-related queries

**Phase to address:**
Phase 1 (Database Foundation) - First thing to execute, with rollback plan

---

### Pitfall 5: Expo/EAS Share Extension Build Failures

**What goes wrong:**
App builds successfully locally with `expo run:ios`, but fails on EAS build with cryptic Swift/Objective-C errors. Or build succeeds but share extension doesn't appear in iOS share sheet.

**Why it happens:**
- iOS Share Extension requires separate bundle ID (`com.app.ShareExtension`)
- Firebase requires separate `GoogleService-Info.plist` per target
- EAS auto-configuration adds conflicting `appExtensions` to app.json
- Share extension has different entitlements than main app
- Text/TextInput components have font scaling issues in share extension context

**How to avoid:**
1. Manually configure EAS build in `eas.json` - don't rely on auto-detect:
```json
{
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  }
}
```
2. Test share extension on physical device (simulators behave differently)
3. Use `expo-share-intent` over custom share extension (simpler, maintained)
4. If custom view needed, use `expo-share-extension` with provided Text components
5. Verify App Group configuration for data sharing between extension and main app

**Warning signs:**
- Build logs showing "duplicate extension target"
- Share sheet not showing your app after install
- Share extension crashes immediately upon selection
- "Unable to load" error in share extension view

**Phase to address:**
Phase 2 (Share Intent Foundation) - Test on EAS early, not just local builds

---

### Pitfall 6: Celebrant Exclusion Leakage in Multi-Wishlist

**What goes wrong:**
When items can belong to multiple wishlists (or be shared across celebrations), the celebrant exclusion RLS policies no longer work correctly. Celebrant can see claims on their items, or worse, non-group-members can see claims.

**Why it happens:**
Current RLS on `gift_claims` (line 56-66 of v1.3) checks:
```sql
EXISTS (
  SELECT 1 FROM public.wishlist_items wi
  JOIN public.group_members gm_owner ON gm_owner.group_id = wi.group_id
  JOIN public.group_members gm_viewer ON gm_viewer.group_id = wi.group_id
  WHERE wi.id = gift_claims.wishlist_item_id
)
```
When `wi.group_id` becomes nullable (multi-wishlist), this JOIN fails for items not in groups. Items shared to friends (not groups) have no `group_members` rows to join on.

**How to avoid:**
1. Create visibility context enum: `group_shared`, `friend_shared`, `private`
2. Build visibility check function that handles all contexts:
```sql
CREATE FUNCTION can_view_item_claims(item_id UUID, viewer_id UUID)
RETURNS BOOLEAN AS $$
  -- Check: viewer is NOT item owner (celebrant exclusion)
  -- AND (item is in shared group with viewer OR item owner is friend of viewer)
$$;
```
3. Update ALL claim-related RLS policies atomically in single migration
4. Add comprehensive tests for each visibility scenario BEFORE migration

**Warning signs:**
- "Surprise ruined" reports from users seeing claims on their items
- Empty claim lists where claims should appear
- `gift_claims` SELECT returning 0 rows for items with claims

**Phase to address:**
Phase 1 (Database Foundation) - Must be designed correctly before feature work

---

### Pitfall 7: OpenGraph Image URL Expiration

**What goes wrong:**
Product images display correctly when item is added, but show broken images after days/weeks. The stored `image_url` returns 403 Forbidden or 404 Not Found.

**Why it happens:**
- Many CDNs use signed URLs with expiration (AWS CloudFront, Shopify, etc.)
- og:image URLs point to dynamic resizing services that rate-limit
- Retailers change CDN structure and old URLs stop working
- Some og:image URLs are relative paths that were resolved incorrectly

**How to avoid:**
1. Download and re-host images to Supabase Storage at scrape time
2. Store original URL as fallback, but serve from your CDN
3. Add image refresh job that re-validates URLs periodically
4. Implement lazy image validation in client with fallback to placeholder
```typescript
const [imgError, setImgError] = useState(false);
<Image
  source={{ uri: imgError ? PLACEHOLDER : item.image_url }}
  onError={() => setImgError(true)}
/>
```

**Warning signs:**
- Images work on first load but fail on subsequent app opens
- "Refresh metadata" manually fixes the issue
- Specific retailers' images always fail (look for pattern)

**Phase to address:**
Phase 3 (URL Metadata Extraction) - Build with re-hosting from start

---

### Pitfall 8: Friend Visibility Without Group Context

**What goes wrong:**
Adding friend-based wishlist sharing but claims/contributions logic still assumes group context. User A shares wishlist with friend B, friend B claims an item, but claim doesn't show up because no `group_id` exists for the friendship-based share.

**Why it happens:**
Current architecture: `wishlist_items` -> `group_id` -> `group_members` -> visibility
New requirement: `wishlist_items` -> `wishlist_id` -> `wishlist_shares` -> `friends` -> visibility

The join path is completely different, but existing code has `group_id` hardcoded throughout.

**How to avoid:**
1. Create abstraction layer for "visibility context":
```typescript
type VisibilityContext =
  | { type: 'group', groupId: string }
  | { type: 'friend', friendId: string }
  | { type: 'private' };
```
2. All claim/contribution queries go through visibility-aware functions
3. Build new RLS policies that use helper functions, not direct joins
4. Add `share_type` column to track how item was shared

**Warning signs:**
- Friend shares work for viewing but claims fail
- "Not authorized" errors when friends try to claim
- Claims visible to owner (celebrant) in friend-shared context

**Phase to address:**
Phase 4 (Wishlist Sharing) - Must be designed with claiming in mind

---

### Pitfall 9: URL Parsing Edge Cases in Share Intent

**What goes wrong:**
Share intent receives malformed URLs, partial URLs, or non-URL text. App crashes or creates corrupted wishlist items.

**Why it happens:**
- User shares page with selection (text + URL mixed)
- Short URLs (bit.ly, t.co) not resolved
- URLs with special characters not properly encoded
- App links vs web links (amazon://product vs amazon.com/product)
- Some share intents include extra metadata (title, image) that conflicts with scraping

**How to avoid:**
1. Build robust URL extraction:
```typescript
function extractUrl(sharedContent: string): string | null {
  // Handle: pure URL, URL with text, multiple URLs (take first)
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = sharedContent.match(urlRegex);
  return matches?.[0] || null;
}
```
2. Resolve short URLs server-side before scraping
3. Validate URL is HTTP/HTTPS (reject app-specific schemes)
4. Sanitize and encode URLs before storage
5. Use try/catch around all URL parsing with graceful fallback

**Warning signs:**
- Crash reports from share intent handler
- Items created with URL as title (parsing failed)
- Duplicate items from same share (retry after error)

**Phase to address:**
Phase 2 (Share Intent Foundation) - Build parser with test suite covering edge cases

---

### Pitfall 10: Concurrent Migration + Live Traffic

**What goes wrong:**
Migration runs during active usage. Some items are created with old schema, some with new. Inconsistent state causes app crashes for specific users.

**Why it happens:**
- No feature flag to gate new behavior
- Migration adds NOT NULL constraint while old app version still writes NULL
- RLS policies updated but app hasn't deployed yet
- Indexes being rebuilt cause query timeouts

**How to avoid:**
1. Deploy in order:
   - Deploy app version that can read/write BOTH schemas
   - Run migration to add new columns (nullable)
   - Backfill existing data
   - Deploy app version that writes ONLY new schema
   - Add NOT NULL constraints
2. Use feature flags for new wishlist features
3. Run migrations with `CONCURRENTLY` for indexes
4. Schedule migration during lowest-traffic window (check analytics)
5. Have monitoring alert for error rate spike

**Warning signs:**
- Error rate increases during/after migration
- "Column X not found" errors in logs
- Some users can create items, others cannot

**Phase to address:**
Phase 1 (Database Foundation) - Plan deployment sequence before writing code

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Client-side URL scraping | No backend needed | CORS blocks most sites, security risks | Never - always use Edge Function |
| Storing OG image URLs directly | Simpler implementation | Broken images after URL expiration | MVP only - add re-hosting in v1 |
| Single `default` wishlist per user | Faster to ship | Migration needed when multi-wishlist added | Never - design for multiple from start |
| Hardcoding `group_id` checks | Works with current schema | Massive refactor for friend-sharing | Never - abstract visibility now |
| Skipping share intent cold-start handling | Works in hot reload | 50%+ of shares lost in production | Never - implement both patterns |
| Testing RLS in SQL editor | Faster iteration | Bugs only found in production | Never - always test via client SDK |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| URL Scraping | Trusting og:price format | Parse with regex, handle currencies ($, EUR, etc.) |
| Share Intent (iOS) | Using standard TextInput | Import Text/TextInput from expo-share-extension |
| Share Intent (Android) | Missing singleTask launchMode | Set in AndroidManifest.xml for proper intent handling |
| Supabase RLS | Testing in Dashboard SQL Editor | Test via client SDK - dashboard bypasses RLS |
| Expo EAS Build | Auto-config for share extension | Manual eas.json configuration required |
| Firebase + Share Extension | Using main app GoogleService-Info | Create separate plist for ShareExtension bundle ID |
| Image Storage | Direct URL storage | Download to Supabase Storage, store your URL |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Scraping every shared URL in real-time | Slow "add item" experience | Queue scraping, show "processing" state | >100 shares/hour |
| RLS policy with nested subquery | Slow claim queries | Use helper function with indexes | >10K gift_claims rows |
| Loading all wishlist items at once | App freezes on wishlist screen | Paginate with infinite scroll | >100 items per wishlist |
| Re-scraping same URL multiple times | Wasted compute, rate limiting | Cache by URL hash | Any production use |
| Friend visibility check per-item | N+1 queries on wishlist view | Batch friend check, join in query | >50 friends |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing scraping endpoint without auth | Bot abuse, billing spike | Require auth, rate limit per user |
| Trusting scraped price for payment logic | Price manipulation | Scrape for display only, verify at purchase |
| Storing user_metadata instead of app_metadata | User can modify their claims | Always use app_metadata for permissions |
| Allowing arbitrary URL schemes in share intent | App-link hijacking | Whitelist http/https only |
| RLS policy with OR instead of AND | Data leakage | Audit all policies for correct logic |
| Not re-validating RLS after migration | Celebrant sees claims | Test each policy post-migration |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback during URL scraping | User taps "Add" multiple times | Show spinner, disable button, optimistic UI |
| Requiring all metadata fields | User abandons if scrape fails | Make image/price optional, title required |
| Share extension crashes silently | User thinks share worked | Log errors, show toast in main app |
| Not handling duplicate URLs | Multiple identical items | Detect duplicates, ask "add anyway?" |
| Broken image with no fallback | Ugly empty space | Show product placeholder image |
| No preview before adding | User adds wrong item | Show scraped preview with edit option |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Share Intent:** Handles cold start (getInitialURL) - not just warm start events
- [ ] **Share Intent:** Works on physical device, not just simulator
- [ ] **URL Scraper:** Tested with 10+ different retailers (not just Amazon)
- [ ] **URL Scraper:** Handles JavaScript-rendered content (or gracefully degrades)
- [ ] **Multi-Wishlist:** RLS policies updated for ALL claim-related tables
- [ ] **Multi-Wishlist:** claim_item() RPC handles friend-based visibility
- [ ] **Migration:** Tested with production-size dataset (not just dev data)
- [ ] **Migration:** Rollback script tested and ready
- [ ] **Images:** Re-hosted to your CDN (not stored as external URLs)
- [ ] **Images:** Fallback placeholder when load fails
- [ ] **EAS Build:** Share extension tested on EAS, not just local

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS policy breaks claims | MEDIUM | Hotfix SECURITY DEFINER function to bypass broken policy, fix policy, remove hotfix |
| Share intent data loss | LOW | Cannot recover lost shares, but fix and communicate to users |
| Scraped data is wrong | LOW | Add "edit item" feature, batch re-scrape queue |
| Migration corrupts claims | HIGH | Restore from pre-migration snapshot, re-run with fixes |
| Images all broken | MEDIUM | Batch job to re-scrape and re-host all images |
| Celebrant sees claims | HIGH | Immediate hotfix to RLS, communicate breach to affected users |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RLS Policy Conflicts | Phase 1 - Database Foundation | Run claim_item() tests via client SDK, verify celebrant cannot see claims |
| Share Intent Cold Start | Phase 2 - Share Intent | Test share with app fully quit (not in background), verify item created |
| URL Scraper Brittleness | Phase 3 - URL Metadata | Test with Amazon, Target, Etsy, Best Buy, Walmart, Shopify store |
| Migration Data Corruption | Phase 1 - Database Foundation | Count claims before/after migration, verify FK integrity |
| EAS Build Failures | Phase 2 - Share Intent | Run EAS build before merging share intent code |
| Celebrant Exclusion Leakage | Phase 1 + Phase 4 | Integration test: friend-shared item claim hidden from owner |
| OpenGraph Image Expiration | Phase 3 - URL Metadata | Check image URLs 7 days after creation, verify still loading |
| Friend Visibility | Phase 4 - Wishlist Sharing | Test claim visibility for friend-shared vs group-shared items |
| URL Parsing Edge Cases | Phase 2 - Share Intent | Unit test suite with 20+ URL edge cases |
| Concurrent Migration | Phase 1 - Database Foundation | Feature flag deployment, zero-downtime migration test |

---

## Sources

**Share Intent:**
- [expo-share-intent npm](https://www.npmjs.com/package/expo-share-intent) - Package documentation and limitations
- [react-native-receive-sharing-intent GitHub](https://github.com/ajith-ab/react-native-receive-sharing-intent) - Implementation patterns
- [Supporting iOS Share Extensions on React Native](https://www.devas.life/supporting-ios-share-extensions-android-intents-on-react-native/) - Native implementation guide
- [React Native Linking docs](https://reactnative.dev/docs/linking) - getInitialURL vs addEventListener patterns
- [Medium: Limits of React Native iOS Share Extension](https://medium.com/kraaft-co/how-i-reached-the-limits-of-react-native-by-implementing-an-ios-share-extension-4f312b534f22) - Memory constraints

**URL Scraping:**
- [ScrapeGraphAI: Scraping Disasters](https://medium.com/@scrapegraphai/my-most-embarrassing-web-scraping-disasters-and-how-you-can-avoid-them-023c66d84b9d) - Common mistakes
- [Firecrawl: Web Scraping Mistakes](https://www.firecrawl.dev/blog/web-scraping-mistakes-and-fixes) - JavaScript rendering issues
- [open-graph-scraper GitHub](https://github.com/jshemas/openGraphScraper) - OG scraping library
- [OpenGraph.io: Error Fixes](https://www.opengraph.io/open-graph-error-fixes) - OG tag edge cases

**Database Migration:**
- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) - Multi-tenant patterns
- [PlanetScale: Safe Schema Changes](https://planetscale.com/blog/safely-making-database-schema-changes) - Expand-and-contract pattern
- [Quesma: Schema Migration Pitfalls](https://quesma.com/blog-detail/schema-migrations) - Production migration risks
- [Supabase RLS Troubleshooting](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - Performance patterns

**Deep Linking:**
- [React Navigation: Deep Linking](https://reactnavigation.org/docs/deep-linking/) - Edge cases documentation
- [Medium: Deep Linking That Works](https://medium.com/@nikhithsomasani/react-native-deep-linking-that-actually-works-universal-links-cold-starts-oauth-aced7bffaa56) - Cold start handling

---
*Pitfalls research for: URL Scraping + Share Intents + Multi-Wishlist Migration*
*Researched: 2026-02-16*
