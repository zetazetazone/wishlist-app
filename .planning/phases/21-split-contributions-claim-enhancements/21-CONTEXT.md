# Phase 21: Split Contributions & Claim Enhancements - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Claimers can open claimed items for split funding from other group members. Other members can pledge toward the item, with progress visualization. Claim-related notifications for split invites and completion, plus claim count summaries on celebration pages. Celebrant remains excluded from all claim visibility.

</domain>

<decisions>
## Implementation Decisions

### Split Contribution UX
- Equal split calculation: item price divided by participating members
- Claimer can add shipping/delivery costs on top of item price before splitting
- Members who have claimed another item can opt out (to avoid double-spending)
- When someone opts out, shares auto-recalculate among remaining participants
- Progress visualization: progress bar showing $X of $Y funded PLUS contributor avatars below with their amounts
- All group members (except celebrant) can see full contribution details (who pledged what)

### Contribution Notifications
- Push notifications sent only for split invites (NOT every individual claim)
- Split invite notification format: "[Name] invited you to split [Item name] for [Celebrant]"
- When item with contributions is unclaimed: show warning dialog, then notify all contributors that split was canceled
- Notify all contributors when split is fully funded: "[Item] for [Celebrant] is fully funded!"

### Claim Summary Display
- Claim count summary appears in BOTH celebration page header AND wishlist section header
- Format: "3 of 8 items claimed" (or similar)
- Individual claim timestamps shown on hover/tap of claim indicator only (not always visible)
- Different icons for full claims vs split claims (no explicit count distinction in text)

### Split State Management
- Pledges are locked once made — contributors cannot withdraw
- Cannot unclaim an item once any contributions exist (blocked)
- Claimer can "close" a split by covering the remaining amount themselves (converts to fully funded)

### Claude's Discretion
- Whether split funding progress appears in summary or item card only
- Split closing behavior (when/if claimer can close to new contributions before fully funded)
- Exact icon choices for full vs split claim indicators
- Timestamp format (relative vs exact) when shown

</decisions>

<specifics>
## Specific Ideas

- Opt-out flow consideration: members who claimed another item shouldn't feel obligated to double-spend on splits
- Shipping/delivery cost addition lets claimer account for real total cost, not just item price
- "Fully funded" notification creates a positive moment for contributors

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-split-contributions-claim-enhancements*
*Context gathered: 2026-02-06*
