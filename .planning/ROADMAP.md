# Roadmap: Wishlist Group Gifting App

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped 2026-02-02)
- 🚧 **v1.1 My Wishlist Polish + Profile Editing** - Phases 6-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) - SHIPPED 2026-02-02</summary>

### Phase 1: Foundation
**Goal**: Core database structure and authentication
**Plans**: 2 plans

Plans:
- [x] 01-01: Database schema and RLS policies
- [x] 01-02: Authentication flow

### Phase 2: Celebrations
**Goal**: Birthday celebrations and gift coordination
**Plans**: 2 plans

Plans:
- [x] 02-01: Celebration system
- [x] 02-02: Gift coordination

### Phase 3: Calendar
**Goal**: Birthday calendar and celebration visibility
**Plans**: 2 plans

Plans:
- [x] 03-01: Calendar screen
- [x] 03-02: Calendar integration

### Phase 4: Smart Reminders
**Goal**: Push notification system for birthday reminders
**Plans**: 3 plans + 1 gap closure

Plans:
- [x] 04-01: Push notification infrastructure
- [x] 04-02: Reminder scheduling system
- [x] 04-03: Notification UI integration
- [x] 04-04: Timezone hook integration (gap closure)

### Phase 5: Integration Fixes
**Goal**: Polish and bug fixes for v1.0 launch
**Plans**: 1 plan

Plans:
- [x] 05-01: Integration testing and fixes

</details>

### 🚧 v1.1 My Wishlist Polish + Profile Editing (In Progress)

**Milestone Goal:** Enable users to personalize their wishlist with special items, mark favorites, edit their profile, and see polished wishlist displays.

#### Phase 6: Schema Foundation
**Goal**: Extend database to support favorites and special item types
**Depends on**: Phase 5
**Requirements**: None (foundation for FAV-*, SPEC-*)
**Success Criteria** (what must be TRUE):
  1. Database supports group_favorites table with proper RLS policies
  2. Database supports item_type (standard, surprise_me, mystery_box) via CHECK constraint
  3. Schema migrations apply cleanly without breaking existing data
  4. All RLS policies enforce correct access control for new features
**Plans**: 1 plan

Plans:
- [ ] 06-01-PLAN.md — Schema migration for group_favorites table and item_type column

#### Phase 7: Profile Editing
**Goal**: Users can edit their profile information post-onboarding
**Depends on**: Phase 6
**Requirements**: PROF-01, PROF-02, PROF-03, ONBD-01, ONBD-02
**Success Criteria** (what must be TRUE):
  1. User can edit their display name from profile settings
  2. User can change their profile photo from profile settings
  3. User sees birthday field as locked/read-only in profile settings
  4. User sees birthday confirmation step during onboarding
  5. Onboarding confirmation clearly explains birthday cannot be changed later
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

#### Phase 8: Special Item Types
**Goal**: Users can add special wishlist items (Surprise Me, Mystery Box)
**Depends on**: Phase 6
**Requirements**: SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05
**Success Criteria** (what must be TRUE):
  1. User can add "Surprise Me" item to their wishlist with optional budget guidance
  2. User can add "Mystery Box" item to their wishlist
  3. User can select Mystery Box tier (€25, €50, or €100)
  4. Special items display with distinct visual styling (icons/badges)
  5. Special items appear correctly in other group members' views
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

#### Phase 9: Favorite Marking
**Goal**: Users can mark one item as favorite per group with visual distinction
**Depends on**: Phase 6
**Requirements**: FAV-01, FAV-02, FAV-03
**Success Criteria** (what must be TRUE):
  1. User can mark one wishlist item as "favorite" per group
  2. Favorite item appears pinned to top of wishlist for other group members
  3. Favorite item has visual highlight distinguishing it from other items
  4. Only one favorite per user per group is enforced
  5. Favorite status updates optimistically with proper conflict resolution
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

#### Phase 10: Wishlist Display Polish
**Goal**: Polish My Wishlist screen with profile picture and horizontal star ratings
**Depends on**: Phases 7, 8, 9
**Requirements**: WISH-01, WISH-02
**Success Criteria** (what must be TRUE):
  1. User sees their profile picture in the My Wishlist screen header
  2. Wishlist item cards display star ratings horizontally (not vertically)
  3. Profile picture updates immediately when changed in settings
**Plans**: TBD

Plans:
- [ ] 10-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9 → 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-02-02 |
| 2. Celebrations | v1.0 | 2/2 | Complete | 2026-02-02 |
| 3. Calendar | v1.0 | 2/2 | Complete | 2026-02-02 |
| 4. Smart Reminders | v1.0 | 4/4 | Complete | 2026-02-02 |
| 5. Integration Fixes | v1.0 | 1/1 | Complete | 2026-02-02 |
| 6. Schema Foundation | v1.1 | 0/1 | Planned | - |
| 7. Profile Editing | v1.1 | 0/? | Not started | - |
| 8. Special Item Types | v1.1 | 0/? | Not started | - |
| 9. Favorite Marking | v1.1 | 0/? | Not started | - |
| 10. Wishlist Display Polish | v1.1 | 0/? | Not started | - |
