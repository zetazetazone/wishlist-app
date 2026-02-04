# Architecture Research: v1.2 Group Experience

**Domain:** Group customization, modes, and budget tracking
**Researched:** 2026-02-04
**Overall confidence:** HIGH

## Executive Summary

The v1.2 group experience features integrate cleanly with the existing Supabase + React Native architecture. Schema changes are additive columns to the existing `groups` table (no new tables required). Group photo storage reuses the existing `avatars` bucket pattern. Member cards with birthday sorting and favorite preview require a single optimized query joining `group_members`, `users`, and `group_favorites` tables. Budget approach impacts how `celebration_contributions` are validated but does not require schema changes to that table.

The recommended build order is: (1) Schema migration for groups table columns, (2) Storage integration for group photos, (3) Create/Edit group flow updates, (4) Group view with member cards, (5) Admin settings panel. This order minimizes rework by establishing data layer first.

## Schema Changes

### groups table modifications

Add new columns to support group customization, mode selection, and budget approach:

```sql
-- New columns for groups table
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS mode TEXT CHECK (mode IN ('greetings_only', 'gifts')) DEFAULT 'gifts',
ADD COLUMN IF NOT EXISTS budget_approach TEXT CHECK (budget_approach IN ('per_gift', 'monthly_pooled', 'yearly')) DEFAULT 'per_gift';

-- Rename existing column for clarity (optional, maintains backward compatibility)
-- budget_limit_per_gift stays as-is since it's still relevant for per_gift approach
```

**Column Details:**
| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `description` | TEXT | NULL | Optional group description/tagline |
| `photo_url` | TEXT | NULL | Storage path to group photo (same pattern as user avatars) |
| `mode` | TEXT (CHECK) | 'gifts' | Group mode - 'greetings_only' disables gift coordination |
| `budget_approach` | TEXT (CHECK) | 'per_gift' | How budget is calculated/enforced |

**Budget Approach Values:**
- `per_gift`: Uses existing `budget_limit_per_gift` per celebration
- `monthly_pooled`: Group contributes fixed monthly amount to shared pool
- `yearly`: Fixed annual budget per member for all celebrations

### New tables (if any)

**No new tables required.** The existing schema supports all v1.2 features:
- Group favorites already exist in `group_favorites` table
- Celebrations already have contribution tracking
- User profiles already have birthday data

### RLS Policy Updates

The existing RLS policies on `groups` table are sufficient:
- "Users can view their groups" - SELECT for group members
- "Admins can update their groups" - UPDATE for admins

**No policy changes needed** because:
1. New columns follow same access pattern as existing columns
2. Group members can view all group data (including new fields)
3. Only admins can update group data (including new fields)

## Component Architecture

### New Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `GroupHeader` | Displays group photo, name, description, mode badge | `components/groups/GroupHeader.tsx` |
| `GroupMemberCard` | Member card with avatar, name, countdown, favorite preview | `components/groups/GroupMemberCard.tsx` |
| `GroupPhotoUploader` | Image picker + upload for group photos | `components/groups/GroupPhotoUploader.tsx` |
| `GroupModeSelector` | Radio/segmented control for greetings_only vs gifts | `components/groups/GroupModeSelector.tsx` |
| `BudgetApproachSelector` | Dropdown/picker for budget approach | `components/groups/BudgetApproachSelector.tsx` |
| `GroupSettingsSheet` | Bottom sheet for admin group settings | `components/groups/GroupSettingsSheet.tsx` |
| `MemberManagementSheet` | Bottom sheet for admin member management (remove, role) | `components/groups/MemberManagementSheet.tsx` |

### Modified Components

| Component | Changes |
|-----------|---------|
| `CreateGroupModal` | Add photo upload, description input, mode selector, budget approach selector |
| `GroupCard` | Show group photo thumbnail, mode badge if greetings_only |
| `app/group/[id].tsx` | Replace current member list with member cards sorted by birthday, add group header |
| `utils/groups.ts` | Update `createGroup` and `updateGroup` to handle new fields |
| `types/database.types.ts` | Add new columns to `groups` type definition |

### Existing Components Reused

| Component | How Reused |
|-----------|------------|
| `lib/storage.ts` | Extend pattern for group photos (new `uploadGroupPhoto` function) |
| `lib/favorites.ts` | Use `getFavoriteForGroup` for member card favorite preview |
| `lib/birthdays.ts` | Use birthday countdown logic for member cards |

## Data Flow

### Create Group Flow

```
User taps "Create Group"
    |
    v
CreateGroupModal (enhanced)
    - Name (required) [existing]
    - Description (optional) [NEW]
    - Photo (optional) [NEW]
    - Mode selector (gifts default) [NEW]
    - Budget approach (per_gift default) [NEW]
    - Budget limit (if per_gift) [existing]
    |
    v
Photo selected? --> GroupPhotoUploader --> Supabase Storage (avatars bucket)
    |                                              |
    |                                              v
    |                                        Returns storage path
    |
    v
createGroup(name, description, photoPath, mode, budgetApproach, budgetLimit)
    |
    v
Supabase INSERT into groups table
    |
    v
Supabase INSERT into group_members (creator as admin)
    |
    v
setDefaultFavorite(userId, groupId) [existing behavior]
    |
    v
Return to groups list (refreshed)
```

