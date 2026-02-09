# Phase 18: Schema & Atomic Functions - Research

**Researched:** 2026-02-05
**Domain:** PostgreSQL schema design, atomic RPC functions, RLS visibility patterns, JSONB storage
**Confidence:** HIGH

## Summary

Phase 18 creates the database foundation for three features: gift claims, personal details, and member notes. This phase produces tables, RPC functions, RLS policies, and indexes -- no UI screens. The critical challenge is implementing three distinct RLS visibility patterns that must coexist without confusion: full exclusion (existing, for chat/contributions), partial visibility (new, for claims where celebrant sees "claimed" but not who), and subject exclusion (new, for notes where the note's subject cannot see notes about themselves).

The user locked two architectural decisions that diverge from the prior research:

1. **Claims are global per item (NOT per-celebration)** -- once an item is claimed, it is claimed everywhere, across all groups. This simplifies the schema (no `celebration_id` FK on claims) but changes the uniqueness constraint from the prior research.
2. **Notes allow multiple per author** (not one per author per subject per group with UNIQUE constraint) -- each member can write separate notes, and can only delete (not edit) them.

The schema design uses a separate `gift_claims` table (not columns on `wishlist_items`) to prevent RLS leaks, an atomic RPC function for race-condition-safe claiming, a SECURITY DEFINER function for celebrant partial visibility, JSONB columns on `personal_details` for flexible preference storage, and a `member_notes` table with subject-exclusion RLS.

---

## Architecture Analysis

### Key Decision: Global Claims vs Celebration-Scoped Claims

The prior research (ARCHITECTURE.md) assumed celebration-scoped claims (`celebration_id` FK on `gift_claims`). The CONTEXT.md overrides this:

> Claims are **global per item** (not per-celebration) -- once claimed, the item is claimed everywhere.

**Impact on schema design:**

| Aspect | Celebration-Scoped (Prior Research) | Global Per-Item (CONTEXT Decision) |
|--------|-------------------------------------|-------------------------------------|
| Primary key pattern | `(wishlist_item_id, celebration_id)` | `(wishlist_item_id)` for full claims |
| Partial unique index | `WHERE claim_type = 'full'` on `(item_id, celebration_id)` | `WHERE claim_type = 'full'` on `(wishlist_item_id)` only |
| RLS for non-celebrants | Join through celebrations + group_members | Must find groups via `wishlist_items.group_id` or `wishlist_items.user_id` |
| RLS for celebrant | Filter via `celebrations.celebrant_id` | Filter via `wishlist_items.user_id` (item owner = celebrant) |
| Cross-group visibility | Different claim state per celebration | Single claim state visible from all groups |

**RLS implication:** Without `celebration_id`, we cannot use the existing celebrant-exclusion join pattern (`celebrations.celebrant_id != auth.uid()`). Instead, we determine the celebrant via `wishlist_items.user_id` -- the item owner IS the celebrant who should see limited data.

**Recommended RLS approach for global claims:**

Non-celebrant visibility: Any authenticated user who shares a group with the item owner can view full claim details. The check uses: "current user is a member of at least one group where the item's owner is also a member."

Celebrant exclusion: The item owner (`wishlist_items.user_id = auth.uid()`) is excluded from SELECT on `gift_claims`. The celebrant sees claim status only via the SECURITY DEFINER function `get_item_claim_status()`.

### Key Decision: Multiple Notes Per Author

The prior research assumed `UNIQUE(group_id, about_user_id, author_id)` for one note per author per subject per group with upsert. The CONTEXT.md overrides this:

> **Multiple notes per author** -- each member can write separate notes about someone (shared intelligence board).
> **Delete only, no editing** -- author can delete but not edit; must delete and rewrite.
> **Short notes** -- capped at ~280 characters.

**Impact:** No UNIQUE constraint on author. No UPDATE policy needed (delete-only, no editing). Need CHECK constraint on content length. The notes model becomes a simple append-and-delete log rather than an upsert pattern.

---

## Table Designs

### Table 1: `gift_claims`

```sql
CREATE TABLE public.gift_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_item_id UUID REFERENCES public.wishlist_items(id) ON DELETE CASCADE NOT NULL,
  claimed_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  claim_type TEXT CHECK (claim_type IN ('full', 'split')) DEFAULT 'full',
  amount NUMERIC CHECK (amount IS NULL OR amount > 0),  -- For split: dollar amount pledged
  status TEXT CHECK (status IN ('claimed', 'purchased', 'delivered')) DEFAULT 'claimed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Design rationale:**

| Decision | Rationale |
|----------|-----------|
| Separate table (not columns on wishlist_items) | Prevents RLS leaks -- item owner can see items but cannot see claims table rows. Locked decision from STATE.md. |
| No `celebration_id` FK | Claims are global per item (CONTEXT decision). Item claimed once, everywhere. |
| `claim_type` CHECK | Distinguishes full claims from split contributions. Schema ready from day one (CONTEXT decision). |
| `amount` nullable | Only relevant for split claims. Full claims have NULL amount. |
| `status` lifecycle | `claimed` -> `purchased` -> `delivered` tracks gift progress. Hidden from celebrant. |
| `claimed_by` NOT NULL | Every claim has an owner. Uses `auth.uid()` enforcement in RLS. |

**Uniqueness constraint for full claims:**

```sql
-- Only one full claim per item (globally)
CREATE UNIQUE INDEX idx_gift_claims_full_unique
  ON public.gift_claims(wishlist_item_id)
  WHERE claim_type = 'full';
```

This allows unlimited split claims but prevents duplicate full claims on the same item. The partial unique index follows the established pattern from Phase 6 (group_favorites).

**Indexes:**

```sql
CREATE INDEX idx_gift_claims_item ON public.gift_claims(wishlist_item_id);
CREATE INDEX idx_gift_claims_claimer ON public.gift_claims(claimed_by);
```

The `wishlist_item_id` index is critical for the claim lookup query (find claims for items in a celebration). The `claimed_by` index supports "my claims" queries and DELETE policy evaluation.

### Table 2: `personal_details`

```sql
CREATE TABLE public.personal_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- Clothing sizes (all optional, JSONB for flexibility)
  sizes JSONB DEFAULT '{}',
  -- Preferences (predefined + custom tags)
  preferences JSONB DEFAULT '{}',
  -- External wishlist links
  external_links JSONB DEFAULT '[]',
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Design rationale:**

| Decision | Rationale |
|----------|-----------|
| Separate table (not columns on users) | Different access patterns, optional data, avoids bloating users table. Locked decision from STATE.md. |
| `UNIQUE(user_id)` | One row per user. Global personal details (CONTEXT decision), not per-group. |
| Three JSONB columns | Groups related data logically: sizes, preferences, external_links. Avoids schema migrations for new preference types (CONTEXT decision: all stored in JSONB). |
| No fixed clothing columns | CONTEXT specifies extended sizes (shirt, shoe, pants, ring, dress, jacket/coat) -- all optional. JSONB handles this flexibility without 6+ nullable columns. |

**JSONB Shape (Claude's Discretion):**

```typescript
// sizes JSONB structure
interface Sizes {
  shirt?: string;      // "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL"
  shoe?: string;       // Free text: "10 US", "42 EU"
  pants?: string;      // Free text: "32x30", "M"
  ring?: string;       // Free text: "7", "M"
  dress?: string;      // Free text: "8", "M"
  jacket?: string;     // Free text: "L", "42R"
}

// preferences JSONB structure
interface Preferences {
  colors?: Array<{ label: string; custom?: boolean }>;
  brands?: Array<{ label: string; custom?: boolean }>;
  interests?: Array<{ label: string; custom?: boolean }>;
  dislikes?: Array<{ label: string; custom?: boolean }>;
}

// external_links JSONB structure -- array of link objects
type ExternalLinks = Array<{
  url: string;
  label?: string;       // Optional display label
  platform?: string;    // Optional: "amazon", "pinterest", "etsy", "other"
}>;
```

**Recommendation: Tag structure for preferences.** The `{ label, custom }` pattern distinguishes predefined tags (e.g., "Red", "Blue" from a picker) from custom user-entered tags (e.g., "Sage green"). The `custom` flag is optional -- if absent, the tag is treated as predefined. This supports the CONTEXT requirement of "predefined + custom tags" without separate columns.

**Recommendation: External link validation (Claude's Discretion).** Use basic URL format validation only (starts with `http://` or `https://`, valid URL format). Do NOT validate against a list of known platforms -- users may link to any store, registry, or website. Platform detection (showing Amazon/Pinterest icons) can be done client-side by parsing the URL hostname, not by restricting input.

**pg_jsonschema validation:**

```sql
-- Validate sizes is an object with string values
ALTER TABLE public.personal_details
ADD CONSTRAINT sizes_schema CHECK (
  sizes IS NULL OR
  extensions.jsonb_matches_schema(
    '{"type": "object", "additionalProperties": {"type": "string"}}',
    sizes
  )
);

-- Validate external_links is an array of objects with url string
ALTER TABLE public.personal_details
ADD CONSTRAINT external_links_schema CHECK (
  external_links IS NULL OR
  extensions.jsonb_matches_schema(
    '{"type": "array", "items": {"type": "object", "required": ["url"], "properties": {"url": {"type": "string"}, "label": {"type": "string"}, "platform": {"type": "string"}}}}',
    external_links
  )
);
```

**Note on pg_jsonschema:** This extension is pre-installed on Supabase but needs `CREATE EXTENSION pg_jsonschema WITH SCHEMA extensions;` to enable. It provides database-level JSONB validation via CHECK constraints. If the extension is not available in the project's Supabase instance, the CHECK constraints can be omitted without functional impact -- client-side validation serves as fallback.

### Table 3: `member_notes`

```sql
CREATE TABLE public.member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  about_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Design rationale:**

| Decision | Rationale |
|----------|-----------|
| Per-group scoped | CONTEXT decision: note in Group A invisible in Group B. |
| No UNIQUE constraint | CONTEXT decision: multiple notes per author per subject. |
| `char_length(content) <= 280` | CONTEXT decision: tweet-length tips. CHECK constraint enforces at DB level. |
| No `updated_at` | CONTEXT decision: delete only, no editing. No UPDATE operation = no need for updated_at. |
| ON DELETE CASCADE on all FKs | Group deleted = notes deleted. User deleted = notes deleted (both as author and subject). |

**No UPDATE policy will be created.** The CONTEXT says "delete only, no editing." The author must delete and rewrite. This simplifies the RLS policy set.

**Indexes:**

```sql
CREATE INDEX idx_member_notes_group ON public.member_notes(group_id);
CREATE INDEX idx_member_notes_about ON public.member_notes(about_user_id);
CREATE INDEX idx_member_notes_author ON public.member_notes(author_id);
-- Composite for common query: "all notes about person X in group Y"
CREATE INDEX idx_member_notes_group_about ON public.member_notes(group_id, about_user_id);
```

---

## RLS Policies -- Three Visibility Patterns

### Pattern 1: Celebrant Full Exclusion (Existing)

Used by: `chat_rooms`, `chat_messages`, `celebration_contributions`

```sql
-- Celebrant cannot see ANY rows
WHERE c.celebrant_id != auth.uid()
```

No changes needed. Existing pattern remains intact.

### Pattern 2: Celebrant Partial Visibility (New -- Gift Claims)

The celebrant should NOT be able to SELECT from `gift_claims` at all. They get claim status via a SECURITY DEFINER function that returns only boolean `is_claimed`.

**RLS on gift_claims:**

```sql
ALTER TABLE public.gift_claims ENABLE ROW LEVEL SECURITY;

-- Non-celebrant view: Group members who share a group with the item owner can see full claim details
-- The item owner (celebrant) is excluded because their user_id matches the item's user_id
CREATE POLICY "Non-owners can view claims on group items"
  ON public.gift_claims FOR SELECT
  USING (
    -- The viewing user must NOT be the item owner
    NOT EXISTS (
      SELECT 1 FROM public.wishlist_items wi
      WHERE wi.id = gift_claims.wishlist_item_id
        AND wi.user_id = (SELECT auth.uid())
    )
    AND
    -- The viewing user must share at least one group with the item owner
    EXISTS (
      SELECT 1 FROM public.wishlist_items wi
      JOIN public.group_members gm_owner ON gm_owner.group_id = wi.group_id AND gm_owner.user_id = wi.user_id
      JOIN public.group_members gm_viewer ON gm_viewer.group_id = wi.group_id AND gm_viewer.user_id = (SELECT auth.uid())
      WHERE wi.id = gift_claims.wishlist_item_id
    )
  );
```

**Note on RLS performance:** The `(SELECT auth.uid())` pattern (wrapping in a subselect) is used throughout. Per Supabase docs, this causes PostgreSQL's query planner to cache the result via initPlan optimization, preventing per-row re-evaluation. Benchmarks show up to 95% performance improvement. This matches the established pattern used in Phase 6 group_favorites policies.

**Important consideration:** The existing `wishlist_items` RLS allows the item owner to see their own items. But claim data lives in a separate table with its own RLS. The item owner can see their items but CANNOT see who claimed them. This is exactly why the locked architectural decision chose a separate table over columns on `wishlist_items`.

**INSERT policy:**

```sql
-- Non-celebrants can create claims (cannot claim own items)
CREATE POLICY "Users can claim others items"
  ON public.gift_claims FOR INSERT
  WITH CHECK (
    claimed_by = (SELECT auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.wishlist_items wi
      WHERE wi.id = gift_claims.wishlist_item_id
        AND wi.user_id = (SELECT auth.uid())  -- Cannot claim own items
    )
    AND EXISTS (
      SELECT 1 FROM public.wishlist_items wi
      JOIN public.group_members gm ON gm.group_id = wi.group_id
      WHERE wi.id = gift_claims.wishlist_item_id
        AND gm.user_id = (SELECT auth.uid())  -- Must be in a group with the item
    )
  );
```

**UPDATE policy (status progression, notes):**

```sql
-- Claimers can update their own claims
CREATE POLICY "Claimers can update own claims"
  ON public.gift_claims FOR UPDATE
  USING (claimed_by = (SELECT auth.uid()));
```

**DELETE policy (unclaim):**

```sql
-- Claimers can delete their own claims (unclaim)
CREATE POLICY "Claimers can delete own claims"
  ON public.gift_claims FOR DELETE
  USING (claimed_by = (SELECT auth.uid()));
```

### Pattern 3: Subject Exclusion (New -- Member Notes)

```sql
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

-- Group members can view notes EXCEPT notes about themselves
CREATE POLICY "Group members can view notes except about self"
  ON public.member_notes FOR SELECT
  USING (
    about_user_id != (SELECT auth.uid())  -- HIDES notes about the current user
    AND public.is_group_member(group_id, (SELECT auth.uid()))
  );

-- Group members can create notes about others (not about themselves)
CREATE POLICY "Group members can create notes about others"
  ON public.member_notes FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND about_user_id != (SELECT auth.uid())  -- Cannot write notes about yourself
    AND public.is_group_member(group_id, (SELECT auth.uid()))
  );

-- Authors can delete their own notes (no UPDATE -- delete only per CONTEXT)
CREATE POLICY "Authors can delete own notes"
  ON public.member_notes FOR DELETE
  USING (author_id = (SELECT auth.uid()));
```

### Pattern for Personal Details

```sql
ALTER TABLE public.personal_details ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view personal details
-- (global per user, visible to anyone in the app)
CREATE POLICY "Authenticated users can view personal details"
  ON public.personal_details FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Users can insert their own details
CREATE POLICY "Users can insert own personal details"
  ON public.personal_details FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can update their own details
CREATE POLICY "Users can update own personal details"
  ON public.personal_details FOR UPDATE
  USING (user_id = (SELECT auth.uid()));
```

**Self-visibility of personal details (Claude's Discretion):** The celebrant CAN see and edit their own personal details. This is intentional -- personal details are self-authored profile information. There is no reason to hide your own sizes/preferences from yourself. The SELECT policy allows all authenticated users, which includes the owner.

---

## Atomic Claiming RPC Function

### Race Condition Prevention

The core challenge: two users simultaneously tap "Claim" on the same item. Without atomic enforcement, both succeed (read-then-write pattern), resulting in duplicate claims.

**Solution:** PostgreSQL atomic UPDATE with WHERE clause in an RPC function. The UPDATE and WHERE clause execute as a single atomic operation. Row-level locking ensures only one concurrent transaction succeeds.

```sql
CREATE OR REPLACE FUNCTION public.claim_item(
  p_wishlist_item_id UUID,
  p_claim_type TEXT DEFAULT 'full',
  p_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_item_owner_id UUID;
  v_item_group_id UUID;
  v_claim_id UUID;
  v_existing_full_claim UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get item details
  SELECT wi.user_id, wi.group_id INTO v_item_owner_id, v_item_group_id
  FROM public.wishlist_items wi
  WHERE wi.id = p_wishlist_item_id;

  IF v_item_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Cannot claim own items
  IF v_user_id = v_item_owner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot claim your own item');
  END IF;

  -- Must be in a group with the item
  IF NOT public.is_group_member(v_item_group_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a group member');
  END IF;

  -- Validate claim type
  IF p_claim_type NOT IN ('full', 'split') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid claim type');
  END IF;

  -- For full claims: check no existing full claim (atomic check)
  IF p_claim_type = 'full' THEN
    SELECT id INTO v_existing_full_claim
    FROM public.gift_claims
    WHERE wishlist_item_id = p_wishlist_item_id
      AND claim_type = 'full'
    FOR UPDATE SKIP LOCKED;  -- Lock the row if exists, skip if already locked

    IF v_existing_full_claim IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Item already claimed');
    END IF;
  END IF;

  -- For split claims: amount is required
  IF p_claim_type = 'split' AND (p_amount IS NULL OR p_amount <= 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Split claims require a positive amount');
  END IF;

  -- Insert the claim
  INSERT INTO public.gift_claims (wishlist_item_id, claimed_by, claim_type, amount)
  VALUES (p_wishlist_item_id, v_user_id, p_claim_type, p_amount)
  RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Partial unique index caught a duplicate full claim
    RETURN jsonb_build_object('success', false, 'error', 'Item already claimed');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

**Why SECURITY DEFINER here:** The function needs to read `wishlist_items` (to check ownership) and insert into `gift_claims`. Using SECURITY DEFINER allows the function to bypass RLS for these internal checks while applying its own authorization logic. The `SET search_path = ''` follows the Supabase security best practice to prevent schema injection.

**Race condition safety:** The partial unique index `idx_gift_claims_full_unique` on `(wishlist_item_id) WHERE claim_type = 'full'` provides the ultimate safety net. Even if the `FOR UPDATE SKIP LOCKED` check is somehow bypassed, the unique index constraint will reject the duplicate INSERT, caught by the `EXCEPTION WHEN unique_violation` handler.

**Client-side usage:**

```typescript
const { data, error } = await supabase.rpc('claim_item', {
  p_wishlist_item_id: itemId,
  p_claim_type: 'full',        // or 'split'
  p_amount: null,               // or amount for split
});

if (data?.success) {
  // Claim succeeded
  const claimId = data.claim_id;
} else {
  // Claim failed
  const errorMessage = data?.error || error?.message;
}
```

### Unclaim Function

**Recommendation (Claude's Discretion): Instant unclaim with no time limit.**

Rationale: This is a friend/family gift coordination app, not a commercial marketplace. Time-limited unclaims add complexity without clear benefit. If someone changes their mind, they should be able to unclaim immediately. The social dynamics of a friend group provide natural guardrails against abuse.

```sql
CREATE OR REPLACE FUNCTION public.unclaim_item(
  p_claim_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_deleted INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Delete the claim (only if owned by current user)
  DELETE FROM public.gift_claims
  WHERE id = p_claim_id
    AND claimed_by = v_user_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found or not yours');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
```

### Claim Limits (Claude's Discretion)

**Recommendation: No claim limit per wishlist.** Members can claim multiple items from the same person's wishlist. Rationale:

1. In small friend groups, one person may want to buy several small items.
2. Limiting to one claim per wishlist would require members to unclaim before claiming another, creating unnecessary friction.
3. The schema supports both models -- a claim limit could be added later via a CHECK in the `claim_item()` function without schema changes.

---

## Celebrant-Safe Status Function

```sql
CREATE OR REPLACE FUNCTION public.get_item_claim_status(
  p_item_ids UUID[]
)
RETURNS TABLE (
  wishlist_item_id UUID,
  is_claimed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  -- Only return status for items owned by the current user
  -- This function is designed for the celebrant to check their own items
  RETURN QUERY
    SELECT
      wi.id AS wishlist_item_id,
      EXISTS (
        SELECT 1 FROM public.gift_claims gc
        WHERE gc.wishlist_item_id = wi.id
      ) AS is_claimed
    FROM unnest(p_item_ids) AS item_id
    JOIN public.wishlist_items wi ON wi.id = item_id
    WHERE wi.user_id = auth.uid();  -- Only own items
END;
$$;
```

**Design decisions:**

| Decision | Rationale |
|----------|-----------|
| Accepts array of item IDs | Batch query avoids N+1 calls. Pass all item IDs at once. |
| Returns only `is_claimed` boolean | CONTEXT decision: celebrant sees "claimed" badge only, no claimer name, no count, no split progress. |
| SECURITY DEFINER | Bypasses gift_claims RLS (which blocks the celebrant) to check claim existence. |
| STABLE | Function has no side effects, result depends only on current DB state. Enables query optimization. |
| `WHERE wi.user_id = auth.uid()` | Safety: only returns data about the caller's own items. Cannot be used to check others' items. |

**Client-side usage:**

```typescript
const { data, error } = await supabase.rpc('get_item_claim_status', {
  p_item_ids: myItemIds,  // UUID array
});

// Returns: [{ wishlist_item_id: "...", is_claimed: true }, ...]
```

---

## Existing Codebase Integration Points

### Existing Helper Functions to Reuse

| Function | Location | Purpose in Phase 18 |
|----------|----------|---------------------|
| `public.is_group_member(group_id, user_id)` | `20260202000003_fix_group_members_recursion.sql` | Used in member_notes RLS policies |
| `public.is_group_admin(group_id, user_id)` | `20260205000003_group_settings.sql` | Not needed for Phase 18 (no admin-only operations) |

### Tables Referenced by New Foreign Keys

| New Table | FK To | FK Column | ON DELETE |
|-----------|-------|-----------|-----------|
| `gift_claims` | `wishlist_items` | `wishlist_item_id` | CASCADE |
| `gift_claims` | `users` | `claimed_by` | CASCADE |
| `personal_details` | `users` | `user_id` | CASCADE |
| `member_notes` | `groups` | `group_id` | CASCADE |
| `member_notes` | `users` | `about_user_id` | CASCADE |
| `member_notes` | `users` | `author_id` | CASCADE |

### Existing Patterns to Follow

| Pattern | Source Migration | How to Apply |
|---------|-----------------|--------------|
| CHECK constraint (not ENUM) | `20260202000011_schema_foundation.sql` | Use for `claim_type`, `status` |
| SECURITY DEFINER function | `20260202000003_fix_group_members_recursion.sql` | For `claim_item()`, `get_item_claim_status()` |
| `(SELECT auth.uid())` in RLS | `20260202000011_schema_foundation.sql` | All new RLS policies |
| `ENABLE ROW LEVEL SECURITY` immediately after CREATE TABLE | All migrations | All three new tables |
| `ON DELETE CASCADE` on FKs | `20260202000005_celebrations.sql` | All new FKs |
| Index on FK columns | `20260202000005_celebrations.sql` | All new FK columns |
| Partial unique index | `20260202000011_schema_foundation.sql` (group_favorites) | Full claim uniqueness |
| COMMENT ON for documentation | `20260205000001_v1.2_groups_schema.sql` | All new tables and functions |

### Service Layer Pattern

From `lib/contributions.ts` analysis, the established service pattern:

1. Import supabase client and database types
2. Define extended TypeScript interface for enriched data
3. Functions follow `{ data, error }` return pattern from Supabase client
4. Error handling: check error, throw with message
5. Enrich data by batch-fetching related user profiles (not N+1)
6. Use `user_profiles` view for display names and avatars

New services (`lib/claims.ts`, `lib/personalDetails.ts`, `lib/memberNotes.ts`) should follow this exact pattern.

### Migration File Naming

Following the existing convention: `YYYYMMDD000NNN_description.sql`

Most recent migrations:
- `20260205000001_v1.2_groups_schema.sql`
- `20260205000002_group_invites.sql`
- `20260205000003_group_settings.sql`

Phase 18 migration: `20260206000001_v1.3_claims_details_notes.sql`

### TypeScript Type Generation

After migration, regenerate types: `npx supabase gen types typescript --local > types/database.types.ts`

Expected additions to the `Database` interface:
- `gift_claims` table with Row, Insert, Update types
- `personal_details` table with Row, Insert, Update types
- `member_notes` table with Row, Insert types (no Update per CONTEXT)
- RPC function type signatures for `claim_item`, `unclaim_item`, `get_item_claim_status`

---

## Technical Deep Dives

### Atomic Operations: Why RPC Over Client-Side

The existing codebase uses a read-then-write pattern via the Supabase client:

```typescript
// DANGEROUS for competitive writes (claims):
const { data: item } = await supabase.from('wishlist_items').select().eq('id', id).single();
if (item.status === 'active') {
  await supabase.from('gift_claims').insert({ ... });
}
```

This has a TOCTOU (time-of-check-to-time-of-use) race condition. Between the SELECT and INSERT, another user's claim could succeed. Both users' INSERTs then proceed.

The RPC function solves this because:
1. The partial unique index (`idx_gift_claims_full_unique`) rejects duplicate full claims at the database level
2. The `FOR UPDATE SKIP LOCKED` in the function provides early detection
3. The entire function executes within a single transaction
4. PostgreSQL's row-level locking ensures atomicity

Source: [Handling Race Conditions in PostgreSQL MVCC](https://bufisa.com/2025/07/17/handling-race-conditions-in-postgresql-mvcc/), [Preventing Race Conditions with SELECT FOR UPDATE](https://on-systems.tech/blog/128-preventing-read-committed-sql-concurrency-errors/)

### JSONB vs Separate Columns for Personal Details

The CONTEXT decision locks JSONB storage. Research confirms this is the right approach:

**Advantages of JSONB for personal details:**
- No schema migrations when adding new size types (e.g., "glove_size")
- Handles variable number of preferences per user
- Supabase client reads/writes JSONB as native JavaScript objects
- `pg_jsonschema` provides database-level validation

**Tradeoffs to be aware of:**
- Cannot create B-tree indexes on JSONB keys (use GIN index if needed for search)
- `.update()` replaces the entire JSONB column (no partial merge via Supabase client)
- Partial JSONB updates require an RPC function with `jsonb_set()`

**Recommendation:** Full-column replacement on update is acceptable for personal details. The data is small (a few hundred bytes per user), written infrequently (user edits profile), and the client always has the full object in memory. Partial JSONB update via RPC is premature optimization here.

Source: [Supabase: Managing JSON and Unstructured Data](https://supabase.com/docs/guides/database/json), [pg_jsonschema Extension](https://supabase.com/docs/guides/database/extensions/pg_jsonschema)

### SECURITY DEFINER Best Practices

From Supabase docs:
1. Always set `search_path = ''` to prevent schema injection
2. Keep in public schema only if needed for RPC access (the Supabase client can only call functions in the public schema)
3. Explicitly reference schemas: `public.wishlist_items`, `public.gift_claims`
4. Revoke unnecessary permissions: `REVOKE EXECUTE ON FUNCTION ... FROM public;` then grant to authenticated only
5. STABLE/IMMUTABLE hints enable query plan caching

Source: [Supabase: Database Functions](https://supabase.com/docs/guides/database/functions)

### RLS Performance Considerations

The existing `is_group_member()` function is called in many RLS policies. Adding three new tables increases call volume.

**Mitigations (already in codebase patterns):**
1. `(SELECT auth.uid())` wrapping -- prevents per-row re-evaluation (up to 95% improvement)
2. Composite index on `group_members(group_id, user_id)` -- verify this exists (individual indexes `idx_group_members_user` and `idx_group_members_group` exist; consider adding composite)
3. Batch queries with JOINs instead of N+1 patterns
4. The `is_group_member()` function itself is `STABLE`, enabling caching

**New performance consideration for gift_claims:** The SELECT policy on `gift_claims` joins through `wishlist_items` and `group_members`. This is more expensive than the simple `is_group_member()` call. For the expected scale (friend groups of 5-15 people, <100 items per person), this is acceptable. If performance becomes an issue, a materialized "item accessible to user" view could help, but this is premature optimization.

Source: [Supabase: RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

---

## Risk Assessment

### HIGH Risk: RLS Policy Correctness

Three new RLS patterns coexist. Getting any one wrong leaks data:
- **Gift claims:** Celebrant sees who claimed their items (ruins surprise)
- **Member notes:** Note subject reads notes about themselves (breaks trust model)

**Mitigation:** Each table must have explicit integration tests:
1. Log in as item owner -> query gift_claims -> expect 0 rows
2. Log in as note subject -> query member_notes -> expect 0 rows for notes about self
3. Log in as non-group-member -> query all three tables -> expect 0 rows

### MEDIUM Risk: Global Claims vs Wishlist Items Without Groups

Wishlist items can have `group_id IS NULL` (personal items not associated with any group). The `claim_item()` function checks `is_group_member(v_item_group_id, v_user_id)`. If `group_id IS NULL`, this check fails.

**Mitigation:** The `claim_item()` function should only allow claiming items that have a `group_id`. Personal items (no group) are not claimable because there is no group context for claim visibility. Add a check: `IF v_item_group_id IS NULL THEN RETURN error 'Item is not in a group'`.

### MEDIUM Risk: Split Claims + Full Claims on Same Item

A full claim and split claims can coexist on the same item because the partial unique index only prevents multiple full claims. Scenario: User A fully claims item. Later, User B tries to add a split contribution. The INSERT succeeds because split claims are not constrained.

**Mitigation:** The `claim_item()` function should check for existing full claims before allowing split claims (and vice versa -- if splits exist, prevent full claim). This business logic belongs in the function, not in database constraints alone.

### LOW Risk: Migration Ordering

Phase 18 migration references `wishlist_items`, `users`, `groups` -- all exist since Phase 1. No dependency on Phase 17 tables (Phase 17 was a different feature). The migration file can be created independently.

---

## Open Questions

### Resolved by CONTEXT Decisions

1. **Claim scope:** Global per item (not per-celebration) -- RESOLVED
2. **Notes multiplicity:** Multiple notes per author -- RESOLVED
3. **Notes editing:** Delete only, no editing -- RESOLVED
4. **Note length:** ~280 characters -- RESOLVED
5. **Personal details scope:** Global per user -- RESOLVED
6. **JSONB for preferences:** Confirmed -- RESOLVED
7. **Celebrant visibility:** Boolean "claimed" badge only -- RESOLVED

### Resolved by Claude's Discretion (Recommendations Above)

1. **Unclaim rules:** Instant unclaim, no time limit
2. **Claim limits:** No limit per wishlist, claim multiple items allowed
3. **External link validation:** Basic URL format only, no platform restriction
4. **Self-visibility of personal details:** Owner can see and edit own details
5. **JSONB shape for sizes:** Object with string values, keys are size category names
6. **JSONB shape for preferences:** Arrays of `{ label, custom? }` tag objects per category

### Remaining for Planner

1. **Should the migration enable pg_jsonschema?** The extension is pre-installed on Supabase but needs explicit `CREATE EXTENSION`. If not available, JSONB CHECK constraints can be omitted.
2. **Composite index on group_members(group_id, user_id)?** The individual indexes exist but a composite may improve RLS performance. Low risk to add.
3. **Should full claims block split claims (and vice versa)?** The `claim_item()` function should enforce this, but the exact rule needs confirmation. Recommendation: full claim blocks splits; existing splits block full claims.

---

## Migration Structure Recommendation

Single migration file with clearly sectioned parts:

```
PART 1: Enable extensions (pg_jsonschema if available)
PART 2: gift_claims table + indexes + RLS policies
PART 3: personal_details table + indexes + RLS policies
PART 4: member_notes table + indexes + RLS policies
PART 5: RPC functions (claim_item, unclaim_item, get_item_claim_status)
PART 6: Function permissions (REVOKE from public, GRANT to authenticated)
PART 7: Comments and documentation
```

This follows the established pattern from `20260202000005_celebrations.sql` (single migration for related tables).

---

## Sources

### Primary (HIGH confidence)
- [Supabase: Database Functions](https://supabase.com/docs/guides/database/functions) -- RPC creation, SECURITY DEFINER, calling from client
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS patterns and best practices
- [Supabase: RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- `(SELECT auth.uid())` pattern, indexing
- [Supabase: Managing JSON and Unstructured Data](https://supabase.com/docs/guides/database/json) -- JSONB column usage
- [Supabase: pg_jsonschema Extension](https://supabase.com/docs/guides/database/extensions/pg_jsonschema) -- JSONB validation via CHECK constraints
- [Supabase: RPC Client Reference](https://supabase.com/docs/reference/javascript/rpc) -- Client-side function calling
- [Handling Race Conditions in PostgreSQL MVCC](https://bufisa.com/2025/07/17/handling-race-conditions-in-postgresql-mvcc/) -- Atomic UPDATE patterns
- [Preventing Race Conditions with SELECT FOR UPDATE](https://on-systems.tech/blog/128-preventing-read-committed-sql-concurrency-errors/) -- FOR UPDATE SKIP LOCKED
- [Winning Race Conditions With PostgreSQL](https://dev.to/mistval/winning-race-conditions-with-postgresql-54gn) -- Atomic INSERT with unique constraint
- [EDB: Avoiding Read-Modify-Write Cycles](https://www.enterprisedb.com/blog/postgresql-anti-patterns-read-modify-write-cycles) -- Anti-patterns for concurrent writes

### Project Sources (HIGH confidence)
- `/home/zetaz/wishlist-app/supabase/migrations/20260202000003_fix_group_members_recursion.sql` -- `is_group_member()` SECURITY DEFINER pattern
- `/home/zetaz/wishlist-app/supabase/migrations/20260202000005_celebrations.sql` -- Celebrant exclusion RLS, table structure conventions
- `/home/zetaz/wishlist-app/supabase/migrations/20260202000011_schema_foundation.sql` -- Partial unique index, CHECK constraint patterns
- `/home/zetaz/wishlist-app/supabase/migrations/20260201000001_initial_schema.sql` -- `wishlist_items` schema, `status` field
- `/home/zetaz/wishlist-app/supabase/migrations/20260202000004_fix_wishlist_rls.sql` -- Current wishlist_items RLS policies
- `/home/zetaz/wishlist-app/supabase/migrations/20260205000003_group_settings.sql` -- `is_group_admin()` pattern
- `/home/zetaz/wishlist-app/lib/contributions.ts` -- Service layer pattern (error handling, enrichment, types)
- `/home/zetaz/wishlist-app/types/database.types.ts` -- Current type structure, generation pattern
- `/home/zetaz/wishlist-app/.planning/research/ARCHITECTURE.md` -- Prior v1.3 schema research
- `/home/zetaz/wishlist-app/.planning/research/PITFALLS.md` -- Prior v1.3 pitfall analysis

### Prior Phase Research (HIGH confidence)
- `/home/zetaz/wishlist-app/.planning/phases/06-schema-foundation/06-RESEARCH.md` -- CHECK vs ENUM pattern, partial unique index
- `/home/zetaz/wishlist-app/.planning/phases/11-schema-foundation/11-RESEARCH.md` -- Column addition patterns, migration conventions

---

## Confidence Assessment

| Area | Confidence | Evidence |
|------|------------|---------|
| gift_claims table design | HIGH | Follows existing table patterns; separate table is locked architectural decision |
| Atomic claim RPC function | HIGH | PostgreSQL atomic UPDATE + unique index is the standard solution; verified via multiple sources |
| Celebrant partial visibility via SECURITY DEFINER | HIGH | Follows existing `is_group_member()` pattern; SECURITY DEFINER + STABLE is documented best practice |
| personal_details JSONB design | HIGH | JSONB for flexible attributes is established PostgreSQL pattern; pg_jsonschema adds validation |
| member_notes with subject-exclusion RLS | HIGH | Direct analog to existing celebrant exclusion; `about_user_id != auth.uid()` is simple and effective |
| RLS performance at expected scale | HIGH | Small groups (5-15 people), <100 items; `(SELECT auth.uid())` optimization applied |
| Global claims RLS policy (non-celebration scoped) | MEDIUM | New RLS pattern joining through wishlist_items; more complex than celebration-based join but functionally correct |
| Full/split claim interaction rules | MEDIUM | Recommendation provided but exact business rule needs planner confirmation |
| pg_jsonschema availability | MEDIUM | Pre-installed on Supabase but requires explicit CREATE EXTENSION; fallback is no validation |

**Research date:** 2026-02-05
**Valid until:** 60 days (stable PostgreSQL/Supabase patterns)
