# Phase 37: Database Foundation - Research

**Researched:** 2026-02-16
**Domain:** Supabase PostgreSQL schema design, expand-and-contract migration, RLS policy updates
**Confidence:** HIGH

## Summary

Phase 37 establishes the multi-wishlist database architecture by creating a `wishlists` table, adding a nullable `wishlist_id` column to `wishlist_items`, and safely migrating all existing items to user-owned default wishlists. This is the foundational database work that enables v1.7 Global Wishlist features.

The key challenge is maintaining data integrity during migration: existing `gift_claims`, `celebration_contributions`, and RLS policies all depend on the current `group_id`-based model. The expand-and-contract migration pattern ensures no data corruption by (1) adding nullable columns first, (2) backfilling data, (3) validating completeness, and (4) deferring NOT NULL constraint to Phase 43 after full UI migration.

The migration must preserve celebrant exclusion -- the core security invariant that prevents birthday celebrants from seeing claims on their own items. Current RLS policies check `group_id` via joins; the new model adds `wishlist_id` but keeps `group_id` for backward compatibility during transition.

**Primary recommendation:** Create `wishlists` table with `is_default` flag, add nullable `wishlist_id` to `wishlist_items`, backfill all existing items to user's auto-created default wishlist, and update RLS policies to support both `group_id` and `wishlist_id` access patterns. Defer `wishlist_id` NOT NULL enforcement to Phase 43.

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| PostgreSQL | 15+ | Database engine (via Supabase) | Already in use, 24+ migrations established |
| Supabase RLS | - | Row-level security policies | Project standard, well-understood patterns |
| plpgsql | - | Stored procedures/functions | Project standard for RPC functions |

### Supporting
| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| SECURITY DEFINER functions | Bypass RLS for complex operations | Helper functions like `is_group_member()`, migration backfill |
| Partial unique indexes | Enforce constraints on subset of rows | One default wishlist per user |
| CHECK constraints | Enum-like validation without ALTER TYPE locks | Visibility enum (public/private/friends) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Nullable wishlist_id during transition | Immediate NOT NULL with default | NOT NULL safer but requires all app code updated first |
| Separate wishlists table | Extend groups table | Wishlists are user-owned, groups are multi-user -- different semantics |
| Remove group_id immediately | Keep group_id during transition | Keeping group_id allows rollback and maintains celebration page functionality |

**Installation:**
No new packages needed -- all infrastructure already in place.

## Architecture Patterns

### Migration Structure

Follow the established pattern from `20260210000001_v1.4_friends_system_foundation.sql`:

```sql
-- v1.7 Multi-Wishlist Database Foundation
-- Phase 37: Creates wishlists table, extends wishlist_items, migrates existing data
--
-- Tables:
--   1. wishlists - User-owned wishlist containers
--
-- Schema Changes:
--   1. wishlist_items.wishlist_id - FK to wishlists (nullable during transition)
--
-- Migration:
--   1. Create default wishlist for each existing user
--   2. Backfill existing items to their owner's default wishlist
--
-- RLS Patterns:
--   1. Owner Ownership (wishlists) - Only owner can manage
--   2. Dual Access (wishlist_items) - Support both group_id and wishlist_id patterns

-- PART 1: wishlists table
-- PART 2: wishlist_items.wishlist_id column
-- PART 3: Default wishlist creation for existing users
-- PART 4: Backfill existing items to default wishlists
-- PART 5: RLS policies for wishlists
-- PART 6: Updated RLS policies for wishlist_items (support both patterns)
-- PART 7: Helper function: can_view_wishlist_item()
-- PART 8: Validation queries
-- PART 9: Indexes
-- PART 10: Triggers
-- PART 11: Comments
-- PART 12: Grants
```

### Pattern 1: wishlists Table with Default Flag

**What:** User-owned wishlist containers with `is_default` flag enforced by partial unique index
**When to use:** Multi-wishlist architecture where each user has exactly one default list
**Example:**
```sql
-- Source: Standard relational pattern, matches FEATURES-v1.7.md schema
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT, -- Optional emoji identifier
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exactly one default per user (partial unique index)
CREATE UNIQUE INDEX idx_wishlists_user_default
  ON public.wishlists(user_id)
  WHERE is_default = TRUE;
```

