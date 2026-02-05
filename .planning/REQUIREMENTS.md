# Requirements: Wishlist Group Gifting App

**Defined:** 2026-02-04
**Core Value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.

## v1.2 Requirements (Complete)

<details>
<summary>25/25 requirements complete -- shipped 2026-02-05</summary>

### Create Group

- [x] **CRGRP-01**: User can add group photo when creating a group
- [x] **CRGRP-02**: User can add group description when creating a group
- [x] **CRGRP-03**: User can select group mode (Greetings/Gifts) when creating a group
- [x] **CRGRP-04**: User can select budget approach (per-gift/monthly/yearly) when creating a group (Gifts mode only)
- [x] **CRGRP-05**: Group shows generated avatar if no photo is set

### Group Modes

- [x] **MODE-01**: Group displays mode indicator (Greetings/Gifts badge)
- [x] **MODE-02**: "Greetings only" mode hides wishlists, Gift Leader, contributions, budget
- [x] **MODE-03**: Admin can change group mode in settings
- [x] **MODE-04**: Mode change shows confirmation dialog warning about feature visibility changes
- [x] **MODE-05**: Celebration page adapts to group mode (greetings-focused vs gift coordination)

### Budget Tracking

- [x] **BUDG-01**: Admin can set budget approach (per-gift/monthly pooled/yearly)
- [x] **BUDG-02**: Admin can set budget amount for monthly or yearly approaches
- [x] **BUDG-03**: Monthly pooled budget tracks all birthdays in a month against one pool
- [x] **BUDG-04**: Yearly budget tracks total annual spend against set amount
- [x] **BUDG-05**: Budget progress indicator shows spent vs available

### Group Settings

- [x] **GSET-01**: Admin can edit group name
- [x] **GSET-02**: Admin can edit group description
- [x] **GSET-03**: Admin can change group photo
- [x] **GSET-04**: Admin can remove members from group
- [x] **GSET-05**: Admin can transfer admin role to another member
- [x] **GSET-06**: User can view and regenerate invite code
- [x] **GSET-07**: User can leave group (non-admin)

### Group View

- [x] **GVIEW-01**: Group header displays photo, name, description
- [x] **GVIEW-02**: Group header shows mode badge
- [x] **GVIEW-03**: Member cards display profile photo and name (no email)
- [x] **GVIEW-04**: Member cards sorted by closest birthday
- [x] **GVIEW-05**: Member cards show birthday countdown ("12 days", "2 months")
- [x] **GVIEW-06**: Member cards show favorite item preview (thumbnail + title)
- [x] **GVIEW-07**: Tapping member card navigates to their celebration page

</details>

## v1.3 Requirements

Requirements for Gift Claims & Personal Details milestone. Each maps to roadmap phases.

### Gift Claims

- [ ] **CLAIM-01**: Member can claim a standard wishlist item (one claimer at a time, atomic operation)
- [ ] **CLAIM-02**: Claims are hidden from celebrant (celebrant cannot see who claimed what)
- [ ] **CLAIM-03**: Celebrant sees claimed items as "taken" (no claimer identity shown)
- [ ] **CLAIM-04**: Member can unclaim an item they previously claimed
- [ ] **CLAIM-05**: All group members (except celebrant) can see who claimed which items
- [ ] **CLAIM-06**: Claimed items display visual distinction (badge/dimmed) on wishlist cards
- [ ] **CLAIM-07**: Surprise Me and Mystery Box items are not claimable
- [ ] **CLAIM-08**: Claiming works in both Gifts and Greetings group modes

### Split Contributions

- [ ] **SPLIT-01**: Claimer can optionally open a claimed item for split contributions
- [ ] **SPLIT-02**: Other members can pledge amounts toward a split-contribution item
- [ ] **SPLIT-03**: Contribution progress bar shows funded percentage vs item price
- [ ] **SPLIT-04**: Unclaiming an item with contributions warns and notifies contributors

### Claim Enhancements

- [ ] **CLMX-01**: Group members receive push notification when an item is claimed
- [ ] **CLMX-02**: Celebration page shows claim count summary ("3 of 8 items claimed")
- [ ] **CLMX-03**: Claim timestamp recorded and visible in item detail

### Personal Details

