# Phase 23: Database Foundation - Research

**Researched:** 2026-02-09
**Domain:** Supabase PostgreSQL schema design, RLS policies, bidirectional relationship patterns
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Friends Table Design:** Ordered bidirectional constraint `user_a_id < user_b_id` enforces single row per friendship
- **Friends Table Design:** Both user IDs are foreign keys to users table
- **Friends Table Design:** Created timestamp for friendship age tracking
- **Friend Requests Table Design:** Status enum: `pending`, `accepted`, `rejected`, `blocked`
- **Friend Requests Table Design:** Sender and receiver user IDs (no ordering constraint -- directional)
- **Friend Requests Table Design:** Created and updated timestamps for request lifecycle
- **Public Dates Table Design:** Month/day columns for annual recurrence (not full date)
- **Public Dates Table Design:** Optional year column for one-time events
- **Public Dates Table Design:** Owner user ID for RLS
- **Public Dates Table Design:** Title and optional description
- **Helper Functions:** `are_friends(user_a, user_b)` returns boolean, handles bidirectional check with ordered constraint
- **Helper Functions:** Used by RLS policies to simplify friend-visibility logic
- **Phone Number Column:** Add `phone` column to existing users table
- **Phone Number Column:** E.164 format (normalized, e.g., +14155551234)
- **Phone Number Column:** Nullable -- phone not required for account
- **Phone Number Column:** Unique constraint for contact matching

### Claude's Discretion
- Index strategy (which columns, partial indexes)
- Exact RLS policy implementation patterns
- Migration ordering and rollback approach
- Trigger functions for status transitions
- Error handling in helper functions
- Phone validation trigger vs. application-level

### Deferred Ideas (OUT OF SCOPE)
None -- this is a pure infrastructure phase with clear boundaries.
</user_constraints>

## Summary

Phase 23 establishes the database foundation for the v1.4 Friends System by creating three new tables (`friends`, `friend_requests`, `public_dates`), extending the `users` table with a phone column, and implementing helper functions with friend-visibility RLS policies. This is pure infrastructure -- no UI, no services, just schema.

The research confirms that the locked decisions align with proven patterns already established in this codebase. The bidirectional ordered constraint pattern (`user_a_id < user_b_id`) prevents duplicate friendship rows, the `are_friends()` helper function mirrors the existing `is_group_member()` pattern for RLS policy simplification, and the friend request status enum follows the claim status patterns from v1.3.

**Primary recommendation:** Follow the existing migration patterns from `20260206000001_v1.3_claims_details_notes.sql` -- single comprehensive migration with clear PART sections, detailed comments, and SECURITY DEFINER functions with `SET search_path = ''` for RLS bypass.

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| PostgreSQL | 15+ | Database engine (via Supabase) | Already in use, RLS features well-understood |
| Supabase RLS | - | Row-level security policies | Project standard, 11+ policies already defined |
| plpgsql | - | Stored procedures/functions | Project standard for all RPC functions |

### Supporting
| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| SECURITY DEFINER functions | Bypass RLS for complex operations | Helper functions used in RLS policies, atomic operations |
| Partial unique indexes | Enforce constraints on subset of rows | Single-full-claim pattern (already used in gift_claims) |
| JSONB columns | Flexible nested data | NOT needed for this phase (month/day columns are explicit) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two-row friendship | Single ordered row | Two-row is simpler queries but 2x storage, harder dedup |
| Full DATE column | month/day columns | Full DATE loses annual recurrence semantics |
| Application-level phone validation | Database trigger | Trigger ensures consistency but E.164 parsing complex in SQL |

**Recommendation for discretion areas:**
- **Phone validation:** Application-level via `libphonenumber-js` (Phase 26), NOT database trigger. Complex E.164 parsing is better handled in JS.
- **Index strategy:** Covered below in Architecture Patterns section.

## Architecture Patterns

### Migration Structure
Follow the established pattern from `20260206000001_v1.3_claims_details_notes.sql`:

