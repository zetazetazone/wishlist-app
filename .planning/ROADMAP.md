# Roadmap: Wishlist Group Gifting App

## Milestones

- **v1.0 MVP** - Phases 1-5 (shipped 2026-02-02)
- **v1.1 My Wishlist Polish + Profile Editing** - Phases 6-10 (shipped 2026-02-03)
- **v1.2 Group Experience** - Phases 11-17 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) - SHIPPED 2026-02-02</summary>

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

<details>
<summary>v1.1 My Wishlist Polish + Profile Editing (Phases 6-10) - SHIPPED 2026-02-03</summary>

### Phase 6: Schema Foundation
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
- [x] 06-01-PLAN.md — Schema migration for group_favorites table and item_type column

### Phase 7: Profile Editing
**Goal**: Users can edit their profile information post-onboarding
**Depends on**: Phase 6
**Requirements**: PROF-01, PROF-02, PROF-03, ONBD-01, ONBD-02
**Success Criteria** (what must be TRUE):
  1. User can edit their display name from profile settings
  2. User can change their profile photo from profile settings
  3. User sees birthday field as locked/read-only in profile settings
  4. User sees birthday confirmation step during onboarding
  5. Onboarding confirmation clearly explains birthday cannot be changed later
**Plans**: 2 plans

Plans:
- [x] 07-01: Profile settings screen with name/photo editing and locked birthday
- [x] 07-02: Birthday confirmation step during onboarding

