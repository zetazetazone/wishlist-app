# Project Research Summary

**Project:** Wishlist App v1.3 Gift Claims & Personal Details
**Domain:** Social gifting app — birthday gift coordination, group wishlists, member profiles (React Native + Supabase)
**Researched:** 2026-02-05
**Confidence:** HIGH

## Executive Summary

v1.3 extends the existing birthday gifting coordination app with two complementary feature sets: gift claiming (members reserve items from the celebrant's wishlist to prevent duplicate purchases) and personal details (user profiles with sizes, preferences, and external wishlist links). Both features leverage the existing architecture — no new npm dependencies required. The claim system reuses the proven celebrant-exclusion RLS pattern from v1.0-v1.2 chat and contributions, while personal details extend the existing user profile system with JSONB-based flexible storage.

The critical technical challenge is race condition prevention in competitive claiming — two members simultaneously claiming the same item. This requires atomic database operations using PostgreSQL RPC functions, not the app's typical read-then-write pattern. The second major risk is RLS policy complexity: claims introduce a new "partial visibility" pattern (celebrant sees "taken" status but not claimer identity), distinct from the existing "full exclusion" pattern (celebrant sees nothing). A third novel feature — secret member notes — allows group members to share gift-giving hints about each other, hidden from the subject. This requires careful RLS design to prevent note subjects from seeing notes about themselves.

The recommended build order prioritizes database schema and atomic functions first (foundation), then claim UI integration (highest user value), then personal details and secret notes (enhancements). Split contributions (multiple people funding one claimed item) can be deferred to Phase 3 to reduce initial complexity. The existing codebase provides all necessary UI components (Gluestack forms, bottom sheets, FlashList) and data patterns (JSONB columns, RLS exclusion, Realtime subscriptions).

## Key Findings

### Recommended Stack

**No new npm dependencies required.** All v1.3 features are implementable with the existing stack: Supabase (RLS policies + JSONB support + Realtime), Gluestack UI (forms, inputs, dropdowns), expo-linking (external URL opening), and existing service patterns. Database-level additions include three new tables (`gift_claims`, `personal_details`, `member_notes`), one SECURITY DEFINER function for atomic claiming, and the `pg_jsonschema` extension (pre-installed on Supabase, needs activation) for JSONB validation.

**Core technologies reused:**
- **Supabase PostgreSQL + RLS:** Celebrant-exclusion pattern proven in `chat_rooms`, `chat_messages`, `celebration_contributions` — same approach applies to claims and notes. New twist: claims need "partial visibility" (celebrant sees status, not claimer).
- **JSONB columns:** Personal details (sizes, preferences, external links) stored as flexible JSONB on `personal_details` table. Avoids schema bloat from rigid columns. Validated with `pg_jsonschema` extension at database level.
- **Gluestack UI components:** All forms, inputs, dropdowns, selectors already installed — `Input`, `Select`, `FormControl`, `Button`, `Avatar`. Personal details editing reuses existing profile screen pattern.
- **Supabase Realtime:** Chat already uses Postgres Changes subscriptions. Claims can optionally add realtime updates, but must exclude celebrant from subscription channel (similar to chat room exclusion).
- **expo-linking `openURL()`:** External wishlist links (Amazon, Pinterest) open in device browser — already installed and used elsewhere.

**Key schema design choice:** Separate `gift_claims` table with `celebration_id` scope (not just `item_id`) because the same wishlist item can appear in multiple celebrations across different groups. Prevents cross-celebration claim conflicts. Personal details are global (not per-group) with one row per user.

### Expected Features

v1.3 features map cleanly to established patterns in the social gifting and gift registry ecosystem (Giftster, Giftwhale, Zola, Babylist).

**Must have (table stakes):**
- **Single-claimer lock:** Only one person claims an item at a time. Atomic database operation prevents race conditions. Celebrant sees "taken" indicator without claimer identity.
- **Claim/unclaim actions:** Simple tap to claim, confirmation to unclaim. Must notify contributors if unclaiming an item with split pledges.
- **Clothing/shoe sizes:** Shirt, pants, shoe, ring sizes. Dropdown for standardized (shirt), free text for varied (shoe). Giftster's most-used preference fields.
- **Favorite colors/brands:** Multi-select tags. Universal gift-giving signals. Helps givers choose between alternatives.
- **Profile self-editing:** Only the profile owner can edit their personal details. Other group members can view (read-only).

**Should have (competitive):**
- **Split contributions:** Multiple people pledge money toward one claimed item (similar to wedding registries). Tracks pledged amounts externally (no in-app payment processing). Progress bar shows "3/5 funded, $45 of $60." Differentiator — social gifting apps typically don't have this, but registries do.
- **Secret member notes:** Group members add hidden notes about each other ("She mentioned wanting a red KitchenAid"). Visible to all group members except the subject. Novel feature — no major competitor offers this. Promotes collaborative gift intelligence within the group.
- **External wishlist links:** Amazon wishlist URL, Pinterest board, Etsy favorites. Bridges to user's existing wishlists maintained elsewhere. Simple links (no scraping).

**Defer (v2+):**
- **In-app payment processing:** Out of scope per PROJECT.md. Track pledges only, payments happen externally (Venmo, cash).
- **Anonymous claiming:** Defeats coordination purpose. Gift Leader needs transparency among non-celebrant members.
- **AI gift suggestions:** Scope creep. Show raw preference data, let human givers make personalized decisions.
- **Per-group personal details:** Violates global profile requirement. Creates data maintenance burden.

### Architecture Approach

v1.3 introduces two independent subsystems (gift claims, personal details) plus one cross-cutting enhancement (secret notes). Both integrate with the existing celebration coordination flow and profile system without modifying existing tables.

**Major components:**

1. **Gift Claims System** — Tracks who claimed which wishlist item in which celebration. Schema: `gift_claims` table with `wishlist_item_id`, `celebration_id`, `claimed_by`, `claim_type` ('full' | 'split'), `amount`, `status` ('claimed' | 'purchased' | 'delivered'). RLS: Group members except celebrant can CRUD. Celebrant queries via SECURITY DEFINER function `get_item_claim_status()` which returns only item_id + is_claimed boolean (strips claimer identity). Atomic claiming via RPC function with `UPDATE WHERE claimed_by IS NULL` to prevent race conditions.

2. **Personal Details Profile** — User-level (global across groups) profile extension. Schema: `personal_details` table with `user_id` (unique FK), JSONB columns for `favorite_colors`, `favorite_brands`, `hobbies`, `dislikes`, text columns for sizes (shirt, pants, shoe, ring, dress), URL fields for external links (Amazon, Pinterest, other). RLS: All authenticated users can view, only owner can edit. Integrates with existing profile screen (`app/profile/[id].tsx`) and settings screen (`app/(app)/settings/profile.tsx`).

3. **Secret Member Notes** — Per-group collaborative notes about members. Schema: `member_notes` table with `group_id`, `about_user_id` (FK to subject), `author_id` (FK to note writer), `content` text. UNIQUE constraint on (group_id, about_user_id, author_id) — one note per author per subject per group. RLS: Group members can view notes except notes where `about_user_id = auth.uid()` (subject cannot see notes about themselves). Extends existing group member card display and profile detail view.

**Integration points:**
- Claims integrate with celebration detail screen (`app/(app)/celebration/[id].tsx`) — adds claim badges and buttons to existing `LuxuryWishlistCard` components.
- Personal details integrate with profile viewing/editing screens — new section below existing avatar/name/birthday.
- Secret notes integrate with member cards in group view — indicator badge when notes exist, expandable detail view.
- Split contributions can reuse existing `contributions` table (currently unused in favor of `celebration_contributions`) or add `item_id` FK to `celebration_contributions`.

**Build order implication:** Schema and database functions must come first (Phase 1). Claim UI is highest user value (Phase 2). Personal details and notes are enhancements (Phase 3-4). This order follows the existing architecture pattern: data model → service layer → UI components.

### Critical Pitfalls

Research identified 18 pitfalls across critical/moderate/minor severity. Top 7:

1. **Race Condition on Simultaneous Claim Attempts (CRITICAL-01)** — Two users tap "Claim" at the same time. Without atomic enforcement, both succeed and think they claimed the item. **Prevention:** Use PostgreSQL RPC function with `UPDATE ... WHERE claimed_by IS NULL` — atomic operation, only one succeeds. Do NOT use read-then-write pattern (`SELECT status, then UPDATE`). Suggested phase: Phase 1 (Schema & Functions).

2. **Claim Status Leaks Claimer Identity to Celebrant (CRITICAL-02)** — Celebrant's wishlist query returns `claimed_by` UUID, ruining surprise. **Prevention:** Use SECURITY DEFINER function `get_item_claim_status()` that returns only boolean is_claimed (strips claimer identity). Or use VIEW with conditional column masking. Do NOT rely on client-side filtering. Suggested phase: Phase 1 (Schema).

3. **Secret Note Leaks to Profile Owner via RLS Policy Gap (CRITICAL-09)** — Note subject sees notes about themselves through query. **Prevention:** RLS policy must explicitly exclude subject: `subject_user_id != auth.uid()`. Write dedicated test: user cannot query notes about themselves. This is a NEW pattern (subject exclusion) distinct from existing celebrant exclusion. Suggested phase: Phase 1 (Schema).

4. **Personal Details Schema Evolves Unpredictably (CRITICAL-06)** — Team adds rigid columns (shirt_size, shoe_size, ring_size). Users then want pants_size, hat_size, dietary_restrictions, spotify_link. Schema becomes 20+ nullable columns. **Prevention:** Use JSONB column for sizes/preferences/links. Flexible storage, no migration for new fields. Use `pg_jsonschema` for validation. Suggested phase: Phase 1 (Schema).

5. **Three Different RLS Visibility Patterns Now Coexist (CRITICAL-17)** — App will have: (a) full exclusion (chat/contributions), (b) partial visibility (claims), (c) subject exclusion (notes). Developer confusion leads to wrong pattern applied to new table. **Prevention:** Document all three patterns explicitly. Name policies clearly (`celebrant_full_exclusion_*`, `celebrant_partial_visibility_*`, `subject_exclusion_*`). Create test matrix: test each table as (excluded user, regular member, non-member). Suggested phase: Phase 1 (Schema).

6. **Claims Must Integrate with Existing Contribution System (CRITICAL-12)** — Existing `celebration_contributions` tracks per-celebration pot. New claim system adds per-item split contributions. Without reconciliation, users confuse the two systems and money is double-counted. **Prevention:** Define clear relationship. Option A: Split contributions extend `celebration_contributions` with `item_id` column. Option B: Separate `claim_contributions` table aggregated into celebration totals. Budget tracking must sum both sources. Suggested phase: Phase 1 (Schema).

7. **Unclaim Does Not Release Split Contributions (MODERATE-03)** — User claims item, opens for splits. Others contribute. User unclaims. Contributions are now orphaned. **Prevention:** Confirmation dialog if contributions exist: "This has X contributions. Unclaiming will notify them." Set contribution status to 'returned' (not deleted). Send push notifications to contributors. Suggested phase: Phase 2 (Claim Operations).

## Implications for Roadmap

Based on research, recommended 5-phase structure follows dependency order: schema foundation → claim mechanics → claim UI → personal details → enhancements.

### Phase 1: Schema & Atomic Functions (Foundation)

**Rationale:** Database schema and atomic functions are prerequisites for all UI work. Claim race condition prevention (CRITICAL-01), celebrant visibility handling (CRITICAL-02), and RLS pattern establishment (CRITICAL-17) must be correct from day one — retroactive fixes are high-risk. This phase establishes the data model for both claims and personal details, preventing later architectural conflicts.

**Delivers:**
- `gift_claims` table with celebration-scoped claims, partial unique index (one full claim per item per celebration)
- `personal_details` table with JSONB columns for flexible preferences
- `member_notes` table with subject-exclusion RLS
- Atomic claiming function: `claim_item_atomic(item_id, user_id, celebration_id)` with race condition prevention
- Celebrant status function: `get_item_claim_status(celebration_id)` returning boolean is_claimed (strips claimer identity)
- RLS policies for all three tables (celebrant partial visibility, subject exclusion, owner-only editing)
- `pg_jsonschema` extension enabled for JSONB validation
- Database indexes for performance (composite on claim lookups, JSONB GIN index on preferences)

**Addresses features:** Single-claimer lock, claim hidden from celebrant, personal details storage, secret notes storage

**Avoids pitfalls:** CRITICAL-01, 02, 06, 09, 12, 13, 17

### Phase 2: Claim Operations & Integration (Core Value)

**Rationale:** Claims are the higher-priority feature (directly prevents duplicate gifts) and have simpler RLS requirements than notes (extends existing pattern). Once schema exists, claim/unclaim operations and celebration screen integration deliver immediate user value.

**Delivers:**
- Service layer: `lib/claims.ts` with CRUD functions
- Components: `ClaimBadge`, `ClaimButton`, `ClaimModal`
- Modified: `LuxuryWishlistCard`, `app/(app)/celebration/[id].tsx`
- Integration: Claim count on celebration summary
- Lifecycle: Unclaim with contribution orphan handling

**Addresses features:** Claim/unclaim actions, "taken" indicator, claim visibility, claim button, visual distinction

**Avoids pitfalls:** MODERATE-03, MINOR-05, MODERATE-14, 15, 16

### Phase 3: Personal Details UI & Editing

**Rationale:** Personal details are independent of claims. Schema exists from Phase 1. Profile editing is lower complexity than claim coordination. External links provide high value for low effort.

**Delivers:**
- Service layer: `lib/personalDetails.ts`
- Components: `PersonalDetailsForm`, `PersonalDetailsCard`, `SizeSelector`, `TagInput`, `QuickReferenceSection`
- Routes: `app/(app)/settings/personal-details.tsx`
- Modified: `app/(app)/settings/profile.tsx`, `app/profile/[id].tsx`, `app/(app)/celebration/[id].tsx`

**Addresses features:** Clothing sizes, ring size, favorite colors/brands, hobbies, self-editing, global profile, external links

**Avoids pitfalls:** MODERATE-07, MINOR-08

### Phase 4: Split Contributions & Claim Enhancements

**Rationale:** Split contributions build on working claim system from Phase 2. Differentiator feature but adds complexity. Defer until basic claiming is proven.

**Delivers:**
- Contribution integration (extend `celebration_contributions` or separate table)
- `ClaimContributionProgress` component
- Split claim support in `ClaimModal`
- Budget aggregation across contribution types
- Claim notifications

**Addresses features:** Split contributions, contribution progress bar, claim notifications, claim timestamp/history

**Avoids pitfalls:** CRITICAL-12 (contribution integration), MODERATE-03 (enhanced unclaim handling)

### Phase 5: Secret Notes & Polish

**Rationale:** Secret notes are the most novel feature but also most complex. Build last to reduce risk to milestone. Schema exists from Phase 1. Requires careful UX framing to avoid "creepy" perception.

**Delivers:**
- Service layer: `lib/memberNotes.ts`
- Components: `MemberNoteCard`, `MemberNoteInput`
- Modified: `MemberCard`, profile view
- UX framing: "Gift-giving hints" not "secret notes"
- Note length limit, privacy labels, cascade behavior

**Addresses features:** Secret member notes (differentiator — novel feature)

**Avoids pitfalls:** CRITICAL-09 (implemented in Phase 1, tested here), MODERATE-10, 11

### Phase Ordering Rationale

- **Schema first (Phase 1):** Atomic functions and RLS policies are foundational. Retroactive fixes to race conditions or privacy leaks are high-risk.
- **Claims before personal details (Phase 2 before 3):** Claims directly improve coordination (prevent duplicate gifts), higher immediate value.
- **Split contributions deferred (Phase 4):** Differentiator feature but adds complexity. Basic claiming must work first.
- **Secret notes last (Phase 5):** Novel feature with highest RLS complexity and social trust risk.

### Research Flags

**Phases with standard patterns (skip deep research):**
- **Phase 1 (Schema):** PostgreSQL atomic operations, RLS policies, JSONB columns — well-documented
- **Phase 2 (Claim Operations):** Extends existing celebration screen and service layer
- **Phase 3 (Personal Details):** Standard form implementation with Gluestack UI

**Phases needing validation during implementation:**
- **Phase 4 (Split Contributions):** Contribution integration approach needs validation with existing budget tracking
- **Phase 5 (Secret Notes):** UX framing may need user testing

**No phases require `/gsd:research-phase`** — all patterns well-documented or proven in existing codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies needed. All features map to existing installed packages and Supabase capabilities. Verified against package.json and database.types.ts. |
| Features | HIGH | Table stakes and differentiators identified from competitive analysis (Giftster, Giftwhale, Zola, Babylist). Clear anti-features prevent scope creep. |
| Architecture | HIGH | Separate tables (gift_claims, personal_details, member_notes) integrate cleanly. No modifications to existing tables. RLS patterns proven in chat/contributions. |
| Pitfalls | HIGH | Race condition prevention (CRITICAL-01), celebrant visibility (CRITICAL-02), subject exclusion (CRITICAL-09) all have documented PostgreSQL solutions. RLS pattern confusion (CRITICAL-17) addressable through naming and testing. |

**Overall confidence:** HIGH

### Gaps to Address During Planning

**Minor gaps (handle during implementation):**

- **Contribution integration approach (Phase 1 decision):** Two valid options: (A) Add `item_id` column to `celebration_contributions`, or (B) Create separate `claim_contributions` table. Option A simpler (unified contribution tracking), Option B cleaner separation. **Resolution:** Choose during Phase 1 schema design based on budget tracking service complexity. Lean toward Option A (extend existing table) unless separation proves necessary.

- **Split claim UX iteration (Phase 4):** Split contributions conceptually more complex than full claims. Users must see progress, pledge amounts, remaining need. **Resolution:** Start with full claims only in Phase 2. Add split support in Phase 4 after basic flow proven. Schema supports both from day one (claim_type enum).

- **Secret notes social perception (Phase 5):** Novel feature with no competitor reference. UX framing ("gift hints" vs "secret notes") affects user comfort. **Resolution:** Plan for iteration based on initial feedback. Note length limit (500 chars) and positive placeholder text mitigate creepiness. Consider A/B testing different framings if adoption is low.

- **Realtime for claims (Phase 2 consideration):** Claims could use Realtime for live updates, but must exclude celebrant from subscription. Chat already uses channel-based exclusion. **Resolution:** Start with polling/manual refresh (simpler). Add Realtime in polish phase if UX demands it. Not critical for coordination flow.

## Sources

### Primary (HIGH confidence)

**Stack & Architecture:**
- [Supabase: Managing JSON and unstructured data](https://supabase.com/docs/guides/database/json) — JSONB best practices for personal details
- [Supabase: pg_jsonschema extension](https://supabase.com/docs/guides/database/extensions/pg_jsonschema) — JSONB validation, pre-installed
- [Supabase: RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — `(SELECT auth.uid())` pattern, function performance
- [Supabase: Postgres Changes (Realtime)](https://supabase.com/docs/guides/realtime/postgres-changes) — Realtime subscription patterns
- [Expo: Linking into other apps](https://docs.expo.dev/linking/into-other-apps/) — expo-linking openURL for external browser
- [PostgreSQL SELECT FOR UPDATE](https://on-systems.tech/blog/128-preventing-read-committed-sql-concurrency-errors/) — Atomic operation patterns for claims

**Pitfalls:**
- [Preventing Race Conditions with PostgreSQL](https://github.com/orgs/supabase/discussions/30334) — SERIALIZABLE isolation, atomic UPDATE patterns
- [Database Race Conditions — Doyensec Blog](https://blog.doyensec.com/2024/07/11/database-race-conditions.html) — TOCTOU vulnerabilities
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS policy patterns
- [Supabase Column Level Security](https://supabase.com/docs/guides/database/postgres/column-level-security) — Partial data visibility

**Features:**
- [Giftster Gift Preferences Help](https://help.giftster.com/article/132-how-to-share-your-gift-preferences) — Personal details field selection
- [Zola Group Gifting](https://www.zola.com/faq/115002838951-what-does-group-gifting-mean-on-my-registry-) — Split contribution patterns
- [Babylist Group Gifts](https://help.babylist.com/hc/en-us/articles/360053206413-How-do-I-add-Group-Gifts-to-my-registry) — Partial funding mechanics
- [DreamList FAQ](https://www.dreamlist.com/giverfaq.html) — Contribution tracking without payment processing

### Secondary (MEDIUM confidence)

- [Giftwhale: How to Choose Wish List App 2025](https://giftwhale.com/blog/how-to-choose-the-right-wish-list-app-in-2025) — Competitive landscape
- [Favory Privacy-First Wishlist](https://www.openpr.com/news/4189488/favory-launches-privacy-first-wishlist-platform-with) — Anonymous claiming approaches
- [Baymard Institute: Gifting UX Best Practices](https://baymard.com/blog/gifting-flow) — UX patterns for gift coordination
- [NN/g: Wishlists and Gift Giving](https://www.nngroup.com/articles/wishlists-gift-certificates/) — Information architecture for wishlists

### Codebase Analysis (VERIFIED)

- Existing migrations: `20260201000001_initial_schema.sql`, `20260202000005_celebrations.sql` — RLS patterns, celebrant exclusion
- Existing services: `lib/contributions.ts`, `lib/favorites.ts`, `lib/wishlistItems.ts` — Service layer patterns, upsert operations
- Existing types: `types/database.types.ts` — `wishlist_items.status` field includes 'claimed' value
- Existing components: `LuxuryWishlistCard.tsx`, `MemberCard.tsx`, `app/(app)/celebration/[id].tsx` — Integration points verified
- Package dependencies: `package.json` — All required packages installed, no new dependencies needed

---
*Research completed: 2026-02-05*
*Ready for roadmap: yes*