- [ ] **PROF-01**: User can fill in clothing sizes (shirt, shoe, pants, ring)
- [ ] **PROF-02**: User can add favorite colors (multi-select tags)
- [ ] **PROF-03**: User can add favorite brands and interests (free-text tags)
- [ ] **PROF-04**: User can add a "dislikes / please avoid" section
- [ ] **PROF-05**: User can add external wishlist links (Amazon, Pinterest, Etsy, etc.)
- [ ] **PROF-06**: Personal details are global (shared across all groups user belongs to)
- [ ] **PROF-07**: Group members can view another member's personal details
- [ ] **PROF-08**: Profile shows completeness indicator ("60% complete")
- [ ] **PROF-09**: Profile shows "last updated" timestamp for personal details

### Secret Notes

- [ ] **NOTE-01**: Group member can add a secret note about another member
- [ ] **NOTE-02**: Secret notes are hidden from the profile owner (subject exclusion)
- [ ] **NOTE-03**: Secret notes are visible to all other group members
- [ ] **NOTE-04**: Secret notes are per-group (not shared across groups)
- [ ] **NOTE-05**: Note author can edit or delete their own notes

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Notification Preferences (v1.4+)

- **NOTF-01**: User can configure notification preferences
- **NOTF-02**: User can toggle reminder types (4w/2w/1w/day-of)

### Chat Enhancements (v1.4+)

- **CHAT-01**: User can see read receipts in chat
- **CHAT-02**: User can add reactions to messages

### Gift Leader Enhancements (v1.4+)

- **LEAD-01**: Gift Leader progress dashboard with visual coordination status
- **LEAD-02**: Auto-fallback when Gift Leader is unavailable

### Budget Enhancements (v1.4+)

- **BUDG-06**: Budget alerts when approaching limit (push notification)
- **BUDG-07**: Per-celebration budget allocation within yearly/monthly pool

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| In-app payment processing | Legal/compliance complexity; track pledges only, payment external |
| Automatic fund distribution | Not a payments app; Gift Leader tracks externally |
| Anonymous claiming (hidden from all members) | Defeats coordination purpose; Gift Leader needs transparency |
| Auto-purchase / buy-now integration | Massive scope creep; requires retailer API integrations |
| Claim expiration / auto-release | Frustrating UX; use social pressure via chat instead |
| Claiming Surprise Me / Mystery Box items | These are signals, not reservable items |
| Per-group personal details | Violates global profile requirement; data maintenance burden |
| AI gift suggestions from profile | Scope creep; human givers make better personalized decisions |
| Privacy controls per profile field | Over-engineering; all-or-nothing visibility sufficient |
| Social media profile links | Not gift-relevant; keep external links shopping-focused |
| Public/discoverable groups | Privacy-first for friend groups; invite-only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.2 (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRGRP-01 through CRGRP-05 | Phase 13 | Complete |
| MODE-01 through MODE-05 | Phase 16 | Complete |
| BUDG-01 through BUDG-05 | Phase 17 | Complete |
| GSET-01 through GSET-07 | Phase 15 | Complete |
| GVIEW-01 through GVIEW-07 | Phase 14 | Complete |

### v1.3 (In Progress)

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLAIM-01 | Phase 19 | Pending |
| CLAIM-02 | Phase 19 | Pending |
| CLAIM-03 | Phase 19 | Pending |
| CLAIM-04 | Phase 19 | Pending |
| CLAIM-05 | Phase 19 | Pending |
| CLAIM-06 | Phase 19 | Pending |
| CLAIM-07 | Phase 19 | Pending |
| CLAIM-08 | Phase 19 | Pending |
| SPLIT-01 | Phase 21 | Pending |
| SPLIT-02 | Phase 21 | Pending |
| SPLIT-03 | Phase 21 | Pending |
| SPLIT-04 | Phase 21 | Pending |
| CLMX-01 | Phase 21 | Pending |
| CLMX-02 | Phase 21 | Pending |
| CLMX-03 | Phase 21 | Pending |
| PROF-01 | Phase 20 | Pending |
| PROF-02 | Phase 20 | Pending |
| PROF-03 | Phase 20 | Pending |
| PROF-04 | Phase 20 | Pending |
| PROF-05 | Phase 20 | Pending |
| PROF-06 | Phase 20 | Pending |
| PROF-07 | Phase 20 | Pending |
| PROF-08 | Phase 20 | Pending |
| PROF-09 | Phase 20 | Pending |
| NOTE-01 | Phase 22 | Pending |
| NOTE-02 | Phase 22 | Pending |
| NOTE-03 | Phase 22 | Pending |
| NOTE-04 | Phase 22 | Pending |
| NOTE-05 | Phase 22 | Pending |

**Coverage:**
- v1.3 requirements: 30 total
- Mapped to phases: 30/30
- Unmapped: 0

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-05 after v1.3 roadmap creation*
