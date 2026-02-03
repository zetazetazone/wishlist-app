# Requirements: Wishlist Group Gifting App

**Defined:** 2026-02-02
**Core Value:** Every group member's birthday is celebrated with a coordinated gift, and no one has to remember or organize it manually.

## v1.1 Requirements

Requirements for My Wishlist Polish + Profile Editing milestone. Each maps to roadmap phases.

### Wishlist Display

- [x] **WISH-01**: User sees wishlist item cards with horizontal star ratings (not vertical)
- [x] **WISH-02**: User sees their profile picture in the My Wishlist screen header

### Favorite Item

- [x] **FAV-01**: User can mark one wishlist item as "favorite" per group
- [x] **FAV-02**: Favorite item appears pinned to top of wishlist for other group members
- [x] **FAV-03**: Favorite item has visual highlight distinguishing it from other items

### Special Item Types

- [x] **SPEC-01**: User can add a "Surprise Me" item to their wishlist
- [x] **SPEC-02**: "Surprise Me" item signals openness to any gift (optional budget guidance)
- [x] **SPEC-03**: User can add a "Mystery Box" placeholder item to their wishlist
- [x] **SPEC-04**: "Mystery Box" has selectable tiers: €50 or €100
- [x] **SPEC-05**: Special items display with distinct visual styling (icons/badges)

### Profile Editing

- [x] **PROF-01**: User can edit their display name after onboarding
- [x] **PROF-02**: User can change their profile photo after onboarding
- [x] **PROF-03**: User cannot edit birthday after onboarding (locked field)

### Onboarding Enhancement

- [x] **ONBD-01**: User sees birthday confirmation step during onboarding
- [x] **ONBD-02**: Confirmation explains birthday cannot be changed later

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Notification Preferences (v1.2+)

- **NOTF-01**: User can configure notification preferences
- **NOTF-02**: User can toggle reminder types (4w/2w/1w/day-of)

### Chat Enhancements (v1.2+)

- **CHAT-01**: User can see read receipts in chat
- **CHAT-02**: User can add reactions to messages

### Gift Leader Enhancements (v1.2+)

- **LEAD-01**: Gift Leader progress dashboard with visual coordination status
- **LEAD-02**: Auto-fallback when Gift Leader is unavailable

### Birthday Editing (v1.2+)

- **PROF-04**: User can request birthday change (with celebration cascade handling)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mystery Box purchasing | v1.1 adds placeholder only, actual purchasing deferred |
| Birthday editing | Cascades to celebrations, requires careful design |
| Custom Mystery Box tiers | Fixed €50/€100 tiers for v1.1 |
| AI gift suggestions | Scope creep, focus on coordination |
| Multiple favorites per group | One favorite per group is sufficient signal |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WISH-01 | Phase 10 | Complete |
| WISH-02 | Phase 10 | Complete |
| FAV-01 | Phase 9 | Complete |
| FAV-02 | Phase 9 | Complete |
| FAV-03 | Phase 9 | Complete |
| SPEC-01 | Phase 8 | Complete |
| SPEC-02 | Phase 8 | Complete |
| SPEC-03 | Phase 8 | Complete |
| SPEC-04 | Phase 8 | Complete |
| SPEC-05 | Phase 8 | Complete |
| PROF-01 | Phase 7 | Complete |
| PROF-02 | Phase 7 | Complete |
| PROF-03 | Phase 7 | Complete |
| ONBD-01 | Phase 7 | Complete |
| ONBD-02 | Phase 7 | Complete |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-03 after Phase 10 completion*
