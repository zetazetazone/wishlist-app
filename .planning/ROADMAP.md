# Roadmap: Wishlist Group Gifting App

## Milestones

- **v1.0 MVP** - Phases 1-5 (shipped 2026-02-02)
- **v1.1 My Wishlist Polish + Profile Editing** - Phases 6-10 (shipped 2026-02-03)
- **v1.2 Group Experience** - Phases 11-17 (shipped 2026-02-05)
- **v1.3 Gift Claims & Personal Details** - Phases 18-22 (in progress)

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

<details>
<summary>v1.2 Group Experience (Phases 11-17) - SHIPPED 2026-02-05</summary>

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
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md — Schema migration for groups table (mode, budget, description, photo_url)

#### Phase 12: Group Photo Storage
**Goal**: Enable group photo upload following avatar infrastructure pattern
**Depends on**: Phase 11
**Requirements**: None (foundation for CRGRP-01, CRGRP-05, GSET-03, GVIEW-01)
**Success Criteria** (what must be TRUE):
  1. Group photos stored in Supabase storage bucket with proper policies
  2. Upload service handles image compression and format validation
  3. Generated avatars display when no photo is set (initials-based)
  4. Photo URLs update correctly in groups table
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md — RLS policies, upload service with compression, GroupAvatar component

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
**Plans**: 2 plans

Plans:
- [x] 13-01-PLAN.md — Photo upload section, description textarea, extend createGroup
- [x] 13-02-PLAN.md — Mode selector (Greetings/Gifts) and conditional budget configuration

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
**Plans**: 4 plans (3 + 1 gap closure)

Plans:
- [x] 14-01-PLAN.md — GroupModeBadge and GroupViewHeader components (GVIEW-01, GVIEW-02)
- [x] 14-02-PLAN.md — FavoritePreview and MemberCard components (GVIEW-03, GVIEW-05)
- [x] 14-03-PLAN.md — Integration with birthday sorting and favorites fetch (GVIEW-04, GVIEW-06, GVIEW-07)
- [x] 14-04-PLAN.md — Gap closure: fix member card celebration navigation (GVIEW-07)

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
**Plans**: 3 plans

Plans:
- [x] 15-01-PLAN.md — DB migration (invite_code, RLS policies, helper functions) + route restructure + settings skeleton
- [x] 15-02-PLAN.md — Group info editing (GSET-01,02,03) + invite code management (GSET-06)
- [x] 15-03-PLAN.md — Member management: remove, admin transfer, leave group (GSET-04,05,07)

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
**Plans**: 4 plans (3 + 1 gap closure)

Plans:
- [x] 16-01-PLAN.md — Mode badge on GroupCard + mode-conditional MemberCard favorite hiding (MODE-01, MODE-02)
- [x] 16-02-PLAN.md — Mode switch in settings with confirmation dialog (MODE-03, MODE-04)
- [x] 16-03-PLAN.md — Celebration page dual-mode rendering (MODE-05)
- [x] 16-04-PLAN.md — Gap closure: fix GroupModeBadge width (from UAT)

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
**Plans**: 3 plans

Plans:
- [x] 17-01-PLAN.md — Budget calculation service and updateGroupBudget data layer (TDD)
- [x] 17-02-PLAN.md — Budget settings UI with approach selector and amount configuration
- [x] 17-03-PLAN.md — Budget progress bar component and group view integration

</details>

### v1.3 Gift Claims & Personal Details (In Progress)

**Milestone Goal:** Enable members to claim wishlist items for coordinated gift-buying, provide rich personal detail profiles for better gift selection, and allow group members to share secret notes about each other for collaborative gift intelligence.

**Key architectural decisions:**
- Separate `gift_claims` table (not columns on wishlist_items) to prevent RLS leaks
- Atomic claiming via PostgreSQL RPC function (`UPDATE WHERE claimed_by IS NULL`)
- SECURITY DEFINER function for celebrant partial visibility (sees "taken" not claimer)
- `personal_details` table with JSONB for flexible storage
- `member_notes` table with subject-exclusion RLS pattern
- Three RLS patterns coexist: full exclusion (chat), partial visibility (claims), subject exclusion (notes)

#### Phase 18: Schema & Atomic Functions
**Goal**: Database foundation for claims, personal details, and secret notes with race-condition-safe atomic operations and three distinct RLS visibility patterns
**Depends on**: Phase 17
**Requirements**: None (foundation for CLAIM-*, SPLIT-*, PROF-*, NOTE-*)
**Success Criteria** (what must be TRUE):
  1. `gift_claims` table exists with celebration-scoped claims and partial unique index enforcing one full claim per item per celebration
  2. Atomic claiming RPC function prevents race conditions (two simultaneous claims on the same item result in exactly one success)
  3. Celebrant-safe status function returns only boolean is_claimed per item (claimer identity stripped)
  4. `personal_details` table exists with JSONB columns for flexible preference storage and owner-only edit RLS
  5. `member_notes` table exists with subject-exclusion RLS (user cannot query notes about themselves)