### Phase 8: Special Item Types
**Goal**: Users can add special wishlist items (Surprise Me, Mystery Box)
**Depends on**: Phase 6
**Requirements**: SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05
**Success Criteria** (what must be TRUE):
  1. User can add "Surprise Me" item to their wishlist (no per-item budget - that's group-specific)
  2. User can add "Mystery Box" item to their wishlist
  3. User can select Mystery Box tier (50 or 100 only)
  4. Special items display with distinct visual styling (icons/badges)
  5. Special items appear correctly in other group members' views
**Plans**: 3 plans (2 + 1 gap closure)

Plans:
- [x] 08-01: Add item form with type selector (Gift, Surprise Me, Mystery Box)
- [x] 08-02: Visual distinction for special items (badges, type-aware cards)
- [x] 08-03: Gap closure - fix budget field, tier options, and amazon_url constraint

### Phase 9: Favorite Marking
**Goal**: Users can mark one item as favorite per group with visual distinction
**Depends on**: Phase 6
**Requirements**: FAV-01, FAV-02, FAV-03
**Success Criteria** (what must be TRUE):
  1. User can mark one wishlist item as "favorite" per group
  2. Favorite item appears pinned to top of wishlist for other group members
  3. Favorite item has visual highlight distinguishing it from other items
  4. Only one favorite per user per group is enforced
  5. Favorite status updates optimistically with proper conflict resolution
**Plans**: 4 plans (3 + 1 gap closure)

Plans:
- [x] 09-01: Favorites service and UI components (FavoriteHeart, MostWantedBadge)
- [x] 09-02: Integration into My Wishlist with visual distinction and pinning
- [x] 09-03: Integration into celebrant event view (celebration screen wishlist display)
- [x] 09-04: Multi-group favorites redesign (gap closure)

### Phase 10: Wishlist Display Polish
**Goal**: Polish My Wishlist screen with profile picture, horizontal star ratings, and interactive priority
**Depends on**: Phases 7, 8, 9
**Requirements**: WISH-01, WISH-02
**Success Criteria** (what must be TRUE):
  1. User sees their profile picture in the My Wishlist screen header
  2. Wishlist item cards display star ratings horizontally (not vertically)
  3. Profile picture updates immediately when changed in settings
  4. User can tap stars on wishlist cards to change item priority
**Plans**: 2 plans (1 + 1 gap closure)

Plans:
- [x] 10-01-PLAN.md — Profile header with avatar and horizontal star ratings
- [x] 10-02-PLAN.md — Gap closure: Interactive star ratings with priority persistence

</details>

### v1.2 Group Experience (In Progress)

**Milestone Goal:** Enable rich group creation with photos and descriptions, group modes (Greetings vs Gifts), budget tracking approaches, redesigned group view with birthday countdowns, and comprehensive group settings management.

#### Phase 11: Schema Foundation
**Goal**: Extend groups table to support mode, budget, photos, and descriptions
**Depends on**: Phase 10
**Requirements**: None (foundation for all v1.2 features)
**Success Criteria** (what must be TRUE):
  1. Database supports group mode column (greetings/gifts)
  2. Database supports budget_approach column (per_gift/monthly/yearly)
  3. Database supports budget_amount column for pooled budgets
  4. Database supports description and photo_url columns
  5. Schema migrations apply cleanly without breaking existing groups
**Plans**: TBD

Plans:
- [ ] 11-01: Schema migration for groups table enhancements

#### Phase 12: Group Photo Storage
**Goal**: Enable group photo upload following avatar infrastructure pattern
**Depends on**: Phase 11
**Requirements**: None (foundation for CRGRP-01, CRGRP-05, GSET-03, GVIEW-01)
**Success Criteria** (what must be TRUE):
  1. Group photos stored in Supabase storage bucket with proper policies
  2. Upload service handles image compression and format validation
  3. Generated avatars display when no photo is set (initials-based)
  4. Photo URLs update correctly in groups table
**Plans**: TBD

Plans:
- [ ] 12-01: Group photo storage service and generated avatar component

#### Phase 13: Create Group Enhancement
**Goal**: Rich group creation with photo, description, mode, and budget selectors
**Depends on**: Phase 12
**Requirements**: CRGRP-01, CRGRP-02, CRGRP-03, CRGRP-04, CRGRP-05
**Success Criteria** (what must be TRUE):
  1. User can add a photo when creating a group (optional)
  2. User can add a description when creating a group (optional)
  3. User can select group mode (Greetings or Gifts) during creation
  4. User can select budget approach (per-gift/monthly/yearly) when Gifts mode selected
  5. Group displays generated avatar when no photo is set
**Plans**: TBD

Plans:
- [ ] 13-01: Create group form with photo picker and description field
- [ ] 13-02: Mode selector and budget approach configuration

#### Phase 14: Group View Redesign
**Goal**: Redesigned group screen with header, member cards, birthday sorting, and favorite previews
**Depends on**: Phase 12
**Requirements**: GVIEW-01, GVIEW-02, GVIEW-03, GVIEW-04, GVIEW-05, GVIEW-06, GVIEW-07
**Success Criteria** (what must be TRUE):
  1. Group header displays photo (or generated avatar), name, and description
  2. Group header shows mode badge (Greetings or Gifts indicator)
  3. Member cards show profile photo and name only (no email exposed)
  4. Member cards sorted by closest upcoming birthday
  5. Member cards show birthday countdown text ("12 days", "2 months")
  6. Member cards show favorite item preview (thumbnail and title) if available
  7. Tapping member card navigates to their celebration page
**Plans**: TBD

Plans:
- [ ] 14-01: Group header component with photo, name, description, mode badge
- [ ] 14-02: Member card component with birthday sorting and countdown
- [ ] 14-03: Favorite item preview in member cards

#### Phase 15: Group Settings
**Goal**: Comprehensive group settings for admin editing and member management
**Depends on**: Phase 12
**Requirements**: GSET-01, GSET-02, GSET-03, GSET-04, GSET-05, GSET-06, GSET-07
**Success Criteria** (what must be TRUE):
  1. Admin can edit group name from settings
  2. Admin can edit group description from settings
  3. Admin can change group photo from settings
  4. Admin can remove members from the group (with Gift Leader reassignment if needed)
  5. Admin can transfer admin role to another member
  6. Any member can view and regenerate invite code
  7. Non-admin members can leave the group
**Plans**: TBD

Plans:
- [ ] 15-01: Group settings screen with name/description/photo editing
- [ ] 15-02: Member management (remove members, admin transfer, leave group)
- [ ] 15-03: Invite code management

#### Phase 16: Mode System
**Goal**: Group modes control feature visibility with smooth transitions
**Depends on**: Phases 13, 14, 15
**Requirements**: MODE-01, MODE-02, MODE-03, MODE-04, MODE-05
**Success Criteria** (what must be TRUE):
  1. Group displays mode indicator badge (Greetings or Gifts)
  2. Greetings mode hides wishlists, Gift Leader, contributions, and budget UI
  3. Admin can change group mode in settings
  4. Mode change shows confirmation dialog explaining feature visibility changes
  5. Celebration page adapts to group mode (greetings-focused vs gift coordination)
**Plans**: TBD

Plans:
- [ ] 16-01: Mode-conditional rendering across group screens
- [ ] 16-02: Mode change flow with confirmation dialog
- [ ] 16-03: Celebration page mode adaptation

#### Phase 17: Budget Tracking
**Goal**: Track group spending against budget with visual progress indicators
**Depends on**: Phases 13, 16
**Requirements**: BUDG-01, BUDG-02, BUDG-03, BUDG-04, BUDG-05
**Success Criteria** (what must be TRUE):
  1. Admin can set budget approach (per-gift, monthly pooled, or yearly) in settings
  2. Admin can set budget amount for monthly or yearly approaches
  3. Monthly pooled budget tracks all birthdays in a month against one pool
  4. Yearly budget tracks total annual spend against set amount
  5. Budget progress indicator shows spent vs available amounts
**Plans**: TBD

Plans:
- [ ] 17-01: Budget settings UI with approach and amount configuration
- [ ] 17-02: Budget calculation service (monthly/yearly tracking)
- [ ] 17-03: Budget progress indicator component

## Progress

**Execution Order:**
Phases execute in numeric order: 11 -> 12 -> 13 -> 14 -> 15 -> 16 -> 17

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-02-02 |
| 2. Celebrations | v1.0 | 2/2 | Complete | 2026-02-02 |
| 3. Calendar | v1.0 | 2/2 | Complete | 2026-02-02 |
| 4. Smart Reminders | v1.0 | 4/4 | Complete | 2026-02-02 |
| 5. Integration Fixes | v1.0 | 1/1 | Complete | 2026-02-02 |
| 6. Schema Foundation | v1.1 | 1/1 | Complete | 2026-02-02 |
| 7. Profile Editing | v1.1 | 2/2 | Complete | 2026-02-03 |
| 8. Special Item Types | v1.1 | 3/3 | Complete | 2026-02-03 |
| 9. Favorite Marking | v1.1 | 4/4 | Complete | 2026-02-03 |
| 10. Wishlist Display Polish | v1.1 | 2/2 | Complete | 2026-02-03 |
| 11. Schema Foundation | v1.2 | 0/1 | Not started | - |
| 12. Group Photo Storage | v1.2 | 0/1 | Not started | - |
| 13. Create Group Enhancement | v1.2 | 0/2 | Not started | - |
| 14. Group View Redesign | v1.2 | 0/3 | Not started | - |
| 15. Group Settings | v1.2 | 0/3 | Not started | - |
| 16. Mode System | v1.2 | 0/3 | Not started | - |
| 17. Budget Tracking | v1.2 | 0/3 | Not started | - |