### Pattern 2: Expand-and-Contract Migration

**What:** Add nullable column first, backfill, validate, enforce NOT NULL later
**When to use:** Schema changes affecting existing data with active application traffic
**Example:**
```sql
-- EXPAND: Add nullable column
ALTER TABLE public.wishlist_items
  ADD COLUMN wishlist_id UUID REFERENCES public.wishlists(id) ON DELETE SET NULL;

-- BACKFILL: Populate via migration script (in same transaction)
-- ... see backfill pattern below ...

-- CONTRACT (Phase 43): After full validation
-- ALTER TABLE public.wishlist_items ALTER COLUMN wishlist_id SET NOT NULL;
```

### Pattern 3: Backfill with Default Wishlist Creation

**What:** Create default wishlists for users, then link items in single transaction
**When to use:** Data migration where parent rows must exist before child FKs
**Example:**
```sql
-- Source: Adapted from FEATURES-v1.7.md migration strategy
-- Create default wishlists for all users who have wishlist items
INSERT INTO public.wishlists (user_id, name, is_default, visibility)
SELECT DISTINCT
  wi.user_id,
  'My Wishlist',
  TRUE,
  'public'
FROM public.wishlist_items wi
WHERE wi.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.wishlists w
    WHERE w.user_id = wi.user_id AND w.is_default = TRUE
  );

-- Also create for users without items (for completeness)
INSERT INTO public.wishlists (user_id, name, is_default, visibility)
SELECT
  u.id,
  'My Wishlist',
  TRUE,
  'public'
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.wishlists w
  WHERE w.user_id = u.id AND w.is_default = TRUE
);

-- Link items to owner's default wishlist
UPDATE public.wishlist_items wi
SET wishlist_id = (
  SELECT w.id FROM public.wishlists w
  WHERE w.user_id = wi.user_id AND w.is_default = TRUE
  LIMIT 1
)
WHERE wi.wishlist_id IS NULL;
```

### Pattern 4: Dual-Access RLS Policies

**What:** RLS policies that support both legacy group_id AND new wishlist_id access
**When to use:** During migration when both access patterns must work
**Example:**
```sql
-- Source: Extends existing pattern from 20260202000004_fix_wishlist_rls.sql
-- Users can view items via:
--   1. Own items (always)
--   2. Group membership (legacy path)
--   3. Wishlist ownership (new path)
--   4. Wishlist visibility to friends (Phase 42)
CREATE POLICY "Users can view wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (
    -- Owner's own items
    user_id = (SELECT auth.uid())
    OR
    -- Group-based access (legacy, supports celebrations)
    (group_id IS NOT NULL AND public.is_group_member(group_id, (SELECT auth.uid())))
    OR
    -- Wishlist-based access (new path for Phase 40+)
    (wishlist_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.user_id = (SELECT auth.uid())
    ))
  );
```

### Pattern 5: Celebrant Exclusion Preservation

**What:** Ensure gift_claims RLS continues to block celebrant from seeing claim details
**When to use:** Any schema change touching wishlist_items structure
**Critical:** The existing gift_claims SELECT policy joins through wishlist_items to check group membership. Adding wishlist_id doesn't break this -- the group_id column is preserved.

**Existing policy (from 20260206000001):**
```sql
-- Non-owners can view claims if they share a group with item owner
CREATE POLICY "Non-owners can view claims on group items"
  ON public.gift_claims FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.wishlist_items wi
      WHERE wi.id = gift_claims.wishlist_item_id
        AND wi.user_id = (SELECT auth.uid())  -- Celebrant exclusion
    )
    AND
    EXISTS (
      SELECT 1 FROM public.wishlist_items wi
      JOIN public.group_members gm_owner
        ON gm_owner.group_id = wi.group_id AND gm_owner.user_id = wi.user_id
      JOIN public.group_members gm_viewer
        ON gm_viewer.group_id = wi.group_id AND gm_viewer.user_id = (SELECT auth.uid())
      WHERE wi.id = gift_claims.wishlist_item_id
    )
  );
```

