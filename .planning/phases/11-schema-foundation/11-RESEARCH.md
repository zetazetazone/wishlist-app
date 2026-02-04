# Phase 11: Schema Foundation - Research

**Researched:** 2026-02-04
**Domain:** PostgreSQL schema design (Supabase), column additions, CHECK constraints
**Confidence:** HIGH

## Summary

This phase extends the existing `groups` table to support v1.2 Group Experience features: group modes (greetings vs gifts), budget approaches (per-gift/monthly/yearly), budget amounts for pooled budgets, descriptions, and photo URLs. The research focused on safe column addition strategies, CHECK constraint patterns vs ENUMs, and backward compatibility.

The project has established migration patterns from 17 existing migrations. Phase 6 (Schema Foundation) set the precedent for using CHECK constraints over ENUMs for flexibility. The `groups` table currently has 6 columns (id, name, created_by, budget_limit_per_gift, created_at, updated_at) with no invite_code column yet visible in migrations.

All new columns can be added safely with nullable defaults or explicit DEFAULT values. The existing RLS policies on the `groups` table require no changes—new columns follow the same access patterns (members can SELECT, admins can UPDATE). The `avatars` storage bucket already exists from Phase 7 with established RLS policies.

**Primary recommendation:** Add 5 new columns to `groups` table using CHECK constraints for mode and budget_approach enums, with all columns nullable except mode (default 'gifts'). Use single ALTER TABLE statement with multiple ADD COLUMN clauses for atomic migration. Follow Phase 6 pattern for CHECK constraints.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase (PostgreSQL) | 15.x | Database, RLS, migrations | Project standard since v1.0 |
| supabase CLI | Latest | Migration management | Used for all 17 existing migrations |
| TypeScript | 5.9.2 | Type safety | Project-wide standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | 2.93.3 | Client SDK | All database operations |
| npx supabase gen types | CLI | TypeScript generation | After schema changes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CHECK constraint | PostgreSQL ENUM | ENUMs cannot have values removed safely; Phase 6 established CHECK as project pattern |
| Multiple migrations | Single migration | Multiple files increase complexity; single file is atomic |
| NOT NULL columns | Nullable columns | NOT NULL requires backfill for existing data; nullable safer for existing groups |

**Installation:**
No new packages needed - all infrastructure already in place.

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  migrations/
    20260204000003_v1.2_groups_schema.sql  # New migration file
types/
  database.types.ts                         # Regenerate after migration
```

### Pattern 1: CHECK Constraint for Mode and Budget Approach
**What:** Use TEXT column with CHECK constraint instead of ENUM for constrained string values
**When to use:** When values are fixed but may need modification in future
**Why:** CHECK constraints can be modified without table locks; project pattern from Phase 6
**Example:**
```sql
-- Source: Phase 6 pattern, Crunchy Data best practices
ALTER TABLE public.groups
ADD COLUMN mode TEXT CHECK (mode IN ('greetings', 'gifts')) DEFAULT 'gifts' NOT NULL;

