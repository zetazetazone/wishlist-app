# Pitfalls Research: v1.2 Group Experience

**Domain:** Group customization, modes, and budget tracking for gift coordination
**Researched:** 2026-02-04
**Focus:** Adding features to existing system with active users/groups

## Executive Summary

The critical risks for v1.2 center on **mode switching with existing data** (celebrations, contributions, chat history already exist for groups switching to "greetings only" mode), **member removal cascade effects** (Gift Leader assignments, contribution records, and celebrant exclusion logic depend on member relationships), and **RLS policy complexity** when adding mode-based conditional access. The existing system has security-critical celebrant exclusion policies that must be preserved during schema changes.

---

## Critical Pitfalls (Must Address)

### 1. Mode Switching Orphans Existing Celebrations

**Risk:** When a group switches from "Gifts" to "Greetings only" mode, existing celebrations have contributions, chat messages, and Gift Leader assignments that become semantically invalid. Switching back creates confusion about whether old data applies.

**Warning signs:**
- Users see contribution history for a "greetings only" group
- Gift Leader notifications fire for greetings-only groups
- Chat rooms accessible but contextually meaningless
- Auto-celebration cron job creates celebrations with gift_leader_id for greetings groups

**Prevention:**
1. Add `mode` column to `groups` table with CHECK constraint `('gifts', 'greetings_only')`
2. Add `mode_changed_at` timestamp to track when mode last switched
3. For existing celebrations when mode changes to "greetings_only":
   - Soft-archive: Set status to 'archived_mode_change' (new status value)
   - Keep data intact for audit/history
   - Hide from UI via query filter
4. Modify `create_upcoming_celebrations()` function to check group mode
5. Add RLS policy condition: gift-related views check `groups.mode = 'gifts'`

**Phase:** Phase 1 (Group Settings Foundation) - must be schema-first before any UI work

---

### 2. Member Removal Breaks Gift Leader Assignment Chain

**Risk:** When admin removes a member who is the current Gift Leader for upcoming celebrations, those celebrations have dangling `gift_leader_id` references. ON DELETE SET NULL works but leaves celebrations without coordination.

**Warning signs:**
- Celebrations show "No Gift Leader assigned"
- Removal succeeds silently but breaks coordination flow
- Notifications fail for null gift_leader_id
- Birthday rotation algorithm produces unexpected results with smaller member set

**Prevention:**
1. Before member removal, query all celebrations where `gift_leader_id = removed_user_id`
2. For each affected celebration:
   - Auto-reassign Gift Leader using `get_next_gift_leader()` function
   - Record in `gift_leader_history` with reason = 'member_left'
   - Send notification to new Gift Leader
3. Implement as database trigger OR application-level pre-removal check
4. Add UI confirmation: "This member is Gift Leader for X celebrations. They will be reassigned."

**Phase:** Phase 2 (Member Management) - address before implementing member removal UI

---

### 3. Budget Tracking Schema Affects Contribution Semantics

**Risk:** v1.2 introduces multiple budget approaches (per-gift, monthly pooled, yearly). Existing `celebration_contributions` table tracks per-celebration amounts. Schema changes could invalidate historical data interpretation.

**Warning signs:**
- Historical contributions don't match new budget model expectations
- Progress bars/totals miscalculate after budget approach change
- Contribution amounts interpreted incorrectly (per-gift vs pooled)

**Prevention:**
1. Add `budget_approach` column to `groups` table: `('per_gift', 'monthly_pooled', 'yearly')`
2. Add `budget_amount` column to `groups` table (nullable, contextual meaning)
3. Keep existing `celebration_contributions` table unchanged - it works for all approaches
4. Add `budget_approach_at_time` column to contributions (denormalize for historical accuracy)
5. New table for pooled budgets: `group_budget_pools` with month/year tracking
6. Application logic handles display/calculation differently based on approach

**Phase:** Phase 3 (Budget Tracking) - design schema carefully, migrate in stages

---

### 4. Celebrant Exclusion RLS Breaks with Mode Conditions

**Risk:** Existing RLS policies for celebrant exclusion (chat_rooms, chat_messages, celebration_contributions) use JOINs through celebrations. Adding mode-based conditions could create policy evaluation performance issues or break exclusion logic.

**Warning signs:**
- Celebrant can suddenly see their celebration chat (security breach)
- Query performance degrades on chat/contribution fetches
- RLS policy evaluation timeout errors
- Policy conflicts between mode check and celebrant exclusion

