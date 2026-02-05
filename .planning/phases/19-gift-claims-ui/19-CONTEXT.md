# Phase 19: Gift Claims UI - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Members can claim and unclaim wishlist items with visual distinction. Celebrants see "taken" status without claimer identity. Other group members see who claimed which items.

**In scope:** Claim/unclaim UI, visual states, claimer display (non-celebrant), celebrant "taken" view
**Out of scope:** Split contributions (Phase 21), claim notifications (Phase 21), personal details (Phase 20)

</domain>

<decisions>
## Implementation Decisions

### Claim Interaction
- Dedicated "Claim" button on each item card (not tap-card or long-press)
- Modal confirmation before claiming ("Claim this item?" dialog)
- Unclaim uses same button location — Claim button becomes "Unclaim" button
- Button position: Claude's discretion based on existing card layouts

### Visual States
- Claimed items move to bottom of list (unclaimed items stay more visible)
- Brief loading state when claiming (spinner, then claimed state) — not instant optimistic UI
- Claimed visual styling: Claude's discretion based on design system
- Race condition handling: Claude's discretion for error feedback approach

### Claimer Visibility (Non-Celebrant View)
- Small claimer avatar shown on claimed item cards
- Avatar position: Claude's discretion based on card layout
- Tapping claimer avatar shows tooltip/popup with claimer's name
- Your own claims: Highlighted card treatment + "Your claim" indicator (distinct from others' claims)

### Celebrant View
- "Taken" indicated by gift/present icon (not text badge or checkmark)
- Taken items appear dimmed/faded — signals "don't worry about this"
- Celebrant sees taken status on their My Wishlist screen
- Show count: "X of Y items taken" visible to celebrant — builds anticipation

### Claude's Discretion
- Claim button position on card
- Claimed item visual styling (badge, border, or other)
- Claimer avatar position on card
- Race condition error handling approach

</decisions>

<specifics>
## Specific Ideas

- "Your claim" cards should be visually distinct from others' claims — the user wants to quickly see what they're responsible for
- Gift icon for "taken" is thematic — matches the gift-giving context
- Modal confirmation adds deliberateness to claiming — prevents accidental claims
- Loading spinner during claim adds deliberateness — user knows something is happening

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-gift-claims-ui*
*Context gathered: 2026-02-05*
