# Phase 42: Wishlist Visibility - Research

**Researched:** 2026-02-17
**Domain:** PostgreSQL RLS policies, React Native state management, visibility and collaboration patterns
**Confidence:** HIGH

## Summary

Phase 42 extends the existing wishlists infrastructure (from Phase 37 and 40) with visibility controls and "for-others" collaborative wishlist functionality. The database already has the `visibility` column with CHECK constraint (`public`, `private`, `friends`) and the `owner_type`, `for_user_id`, `for_name` columns from migration `20260218000002`. The primary work is implementing RLS policies that enforce visibility rules and building the UI for setting visibility and linking "for-others" wishlists to specific groups.

The key architectural insight is that "public" wishlists should appear on ALL group celebration pages the user belongs to, while "private" wishlists are owner-only. The "for-others" concept (owner_type = `other_manual` or `other_user`) enables gift idea tracking for people outside the app or for friends, with optional group linking for collaborative access.

A new `linked_group_id` column is needed to associate "for-others" wishlists with specific groups, enabling collaborative access for group members. This addresses VIS-04 through VIS-06 requirements.

**Primary recommendation:** Add `linked_group_id` column to wishlists table, create RLS policies enforcing visibility rules for SELECT access, build visibility picker UI in CreateWishlistModal, and extend celebration page queries to include public wishlists from all group members.

## Standard Stack

### Core (Already in Project)
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| PostgreSQL | 15+ | RLS visibility policies | Existing database, 34+ migrations |
| React Query | 5.x | Server state for visibility | Already used in useWishlists hooks |
| expo-router | 6.x | Navigation to celebration pages | Already in project |
| Supabase RLS | - | Row-level security | Project standard for all access control |

### Supporting (No New Dependencies)
| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| SECURITY DEFINER helper | `can_view_wishlist()` function | Visibility checks in RLS |
| SegmentedControl | Visibility picker UI | public/private/friends toggle |
| GroupPickerSheet | Group selection for for-others | Existing component pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database-level visibility enforcement | App-level filtering | RLS is security-critical; app filtering can be bypassed |
| Separate wishlist_shares table | linked_group_id column | Column simpler for v1.7; table needed for multi-group sharing in v2 |
| Friend visibility via separate query | RLS with are_friends() | RLS more secure; already proven pattern from friends system |

**Installation:**
No new packages needed -- all infrastructure already in place.

## Architecture Patterns

### Schema Extension

Add `linked_group_id` to wishlists for "for-others" collaborative access:

```sql
-- Migration: Add group linking for for-others wishlists
ALTER TABLE public.wishlists
  ADD COLUMN linked_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.wishlists.linked_group_id IS
  'For owner_type=other_*, links wishlist to a group for collaborative access. Group members can view/edit items.';

-- Index for efficient group-based lookups
CREATE INDEX idx_wishlists_linked_group ON public.wishlists(linked_group_id)
  WHERE linked_group_id IS NOT NULL;

-- CHECK constraint: linked_group_id only allowed for "for others" wishlists
ALTER TABLE public.wishlists
  ADD CONSTRAINT wishlists_linked_group_owner_type_check CHECK (
    linked_group_id IS NULL OR owner_type IN ('other_manual', 'other_user')
  );
```

### Pattern 1: Visibility-Based SELECT RLS

**What:** RLS policies that enforce visibility rules for wishlist viewing
**When to use:** All SELECT queries on wishlists table
**Example:**
```sql
-- Source: Extends existing wishlists RLS from Phase 37
-- Drop existing SELECT policy and recreate with visibility enforcement
DROP POLICY IF EXISTS "Users can view own wishlists" ON public.wishlists;

CREATE POLICY "Visibility-based wishlist access"
  ON public.wishlists FOR SELECT
  USING (
    -- Owner always sees own wishlists (all visibility levels)
    user_id = (SELECT auth.uid())
    OR
    -- Public wishlists: group members see if they share a group with owner
    (visibility = 'public' AND EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = wishlists.user_id
        AND gm2.user_id = (SELECT auth.uid())
    ))
    OR
    -- Friends visibility: mutual friends can see
    (visibility = 'friends' AND public.are_friends(wishlists.user_id, (SELECT auth.uid())))
    OR
    -- Linked group: group members can see for-others wishlists
    (linked_group_id IS NOT NULL AND public.is_group_member(linked_group_id, (SELECT auth.uid())))
  );

COMMENT ON POLICY "Visibility-based wishlist access" ON public.wishlists IS
  'Phase 42: Owner sees all, public visible to group co-members, friends visible to mutual friends, linked group members see for-others wishlists.';
```

