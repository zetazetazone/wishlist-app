# Features Research: v1.2 Group Experience

**Domain:** Social coordination / group gifting app
**Researched:** 2026-02-04
**Focus:** Group customization, modes, and budget tracking features

## Executive Summary

Group customization, modes, and budget tracking in social coordination apps follow well-established patterns from apps like Splitwise, Monarch Money, Honeydue, and Giftster. The core table stakes are straightforward: group identity (photo, name, description), member management, and clear settings UI. Differentiation comes from the unique "Greetings only vs Gifts" mode toggle and the monthly/yearly budget pooling approaches, which are less common in consumer apps and represent the app's specific value proposition for diverse friend group dynamics.

The member card pattern with birthday countdown and favorite item preview is well-supported by modern mobile UX trends favoring card-based layouts. Budget pooling features borrow heavily from expense-splitting apps but need adaptation for the gift coordination context where funds aren't literally pooled but rather tracked as commitments.

---

## Feature Categories

### Create Group Flow

**Table stakes:**

| Feature | Complexity | Notes |
|---------|------------|-------|
| Group name input | Low | Standard text field, required |
| Group photo upload | Medium | Camera/gallery picker, cropping, storage upload to existing `avatars` bucket |
| Group description (optional) | Low | Multi-line text input, 250 char limit typical |
| Invite code generation | Low | Already exists - reuse current logic |
| Creator becomes admin | Low | Already exists in schema |

**Differentiators:**

| Feature | Complexity | Notes |
|---------|------------|-------|
| Group mode selection (Greetings/Gifts) | Low | Toggle or segmented control in creation flow |
| Budget approach selection | Medium | Conditional on "Gifts" mode; radio/picker with 3 options |
| Member limit indicator | Low | Show current/max if implementing limits |

**Dependencies on existing features:**
- Reuses avatar storage bucket infrastructure from profile photos
- Leverages existing group creation service in `utils/groups.ts`
- Extends existing `groups` table schema

---

### Group Modes

**Table stakes:**

| Feature | Complexity | Notes |
|---------|------------|-------|
| Clear mode indicator in group UI | Low | Badge or header text showing current mode |
| Mode affects feature visibility | Medium | Conditionally hide gift coordination features in "Greetings only" |
| Mode persists in database | Low | Single column on groups table |

**Differentiators:**

| Feature | Complexity | Notes |
|---------|------------|-------|
| "Greetings only" mode hides: wishlists, Gift Leader, contribution tracking, budget | Medium | UI conditional rendering throughout app |
| Mode change confirmation dialog | Low | Warn that changing to "Greetings only" hides gift features |
| Celebration page adapts to mode | Medium | Shows greetings-focused UI vs gift coordination UI |
| Mode-specific onboarding hints | Low | Brief explanation when user joins group of each type |

