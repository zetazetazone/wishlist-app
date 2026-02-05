# Phase 16: Mode System - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Group modes (Greetings vs Gifts) control feature visibility across all group screens. Greetings mode hides gift coordination UI; Gifts mode shows everything. Admin can switch modes with a confirmation dialog. Celebration page adapts to the active mode. This phase does NOT add new capabilities like messaging or greeting cards — it controls visibility of existing features based on mode.

</domain>

<decisions>
## Implementation Decisions

### Feature hiding behavior
- Claude's discretion on hide vs disabled approach (user said "you decide") — pick what fits existing UI patterns
- Claude's discretion on MemberCard replacement in Greetings mode (favorite preview area) — pick what makes sense given current card layout
- Existing gift data (Gift Leader assignments, contributions) preserved silently when switching to Greetings mode — data stays in DB untouched, reappears if switched back
- Claude's discretion on budget UI hiding scope — pick the cleanest separation of concerns between Phase 16 and Phase 17

### Mode switch experience
- Claude's discretion on settings placement for mode switch control — pick what fits existing settings layout
- Confirmation dialog uses cautious warning tone: "Are you sure? Wishlists and gift coordination will be hidden from all members."
- Confirmation dialog lists specific features that will be hidden/shown (wishlists, Gift Leader, contributions) — explicit, not general
- Members see a toast/banner on next group visit after mode change: "This group switched to Greetings mode. Gift features are now hidden." — brief explanation, not just mode name

### Celebration page adaptation
- Greetings mode celebration: birthday countdown + member info, no wishlists or gift coordination
- Greetings mode celebration has birthday card feel: large profile photo, name, birthday date, countdown
- Greetings mode celebration includes "Send a greeting" placeholder button — future feature hook, non-functional for now
- Gifts mode celebration: same as current implementation + subtle mode indicator badge added
- Gifts mode celebration page stays identical to existing, just adds a mode indicator

### Mode badge & indicators
- Existing GroupModeBadge from Phase 14 kept as-is — no visual changes needed
- Mode indicator also appears on group cards in the groups list (home screen), not just inside the group view
- Toast on mode change includes brief explanation (not just mode name)
- Non-admin members can see current mode as read-only in settings (grayed out / non-editable)

### Claude's Discretion
- Feature hiding approach (hard hide vs disabled state) for Greetings mode
- MemberCard replacement for favorite preview area in Greetings mode
- Budget UI hiding: whether Phase 16 handles it or Phase 17 owns its own mode checks
- Mode switch control placement in settings
- Loading states and transitions when mode changes
- Exact toast/banner implementation and timing

</decisions>

<specifics>
## Specific Ideas

- Confirmation dialog should make users "think twice" before switching — cautious, not casual
- Greetings-mode celebration should feel like "a birthday card you'd open" — large photo, warm presentation
- "Send a greeting" placeholder on Greetings-mode celebration — hooks into a future feature without building it now
- Toast for mode change should explain what happened, not just state the new mode: "This group switched to Greetings mode. Gift features are now hidden."

</specifics>

<deferred>
## Deferred Ideas

- Greeting/message system for Greetings mode celebrations — future phase (the "Send a greeting" button is a placeholder for this)
- Birthday card styling/themes for Greetings mode — could be its own enhancement phase

</deferred>

---

*Phase: 16-mode-system*
*Context gathered: 2026-02-05*
