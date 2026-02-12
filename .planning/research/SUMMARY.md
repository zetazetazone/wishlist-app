# Project Research Summary: v1.6 Wishlist UI Redesign

**Project:** Wishlist App - Birthday Gift Coordination
**Domain:** React Native/Expo Mobile UI Redesign (Grid Layout + Detail Pages)
**Researched:** 2026-02-12
**Confidence:** HIGH

## Executive Summary

Redesigning the wishlist UI from complex full-width cards to a modern 2-column grid + detail page architecture requires careful feature preservation during simplification. The existing `LuxuryWishlistCard` component (600+ lines, 68+ props) handles multiple conditional branches for celebrant/viewer roles, claim status, split contributions, favorites, and special item types. The recommended approach is **incremental modernization**: replace only the UI presentation layer while preserving all business logic through component reuse and careful state management.

**Stack Recommendation:** Minimal new dependencies—add only `expo-image@~3.0.11` for optimized image handling with caching and placeholders. All other requirements (grid layout, navigation, bottom sheets, animations) are satisfied by installed packages: FlashList 2.2.1 with native `masonry` prop support, expo-router 6.0.23, @gorhom/bottom-sheet 5.2.8, and moti 0.30.0. This approach minimizes risk and leverages proven infrastructure already integrated into the project.

**Critical Risks and Mitigation:** The highest risk is feature regression—accidentally dropping functionality when simplifying complex components. The existing card has 10+ conditional feature branches that must be explicitly mapped to grid or detail views. **Mitigation:** Create exhaustive feature inventory BEFORE writing code, mapping all 68 props to new component structure. Secondary risks include ScrollView performance collapse (use FlashList from day one, not as later optimization), claim state synchronization failures (implement React Query or context-based state in Phase 3 before building detail claim UI), bottom sheet keyboard conflicts (prefer inline sections over nested sheets), and celebrant privacy violations (use separate query endpoints for celebrant vs viewer data). All mitigation strategies are backed by research into known library limitations and existing codebase patterns.

## Key Findings

### Recommended Stack

**Summary:** One new dependency (`expo-image@~3.0.11`) for optimized product images with caching, blurhash placeholders, and responsive sizing. All other capabilities exist in current stack.

**Core technologies:**
- **FlashList 2.2.1 (installed)**: Virtualized 2-column grid via `masonry` prop — eliminates need for separate masonry libraries; v2 deprecates old `MasonryFlashList` component; handles 100+ items with cell recycling; verified in existing project
- **expo-image 3.0.11 (NEW)**: Optimized image component — memory-disk caching strategy, blurhash placeholders prevent layout shift, `contentFit` replaces `resizeMode` with clearer API; addresses ScrollView performance issues identified in research
- **@gorhom/bottom-sheet 5.2.8 (installed)**: Options bottom sheet — reuse existing `LuxuryBottomSheet` pattern for action menus; research identified keyboard handling issues that inform "prefer inline sections" guidance
- **expo-router 6.0.23 (installed)**: Detail page routing — add route at `app/(app)/wishlist/[id].tsx` following established file-based routing conventions; deep linking and back navigation work automatically
- **moti 0.30.0 (installed)**: Card entrance animations — reduce or remove for list items per performance research; entrance animations multiply rendering cost in virtualized lists

**Version compatibility:** All packages verified compatible with React 19.1.0, TypeScript 5.9.2, Expo SDK 54, React Native 0.81.

**What NOT to add:** Any separate masonry library (`react-native-masonry-list`, `react-native-masonry-layout`) — FlashList v2 handles this natively. Avoid `react-native-fast-image` (Expo has expo-image). Don't add custom image caching (expo-image provides this). Skip new bottom sheet libraries (already have @gorhom/bottom-sheet working).

### Expected Features

**Summary:** Three UI contexts require comprehensive feature mapping: grid cards (minimal, navigation-focused), detail pages (full item information), and options sheets (secondary actions). User expectations based on modern shopping app patterns (Amazon, Pinterest, GoWish reference).

