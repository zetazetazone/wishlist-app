# Requirements: Wishlist Group Gifting App

**Defined:** 2026-02-02
**Core Value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Onboarding & Profile

- [ ] **PROF-01**: User completes onboarding with birthday and display name before using app
- [ ] **PROF-02**: User can optionally add profile photo during onboarding
- [ ] **PROF-03**: User can view other members' profiles in a group

### Notifications

- [ ] **NOTF-01**: User can receive push notifications for urgent updates
- [ ] **NOTF-02**: User receives birthday reminder on day of event
- [ ] **NOTF-03**: User receives smart reminders (4w/2w/1w before birthday)
- [ ] **NOTF-04**: User can view in-app notification inbox with notification history
- [ ] **NOTF-05**: User receives notification when assigned as Gift Leader

### Secret Chat

- [ ] **CHAT-01**: Each celebration has a chat room visible to all members except celebrant
- [ ] **CHAT-02**: Users can send text messages in celebration chat rooms
- [ ] **CHAT-03**: Users can link messages to specific wishlist items

### Calendar & Events

- [ ] **CALR-01**: User can view in-app calendar showing all group birthdays
- [ ] **CALR-02**: Celebrations are automatically created from birthdays
- [ ] **CALR-03**: User can sync birthday events to device calendar (Google/Apple)
- [ ] **CALR-04**: User can see planning window countdown to each birthday

### Gift Leader

- [ ] **LEAD-01**: Gift Leader is automatically assigned by birthday order (person after celebrant)
- [ ] **LEAD-02**: Gift Leader sees their responsibilities clearly in UI
- [ ] **LEAD-03**: Gift Leader can be manually reassigned by group admin
- [ ] **LEAD-04**: Contribution tracking logs who spent what on each gift

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Profile

- **PROF-04**: User can edit their profile (name, photo, birthday) after onboarding
- **PROF-05**: User can configure notification preferences

### Chat

- **CHAT-04**: User can see read receipts in chat
- **CHAT-05**: User can add reactions to messages

### Gift Leader

- **LEAD-05**: Leader progress dashboard with visual coordination status
- **LEAD-06**: Auto-fallback when Gift Leader is unavailable

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Voice/video chat | Massive scope increase, not needed for gift coordination |
| AI gift suggestions | Scope creep, focus on coordination first |
| Email/SMS notifications | Push + in-app sufficient for mobile-first app |
| Location-based reminders | Privacy concerns, requires continuous tracking |
| Payment splitting in-app | Gift Leader tracks contributions manually |
| Complex calendar features | Stay birthday-focused, don't rebuild Google Calendar |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROF-01 | Phase 1: Foundation | Pending |
| PROF-02 | Phase 1: Foundation | Pending |
| PROF-03 | Phase 1: Foundation | Pending |
| NOTF-01 | Phase 1: Foundation | Pending |
| NOTF-02 | Phase 4: Smart Reminders | Pending |
| NOTF-03 | Phase 4: Smart Reminders | Pending |
| NOTF-04 | Phase 1: Foundation | Pending |
| NOTF-05 | Phase 4: Smart Reminders | Pending |
| CHAT-01 | Phase 2: Celebrations & Coordination | Pending |
| CHAT-02 | Phase 2: Celebrations & Coordination | Pending |
| CHAT-03 | Phase 2: Celebrations & Coordination | Pending |
| CALR-01 | Phase 3: Calendar | Pending |
| CALR-02 | Phase 3: Calendar | Pending |
| CALR-03 | Phase 3: Calendar | Pending |
| CALR-04 | Phase 3: Calendar | Pending |
| LEAD-01 | Phase 2: Celebrations & Coordination | Pending |
| LEAD-02 | Phase 2: Celebrations & Coordination | Pending |
| LEAD-03 | Phase 2: Celebrations & Coordination | Pending |
| LEAD-04 | Phase 2: Celebrations & Coordination | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after roadmap creation*
