# Project Research Summary

**Project:** Wishlist App v1.2 Group Experience
**Domain:** Group customization, modes, and budget tracking (React Native + Supabase)
**Researched:** 2026-02-04
**Confidence:** HIGH (Stack, Architecture), MEDIUM (Group modes, Budget approaches)

## Executive Summary

The v1.2 Group Experience features integrate cleanly into the existing React Native + Supabase stack **without requiring new dependencies**. The core technical approach is proven: schema additions to the existing `groups` table, reusing the avatar storage pattern for group photos, and leveraging existing UI components (Gluestack Radio, Switch) for mode/budget selection. The architecture is straightforward—member cards with birthday sorting and favorite previews require a single optimized query joining existing tables.

However, the **critical risk** lies in mode switching with existing data. Groups already have celebrations, contributions, and chat history. Switching from "Gifts" to "Greetings only" mode must handle data migration carefully through soft-archiving existing celebrations and updating the auto-celebration cron job to respect group modes. The Gift Leader rotation algorithm and RLS policies (particularly celebrant exclusion) must be validated to ensure no security regressions occur.

The recommended phased approach prioritizes schema foundation and data migration first (Phase 1), followed by user-facing features (Phases 2-4), with budget pooling complexity deferred. Starting with per-gift budget (already implemented) and showing monthly/yearly as "coming soon" reduces scope while proving the feature framework.

## Key Findings

### Recommended Stack

**No new dependencies required.** All v1.2 capabilities are covered by existing tools:

| Capability | Solution | Status |
|------------|----------|--------|
| Group photo upload | `expo-image-picker@17.0.10` + Supabase Storage | Reuse avatar pattern |
| Mode selection UI | `@gluestack-ui/themed` Radio/RadioGroup | Already installed |
| Budget input forms | `@gluestack-ui/themed` Input/FormControl | Already installed |
| Budget calculations | PostgreSQL aggregations | Native capability |
| Member card lists | `@shopify/flash-list@2.2.1` | Already installed |

**Optional consideration:** `base64-arraybuffer@^1.0.2` for iOS image upload reliability, but current ArrayBuffer pattern in `lib/storage.ts` already works. Add only if iOS group photo uploads fail.

**Rejected alternatives:** `react-hook-form`, `yup/zod` (form validation overkill), `dinero.js` (no multi-currency needs), state management libraries (current pattern sufficient).

### Expected Features

**Table Stakes (must-have):**
- Group identity: name, description, photo at creation
- Member cards with avatars, birthday countdown, favorite item preview
- Sorted by closest upcoming birthday
- Clear group mode indicator (Greetings vs Gifts)
- Budget approach selection (per-gift, monthly pooled, yearly)
- Admin settings: edit details, manage members, change mode/budget

**Differentiators (unique value):**
- "Greetings only" mode hides wishlists, Gift Leader, contribution tracking
- Monthly pooled budget: all birthdays in a month share one pool
- Yearly budget with optional member scaling (e.g., "€10/member/birthday")
- Budget progress indicators and alerts at 80% spent
- Mode-specific celebration UI (greetings-focused vs gift coordination)

**Anti-features (do NOT build):**
- In-app payment collection (legal/compliance complexity)
- Automatic fund distribution (not a payments app)
- Public/discoverable groups (privacy-first design)
- Budget enforcement/blocking (budgets are guidelines)
- AI budget suggestions (scope creep)
- Detailed spending analytics (coordination app, not finance app)

**Dependencies on existing features:**
- Group photo storage reuses avatar bucket pattern
- Member birthday countdown uses existing profile data
- Favorite item preview queries v1.1 favorite marking
- Celebration system adapts to mode (conditional rendering)

### Architecture Approach

**Schema changes (additive only):**

```sql
ALTER TABLE groups
  ADD COLUMN description TEXT,
  ADD COLUMN photo_url TEXT,
  ADD COLUMN mode TEXT CHECK (mode IN ('greetings_only', 'gifts')) DEFAULT 'gifts',
  ADD COLUMN budget_approach TEXT CHECK (budget_approach IN ('per_gift', 'monthly_pooled', 'yearly')) DEFAULT 'per_gift';
```