**Must have (table stakes):**
- Grid card: product image, title, price display — visual identification is the primary list function
- Grid card: primary action button — context-dependent: "View" for owner, "Claim" for non-celebrant
- Detail page: hero image (full-bleed, 60% screen height) — standard product detail pattern, draws attention
- Detail page: product info section (title, price, description, priority) — all critical information in one glance
- Detail page: primary CTA button — "Go to Store" for owner, "Claim" for non-celebrant
- Options sheet: drag handle, action list, destructive actions last — platform conventions per iOS HIG and Material Design

**Should have (competitive differentiators):**
- Grid card: favorite heart overlay — existing `FavoriteHeart` component, quick "most wanted" indicator unique to this app
- Grid card: priority stars — existing `StarRating` component, shows importance at a glance (5-star system unique to this app)
- Grid card: claimed badge overlay — existing `TakenBadge`, non-celebrants see claim status without opening detail
- Detail page: priority editor — interactive `StarRating` for quick priority adjustment from detail view
- Detail page: favorite toggle — existing `FavoriteHeart` as toggleable button
- Detail page: special item type display — existing `ItemTypeBadge` for Surprise Me/Mystery Box context
- Detail page: split contribution display — existing `SplitContributionProgress` and `ContributorsDisplay` components
- Options sheet: item preview header — thumbnail + title + price provides context (GoWish pattern reference)
- Options sheet: move to group action — cross-group item reorganization without leaving flow