**Storage Path Pattern:**
```
avatars/groups/{groupId}/{timestamp}.{ext}
```

This reuses the existing `avatars` bucket but organizes group photos in a `groups/` subfolder.

### Group View with Member Cards

**Query Pattern for Member Cards:**

```typescript
// Optimized single query with joins
const { data, error } = await supabase
  .from('group_members')
  .select(`
    role,
    users!inner (
      id,
      full_name,
      avatar_url,
      birthday
    ),
    group_favorites!inner (
      item_id,
      wishlist_items!inner (
        id,
        title,
        item_type,
        image_url
      )
    )
  `)
  .eq('group_id', groupId)
  .order('users.birthday', { ascending: true }); // Sort by birthday
```

**Note:** The birthday sort needs adjustment for "closest upcoming" rather than calendar order. This requires client-side sorting:

```typescript
// Client-side sorting for "closest upcoming birthday"
const sortByUpcomingBirthday = (members) => {
  const today = new Date();

  return members.sort((a, b) => {
    const aNext = getNextBirthday(a.users.birthday, today);
    const bNext = getNextBirthday(b.users.birthday, today);
    return aNext.getTime() - bNext.getTime();
  });
};

const getNextBirthday = (birthday: string, today: Date) => {
  const bday = new Date(birthday);
  const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());

  if (thisYear < today) {
    // Birthday passed this year, use next year
    return new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate());
  }
  return thisYear;
};
```

**Data Flow:**

```
User navigates to Group Detail Screen
    |
    v
fetchGroupWithMembers(groupId)
    |
    v
Single optimized query returns:
    - group (name, description, photo_url, mode, budget_approach)
    - members (with user data, favorites, favorite items)
    |
    v
Client-side sort by upcoming birthday
    |
    v
Render GroupHeader + sorted MemberCards
    |
    v
User taps member card --> router.push(`/profile/${memberId}`) or celebration
```

### Budget Tracking

Budget approach affects how contributions are validated and displayed, but does not change the `celebration_contributions` schema.

**per_gift (existing behavior):**
- Each celebration has `target_amount` from `groups.budget_limit_per_gift`
- Contributions tracked per celebration
- Progress bar shows % of target

**monthly_pooled:**
- New concept: monthly contribution target per member
- Contributions still tracked per celebration
- UI shows monthly pool status vs individual celebration
- Requires new helper functions but no schema change

**yearly:**
- Annual budget per member across all celebrations
- Contributions tracked per celebration (existing)
- UI shows yearly budget remaining
- Requires new helper functions but no schema change

**Recommended approach:** Start with `per_gift` as fully functional, add pooled/yearly UI as "coming soon" badges to avoid scope creep.

## Suggested Build Order

### Phase 1: Schema Foundation (Day 1)

**Rationale:** All other features depend on these columns existing.

- [ ] Create migration `20260205000001_group_experience.sql`
  - Add `description`, `photo_url`, `mode`, `budget_approach` columns
  - No RLS changes needed
- [ ] Update `types/database.types.ts` with new columns

### Phase 2: Group Photo Storage (Day 1-2)

**Rationale:** Photo upload is standalone, needed for create/edit flows.

- [ ] Add `uploadGroupPhoto(groupId)` to `lib/storage.ts`
  - Follow existing `uploadAvatar` pattern
  - Use path `avatars/groups/{groupId}/{timestamp}.{ext}`
- [ ] Add `getGroupPhotoUrl(path)` helper
- [ ] Create `GroupPhotoUploader` component
  - Reuse `expo-image-picker` integration from avatar upload

### Phase 3: Create Group Flow (Day 2-3)

**Rationale:** New groups can use all v1.2 features, establishes patterns.

- [ ] Create `GroupModeSelector` component
- [ ] Create `BudgetApproachSelector` component
- [ ] Enhance `CreateGroupModal`:
  - Add description input
  - Add photo uploader
  - Add mode selector
  - Add budget approach selector
- [ ] Update `createGroup()` in `utils/groups.ts`

### Phase 4: Group View Enhancement (Day 3-4)

**Rationale:** This is the main user-facing feature.

- [ ] Create `GroupHeader` component
  - Photo with fallback to initial
  - Name, description
  - Mode badge (if greetings_only)
  - Member count, budget info
- [ ] Create `GroupMemberCard` component
  - Avatar, name
  - Birthday countdown (reuse from `CountdownCard`)
  - Favorite item preview (thumbnail + title)
  - Navigation to profile/celebration
- [ ] Create `fetchGroupWithMembers()` optimized query
- [ ] Implement client-side birthday sorting
- [ ] Update `app/group/[id].tsx` with new components

