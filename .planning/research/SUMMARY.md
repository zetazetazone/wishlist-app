# Project Research Summary

**Project:** Wishlist App v1.1 Polish
**Domain:** Multi-user wishlist app with group coordination (React Native + Supabase)
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

v1.1 enhances the existing wishlist app with UX polish features: favorite item marking (per-group), special item types (Surprise Me, Mystery Box), profile editing, and a star rating display fix. Research confirms all features integrate cleanly with the existing React Native + Expo + Supabase stack — **no new dependencies required**. The existing stack provides all necessary capabilities: expo-image-picker for profile photos, NativeWind for styling, Supabase for schema changes, and MaterialCommunityIcons for UI elements.

The recommended approach follows a **database-first, then isolated-features-first** pattern: start with schema migrations (group_favorites table + item_type enum), implement independent profile editing, then build integrated features (favorites + special items), and finally address the star rating CSS bug. This order minimizes risk by establishing infrastructure before dependent features and isolating high-value low-risk work (profile editing) early.

Key risks center on **state synchronization** (Realtime updates with optimistic UI), **RLS policy coverage** (celebrant exclusion must extend to new fields), and **schema migration safety** (adding constraints to existing data). Critical mitigation: all schema changes in atomic transactions with RLS policy updates, React Query for state management with conflict resolution, and extensive cross-platform testing for layout fixes.

## Key Findings

### Recommended Stack

**No changes needed.** All v1.1 features implementable with existing stack.

The current stack (React Native 0.81.5 + Expo SDK 54 + Supabase 2.93.3 + NativeWind 4.2.1) provides complete coverage for UI polish features. StarRating component already exists with horizontal layout code — the vertical bug is likely a metro cache issue, not a missing library. Profile pictures leverage existing expo-image-picker (v17.0.10) and Supabase Storage. New item types require only database schema changes, not new frontend libraries. Favorite marking uses standard React state + Supabase queries.

**Core technologies (unchanged):**
- **React Native + Expo:** UI framework — sufficient for all new components (FavoriteButton, ProfileHeader, AddSpecialItemModal)
- **Supabase:** Backend + database — schema extensions for favorites and item types, existing RLS policies extend cleanly
- **expo-image-picker:** Already installed (v17.0.10) — handles profile photo selection/upload with zero additional dependencies
- **NativeWind + Gluestack UI:** Styling — provides all classes needed for star layout fix, favorite highlighting, special item badges
- **MaterialCommunityIcons:** Icons — includes gift, star, bookmark, help-circle for new features

**Rejected alternatives:** react-native-star-rating-widget (fixes existing CSS instead), @rneui/themed Avatar (5 lines of borderRadius styling), payment SDKs for Mystery Box (v1.1 is placeholder only, defer to v1.2+).

### Expected Features

Research on wishlist apps and gift registries reveals strong UX patterns for v1.1 scope:

**Must have (table stakes):**
- **Favorite/priority visual distinction** — Users already set 1-5 star priority; favorite adds "top pick" signal with pinned position and visual prominence (heart/star badge)
- **Special item flexibility signals** — Surprise Me (open-ended gift permission) and Mystery Box (tier-based placeholders) are established patterns in gift registries for signaling flexibility
- **Profile editing post-onboarding** — Standard pattern: minimal onboarding upfront, progressive disclosure for detail editing (name, birthday, photo)
- **Star rating horizontal display** — Visual priority indicators must be scannable at a glance, not vertically stacked

**Should have (competitive differentiators):**
- **Favorite per group** — Different groups have different budgets/contexts, so user's "top pick" should be group-scoped (college friends: €25 item, family: €100 item)
- **Surprise Me budget tiers** — Adds helpful constraint without being prescriptive (€0-25, €25-50, €50+)
- **Mystery Box custom tiers** — User sets exact amounts beyond presets (€25/€50/€100) to match group norms
- **Birthday verification** — Confirmation dialog prevents accidental changes to critical field used for celebration triggers

**Defer (v2+):**
- **In-app Mystery Box purchasing** — Payment integration, compliance, monetization (complex, future revenue opportunity)
- **Favorite notifications** — Alert gift-givers when top pick changes ("Sarah updated her favorite!")
- **AI gift suggestions** — Scope creep, requires external APIs, can feel impersonal
- **Social features** — Friend requests, followers, profile themes (not core to gift coordination)