```sql
-- v1.4 Friends System Database Foundation
-- Phase 23: Creates three new tables with distinct RLS visibility patterns
--
-- Tables:
--   1. friends - Bidirectional friendship (ordered constraint)
--   2. friend_requests - Request lifecycle with status enum
--   3. public_dates - User-defined recurring dates visible to friends
--
-- RLS Patterns:
--   1. Friend Visibility (public_dates) - visible only to friends via are_friends()
--   2. Bidirectional Ownership (friends) - both users can view/delete
--   3. Directional Ownership (friend_requests) - sender/receiver specific permissions

-- PART 1: are_friends() helper function (MUST be first - needed by RLS policies)
-- PART 2: friends table
-- PART 3: friend_requests table
-- PART 4: public_dates table
-- PART 5: users table extension (phone column)
-- PART 6: Additional helper functions
-- PART 7: Triggers
-- PART 8: Comments
-- PART 9: Grants
```

### Pattern 1: are_friends() Helper Function
**What:** SECURITY DEFINER function that checks friendship existence with ordered ID handling
**When to use:** All RLS policies needing friend-visibility check
**Example:**
```sql
-- Source: Adapted from existing is_group_member() pattern in migration 20260202000003
CREATE OR REPLACE FUNCTION public.are_friends(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friends
    WHERE user_a_id = LEAST(p_user_a, p_user_b)
      AND user_b_id = GREATEST(p_user_a, p_user_b)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

**Key points:**
- `LEAST/GREATEST` handles ordering automatically -- callers don't need to know constraint exists
- `SECURITY DEFINER` bypasses RLS on friends table when called from other policies
- `STABLE` marks function as not modifying data (optimizer hint)

### Pattern 2: Ordered Bidirectional Constraint
**What:** CHECK constraint ensuring `user_a_id < user_b_id` combined with UNIQUE on both
**When to use:** Any bidirectional relationship needing single-row storage
**Example:**
```sql
-- Source: Standard bidirectional pattern documented in v1.4 ARCHITECTURE research
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  user_b_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT friends_ordered CHECK (user_a_id < user_b_id),
  CONSTRAINT friends_unique UNIQUE (user_a_id, user_b_id)
);
```

### Pattern 3: Status Enum via CHECK Constraint
**What:** TEXT column with CHECK constraint for status enum
**When to use:** Fixed set of status values with transitions
**Example:**
```sql
-- Source: Matches gift_claims.status pattern from 20260206000001
CREATE TABLE public.friend_requests (
  -- ... other columns ...
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  -- ...
);
```

### Recommended Index Strategy
```sql
-- friends table
CREATE INDEX idx_friends_user_a ON public.friends(user_a_id);
CREATE INDEX idx_friends_user_b ON public.friends(user_b_id);
-- Both indexes needed: queries can be "WHERE user_a_id = X OR user_b_id = X"
-- are_friends() uses LEAST/GREATEST so both columns are queried

-- friend_requests table
CREATE INDEX idx_friend_requests_to_status ON public.friend_requests(to_user_id, status);
-- Composite: "pending requests for user X" is most common query pattern
CREATE INDEX idx_friend_requests_from ON public.friend_requests(from_user_id);
-- For "requests I sent" queries and DELETE policy evaluation

-- public_dates table
CREATE INDEX idx_public_dates_user ON public.public_dates(user_id);
-- For "my dates" queries
CREATE INDEX idx_public_dates_month_day ON public.public_dates(month, day);
-- For calendar queries "dates in March" or "dates on the 15th"

