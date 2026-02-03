# Phase 10: Wishlist Display Polish - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance My Wishlist screen with profile picture display in header and horizontal star rating layout. This phase focuses on visual polish and UX refinement within the existing My Wishlist feature. New wishlist capabilities belong in separate phases.

</domain>

<decisions>
## Implementation Decisions

### Profile Picture Display
- Display user's profile picture in My Wishlist screen header
- Circular avatar with standard mobile sizing (60-80px diameter)
- Position: Top of screen, left-aligned or center-aligned based on header layout
- Tap interaction: Navigate to profile settings (settings/profile screen)
- Fallback: Use initials-based avatar when no photo uploaded
- Real-time updates: When user changes photo in settings, immediately reflect in wishlist header

### Star Rating Layout
- Convert vertical star rating to horizontal row
- Standard 5-star display with filled/unfilled states
- Size: Appropriately scaled for card context (not too large)
- Color: Consistent with app's gold accent (matches favorites/mystery box)
- Position: Maintain current placement within wishlist item cards
- Priority indicator: Stars represent item priority (1-5 scale)

### Header Composition
- Combine profile picture with user's display name
- Layout: Profile picture + greeting/name text
- Spacing: Comfortable padding for touch targets and visual breathing room
- Alignment: Consistent with app's existing header patterns

### Claude's Discretion
- Exact spacing and padding values
- Animation/transition effects for profile picture tap
- Header background styling and elevation
- Star size fine-tuning for optimal card balance
- Typography hierarchy for name/greeting text

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard mobile UI patterns and existing app conventions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-wishlist-display-polish*
*Context gathered: 2026-02-03*
