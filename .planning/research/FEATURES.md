# Features Research

**Research Date:** 2026-02-02
**Focus:** Gift coordination features (notifications, chat, calendar, Gift Leader)
**Confidence:** MEDIUM — Based on competitive analysis and industry patterns from WebSearch

## Notifications

### Table Stakes
- **Birthday reminder on day of event**: Users expect at minimum a same-day notification — Complexity: Low
- **Configurable reminder timing**: Allow users to choose when to receive reminders (day before, week before, etc.) — Complexity: Low
- **Push notifications for urgent updates**: Item claimed, gift bought, event approaching — Complexity: Medium
- **Opt-out granularity**: Let users control which notifications they receive vs. all-or-nothing — Complexity: Low

### Differentiators
- **Smart reminder sequences (4w/2w/1w before birthday)**: Multi-stage reminders giving adequate planning time for gifts, reservations, etc. — Complexity: Medium
- **Relationship-based timing**: Different reminder cadence for close family vs. acquaintances — Complexity: High
- **Morning/evening preference**: Let users choose notification time of day that fits their planning style — Complexity: Low
- **Group coordination alerts**: "3 people haven't claimed a gift yet for Sarah's birthday in 2 weeks" — Complexity: Medium
- **Price drop alerts on wishlist items**: Notify givers when items go on sale — Complexity: High (requires price tracking integration)

### Anti-Features (Skip for v1)
- **Location-based reminders**: "You're near Target, buy Sarah's gift!" — Over-engineered, privacy concerns, requires continuous location tracking
- **SMS notifications**: Adds telecom costs, delivery reliability issues, users expect push for apps
- **Email digests**: Users ignore email; push + in-app covers the need without email infrastructure
- **AI-generated gift suggestions in notifications**: Scope creep; focus on coordination first

## Group Chat

### Table Stakes
- **Secret chat per celebration (hidden from celebrant)**: Core coordination feature — the whole point of secret gifting — Complexity: Medium
- **Basic text messaging**: Send messages to coordinate gift purchases — Complexity: Low
- **Notification when new message posted**: Alert participants about chat activity — Complexity: Low
- **Read receipts or "seen by" indicator**: Know if others have seen coordination messages — Complexity: Low

### Differentiators
- **Gift context linking**: Attach messages to specific wishlist items ("I'll get the blue one, you get the red") — Complexity: Medium
- **Pinned messages**: Important info stays visible (e.g., "Budget is $50 per person") — Complexity: Low
- **Reactions/emoji**: Quick acknowledgment without cluttering chat — Complexity: Low
- **Photo sharing**: Share wrapped gift photos, store locations, receipts — Complexity: Medium
- **Contribution tracking in chat**: "John contributed $25 toward the group gift" visible in chat — Complexity: Medium

### Anti-Features (Skip for v1)
- **Voice/video calling**: Massive scope increase, not needed for gift coordination
- **File attachments beyond photos**: PDFs, documents add complexity without clear gift-coordination value
- **Message editing/deletion**: Adds complexity; simple chat is fine for coordination
- **Threading/replies**: Over-engineering; linear chat works for small groups
- **Typing indicators**: Nice-to-have but not essential for async gift planning
- **@mentions with notifications**: Small groups don't need; everyone gets notified anyway

## Calendar & Events

### Table Stakes
- **Birthday calendar view**: See upcoming birthdays at a glance — Complexity: Low
- **Add/edit birthdays**: Basic CRUD for birthday dates — Complexity: Low
- **Event creation per birthday/occasion**: A "celebration" event that coordinates gifting — Complexity: Medium
- **Countdown to next event**: "Sarah's birthday in 12 days" — Complexity: Low

### Differentiators
- **Automatic event creation from birthdays**: When a group member's birthday approaches, auto-create the coordination event — Complexity: Medium
- **Multi-occasion support**: Birthdays, anniversaries, holidays, graduations — Complexity: Low
- **Calendar sync (export to Google/Apple Calendar)**: Export birthday events to external calendars — Complexity: Medium
- **Annual recurrence handling**: Birthdays repeat yearly; handle this gracefully — Complexity: Low
- **"Planning window" visualization**: Show the 4-week window before an event where coordination happens — Complexity: Medium

