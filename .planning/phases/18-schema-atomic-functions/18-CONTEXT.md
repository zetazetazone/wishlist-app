# Phase 18: Schema & Atomic Functions - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Database foundation for gift claims, personal details, and secret notes. Creates tables, RPC functions, and RLS policies that Phases 19-22 build UI on. No user-facing screens in this phase — pure schema and atomic operations.

</domain>

<decisions>
## Implementation Decisions

### Claiming behavior
- Claims are **global per item** (not per-celebration) — once claimed, the item is claimed everywhere
- Claims are **shared across all groups** — if claimed in Group A, members of Group B see the same claim state
- Schema supports both **full claims and split contributions** from the start (Phase 21 builds UI, but schema is ready now)
- Non-celebrant members in any group see **who claimed** each item
- Celebrant sees items marked with 👀 "claimed" badge — no claimer identity, no timestamps, no split progress

### Unclaiming (Claude's Discretion)
- Claude decides unclaim rules — schema should support unclaiming

### Claim limits (Claude's Discretion)
- Claude decides whether members can claim multiple items per wishlist — schema should support either model

### Personal details shape
- **Global per user** — one set of personal details shared across all groups
- **Extended clothing sizes**, all optional: shirt, shoe, pants, ring, dress, jacket/coat
- **Preferences as predefined + custom tags** — common options to pick from, plus ability to add custom tags for: colors, brands, interests, dislikes
- **External wishlist links** — Claude decides validation approach (any URL vs. known platforms)
- All fields stored in JSONB for flexibility

### Notes model
- Notes are **per-group scoped** — a note in Group A is invisible in Group B
- **Multiple notes per author** — each member can write separate notes about someone (shared intelligence board)
- **Delete only, no editing** — author can delete but not edit; must delete and rewrite
- **Short notes** — capped at ~280 characters (quick tips like "She hates yellow" or "Size 10 shoes")
- Subject-exclusion RLS: user cannot query notes written about themselves

### Celebrant visibility
- Claimed items show 👀 "claimed" badge only — no claimer name, no timestamps, no count summary
- No split-contribution progress visible to celebrant
- No notes about themselves visible to celebrant (subject-exclusion enforced at RLS level)

### Claude's Discretion
- Unclaim rules (instant vs. time-limited)
- Claim limit per wishlist (multiple items or one)
- External link validation approach (any URL vs. known platforms with icons)
- Self-visibility of personal details (whether celebrant can see/edit own details vs. blocked)
- Exact JSONB schema shape for personal details and preference tags

</decisions>

<specifics>
## Specific Ideas

- Celebrant claimed indicator uses 👀 emoji — not a generic "taken" label
- Notes are designed as quick gift intel tips, not long-form — keep them tweet-length (~280 chars)
- Split contribution schema should be built alongside claims from the start, even though UI comes in Phase 21
- Claims must work across groups — the same item's claim state is visible from any group the celebrant belongs to

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-schema-atomic-functions*
*Context gathered: 2026-02-05*