### Architecture Approach

All features integrate with existing schema and component hierarchy without architectural changes. Favorite marking uses a new junction table (group_favorites) to enforce one-per-group constraint via PRIMARY KEY. Special item types leverage existing wishlist_items table with new item_type enum field ('standard' | 'surprise_me' | 'mystery_box'). Profile editing reuses existing user_profiles fields (display_name, avatar_url, birthday) with new edit screen.

**Schema changes:**
1. **New table: group_favorites** — Tracks one favorite per user per group with composite PK (user_id, group_id) enforcing uniqueness
2. **Modified table: wishlist_items** — Add item_type column with CHECK constraint, repurpose price field for Mystery Box tiers
3. **No changes: user_profiles** — Profile editing reuses existing fields and avatars bucket

**Component additions:**
1. **FavoriteButton.tsx** — Toggle favorite status per group, gold star icon, optimistic updates
2. **AddSpecialItemModal.tsx** — Guided flow for Surprise Me (openness level) and Mystery Box (tier selection €25/€50/€100)
3. **EditProfileScreen.tsx** — Form with photo picker, text input, date picker, validation
4. **ProfileHeader.tsx** — 40px circular avatar in My Wishlist header, clickable to edit screen

**Component modifications:**
- **LuxuryWishlistCard.tsx:** Add FavoriteButton, visual treatment for special types (gradient borders, badges), conditional price display
- **StarRating.tsx:** Bug fix only — verify TailwindCSS config, clear metro cache (code already has flex-row)
- **wishlist.tsx screen:** Add ProfileHeader, load favorite status via JOIN, pass groupId context to cards
- **AddItemModal.tsx:** Add "special item" link to open type selection

**Data flow patterns:**
- Favorite marking: Optimistic UI update → Supabase INSERT ON CONFLICT UPDATE → Realtime broadcast to group members
- Special item creation: Type-specific validation → INSERT with item_type field → Conditional rendering in cards
- Profile editing: Photo upload to Storage → UPDATE user_profiles → router.back() with cache invalidation

### Critical Pitfalls

Research identified 10 pitfalls ranked by severity; top 5 require immediate attention:

1. **RLS Policy Breakage from Schema Changes** — Adding is_favorite column without updating RLS policies creates window where celebrants can see their own favorited items, breaking core security model. **Prevention:** Atomic migration with column + policy updates in single transaction, test celebrant exclusion before deploy.

2. **Special Item Type Migration Breaking Existing Data** — Changing amazon_url from NOT NULL to nullable without proper guards crashes frontend (undefined.includes()) and breaks price scraping. **Prevention:** Add item_type enum first with DEFAULT 'standard', backfill existing rows, use conditional constraints: (item_type = 'standard' AND amazon_url IS NOT NULL) OR (item_type != 'standard').

3. **Realtime State Desynchronization on Favorite Toggle** — Concurrent favorite toggles by multiple users create race conditions where local state shows two favorites despite server enforcing one-per-group. **Prevention:** Use React Query with optimistic updates/rollback, server as source of truth, Realtime deduplication via item ID merging, version timestamps for conflict resolution.