**Rationale for mode system:**
Apps like [Givingli](https://givingli.com/) allow sending greetings with optional gifts, validating that users want flexibility between social acknowledgment and material gifting. Some friend groups genuinely just want to say happy birthday without the pressure of gift coordination.

**Dependencies on existing features:**
- Celebration system already exists - needs mode-conditional rendering
- Chat rooms remain available in both modes (coordination vs greetings)
- Calendar features remain in both modes

---

### Budget Approaches

**Table stakes:**

| Feature | Complexity | Notes |
|---------|------------|-------|
| Per-gift tracking | Low | Already exists as contribution tracking in v1.0 |
| Budget amount input | Low | Currency field with validation |
| Budget display in group settings | Low | Show current budget approach and amount |

**Differentiators:**

| Feature | Complexity | Notes |
|---------|------------|-------|
| Monthly pooled budget | Medium | All birthdays in a month share one budget pool |
| Yearly budget with member scaling | Medium | Total annual budget, optionally scales with member count |
| Budget progress indicator | Medium | Visual showing spent vs available (per-celebration or per-period) |
| Budget alerts (approaching limit) | Medium | Push notification when 80% spent |
| Per-celebration budget allocation | High | Allow splitting yearly/monthly budget across specific celebrations |

**Budget approach details:**

1. **Per-Gift (default):** Traditional model. Each gift purchase is tracked individually. No pooling. Gift Leader records who contributed what per celebration. This is what v1.0 already supports.

2. **Monthly Pooled:** All group birthdays in a given month share one budget. Example: March has 3 birthdays, group allocates 150 euros for March, split across 3 celebrations. Common in apps like [Shareroo](https://apps.apple.com/us/app/shared-budget-planner-shareroo/id1475406336) for household budgeting.

3. **Yearly Budget:** Group sets annual total (e.g., 500 euros/year). Can optionally scale: "10 euros per member per birthday" formula. Used in corporate gifting platforms for predictable spend.

**Implementation consideration:**
Budget tracking in this app is commitment tracking, not actual fund pooling. Unlike [PayPal Pool Money](https://newsroom.paypal-corp.com/2024-11-14-PayPal-Unveils-Innovative-Money-Pooling-Feature,-Simplifying-Group-Expenses-Between-Family-and-Friends) or [Splitwise](https://apps.apple.com/us/app/splitwise/id458023433), funds aren't collected in-app. Budget features track commitments and provide visibility, but payment happens externally.

**Dependencies on existing features:**
- Extends contribution tracking system from v1.0
- Requires celebration dates for monthly aggregation
- Member count from existing group_members table

---

### Group Settings

**Table stakes:**

| Feature | Complexity | Notes |
|---------|------------|-------|
| Edit group name | Low | Text input with save |
| Edit group description | Low | Multi-line text with save |
| Change group photo | Medium | Reuse photo picker, handle storage replacement |
| View member list | Low | Already exists |
| Leave group (non-admin) | Low | Confirmation dialog, remove membership |

**Differentiators:**

| Feature | Complexity | Notes |
|---------|------------|-------|
| Change group mode | Low | Toggle with confirmation warning |
| Adjust budget approach | Medium | Picker with migration handling |
| Remove member (admin) | Medium | Confirmation, handle cascading data |
| Transfer admin role | Medium | Select new admin, update permissions |
| View/regenerate invite code | Low | Display current code, regenerate button |
| Group activity log | High | Track who changed what - likely defer |

**UX patterns from research:**

Per [Android Settings patterns](https://developer.android.com/design/ui/mobile/guides/patterns/settings) and [Netguru's settings UX guide](https://www.netguru.com/blog/how-to-improve-app-settings-ux):
- Use parent toggles for grouped dependent settings
- Divider lines group related settings
- Plain language, no jargon in setting labels
- Settings take effect immediately for toggles (no save button needed)

**Recommended settings organization:**
```
Group Settings
├── Details
│   ├── Name
│   ├── Description
│   └── Photo
├── Mode & Budget
│   ├── Group Mode (Greetings/Gifts)
│   └── Budget Approach (if Gifts mode)
├── Members
│   ├── Member List
│   └── Invite Code
└── Danger Zone
    ├── Leave Group
    └── Delete Group (admin only)
```

**Dependencies on existing features:**
- Group detail screen exists at `app/group/[id].tsx`
- Member list viewing exists
- Admin role tracking exists in schema

---

### Group View / Member Cards

**Table stakes:**

| Feature | Complexity | Notes |
|---------|------------|-------|
| Group header with photo | Low | Image component with fallback |
| Group name in header | Low | Already exists |
| Member list display | Low | Already exists |
| Member profile photo in card | Low | Reuse avatar component |
| Member name in card | Low | Already exists |

**Differentiators:**

| Feature | Complexity | Notes |
|---------|------------|-------|
| Group description in header | Low | Collapsible or truncated text |
| Member cards sorted by closest birthday | Medium | Query with date comparison, handle year wrap |
| Birthday countdown on member card | Medium | "12 days" or "2 months" relative display |
| Favorite item preview on member card | Medium | Query favorite across wishlists, thumbnail + title |
| Tap card navigates to celebration | Low | Link to existing celebration page |
| Mode badge in group header | Low | Visual indicator of Greetings/Gifts mode |

**Card design considerations:**

Per [Mobbin's avatar UI patterns](https://mobbin.com/glossary/avatar) and [SetProduct's userpic design guide](https://www.setproduct.com/blog/avatar-ui-design):
- Avatar sizing: 56dp+ for cards/templates (current app uses this)
- Stacked avatars for overflow: "+3 more" pattern for large groups
- Consistent sizing and shape across all member cards
- Status indicators positioned bottom-right if needed

**Birthday countdown display patterns:**

From [birthday reminder app case studies](https://bootcamp.uxdesign.cc/case-study-designing-an-app-to-help-people-remember-important-birthdays-cce2487da68e):
- Show relative time: "in 5 days", "in 2 weeks", "tomorrow"
- Color code urgency: green (30+ days), yellow (7-30 days), red (< 7 days)
- Celebration page accessible directly from countdown

**Sorting algorithm for "closest birthday":**
```
1. Calculate days until next birthday for each member
2. Handle year wrap (December → January birthdays)
3. Sort ascending by days until birthday
4. Past birthdays this year sort to end (next occurrence is 300+ days away)
```

**Dependencies on existing features:**
- Profile photos already implemented
- Birthday data captured during onboarding
- Favorite marking implemented in v1.1
- Celebration pages exist

---

### Anti-Features (Do NOT Build)

| Anti-Feature | Reason |
|--------------|--------|
| In-app payment collection | Out of scope per PROJECT.md; adds legal/compliance complexity; Gift Leader tracks externally |
| Automatic fund distribution | Same as above - not a payments app |
| Public/discoverable groups | Privacy-first for friend groups; invite-only is appropriate |
| Group templates | Premature optimization; let users configure manually |
| Group categories/tags | Adds complexity without clear value for small friend groups |
| Member roles beyond admin | Keep simple: admin vs member is sufficient |
| Budget enforcement/blocking | Budgets are guidelines, not hard limits; don't prevent gift coordination |
| AI budget suggestions | Scope creep per PROJECT.md |
| Group merging | Complex edge cases, unclear user need |
| Nested sub-groups | Overcomplicates simple friend group model |
| Budget carryover between periods | Adds accounting complexity; keep periods independent |
| Detailed spending analytics | This is a coordination app, not a finance app |

---

## Dependencies on Existing Features

| New Feature | Depends On | Integration Notes |
|-------------|------------|-------------------|
| Group photo upload | Avatar storage bucket | Reuse same bucket, similar upload logic |
| Group mode | Celebration system | Conditionally render gift features |
| Group mode | Wishlist display | Hide wishlists in "Greetings only" groups |
| Group mode | Gift Leader | Disable assignment in "Greetings only" |
| Budget tracking | Contribution system | Extend existing contribution_logs table |
| Budget monthly/yearly | Celebration dates | Aggregate by month/year from celebration dates |
| Member card countdown | User birthdays | Calculate from profiles.birthday |
| Favorite preview | Favorite marking | Query user's favorite item in current group |
| Tap card → celebration | Celebration pages | Navigate to existing `/celebration/[id]` |
| Member management | Group membership | Extend existing group_members operations |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Group photo/description | HIGH | Standard patterns, well-documented UX |
| Member cards with countdown | HIGH | Card-based mobile UX is mature; birthday reminder apps demonstrate patterns |
| Group modes (Greetings/Gifts) | MEDIUM | Novel feature; patterns borrowed from optional-gift apps but not exact match |
| Per-gift budget | HIGH | Already exists as contribution tracking |
| Monthly pooled budget | MEDIUM | Adapted from expense-splitting apps; needs UX design for non-pooled funds context |
| Yearly budget scaling | MEDIUM | Corporate gifting platforms use this; consumer implementation less documented |
| Settings organization | HIGH | Android/iOS settings patterns well-established |
| Admin member management | MEDIUM | Standard CRUD but cascading effects need careful handling |

---

## Sources

- [Android Settings Patterns](https://developer.android.com/design/ui/mobile/guides/patterns/settings)
- [Netguru: How to Improve App Settings UX](https://www.netguru.com/blog/how-to-improve-app-settings-ux)
- [SetProduct: Avatar UI Design](https://www.setproduct.com/blog/avatar-ui-design)
- [Mobbin: Avatar UI Design Patterns](https://mobbin.com/glossary/avatar)
- [Birthday Reminder App Case Study](https://bootcamp.uxdesign.cc/case-study-designing-an-app-to-help-people-remember-important-birthdays-cce2487da68e)
- [Splitwise App](https://apps.apple.com/us/app/splitwise/id458023433)
- [Shareroo Budget Tracker](https://apps.apple.com/us/app/shared-budget-planner-shareroo/id1475406336)
- [PayPal Pool Money Feature](https://newsroom.paypal-corp.com/2024-11-14-PayPal-Unveils-Innovative-Money-Pooling-Feature,-Simplifying-Group-Expenses-Between-Family-and-Friends)
- [Givingli Gifts & Greetings](https://givingli.com/)
- [GiftList: Group Gift Coordination](https://giftlist.com/blog/how-to-plan-a-group-gift-step-by-step)
- [Giftster Group Registry](https://play.google.com/store/apps/details?id=com.Giftster.Giftster)

---

*Research completed: 2026-02-04*