**No new tables required.** Existing schema supports all features:
- `group_favorites` already tracks favorites
- `celebration_contributions` tracks budget usage
- `users.birthday` provides birthday data

**Key query pattern for member cards:**

```typescript
// Single optimized query with joins
supabase
  .from('group_members')
  .select(`
    role,
    users!inner (id, full_name, avatar_url, birthday),
    group_favorites!inner (
      item_id,
      wishlist_items!inner (id, title, image_url)
    )
  `)
  .eq('group_id', groupId)
```

Client-side birthday sorting for "closest upcoming" order (calculate days until next birthday occurrence).

**Storage pattern:** Reuse `avatars` bucket with path `groups/{groupId}/{timestamp}.{ext}`. RLS policy: group admins can upload/update for their groups.

**Component structure:**
- New: `GroupHeader`, `GroupMemberCard`, `GroupPhotoUploader`, `GroupModeSelector`, `BudgetApproachSelector`, `GroupSettingsSheet`
- Modified: `CreateGroupModal` (add photo/mode/budget fields), `app/group/[id].tsx` (new group view)
- Reused: `lib/storage.ts` (extend for group photos), existing favorites/birthday utilities

**Build order rationale:**
1. Schema migration (all features depend on columns existing)
2. Group photo storage (standalone, needed for create/edit)
3. Create group flow (new groups can use all v1.2 features)
4. Group view with member cards (main user-facing feature)
5. Admin settings (less critical for MVP, can iterate)

### Critical Pitfalls

**1. Mode Switching Orphans Existing Celebrations**
- **Risk:** Groups switching from "Gifts" to "Greetings only" have existing celebrations with contributions, Gift Leaders, chat history that become invalid
- **Prevention:**
  - Soft-archive existing celebrations (new status `archived_mode_change`)
  - Update `create_upcoming_celebrations()` cron to check group mode
  - Add confirmation dialog warning data implications
- **Phase:** Phase 1 (must be schema-first)

**2. Member Removal Breaks Gift Leader Assignment Chain**
- **Risk:** Removing member who is current Gift Leader leaves celebrations without coordination
- **Prevention:**
  - Query celebrations where removed user is Gift Leader
  - Auto-reassign using `get_next_gift_leader()` function
  - Add UI confirmation: "This member is Gift Leader for X celebrations"
- **Phase:** Phase 2 (before member removal UI)

**3. Budget Tracking Schema Affects Contribution Semantics**
- **Risk:** Multiple budget approaches (per-gift, pooled, yearly) could invalidate historical contribution data interpretation
- **Prevention:**
  - Keep `celebration_contributions` table unchanged (works for all approaches)
  - Add `budget_approach` to groups table
  - Application logic handles display/calculation per approach
  - Consider `budget_approach_at_time` denormalization for historical accuracy
- **Phase:** Phase 3 (design carefully, migrate in stages)

