# Requirements: Wishlist Group Gifting App

**Defined:** 2026-02-04
**Core Value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.

## v1.2 Requirements

Requirements for Group Experience milestone. Each maps to roadmap phases.

### Create Group

- [ ] **CRGRP-01**: User can add group photo when creating a group
- [ ] **CRGRP-02**: User can add group description when creating a group
- [ ] **CRGRP-03**: User can select group mode (Greetings/Gifts) when creating a group
- [ ] **CRGRP-04**: User can select budget approach (per-gift/monthly/yearly) when creating a group (Gifts mode only)
- [ ] **CRGRP-05**: Group shows generated avatar if no photo is set

### Group Modes

- [ ] **MODE-01**: Group displays mode indicator (Greetings/Gifts badge)
- [ ] **MODE-02**: "Greetings only" mode hides wishlists, Gift Leader, contributions, budget
- [ ] **MODE-03**: Admin can change group mode in settings
- [ ] **MODE-04**: Mode change shows confirmation dialog warning about feature visibility changes
- [ ] **MODE-05**: Celebration page adapts to group mode (greetings-focused vs gift coordination)

### Budget Tracking

- [ ] **BUDG-01**: Admin can set budget approach (per-gift/monthly pooled/yearly)
- [ ] **BUDG-02**: Admin can set budget amount for monthly or yearly approaches
- [ ] **BUDG-03**: Monthly pooled budget tracks all birthdays in a month against one pool
- [ ] **BUDG-04**: Yearly budget tracks total annual spend against set amount
- [ ] **BUDG-05**: Budget progress indicator shows spent vs available

### Group Settings

- [ ] **GSET-01**: Admin can edit group name
- [ ] **GSET-02**: Admin can edit group description
- [ ] **GSET-03**: Admin can change group photo
- [ ] **GSET-04**: Admin can remove members from group
- [ ] **GSET-05**: Admin can transfer admin role to another member
- [ ] **GSET-06**: User can view and regenerate invite code
- [ ] **GSET-07**: User can leave group (non-admin)

### Group View

- [ ] **GVIEW-01**: Group header displays photo, name, description
- [ ] **GVIEW-02**: Group header shows mode badge
- [ ] **GVIEW-03**: Member cards display profile photo and name (no email)
- [ ] **GVIEW-04**: Member cards sorted by closest birthday
- [ ] **GVIEW-05**: Member cards show birthday countdown ("12 days", "2 months")
- [ ] **GVIEW-06**: Member cards show favorite item preview (thumbnail + title)
- [ ] **GVIEW-07**: Tapping member card navigates to their celebration page

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Notification Preferences (v1.3+)

- **NOTF-01**: User can configure notification preferences
- **NOTF-02**: User can toggle reminder types (4w/2w/1w/day-of)

### Chat Enhancements (v1.3+)

- **CHAT-01**: User can see read receipts in chat
- **CHAT-02**: User can add reactions to messages

### Gift Leader Enhancements (v1.3+)

- **LEAD-01**: Gift Leader progress dashboard with visual coordination status
- **LEAD-02**: Auto-fallback when Gift Leader is unavailable

### Budget Enhancements (v1.3+)

- **BUDG-06**: Budget alerts when approaching limit (push notification)
- **BUDG-07**: Per-celebration budget allocation within yearly/monthly pool

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| In-app payment collection | Out of scope per PROJECT.md; legal/compliance complexity |
| Automatic fund distribution | Not a payments app; Gift Leader tracks externally |
| Public/discoverable groups | Privacy-first for friend groups; invite-only |
| Member roles beyond admin | Keep simple: admin vs member sufficient |
| Budget enforcement/blocking | Budgets are guidelines, not hard limits |
| Group activity log | Adds complexity; defer to future |
| Budget carryover between periods | Accounting complexity; periods stay independent |
| Detailed spending analytics | Coordination app, not finance app |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRGRP-01 | Phase 13 | Pending |
| CRGRP-02 | Phase 13 | Pending |
| CRGRP-03 | Phase 13 | Pending |
| CRGRP-04 | Phase 13 | Pending |
| CRGRP-05 | Phase 13 | Pending |
| MODE-01 | Phase 16 | Pending |
| MODE-02 | Phase 16 | Pending |
| MODE-03 | Phase 16 | Pending |
| MODE-04 | Phase 16 | Pending |
| MODE-05 | Phase 16 | Pending |
| BUDG-01 | Phase 17 | Pending |
| BUDG-02 | Phase 17 | Pending |
| BUDG-03 | Phase 17 | Pending |
| BUDG-04 | Phase 17 | Pending |
| BUDG-05 | Phase 17 | Pending |
| GSET-01 | Phase 15 | Pending |
| GSET-02 | Phase 15 | Pending |
| GSET-03 | Phase 15 | Pending |
| GSET-04 | Phase 15 | Pending |
| GSET-05 | Phase 15 | Pending |
| GSET-06 | Phase 15 | Pending |
| GSET-07 | Phase 15 | Pending |
| GVIEW-01 | Phase 14 | Pending |
| GVIEW-02 | Phase 14 | Pending |
| GVIEW-03 | Phase 14 | Pending |
| GVIEW-04 | Phase 14 | Pending |
| GVIEW-05 | Phase 14 | Pending |
| GVIEW-06 | Phase 14 | Pending |
| GVIEW-07 | Phase 14 | Pending |

**Coverage:**
- v1.2 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-04 after roadmap creation*
