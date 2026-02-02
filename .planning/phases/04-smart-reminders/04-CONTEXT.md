# Phase 4: Smart Reminders - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Push notifications that remind users about upcoming birthdays and alert Gift Leaders when assigned. Includes birthday reminder sequences (4w/2w/1w/day-of) and Gift Leader assignment notifications.

</domain>

<decisions>
## Implementation Decisions

### Reminder Timing
- Sequence: 4 weeks, 2 weeks, 1 week, day-of (4 reminders total)
- Time of day: Claude's discretion (pick reasonable default)
- Timezone: Respect user's local timezone (requires storing timezone)
- New members: Catch them up on remaining reminders in sequence

### Notification Content
- Detail level: Actionable — tap opens celebration chat directly
- Day-of style: Celebratory tone with emoji ("It's Sarah's birthday today!")
- Gift status: Everyone sees contribution progress in reminder ("$45 of $60 goal")
- Avatar: Include celebrant's avatar image in push notification

### Delivery Behavior
- Celebrant receives: Day-of "Happy Birthday!" only, no countdown reminders
- Multi-group overlap: Separate reminders per group (no deduplication)
- Muting: Per-group mute option in settings
- Same-day birthdays: Group into single notification ("3 birthdays in 2 weeks")

### Gift Leader Alerts
- Initial notification: Immediately when celebration is created (30 days out)
- Content: Full context — celebrant name, date, countdown, group name, link to wishlist
- Extra nudges: Gift Leader gets specific reminders ("1 week left — have you collected contributions?")
- Reassignment: Notify both new leader (assignment) AND old leader (relieved)

### Claude's Discretion
- Exact time of day for notifications
- Notification grouping threshold (how close = "same day")
- Wording/copy for Gift Leader nudges
- Error handling for failed push delivery

</decisions>

<specifics>
## Specific Ideas

- Day-of notifications should feel celebratory, not just informational
- Gift Leader nudges should be helpful reminders, not nagging
- Contribution progress gives social proof and urgency

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-smart-reminders*
*Context gathered: 2026-02-02*
