# Phase 15: Group Settings - Research

**Researched:** 2026-02-04
**Domain:** React Native settings UI + Supabase RLS policies for admin operations + member management
**Confidence:** HIGH

## Summary

This phase implements a comprehensive group settings system that allows admin editing of group properties (name, description, photo), member management (remove members, transfer admin role), invite code management, and the ability for non-admin members to leave. Research focused on three domains: (1) existing codebase patterns for settings screens, storage, and group operations, (2) Supabase RLS policy patterns for admin-to-member operations, and (3) invite code management.

The codebase already has strong foundations: the `groups` table schema is complete (name, description, photo_url, mode, budget fields all exist from Phase 11/12), group photo upload utilities exist in `lib/storage.ts`, and profile editing patterns exist in `app/(app)/settings/profile.tsx`. The primary gaps are: (a) missing RLS policies for admin-deleting-other-members and admin-updating-member-roles, (b) no invite code system (currently using raw group UUIDs as invite codes), and (c) no group settings screen or member management UI.

Critical complexity lives in member removal: when a removed member is currently assigned as Gift Leader for active celebrations, the system must reassign that role before removal. The `gift_leader_history` table already supports a `member_left` reason, confirming this was anticipated in the schema design.

**Primary recommendation:** Build a settings screen accessible via gear icon on GroupViewHeader, route as `app/group/[id]/settings.tsx`, with sections for group info editing (admin-only), member list with admin actions, invite code management, and leave/danger zone. Add an `invite_code` column to the groups table and create new RLS policies for admin member management.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.93.3 | Database operations and RLS | Already in project, handles all DB operations |
| expo-router | ~6.0.23 | Navigation and routing | Already in project, file-based routing |
| expo-image-picker | ~17.0.10 | Photo selection | Already in project, used for group photos |
| expo-image-manipulator | ~14.0.8 | Photo compression | Already in project, compresses to 800px/0.8 quality |
| expo-clipboard | (to install) | Copy invite code to clipboard | Standard Expo module for clipboard operations |
| react-native Share API | built-in | Share invite code | Already used in group detail screen |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @expo/vector-icons (MaterialCommunityIcons) | ^15.0.3 | Icons for settings items | Already in project, used throughout |
| moti | ^0.30.0 | Subtle animations | Already in project for entrance animations |
| expo-linear-gradient | ~15.0.8 | Header gradients | Already in project for group headers |
| @gluestack-ui/themed | ^1.1.73 | UI components (Avatar, etc.) | Already in project for GroupAvatar, profile |
| react-native-gesture-handler | ~2.28.0 | Swipe-to-delete on member rows | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-clipboard | @react-native-clipboard/clipboard | expo-clipboard is native to the Expo ecosystem, async API, simpler install |
| Custom invite code generation | pg_hashids Supabase extension | pg_hashids adds DB extension dependency; simple random code generation in SQL is sufficient for this use case |

**Installation:**
```bash
npx expo install expo-clipboard
```

## Architecture Patterns

### Recommended Project Structure
```
app/
  group/
    [id].tsx                    # Existing group detail screen
    [id]/
      settings.tsx              # NEW: Group settings screen
utils/
  groups.ts                     # Extend with settings operations
lib/
  storage.ts                    # Already has uploadGroupPhotoFromUri
components/
  groups/
    GroupViewHeader.tsx          # Add settings gear icon
    GroupSettingsHeader.tsx      # NEW: Settings header with group info editing
    MemberListItem.tsx          # NEW: Member row with admin actions
    InviteCodeSection.tsx       # NEW: Invite code display/copy/share/regenerate
    DangerZoneSection.tsx       # NEW: Leave group / destructive actions
supabase/
  migrations/
    2026XXXXXXXX_group_settings_rls.sql  # NEW: RLS policies for admin operations
```

### Pattern 1: Settings Screen as Nested Route
**What:** Place the group settings screen at `app/group/[id]/settings.tsx` so it inherits the group ID from the route parameter.
**When to use:** When settings are contextual to a specific entity (group).
**Example:**
```typescript
// app/group/[id]/settings.tsx
import { useLocalSearchParams } from 'expo-router';

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // id is the group ID from the URL
}
```

