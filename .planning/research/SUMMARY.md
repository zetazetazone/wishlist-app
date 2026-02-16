# Project Research Summary

**Project:** Wishlist Group Gifting App - v1.7 Global Wishlist
**Domain:** Mobile wishlist app with URL scraping, share intents, and multi-wishlist architecture
**Researched:** 2026-02-16
**Confidence:** HIGH

## Executive Summary

v1.7 Global Wishlist represents a significant architectural evolution from group-centric to user-centric wishlist ownership. The research reveals three interconnected features that are **table stakes** in the competitive wishlist app landscape: URL scraping (auto-extract product metadata), share intent (receive shared URLs from other apps), and multi-wishlist architecture (users own multiple named wishlists). Without these features, the app feels limited compared to GoWish, Amazon Wishlist, Giftful, and other universal wishlist apps.

The recommended approach requires **two new npm dependencies** (`expo-share-intent@^5.1.1` and `patch-package@^8.0.0`) and **one new Edge Function** (`scrape-url` using Deno's `npm:cheerio`). The critical architectural insight is that **items should belong to wishlists, and wishlists should be visible to groups** — a fundamental shift from the current model where items belong directly to groups. This enables users to maintain personal wishlists that can be selectively shared with different friend groups, while maintaining the app's unique group gifting coordination features.

The key risks center around **database migration complexity** (RLS policy conflicts with existing claim/contribution logic) and **share intent cold start handling** (data loss if not implemented correctly). Both risks are well-documented with clear mitigation strategies. The migration requires an expand-and-contract pattern to avoid data corruption, and share intent must handle both `getInitialURL()` and `addEventListener` patterns. Edge Function scraping provides reliable, CORS-free metadata extraction, but requires graceful fallback for JavaScript-rendered content and sites with anti-bot protection.

## Key Findings

### Recommended Stack

Two new client dependencies and one new server component are required for v1.7. The existing stack (Expo SDK 54, React Native 0.81, Supabase) already has the necessary infrastructure (`expo-image`, `expo-linking`, Supabase Edge Functions) to support these features.

**Core technologies:**
- **expo-share-intent@^5.1.1**: Receive shared URLs from other apps — only actively maintained library for Expo SDK 54, handles iOS share extensions and Android intent filters with native code
- **patch-package@^8.0.0**: Post-install patches for share intent iOS configuration — required peer dependency for expo-share-intent's Xcode configuration patches
- **scrape-url Edge Function** (Deno + cheerio): Server-side URL metadata extraction — bypasses CORS issues, provides consistent parsing, lightweight at 200KB vs Puppeteer's 50MB+

**Already installed (reuse):**
- expo-image@3.0.11 for displaying scraped product images
- expo-linking@8.0.11 for opening product URLs in browser
- @supabase/supabase-js@2.93.3 for Edge Function invocation

### Expected Features

**Must have (table stakes):**
- **URL metadata scraping** — Auto-extract title, image, price from any product URL. Every competitor (GoWish, Amazon, Giftful) does this; manual entry feels broken.
- **Share intent URL reception** — Receive shared URLs from browser/store apps. Core wishlist app behavior; users expect to share from Safari/Chrome directly to wishlist.
- **Multiple wishlists per user** — Create/rename/delete named wishlists. Amazon, GoWish, all competitors support this; single-list feels limiting.
- **Default wishlist migration** — Existing items move to user's default "My Wishlist" without data loss.
- **Wishlist picker in add-item** — Choose which list to add item to during creation.
- **Public/private wishlist visibility** — Basic privacy control per list.
- **Editable scraped metadata** — Users can fix wrong extractions before saving.

**Should have (competitive advantage):**
- **Store logo/brand detection** — Visual polish showing app "understands" the link (extract favicon or domain-based icons).
- **Multiple image extraction** — Let user pick best product image from product gallery.
- **Currency detection** — International users benefit from proper formatting (`og:price:currency`).
- **Wishlist for others** — "Save ideas for Mom's birthday" use case (add `for_user_id` column).
- **Wishlist templates** — Guided experience for new users (Birthday, Wedding, Baby presets).

**Defer to v2+:**
- **Price tracking/alerts** — Know when items go on sale. Requires background jobs, significant infrastructure (cron, notifications, storage).
- **Collaborative wishlists** — Couples/families share one list. Complex permission system; defer until multi-wishlist validated.
- **Retailer-specific scrapers** — Custom parsers for Amazon, Target, Etsy. Generic Open Graph extraction should cover 80%+ initially.
- **Reverse image search** — Save product images directly from share intent. OCR complexity, unclear value.

### Architecture Approach

The architecture extends the existing React Native/Expo + Supabase foundation with three interconnected subsystems: Edge Function scraping (server-side to avoid CORS), share intent handling (native modules at root layout level), and multi-wishlist data model (new `wishlists` table with visibility controls).

**Major components:**
1. **scrape-url Edge Function** — Server-side HTML parsing using cheerio to extract Open Graph metadata (title, image, price, description). Returns normalized JSON to client. Handles CORS, anti-bot measures, and provides single implementation for all platforms.
2. **ShareIntentHandler** (_layout.tsx) — Top-level component using `useShareIntent` hook to process incoming shared URLs. Handles both cold start (`getInitialURL()`) and warm start (`addEventListener`) patterns. Navigates to add-item flow with pre-populated URL.
3. **wishlists table** — User-owned wishlist containers with name, emoji, visibility settings, and default flag. Items reference wishlists via `wishlist_id` FK. Enables migration from group-scoped items to user-owned lists with optional group sharing.
4. **URL scraper service** — Client-side orchestration layer coordinating Edge Function calls, URL normalization, and error handling. Provides reusable `scrapeUrl(url)` function with caching and retry logic.
5. **Wishlist visibility system** — Abstraction layer handling both group-based and friend-based visibility contexts. Replaces hardcoded `group_id` checks with `can_view_wishlist_item()` helper function for RLS policies.

**Data model shift:** Current: `wishlist_items.group_id → groups` | Target: `wishlists.user_id → users`, `wishlist_items.wishlist_id → wishlists`, optional `wishlist_shares` for friend/group visibility.

### Critical Pitfalls

1. **RLS Policy Conflicts During Wishlist Restructure** — Adding `wishlist_id` while existing `gift_claims` RLS policies reference `group_id` via joins breaks claim visibility. The `claim_item()` RPC validates "shared group membership" which fails when items exist in user-owned wishlists outside groups. **Avoid:** Create `can_view_wishlist_item(item_id, viewer_id)` helper function handling both group-based AND friend-based visibility before migrating schema. Update ALL claim-related RLS policies atomically. Test via client SDK, not SQL editor (bypasses RLS).

2. **Share Intent Data Loss on Cold Start** — User shares URL from Safari/Chrome but app doesn't receive data because only `addEventListener('url')` is implemented without `getInitialURL()`. iOS Share Extensions have 120MB memory limits, and React Native uses ~80MB. `getInitialURL()` Android bug can cause it to never resolve. **Avoid:** Implement BOTH patterns with timeout on `getInitialURL()` (max 3s). Persist incoming URLs to AsyncStorage before processing. Use `expo-share-intent` which handles edge cases. Set `launchMode="singleTask"` in AndroidManifest.

3. **URL Scraper Brittleness** — Scraper works for Amazon during development but silently returns empty/wrong metadata for Target, Etsy, small retailers in production. JavaScript-rendered content (React/Vue SPAs) not visible to basic HTTP requests. Sites return different HTML to bots vs browsers. **Avoid:** Always use server-side Edge Function, never client-side. Implement graceful degradation with manual entry fallback. Build retailer-specific parsers for top 5-10 sites. Cache successful scrapes to avoid re-scraping.

4. **Migration Data Corruption** — Running migration to add `wishlist_id` while existing `gift_claims` point to items, but migration creates new `wishlists` entries without updating FKs atomically. Partial migration failure leaves inconsistent state. **Avoid:** Use expand-and-contract strictly: (A) Add nullable `wishlist_id`, (B) Backfill data, (C) Deploy dual-write app version, (D) Validate, (E) Make NOT NULL and drop old constraints. Run pre-migration validation query, keep rollback script ready, create snapshot before migration.

5. **Celebrant Exclusion Leakage in Multi-Wishlist** — When items can belong to multiple wishlists or be shared to friends (not groups), celebrant exclusion RLS policies break. Current policy checks `group_members` join which fails when `wi.group_id` is nullable. **Avoid:** Create visibility context enum (`group_shared`, `friend_shared`, `private`) and build `can_view_item_claims(item_id, viewer_id)` function handling all contexts. Update ALL claim-related RLS policies atomically before feature work.

## Implications for Roadmap

Based on research, the v1.7 roadmap should follow a strict dependency-driven sequence: database foundation first (to avoid RLS conflicts), then share intent infrastructure (requires URL scraping), then UI features (depends on multi-wishlist data model). Each phase builds on the previous with clear validation criteria.

### Phase 37: Database Foundation & Migration

**Rationale:** Must establish multi-wishlist schema and resolve RLS policy conflicts BEFORE any feature implementation. The expand-and-contract migration pattern prevents data corruption and allows rollback. This phase is the foundation for all subsequent work.

**Delivers:**
- `wishlists` table with RLS policies (user ownership, visibility controls)
- `wishlist_id` column on `wishlist_items` (nullable initially for migration)
- Default wishlist created for each existing user ("My Wishlist")
- Backfill migration linking all existing items to default wishlists
- Updated TypeScript types for wishlists
- `can_view_wishlist_item()` helper function for RLS policies
- Pre-migration validation queries and rollback script

**Addresses:**
- Multi-wishlist CRUD (table stakes feature)
- Default wishlist migration (table stakes feature)

**Avoids:**
- RLS Policy Conflicts pitfall (helper function resolves group vs friend visibility)
- Migration Data Corruption pitfall (expand-and-contract with validation)
- Celebrant Exclusion Leakage pitfall (new RLS helper handles all contexts)

**Research flag:** SKIP — Standard PostgreSQL schema migration with clear Supabase RLS patterns. Well-documented in existing codebase (v1.3 migration has similar RLS complexity).

### Phase 38: URL Scraping Edge Function

**Rationale:** Edge Function must exist before share intent implementation (share intent needs scraping service). Server-side scraping avoids CORS and provides consistent cross-platform behavior. Can be developed in parallel with Phase 37 (no dependencies).

**Delivers:**
- `scrape-url` Supabase Edge Function using Deno + cheerio
- Open Graph metadata extraction (og:title, og:image, og:price, og:description)
- Schema.org Product JSON-LD parsing for price/currency
- URL normalization (remove tracking params)
- Error handling with graceful degradation
- Client service layer (`services/url-scraper.ts`)
- TypeScript types for `ScrapedMetadata`

**Uses:**
- scrape-url Edge Function (Deno + cheerio) from STACK.md
- Existing @supabase/supabase-js for Edge Function invocation

**Implements:**
- Edge Function scraping architecture component
- URL scraper service component

**Addresses:**
- URL metadata scraping (table stakes feature)
- Editable scraped metadata (table stakes feature)

**Avoids:**
- URL Scraper Brittleness pitfall (graceful fallback, manual entry option)
- OpenGraph Image Expiration pitfall (store source_url for re-scraping)

**Research flag:** NEEDS RESEARCH — Retailer-specific scraping patterns may require investigation during implementation. Generic Open Graph should cover 80%+ but outliers (Shopify, small stores) may need custom handling. Consider `/gsd:research-phase` if scraping fails for top 5 retailers during testing.

### Phase 39: Share Intent Integration

**Rationale:** Depends on URL scraping (Phase 38) existing to populate item data from shared URLs. Requires custom dev client (no Expo Go) so must coordinate with build process. Critical to handle both cold start and warm start patterns.

**Delivers:**
- `expo-share-intent` package installation + iOS/Android configuration
- ShareIntentHandler in `_layout.tsx` (handles both cold/warm start)
- add-from-url screen with pre-filled metadata
- URL extraction and validation logic (handle malformed URLs)
- Pending share persistence (store URL if user not logged in)
- Custom dev client build for testing

**Uses:**
- expo-share-intent@^5.1.1 from STACK.md
- patch-package@^8.0.0 for iOS configuration
- URL scraper service from Phase 38

**Implements:**
- ShareIntentHandler component from architecture
- Share intent at layout level pattern

**Addresses:**
- Share intent receive URLs (table stakes feature)
- Quick-add from shared links (differentiator feature)

**Avoids:**
- Share Intent Data Loss pitfall (both getInitialURL and addEventListener patterns)
- URL Parsing Edge Cases pitfall (robust URL extraction, validation)
- Expo/EAS Build Failures pitfall (manual eas.json config, test on EAS early)

**Research flag:** NEEDS RESEARCH — Native module configuration for EAS Build may require debugging. iOS Share Extension memory constraints (120MB limit) may need investigation if app bundle size grows. Consider `/gsd:research-phase` if EAS builds fail or share extension doesn't appear in share sheet.

### Phase 40: Multi-Wishlist UI

**Rationale:** Depends on database foundation (Phase 37) for wishlists table and context. Enables users to organize items and control visibility. Completes the multi-wishlist feature set.

**Delivers:**
- WishlistContext + useWishlists hook (state management)
- Wishlist list screen (view all wishlists)
- Wishlist create/edit screens (CRUD operations)
- WishlistPicker component (choose target list during add-item)
- Wishlist card component with emoji picker
- Tab updates to show selected wishlist
- Realtime subscription for wishlist changes

**Uses:**
- wishlists table from Phase 37
- Existing FlashList for wishlist item rendering

**Implements:**
- Wishlist state management component
- Multi-wishlist UI screens

**Addresses:**
- Wishlist picker in add-item (table stakes feature)
- Public/private wishlist visibility (table stakes feature)
- Wishlist templates (differentiator feature)

**Avoids:**
- Friend Visibility Without Group Context pitfall (visibility abstraction from Phase 37)

**Research flag:** SKIP — Standard React Native UI patterns. WishlistContext follows existing pattern from group management. FlashList already in use for item lists.

### Phase 41: Column Rename & Schema Cleanup

**Rationale:** Only after all UI migrated to use new wishlists architecture. Renames `amazon_url` → `source_url` to reflect broader URL support (not just Amazon). Updates TypeScript types and component references.

**Delivers:**
- Database column rename: `amazon_url` → `source_url`
- New metadata columns: `scraped_at`, `scrape_status`
- Updated constraint: `source_url_by_item_type` (replaces `amazon_url_by_item_type`)
- TypeScript type updates (~50 file references)
- Component reference updates (grep shows extensive usage)

**Uses:**
- Existing wishlist_items table structure

**Addresses:**
- Broader URL source support (not Amazon-specific)
- Scraped metadata tracking (for refresh/validation)

**Avoids:**
- Breaking changes (rename after full migration verified)

**Research flag:** SKIP — Straightforward column rename with type updates. Clear grep pattern for finding all references.

### Phase 42: Wishlist Sharing & Visibility

**Rationale:** Builds on multi-wishlist foundation (Phase 37, 40) to enable friend-based sharing. Requires RLS policy updates to handle friend visibility in addition to group visibility.

**Delivers:**
- `wishlist_shares` table (friend, group, link sharing)
- Friend-based wishlist visibility RLS policies
- Share wishlist with friend flow
- Share wishlist with group flow
- Public shareable links (non-app users)
- Updated `can_view_wishlist_item()` for friend context

**Uses:**
- wishlists table and visibility helper from Phase 37
- Existing friendships table for friend-based visibility

**Implements:**
- Wishlist visibility system component (friend + group contexts)

**Addresses:**
- Wishlist sharing with non-app users (differentiator feature)
- Friend-based privacy controls (competitive feature)

**Avoids:**
- Friend Visibility Without Group Context pitfall (abstraction layer handles both)
- Celebrant Exclusion Leakage pitfall (RLS helper updated for friend shares)

**Research flag:** NEEDS RESEARCH — Friend-based RLS policies interacting with existing claim/contribution logic may need investigation. Complex query patterns joining wishlists → wishlist_shares → friendships → gift_claims. Consider `/gsd:research-phase` if performance degrades or RLS policies conflict.

### Phase 43: Enforcement & Legacy Cleanup

**Rationale:** Only after full migration validated and all features working. Makes `wishlist_id` NOT NULL and deprecates direct `group_id` references on items. Documents backward compatibility approach.

**Delivers:**
- Make `wishlist_id` NOT NULL constraint (after backfill verified)
- Update RLS policies to prefer wishlist-based access
- Document `group_id` deprecation plan (keep for celebrations during transition)
- Migration completion validation (count claims, verify FK integrity)
- Performance index creation: `(wishlist_id, created_at)`, `(user_id, is_default)`

**Uses:**
- Fully migrated wishlists architecture

**Addresses:**
- Schema enforcement (data integrity)
- Performance optimization (compound indexes)

**Avoids:**
- Concurrent Migration + Live Traffic pitfall (deploy sequence with feature flags)

**Research flag:** SKIP — Standard constraint addition after migration validation. Clear rollback path documented.

### Phase Ordering Rationale

- **Phase 37 first:** Database foundation must exist before any feature implementation to avoid RLS conflicts and data corruption. Expand-and-contract migration pattern allows safe rollback.
- **Phase 38 parallel with 37:** URL scraping has no dependencies on multi-wishlist schema. Can develop Edge Function independently, merge after Phase 37 complete.
- **Phase 39 after 38:** Share intent requires URL scraping service to pre-fill item metadata. Native module configuration requires careful testing.
- **Phase 40 after 37:** Multi-wishlist UI requires wishlists table and context from Phase 37. Completes user-facing feature set.
- **Phase 41 after 40:** Column rename only after all UI using new architecture. Prevents breaking changes during transition.
- **Phase 42 after 37, 40:** Sharing builds on existing wishlists foundation. Friend-based visibility requires RLS helpers from Phase 37.
- **Phase 43 last:** Enforcement only after full validation. Makes constraints stricter with confidence migration succeeded.

This ordering **avoids critical pitfalls** by:
- Resolving RLS policy conflicts before feature work (Phases 37 → 40, 42)
- Handling both share intent patterns before release (Phase 39)
- Building scraping with fallbacks from start (Phase 38)
- Using expand-and-contract migration to prevent corruption (Phase 37)
- Testing friend visibility before enforcement (Phase 42 → 43)

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 38 (URL Scraping):** Retailer-specific scraping patterns for outliers. Generic Open Graph extraction should cover 80%+ but Shopify stores, small retailers, or heavily JavaScript-rendered sites may need custom handling. Use `/gsd:research-phase` if scraping fails for top 5 test retailers.

- **Phase 39 (Share Intent):** Native module configuration for EAS Build and iOS Share Extension memory constraints. expo-share-intent is well-documented but iOS 120MB memory limit may require bundle optimization. Use `/gsd:research-phase` if EAS builds fail or share extension doesn't appear in share sheet.

- **Phase 42 (Wishlist Sharing):** Friend-based RLS policies interacting with existing claim/contribution logic. Complex join patterns across 5+ tables (wishlists → wishlist_shares → friendships → wishlist_items → gift_claims) may have performance implications. Use `/gsd:research-phase` if query performance degrades below 200ms or RLS policies conflict.

Phases with standard patterns (skip research-phase):

- **Phase 37 (Database Foundation):** PostgreSQL schema migration with Supabase RLS follows existing patterns from v1.3 gift_claims migration. Clear precedent in codebase.

- **Phase 40 (Multi-Wishlist UI):** React Native UI with Context API and FlashList follows existing group management patterns. No novel patterns required.

- **Phase 41 (Column Rename):** Straightforward column rename with TypeScript type updates. Clear grep pattern for finding references.

- **Phase 43 (Enforcement):** Standard constraint addition after validation. Well-documented rollback path.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | expo-share-intent actively maintained (v5.1.1), Supabase Edge Functions well-documented, cheerio stable at 1.0.0. All packages verified for Expo SDK 54 compatibility. |
| Features | HIGH | Competitor analysis of 5+ wishlist apps (GoWish, Amazon, Giftful) validates table stakes features. User expectations clear from market research. |
| Architecture | HIGH | Server-side scraping is established pattern, expo-share-intent has clear implementation guide. Multi-wishlist schema follows standard relational patterns similar to existing group management. |
| Pitfalls | HIGH | RLS policy conflicts well-documented from v1.3 experience. Share intent cold start issues verified from React Native GitHub issues and community posts. Migration risks mitigated with expand-and-contract pattern. |

**Overall confidence:** HIGH

### Gaps to Address

- **Retailer-specific scraping edge cases:** Generic Open Graph extraction should cover 80%+ of URLs but some sites (heavily JavaScript-rendered, anti-bot protection) may return empty metadata. Plan to handle during Phase 38 implementation with `/gsd:research-phase` if needed. Validate with Amazon, Target, Etsy, Best Buy, Walmart during testing.

- **iOS Share Extension memory constraints:** expo-share-intent documentation mentions 120MB iOS limit. Current app bundle size unknown. Monitor during Phase 39 EAS Build. May need bundle optimization or switch to simple share intent (no custom UI) if memory issues occur.

- **Friend-based RLS performance:** Complex joins across wishlists → wishlist_shares → friendships → wishlist_items → gift_claims may have performance implications at scale. Current RLS policies optimized for group context. Plan to validate query performance during Phase 42 with `EXPLAIN ANALYZE` and add indexes if needed.

- **Price tracking infrastructure decision:** Deferred to v2+ but may receive user requests post-launch. Document decision rationale (requires background jobs, cron, notification infrastructure) and estimate effort (~3-5 phases for full implementation with Supabase Edge Functions cron triggers).

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- [expo-share-intent GitHub](https://github.com/achorein/expo-share-intent) — Installation, SDK compatibility, native configuration
- [expo-share-intent npm](https://www.npmjs.com/package/expo-share-intent) — Version 5.1.1, peer dependencies
- [Supabase Edge Functions Dependencies](https://supabase.com/docs/guides/functions/dependencies) — npm: specifier for Deno
- [Open Graph Protocol](https://ogp.me/) — Metadata schema reference

**Architecture Research:**
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions) — Deno runtime, CORS headers
- [deno-dom GitHub](https://deno.land/x/deno_dom) — HTML parsing in Deno
- [Expo Linking Documentation](https://docs.expo.dev/versions/latest/sdk/linking/) — getInitialURL vs addEventListener patterns

**Pitfalls Research:**
- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — Multi-tenant patterns, celebrant exclusion
- [React Native Linking docs](https://reactnative.dev/docs/linking) — Cold start vs warm start share handling
- [PlanetScale: Safe Schema Changes](https://planetscale.com/blog/safely-making-database-schema-changes) — Expand-and-contract migration pattern

### Secondary (MEDIUM confidence)

**Features Research:**
- [GoWish App](https://gowish.com/en) — Multi-wishlist leader, UX patterns
- [10 Best Universal Wishlist Apps 2025](https://www.wishlists-app.com/blog/best-universal-wishlist-apps-2025) — Feature comparison across competitors
- [How GoWish Became Popular](https://www.sevensquaretech.com/how-gowish-became-popular-wishlist-app/) — Table stakes feature validation
- [Amazon Wishlist Features](https://www.sellerapp.com/blog/amazon-wish-list/) — Amazon URL scraping reference

**Pitfalls Research:**
- [ScrapeGraphAI: Scraping Disasters](https://medium.com/@scrapegraphai/my-most-embarrassing-web-scraping-disasters-and-how-you-can-avoid-them-023c66d84b9d) — JavaScript rendering issues
- [Supporting iOS Share Extensions on React Native](https://www.devas.life/supporting-ios-share-extensions-android-intents-on-react-native/) — Memory constraints
- [Medium: Deep Linking That Works](https://medium.com/@nikhithsomasani/react-native-deep-linking-that-actually-works-universal-links-cold-starts-oauth-aced7bffaa56) — Cold start handling patterns

### Tertiary (LOW confidence)

**Stack Research:**
- [Expo Sharing Docs](https://docs.expo.dev/versions/latest/sdk/sharing/) — SDK 55 experimental receive support (future reference)
- [Geekflare Meta Scraping API](https://geekflare.com/api/metascraping/) — External API alternative for high-volume scraping

**Features Research:**
- [Shopee Wishlist UX Case Study](https://medium.com/@fadhil.ibrhm12/how-to-improve-the-experience-of-wishlist-feature-in-e-commerce-app-shopee-ux-case-study-eaa0e97ffca1) — Folder/category UX patterns (deferred)

---
*Research completed: 2026-02-16*
*Ready for roadmap: yes*