**Defer (v2+):**
- Detail page: image gallery carousel — multiple product images (requires product data we don't have)
- Grid view: filter/sort UI — by priority, price, claimed status (works with existing sort logic, needs UI)
- Detail page: related items — "you might also like" recommendations (requires recommendation engine)

**Anti-features (explicitly rejected per research):**
- Swipe-to-claim on grid — accidental claims are high-cost mistakes; claiming requires confirmation flow
- Bulk selection mode — rare use case adds significant UI complexity for minimal benefit
- Inline editing in grid — clutters grid, conflicts with navigation touch targets, creates keyboard issues
- Real-time price refresh — API calls per item are slow/expensive; prices stored as reference only
- 3D/AR product preview — heavy implementation, requires product model data we don't have

**Feature dependency note:** All display features (favorites, claims, priorities, special items) use existing components. New architecture is primarily about reorganizing UI presentation, not rebuilding functionality.

### Architecture Approach

**Summary:** Navigation-first grid card pattern with route-based detail pages. Separate components by context rather than parameterizing one mega-component. Preserve business logic in existing service layer (`lib/wishlistItems.ts`, `lib/claims.ts`, `lib/favorites.ts`).

**Major components:**

1. **WishlistGridCard (NEW)** — Simple grid display component
   - Responsibility: Compact card for 2-column grid; navigation trigger only
   - Props: ~15 props vs 68 in `LuxuryWishlistCard` (deliberate simplification)
   - Displays: Image, title, price, badges (favorite, claimed, priority stars)
   - Action: Tap navigates to detail; no inline edit/delete/claim actions
   - Reuses: `MostWantedBadge`, `TakenBadge`, `StarRating` (compact, read-only)

2. **ItemDetailScreen (NEW)** — Full item view route
   - Route: `app/(app)/wishlist/[id].tsx` (follows established routing pattern)
   - Responsibility: Full-screen detail with all item information and actions
   - Displays: Hero image, product info, priority editor, favorite toggle, claim UI, split progress
   - Actions: Primary CTA (Go to Store / Claim), Options trigger (ellipsis button)
   - Reuses: `StarRating` (interactive), `FavoriteHeart`, `ClaimButton`, `SplitContributionProgress`, `ItemTypeBadge`

3. **ItemOptionsSheet (NEW)** — Action menu bottom sheet
   - Responsibility: Secondary actions menu with item preview header
   - Uses: `@gorhom/bottom-sheet` (existing in project)
   - Actions: Edit (opens `LuxuryBottomSheet` prefilled), Delete (confirm alert), Share (Share API), Move to Group (`GroupPickerSheet`)
   - Pattern: Reuses established bottom sheet patterns from existing codebase

4. **Service Layer (EXISTING, minimal changes)** — Business logic preservation
   - Location: `lib/wishlistItems.ts`, `lib/claims.ts`, `lib/favorites.ts`
   - Changes: Add only `getWishlistItemById()` function for detail page fetch
   - Reuse: All CRUD operations, claim logic, favorite tracking unchanged
   - Rationale: Keep business logic separate from presentation changes

**Key architectural decision:** Separate components by context rather than trying to make one component handle all cases. `WishlistGridCard` is navigation-focused with minimal props. `LuxuryWishlistCard` remains for celebration/detailed views where inline actions are appropriate. This prevents prop explosion and simplifies maintenance.

**Data flow pattern:** Screen-level state management (useState) sufficient for Phase 1-2. Migrate to React Query or Context in Phase 3 when detail page claim actions require state synchronization across views. No global state store (Redux/Zustand) needed—claim state is only shared between grid and detail.

**Anti-pattern avoidance:**
- Don't overload one card component with 68+ props (current pattern creates maintenance burden)
- Don't put form UI in list items (clutters UX, creates keyboard handling issues)
- Don't write Supabase queries in components (use existing service layer)
- Don't nest bottom sheets inside bottom sheets (causes modal conflicts per research)

### Critical Pitfalls

**Summary:** Seven critical pitfalls identified through library issue analysis, codebase examination, and mobile performance research. Top 5 with highest impact:

1. **Feature Regression During Complex Component Simplification (CRITICAL-01)** — When replacing 600+ line `LuxuryWishlistCard` with simpler components, functionality silently disappears. Features that worked become broken without explicit errors.
   - **Why it happens:** Existing component handles many edge cases (split contributions, claim variants, special item types, celebrant vs non-celebrant views); developers focus on happy path and miss conditional branches; TypeScript catches missing props but not missing business logic
   - **Warning signs:** New component has significantly fewer props without documented rationale; "we'll add that later" comments in code; QA reports features "used to work"
   - **Prevention:** Create exhaustive feature inventory table mapping all 68 props to grid vs detail BEFORE writing new code; build feature parity checklist with explicit test cases for each combination; test both celebrant and non-celebrant views in every phase
   - **Phase to address:** Phase 1 (Foundation) — create comprehensive inventory as first task before any code

2. **ScrollView Performance Collapse with Grid Layout (CRITICAL-02)** — Current `wishlist-luxury.tsx` uses `ScrollView` with `.map()` which renders all items immediately. Works for small lists but causes severe jank, memory issues, and crashes at 50+ items. Grid layout with images amplifies this problem.
   - **Why it happens:** ScrollView has no virtualization (renders everything upfront); image-heavy grid items consume significant memory; Moti animations on every card multiply performance cost; developers copy patterns that work for small lists
   - **Warning signs:** JS thread CPU >30% during scroll; blank areas during fast scroll; memory climbing continuously; scroll frame drops below 60fps; crashes on device with limited memory
   - **Prevention:** Use FlashList with `masonry` prop from day one (not as later optimization); configure with `estimatedItemSize`, wrap `renderItem` in `useCallback`, never add `key` prop to item components (prevents cell recycling); reduce or remove Moti entrance animations for list items
   - **Phase to address:** Phase 2 (Grid Implementation) — use FlashList from start, not as later optimization

3. **Claim State Synchronization Failures (CRITICAL-03)** — Claims currently managed inline on cards. Moving claim UI to detail pages creates stale state: claim on detail page, but grid card still shows "unclaimed". Or vice versa.
   - **Why it happens:** Claim state managed locally in screen components (useState); no global state management for claims; multiple data paths (own wishlist vs celebration view vs group view); optimistic updates not propagated to all views; `useFocusEffect` refresh doesn't handle optimistic updates
   - **Warning signs:** Different claim status shown in different views; claim button shows "Claim" after successful claim; multiple refreshes needed to see updated state; race conditions between optimistic update and server response
   - **Prevention:** Implement React Query or Context-based state management as single source of truth; use optimistic updates with automatic rollback on error; all views (grid, detail, celebration) read from same query; mutations invalidate cache for all consumers
   - **Phase to address:** Phase 3 (Detail Page) — establish state management pattern before building claim UI

4. **Bottom Sheet Keyboard and Modal Conflicts (CRITICAL-04)** — App uses `@gorhom/bottom-sheet` extensively. When detail pages use bottom sheets for claim UI or split contributions, keyboard interactions cause sheets to snap incorrectly, multiple modals conflict, or sheets don't open reliably with React Strict Mode.
   - **Why it happens:** Bottom sheet has known issues with React Strict Mode (`findHostInstance_DEPRECATED` warnings); opening modals while bottom sheet is open can freeze app; keyboard opening causes sheet to snap to -1 unexpectedly; platform differences: Android swipe-to-dismiss differs from iOS
   - **Warning signs:** "View Controller already presenting" errors in Xcode console (iOS); sheet opens but shows blank content; sheet closes immediately after opening; different behavior on iOS vs Android; app freezes when tapping text input inside sheet
   - **Prevention:** For detail page claim UI, prefer inline sections or modal screens over nested bottom sheets; if sheets required, enable `enableDynamicSizing` for keyboard handling, never render global modals while navigation stack modal is open, test on both platforms with keyboard interactions
   - **Phase to address:** Phase 3 (Detail Page) — design claim UI without nested bottom sheets

5. **Celebrant Privacy Violation - Exposing Claimer Identity (CRITICAL-05)** — Current `LuxuryWishlistCard` carefully hides claimer identity from item owners (celebrants). When simplifying to grid + detail, this logic gets incorrectly duplicated, and celebrants can see who claimed their items, ruining gift surprises.
   - **Why it happens:** `isCelebrant` prop controls multiple conditional renders; multiple code paths for claim data (`getItemClaimStatus` vs `getClaim`); client-side filtering instead of server-side enforcement; logic intertwined with split contribution visibility; copy-paste introduces subtle bugs in visibility rules
   - **Warning signs:** Celebrant can see who claimed their item; `ClaimerAvatar` component renders for celebrant view; detail page shows claim details regardless of role; split contributor names visible to celebrant
   - **Prevention:** Use separate query endpoints (`getItemClaimStatus()` boolean-only for celebrants, `getItemClaims()` full data for non-celebrants); create separate rendering paths with explicit branching (`isCelebrant ? <CelebrantGridCard /> : <ViewerGridCard />`); add automated E2E test for privacy that runs in CI
   - **Phase to address:** All phases — test both views in every phase; add automated test in Phase 1

**Additional critical pitfalls:** Navigation state loss during view transitions (scroll position, filters, claim badges reset), image grid performance without proper optimization (memory pressure, layout shift, wrong loading priority).

**Pitfall-to-phase mapping:** Phase 1 prevents CRITICAL-01 regression through feature inventory. Phase 2 avoids CRITICAL-02 performance issues by using FlashList from start. Phase 3 addresses CRITICAL-03 state sync and CRITICAL-04 bottom sheet issues. CRITICAL-05 privacy testing required in every phase.

## Implications for Roadmap

Based on research, suggested four-phase structure with strict dependency ordering:

### Phase 1: Foundation & Feature Inventory
**Rationale:** Prevent feature regression before any code changes. Without comprehensive feature inventory, simplification WILL drop functionality silently. Database schema and dependency installation are prerequisites for all UI work.

**Delivers:**
- Comprehensive feature inventory table mapping all 68+ `LuxuryWishlistCard` props to grid vs detail
- Test matrix for celebrant vs non-celebrant views across all feature combinations
- Service layer enhancement: add `getWishlistItemById()` to `lib/wishlistItems.ts`
- Dependency installation: `npx expo install expo-image`
- Privacy test implementation: automated E2E test for celebrant/viewer role separation

**Addresses features:**
- Foundation for all table stakes features (grid image, title, price, detail hero)
- Infrastructure for differentiator features (favorites, priorities, claimed badges)

**Avoids pitfalls:**
- CRITICAL-01: Feature regression via exhaustive inventory before code changes
- CRITICAL-05: Privacy violations via automated test from start

**Dependencies:** None — pure planning and setup
**Estimated effort:** 1-2 days
**Risk:** Low (no production code changes)
**Research needs:** None — internal codebase analysis

---

### Phase 2: Grid Layout Implementation
**Rationale:** Grid is foundation for new UI. Must perform well before adding detail pages. Dependencies (expo-image, service function) completed in Phase 1. Users spend most time in grid view, so grid performance is critical path.

**Delivers:**
- Replace `ScrollView` with `FlashList` using `masonry` prop, `numColumns={2}`
- Create `WishlistGridCard` component (~15 props: item, isTaken, isFavorite, onPress)
- Implement expo-image with memory-disk caching, blurhash placeholders, explicit dimensions
- Reuse existing badges: `MostWantedBadge`, `TakenBadge`, compact `StarRating`
- Performance validation: grid scrolls smoothly with 50+ items, <100MB memory usage
- Scroll state preservation: FlashList maintains position when returning from detail

**Uses:** FlashList masonry (installed), expo-image (Phase 1), existing badge components
**Implements:** WishlistGridCard architecture component
**Addresses features:**
- Grid card: product image, title, price (table stakes)
- Grid card: favorite heart overlay, priority stars, claimed badge (differentiators)

**Avoids pitfalls:**
- CRITICAL-02: ScrollView performance collapse via FlashList from start
- CRITICAL-06: Navigation state loss via FlashList scroll preservation
- CRITICAL-07: Image performance issues via expo-image optimization

**Dependencies:** Phase 1 (expo-image installed, feature inventory complete)
**Estimated effort:** 3-4 days
**Risk:** Low (UI-only changes, well-established patterns)
**Research needs:** None — FlashList masonry patterns well-documented in existing project

---

### Phase 3: Detail Page & State Management
**Rationale:** Detail page provides space for all item information and actions. Claim state synchronization MUST be established before implementing claim UI to avoid state divergence bugs. React Query or Context pattern prevents future refactoring.

**Delivers:**
- Create `app/(app)/wishlist/[id].tsx` detail route (follows expo-router conventions)
- Full-bleed hero image (60% screen height), product info section, priority editor
- Implement React Query or Context for claim state (single source of truth)
- Optimistic updates: claim in detail immediately updates grid card state with rollback on error
- Privacy enforcement: separate query endpoints for celebrant vs non-celebrant data
- Reuse existing components: `ClaimButton`, `FavoriteHeart`, `StarRating` (interactive), `SplitContributionProgress`

**Uses:** expo-router (installed), expo-image for hero, React Query or Context, existing claim/favorite services
**Implements:** ItemDetailScreen, claim state synchronization pattern
**Addresses features:**
- Detail page: hero image, product info, primary CTA (table stakes)
- Detail page: priority editor, favorite toggle, special item display, split progress (differentiators)

**Avoids pitfalls:**
- CRITICAL-03: Claim state sync failures via React Query/Context pattern
- CRITICAL-04: Bottom sheet conflicts via inline sections (not nested sheets)
- CRITICAL-05: Privacy violations via separate query endpoints

**Dependencies:** Phase 2 (grid navigation working, expo-image verified)
**Estimated effort:** 4-5 days
**Risk:** Medium (state management architecture, claim UI complexity, privacy enforcement)
**Research needs:** React Query patterns for optimistic updates (standard patterns, documentation sufficient)

---

### Phase 4: Options Sheet & Secondary Actions
**Rationale:** Secondary actions (edit, delete, share, move) deferred until core grid + detail flow validated. Options sheet is convenience feature, not critical path. Early user testing can validate grid + detail before investing in options UI.

**Delivers:**
- Create `ItemOptionsSheet` component with item preview header (image + title + price)
- Action list: Edit (opens prefilled `LuxuryBottomSheet`), Share (Share API), Move to Group (`GroupPickerSheet`), Delete (confirm alert then remove)
- Wire edit flow to existing `LuxuryBottomSheet` with item data prefilled
- Delete success navigates back to grid with optimistic item removal

**Uses:** @gorhom/bottom-sheet (existing pattern), Share API (native), existing GroupPickerSheet
**Implements:** ItemOptionsSheet architecture component
**Addresses features:**
- Options sheet: drag handle, action list, destructive actions last (table stakes)
- Options sheet: item preview header, move to group action (differentiators)

**Avoids pitfalls:**
- CRITICAL-04: Bottom sheet conflicts via established patterns, no nesting, keyboard testing

**Dependencies:** Phase 3 (detail page stable, claim actions working)
**Estimated effort:** 2-3 days
**Risk:** Low (secondary actions, established patterns, can iterate after launch)
**Research needs:** None — bottom sheet patterns established in `LuxuryBottomSheet`

---

### Phase Ordering Rationale

**Dependency chain visualization:**
```
Phase 1 (Foundation)
    |
    ├─> expo-image dependency
    ├─> getWishlistItemById() service function
    └─> Feature inventory
            |
            v
        Phase 2 (Grid)
            |
            ├─> FlashList grid working
            ├─> Navigation to detail
            └─> Performance validated
                    |
                    v
                Phase 3 (Detail + State)
                    |
                    ├─> State management established
                    ├─> Claim UI working
                    └─> Privacy enforced
                            |
                            v
                        Phase 4 (Options)
                            |
                            └─> Secondary actions complete
```

**Why this order (not alternatives):**

1. **Foundation first, not UI-first** — Prevents rework from missing dependencies and incomplete feature understanding. Attempting grid implementation without feature inventory leads to CRITICAL-01 regressions discovered in QA.

2. **Grid before detail, not detail-first** — Grid is primary view where users spend most time. Detail depends on grid navigation working. Grid performance must be validated before adding detail page complexity. Users can browse grid without detail pages (degraded UX), but detail pages are useless without functioning grid.

3. **State management with detail, not retrofitted later** — Detail page claim actions CREATE the need for synchronized state. Implementing in Phase 3 prevents architectural refactor. Attempting detail without state management leads to CRITICAL-03 sync bugs that require full rewrite.

4. **Actions last, not integrated early** — Options sheet requires stable detail page. Secondary actions can be validated after core flow works. Deferring to Phase 4 allows early user testing of grid + detail to validate core assumptions before investing in options UI.

**Why NOT other orderings:**
- **Detail before grid:** Impossible — detail navigation requires grid to exist
- **State management in Phase 4:** Too late — detail claim UI (Phase 3) creates state sync requirements
- **Skip feature inventory:** Guarantees CRITICAL-01 regression — complex component simplification without inventory will drop functionality
- **Parallel phases:** Grid and detail have clear dependency (navigation), so parallelization gains minimal time at cost of integration complexity

**Grouping rationale:**
- **Phase 1 is pure planning** — Zero production code changes, zero user-facing risk, establishes foundation
- **Phase 2 is self-contained UI layer** — No state changes, no backend changes, can be A/B tested, early user feedback possible
- **Phase 3 is integration layer** — State management + routing + privacy, requires careful testing, highest technical risk
- **Phase 4 is enhancement layer** — Adds convenience features, doesn't change core flow, can iterate post-launch

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Codebase inventory is internal analysis; expo-image installation is straightforward
- **Phase 2 (Grid):** FlashList masonry patterns well-documented in official docs; existing project already uses FlashList successfully
- **Phase 3 (Detail):** React Query patterns for optimistic updates are established; expo-router conventions already in codebase
- **Phase 4 (Options):** Bottom sheet patterns already implemented in `LuxuryBottomSheet` reference; Share API is native

**No phases require deeper research (`/gsd:research-phase`)** — All technologies already integrated (FlashList, expo-router, bottom-sheet) or have high-quality official documentation (expo-image, React Query). Implementation uses established patterns from existing codebase.

**When to research during execution:**
- If split contribution UI layout becomes complex in Phase 3, consider quick visual design research for layout patterns
- If tablet/landscape responsive grid (deferred feature) becomes priority, research breakpoint strategies for `numColumns` calculation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (minimal dependencies) | HIGH | FlashList v2.2.1 masonry confirmed in official docs and existing project usage; expo-image v3.0.11 latest stable per npm; all other packages already integrated and working |
| Features (table stakes vs differentiators) | HIGH | Based on GoWish reference app screenshots (direct visual specification); industry standards from Amazon/Pinterest patterns; existing component reuse strategy validated via codebase analysis |
| Architecture (component separation) | HIGH | Navigation-first pattern is established mobile UX convention; service layer preservation prevents business logic changes; component reuse strategy validated via existing similar patterns in codebase |
| Pitfalls (critical risks) | HIGH | Derived from known library limitations (FlashList GitHub, @gorhom/bottom-sheet issues), existing `LuxuryWishlistCard` complexity analysis (600+ lines, 68+ props documented), and mobile performance research (cell recycling, image optimization) |
| Performance expectations (50+ items) | HIGH | FlashList cell recycling proven to handle 100+ items; expo-image caching validated in documentation; memory budget <100MB reasonable per mobile performance research |
| Feature parity approach | MEDIUM | Inventory strategy sound, but actual mapping requires careful codebase analysis; risk of missing conditional branches in complex component |

**Overall confidence:** HIGH — Technical approach validated via existing project usage (FlashList, expo-router, bottom-sheet all working), official documentation (expo-image, React Query), and industry best practices. Architecture minimizes risk through component reuse and incremental changes.

### Gaps to Address

**Feature inventory completeness:**
- Phase 1 inventory will reveal exact mapping of 68 props to grid/detail
- Edge cases in existing card logic (e.g., conditional split UI, special item type variants) require careful analysis during inventory
- Some features may be explicitly deferred to v2 after inventory reveals implementation complexity

**Split contribution display on detail page:**
- Existing `SplitContributionProgress` and `ContributorsDisplay` components provide functionality
- Layout integration with detail page (hero image + info section + split progress) needs design iteration in Phase 3
- If layout becomes complex, may require visual design work beyond component reuse

**Tablet/landscape responsive grid:**
- Current research focused on phone portrait layout (primary use case)
- iPad and landscape orientation need responsive column count (2-3 columns based on screen width)
- FlashList `numColumns` can be dynamic, but breakpoints need definition
- Explicitly deferred to post-Phase 2 based on user analytics for tablet usage

**Image caching edge cases:**
- Expo-image caching behavior under poor network conditions needs validation during Phase 2
- Rapid scrolling with many images may require memory warning handler
- Mitigation: Test on 3G throttled network; add progressive loading fallback if needed

**Multi-group wishlist item handling:**
- Current research assumes single-group context (primary use case)
- "Move to Group" action (Phase 4) needs group picker design if users have items in multiple groups
- Existing `GroupPickerSheet` (referenced in codebase) likely provides this, but integration needs validation

## Sources

### Primary (HIGH confidence)

**Existing Codebase Analysis (Direct Verification):**
- `components/wishlist/LuxuryWishlistCard.tsx` — 600+ lines, 68+ props, conditional feature branches documented
- `screens/wishlist-luxury.tsx` — ScrollView with .map() pattern, performance baseline
- `lib/wishlistItems.ts`, `lib/claims.ts`, `lib/favorites.ts` — Service layer APIs
- `components/wishlist/LuxuryBottomSheet.tsx` — Bottom sheet pattern reference
- Project package.json — Verified versions: FlashList 2.2.1, expo-router 6.0.23, @gorhom/bottom-sheet 5.2.8

**Official Documentation:**
- [FlashList Masonry Documentation](https://shopify.github.io/flash-list/docs/guides/masonry/) — v2 masonry API, `numColumns` configuration
- [FlashList v2 Changes](https://shopify.github.io/flash-list/docs/v2-changes/) — Migration from deprecated `MasonryFlashList`
- [expo-image Documentation](https://docs.expo.dev/versions/latest/sdk/image/) — API reference, caching behavior, blurhash placeholders
- [expo-router Documentation](https://docs.expo.dev/router/introduction/) — File-based routing, navigation patterns
- [React Query Documentation](https://tanstack.com/query/latest) — Optimistic updates, cache invalidation

**Package Versions (Verified 2026-02-12 via npm):**
- `expo-image@3.0.11` — Latest stable, SDK 54 compatible
- `@shopify/flash-list@2.2.2` — Latest (project has 2.2.1, compatible)

**Visual Reference:**
- GoWish App Screenshots (user-provided) — Direct reference for grid + detail + options patterns, 2-column layout, hero image sizing (60% screen height), item preview header design

### Secondary (MEDIUM confidence)

**Design Patterns and Best Practices:**
- [Mobbin Bottom Sheet Patterns](https://mobbin.com/explore/mobile/ui-elements/bottom-sheet) — Industry-standard bottom sheet designs, drag handle conventions
- [Material Design Bottom Sheets](https://m1.material.io/components/bottom-sheets.html) — Official specifications for action sheets, touch targets (48dp)
- [NN/g Bottom Sheet Guidelines](https://www.nngroup.com/articles/bottom-sheet/) — UX best practices for dismissible sheets
- [iOS Human Interface Guidelines: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) — Platform conventions for destructive actions

**Performance Research:**
- [FlashList Engineering Blog](https://shopify.engineering/flashlist-v2) — Performance details, cell recycling architecture, new arch support
- [React Native FlatList Optimization](https://reactnative.dev/docs/optimizing-flatlist-configuration) — `getItemLayout`, `keyExtractor` best practices
- [React Native Performance 2025](https://danielsarney.com/blog/react-native-performance-optimization-2025-making-mobile-apps-fast/) — JS thread optimization, rendering bottlenecks

**Known Issues and Pitfalls:**
- [Gorhom Bottom Sheet GitHub Issues](https://github.com/gorhom/react-native-bottom-sheet/issues) — Known bugs: React Strict Mode warnings, keyboard snap behavior, modal conflicts
- [Bottom Sheet Troubleshooting Docs](https://gorhom.dev/react-native-bottom-sheet/troubleshooting) — Gesture handler setup, multiple modals

**Image Optimization:**
- [React Native Image Optimization 2025](https://ficustechnologies.com/blog/react-native-image-optimization-2025-fastimage-caching-strategies-and-jank-free-scrolling/) — FastImage alternatives, caching strategies
- [Medium: React Native Image Performance](https://medium.com/@engin.bolat/react-native-image-optimization-performance-essentials-9e8ce6a1193e) — Performance comparison, layout shift prevention

### Tertiary (LOW confidence, visual inspiration only)

**Design Inspiration (Not Technical):**
- [Dribbble Wishlist Designs](https://dribbble.com/tags/wishlist-app) — Visual inspiration for grid cards
- [Mobbin Product Detail Screens](https://mobbin.com/explore/mobile/screens/product-detail) — Hero image patterns
- [DesignRush Mobile Design Patterns](https://www.designrush.com/best-designs/apps/trends/mobile-design-patterns) — Card-based design guidance

---

*Research completed: 2026-02-12*
*Ready for roadmap: YES*
*Recommended approach: Incremental modernization with minimal dependencies, comprehensive feature inventory, and established performance patterns*