### Pattern 2: Celebration Page Public Wishlists Query

**What:** Query pattern to show public wishlists on celebration pages
**When to use:** VIS-07 - Public wishlists appear on celebration pages
**Example:**
```typescript
// Source: Extends celebration page query pattern
// Fetch celebrant's public wishlists for celebration page
export const fetchCelebrantPublicWishlists = async (celebrantId: string, groupId: string) => {
  const { data, error } = await supabase
    .from('wishlists')
    .select(`
      *,
      items:wishlist_items(
        id, title, source_url, image_url, price, priority, is_favorite
      )
    `)
    .eq('user_id', celebrantId)
    .eq('visibility', 'public')
    .eq('owner_type', 'self')  // Only self-owned public wishlists
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
};
```

### Pattern 3: For-Others Collaborative Items

**What:** Group members can add items to for-others wishlists they have access to
**When to use:** VIS-06 - Collaborative item addition
**Example:**
```sql
-- Source: Extends wishlist_items INSERT policy for collaborative access
DROP POLICY IF EXISTS "Users can add own wishlist items" ON public.wishlist_items;

CREATE POLICY "Users can add wishlist items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (
    -- Own wishlists (any visibility)
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.user_id = (SELECT auth.uid())
    )
    OR
    -- For-others wishlists with linked group access
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.linked_group_id IS NOT NULL
        AND w.owner_type IN ('other_manual', 'other_user')
        AND public.is_group_member(w.linked_group_id, (SELECT auth.uid()))
    )
  );

COMMENT ON POLICY "Users can add wishlist items" ON public.wishlist_items IS
  'Phase 42: Users can add to own wishlists OR to for-others wishlists where they have group access.';
```

### Pattern 4: Visibility Picker UI

**What:** SegmentedControl for visibility selection in CreateWishlistModal
**When to use:** When creating or editing wishlist visibility settings
**Example:**
```typescript
// Source: Follows existing SegmentedControl patterns in codebase
import { SegmentedControl } from '../ui/SegmentedControl';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: t('wishlists.visibility.public'), icon: 'earth' },
  { value: 'private', label: t('wishlists.visibility.private'), icon: 'lock' },
  { value: 'friends', label: t('wishlists.visibility.friends'), icon: 'account-group' },
];

// In CreateWishlistModal form
<View style={styles.section}>
  <Text style={styles.label}>{t('wishlists.visibilityLabel')}</Text>
  <SegmentedControl
    options={VISIBILITY_OPTIONS}
    selectedValue={visibility}
    onChange={setVisibility}
  />
  <Text style={styles.helperText}>
    {visibility === 'public' && t('wishlists.visibilityHelp.public')}
    {visibility === 'private' && t('wishlists.visibilityHelp.private')}
    {visibility === 'friends' && t('wishlists.visibilityHelp.friends')}
  </Text>
</View>
```

### Pattern 5: For-Others Wishlist Creation

**What:** UI for creating wishlist with owner_type and optional group linking
**When to use:** VIS-03, VIS-04 - For-others wishlist with group link
**Example:**
```typescript
// In CreateWishlistModal - extended form for for-others
const [ownerType, setOwnerType] = useState<'self' | 'other_manual' | 'other_user'>('self');
const [forName, setForName] = useState('');
const [forUserId, setForUserId] = useState<string | null>(null);
const [linkedGroupId, setLinkedGroupId] = useState<string | null>(null);

// Owner type selector
<View style={styles.section}>
  <Text style={styles.label}>{t('wishlists.forWhom')}</Text>
  <SegmentedControl
    options={[
      { value: 'self', label: t('wishlists.forSelf') },
      { value: 'other_manual', label: t('wishlists.forOther') },
    ]}
    selectedValue={ownerType}
    onChange={(value) => {
      setOwnerType(value);
      if (value === 'self') {
        setForName('');
        setForUserId(null);
        setLinkedGroupId(null);
      }
    }}
  />
</View>

{/* For-others name input */}
{ownerType === 'other_manual' && (
  <View style={styles.section}>
    <Text style={styles.label}>{t('wishlists.personName')}</Text>
    <TextInput
      value={forName}
      onChangeText={setForName}
      placeholder={t('wishlists.personNamePlaceholder')}
      style={styles.input}
    />
  </View>
)}

{/* Group linking for collaborative access */}
{ownerType !== 'self' && (
  <View style={styles.section}>
    <Text style={styles.label}>{t('wishlists.linkToGroup')}</Text>
    <GroupPickerButton
      selectedGroupId={linkedGroupId}
      onSelect={setLinkedGroupId}
      placeholder={t('wishlists.selectGroup')}
    />
    <Text style={styles.helperText}>
      {t('wishlists.groupLinkHelp')}
    </Text>
  </View>
)}
```

