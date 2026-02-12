# Pitfalls Research: Wishlist UI Redesign

**Domain:** React Native Wishlist UI Redesign (Grid Layout + Detail Pages)
**Researched:** 2026-02-12
**Confidence:** HIGH
**Focus:** Replacing LuxuryWishlistCard (68+ props, 600+ lines) with simple grid cards + detail pages while maintaining feature parity for claims, favorites, priorities, and celebrant/non-celebrant views

## Executive Summary

The critical risks for this wishlist UI redesign center on five themes:

1. **Feature regression during simplification** -- The current `LuxuryWishlistCard.tsx` handles 68+ props covering claims, splits, favorites, special items, and role-based visibility. Replacing it with "simpler" components without exhaustive feature inventory will silently drop functionality.

2. **Performance collapse at scale** -- Current implementation uses `ScrollView` with `.map()`. This works for small wishlists but will cause severe jank, memory issues, and crashes when users have 50+ items. Grid layout with images amplifies this.

3. **Claim state synchronization failures** -- Moving claim UI from cards to detail pages requires state management that doesn't currently exist. Users will claim on detail page and see stale state on grid, or vice versa.

4. **Bottom sheet and modal conflicts** -- The app relies heavily on `@gorhom/bottom-sheet` which has known issues with keyboard handling, React Strict Mode, and modal stacking. Nesting claim UI in sheets on detail pages risks freezes and inconsistent behavior.

5. **Celebrant privacy violations** -- The distinction between celebrant view (no claimer identity) and non-celebrant view (full claim details) is critical. Simplifying components risks accidentally exposing who claimed items to the item owner.

---

## Critical Pitfalls

### CRITICAL-01: Feature Regression During Complex Component Simplification

**What goes wrong:**
When replacing the 600+ line `LuxuryWishlistCard` component (68+ props) with simpler grid cards, functionality silently disappears. Features that worked become broken without explicit errors. Users discover missing functionality in production.

**Why it happens:**
- The existing component handles many edge cases (split contributions, claim variants, special item types, celebrant vs non-celebrant views)
- Developers focus on the "happy path" and miss conditional branches
- No comprehensive feature inventory exists before refactoring
- TypeScript catches missing props but not missing business logic

**Warning signs:**
- PR review doesn't include feature parity table
- New component has significantly fewer props without documented rationale
- "We'll add that later" comments in code
- QA reports features "used to work"

**Prevention:**

Create exhaustive feature inventory from `LuxuryWishlistCard.tsx` BEFORE writing new code:

| Feature Category | Props Involved | Grid Card | Detail Page |
|------------------|----------------|-----------|-------------|
| Favorite marking | favoriteGroups, singleGroupName, totalUserGroups, onToggleFavorite, showFavoriteHeart | Heart icon | Full favorite section |
| Priority display | item.priority, onPriorityChange | Star count indicator | Interactive StarRating |
| Claim visibility | claimable, claim, isYourClaim, isTaken, dimmed | Status badge | Full claim UI |
| Special items | item.item_type (surprise_me, mystery_box) | Type indicator | Type-specific content |
| Split UI | splitStatus, contributors, userPledgeAmount, suggestedShare | Progress indicator | Full split contribution |
| Role views | isCelebrant | Dimmed + Taken badge | No claim actions |
| Delete action | onDelete | None | Delete button |
| External link | item.amazon_url | None | View Product button |

Build feature parity checklist with explicit test cases for each combination.

**Phase to address:**
Phase 1 (Foundation) - Create comprehensive feature inventory as first task before any code

---

### CRITICAL-02: ScrollView Performance Collapse with Grid Layout

**What goes wrong:**
Current `wishlist-luxury.tsx` uses `ScrollView` with `.map()`. This works for small lists but causes severe performance issues with 50+ items: jank during scroll, high memory usage, UI thread blocking, and potential crashes on low-end Android devices.

**Why it happens:**
- ScrollView renders ALL items immediately (no virtualization)
- Image-heavy grid items consume significant memory
- Moti animations on every card multiply the performance cost
- Current implementation pattern copied from working small-list screens