**This policy remains valid because:**
1. `wi.group_id` is NOT removed -- it stays nullable but populated for existing items
2. Celebrant exclusion check (`wi.user_id != auth.uid()`) is independent of wishlist_id
3. Group membership join still works via preserved group_id

### Anti-Patterns to Avoid

- **Removing group_id during migration:** Keep group_id for backward compatibility. Celebrations page queries need it. Remove in Phase 43 or later after celebrations are updated.
- **Making wishlist_id NOT NULL immediately:** App code needs time to be updated. Phase 43 enforces after UI migration complete.
- **Updating gift_claims RLS without testing:** The celebrant exclusion pattern is security-critical. Test with celebrant user viewing their own items.
- **Creating wishlists without user_id check:** Every wishlist must have user_id set. No orphan wishlists.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| One default per user | Application-level check | Partial unique index | Database enforces, cannot be bypassed |
| Wishlist visibility | Application permission check | RLS policy with `are_friends()` helper | Consistent security, works across all queries |
| Migration rollback | Manual SQL scripts | Transaction with validation queries | Atomic rollback if validation fails |
| Backfill race conditions | UPDATE without WHERE clause | Single transaction with explicit ordering | Prevents partial backfill |

**Key insight:** This migration touches core data with complex RLS dependencies. Use database constraints and atomic transactions to prevent inconsistent states.

## Common Pitfalls

### Pitfall 1: Orphaned Items After Migration

**What goes wrong:** Some wishlist_items have NULL wishlist_id after backfill
**Why it happens:** User was deleted but items remain, or transaction partial failure
**How to avoid:**
```sql
-- Validation query MUST return zero rows
SELECT COUNT(*) AS orphaned_items
FROM public.wishlist_items
WHERE wishlist_id IS NULL
  AND user_id IS NOT NULL;
```
**Warning signs:** Items not appearing in wishlist UI, NULL FK errors

### Pitfall 2: Celebrant Sees Claim Details

**What goes wrong:** Birthday person can see who claimed their items
**Why it happens:** RLS policy accidentally bypassed or join changed
**How to avoid:** Test with celebrant user ID:
```sql
-- Run as celebrant user -- should return 0 rows for own items
SELECT * FROM public.gift_claims gc
JOIN public.wishlist_items wi ON gc.wishlist_item_id = wi.id
WHERE wi.user_id = '<celebrant_user_id>';
```
**Warning signs:** Celebrant complaining about seeing gift spoilers

### Pitfall 3: Default Wishlist Not Created for New Users

**What goes wrong:** Users created after migration have no default wishlist
**Why it happens:** Trigger not added for new user creation
**How to avoid:** Add trigger on `auth.users` insert OR handle in application signup flow
**Warning signs:** New users see empty wishlist list, cannot add items

### Pitfall 4: Multiple Default Wishlists Per User

**What goes wrong:** Partial unique index violated, or user has two defaults
**Why it happens:** Migration ran twice, or race condition in creation
**How to avoid:** Use `INSERT ... ON CONFLICT DO NOTHING` pattern:
```sql
INSERT INTO public.wishlists (user_id, name, is_default, visibility)
SELECT u.id, 'My Wishlist', TRUE, 'public'
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.wishlists w WHERE w.user_id = u.id AND w.is_default = TRUE
);
```
**Warning signs:** Unique constraint violation errors during migration

### Pitfall 5: Visibility Column Confusion

**What goes wrong:** Items in "private" wishlist visible to group members via legacy path
**Why it happens:** group_id-based RLS policy still grants access
**How to avoid:** In Phase 42, update RLS to check wishlist visibility before group access:
```sql
-- Phase 42 will add:
AND (w.visibility = 'public' OR w.visibility = 'friends' AND public.are_friends(...))
```
**Warning signs:** Private wishlist items appearing on celebration pages -- acceptable during transition, fix in Phase 42

## Code Examples

### Complete wishlists Table Creation

