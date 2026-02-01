# Roadmap: Wishlist Group Gifting App

## Overview

This roadmap delivers coordinated birthday gifting through four phases: first establishing the notification infrastructure and user profiles with birthdays, then building the celebration coordination system with secret chat, followed by calendar integration for birthday visibility, and finally enabling smart reminder sequences. The strict dependency chain ensures each phase builds on a working foundation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation** - Notification infrastructure + onboarding with birthday/profile collection
- [ ] **Phase 2: Celebrations & Coordination** - Gift Leader system + secret chat rooms
- [ ] **Phase 3: Calendar** - In-app calendar view + device calendar sync
- [ ] **Phase 4: Smart Reminders** - Birthday reminder sequences + Gift Leader notifications

## Phase Details

### Phase 1: Foundation
**Goal**: Users can register push notifications and complete onboarding with their birthday and profile information
**Depends on**: Nothing (first phase)
**Requirements**: NOTF-01, NOTF-04, PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. User sees onboarding flow after first login and must complete it to access app
  2. User can enter their birthday and display name during onboarding
  3. User can optionally add a profile photo during onboarding
  4. User can view other group members' profiles (name, photo, birthday)
  5. User receives push notifications when app sends them
  6. User can view notification inbox with past notifications
**Plans**: TBD

Plans:
- [ ] 01-01: Notification infrastructure setup
- [ ] 01-02: Onboarding flow and profile screens

### Phase 2: Celebrations & Coordination
**Goal**: Users can coordinate gifts through secret chat rooms with an assigned Gift Leader per celebration
**Depends on**: Phase 1 (requires birthday data for rotation, notifications for alerts)
**Requirements**: LEAD-01, LEAD-02, LEAD-03, LEAD-04, CHAT-01, CHAT-02, CHAT-03
**Research Required**: Yes - RLS policies for secret chat require validation (see research/SUMMARY.md Phase 4)
**Success Criteria** (what must be TRUE):
  1. Gift Leader is automatically assigned based on birthday order (person after celebrant)
  2. Gift Leader sees clear UI indicating their responsibilities for each celebration
  3. Group admin can manually reassign Gift Leader when needed
  4. Each celebration has a chat room visible to all group members except the celebrant
  5. Users can send text messages in celebration chat rooms
  6. Users can link chat messages to specific wishlist items
  7. Contribution tracking shows who spent what on each gift
**Plans**: TBD

Plans:
- [ ] 02-01: Celebrations and Gift Leader system
- [ ] 02-02: Secret chat rooms with RLS

### Phase 3: Calendar
**Goal**: Users can view birthdays in an in-app calendar and sync events to their device calendar
**Depends on**: Phase 1 (requires birthday data)
**Requirements**: CALR-01, CALR-02, CALR-03, CALR-04
**Success Criteria** (what must be TRUE):
  1. User can view an in-app calendar showing all group birthdays
  2. Celebrations are automatically created when birthdays approach
  3. User can sync birthday events to Google Calendar or Apple Calendar
  4. User can see countdown to each upcoming birthday in planning window
**Plans**: TBD

Plans:
- [ ] 03-01: In-app calendar view
- [ ] 03-02: Device calendar sync

### Phase 4: Smart Reminders
**Goal**: Users receive timely birthday reminders and Gift Leaders are notified when assigned
**Depends on**: Phase 1 (notification infrastructure), Phase 2 (Gift Leader assignment)
**Requirements**: NOTF-02, NOTF-03, NOTF-05
**Success Criteria** (what must be TRUE):
  1. User receives push notification on the day of each group member's birthday
  2. User receives smart reminder sequence (4 weeks, 2 weeks, 1 week before birthday)
  3. Gift Leader receives notification immediately when assigned to a celebration
**Plans**: TBD

Plans:
- [ ] 04-01: Birthday reminder cron jobs
- [ ] 04-02: Gift Leader assignment notifications

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4
Note: Phase 3 (Calendar) could run in parallel with Phase 2 if needed.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Not started | - |
| 2. Celebrations & Coordination | 0/2 | Not started | - |
| 3. Calendar | 0/2 | Not started | - |
| 4. Smart Reminders | 0/2 | Not started | - |

---
*Roadmap created: 2026-02-02*
*Coverage: 19/19 v1 requirements mapped*
