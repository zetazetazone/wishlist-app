# Phase 6: Schema Foundation - Research

**Researched:** 2026-02-02
**Domain:** PostgreSQL schema design (Supabase), RLS policies, migrations
**Confidence:** HIGH

## Summary

This phase extends the existing Supabase PostgreSQL database to support two new features: group favorites (one per user per group) and special item types (standard, surprise_me, mystery_box). The research focused on the best approach for implementing these features while maintaining backward compatibility with existing data and following established project patterns.

The project already has a mature schema with 10 migrations, established RLS patterns using `security definer` functions to avoid recursion, and TypeScript types in `types/database.types.ts`. The new schema additions must follow these existing conventions.

**Primary recommendation:** Use CHECK constraints instead of enums for `item_type`, add a `group_favorites` table with a partial unique index, and extend `wishlist_items` with `item_type` and `mystery_box_tier` columns. Generate updated TypeScript types after migration.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase (PostgreSQL) | Current | Database, RLS, migrations | Already in use - project standard |
| supabase CLI | Latest | Local development, migrations | Used for all existing migrations |
| TypeScript | 5.9.2 | Type safety | Project-wide standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | 2.93.3 | Client SDK | All database operations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CHECK constraint | PostgreSQL ENUM | ENUMs cannot have values removed safely; CHECK constraints are more flexible for future changes |
| Separate favorites table | Column on wishlist_items | Table approach allows proper unique constraint and cleaner RLS policies |

**Installation:**
No new packages needed - all infrastructure already in place.

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  migrations/
    20260202000011_schema_foundation.sql  # New migration file
types/
  database.types.ts                       # Regenerate after migration
```

### Pattern 1: CHECK Constraint for Item Types
**What:** Use TEXT column with CHECK constraint instead of ENUM for item_type
**When to use:** When values may need to change in future and you want operational flexibility
**Why:** ENUMs cannot have values removed safely. CHECK constraints can be modified without table locks.
**Example:**
```sql
-- Source: https://www.crunchydata.com/blog/enums-vs-check-constraints-in-postgres
ALTER TABLE public.wishlist_items
ADD COLUMN item_type TEXT CHECK (item_type IN ('standard', 'surprise_me', 'mystery_box')) DEFAULT 'standard';
```

### Pattern 2: Partial Unique Index for One-Favorite-Per-Group
**What:** Use partial unique index to enforce "only one favorite per user per group"
**When to use:** When uniqueness constraint applies to subset of rows
**Why:** Standard UNIQUE constraint cannot be partial; partial index allows multiple non-favorite items while enforcing single favorite
**Example:**
```sql
-- Source: https://www.postgresql.org/docs/current/indexes-partial.html
-- Only one favorite allowed per user per group
CREATE UNIQUE INDEX idx_group_favorites_one_per_user_group
ON public.group_favorites (user_id, group_id);
```

### Pattern 3: Security Definer Functions for RLS
**What:** Use security definer functions to check group membership
**When to use:** When RLS policies need to query tables that themselves have RLS (avoids recursion)
**Why:** Project already uses this pattern (see `is_group_member` function)
**Example:**
```sql
-- Source: Existing pattern in 20260202000003_fix_group_members_recursion.sql
-- Reuse existing function:
public.is_group_member(group_id, auth.uid())
```

### Pattern 4: Nullable Foreign Key for Optional Item Reference
**What:** group_favorites.item_id references wishlist_items with ON DELETE CASCADE
**When to use:** When favorite must be linked to a specific wishlist item
**Why:** Ensures referential integrity; cascade delete removes favorite when item is deleted

### Anti-Patterns to Avoid
- **Using ENUM for item_type:** ENUMs cannot have values removed once created. If you need to remove 'mystery_box' later, you're stuck.
- **Storing favorite status on wishlist_items:** Would require complex constraint to enforce one-per-group-per-user. Separate table is cleaner.
- **Direct group_members queries in RLS:** Causes infinite recursion. Always use `is_group_member()` function.
- **Missing indexes on RLS columns:** Performance disaster. Always index columns used in RLS policies.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Group membership check | Subquery in RLS | `public.is_group_member()` | Already exists, avoids recursion |
| One favorite per group | Application logic | Partial unique index | Database enforces constraint |
| Item type validation | Application validation | CHECK constraint | Database enforces, cannot be bypassed |
| Cascade deletes | Application triggers | ON DELETE CASCADE | Built-in, atomic, cannot fail |

**Key insight:** PostgreSQL constraints and indexes handle these edge cases automatically and atomically. Application-level enforcement can fail, be bypassed, or have race conditions.

## Common Pitfalls

### Pitfall 1: RLS Recursion
**What goes wrong:** RLS policy on table A queries table B, which has RLS that queries table A
**Why it happens:** Group membership checks often cause this
**How to avoid:** Use existing `public.is_group_member()` security definer function
**Warning signs:** "infinite recursion" errors when querying tables

### Pitfall 2: ENUM Lock on Modify
**What goes wrong:** ALTER TYPE on ENUM acquires ACCESS EXCLUSIVE lock, blocking all queries
**Why it happens:** ENUM modification requires full table scan
**How to avoid:** Use CHECK constraints instead of ENUMs
**Warning signs:** Long-running migrations, database unresponsive during deploy

### Pitfall 3: Missing RLS on New Tables
**What goes wrong:** New table accessible to anyone with anon key
**Why it happens:** Forgetting to enable RLS after CREATE TABLE
**How to avoid:** Always add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` immediately after CREATE
**Warning signs:** Security scanner warnings, data visible when it shouldn't be

### Pitfall 4: Forgetting Default Values for Existing Rows
**What goes wrong:** Adding NOT NULL column without default fails on existing data
**Why it happens:** Existing rows have no value for new column
**How to avoid:** Always use DEFAULT for new columns, or make nullable initially
**Warning signs:** Migration fails with "null value in column" error