### Pattern 2: Conditional Rendering Based on Admin Role
**What:** Fetch the current user's role in the group and conditionally render admin-only sections.
**When to use:** Settings screens where different roles see different options.
**Example:**
```typescript
// Source: Codebase pattern from lib/celebrations.ts
const { data: membership } = await supabase
  .from('group_members')
  .select('role')
  .eq('group_id', groupId)
  .eq('user_id', user.id)
  .single();

const isAdmin = membership?.role === 'admin';
```

### Pattern 3: Optimistic Update with Rollback
**What:** Show the updated UI state immediately, revert if the server operation fails.
**When to use:** For name/description edits where latency feels bad.
**Example:**
```typescript
const handleSave = async () => {
  const previousName = groupName;
  setGroupName(newName); // Optimistic

  const { error } = await supabase
    .from('groups')
    .update({ name: newName })
    .eq('id', groupId);

  if (error) {
    setGroupName(previousName); // Rollback
    Alert.alert('Error', 'Failed to update group name');
  }
};
```

### Pattern 4: Confirmation Dialog for Destructive Actions
**What:** Use Alert.alert with confirmation for remove member, leave group, and admin transfer.
**When to use:** Any action that cannot be easily undone.
**Example:**
```typescript
// Source: Codebase pattern from existing Alert usage
const handleRemoveMember = (member: GroupMember) => {
  Alert.alert(
    'Remove Member',
    `Are you sure you want to remove ${member.full_name} from the group?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMember(member.user_id) },
    ]
  );
};
```

### Anti-Patterns to Avoid
- **Allowing admin to remove themselves:** Admin must transfer admin role first before leaving. If admin is the only member, they should be able to delete the group instead.
- **Deleting member without Gift Leader check:** Always check if the member being removed is a Gift Leader for any active celebrations. Reassign before deletion.
- **Using group UUID as invite code long-term:** UUIDs are 36 characters and expose internal identifiers. Use a short, human-readable code stored in a separate column.
- **Skipping RLS policy validation:** Every admin operation must be verified at the database level via RLS, not just in application code.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Clipboard copy | Custom clipboard bridge | `expo-clipboard` (`Clipboard.setStringAsync()`) | Cross-platform compatibility, Expo ecosystem integration |
| Share invite code | Custom share sheet | React Native `Share.share()` | Already used in group detail screen, native sharing UI |
| Image picking + compression | Custom camera/gallery flow | `expo-image-picker` + `expo-image-manipulator` | Already have `uploadGroupPhotoFromUri()` in `lib/storage.ts` |
| Member role check | Custom auth middleware | Supabase RLS policies + `is_group_member()` function | Database-level enforcement, already have the helper function |
| Invite code generation | Complex hashing/encoding | Simple `Math.random().toString(36)` + DB uniqueness constraint | Already have `generateInviteCode()` function in `utils/groups.ts` (unused) |

**Key insight:** The codebase already has most utility functions needed -- `uploadGroupPhotoFromUri`, `getGroupPhotoUrl`, `updateGroup`, `leaveGroup`, and `generateInviteCode` (unused). The main work is building UI screens, extending utility functions, and adding new RLS policies.

## Common Pitfalls

### Pitfall 1: Gift Leader Orphaning on Member Removal
**What goes wrong:** Removing a member who is the current Gift Leader for active/upcoming celebrations leaves those celebrations without coordination.
**Why it happens:** The `celebrations.gift_leader_id` references `users(id) ON DELETE SET NULL` -- so the FK is set to NULL but no new leader is assigned.
**How to avoid:** Before deleting the group_members row, query `celebrations` for any rows where `gift_leader_id = removedUserId AND group_id = groupId AND status IN ('upcoming', 'active')`. For each, reassign using `getNextGiftLeader()` and log to `gift_leader_history` with reason `'member_left'`.
**Warning signs:** Gift Leader showing as "Unknown" or null in celebration views after member removal.

### Pitfall 2: Admin Removing Themselves
**What goes wrong:** If the admin removes themselves, the group has no admin and becomes unmanageable.
**Why it happens:** The DELETE RLS policy does not enforce "at least one admin" constraint.
**How to avoid:** In application logic: (a) Admin cannot appear in the "remove member" list for themselves. (b) Admin must transfer admin role before they can leave the group. (c) If admin is the sole member, offer "Delete Group" instead of "Leave Group".
**Warning signs:** Groups with zero admins in the database.

### Pitfall 3: Race Condition in Admin Transfer
**What goes wrong:** Two operations (demote old admin, promote new admin) are not atomic, leaving a window where the group has zero or two admins.
**Why it happens:** Two separate UPDATE statements on `group_members.role`.
**How to avoid:** Use a single Supabase RPC function (database function) that performs both operations in a single transaction, or perform them sequentially and verify state afterward.
**Warning signs:** Briefly seeing two admins or zero admins in the UI.

### Pitfall 4: RLS Policy Recursion on group_members
**What goes wrong:** RLS policies on `group_members` that query `group_members` cause infinite recursion.
**Why it happens:** This was already encountered and solved in migration `20260202000003` using `SECURITY DEFINER` function `is_group_member()`.
**How to avoid:** All new RLS policies on `group_members` should use the `is_group_member()` function or reference a different table (like checking admin status via a separate function).
**Warning signs:** "stack depth limit exceeded" PostgreSQL errors.

### Pitfall 5: Invite Code Collisions
**What goes wrong:** Two groups get the same randomly generated invite code.
**Why it happens:** Random 6-character codes have a limited namespace (~2.17 billion combinations for alphanumeric).
**How to avoid:** Add a UNIQUE constraint on the `invite_code` column and retry with a new code if the insert fails with a uniqueness violation (error code 23505).
**Warning signs:** Users joining the wrong group after entering an invite code.

### Pitfall 6: Stale UI After Member Removal
**What goes wrong:** The removed member sees the group in their group list until they refresh, or the admin still sees the removed member in the member list.
**Why it happens:** No optimistic update or callback to refresh data after the operation.
**How to avoid:** After successful removal API call, immediately update local state (remove from members array). For the removed user's perspective, they will see an RLS-blocked empty result on next fetch.
**Warning signs:** Ghost members appearing in the UI after removal.

## Code Examples

Verified patterns from the existing codebase:

### Admin Delete RLS Policy for group_members
```sql
-- Source: Pattern derived from existing codebase RLS + Supabase docs
-- IMPORTANT: Must use SECURITY DEFINER function to avoid recursion