### Phase 5: Admin Settings (Day 4-5)

**Rationale:** Admin features last since they're less critical for MVP.

- [ ] Create `GroupSettingsSheet` component
  - Edit name, description, photo
  - Change mode
  - Adjust budget approach/limit
- [ ] Create `MemberManagementSheet` component
  - Remove member (with confirmation)
  - Change role (member <-> admin)
- [ ] Add settings button to `GroupHeader` (admin only)
- [ ] Update `updateGroup()` in `utils/groups.ts`

## Integration Points

### Celebrations Integration

**Mode affects celebrations:**
- `greetings_only` mode: Celebrations still created (birthday tracking), but:
  - No Gift Leader assignment
  - No contribution tracking
  - Chat available for greetings coordination
- `gifts` mode: Full functionality (existing behavior)

**Implementation:**
```typescript
// In celebrations.ts
export async function getCelebrationType(groupId: string) {
  const { data: group } = await supabase
    .from('groups')
    .select('mode')
    .eq('id', groupId)
    .single();

  return group?.mode === 'gifts' ? 'full' : 'greetings';
}
```

### Chat Integration

Chat rooms work in both modes:
- `gifts`: Coordinate gift purchasing
- `greetings_only`: Coordinate greeting cards, virtual celebration

No changes needed to chat system.

### Notifications Integration

Notification text should reflect mode:
- `gifts`: "You're the Gift Leader for..."
- `greetings_only`: "Plan a greeting for..." (or skip Gift Leader notification entirely)

**Implementation:** Check group mode before sending Gift Leader notification.

### Favorites Integration

Favorite preview on member cards uses existing `group_favorites` and `wishlist_items` tables. No changes needed to favorites system.

**Query already handles this:**
```typescript
// From member card query
group_favorites!inner (
  item_id,
  wishlist_items!inner (
    id, title, item_type, image_url
  )
)
```

## File Structure Changes

```
components/
  groups/
    CreateGroupModal.tsx      [MODIFY]
    GroupCard.tsx             [MODIFY]
    JoinGroupModal.tsx        [NO CHANGE]
    GroupHeader.tsx           [NEW]
    GroupMemberCard.tsx       [NEW]
    GroupPhotoUploader.tsx    [NEW]
    GroupModeSelector.tsx     [NEW]
    BudgetApproachSelector.tsx [NEW]
    GroupSettingsSheet.tsx    [NEW]
    MemberManagementSheet.tsx [NEW]

lib/
  storage.ts                  [MODIFY - add group photo functions]
  groups.ts                   [NEW - optimized query for member cards]

utils/
  groups.ts                   [MODIFY - add new fields to create/update]

types/
  database.types.ts           [MODIFY - add new group columns]

app/
  group/[id].tsx              [MODIFY - new group view]

supabase/
  migrations/
    20260205000001_group_experience.sql [NEW]
```

## Performance Considerations

### Query Optimization

The member card query joins 4 tables. Ensure indexes exist:
- `group_members(group_id)` - EXISTS
- `group_favorites(group_id, user_id)` - EXISTS
- `users(birthday)` - NEEDS ADDING for sort performance

```sql
CREATE INDEX IF NOT EXISTS idx_users_birthday ON public.users(birthday);
```

### Image Loading

Group photos and member avatars should use:
- `expo-image` with caching (already used for avatars)
- Placeholder/skeleton while loading
- Reasonable image dimensions (200x200 for group photos)

### List Performance

Member cards use `FlashList` (already in project) for performant rendering.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Schema changes | HIGH | Additive columns, no complex migrations |
| Storage integration | HIGH | Follows proven avatar pattern exactly |
| Create/Edit flows | HIGH | Extends existing modal pattern |
| Member card query | HIGH | Standard Supabase joins, tested pattern |
| Birthday sorting | HIGH | Client-side calculation, well-understood |
| Mode integration | MEDIUM | Need to verify celebration/notification touch points |
| Budget approaches | MEDIUM | per_gift works, pooled/yearly UI is additive |
| RLS policies | HIGH | No changes needed, existing policies sufficient |

## Risk Areas

### Birthday Sort Edge Cases

- Members without birthday: Sort to end of list
- All birthdays passed: Show next year's dates
- Same day birthdays: Secondary sort by name

### Greetings Only Mode

If user switches mode after celebrations exist:
- Existing celebrations keep their state
- New celebrations created in new mode
- Gift Leader field becomes ignored (not cleared)

**Recommendation:** Add confirmation dialog when switching from `gifts` to `greetings_only`.

### Pooled/Yearly Budgets

These are more complex than `per_gift`:
- Need UI for pool status
- Need calculation of remaining budget
- Need enforcement logic

**Recommendation:** Ship with `per_gift` only, show pooled/yearly as "Coming Soon" in selector.

---
*Research completed: 2026-02-04*
*Source: Existing codebase analysis, Supabase schema patterns*