**4. Celebrant Exclusion RLS Breaks with Mode Conditions**
- **Risk:** Existing celebrant exclusion policies (prevent celebrant seeing their chat/contributions) could conflict with mode-based RLS conditions
- **Prevention:**
  - Test all existing celebrant policies after adding `mode` column
  - Layer conditions (celebrant exclusion AND mode check, don't combine in ways that short-circuit)
  - Add index on `groups.mode` for RLS performance
  - Create integration test: "Celebrant in gifts-mode group cannot see chat"
- **Phase:** Phase 1 (validate immediately after schema change)

**5. Auto-Celebration Cron Ignores Group Mode**
- **Risk:** Daily cron creates celebrations for all groups, including greetings-only groups that shouldn't have Gift Leaders
- **Prevention:**
  - Modify `create_upcoming_celebrations()` to check `groups.mode = 'gifts'`
  - Gift Leader rotation only for gifts-mode groups
  - Greetings-only groups get celebrations with NULL gift_leader_id
- **Phase:** Phase 1 (update function after adding mode column)

## Implications for Roadmap

### Recommended Phase Structure

**Phase 1: Schema Foundation & Data Migration (Days 1-2)**
- Schema migration: add `description`, `photo_url`, `mode`, `budget_approach` columns
- Update TypeScript types (`database.types.ts`)
- Modify `create_upcoming_celebrations()` cron to respect mode
- Validate RLS policies (celebrant exclusion still works)
- Backfill existing groups with default mode='gifts'
- **Delivers:** Foundation for all v1.2 features, no user-facing changes yet
- **Pitfalls avoided:** #1 (mode switching), #4 (RLS), #5 (auto-celebration), #11 (cron), #12 (default mode)

**Phase 2: Group Photo & Creation Flow (Days 2-4)**
- Implement group photo upload (`lib/storage.ts` extension)
- Create `GroupPhotoUploader`, `GroupModeSelector`, `BudgetApproachSelector` components
- Enhance `CreateGroupModal` with new fields
- Update `createGroup()` service
- **Delivers:** New groups can set photo, mode, budget approach at creation
- **Pitfalls avoided:** #5 (storage paths), #9 (incomplete group state)

**Phase 3: Group View with Member Cards (Days 4-6)**
- Implement optimized member query with favorites
- Create `GroupHeader` and `GroupMemberCard` components
- Implement client-side birthday sorting
- Update `app/group/[id].tsx` with new view
- **Delivers:** Main user-facing feature, visual group identity
- **Pitfalls avoided:** #6 (birthday sort performance), #8 (favorite preview stale data)

**Phase 4: Admin Settings & Member Management (Days 6-8)**
- Create `GroupSettingsSheet` (edit name/description/photo/mode/budget)
- Create `MemberManagementSheet` (remove member, change role)
- Implement Gift Leader reassignment logic on member removal
- Update `updateGroup()` service
- **Delivers:** Admin controls for group customization
- **Pitfalls avoided:** #2 (Gift Leader chain), #7 (admin role gaps), #10 (mode change notification)

**Phase 5: Mode Integration & Polish (Days 8-9)**
- Conditional rendering in celebration pages (hide gift features in greetings-only mode)
- Update notification templates to be mode-aware
- Add mode change confirmation dialogs
- Integration testing (celebrant exclusion, Gift Leader assignment, budget display)
- **Delivers:** Complete mode system with all integrations
- **Pitfalls avoided:** #13 (Gift Leader rotation), #14 (notification templates)

**Phase 6: Budget Pooling (Deferred to v1.3)**
- Monthly/yearly budget UI and logic (complex)
- Budget progress indicators and alerts
- Per-celebration budget allocation
- **Rationale:** Per-gift budget already works. Prove the feature framework first, then add complexity.

### Phase Ordering Rationale

**Schema-first approach:** All phases depend on database columns existing. Attempting UI work without schema creates rework and blocks parallel development.

**Storage before creation:** Group photo upload is standalone and needed by both create/edit flows. Building it second enables creation flow to be complete.

**View before settings:** The group view is the primary user-facing feature and provides immediate value. Admin settings are lower frequency and can iterate based on view feedback.

**Member management separate from view:** Removing members has complex cascade effects (Gift Leader reassignment). Building this after the view is stable prevents scope creep in the main feature.

**Mode integration last:** This touches multiple areas (celebrations, notifications, chat). Building after schema, view, and settings are stable ensures all integration points are known.

**Budget pooling deferred:** Monthly/yearly budgets add significant complexity (pool tracking, allocation logic, period boundaries). Ship with per-gift only (already functional) to prove the architecture, then add pooling in a focused v1.3 release.

### Research Flags

**Needs deeper research during planning:**
- **Phase 3 (Group View):** Birthday sorting algorithm edge cases (same-day birthdays, missing birthdays, timezone handling)
- **Phase 4 (Admin Settings):** Member removal cascade effects (verify all database triggers and application-level cleanup)
- **Phase 5 (Mode Integration):** Complete audit of mode-conditional rendering across codebase

**Standard patterns (skip research):**
- **Phase 1 (Schema):** Additive column migrations are straightforward
- **Phase 2 (Creation):** Group photo upload follows proven avatar pattern exactly
- **Phase 3 (Group View):** Card-based mobile UX is well-established
- **Phase 4 (Admin Settings):** Settings sheet patterns documented in Android/iOS guidelines

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (no new dependencies) | HIGH | Verified existing packages cover all requirements |
| Schema changes (additive columns) | HIGH | Follows standard PostgreSQL patterns, no complex migrations |
| Storage integration (group photos) | HIGH | Reuses proven avatar pattern exactly |
| Create/Edit flows | HIGH | Extends existing modal pattern with new fields |
| Member card query optimization | HIGH | Standard Supabase joins, tested pattern |
| Birthday sorting algorithm | HIGH | Client-side calculation, well-understood |
| Group modes (novel feature) | MEDIUM | Patterns borrowed from optional-gift apps but not exact match |
| Mode switching data migration | MEDIUM | Clear prevention strategies, but requires careful testing with existing data |
| Monthly pooled budget | MEDIUM | Adapted from expense-splitting apps, UX needs design for non-pooled funds context |
| Yearly budget scaling | MEDIUM | Corporate gifting uses this, consumer implementation less documented |
| RLS policy preservation | HIGH | Clear testing strategy, existing policies well-documented |
| Member removal cascades | MEDIUM | PostgreSQL cascade behavior verified, but application-level reassignment logic needs validation |

### Gaps to Address During Planning

1. **Birthday sorting edge cases:** Define behavior for members without birthdays, same-day birthdays, past birthdays in current year
2. **Mode switching confirmation UX:** Design dialog flow and warning messaging for switching from Gifts → Greetings only
3. **Budget pooling UI/UX:** If implementing monthly/yearly budgets, design progress indicators and allocation interfaces (defer to v1.3)
4. **Member removal confirmation:** Design dialog showing impact (Gift Leader reassignments, celebration count)
5. **Notification template variations:** Audit all notification types and create mode-specific templates
6. **Integration testing scenarios:** Define test cases for celebrant exclusion + mode conditions, Gift Leader reassignment cascades, budget calculation accuracy

## Sources

### Stack Research
- [Supabase React Native Storage Blog](https://supabase.com/blog/react-native-storage)
- [Expo Image Picker Documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Gluestack UI Radio Component](https://gluestack.io/ui/docs/components/radio)
- [Gluestack UI Switch Component](https://gluestack.io/ui/docs/components/switch)
- [PostgREST Aggregate Functions](https://supabase.com/blog/postgrest-aggregate-functions)

### Features Research
- [Android Settings Patterns](https://developer.android.com/design/ui/mobile/guides/patterns/settings)
- [Netguru: How to Improve App Settings UX](https://www.netguru.com/blog/how-to-improve-app-settings-ux)
- [SetProduct: Avatar UI Design](https://www.setproduct.com/blog/avatar-ui-design)
- [Mobbin: Avatar UI Design Patterns](https://mobbin.com/glossary/avatar)
- [Birthday Reminder App Case Study](https://bootcamp.uxdesign.cc/case-study-designing-an-app-to-help-people-remember-important-birthdays-cce2487da68e)
- [Splitwise App](https://apps.apple.com/us/app/splitwise/id458023433)
- [Givingli Gifts & Greetings](https://givingli.com/)

### Architecture & Pitfalls Research
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase Cascade Deletes](https://supabase.com/docs/guides/database/postgres/cascade-deletes)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [FlashList Performance Guide](https://shopify.github.io/flash-list/)
- [Feature Toggles and Database Migrations](https://www.thoughtworks.com/en-us/insights/blog/continuous-delivery/feature-toggles-and-database-migrations-part-3)
- Existing codebase analysis (migrations, lib/celebrations.ts, lib/storage.ts)

---

*Research completed: 2026-02-04*
*Ready for roadmap: yes*