### Anti-Patterns to Avoid

- **Filtering visibility in application code:** All visibility enforcement MUST be in RLS policies. App-level filtering can be bypassed.
- **Allowing private wishlists on celebration pages:** Private wishlists should NEVER appear to anyone except owner, even via celebration queries.
- **Making default wishlist private:** Default wishlist should always be public for backward compatibility with existing celebration pages.
- **Allowing group linking for self-owned wishlists:** `linked_group_id` is only for "for-others" wishlists; self wishlists use visibility field.
- **Ignoring celebrant exclusion:** Claims on public wishlist items still need celebrant exclusion -- the existing gift_claims RLS handles this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Visibility enforcement | Application-level checks | RLS policies | Security-critical, cannot be bypassed |
| Friend checking | Custom friend lookup | `are_friends()` helper | Already proven, SECURITY DEFINER, handles edge cases |
| Group membership check | Custom joins | `is_group_member()` helper | Already exists, reusable, avoids recursion |
| Visibility picker | Custom radio buttons | SegmentedControl | Existing pattern, accessible, theme-aware |

**Key insight:** The visibility system extends existing RLS helpers (`are_friends()`, `is_group_member()`) rather than building new permission models. This ensures consistency with the proven friends and groups systems.

## Common Pitfalls

### Pitfall 1: Public Wishlist Leaks Private Items

**What goes wrong:** Items in a "public" wishlist are visible to everyone, including items the user didn't want shared
**Why it happens:** User adds items to public wishlist without understanding visibility implications
**How to avoid:**
1. Show visibility badge on each wishlist in UI
2. Confirm when adding items to public wishlists
3. Default new wishlists to 'private' (safer default)
**Warning signs:** User complaints about item exposure

### Pitfall 2: For-Others Wishlist Without Group Link

**What goes wrong:** User creates for-others wishlist but forgets to link to group, so no one can collaborate
**Why it happens:** Optional group linking not surfaced prominently in UI
**How to avoid:**
1. Require group selection when owner_type != 'self'
2. Or show prominent warning when creating without link
**Warning signs:** Orphaned for-others wishlists with no collaborators

### Pitfall 3: Celebrant Sees Claims on Public Wishlist

**What goes wrong:** Public wishlists visible to group, but celebrant exclusion broken
**Why it happens:** New visibility queries bypass existing celebrant exclusion
**How to avoid:**
1. Never change gift_claims RLS policies
2. Public wishlists show items but claims still follow existing exclusion
3. Test with celebrant user viewing their own celebration page
**Warning signs:** Celebrant can see who claimed their items

### Pitfall 4: Private Wishlist Appears on Celebration Page

**What goes wrong:** Celebration page shows "private" wishlist items to group members
**Why it happens:** Celebration query fetches all wishlists without visibility filter
**How to avoid:**
1. Celebration page query MUST include `.eq('visibility', 'public')`
2. RLS provides second layer but query should be explicit
**Warning signs:** Private items visible on celebration page

### Pitfall 5: Default Wishlist Made Private Breaks Existing Flows

**What goes wrong:** User sets default wishlist to private, existing group members can no longer see their items
**Why it happens:** Default wishlist contained items shared via legacy group_id path
**How to avoid:**
1. Prevent changing default wishlist visibility to private
2. Or warn user about impact and require confirmation
3. Consider migration to create separate public/private wishlists
**Warning signs:** Group members report missing wishlist items after visibility change

### Pitfall 6: Friends Visibility Without are_friends() Helper

**What goes wrong:** RLS policy for friends visibility causes recursion or performance issues
**Why it happens:** Inline friend checking without SECURITY DEFINER
**How to avoid:**
1. Always use `public.are_friends()` helper from Phase 1.4 migration
2. Never inline friend lookup in RLS policies
**Warning signs:** RLS evaluation timeout, recursion errors

## Code Examples

### Complete Migration for Visibility System