### Pitfall 5: Missing Indexes on Foreign Keys
**What goes wrong:** Slow queries when joining or filtering on foreign key columns
**Why it happens:** PostgreSQL doesn't auto-create indexes on FK columns
**How to avoid:** Explicitly create indexes on all FK columns used in queries
**Warning signs:** Slow query performance, sequential scans in EXPLAIN

## Code Examples

Verified patterns from official sources and existing project conventions:

### Creating the group_favorites Table
```sql
-- Source: Project pattern + PostgreSQL docs
CREATE TABLE IF NOT EXISTS public.group_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.wishlist_items(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, group_id)  -- Enforces one favorite per user per group
);
```

### Adding item_type to wishlist_items
```sql
-- Source: https://www.crunchydata.com/blog/enums-vs-check-constraints-in-postgres
ALTER TABLE public.wishlist_items
ADD COLUMN item_type TEXT CHECK (item_type IN ('standard', 'surprise_me', 'mystery_box')) DEFAULT 'standard';

ALTER TABLE public.wishlist_items
ADD COLUMN mystery_box_tier NUMERIC CHECK (mystery_box_tier IN (25, 50, 100));

-- Add constraint: mystery_box_tier only valid when item_type is mystery_box
ALTER TABLE public.wishlist_items
ADD CONSTRAINT mystery_box_tier_requires_type
CHECK (
  (item_type = 'mystery_box' AND mystery_box_tier IS NOT NULL)
  OR
  (item_type != 'mystery_box' AND mystery_box_tier IS NULL)
);
```

### RLS Policies for group_favorites
```sql
-- Source: Project pattern from celebrations migration
-- Enable RLS
ALTER TABLE public.group_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view favorites in their groups
CREATE POLICY "Users can view group favorites"
  ON public.group_favorites FOR SELECT
  USING (
    public.is_group_member(group_id, (SELECT auth.uid()))
  );

-- Users can manage their own favorites
CREATE POLICY "Users can insert own favorites"
  ON public.group_favorites FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.is_group_member(group_id, (SELECT auth.uid()))
  );

CREATE POLICY "Users can update own favorites"
  ON public.group_favorites FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own favorites"
  ON public.group_favorites FOR DELETE
  USING (user_id = (SELECT auth.uid()));
```

### Index Creation
```sql
-- Source: Supabase RLS performance docs
CREATE INDEX idx_group_favorites_user ON public.group_favorites(user_id);
CREATE INDEX idx_group_favorites_group ON public.group_favorites(group_id);
CREATE INDEX idx_group_favorites_item ON public.group_favorites(item_id);
CREATE INDEX idx_wishlist_items_type ON public.wishlist_items(item_type);
```

### TypeScript Type Updates
```typescript
// After running: npx supabase gen types typescript --local > types/database.types.ts
// Expected additions to Database interface:

// In wishlist_items:
item_type: 'standard' | 'surprise_me' | 'mystery_box'
mystery_box_tier: 25 | 50 | 100 | null

// New table:
group_favorites: {
  Row: {
    id: string
    user_id: string
    group_id: string
    item_id: string
    created_at: string
    updated_at: string
  }
  // ... Insert and Update types
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PostgreSQL ENUM | CHECK constraint | Always preferred for flexible schemas | Easier migrations, no table locks |
| Multiple permissive policies | Single policy with OR conditions | Performance optimization | Fewer policy evaluations |
| Raw auth.uid() in policies | (SELECT auth.uid()) wrapped | Performance optimization | Query planner caches result |

**Deprecated/outdated:**
- Direct ENUM usage for values that might change: Use CHECK constraints instead
- Subqueries on RLS-protected tables in policies: Use security definer functions

## Open Questions

Things that couldn't be fully resolved:

1. **Should surprise_me items have a budget field?**
   - What we know: SPEC-02 mentions "optional budget guidance"
   - What's unclear: Is this a range, a max, or a text hint?
   - Recommendation: Add nullable `surprise_me_budget` NUMERIC column now; can be replaced with text field if range is needed

2. **How should favorites display for the favorite owner vs other members?**
   - What we know: FAV-02 says "pinned to top for other group members"
   - What's unclear: Does the owner see the pin too, or just others?
   - Recommendation: Planner to determine in Phase 9; schema supports either approach

## Sources

### Primary (HIGH confidence)
- [Supabase PostgreSQL ENUM docs](https://supabase.com/docs/guides/database/postgres/enums) - ENUM creation and limitations
- [Supabase RLS docs](https://supabase.com/docs/guides/auth/row-level-security) - RLS patterns and performance
- [PostgreSQL Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html) - Unique subset constraints
- [Crunchy Data: ENUMs vs CHECK](https://www.crunchydata.com/blog/enums-vs-check-constraints-in-postgres) - Decision framework

### Secondary (MEDIUM confidence)
- [Supabase Migration Best Practices](https://supabase.com/docs/guides/deployment/database-migrations) - Migration workflow
- [Supabase RLS Performance](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - Optimization patterns

### Project Sources (HIGH confidence)
- `/home/zetaz/wishlist-app/supabase/migrations/20260202000003_fix_group_members_recursion.sql` - is_group_member pattern
- `/home/zetaz/wishlist-app/supabase/migrations/20260202000005_celebrations.sql` - RLS policy patterns
- `/home/zetaz/wishlist-app/types/database.types.ts` - Current type structure

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project infrastructure
- Architecture: HIGH - Patterns verified against official docs and existing migrations
- Pitfalls: HIGH - Based on official Supabase warnings and project history

**Research date:** 2026-02-02
**Valid until:** 60 days (stable schema patterns, not fast-moving)
