# Requirements: Wishlist Group Gifting App

**Defined:** 2026-02-04
**Core Value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.

## v1.3 Requirements (Complete)

<details>
<summary>30/30 requirements complete -- shipped 2026-02-09</summary>

### Gift Claims

- [x] **CLAIM-01**: Member can claim a standard wishlist item (one claimer at a time, atomic operation)
- [x] **CLAIM-02**: Claims are hidden from celebrant (celebrant cannot see who claimed what)
- [x] **CLAIM-03**: Celebrant sees claimed items as "taken" (no claimer identity shown)
- [x] **CLAIM-04**: Member can unclaim an item they previously claimed
- [x] **CLAIM-05**: All group members (except celebrant) can see who claimed which items
- [x] **CLAIM-06**: Claimed items display visual distinction (badge/dimmed) on wishlist cards
- [x] **CLAIM-07**: Surprise Me and Mystery Box items are not claimable
- [x] **CLAIM-08**: Claiming works in both Gifts and Greetings group modes

### Split Contributions

- [x] **SPLIT-01**: Claimer can optionally open a claimed item for split contributions
- [x] **SPLIT-02**: Other members can pledge amounts toward a split-contribution item
- [x] **SPLIT-03**: Contribution progress bar shows funded percentage vs item price
- [x] **SPLIT-04**: Unclaiming an item with contributions warns and notifies contributors

### Claim Enhancements

- [x] **CLMX-01**: Group members receive push notification when an item is claimed
- [x] **CLMX-02**: Celebration page shows claim count summary ("3 of 8 items claimed")
- [x] **CLMX-03**: Claim timestamp recorded and visible in item detail

### Personal Details

- [x] **PROF-01**: User can fill in clothing sizes (shirt, shoe, pants, ring)
- [x] **PROF-02**: User can add favorite colors (multi-select tags)
- [x] **PROF-03**: User can add favorite brands and interests (free-text tags)
- [x] **PROF-04**: User can add a "dislikes / please avoid" section
- [x] **PROF-05**: User can add external wishlist links (Amazon, Pinterest, Etsy, etc.)
- [x] **PROF-06**: Personal details are global (shared across all groups user belongs to)
- [x] **PROF-07**: Group members can view another member's personal details
- [x] **PROF-08**: Profile shows completeness indicator ("60% complete")
- [x] **PROF-09**: Profile shows "last updated" timestamp for personal details

### Secret Notes

- [x] **NOTE-01**: Group member can add a secret note about another member
- [x] **NOTE-02**: Secret notes are hidden from the profile owner (subject exclusion)
- [x] **NOTE-03**: Secret notes are visible to all other group members
- [x] **NOTE-04**: Secret notes are per-group (not shared across groups)
- [x] **NOTE-05**: Note author can edit or delete their own notes

</details>

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

## v1.4 Requirements

Requirements for Friends System milestone. Each maps to roadmap phases.

### Friend Relationships

- [ ] **FRND-01**: User can send a friend request to another user
- [ ] **FRND-02**: User can accept an incoming friend request
- [ ] **FRND-03**: User can decline an incoming friend request
- [ ] **FRND-04**: User can view pending friend requests (incoming and outgoing)
- [ ] **FRND-05**: User can view their friends list
- [ ] **FRND-06**: User can remove an existing friend
- [ ] **FRND-07**: User can block another user (prevents future friend requests)
- [ ] **FRND-08**: User receives push notification for new friend requests
- [ ] **FRND-09**: User receives push notification when friend request is accepted

### Friend Discovery

- [ ] **DISC-01**: User can import phone contacts to find users who have the app
- [ ] **DISC-02**: Contact matching uses phone number normalization (E.164 format)
- [ ] **DISC-03**: Matched contacts show friendship status (Add/Pending/Friends)
- [ ] **DISC-04**: User can search for other users by name or email
- [ ] **DISC-05**: App handles iOS contact permission gracefully (including limited access)
- [ ] **DISC-06**: App handles Android contact permission gracefully

### Public Dates

- [ ] **DATE-01**: User can add a custom public date (anniversary, event, etc.)
- [ ] **DATE-02**: User can edit their own public dates
- [ ] **DATE-03**: User can delete their own public dates
- [ ] **DATE-04**: Public dates are visible to all user's friends
- [ ] **DATE-05**: Public dates use month/day format for annual recurrence

### Friends Calendar