-- First, create an admin check function
CREATE OR REPLACE FUNCTION public.is_group_admin(check_group_id UUID, check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = check_group_id
      AND user_id = check_user_id
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Then update the DELETE policy to allow both self-leave and admin-remove
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

CREATE POLICY "Users can leave or be removed from groups"
  ON public.group_members FOR DELETE
  USING (
    -- Users can remove themselves (leave)
    auth.uid() = user_id
    OR
    -- Admins can remove other members
    public.is_group_admin(group_id, auth.uid())
  );
```

### Admin Transfer via Database Function
```sql
-- Source: Supabase pattern for atomic role swap
CREATE OR REPLACE FUNCTION public.transfer_admin_role(
  p_group_id UUID,
  p_new_admin_id UUID
) RETURNS VOID AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
BEGIN
  -- Verify caller is current admin
  IF NOT public.is_group_admin(p_group_id, v_current_user_id) THEN
    RAISE EXCEPTION 'Only the current admin can transfer the admin role';
  END IF;

  -- Verify new admin is a member
  IF NOT public.is_group_member(p_group_id, p_new_admin_id) THEN
    RAISE EXCEPTION 'New admin must be a group member';
  END IF;

  -- Demote current admin to member
  UPDATE public.group_members
  SET role = 'member'
  WHERE group_id = p_group_id AND user_id = v_current_user_id;

  -- Promote new admin
  UPDATE public.group_members
  SET role = 'admin'
  WHERE group_id = p_group_id AND user_id = p_new_admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Update group_members Role (RLS Policy)
```sql
-- Source: Needed for admin transfer
-- Admin can update member roles in their groups
CREATE POLICY "Admins can update member roles"
  ON public.group_members FOR UPDATE
  USING (
    public.is_group_admin(group_id, auth.uid())
  )
  WITH CHECK (
    public.is_group_admin(group_id, auth.uid())
  );
```

### Add invite_code Column to Groups
```sql
-- Source: Codebase pattern from v1.2 groups schema
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Backfill existing groups with generated codes
UPDATE public.groups
SET invite_code = UPPER(SUBSTRING(md5(random()::text || id::text) FROM 1 FOR 6))
WHERE invite_code IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.groups
ALTER COLUMN invite_code SET NOT NULL;

-- Add default for new groups
ALTER TABLE public.groups
ALTER COLUMN invite_code SET DEFAULT UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
```

### Gift Leader Reassignment on Member Removal
```typescript
// Source: Derived from lib/celebrations.ts reassignGiftLeader pattern
async function handleMemberRemovalWithGiftLeader(
  groupId: string,
  removedUserId: string
): Promise<void> {
  // Find all celebrations where removed user is gift leader
  const { data: celebrations } = await supabase
    .from('celebrations')
    .select('id, celebrant_id')
    .eq('group_id', groupId)
    .eq('gift_leader_id', removedUserId)
    .in('status', ['upcoming', 'active']);

  if (celebrations && celebrations.length > 0) {
    for (const celebration of celebrations) {
      // Get new gift leader (excluding the removed user)
      const newLeaderId = await getNextGiftLeader(groupId, celebration.celebrant_id);

      // Update celebration
      await supabase
        .from('celebrations')
        .update({ gift_leader_id: newLeaderId })
        .eq('id', celebration.id);

      // Record in history
      await supabase
        .from('gift_leader_history')
        .insert({
          celebration_id: celebration.id,
          assigned_to: newLeaderId,
          assigned_by: null, // System reassignment
          reason: 'member_left',
        });
    }
  }

  // Now safe to remove the member
  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', removedUserId);
}
```

### Invite Code Copy with expo-clipboard
```typescript
// Source: expo-clipboard official docs
import * as Clipboard from 'expo-clipboard';

const handleCopyInviteCode = async (inviteCode: string) => {
  await Clipboard.setStringAsync(inviteCode);
  Alert.alert('Copied!', 'Invite code copied to clipboard');
};
```

### Settings Screen Navigation from Group Header
```typescript
// Source: Codebase pattern from GroupViewHeader.tsx
// Add a gear icon button to the header that navigates to settings
<TouchableOpacity
  onPress={() => router.push(`/group/${groupId}/settings`)}
  style={{
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  <MaterialCommunityIcons name="cog" size={24} color={colors.white} />
</TouchableOpacity>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Using group UUID as invite code | Short human-readable invite codes | Phase 15 | Better UX for sharing/typing codes |
| Only self-delete on group_members | Admin can also remove members | Phase 15 | Enables full member management |
| No group_members UPDATE policy | Admin can update roles | Phase 15 | Enables admin transfer |
| React Native core Clipboard | expo-clipboard | RN 0.72+ | Core Clipboard was removed; expo-clipboard is the standard replacement |

**Deprecated/outdated:**
- `Clipboard` from `react-native` core: Removed. Use `expo-clipboard` instead.
- Using group UUID as invite code: The `generateInviteCode()` function exists in `utils/groups.ts` but was never used. Time to implement it properly.

## Open Questions

Things that could not be fully resolved:

1. **Invite code regeneration policy: who can regenerate?**
   - What we know: GSET-06 says "Any member can view and regenerate invite code"
   - What's unclear: Should regeneration invalidate the old code immediately? This could break in-flight share links.
   - Recommendation: Allow any member to regenerate. The old code becomes invalid immediately (since it's a column UPDATE). Show a confirmation dialog warning about this.

2. **Should admin be able to delete the entire group?**
   - What we know: The requirements (GSET-01 through GSET-07) don't mention group deletion.
   - What's unclear: What happens when the admin wants to fully shut down a group.
   - Recommendation: Defer to a future phase. For now, the admin can only transfer admin role and leave.

3. **What happens to a removed member's wishlist items in this group?**
   - What we know: `wishlist_items.group_id` links items to groups. FK is `ON DELETE CASCADE` from groups, but member removal is on `group_members` not `groups`.
   - What's unclear: Should the removed member's items be deleted, orphaned (group_id set to NULL), or kept visible to remaining members?
   - Recommendation: Keep items visible to remaining members (data stays in the DB). The removed user loses RLS-visible access to the group. Items remain for coordination purposes. This requires no schema change.

4. **Expo Router nested dynamic routes: `app/group/[id]/settings.tsx`**
   - What we know: Expo Router supports nested dynamic routes. The current structure has `app/group/[id].tsx` as a file.
   - What's unclear: Converting from a file (`[id].tsx`) to a folder (`[id]/index.tsx` + `[id]/settings.tsx`) may require layout adjustments.
   - Recommendation: Rename `app/group/[id].tsx` to `app/group/[id]/index.tsx` and add `app/group/[id]/settings.tsx`. Add a `_layout.tsx` for the `[id]` folder with a Stack navigator. This is standard Expo Router practice.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `supabase/migrations/20260201000001_initial_schema.sql` -- current RLS policies for group_members (DELETE only allows self-delete)
- Existing codebase: `supabase/migrations/20260202000003_fix_group_members_recursion.sql` -- `is_group_member()` SECURITY DEFINER function pattern
- Existing codebase: `supabase/migrations/20260205000001_v1.2_groups_schema.sql` -- groups table with description, photo_url, mode columns
- Existing codebase: `supabase/migrations/20260205000002_group_photo_storage_policies.sql` -- admin-only photo upload RLS
- Existing codebase: `lib/storage.ts` -- `uploadGroupPhotoFromUri()`, `getGroupPhotoUrl()` functions
- Existing codebase: `lib/celebrations.ts` -- `getNextGiftLeader()`, `reassignGiftLeader()` patterns
- Existing codebase: `utils/groups.ts` -- `updateGroup()`, `leaveGroup()`, unused `generateInviteCode()`
- Existing codebase: `app/(app)/settings/profile.tsx` -- settings screen pattern with save/cancel
- Existing codebase: `types/database.types.ts` -- no invite_code column, no UPDATE policy on group_members
- [expo-clipboard docs](https://docs.expo.dev/versions/latest/sdk/clipboard/) -- API reference for clipboard operations

### Secondary (MEDIUM confidence)
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS policy patterns for admin operations
- [Supabase pg_hashids](https://supabase.com/docs/guides/database/extensions/pg_hashids) -- short ID generation extension (not recommended for this use case)
- [BoardShape invite system](https://boardshape.com/engineering/how-to-implement-rls-for-a-team-invite-system-with-supabase) -- team invite RLS pattern with SECURITY DEFINER

### Tertiary (LOW confidence)
- Web search results for "React Native group settings screen pattern" -- general patterns from chat SDKs (Sendbird, CometChat) confirming the section-based settings layout approach

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project except expo-clipboard (well-documented Expo module)
- Architecture: HIGH - Following established codebase patterns (settings screens, RLS policies, storage utilities)
- Pitfalls: HIGH - All pitfalls identified from existing schema analysis (FK constraints, RLS recursion, Gift Leader references)
- RLS policies: HIGH - Patterns derived from existing codebase migrations and Supabase official docs
- Invite code system: MEDIUM - Decision to use short codes is sound but the exact generation/uniqueness mechanism needs validation during implementation

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable domain, no fast-moving dependencies)
