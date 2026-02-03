# Phase 9: Favorite Marking - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can mark one of their own wishlist items as "Most Wanted" per group. The favorite appears pinned to the top of their wishlist (in My Wishlist and when others view them as celebrant). Each user controls their own favorites — one per group they belong to. This phase uses the `group_favorites` table created in Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Favorite Action UI
- Heart icon in top-right corner of wishlist card
- Tap heart to toggle favorite status (no confirmation dialog)
- Instant toggle — tap to favorite, tap again to unfavorite
- Subtle pulse animation on tap while status updates
- Group-specific: marking favorite designates which group you want that gift from

### Visual Distinction
- Filled heart uses app accent color
- Favorited card gets subtle accent-colored border
- "Most Wanted" badge displayed on card (app accent color, consistent with heart/border)
- Visual treatment creates cohesive accent-colored theme for favorites

### Pinned Positioning
- Favorite item pinned to top of list (no section header or divider)
- Pinning applies to both My Wishlist and celebrant event view
- Owner sees their own favorite pinned at top too (consistent view)
- When no favorite is set, list sorts by priority (stars) as fallback

### Replacement Behavior
- Auto-replace: tapping heart on new item automatically unfavorites the old one
- Visual transition only — old heart unfills, new heart fills (no toast)
- One favorite per user per group (different groups can have different favorites)
- No race conditions: each user only controls their own items' favorite status

### Claude's Discretion
- Exact animation timing and easing
- Heart icon size and exact positioning
- Badge typography and padding
- How to handle edge case of favoriting special items (Surprise Me, Mystery Box)

</decisions>

<specifics>
## Specific Ideas

- The heart + border + badge should create a cohesive "accent color" treatment
- Favorite highlight appears in celebrant's event page/chat context
- Visual distinction should be clear but not overwhelming

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-favorite-marking*
*Context gathered: 2026-02-03*