-- users table (new index)
CREATE INDEX idx_users_phone ON public.users(phone) WHERE phone IS NOT NULL;
-- Partial index: only non-null phones need indexing for contact matching
```

### Anti-Patterns to Avoid
- **Inline OR in RLS policies:** Don't write `WHERE user_a_id = auth.uid() OR user_b_id = auth.uid()` in every policy. Use `are_friends()` helper instead.
- **Missing SECURITY DEFINER:** Helper functions called from RLS policies MUST be SECURITY DEFINER to bypass RLS and avoid infinite recursion.
- **Forgetting STABLE:** Helper functions that only read data should be marked STABLE for query optimizer.
- **Direct phone comparison without normalization:** Application layer MUST normalize to E.164 before storing. Don't rely on database to normalize.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| E.164 phone parsing | Custom regex in SQL trigger | `libphonenumber-js` in JS (Phase 26) | Regional format complexity is vast |
| Race-condition-safe accepting | Simple INSERT/UPDATE | Atomic RPC function | Concurrent accepts can create duplicates |
| Friend count | COUNT query every time | Application-level caching or denormalized column if needed | Frequent COUNT on bidirectional is expensive |

**Key insight:** This phase is pure schema -- complex logic belongs in RPC functions (Phase 23) or TypeScript services (Phase 24+).

## Common Pitfalls

### Pitfall 1: RLS Policy Infinite Recursion
**What goes wrong:** RLS policy on `friends` table calls `are_friends()` which queries `friends` table, which triggers RLS...
**Why it happens:** Non-SECURITY DEFINER function is subject to RLS on tables it queries
**How to avoid:** ALWAYS use `SECURITY DEFINER` on helper functions called from RLS policies
**Warning signs:** "infinite recursion detected" error, or queries hanging

### Pitfall 2: Bidirectional Query Returns Zero Rows
**What goes wrong:** Query `WHERE user_a_id = X AND user_b_id = Y` returns nothing even though friendship exists
**Why it happens:** X > Y, so the stored row has user_a_id = Y and user_b_id = X
**How to avoid:** Always use `LEAST/GREATEST` pattern or call `are_friends()` helper
**Warning signs:** "Friends not found" errors, inconsistent friend list

### Pitfall 3: Friend Request Race Condition
**What goes wrong:** User A sends request to B, User B simultaneously sends request to A. Two pending requests exist.
**Why it happens:** No UNIQUE constraint prevents both (A,B) and (B,A) requests
**How to avoid:** Add partial unique index on ordered pair: `UNIQUE(LEAST(from_user_id, to_user_id), GREATEST(from_user_id, to_user_id)) WHERE status = 'pending'`
**Warning signs:** Duplicate pending requests in UI, confusing accept flow

### Pitfall 4: Blocked Status Doesn't Block
**What goes wrong:** User A blocks B, but B can still send new request
**Why it happens:** INSERT policy doesn't check for existing blocked status
**How to avoid:** INSERT policy must check: `NOT EXISTS (SELECT 1 FROM friend_requests WHERE ... AND status = 'blocked')`
**Warning signs:** Users complaining block feature doesn't work

### Pitfall 5: Month/Day Validation Edge Case
**What goes wrong:** User creates date with month=2, day=30 (February 30 doesn't exist)
**Why it happens:** Simple range CHECK (1-12, 1-31) doesn't validate combination
**How to avoid:** Application-level validation before INSERT, or use a trigger that validates month/day combinations
**Warning signs:** Calendar crashes when rendering invalid date

## Code Examples

### Complete are_friends() Function
```sql
-- Source: Adapted from is_group_member() in 20260202000003_fix_group_members_recursion.sql
CREATE OR REPLACE FUNCTION public.are_friends(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Handle NULL inputs gracefully
  IF p_user_a IS NULL OR p_user_b IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Same user is not "friends with self"
  IF p_user_a = p_user_b THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.friends
    WHERE user_a_id = LEAST(p_user_a, p_user_b)
      AND user_b_id = GREATEST(p_user_a, p_user_b)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.are_friends IS
  'Check if two users are friends - uses LEAST/GREATEST to handle ordered constraint, SECURITY DEFINER bypasses RLS';
```

### Friend-Visibility RLS Policy Pattern
```sql
-- Source: Mirrors member_notes pattern from 20260206000001
-- Friends can view dates of other friends
CREATE POLICY "Friends can view friend public dates"
  ON public.public_dates FOR SELECT
  USING (
    -- Owner can always see their own dates
    user_id = (SELECT auth.uid())
    OR
    -- Friends can see if visibility allows
    (
      visibility IN ('friends_only', 'public')
      AND public.are_friends(user_id, (SELECT auth.uid()))
    )
  );
```

### Accept Friend Request RPC Function
```sql
-- Source: Follows claim_item() pattern from 20260206000001
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request RECORD;
  v_friend_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock the request row
  SELECT * INTO v_request
  FROM public.friend_requests
  WHERE id = p_request_id
    AND to_user_id = v_user_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not pending');
  END IF;

  -- Check if already friends (defensive)
  IF public.are_friends(v_request.from_user_id, v_request.to_user_id) THEN
    UPDATE public.friend_requests SET status = 'accepted', updated_at = NOW()
    WHERE id = p_request_id;
    RETURN jsonb_build_object('success', true, 'message', 'Already friends');
  END IF;

  -- Create friendship row (ordered)
  INSERT INTO public.friends (user_a_id, user_b_id)
  VALUES (
    LEAST(v_request.from_user_id, v_request.to_user_id),
    GREATEST(v_request.from_user_id, v_request.to_user_id)
  )
  RETURNING id INTO v_friend_id;

  -- Update request status
  UPDATE public.friend_requests SET status = 'accepted', updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'friend_id', v_friend_id,
    'friend_user_id', v_request.from_user_id
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: friendship already created
    RETURN jsonb_build_object('success', true, 'message', 'Friendship already exists');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Two-row symmetric friendship | Single-row ordered constraint | Industry standard since ~2015 | 50% storage, no dedup needed |
| RLS with inline subqueries | SECURITY DEFINER helper functions | Supabase recommendation | Cleaner policies, avoids recursion |
| Full DATE for recurring events | month/day columns | Calendar app pattern | Natural annual recurrence |

**Project-specific patterns already established:**
- `is_group_member()` helper for group-based RLS (reuse pattern for `are_friends()`)
- Status enum via CHECK constraint (matches gift_claims, contributions)
- JSONB for flexible nested data (used in personal_details -- NOT needed here)

## Open Questions

1. **Friend request deduplication strategy**
   - What we know: Need to prevent (A,B) and (B,A) pending requests
   - What's unclear: Best constraint approach -- partial unique index vs trigger vs application check
   - Recommendation: Use partial unique index with ordered columns: `UNIQUE(LEAST(from,to), GREATEST(from,to)) WHERE status IN ('pending', 'accepted')`. This also prevents re-requesting someone you're already friends with.

2. **February 29 handling for public dates**
   - What we know: month=2, day=29 is valid leap year date but invalid in non-leap years
   - What's unclear: Should database reject day=29 for month=2, or allow it and handle in application?
   - Recommendation: Allow in database (CHECK 1-31), handle edge case in calendar display. "February 29 babies" celebrate on Feb 28 or March 1 in non-leap years -- this is application UI logic, not schema enforcement.

3. **Phone column index scope**
   - What we know: Phone is nullable, only non-null values need matching
   - What's unclear: Will contact matching query against ALL users or use some filtering?
   - Recommendation: Use partial index `WHERE phone IS NOT NULL`. If filtering needed (e.g., by region), add in Phase 26 when contact import is implemented.

## Sources

### Primary (HIGH confidence)
- Existing migration `20260206000001_v1.3_claims_details_notes.sql` - Pattern template for tables, RLS, functions
- Existing migration `20260202000003_fix_group_members_recursion.sql` - `is_group_member()` SECURITY DEFINER pattern
- v1.4 Research `ARCHITECTURE.md` - Detailed schema design with rationale
- v1.4 Research `PITFALLS-FRIENDS.md` - Friend request race conditions, RLS visibility pitfalls

### Secondary (MEDIUM confidence)
- v1.4 Research `SUMMARY.md` - Phase ordering rationale, migration structure
- Existing codebase analysis - All 24 migrations reviewed for patterns

### Tertiary (LOW confidence, validate during implementation)
- Friend request deduplication approach needs testing to confirm optimal constraint pattern
- February 29 edge case handling needs UI verification in Phase 28

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, follows existing patterns exactly
- Architecture: HIGH - Patterns proven in codebase (is_group_member, claim_item, etc.)
- Pitfalls: HIGH - Documented in v1.4 research with specific mitigations

**Research date:** 2026-02-09
**Valid until:** 90 days (stable database patterns, no external dependencies)