- [ ] **FCAL-01**: Friend birthdays appear in in-app calendar
- [ ] **FCAL-02**: Friend custom public dates appear in in-app calendar
- [ ] **FCAL-03**: Friend dates display with distinct color (teal) from group dates
- [ ] **FCAL-04**: Calendar shows source indicator ("Friend" vs "Group") on events
- [ ] **FCAL-05**: User can sync friend dates to device calendar (Google/Apple)

### Friends Tab

- [ ] **FTAB-01**: Friends tab appears in main navigation
- [ ] **FTAB-02**: Friends tab shows friends list with profile info
- [ ] **FTAB-03**: Friends tab has link to pending requests
- [ ] **FTAB-04**: Friends tab has link to find friends (contact import)
- [ ] **FTAB-05**: User can tap friend to view their profile

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Friends Enhancements (v1.5+)

- **FRNDX-01**: Suggested friends based on mutual friends/groups
- **FRNDX-02**: Mutual friend display ("You and Sarah have 3 mutual friends")
- **FRNDX-03**: Friend birthday reminders (separate from calendar events)
- **FRNDX-04**: Friend-based group suggestions when creating groups
- **FRNDX-05**: Instagram integration for friend discovery

### Notification Preferences (v1.5+)

- **NOTF-01**: User can configure notification preferences
- **NOTF-02**: User can toggle reminder types (4w/2w/1w/day-of)

### Chat Enhancements (v1.5+)

- **CHAT-01**: User can see read receipts in chat
- **CHAT-02**: User can add reactions to messages

### Gift Leader Enhancements (v1.5+)

- **LEAD-01**: Gift Leader progress dashboard with visual coordination status
- **LEAD-02**: Auto-fallback when Gift Leader is unavailable

### Budget Enhancements (v1.5+)

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
| Instagram friend discovery (v1.4) | OAuth complexity; focus on phone contacts first, add later |
| Friend wishlists visibility | v1.4 focuses on dates; wishlist sharing is separate feature |
| Auto-friend via group membership | Explicit friend requests preferred; user controls relationships |
| Per-date visibility controls | Over-engineering; all dates public to friends is sufficient |

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

### v1.3 (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLAIM-01 through CLAIM-08 | Phase 18-19 | Complete |
| SPLIT-01 through SPLIT-04 | Phase 21 | Complete |
| CLMX-01 through CLMX-03 | Phase 21 | Complete |
| PROF-01 through PROF-09 | Phase 20 | Complete |
| NOTE-01 through NOTE-05 | Phase 22 | Complete |

### v1.4 (In Progress)

| Requirement | Phase | Status |
|-------------|-------|--------|
| FRND-01 | Phase TBD | Pending |
| FRND-02 | Phase TBD | Pending |
| FRND-03 | Phase TBD | Pending |
| FRND-04 | Phase TBD | Pending |
| FRND-05 | Phase TBD | Pending |
| FRND-06 | Phase TBD | Pending |
| FRND-07 | Phase TBD | Pending |
| FRND-08 | Phase TBD | Pending |
| FRND-09 | Phase TBD | Pending |
| DISC-01 | Phase TBD | Pending |
| DISC-02 | Phase TBD | Pending |
| DISC-03 | Phase TBD | Pending |
| DISC-04 | Phase TBD | Pending |
| DISC-05 | Phase TBD | Pending |
| DISC-06 | Phase TBD | Pending |
| DATE-01 | Phase TBD | Pending |
| DATE-02 | Phase TBD | Pending |
| DATE-03 | Phase TBD | Pending |
| DATE-04 | Phase TBD | Pending |
| DATE-05 | Phase TBD | Pending |
| FCAL-01 | Phase TBD | Pending |
| FCAL-02 | Phase TBD | Pending |
| FCAL-03 | Phase TBD | Pending |
| FCAL-04 | Phase TBD | Pending |
| FCAL-05 | Phase TBD | Pending |
| FTAB-01 | Phase TBD | Pending |
| FTAB-02 | Phase TBD | Pending |
| FTAB-03 | Phase TBD | Pending |
| FTAB-04 | Phase TBD | Pending |
| FTAB-05 | Phase TBD | Pending |

**Coverage:**
- v1.4 requirements: 30 total
- Mapped to phases: 0/30 (pending roadmap)
- Unmapped: 30 ⚠️

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-09 after v1.4 requirements definition*