ALTER TABLE public.groups
ADD COLUMN budget_approach TEXT CHECK (budget_approach IN ('per_gift', 'monthly', 'yearly'));
```

### Pattern 2: Atomic Multi-Column Addition
**What:** Add multiple columns in single ALTER TABLE statement
**When to use:** When adding related columns that should be deployed together
**Why:** Atomic operation ensures consistency; avoids partial migration state
**Example:**
```sql
-- Source: PostgreSQL docs, project pattern
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS mode TEXT CHECK (mode IN ('greetings', 'gifts')) DEFAULT 'gifts' NOT NULL,
ADD COLUMN IF NOT EXISTS budget_approach TEXT CHECK (budget_approach IN ('per_gift', 'monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS budget_amount INTEGER CHECK (budget_amount > 0),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

### Pattern 3: Nullable Columns for Optional Fields
**What:** Use nullable columns for optional group features
**When to use:** When field is truly optional and has no required default
**Why:** Avoids meaningless default values; existing groups don't need backfill
**Example:**
```sql
-- Source: Project pattern from Phase 6
-- budget_approach, budget_amount, description, photo_url all nullable
-- Only mode has required default since every group has a mode
```

### Pattern 4: Storage Path Convention
**What:** Store relative storage paths in photo_url column
**When to use:** When referencing Supabase storage objects
**Why:** Matches existing avatar_url pattern from users table
**Example:**
```sql
-- photo_url stores paths like: groups/{groupId}/{timestamp}.jpg
-- Full URL constructed client-side: supabase.storage.from('avatars').getPublicUrl(photo_url)
```

### Anti-Patterns to Avoid
- **Using ENUM for mode/budget_approach:** Cannot remove values safely; Phase 6 established CHECK as standard
- **Adding NOT NULL without DEFAULT on optional fields:** Fails for existing groups; nullable is safer
- **Separate migration per column:** Creates unnecessary migration files; atomic operation preferred
- **Storing full storage URLs:** Bucket URLs can change; store paths only (matches user avatar pattern)
- **Adding indexes prematurely:** These columns won't be queried frequently; avoid index bloat

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Group photo storage | Custom file handling | Existing avatars bucket + RLS | Phase 7 established pattern, policies exist |
| Mode validation | Application logic | CHECK constraint | Database enforces, cannot be bypassed |
| Budget approach validation | Client-side validation | CHECK constraint | Server-side enforcement required |
| TypeScript types | Manual type definitions | npx supabase gen types | Auto-generated, always in sync |
| RLS policies for new columns | New policies | Existing group policies | New columns inherit existing SELECT/UPDATE rules |

**Key insight:** The existing `groups` RLS policies already cover new columns. "Users can view their groups" applies to all columns; "Admins can update their groups" applies to all columns. No policy changes needed.

## Common Pitfalls

### Pitfall 1: Adding NOT NULL to Optional Fields
**What goes wrong:** Migration fails for existing groups that don't have values for new optional fields
**Why it happens:** Existing rows have NULL for new columns
**How to avoid:** Only use NOT NULL + DEFAULT for required fields (mode); leave others nullable
**Warning signs:** Migration error "column X of relation groups contains null values"

### Pitfall 2: Using ENUM Instead of CHECK
**What goes wrong:** Cannot remove ENUM values later if requirements change
**Why it happens:** ENUMs seem cleaner but are inflexible
**How to avoid:** Follow Phase 6 precedent: use TEXT with CHECK constraint
**Warning signs:** Need to remove a mode or budget approach but cannot

### Pitfall 3: Forgetting IF NOT EXISTS
**What goes wrong:** Migration fails on re-run or if columns added manually
**Why it happens:** Development/production sync issues
**How to avoid:** Always use IF NOT EXISTS for idempotency
**Warning signs:** "column already exists" error

### Pitfall 4: Incorrect Budget Amount Check Constraint
**What goes wrong:** Allows negative or zero budget amounts
**Why it happens:** Missing CHECK constraint on numeric column
**How to avoid:** Add CHECK (budget_amount > 0) constraint
**Warning signs:** Invalid budget amounts in database

### Pitfall 5: Missing DEFAULT on mode Column
**What goes wrong:** Existing groups have NULL mode after migration
**Why it happens:** Forgot DEFAULT when adding NOT NULL column
**How to avoid:** Use DEFAULT 'gifts' NOT NULL for mode (every group needs a mode)
**Warning signs:** NULL mode breaks UI that expects 'greetings' or 'gifts'

### Pitfall 6: Storing Full Storage URLs
**What goes wrong:** URLs break if bucket configuration changes
**Why it happens:** Copying pattern from external image URLs
**How to avoid:** Store relative paths only (groups/{groupId}/photo.jpg), construct full URL client-side
**Warning signs:** Hardcoded bucket URLs in database

## Code Examples

Verified patterns from official sources and existing project conventions:

### Complete Migration File
```sql
-- Source: Phase 6 pattern + PostgreSQL docs
-- v1.2 Groups Schema Foundation
-- Adds mode, budget approach, budget amount, description, and photo URL columns

-- ============================================
-- PART 1: Extend groups table
-- ============================================

-- Add new columns for group customization and modes
-- Uses CHECK constraints (not ENUMs) following Phase 6 pattern
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS mode TEXT CHECK (mode IN ('greetings', 'gifts')) DEFAULT 'gifts' NOT NULL,
ADD COLUMN IF NOT EXISTS budget_approach TEXT CHECK (budget_approach IN ('per_gift', 'monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS budget_amount INTEGER CHECK (budget_amount > 0),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.groups.mode IS 'Group mode: greetings (no gift coordination) or gifts (full features)';
COMMENT ON COLUMN public.groups.budget_approach IS 'Budget tracking approach: per_gift (existing), monthly (pooled per month), yearly (annual pool)';
COMMENT ON COLUMN public.groups.budget_amount IS 'Budget amount for monthly/yearly approaches (cents); NULL for per_gift';
COMMENT ON COLUMN public.groups.description IS 'Optional group description/tagline';
COMMENT ON COLUMN public.groups.photo_url IS 'Storage path to group photo (avatars bucket): groups/{groupId}/{timestamp}.{ext}';

-- ============================================
-- PART 2: Data integrity constraints
-- ============================================

-- Constraint: budget_amount only valid for monthly/yearly approaches
ALTER TABLE public.groups
ADD CONSTRAINT budget_amount_requires_approach CHECK (
  (budget_approach IN ('monthly', 'yearly') AND budget_amount IS NOT NULL)
  OR
  (budget_approach = 'per_gift' AND budget_amount IS NULL)
  OR
  (budget_approach IS NULL AND budget_amount IS NULL)
);

-- ============================================
-- COMPLETED
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'v1.2 Groups Schema Foundation migration completed!';
  RAISE NOTICE 'Added to groups: mode, budget_approach, budget_amount, description, photo_url';
  RAISE NOTICE 'Constraint: budget_amount requires monthly/yearly approach';
  RAISE NOTICE 'Default mode: gifts (maintains backward compatibility)';
END $$;
```

### TypeScript Type Updates
```typescript
// After running: npx supabase gen types typescript --local > types/database.types.ts
// Expected additions to groups type:

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string
          name: string
          created_by: string
          budget_limit_per_gift: number
          mode: 'greetings' | 'gifts'              // NEW
          budget_approach: 'per_gift' | 'monthly' | 'yearly' | null  // NEW
          budget_amount: number | null             // NEW
          description: string | null               // NEW
          photo_url: string | null                 // NEW
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          budget_limit_per_gift?: number
          mode?: 'greetings' | 'gifts'             // NEW with default
          budget_approach?: 'per_gift' | 'monthly' | 'yearly' | null  // NEW
          budget_amount?: number | null            // NEW
          description?: string | null              // NEW
          photo_url?: string | null                // NEW
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          budget_limit_per_gift?: number
          mode?: 'greetings' | 'gifts'             // NEW
          budget_approach?: 'per_gift' | 'monthly' | 'yearly' | null  // NEW
          budget_amount?: number | null            // NEW
          description?: string | null              // NEW
          photo_url?: string | null                // NEW
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
```

### Storage Path Pattern (Phase 12 will implement)
```typescript
// Source: Phase 7 avatar upload pattern
// Group photo storage paths follow convention:
// avatars/groups/{groupId}/{timestamp}.{ext}

// Example paths:
// - avatars/groups/uuid-123/1709571234567.jpg
// - avatars/groups/uuid-456/1709571234568.png

// Client-side URL construction:
const { data } = supabase.storage.from('avatars').getPublicUrl(group.photo_url)
// Returns: https://project.supabase.co/storage/v1/object/public/avatars/groups/uuid-123/1709571234567.jpg
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PostgreSQL ENUM | CHECK constraint | Phase 6 (Feb 2024) | More flexible schema evolution |
| Multiple ALTER statements | Single atomic ALTER | Project standard | Atomic migrations, cleaner |
| NOT NULL on optional fields | Nullable with validation | Project standard | Safer for existing data |
| Separate type table for modes | Inline CHECK constraint | Project standard | Simpler schema, fewer joins |

**Deprecated/outdated:**
- Using ENUM for constrained strings: Phase 6 established CHECK constraints as project standard
- Storing full storage URLs: Store paths only (matches user avatar pattern from Phase 7)

## Open Questions

Things that couldn't be fully resolved:

1. **Should groups have an invite_code column?**
   - What we know: Phase description mentions invite_code; ROADMAP mentions "view and regenerate invite code"
   - What's unclear: No invite_code column found in existing migrations; may exist in production schema
   - Recommendation: Verify production schema; if missing, add invite_code TEXT UNIQUE column in this migration

2. **Should budget_amount be stored in cents (INTEGER) or dollars (NUMERIC)?**
   - What we know: Existing budget_limit_per_gift is NUMERIC; Phase 6 used NUMERIC for prices
   - What's unclear: Whether to match existing pattern or use INTEGER for budget_amount
   - Recommendation: Use INTEGER for budget_amount (cents) to avoid floating point issues; matches financial best practice

3. **Should mode values be 'greetings'/'gifts' or 'greetings_only'/'gifts'?**
   - What we know: ARCHITECTURE.md uses 'greetings_only'; ROADMAP uses "Greetings or Gifts"
   - What's unclear: Exact enum values to use
   - Recommendation: Use 'greetings' and 'gifts' for simplicity (matches UI language better)

4. **Does the avatars bucket support subdirectories?**
   - What we know: Phase 7 created avatars bucket; users store at avatars/{userId}/{timestamp}.{ext}
   - What's unclear: Whether groups/{groupId}/ subdirectory pattern is supported
   - Recommendation: Confirmed via Supabase docs—storage supports nested paths; use avatars/groups/{groupId}/ pattern

## Sources

### Primary (HIGH confidence)
- [Enums vs Check Constraints in Postgres](https://www.crunchydata.com/blog/enums-vs-check-constraints-in-postgres) - Decision framework for CHECK vs ENUM
- [PostgreSQL ALTER TABLE docs](https://www.postgresql.org/docs/current/sql-altertable.html) - Column addition syntax
- [Supabase Storage docs](https://supabase.com/docs/guides/storage) - Storage path patterns
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) - RLS for storage
- [Managing Enums in Postgres | Supabase Docs](https://supabase.com/docs/guides/database/postgres/enums) - ENUM limitations

### Secondary (MEDIUM confidence)
- [Native enums or CHECK constraints in PostgreSQL?](https://making.close.com/posts/native-enums-or-check-constraints-in-postgresql/) - Production experience with CHECK vs ENUM
- [Database ENUMs vs Constrained VARCHAR](https://medium.com/@zulfikarditya/database-enums-vs-constrained-varchar-a-technical-deep-dive-for-modern-applications-30d9d6bba9f8) - Technical deep dive

### Project Sources (HIGH confidence)
- `/home/zetaz/wishlist-app/supabase/migrations/20260202000011_schema_foundation.sql` - Phase 6 CHECK constraint pattern
- `/home/zetaz/wishlist-app/supabase/migrations/20260204000002_avatars_storage_policies.sql` - Storage RLS pattern
- `/home/zetaz/wishlist-app/.planning/research/ARCHITECTURE.md` - v1.2 schema requirements
- `/home/zetaz/wishlist-app/.planning/ROADMAP.md` - Phase 11 success criteria

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project infrastructure, 17 migrations establish patterns
- Architecture: HIGH - Patterns verified against Phase 6 and official Supabase/PostgreSQL docs
- Pitfalls: HIGH - Based on Phase 6 learnings and PostgreSQL best practices

**Research date:** 2026-02-04
**Valid until:** 60 days (stable schema patterns, not fast-moving)