```sql
-- Source: FEATURES-v1.7.md schema adapted for project conventions
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'friends')),
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One default per user
CREATE UNIQUE INDEX idx_wishlists_user_default
  ON public.wishlists(user_id)
  WHERE is_default = TRUE;

-- Lookup by user
CREATE INDEX idx_wishlists_user ON public.wishlists(user_id);

-- Enable RLS
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
```

### RLS Policies for wishlists Table

```sql
-- Source: Follows owner-write pattern from existing tables
-- SELECT: Owner can view own wishlists
CREATE POLICY "Users can view own wishlists"
  ON public.wishlists FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- INSERT: Owner only
CREATE POLICY "Users can create own wishlists"
  ON public.wishlists FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: Owner only, cannot change user_id
CREATE POLICY "Users can update own wishlists"
  ON public.wishlists FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: Owner only, cannot delete default wishlist
CREATE POLICY "Users can delete non-default wishlists"
  ON public.wishlists FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    AND is_default = FALSE
  );
```

### Add wishlist_id Column to wishlist_items

```sql
-- Source: Expand-and-contract pattern
ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS wishlist_id UUID REFERENCES public.wishlists(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist
  ON public.wishlist_items(wishlist_id)
  WHERE wishlist_id IS NOT NULL;
```

### Backfill Migration Script

```sql
-- Source: Adapted from FEATURES-v1.7.md migration strategy
-- Step 1: Create default wishlists for all users who have items
INSERT INTO public.wishlists (user_id, name, emoji, is_default, visibility)
SELECT DISTINCT
  wi.user_id,
  'My Wishlist',
  NULL, -- No emoji for default
  TRUE,
  'public'
FROM public.wishlist_items wi
WHERE wi.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 2: Create default wishlists for users without items
INSERT INTO public.wishlists (user_id, name, emoji, is_default, visibility)
SELECT
  u.id,
  'My Wishlist',
  NULL,
  TRUE,
  'public'
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.wishlists w
  WHERE w.user_id = u.id AND w.is_default = TRUE
)
ON CONFLICT DO NOTHING;

-- Step 3: Link items to owner's default wishlist
UPDATE public.wishlist_items wi
SET wishlist_id = (
  SELECT w.id FROM public.wishlists w
  WHERE w.user_id = wi.user_id AND w.is_default = TRUE
  LIMIT 1
)
WHERE wi.wishlist_id IS NULL
  AND wi.user_id IS NOT NULL;
```

### Validation Queries

```sql
-- MUST pass before migration completes
-- Query 1: All users have default wishlist
SELECT COUNT(*) AS users_without_default
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.wishlists w
  WHERE w.user_id = u.id AND w.is_default = TRUE
);
-- Expected: 0

-- Query 2: No user has multiple default wishlists (partial index enforces, but verify)
SELECT user_id, COUNT(*) AS default_count
FROM public.wishlists
WHERE is_default = TRUE
GROUP BY user_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Query 3: All existing items have wishlist_id (after backfill)
SELECT COUNT(*) AS items_without_wishlist
FROM public.wishlist_items
WHERE wishlist_id IS NULL
  AND user_id IS NOT NULL;
-- Expected: 0

-- Query 4: Gift claims still work (celebrant exclusion intact)
-- Run as specific user, should not see claims on own items
SELECT gc.id, wi.title
FROM public.gift_claims gc
JOIN public.wishlist_items wi ON gc.wishlist_item_id = wi.id
WHERE wi.user_id = '<test_user_id>';
-- Expected: Empty for user's own items (blocked by RLS)
```

### Updated wishlist_items RLS Policy

```sql
-- Source: Extended from 20260202000004_fix_wishlist_rls.sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view wishlist items" ON public.wishlist_items;

-- Recreate with dual-access pattern
CREATE POLICY "Users can view wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (
    -- Own items (always visible to owner)
    user_id = (SELECT auth.uid())
    OR
    -- Group-based access (legacy path, supports celebrations)
    (group_id IS NOT NULL AND public.is_group_member(group_id, (SELECT auth.uid())))
    OR
    -- Wishlist-based access (owner's other wishlists -- edge case for self-view)
    (wishlist_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.user_id = (SELECT auth.uid())
    ))
  );

COMMENT ON POLICY "Users can view wishlist items" ON public.wishlist_items IS
  'Dual-access pattern: supports both legacy group_id and new wishlist_id access. Phase 37 transition policy.';
```