4. **Profile Edit Race Conditions Overwriting Changes** — User editing profile from multiple devices causes last-write-wins data loss (Device A changes name, Device B uploads avatar with stale name, A's change lost). **Prevention:** Optimistic locking with updated_at checks, partial updates (only changed fields), conflict detection prompts user to merge changes.

5. **Favorite-Per-Group Uniqueness Not Enforced** — Without partial unique index, rapid clicks or API manipulation allows multiple favorites in same group, violating UX expectation. **Prevention:** CREATE UNIQUE INDEX unique_favorite_per_group ON wishlist_items(user_id, group_id) WHERE is_favorite = true.

**Additional moderate risks:** Mystery Box tier validation (CHECK constraint for 25/50/100 only), Realtime connection loss on background/foreground (AppState listener + manual reconnect), profile photo upload failures without rollback (two-phase commit pattern).

## Implications for Roadmap

Based on research, suggested phase structure prioritizes **risk mitigation through sequencing**: database infrastructure first (atomic migrations), isolated features next (profile editing has no dependencies), then integrated features (favorites + special items leverage schema), finally low-risk polish (star rating CSS).

### Phase 1: Database Schema (Foundation)
**Rationale:** Establish data model before dependent features; atomic migrations with RLS prevent security holes
**Delivers:** group_favorites table, item_type enum on wishlist_items, all indexes and constraints
**Addresses:** Critical pitfall #1 (RLS policy breakage), Critical pitfall #2 (migration safety), Moderate pitfall #5 (uniqueness enforcement)
**Avoids:** Deploying UI features before backend supports them, creating window for data corruption
**Duration:** 30 minutes
**Research flag:** Skip research — standard PostgreSQL migration patterns, well-documented

### Phase 2: Profile Editing (Isolated Low-Risk Win)
**Rationale:** High user value, zero dependencies on other v1.1 features, uses existing infrastructure
**Delivers:** EditProfileScreen, ProfileHeader component, photo upload with validation
**Uses:** expo-image-picker (existing), Supabase Storage (existing), existing user_profiles schema
**Addresses:** Table stakes feature (profile editing post-onboarding), birthday verification differentiator
**Avoids:** Critical pitfall #4 (race conditions via optimistic locking), moderate pitfall #8 (photo upload rollback)
**Duration:** 2 hours
**Research flag:** Skip research — standard profile editing UX, established patterns

### Phase 3: Special Item Types (New Pattern Establishment)
**Rationale:** Introduces item_type pattern for Surprise Me before reusing it for Mystery Box; lower complexity than favorites
**Delivers:** AddSpecialItemModal, type-specific validation, LuxuryWishlistCard visual treatments
**Implements:** Surprise Me (openness signaling) + Mystery Box (tier placeholders €25/€50/€100)
**Addresses:** Must-have flexibility signals, competitive differentiators (budget tiers, custom amounts)
**Avoids:** Critical pitfall #2 (type migration breakage via proper validation), moderate pitfall #6 (tier validation)
**Duration:** 3 hours
**Research flag:** Skip research — patterns established in FEATURES.md, UX conventions clear

### Phase 4: Favorite Marking (Complex State Management)
**Rationale:** Most complex feature (multi-user state sync, Realtime coordination, group scoping); benefits from earlier schema + components
**Delivers:** FavoriteButton, group_favorites integration, Realtime subscriptions, conflict resolution
**Uses:** group_favorites table (Phase 1), LuxuryWishlistCard (Phase 3 enhanced)
**Addresses:** Table stakes priority distinction, competitive differentiator (favorite per group)
**Avoids:** Critical pitfall #3 (state desync via React Query optimistic updates), moderate pitfall #7 (Realtime reconnect)
**Duration:** 2 hours
**Research flag:** Needs shallow research — React Query optimistic update patterns, Supabase Realtime conflict resolution

### Phase 5: Star Rating Fix (Polish)
**Rationale:** Lowest risk, likely cache issue not code fix; defer until end to avoid blocking other work
**Delivers:** Horizontal star display on all platforms (iOS + Android)
**Addresses:** Must-have visual priority indicator, bug reported by users
**Avoids:** Minor pitfall #9 (Android-specific layout differences via cross-platform testing)
**Duration:** 30 minutes
**Research flag:** Skip research — CSS debugging, metro cache clearing (standard troubleshooting)

### Phase Ordering Rationale

- **Database-first approach:** Schema changes in Phase 1 establish constraints (favorite uniqueness, item type validation) preventing data corruption in Phases 2-4
- **Isolated before integrated:** Profile editing (Phase 2) has zero dependencies on favorites/special items, delivers user value early while establishing photo upload patterns
- **Pattern establishment:** Special item types (Phase 3) introduce item_type handling before favorites (Phase 4) leverages same card rendering logic
- **Complexity last:** Favorite marking (Phase 4) is most complex (Realtime sync, optimistic updates, conflict resolution), benefits from earlier foundation
- **Polish deferred:** Star rating fix (Phase 5) is cosmetic with unclear root cause (likely cache), doesn't block other features

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (Favorite Marking):** Complex state sync patterns — need React Query optimistic update recipes, Supabase Realtime conflict resolution strategies, multi-user race condition testing patterns

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Database Schema):** PostgreSQL migrations, RLS policy extensions, partial unique indexes — well-documented, established patterns
- **Phase 2 (Profile Editing):** Profile CRUD with photo upload — standard UX, expo-image-picker docs sufficient
- **Phase 3 (Special Item Types):** Form validation, type-specific rendering — conventional React Native patterns
- **Phase 5 (Star Rating Fix):** CSS debugging, metro cache clearing — troubleshooting process, not research needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | All features verified implementable with existing dependencies; stack research confirmed zero new libraries needed; expo-image-picker version checked in package.json |
| Features | **MEDIUM-HIGH** | Table stakes features validated via competitive analysis (wishlist apps, gift registries); differentiators (favorite per group, budget tiers) extrapolated from patterns but not directly sourced |
| Architecture | **HIGH** | Existing codebase reviewed (schema, components, RLS policies); integration points verified; build order follows dependency graph with no circular dependencies |
| Pitfalls | **MEDIUM-HIGH** | Critical pitfalls #1-3 verified via Supabase docs (Realtime issues, migration safety, RLS patterns); pitfalls #4-5 extrapolated from general React Native/PostgreSQL best practices; moderate/minor pitfalls inferred from domain knowledge |