**Warning signs:**
- JS thread CPU usage >30% during scroll
- Blank areas appearing during fast scroll (FlatList) or full re-render (ScrollView)
- Memory usage climbing continuously while scrolling
- Scroll frame drops below 60fps
- App crashes on device with limited memory

**Prevention:**

1. **Use FlashList (not FlatList) for grid layouts from the start:**

```typescript
// Correct: FlashList with cell recycling
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  numColumns={2}
  estimatedItemSize={200} // Required for FlashList v1
  renderItem={renderItem}
  keyExtractor={item => item.id}
/>

// WRONG: Do NOT add key to item component (prevents recycling)
const renderItem = useCallback(({ item }) => (
  <GridCard item={item} /> // No key prop here!
), []);
```

2. **Configure properly:**
   - Provide `estimatedItemSize` (required for FlashList v1, optional in v2)
   - Use `numColumns` for grid layout
   - Wrap `renderItem` in `useCallback`
   - Do NOT add `key` prop to list item component (prevents recycling)

3. **Reduce animation overhead:**
   - Remove or simplify Moti entrance animations for list items
   - Use native driver for any remaining animations

**Phase to address:**
Phase 2 (Grid Implementation) - Use FlashList from the start, not as a later optimization

---

### CRITICAL-03: Claim State Synchronization Failures

**What goes wrong:**
Claims are currently managed inline on cards. Moving claim UI to detail pages creates state synchronization issues: claim on detail page, but grid card still shows "unclaimed". Or vice versa: claim from celebration view, detail page shows stale state.

**Why it happens:**
- Claim state managed locally in screen components (useState)
- No global state management for claims
- Multiple data paths (own wishlist vs celebration view vs group view)
- Optimistic updates not propagated to all views
- `useFocusEffect` refresh doesn't handle optimistic updates

**Warning signs:**
- Different claim status shown in different views
- Claim button shows "Claim" after successful claim
- Multiple refreshes needed to see updated state
- Race conditions between optimistic update and server response

**Prevention:**

1. **Implement single source of truth for claims:**

```typescript
// Option A: React Context + useReducer
const ClaimContext = createContext<ClaimContextValue>(null);

// Option B: React Query cache (recommended)
const { data: claimStatus, mutate } = useQuery({
  queryKey: ['claim', itemId],
  queryFn: () => fetchClaimStatus(itemId),
});

// Mutation with optimistic update
const claimMutation = useMutation({
  mutationFn: claimItem,
  onMutate: async (itemId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['claim', itemId]);
    // Snapshot previous value
    const previous = queryClient.getQueryData(['claim', itemId]);
    // Optimistically update
    queryClient.setQueryData(['claim', itemId], { claimed: true, isYourClaim: true });
    return { previous };
  },
  onError: (err, itemId, context) => {
    // Rollback on error
    queryClient.setQueryData(['claim', itemId], context.previous);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries(['claim', itemId]);
  },
});
```

2. **All views read from same source:**
   - Grid card, detail page, celebration view all use same query
   - Mutations invalidate cache for all consumers

**Phase to address:**
Phase 3 (Detail Page) - Establish state management pattern before building claim UI

---

### CRITICAL-04: Bottom Sheet Keyboard and Modal Conflicts

**What goes wrong:**
The app uses `@gorhom/bottom-sheet` extensively. When detail pages use bottom sheets for claim UI or split contributions, keyboard interactions cause sheets to snap incorrectly, multiple modals conflict, or sheets don't open reliably with React Strict Mode.

**Why it happens:**
- Bottom sheet has known issues with React Strict Mode (findHostInstance_DEPRECATED warnings)
- Opening modals while bottom sheet is open can freeze the app
- Keyboard opening causes sheet to snap to -1 unexpectedly
- Platform differences: Android swipe-to-dismiss behavior differs from iOS
- `BottomSheetTextInput` crashes on React Native Web

**Warning signs:**
- "View Controller already presenting" errors in Xcode console (iOS)
- Sheet opens but shows blank content
- Sheet closes immediately after opening
- Different behavior on iOS vs Android
- App freezes when tapping into text input inside sheet