**Plans**: 2 plans

Plans:
- [x] 18-01-PLAN.md — Migration: tables (gift_claims, personal_details, member_notes), RLS policies, indexes, triggers, and atomic RPC functions
- [x] 18-02-PLAN.md — TypeScript type definitions and service library modules (claims, personal details, notes)

#### Phase 19: Gift Claims UI
**Goal**: Members can claim and unclaim wishlist items with visual distinction, and celebrants see "taken" status without claimer identity
**Depends on**: Phase 18
**Requirements**: CLAIM-01, CLAIM-02, CLAIM-03, CLAIM-04, CLAIM-05, CLAIM-06, CLAIM-07, CLAIM-08
**Success Criteria** (what must be TRUE):
  1. Member can tap a wishlist item to claim it, and the claim is immediately reflected in the UI
  2. Celebrant viewing their own wishlist sees claimed items marked as "taken" with no claimer name shown
  3. All other group members can see who claimed which items on the celebration page
  4. Member can unclaim an item they previously claimed, releasing it for others
  5. Surprise Me and Mystery Box items do not show a claim button
**Plans**: TBD

Plans:
- [ ] 19-01: TBD
- [ ] 19-02: TBD

#### Phase 20: Personal Details
**Goal**: Users can fill in and share personal details (sizes, preferences, external links) across all their groups for better gift selection
**Depends on**: Phase 18
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08, PROF-09
**Success Criteria** (what must be TRUE):
  1. User can fill in clothing sizes (shirt, shoe, pants, ring) from profile settings
  2. User can add favorite colors, brands, interests, and dislikes as tags
  3. User can add external wishlist links (Amazon, Pinterest, Etsy URLs) that open in device browser
  4. Group members can view another member's personal details on their profile page (read-only)
  5. Profile shows completeness indicator and last-updated timestamp for personal details
**Plans**: TBD

Plans:
- [ ] 20-01: TBD
- [ ] 20-02: TBD

#### Phase 21: Split Contributions & Claim Enhancements
**Goal**: Claimers can open items for split funding from other members, and claim-related notifications and summaries complete the coordination experience
**Depends on**: Phase 19
**Requirements**: SPLIT-01, SPLIT-02, SPLIT-03, SPLIT-04, CLMX-01, CLMX-02, CLMX-03
**Success Criteria** (what must be TRUE):
  1. Claimer can toggle a claimed item to accept split contributions from other members
  2. Other members can pledge amounts toward a split-contribution item, and the progress bar shows funded percentage
  3. Unclaiming an item with existing contributions shows a warning and notifies contributors
  4. Group members (except celebrant) receive a push notification when an item is claimed
  5. Celebration page shows claim count summary (e.g., "3 of 8 items claimed") and individual claim timestamps
**Plans**: TBD

Plans:
- [ ] 21-01: TBD
- [ ] 21-02: TBD

#### Phase 22: Secret Notes
**Goal**: Group members can add hidden notes about each other for collaborative gift-giving intelligence, with subject-exclusion privacy enforcement
**Depends on**: Phase 18
**Requirements**: NOTE-01, NOTE-02, NOTE-03, NOTE-04, NOTE-05
**Success Criteria** (what must be TRUE):
  1. Group member can add a secret note about another member from the member's profile or celebration page
  2. Notes are completely hidden from the profile owner (subject cannot see notes about themselves)
  3. All other group members can read notes about a member for gift-giving context
  4. Notes are scoped per-group (a note in Group A is not visible in Group B)
  5. Note author can edit or delete their own notes
**Plans**: TBD

Plans:
- [ ] 22-01: TBD
- [ ] 22-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 18 -> 19 -> 20 -> 21 -> 22
(Phases 19 and 20 can run in parallel after 18; Phase 21 depends on 19; Phase 22 depends on 18)

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
| 11. Schema Foundation | v1.2 | 1/1 | Complete | 2026-02-04 |
| 12. Group Photo Storage | v1.2 | 1/1 | Complete | 2026-02-04 |
| 13. Create Group Enhancement | v1.2 | 2/2 | Complete | 2026-02-04 |
| 14. Group View Redesign | v1.2 | 4/4 | Complete | 2026-02-04 |
| 15. Group Settings | v1.2 | 3/3 | Complete | 2026-02-05 |
| 16. Mode System | v1.2 | 4/4 | Complete | 2026-02-05 |
| 17. Budget Tracking | v1.2 | 3/3 | Complete | 2026-02-05 |
| 18. Schema & Atomic Functions | v1.3 | 2/2 | Complete | 2026-02-05 |
| 19. Gift Claims UI | v1.3 | 0/TBD | Not started | - |
| 20. Personal Details | v1.3 | 0/TBD | Not started | - |
| 21. Split Contributions & Claim Enhancements | v1.3 | 0/TBD | Not started | - |
| 22. Secret Notes | v1.3 | 0/TBD | Not started | - |