**Prevention:**
1. Test all existing celebrant exclusion policies after adding `mode` column
2. Keep celebrant exclusion logic SEPARATE from mode logic:
   ```sql
   -- GOOD: Layered conditions
   AND c.celebrant_id != auth.uid()  -- Always enforced
   AND g.mode = 'gifts'               -- Additional filter

   -- BAD: Combined in ways that could short-circuit
   ```
3. Add index on `groups.mode` for RLS policy performance
4. Create integration tests: "Celebrant in gifts-mode group cannot see chat"
5. Review RLS evaluation order - celebrant check must not be bypassed

**Phase:** Phase 1 (Group Settings Foundation) - validate immediately after schema change

---

## Moderate Pitfalls (Should Address)

### 5. Group Photo Storage Path Conflicts

**Risk:** Existing `avatars` bucket uses `{user_id}/{filename}` path structure. Group photos need different organization. Mixing patterns or reusing bucket creates permission confusion.

**Warning signs:**
- RLS policies grant unintended cross-access
- Storage path collisions possible
- Group photo deletion affects user avatars
- Permission checks reference wrong owner context

**Prevention:**
1. Create separate `group-photos` bucket (not nested in `avatars`)
2. Path structure: `{group_id}/{filename}` (mirrors user avatar pattern)
3. RLS policy: Group admins can upload/update/delete for their groups
4. Public read access (like avatars) for simplicity
5. Migration-safe: No changes to existing avatars bucket

**Phase:** Phase 1 (Group Settings Foundation) - set up storage before group edit UI

---

### 6. Birthday Sorting Performance at Scale

**Risk:** v1.2 requires member cards sorted by "closest upcoming birthday". For groups with many members, calculating days-until-birthday for each member on every render causes performance issues.

**Warning signs:**
- Group view slow to load for large groups (20+ members)
- Scroll jank when reordering occurs
- Excessive recalculations on timezone changes
- FlashList not receiving stable keys after sort

**Prevention:**
1. Compute `days_until_birthday` server-side or in database view
2. Add computed column or materialized view for birthday sort order
3. Cache sort order client-side, invalidate on member changes
4. Use FlashList (already in project) with proper `keyExtractor`
5. Avoid recalculating on every render - memoize sort result
6. Consider: Birthday order only changes at midnight - schedule refresh

**Phase:** Phase 4 (Group View Enhancement) - implement performant sort algorithm

---

### 7. Admin Role Changes Create Permission Gaps

**Risk:** When demoting an admin to member (or vice versa), RLS policies immediately change what they can access. User might be mid-action (editing group, removing member) when permissions change.

**Warning signs:**
- "Permission denied" errors mid-operation
- UI shows edit buttons that fail on submit
- Race condition between role check and action execution
- Admin demotes self, loses ability to undo

**Prevention:**
1. Prevent admin from demoting themselves if they're the last admin
2. Add database constraint: Each group must have at least one admin
3. UI optimistic updates should revalidate permissions before submit
4. Add `role_changed_at` timestamp for audit trail
5. Consider: Role changes take effect on next session/refresh (not immediate)

**Phase:** Phase 2 (Member Management) - implement with admin role change feature

---

### 8. Favorite Item Preview Stale After Item Deletion

**Risk:** Member cards show "favorite item preview". If that item is deleted/archived, preview shows stale data or crashes. Group favorites table references `wishlist_items` which can be deleted.

**Warning signs:**
- Member card shows deleted item details
- NULL reference errors in favorite preview component
- Inconsistent state between favorites table and items table
- ON DELETE CASCADE removes favorite silently (existing behavior)

**Prevention:**
1. Existing schema has `ON DELETE CASCADE` on `group_favorites.item_id` - favorite record deleted when item deleted
2. Query for member cards must LEFT JOIN favorites and handle NULL gracefully
3. UI component must render "No favorite set" when item_id is NULL
4. Consider: Auto-promote next-highest-priority item to favorite (matches v1.1 pattern)
5. Add index: `idx_group_favorites_item` (already exists per migration)

**Phase:** Phase 4 (Group View Enhancement) - handle gracefully in member card component

---

## Minor Pitfalls (Nice to Address)

### 9. Invite Code Exposure During Group Creation

**Risk:** Group ID is used as invite code (visible in current code). During group creation flow, ID exists before photo/settings are complete. Early invite could show incomplete group state.

**Warning signs:**
- Invite recipients see group without photo/description
- Group mode not set when first members join
- Budget approach undefined at join time

**Prevention:**
1. Complete all group setup (including photo upload) before showing invite option
2. Alternatively: Add `setup_complete` boolean, hide invite UI until true
3. Consider: Separate invite codes from group IDs for better security (future)

**Phase:** Phase 1 (Group Settings Foundation) - minor UX consideration