### Trigger for New Users (Create Default Wishlist)

```sql
-- Source: Follows existing handle_new_user() pattern
CREATE OR REPLACE FUNCTION public.create_default_wishlist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wishlists (user_id, name, is_default, visibility)
  VALUES (NEW.id, 'My Wishlist', TRUE, 'public');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire after user profile created (extends existing on_auth_user_created flow)
-- Option A: Add to existing trigger
-- Option B: Separate trigger on public.users
CREATE TRIGGER on_user_created_create_wishlist
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_wishlist();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Items belong to groups | Items belong to wishlists | v1.7 (this phase) | User-owned content model |
| Single implicit wishlist | Multiple named wishlists | v1.7 (this phase) | Competitive with GoWish, Amazon |
| Immediate NOT NULL constraints | Expand-and-contract migration | Industry standard | Safer deployments, rollback capability |

**Project-specific patterns already established:**
- `is_group_member()` helper for RLS (reuse pattern, already proven)
- Status enum via CHECK constraint (used in gift_claims, friend_requests)
- SECURITY DEFINER functions for atomic operations (claim_item, accept_friend_request)

## Open Questions

1. **Default wishlist creation for new users**
   - What we know: Need trigger or application-level creation
   - What's unclear: Fire on auth.users INSERT or public.users INSERT?
   - Recommendation: Use trigger on `public.users` INSERT since that's where profile creation happens via existing `handle_new_user()` flow. Add new trigger `on_user_created_create_wishlist`.

2. **Wishlist visibility during transition**
   - What we know: Phase 37 adds `visibility` column but doesn't enforce it in RLS
   - What's unclear: Should private wishlists be hidden from group celebration pages now?
   - Recommendation: Default all to `public`, defer visibility enforcement to Phase 42. Prevents breaking celebration pages during transition.

3. **group_id deprecation timeline**
   - What we know: group_id stays for celebrations, will be deprecated eventually
   - What's unclear: When can group_id be made truly optional vs removed?
   - Recommendation: Keep group_id nullable but populated during v1.7. Document deprecation in Phase 43 verification. Remove in v1.8+ after celebrations migrated to wishlist-based model.

4. **Empty wishlist_id for items with no user_id**
   - What we know: Some test/legacy items may have NULL user_id
   - What's unclear: What happens to orphaned items?
   - Recommendation: Leave wishlist_id NULL for orphaned items. Add validation query to surface them. Manual cleanup or Phase 43 enforcement.

## Sources

### Primary (HIGH confidence)
- Existing migration `20260210000001_v1.4_friends_system_foundation.sql` -- Pattern template for tables, RLS, functions
- Existing migration `20260206000001_v1.3_claims_details_notes.sql` -- Celebrant exclusion RLS pattern
- Existing migration `20260202000004_fix_wishlist_rls.sql` -- Current wishlist_items RLS policies
- v1.7 Research `SUMMARY.md` -- Phase 37 architecture and pitfalls
- v1.7 Research `FEATURES-v1.7.md` -- Multi-wishlist schema design

### Secondary (MEDIUM confidence)
- v1.7 Research `PITFALLS-URL-SHARE.md` -- RLS policy conflict warnings
- Existing codebase analysis -- All 34 migrations reviewed for patterns
- PlanetScale expand-and-contract pattern -- Industry standard migration approach

### Tertiary (LOW confidence, validate during implementation)
- Visibility enforcement timing -- May need adjustment based on celebration page testing
- New user trigger location -- Test both auth.users and public.users insertion points

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies, follows existing patterns exactly
- Architecture: HIGH -- Patterns proven in codebase (friends system, gift claims)
- Pitfalls: HIGH -- Documented in v1.7 research with specific mitigations, verified against existing RLS

**Research date:** 2026-02-16
**Valid until:** 90 days (stable database patterns, no external dependencies)