```sql
-- Source: Phase 42 migration template following project conventions
-- v1.7 Wishlist Visibility System
-- Phase 42: Adds group linking and visibility-based RLS

-- PART 1: Add linked_group_id column
ALTER TABLE public.wishlists
  ADD COLUMN IF NOT EXISTS linked_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

-- PART 2: Index for group-based lookups
CREATE INDEX IF NOT EXISTS idx_wishlists_linked_group
  ON public.wishlists(linked_group_id)
  WHERE linked_group_id IS NOT NULL;

-- PART 3: Constraint - linked_group_id only for "for others" wishlists
ALTER TABLE public.wishlists
  DROP CONSTRAINT IF EXISTS wishlists_linked_group_owner_type_check;

ALTER TABLE public.wishlists
  ADD CONSTRAINT wishlists_linked_group_owner_type_check CHECK (
    linked_group_id IS NULL OR owner_type IN ('other_manual', 'other_user')
  );

-- PART 4: Update SELECT policy with visibility rules
DROP POLICY IF EXISTS "Users can view own wishlists" ON public.wishlists;

CREATE POLICY "Visibility-based wishlist access"
  ON public.wishlists FOR SELECT
  USING (
    -- Owner always sees own wishlists
    user_id = (SELECT auth.uid())
    OR
    -- Public: visible to users who share any group with owner
    (visibility = 'public' AND owner_type = 'self' AND EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = wishlists.user_id
        AND gm2.user_id = (SELECT auth.uid())
    ))
    OR
    -- Friends: visible to mutual friends
    (visibility = 'friends' AND public.are_friends(wishlists.user_id, (SELECT auth.uid())))
    OR
    -- Linked group: for-others wishlists visible to group members
    (linked_group_id IS NOT NULL AND public.is_group_member(linked_group_id, (SELECT auth.uid())))
  );

-- PART 5: Update wishlist_items INSERT policy for collaborative access
DROP POLICY IF EXISTS "Users can add wishlist items" ON public.wishlist_items;

CREATE POLICY "Users can add wishlist items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (
    -- User's own wishlist (any)
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.user_id = (SELECT auth.uid())
    )
    OR
    -- For-others wishlist with linked group membership
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.linked_group_id IS NOT NULL
        AND w.owner_type IN ('other_manual', 'other_user')
        AND public.is_group_member(w.linked_group_id, (SELECT auth.uid()))
    )
  );

-- PART 6: Comments
COMMENT ON COLUMN public.wishlists.linked_group_id IS
  'For owner_type=other_*, links wishlist to a group for collaborative access. Group members can view and add items. NULL for self-owned wishlists.';

COMMENT ON POLICY "Visibility-based wishlist access" ON public.wishlists IS
  'Phase 42 visibility: owner sees all, public visible to group co-members, friends visible to friends, linked group members see for-others wishlists.';

COMMENT ON POLICY "Users can add wishlist items" ON public.wishlist_items IS
  'Phase 42 collaboration: Users add to own wishlists or to for-others wishlists with linked group access.';

-- PART 7: Validation
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'v1.7 Wishlist Visibility - Migration Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'SCHEMA CHANGES:';
  RAISE NOTICE '  - Added: wishlists.linked_group_id (FK to groups)';
  RAISE NOTICE '  - Added: idx_wishlists_linked_group index';
  RAISE NOTICE '  - Added: wishlists_linked_group_owner_type_check constraint';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS POLICIES UPDATED:';
  RAISE NOTICE '  - wishlists SELECT: visibility-based access (public/friends/linked_group)';
  RAISE NOTICE '  - wishlist_items INSERT: collaborative access for linked groups';
  RAISE NOTICE '';
  RAISE NOTICE 'VISIBILITY RULES:';
  RAISE NOTICE '  - private: owner only';
  RAISE NOTICE '  - public: owner + group co-members';
  RAISE NOTICE '  - friends: owner + mutual friends';
  RAISE NOTICE '  - linked_group: owner + linked group members';
  RAISE NOTICE '==============================================';
END $$;
```

### Lib Function: Fetch Celebration Wishlists