**Prevention:**

1. **For detail page claim UI, prefer full screens over nested bottom sheets:**

```typescript
// WRONG: Bottom sheet inside modal/detail page
<DetailScreen>
  <BottomSheet>
    <ClaimForm />
  </BottomSheet>
</DetailScreen>

// CORRECT: Inline form or modal screen
<DetailScreen>
  <ClaimSection />
</DetailScreen>

// Or: Navigate to dedicated claim screen
router.push(`/item/${itemId}/claim`);
```

2. **If bottom sheets are required:**
   - Never render global modals while navigation stack modal is open
   - Mount modals inside the bottom sheet component, not globally
   - Use `enableDynamicSizing={true}` for keyboard handling
   - Test on both platforms with keyboard interactions
   - Manage modal state carefully: only one modal at a time

**Phase to address:**
Phase 3 (Detail Page) - Design claim UI without nested bottom sheets

---

### CRITICAL-05: Celebrant Privacy Violation - Exposing Claimer Identity

**What goes wrong:**
The current `LuxuryWishlistCard` carefully hides claimer identity from celebrants (item owners). When simplifying to grid + detail, this logic gets incorrectly duplicated, and celebrants can see who claimed their items, ruining gift surprises.

**Why it happens:**
- `isCelebrant` prop controls multiple conditional renders
- Multiple code paths for claim data (getItemClaimStatus vs getClaim)
- Client-side filtering instead of server-side enforcement
- Logic intertwined with split contribution visibility
- Copy-paste introduces subtle bugs in visibility rules

**Warning signs:**
- Celebrant can see who claimed their item
- ClaimerAvatar component renders for celebrant view
- Detail page shows claim details regardless of role
- Split contributor names visible to celebrant

**Prevention:**

1. **Document view rules explicitly and enforce server-side:**