**Overall confidence:** **HIGH** (85%)

### Gaps to Address

Research was comprehensive for technical implementation but has gaps in UX validation:

- **Terminology validation:** "Surprise Me" vs "Flexible Gift" vs "Any Gift Welcome" — user testing during Phase 3 may reveal preferred wording
- **Favorite per group vs global favorite:** Requirement assumes group-scoped favorites; validate users understand context-dependent favorites during Phase 4 UAT
- **Mystery Box tier amounts:** €25/€50/€100 based on European gift norms; may need localization or custom tier amounts for different markets (addressed via custom tier differentiator)
- **Birthday edit cascade behavior:** Edge case with low frequency (users rarely change birthday after onboarding); defer decision on celebration cascade until user feedback indicates priority

**How to handle during planning/execution:**
- Phase 3 UAT: Test "Surprise Me" terminology with 3-5 users, prepare alternative copy if confusion detected
- Phase 4 UAT: Verify users recognize favorite is per-group (show same user's wishlist in two groups with different favorites)
- Phase 3: Implement custom tier amount as stretch goal if time permits (low complexity, high flexibility value)
- Defer birthday cascade decision: Monitor user feedback in first 30 days post-launch, add trigger in v1.2 if needed

## Sources

### Primary (HIGH confidence)
- **Existing codebase analysis** — Reviewed package.json dependencies, database schema (database.types.ts), RLS policies, component structure (LuxuryWishlistCard, StarRating, AddItemModal)
- **Supabase Realtime Troubleshooting** — Official docs on WebSocket disconnect patterns, background/foreground issues
- **React Query Invalidation Guide** — TanStack official docs on optimistic updates, cache invalidation, conflict resolution
- **Expo Image Picker docs** — Verified v17.0.10 API compatibility with existing upload flow

### Secondary (MEDIUM confidence)
- **Wishlist UX research** — E-commerce wishlist patterns (favorite buttons, priority highlighting, flexible gifting from Giftster, SoKind Registry)
- **Gift registry competitive analysis** — Universal registry features (MyRegistry, GiftList), mystery box patterns (Jackpot Candles)
- **Profile editing patterns** — Post-onboarding progressive disclosure (WishList.com FAQ, Wish app Account Settings)
- **Database migration best practices** — Rails/Laravel migration guides (constraint changes, NULL handling, atomic transactions)

### Tertiary (LOW confidence)
- **Birthday edit cascade behavior** — Extrapolated from celebration auto-creation logic in PROJECT.md; no external sources on specific edge case
- **Android Fabric vs legacy renderer** — Star rating layout differences assumed based on React Native New Architecture general knowledge; not verified for specific flex-row behavior

---
*Research completed: 2026-02-02*
*Ready for roadmap: yes*