```typescript
// Source: lib/wishlists.ts extension for celebration pages
/**
 * Fetch public wishlists for a celebrant to display on celebration page
 * Only returns 'public' visibility, 'self' owner_type wishlists
 */
export async function getCelebrantPublicWishlists(celebrantId: string) {
  const { data, error } = await supabase
    .from('wishlists')
    .select(`
      id,
      name,
      emoji,
      items:wishlist_items(
        id,
        title,
        source_url,
        image_url,
        price,
        priority,
        is_favorite,
        is_most_wanted
      )
    `)
    .eq('user_id', celebrantId)
    .eq('visibility', 'public')
    .eq('owner_type', 'self')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Fetch for-others wishlists linked to a specific group
 * Returns wishlists where current user is group member
 */
export async function getGroupForOthersWishlists(groupId: string) {
  const { data, error } = await supabase
    .from('wishlists')
    .select(`
      id,
      name,
      emoji,
      for_name,
      for_user_id,
      owner_type,
      user_id,
      items:wishlist_items(count)
    `)
    .eq('linked_group_id', groupId)
    .in('owner_type', ['other_manual', 'other_user'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Update wishlist visibility
 */
export async function updateWishlistVisibility(
  wishlistId: string,
  visibility: 'public' | 'private' | 'friends'
) {
  const { data, error } = await supabase
    .from('wishlists')
    .update({ visibility })
    .eq('id', wishlistId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Link a for-others wishlist to a group
 */
export async function linkWishlistToGroup(wishlistId: string, groupId: string | null) {
  const { data, error } = await supabase
    .from('wishlists')
    .update({ linked_group_id: groupId })
    .eq('id', wishlistId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### React Query Hooks

```typescript
// Source: hooks/useWishlists.ts extension
export const useCelebrantPublicWishlists = (celebrantId: string | undefined) => {
  return useQuery({
    queryKey: ['wishlists', 'public', celebrantId],
    queryFn: () => getCelebrantPublicWishlists(celebrantId!),
    enabled: !!celebrantId,
  });
};

export const useGroupForOthersWishlists = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ['wishlists', 'for-others', groupId],
    queryFn: () => getGroupForOthersWishlists(groupId!),
    enabled: !!groupId,
  });
};

export const useUpdateVisibility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wishlistId, visibility }: { wishlistId: string; visibility: 'public' | 'private' | 'friends' }) =>
      updateWishlistVisibility(wishlistId, visibility),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Group-scoped items | User-owned wishlists with visibility | v1.7 (Phase 37) | User controls visibility, not group membership |
| All items visible to group | Visibility-based RLS | v1.7 (Phase 42) | Private items stay private even in groups |
| No "for others" concept | owner_type + linked_group_id | v1.7 (Phase 42) | Gift ideas for non-users, collaborative lists |

**Project-specific patterns already established:**
- `are_friends()` helper for friend-based visibility (proven in Phase 1.4)
- `is_group_member()` helper for group access (proven since v1.0)
- CHECK constraints for enum-like validation (visibility, owner_type)
- SegmentedControl for multi-option selection (group mode, budget approach)

## Open Questions

1. **Default visibility for new wishlists**
   - What we know: Current default is 'public' from Phase 37 migration
   - What's unclear: Should new wishlists default to 'private' for privacy-first UX?
   - Recommendation: Keep 'public' default for v1.7 to match existing behavior; consider 'private' default in v2.

2. **Preventing default wishlist privacy change**
   - What we know: Default wishlist contains existing items visible via legacy group_id
   - What's unclear: Should UI prevent setting default wishlist to private?
   - Recommendation: Allow but show warning about items becoming invisible to groups.

3. **Multiple group linking for for-others wishlists**
   - What we know: Current design supports single linked_group_id
   - What's unclear: Should for-others wishlists be linkable to multiple groups?
   - Recommendation: Defer to v2. Single group link sufficient for v1.7.

4. **Friends visibility in group context**
   - What we know: 'friends' visibility uses are_friends() helper
   - What's unclear: Should group members automatically see 'friends' wishlists?
   - Recommendation: No -- group membership != friendship. Keep them separate.

## Sources

### Primary (HIGH confidence)
- Existing migration `20260216000001_v1.7_multi_wishlist_foundation.sql` -- wishlists table schema, visibility column
- Existing migration `20260218000002_add_wishlist_owner_fields.sql` -- owner_type, for_user_id, for_name columns
- Existing migration `20260210000001_v1.4_friends_system_foundation.sql` -- are_friends() helper pattern
- Phase 40 verification -- CreateWishlistModal, WishlistManager component patterns
- Phase 37 research -- RLS dual-access patterns, celebrant exclusion preservation

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES-v1.7.md` -- Visibility system design
- `.planning/research/PITFALLS-URL-SHARE.md` -- Friend visibility pitfalls
- `.planning/PROJECT.md` -- VIS-01 through VIS-07 requirements

### Tertiary (LOW confidence, validate during implementation)
- Default visibility UX decision -- may need user feedback
- Multiple group linking -- deferred feature, architecture TBD

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies, extends existing patterns
- Architecture: HIGH -- RLS helpers proven, visibility column exists
- Pitfalls: HIGH -- Documented in v1.7 research, specific mitigations provided

**Research date:** 2026-02-17
**Valid until:** 60 days (stable patterns, no external dependencies)