### Anti-Features (Skip for v1)
- **Full calendar app features**: Don't rebuild Google Calendar; focus on birthday-centric view
- **Event invitations with RSVP**: Scope creep; coordination happens in groups, not via RSVP
- **Timezone-aware scheduling**: Birthdays are date-based, not time-based; keep it simple
- **Recurring custom events**: Support birthdays and simple occasions; complex recurrence rules are overkill
- **Calendar widget for home screen**: Native widget development is costly; defer to later

## Gift Leader System

### Table Stakes
- **Designate coordinator per celebration**: One person leads the coordination effort — Complexity: Low
- **Leader can start/close the celebration event**: Open coordination window, close when gift is purchased — Complexity: Low
- **Leader visibility into who has claimed what**: See full claiming status to avoid duplicates — Complexity: Low (already have claiming)
- **Leader can send group reminders**: Nudge participants who haven't acted — Complexity: Low

### Differentiators
- **Auto-suggest leader based on relationship**: "Mom is Sarah's mother — suggest as leader for Sarah's birthday?" — Complexity: High
- **Leader rotation for recurring events**: Different person leads each year — Complexity: Medium
- **Leader tools: set budget, assign gift categories**: Coordination utilities beyond basic messaging — Complexity: Medium
- **Leader can invite non-group members**: "Invite Uncle Bob just for this birthday" — Complexity: Medium
- **Progress dashboard for leader**: Visual overview of coordination status — Complexity: Medium
- **Deadline setting by leader**: "All gifts must be claimed by [date]" — Complexity: Low

### Anti-Features (Skip for v1)
- **Multiple co-leaders**: Adds complexity; one leader is sufficient
- **Leader approval for claims**: Friction without clear value
- **Leader can override/reassign claims**: Creates conflict potential; keep claiming first-come-first-served
- **Automated leader selection algorithm**: Let groups self-organize; don't over-automate
- **Leader "score" or reputation system**: Gamification without purpose

## Feature Dependencies

```
Notifications
├── Push notification infrastructure (required for all notification features)
└── In-app notification center (view history, mark read)

Group Chat
├── Celebration Events (chat belongs to a celebration)
├── Group membership (to know who can participate)
└── Item claiming system (for linking messages to items)

Calendar & Events
├── Birthday data per group member
├── Group membership
└── Celebration Events → enables coordination features

Gift Leader System
├── Celebration Events (leader is per-celebration)
├── Group membership (leader must be a member)
├── Claiming visibility (leader needs to see status)
└── Chat (leader uses chat to coordinate)
```

**Build Order Recommendation:**
1. Birthday data + Calendar view (foundation)
2. Celebration Events (container for coordination)
3. Gift Leader designation (who coordinates)
4. Secret Chat per celebration (coordination channel)
5. Notification sequences (reminder system)
6. Leader tools (enhanced coordination)

## Summary

The gift coordination space has clear table-stakes expectations: secret claiming (which you already have), birthday reminders, and basic coordination. The **key differentiators** for this app are:

1. **Secret chats per celebration** — Most competitors either lack chat or use general group chat. Per-celebration secret chat (hidden from celebrant) is the killer feature.

2. **Gift Leader role** — Formalizing the "coordinator" role that naturally emerges in gift-giving groups. Competitors handle this ad-hoc.

3. **Smart reminder sequences** — 4w/2w/1w reminders are unusual; most apps just do day-of or day-before. This enables actual planning instead of last-minute panic.

The biggest **anti-pattern** in this space is over-building: voice chat, complex threading, full calendar apps, AI suggestions. Users want simple coordination that stays out of the way. Focus on the coordination workflow, not feature accumulation.

**Sources:**
- [Giftwhale Blog - Wishlist App Guide 2025](https://giftwhale.com/blog/how-to-choose-the-right-wish-list-app-in-2025)
- [Giftster](https://www.giftster.com) — Family registry and Secret Santa features
- [Elfster](https://www.elfster.com/) — Secret Santa exchange app
- [Hip Birthday Reminder App](https://www.hip.app/) — Notification timing patterns
- [Givetastic](https://www.givetastic.com) — Group gifting coordination
- [Braze Push Notification Best Practices](https://www.braze.com/resources/articles/push-notifications-best-practices)
- [MobileAction - In-App Notifications 2025](https://www.mobileaction.co/blog/in-app-notifications-in-2025/)