---

### 10. Mode Change Notification Gap

**Risk:** When admin changes group mode, members aren't notified. They may expect gift coordination but group is now "greetings only" (or vice versa).

**Warning signs:**
- Members confused about group's current purpose
- Gift Leader continues coordinating in greetings-only group
- Users add contributions to archived celebrations

**Prevention:**
1. Send notification to all group members on mode change
2. Notification content: "Group X changed to [mode]. [Explanation]"
3. In-app banner on group view after mode change (dismissible)
4. Consider: Require confirmation from admins before mode change

**Phase:** Phase 5 (Integration & Polish) - notification enhancement

---

## Integration-Specific Pitfalls

These pitfalls are specific to adding v1.2 features to the existing v1.0/v1.1 system:

### 11. Auto-Celebration Cron Ignores Group Mode

**Existing behavior:** `create_upcoming_celebrations()` runs daily and creates celebrations for all groups with birthdays in the planning window.

**Problem:** After v1.2, this function must respect group mode. Greetings-only groups should not get celebrations with Gift Leaders and chat rooms.

**Fix:**
```sql
-- Modify function to check group mode
FOR v_group IN
  SELECT gm.group_id, g.mode
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.user_id = v_user.user_id
    AND g.mode = 'gifts'  -- Only create celebrations for gift-mode groups
LOOP
```

**Phase:** Phase 1 (Group Settings Foundation) - update function after adding mode column

---

### 12. Existing Groups Need Default Mode Assignment

**Problem:** Adding `mode` column to `groups` table. Existing groups have no mode value. Migration must set sensible default.

**Prevention:**
1. Add column with DEFAULT 'gifts' (existing behavior preserved)
2. Migration: `ALTER TABLE groups ADD COLUMN mode TEXT DEFAULT 'gifts' CHECK (mode IN ('gifts', 'greetings_only'))`
3. Do NOT make column NOT NULL initially - allows phased rollout
4. Backfill all existing groups to 'gifts' mode
5. Then add NOT NULL constraint

**Phase:** Phase 1 (Group Settings Foundation) - careful migration order

---

### 13. Gift Leader Rotation Algorithm Unaware of Mode

**Existing behavior:** `get_next_gift_leader()` function calculates leader for any group.

**Problem:** Function is called by auto-celebration cron. After v1.2, calling it for greetings-only groups is wasteful (returns leader that won't be used).

**Prevention:**
1. Add mode check in `create_upcoming_celebrations()` BEFORE calling `get_next_gift_leader()`
2. Alternatively: `get_next_gift_leader()` returns NULL for greetings-only groups
3. Celebrations for greetings-only groups have NULL `gift_leader_id` (acceptable)

**Phase:** Phase 1 (Group Settings Foundation) - update cron function

---

### 14. Notification Templates Need Mode Context

**Existing behavior:** Notifications reference "Gift Leader" and "celebration coordination".

**Problem:** These terms don't make sense for greetings-only groups.

**Prevention:**
1. Add mode-aware notification templates
2. "Gifts" mode: "You're the Gift Leader for X's birthday!"
3. "Greetings only" mode: "X's birthday is coming up!" (no leader mention)
4. Update Edge Function and notification queries to include group mode

**Phase:** Phase 5 (Integration & Polish) - notification template updates

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Mode switching data handling | HIGH | Schema patterns verified, clear migration path |
| Member removal cascades | HIGH | PostgreSQL cascade behavior well-documented; existing schema uses ON DELETE SET NULL/CASCADE |
| Budget tracking schema | MEDIUM | Multiple valid approaches; need to validate against existing contribution patterns |
| RLS policy preservation | HIGH | Verified existing celebrant exclusion policies; clear testing strategy |
| Storage bucket organization | HIGH | Existing avatar pattern provides template; Supabase docs confirm approach |
| Birthday sorting performance | MEDIUM | FlashList already in use; specific calculation approach needs validation |
| Admin role transitions | MEDIUM | Edge cases identified; specific UI flow not yet designed |

## Sources

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase Cascade Deletes](https://supabase.com/docs/guides/database/postgres/cascade-deletes)
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [React Native File Upload with Supabase](https://supabase.com/blog/react-native-storage)
- [FlashList Performance Guide](https://shopify.github.io/flash-list/)
- [Feature Toggles and Database Migrations](https://www.thoughtworks.com/en-us/insights/blog/continuous-delivery/feature-toggles-and-database-migrations-part-3)
- Existing codebase analysis: migrations, lib/celebrations.ts, lib/contributions.ts, lib/storage.ts

---
*Research completed: 2026-02-04*