| View Element | Celebrant (Own Wishlist) | Non-Celebrant (Others' Wishlist) |
|--------------|--------------------------|----------------------------------|
| Claim status | "Taken" badge only | Full claim details |
| Claimer avatar | NEVER shown | Shown for others' claims |
| Claim button | NEVER shown | Shown if unclaimed or your claim |
| Split details | NEVER shown | Full progress + contributors |
| Item dimming | Yes, when taken | No |

2. **Use separate query endpoints:**

```typescript
// For celebrant viewing own items - returns only boolean
const { data: claimStatuses } = useQuery({
  queryKey: ['itemClaimStatus', itemIds],
  queryFn: () => getItemClaimStatus(itemIds), // Returns { item_id, is_claimed }[]
});

// For non-celebrant viewing others' items - returns full claim data
const { data: claims } = useQuery({
  queryKey: ['itemClaims', itemIds],
  queryFn: () => getItemClaims(itemIds), // Returns full ClaimWithUser[]
  enabled: !isCelebrant,
});
```

3. **Create separate rendering paths:**

```typescript
// Explicit branching makes violations obvious
{isCelebrant ? (
  <CelebrantGridCard item={item} isTaken={claimStatuses.get(item.id)} />
) : (
  <ViewerGridCard item={item} claim={claims.get(item.id)} />
)}
```

**Phase to address:**
All phases - Test both views in every phase; add automated e2e test for privacy

---

### CRITICAL-06: Navigation State Loss During View Transitions

**What goes wrong:**
When users tap a grid item to open detail page, then return to grid, the scroll position is lost, filters are reset, or claim state is stale. This destroys the browsing experience.

**Why it happens:**
- Tab navigators maintain state, but nested navigators may not
- State stored in component (useState) is lost on unmount
- useFocusEffect not properly refreshing stale data
- Scroll position not preserved across navigation

**Warning signs:**
- Scroll jumps to top when returning from detail
- "Loading..." flash when returning to list
- Stale claim badges after claiming from detail page
- Filter pills reset on navigation

**Prevention:**

1. **Preserve scroll state with FlashList:**

```typescript
<FlashList
  ref={listRef}
  // FlashList automatically maintains scroll position
  // For additional control:
  maintainVisibleContentPosition={{
    minIndexForVisible: 0,
  }}
/>
```

2. **Handle data freshness:**

```typescript
// Existing pattern in codebase - enhance with optimistic updates
useFocusEffect(
  useCallback(() => {
    // Don't refetch if we just made an optimistic update
    if (!hasOptimisticUpdate.current) {
      fetchClaimStatuses(items.map(i => i.id));
    }
    hasOptimisticUpdate.current = false;
  }, [items])
);
```

3. **Store filter/sort preferences:**

```typescript
// Persist across sessions
const [sortBy, setSortBy] = useAsyncStorage('wishlist-sort', 'priority');

// Or in context for session persistence
const { filters, setFilters } = useWishlistFilters();
```

**Phase to address:**
Phase 2 (Grid) - Implement scroll preservation from start; Phase 3 (Detail) - Ensure claim actions update list state

---

### CRITICAL-07: Image Grid Performance Without Proper Optimization

**What goes wrong:**
Grid layouts with product images cause memory pressure, slow initial render, and scroll jank. Images load in wrong order (footer images load before visible ones), layouts shift as images load (CLS).

**Why it happens:**
- No image caching strategy
- Full-resolution images loaded for thumbnails
- No priority system for visible images
- Layout calculated after image load (Content Layout Shift)

**Warning signs:**
- Grid items "jumping" as images load
- Memory usage >100MB for image grids
- Visible images load last (wrong priority)
- App crashes on device with limited memory
- Images flicker when scrolling back to previously viewed items

**Prevention:**

1. **Use proper image component:**

```typescript
// Using expo-image (recommended for Expo projects)
import { Image } from 'expo-image';

<Image
  source={{ uri: item.image_url }}
  style={{ width: GRID_IMAGE_SIZE, height: GRID_IMAGE_SIZE }}
  contentFit="cover"
  placeholder={item.blurhash} // Prevents CLS
  transition={200}
  cachePolicy="memory-disk"
/>
```

2. **Set explicit dimensions (prevents layout shift):**

```typescript
// Always provide width and height
const GRID_ITEM_WIDTH = (screenWidth - spacing * 3) / 2;
const GRID_IMAGE_HEIGHT = GRID_ITEM_WIDTH; // Square thumbnails
```

3. **Memory management:**
   - Set reasonable cache limits
   - Use lower quality for thumbnails
   - Consider Supabase Storage transformations for on-the-fly resizing

**Phase to address:**
Phase 2 (Grid Implementation) - Configure image optimization before building grid

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep using ScrollView for grid | Faster implementation | Performance cliff at ~30 items, crashes at 100+ | Never for production grids |
| Inline claim state (useState) | No new dependencies | State sync bugs, duplicated logic, stale UI | MVP only, refactor before detail pages |
| Skip image placeholder/skeleton | Less code | Layout shift, poor perceived performance | Never for image grids |
| Duplicate celebrant logic in grid + detail | Ship faster | Bugs from logic divergence, privacy risks | Never - extract to shared hook |
| Use setTimeout for modal coordination | Fixes immediate issue | Race conditions, flaky UX | Never - use proper state machine |
| Skip feature parity testing | Faster delivery | Production regressions, user complaints | Never during major refactors |
| Copy LuxuryWishlistCard logic without understanding | Faster initial work | Bugs when logic doesn't apply to new context | Never - understand before copying |

## Integration Gotchas

Common mistakes when connecting to existing systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| @gorhom/bottom-sheet + Keyboard | Assuming keyboard handling works automatically | Enable `enableDynamicSizing`, test with real keyboard, handle snap point adjustments |
| FlashList + Images | Using FlatList patterns (key props on items) | Remove key from item components, let FlashList handle recycling |
| FlashList + Moti | Animating entrance on every item | Disable or reduce animations for list items; Moti adds overhead per cell |
| Supabase claims query | Fetching full claimer profile for celebrant view | Use `getItemClaimStatus()` which only returns boolean for celebrants |
| expo-router + Detail pages | Using URL params for claim actions | Require navigation state; actions should not be triggerable via URL |
| React Navigation + Tab state | Expecting tabs to remount on focus | Use useFocusEffect for data refresh; tabs maintain state by default |
| useFocusEffect + optimistic updates | Overwriting optimistic state on focus | Check for pending optimistic updates before refetching |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| ScrollView with .map() for grids | Smooth at 10 items, janky at 30, crashes at 100 | Use FlashList with virtualization | >20 items |
| Loading all claim statuses upfront | Works for 5 items, slow for 50 | Batch fetch, paginate | >30 items |
| MotiView entrance animation on every card | Beautiful at 5 items, laggy at 20 | Remove for list items, keep for hero elements | >15 visible items |
| Full-size images in grid | Fine on WiFi, slow on 3G | Thumbnails + progressive loading + caching | Any mobile network |
| Re-rendering entire list on single claim | Unnoticeable for small lists | Memoize cards, update single item via cache | >10 items |
| Fetching on every tab focus | Fresh data, slow navigation | Cache with staleness check, optimistic updates | Frequent tab switching |
| No keyExtractor or wrong keyExtractor | Extra re-renders, wrong items updated | Use stable unique ID (item.id), never index | Any list size |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing claimer identity to celebrant via client code | Ruins gift surprise, user trust loss | Server-side filtering via `getItemClaimStatus()` - never trust client |
| Claim/unclaim without ownership check | Users can unclaim others' claims | RLS policy: `user_id = auth.uid()` on claims table |
| Split contribution amounts visible to celebrant | Reveals gift cost, ruins surprise | Separate query endpoints for celebrant vs non-celebrant |
| Detail page URL with claim action | Direct link could claim without context | Require navigation state, not URL params for actions |
| Caching claimer data client-side for all views | Leaked to celebrant view via cache inspection | Separate cache keys for celebrant vs viewer queries |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading skeleton for grid | Users see blank screen, think app is broken | Show grid skeleton with placeholder cards immediately |
| Immediate detail page push | Feels slow, no visual feedback | Scale-down animation on tap, then navigate |
| Claim confirmation in detail, back to list unchanged | Confusion: "Did it work?" | Optimistic update on list, show success toast |
| Filter/sort reset on navigation | Users lose context, have to re-filter | Persist preferences across navigation |
| No empty state for filtered grid | Blank screen with no explanation | "No items match filters" with clear action to reset |
| Pull-to-refresh on detail page | Unexpected behavior, stale detail | Only on list views; detail page shows inline refresh |
| Different tap targets on grid vs detail | Muscle memory fails, frustrating | Consistent interaction patterns across views |
| Loss of scroll position on return | Users lose place in long wishlist | FlashList maintains position; verify this works |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Grid Layout:** Often missing responsive columns for tablets - verify on iPad/Android tablet
- [ ] **Grid Card Claim Status:** Often missing loading state during status fetch - verify skeleton shown
- [ ] **Detail Page:** Often missing back gesture (Android) - verify hardware back button works
- [ ] **Detail Page Claim Button:** Often missing loading state - verify spinner during claim
- [ ] **Split Contribution:** Often missing keyboard avoidance - verify input visible when keyboard open
- [ ] **Favorite Heart:** Often missing animation feedback - verify heart animates on tap
- [ ] **Taken Badge:** Often missing on grid card - verify celebrant sees taken indicator on grid
- [ ] **Image Loading:** Often missing error state - verify broken image shows placeholder
- [ ] **Priority Stars:** Often missing read-only mode - verify non-owner can't change priority
- [ ] **Special Items:** Often missing grid indicator - verify surprise_me/mystery_box visually distinct
- [ ] **Pull-to-Refresh:** Often missing on grid - verify refresh updates claim statuses
- [ ] **Empty State:** Often missing after filter - verify "no results" message shown
- [ ] **Claim State Sync:** Often missing optimistic update - verify list updates immediately after detail claim

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Feature regression in production | MEDIUM | 1. Hotfix with old component for affected feature. 2. Add regression tests. 3. Re-implement properly. |
| ScrollView performance issue | HIGH | 1. Major refactor to FlashList. 2. Update data fetching for pagination. 3. Retest all list features. |
| State synchronization bug | MEDIUM | 1. Add global state management (React Query). 2. Migrate all claim reads to single source. 3. Add e2e tests. |
| Bottom sheet modal freeze | LOW | 1. Replace with modal screen or inline UI. 2. Update navigation structure. |
| Celebrant sees claimer identity | HIGH | 1. Emergency fix on server (separate endpoints). 2. Clear client cache. 3. Audit all data paths. 4. Add e2e test. |
| Image memory crash | MEDIUM | 1. Implement expo-image with caching. 2. Add memory warning handler. 3. Use thumbnails. |
| Navigation state loss | LOW | 1. Configure FlashList scroll persistence. 2. Add useFocusEffect refresh. 3. Test navigation flows. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Feature regression | Phase 1 (Foundation) | Feature inventory checklist reviewed before Phase 2 |
| ScrollView performance | Phase 2 (Grid) | FlashList implemented, tested with 50+ items |
| Claim state sync | Phase 3 (Detail) | Claim in detail updates list immediately |
| Bottom sheet conflicts | Phase 3 (Detail) | Claim UI works without freezes, keyboard handled |
| Celebrant privacy | All phases | Test both views in every phase, automated e2e test |
| Navigation state loss | Phase 2 (Grid) | Return from detail preserves scroll, filters |
| Image performance | Phase 2 (Grid) | Grid scrolls smoothly with images, <100MB memory |

---

## Summary: Top 5 Actions to Avoid Disaster

1. **Create feature inventory before writing code** - Document all 68+ props and their behaviors; map each to grid vs detail
2. **Use FlashList from day one** - Not as an optimization; the ScrollView approach will not scale
3. **Implement claim state management early** - Before detail pages, not after; use React Query or similar
4. **Test celebrant view separately** - Every PR should verify celebrant cannot see claimer identity
5. **Skip bottom sheets for detail page forms** - Use inline sections or modal screens instead

---

## Sources

- [FlashList vs FlatList Performance](https://medium.com/whitespectre/flashlist-vs-flatlist-understanding-the-key-differences-for-react-native-performance-15f59236a39c) - Cell recycling vs virtualization comparison
- [FlashList v2 - Shopify Engineering](https://shopify.engineering/flashlist-v2) - New architecture support, auto-sizing
- [React Native FlatList Optimization - Official Docs](https://reactnative.dev/docs/optimizing-flatlist-configuration) - getItemLayout, keyExtractor best practices
- [Gorhom Bottom Sheet Issues - GitHub](https://github.com/gorhom/react-native-bottom-sheet/issues) - Known bugs with Strict Mode, keyboard, modals
- [Bottom Sheet Troubleshooting - Official Docs](https://gorhom.dev/react-native-bottom-sheet/troubleshooting) - Gesture handler setup
- [React Native Image Optimization 2025](https://ficustechnologies.com/blog/react-native-image-optimization-2025-fastimage-caching-strategies-and-jank-free-scrolling/) - FastImage alternatives, caching strategies
- [React Native Performance 2025](https://danielsarney.com/blog/react-native-performance-optimization-2025-making-mobile-apps-fast/) - JS thread optimization
- [Modal Navigation Pitfalls - React Navigation](https://reactnavigation.org/docs/modal/) - Modal structure requirements
- [Multiple Modals in React Native](https://www.whitespectre.com/ideas/react-native-multiple-modals-library/) - Modal stacking issues
- [Conquering Modals - Solito](https://solito.dev/recipes/modals) - Global modal + navigation conflicts
- [Performance Regression Testing - Callstack](https://www.callstack.com/blog/performance-regression-testing-react-native) - Reassure for automated perf tests
- **Existing codebase analysis:** `LuxuryWishlistCard.tsx` (600+ lines, 68+ props), `ClaimButton.tsx`, `wishlist-luxury.tsx`

---
*Pitfalls research for: Wishlist UI Redesign (Grid + Detail Pages)*
*Researched: 2026-02-12*
