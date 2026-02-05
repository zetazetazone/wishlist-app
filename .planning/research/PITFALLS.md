# Pitfalls Research: v1.3 Gift Claims & Personal Details

**Domain:** Gift claiming, personal detail profiles, and secret notes for gift coordination
**Researched:** 2026-02-05
**Focus:** Adding claim system, personal details, and secret notes to existing v1.0-v1.2 app with proven RLS celebrant exclusion, contribution tracking, and favorites system

## Executive Summary

The critical risks for v1.3 center on three themes:

1. **Race conditions in gift claiming** -- Two users simultaneously claiming the same item is the highest-risk scenario. The existing app has no precedent for atomic, competitive writes against the same row. The contribution system uses upsert-on-unique (per-user, non-competitive), but claiming is fundamentally competitive (only one claimer at a time). This requires a different concurrency pattern than anything in the existing codebase.

2. **RLS policy complexity explosion** -- The existing celebrant exclusion pattern (proven in chat_rooms, chat_messages, celebration_contributions) must be extended to claims. But claims have a dual visibility requirement: non-celebrants see full claim details, celebrants see "taken" status without claimer identity. This is a different RLS pattern than the existing "exclude entirely" approach and requires careful implementation to avoid leaking claimer identity.

3. **Secret notes privacy enforcement** -- Secret notes (per-group, hidden from profile owner) introduce a new privacy pattern: data hidden from a specific dynamic user (the subject), not from a static role (the celebrant). This requires RLS policies that reference the note's subject rather than a celebration's celebrant_id, which is a new pattern in this codebase.

---

## Gift Claiming Pitfalls

### CRITICAL-01: Race Condition on Simultaneous Claim Attempts

**What goes wrong:** Two users tap "Claim" on the same wishlist item at nearly the same time. Without atomic claim enforcement, both succeed because the app checks `status = 'active'` before updating. Both users think they claimed it, leading to duplicate gift purchases.

**Why it happens:** The existing codebase uses a read-then-write pattern for most operations (check state, then update). This works for non-competitive operations like contributions (one per user per celebration) but fails for competitive operations like claims (only one winner). Supabase's default Read Committed isolation does NOT prevent this TOCTOU (time-of-check-to-time-of-use) race.

**Warning signs:**
- Two claim records exist for the same item in the database
- Item status is 'claimed' but `claimed_by` references a user who thinks they failed to claim
- Users report "I claimed it but someone else got it" confusion
- Integration tests pass individually but fail under concurrent execution

**Prevention:**

Use a PostgreSQL function (RPC) for atomic claiming:
```sql
CREATE FUNCTION claim_item(p_item_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE wishlist_items
  SET claimed_by = p_user_id, status = 'claimed', updated_at = NOW()
  WHERE id = p_item_id
    AND status = 'active'
    AND claimed_by IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This is atomic: the WHERE clause and UPDATE execute as a single operation. If two concurrent requests arrive, only one succeeds (PostgreSQL's row-level locking ensures the second UPDATE sees the already-claimed state).

**Do NOT** implement as:
```typescript
// DANGEROUS: read-then-write pattern
const item = await supabase.from('wishlist_items').select().eq('id', itemId).single();
if (item.status === 'active') {
  await supabase.from('wishlist_items').update({ status: 'claimed', claimed_by: userId });
}
```

**Suggested phase:** Phase 1 (Schema & Database Functions) -- must be the first thing built, before any UI work.

**Confidence:** HIGH -- PostgreSQL atomic UPDATE with WHERE clause is the standard solution for this class of problem. Verified via [Supabase discussions](https://github.com/orgs/supabase/discussions/30334) and [PostgreSQL SELECT FOR UPDATE patterns](https://on-systems.tech/blog/128-preventing-read-committed-sql-concurrency-errors/).

---

### CRITICAL-02: Claim Status Leaks Claimer Identity to Celebrant

**What goes wrong:** The celebrant views their wishlist and sees which specific user claimed each item, ruining the surprise. This can happen through:
- RLS policy returning claimer_id to the celebrant
- Client-side code including claimer info in the item response
- Realtime subscription broadcasting claim updates with claimer identity

**Why it happens:** The existing celebrant exclusion pattern (chat, contributions) is "block entirely" -- the celebrant cannot see the data at all. Claims need a different pattern: "show partial data" -- the celebrant sees the item is claimed but not by whom. This partial-visibility pattern doesn't exist in the current codebase.

**Warning signs:**
- `claimed_by` UUID appears in the response when the celebrant fetches their wishlist
- Celebrant's UI shows claimer avatar or name
- Realtime event payload includes claimer info visible in browser dev tools
- Query returns different columns based on who's asking (complex to test)

**Prevention:**

Option A (Recommended): Use a database VIEW or function that conditionally strips claimer info:
```sql
CREATE VIEW wishlist_items_safe AS
SELECT
  wi.id, wi.title, wi.price, wi.status, wi.priority,
  wi.item_type, wi.image_url, wi.amazon_url, wi.user_id,
  CASE
    WHEN wi.user_id = auth.uid() THEN NULL  -- Celebrant sees NULL claimer
    ELSE wi.claimed_by
  END AS claimed_by,
  CASE
    WHEN wi.user_id = auth.uid() THEN
      CASE WHEN wi.claimed_by IS NOT NULL THEN 'taken' ELSE 'available' END
    ELSE wi.status
  END AS display_status
FROM wishlist_items wi;
```

Option B: Handle at the service layer -- always strip `claimed_by` when `item.user_id === currentUserId`. But this is less secure because it relies on client-side code, not database enforcement.

**Suggested phase:** Phase 1 (Schema) -- design the view/function alongside the claim table structure.

**Confidence:** HIGH -- This is an extension of the existing celebrant exclusion philosophy. The VIEW approach is verified against PostgreSQL documentation.

---

### MODERATE-03: Unclaim Does Not Release Split Contributions

**What goes wrong:** User A claims an item and opens it for split contributions. Users B and C contribute. User A then unclaims the item. The contributions are now orphaned -- they reference a claim that no longer exists, but contributors think their money is committed.

**Why it happens:** Claim and contribution lifecycles are coupled but the unclaim operation only clears the claim, not the dependent contributions.

**Warning signs:**
- `item_claims` has contributions referencing a deleted/released claim
- Contributors see their contribution but the item shows as "available"
- Budget tracking counts contributions for unclaimed items
- No notification sent to contributors when claim is released

**Prevention:**
1. When unclaiming, require confirmation if split contributions exist: "This item has X contributions from Y people. Unclaiming will notify them."
2. On unclaim, set contribution status to 'returned' (not deleted) for audit trail
3. Send push notification to all contributors: "{User} unclaimed {Item}. Your contribution has been released."
4. Consider: Prevent unclaim if contributions exceed a threshold, requiring Gift Leader approval

**Suggested phase:** Phase 2 (Claim Operations) -- implement alongside unclaim logic, NOT as a later polish item.

**Confidence:** MEDIUM -- The specific contribution lifecycle for claims is a design decision. The orphan-contribution problem is well-documented in gift registry systems.

---

### MODERATE-04: Claim State Conflicts with Existing `status` Column

**What goes wrong:** The existing `wishlist_items.status` column already has values: `'active', 'claimed', 'purchased', 'received', 'archived'`. The `'claimed'` status exists but has no enforcement mechanism -- it's just a label. Adding a proper claim system means deciding: does claiming update `status` to 'claimed', or does the claim live in a separate table? Mixing both approaches creates inconsistent state.

**Why it happens:** The `status` column was designed for item lifecycle tracking, not claim enforcement. Its `'claimed'` value has no foreign key to a claimer, no timestamp, and no enforcement constraint.

**Warning signs:**
- `status = 'claimed'` but no record in claims table (or vice versa)
- Queries check `status` in some places and claim table in others
- UI shows conflicting indicators ("Active" badge but "Claimed" overlay)
- Item can be in `status = 'purchased'` but claim table says it's unclaimed

**Prevention:**

Recommended approach: **Separate claims table + keep status column for lifecycle**

```
wishlist_items.status: 'active' | 'purchased' | 'received' | 'archived'
  (remove 'claimed' from status -- it becomes a derived state)

item_claims table: tracks WHO claimed WHAT and WHEN
  - item_id (FK to wishlist_items)
  - claimed_by (FK to users)
  - claimed_at (timestamp)
  - released_at (nullable -- set on unclaim)
  - allow_split (boolean)
```

The item's "claimed" state is derived: `EXISTS (SELECT 1 FROM item_claims WHERE item_id = X AND released_at IS NULL)`.

Alternatively: Add `claimed_by` and `claimed_at` columns directly to `wishlist_items`. Simpler but less flexible for history tracking.

**Suggested phase:** Phase 1 (Schema) -- this is the foundational schema decision for the entire claiming feature.

**Confidence:** HIGH -- Separate tracking table is the standard pattern in gift registry systems. Keeps item lifecycle clean.

---

### MINOR-05: Claiming Special Items (Surprise Me, Mystery Box) Has Unclear Semantics

**What goes wrong:** A "Surprise Me" item means "get me anything." What does it mean to "claim" a Surprise Me? Does claiming it mean "I'll get them something"? Can multiple people claim different Surprise Me instances? Same question for Mystery Box.

**Warning signs:**
- Users confused about what "Claim Surprise Me" means
- Multiple claims on the same Surprise Me item conflict
- UI shows "Taken" on Surprise Me but it should always be "available"
- Gift Leader can't coordinate when surprise items are claimed

**Prevention:**
1. Define clear rules: Surprise Me items are NOT claimable (they signal openness, not a specific item). Display them without claim button.
2. Mystery Box items ARE claimable (specific tier/amount, one person should handle it).
3. Add `is_claimable` derived property: `item_type === 'standard' || item_type === 'mystery_box'`.
4. UI: Show "This item is a signal, not a specific request" tooltip on Surprise Me.

**Suggested phase:** Phase 2 (Claim Operations) -- define claimability rules alongside claim UI.

**Confidence:** MEDIUM -- This is a UX decision more than a technical one. Other gift apps handle this differently (some allow claiming signals, some don't).

---

## Personal Details Pitfalls

### CRITICAL-06: Personal Details Schema Evolves Unpredictably (Avoid Rigid Columns)

**What goes wrong:** Team adds specific columns like `shirt_size`, `shoe_size`, `ring_size`, `favorite_color`, `favorite_brand` to a user_details table. Then users want `pants_size`, `dress_size`, `hat_size`, `dietary_restrictions`, `spotify_link`, `pinterest_link`. The schema becomes an ever-growing table of nullable columns, most of which are NULL for most users.

**Why it happens:** Personal details are inherently open-ended. Different users care about different attributes. A fixed-column schema cannot anticipate all useful detail types.

**Warning signs:**
- Multiple migration files adding single columns to the details table
- Most columns are NULL for most users
- Users request "add X field" frequently
- Mobile form has 20+ input fields, most left blank

**Prevention:**

Use a **JSONB column** or **key-value table** instead of fixed columns:

Option A (Recommended): JSONB column on users table
```sql
ALTER TABLE users ADD COLUMN personal_details JSONB DEFAULT '{}';
-- Example data: {"shirt_size": "M", "shoe_size": "10", "hobbies": ["cycling", "cooking"]}
```

Option B: Key-value table
```sql
CREATE TABLE user_details (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,  -- 'sizes', 'preferences', 'links'
  key TEXT NOT NULL,        -- 'shirt_size', 'favorite_color', 'pinterest'
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, category, key)
);
```

Option A is simpler for queries and follows the existing pattern of the app (direct column access). Option B is more normalized but adds query complexity.

**Suggested phase:** Phase 1 (Schema) -- the data structure choice affects all downstream UI and query work.

**Confidence:** HIGH -- JSONB for flexible user attributes is a well-established PostgreSQL pattern.

---

### MODERATE-07: Personal Details Visible Globally Creates Privacy Concerns

**What goes wrong:** Personal details are marked as "global" (shared across all groups). This means a user's shirt size, ring size, and preferences are visible to ALL groups they belong to. A user comfortable sharing sizes with close friends may not want acquaintances in another group seeing the same data.

**Why it happens:** The design decision says "personal details are global" for simplicity. But users may not understand the implications until after they've filled in details and joined a new group where strangers can see their ring size.

**Warning signs:**
- Users complain about privacy after joining new groups
- Users stop filling in personal details because "too many people can see them"
- Feature adoption drops because trust is low
- No way to control who sees what

**Prevention:**
1. Show clear disclosure when filling in details: "These details are visible to all your group members across all groups."
2. Consider future-proofing with a `visibility` field: `'all_groups' | 'per_group'` (default 'all_groups' for v1.3 simplicity).
3. Allow users to leave fields blank without friction (no "complete your profile" pressure).
4. Do NOT require personal details for any core functionality (they enhance gift-giving, not gate it).
5. Add a "Preview what others see" screen so users understand exposure before saving.

**Suggested phase:** Phase 3 (Personal Details UI) -- address during form design, not as afterthought.

**Confidence:** HIGH -- Privacy concerns with shared personal data are well-documented. The mitigation is UX-level, not technical.

---

### MINOR-08: External Wishlist Links Become Stale

**What goes wrong:** User adds a Pinterest board URL or Amazon wishlist link as a personal detail. Six months later the link is broken, board is deleted, or list is private. Other group members click the link and get a 404 or access denied.

**Warning signs:**
- Broken link complaints from group members
- No validation on URL entry
- Old links never updated by users
- No way to know a link is broken without clicking it

**Prevention:**
1. Validate URL format on entry (basic URL regex, not reachability check).
2. Show "Added X months ago" timestamp next to external links so viewers know freshness.
3. Do NOT automatically validate link reachability (privacy concern: server-side fetching user URLs).
4. Consider: Periodic "Review your external links" reminder notification (deferred to post-v1.3).

**Suggested phase:** Phase 3 (Personal Details UI) -- minor validation during form implementation.

**Confidence:** HIGH -- Stale links are a known issue in any user-generated link system. Low complexity to mitigate.

---

## Secret Notes Pitfalls

### CRITICAL-09: Secret Note Leaks to Profile Owner via RLS Policy Gap

**What goes wrong:** A group member writes a secret note about another member ("She hates yellow, loves blue"). The note owner (subject) can see the note through a query, API response, or realtime subscription. The entire trust model of secret notes collapses.

**Why it happens:** The existing RLS patterns are:
- "Everyone can see" (users table)
- "Group members can see" (group_members, celebrations)
- "Group members EXCEPT celebrant can see" (chat, contributions)

Secret notes need a NEW pattern: "Group members EXCEPT the note subject can see." If the developer copies the celebrant exclusion pattern but maps the wrong user reference, the note leaks.

**Warning signs:**
- Note subject's user ID appears in query results when they query their own profile
- Realtime subscription for group notes includes notes about the current user
- SELECT * from notes table returns rows where `subject_user_id = auth.uid()`
- Integration test for "user cannot see notes about themselves" is missing

**Prevention:**

1. RLS policy must explicitly exclude the subject:
```sql
CREATE POLICY "Group members except subject can view notes"
  ON member_notes FOR SELECT USING (
    subject_user_id != auth.uid()  -- Subject CANNOT see notes about themselves
    AND public.is_group_member(group_id, auth.uid())
  );
```

2. Write a dedicated integration test: Log in as User A, create note about User A via another user, verify User A gets zero results when querying notes.

3. Do NOT rely on client-side filtering. The database must enforce this.

4. Consider: Notes are per-group, not global. A note in Group X about User A should only be visible to Group X members (not Group Y members who also know User A).

**Suggested phase:** Phase 1 (Schema) -- the RLS policy is the foundation of the secret notes feature. Must be correct from day one.

**Confidence:** HIGH -- This follows the same celebrant exclusion philosophy already proven in the codebase. The pattern is directly analogous.

---

### MODERATE-10: Secret Notes Create Social Trust Issues When Revealed

**What goes wrong:** Even though notes are hidden from the subject, the mere EXISTENCE of a "secret notes" feature can create distrust. If a user discovers the feature exists (via app store description, settings menu, or word of mouth), they may feel uncomfortable knowing others are writing hidden notes about them.

**Warning signs:**
- Users complain about "being talked about behind their back"
- Feature feels "creepy" rather than helpful
- Users refuse to join groups that have secret notes enabled
- Negative app store reviews mentioning privacy concerns

**Prevention:**
1. Frame the feature positively: "Gift-giving hints" or "Gift notes" rather than "Secret notes about [Person]."
2. Make notes clearly about GIFT PREFERENCES, not personal opinions: placeholder text like "Loves cooking, recently mentioned wanting a cast iron pan."
3. Limit note length (500 chars) to prevent essay-length commentary.
4. Show note count per member (not content) to the subject: "[Name] -- 3 gift hints from group members" without revealing content. This communicates engagement without privacy violation.
5. Consider: Allow users to opt out of being a notes subject (deferred to post-v1.3).

**Suggested phase:** Phase 4 (Secret Notes UI) -- UX framing during component design.

**Confidence:** MEDIUM -- This is a UX/trust concern. The mitigation is in framing and positioning, not technical enforcement.

---

### MODERATE-11: Secret Notes Orphaned When Members Leave Group

**What goes wrong:** User A writes a secret note about User B in Group X. User A leaves the group. The note remains but is now authored by a non-member. Should other members still see it? What if User B leaves the group -- the note now references a non-member subject.

**Warning signs:**
- Notes display "Unknown author" or "Deleted user" labels
- Notes about non-members appear in group (confusing)
- Author's profile link leads to "User not found" error
- Notes accumulate over time for inactive/departed members

**Prevention:**
1. `ON DELETE CASCADE` on both `author_id` and `subject_user_id` relationships would delete notes when either user is removed. But this may be too aggressive -- the note content is still valuable.
2. Recommended: `ON DELETE SET NULL` for `author_id` (note persists, author shown as "Former member"). `ON DELETE CASCADE` via group_members (when subject leaves group, their notes in THAT group are deleted).
3. Alternative: Soft-delete notes when the subject leaves the group. Keep in database but hide from queries.

**Suggested phase:** Phase 1 (Schema) -- cascade behavior must be defined at table creation time.

**Confidence:** MEDIUM -- The specific cascade behavior is a design decision. The orphan problem is predictable.

---

## Integration Pitfalls (Existing System Interactions)

### CRITICAL-12: Claims Must Integrate with Existing Contribution System

**What goes wrong:** The existing `celebration_contributions` table tracks per-celebration monetary contributions (general pot, not per-item). v1.3 adds per-item claims with optional split contributions. If these two systems aren't reconciled, the app has two separate "contribution" concepts that confuse users and double-count money.

**Why it happens:** The v1.0 contribution system is celebration-scoped ("I'm contributing $50 to Sarah's birthday"). The v1.3 claim system adds item-scoped contributions ("I'm contributing $20 toward this specific headphone"). These are different granularities.

**Warning signs:**
- Budget tracking counts both celebration contributions and item split contributions
- Users contribute to celebration pot AND claim an item, thinking it's the same pool
- Progress bars show conflicting totals
- Gift Leader can't reconcile who committed what

**Prevention:**
1. Define clear relationship: Item split contributions are PART OF the celebration total, not separate.
2. Option A: Split contributions create records in `celebration_contributions` with an additional `item_id` column (extends existing table).
3. Option B: Separate `claim_contributions` table that feeds into celebration totals via aggregation.
4. Budget tracking must sum BOTH sources (or unify them).
5. UI must clearly show: "Your contribution to [Item]" vs "Your general contribution to [Celebration]."

**Suggested phase:** Phase 1 (Schema) -- the data model for claim contributions must be designed alongside the claim table.

**Confidence:** HIGH -- The existing contribution system is well-understood from codebase analysis. The integration point is clear.

---

### CRITICAL-13: Existing `wishlist_items` RLS Allows Celebrant to See ALL Item Data

**What goes wrong:** The current RLS policy on `wishlist_items` allows any group member to see all items:
```sql
CREATE POLICY "Users can view group wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = wishlist_items.group_id
        AND user_id = auth.uid()
    )
  );
```

This returns ALL columns including any new `claimed_by` column to the celebrant (the item owner). If claiming adds a `claimed_by` column to `wishlist_items`, the celebrant can see who claimed their items.

**Why it happens:** The existing RLS was designed before claims existed. It provides group membership check only, not column-level filtering. PostgreSQL RLS operates at row level, not column level.

**Warning signs:**
- Celebrant's wishlist query returns `claimed_by` values
- Adding `claimed_by` column immediately exposes it through existing SELECT policy
- No new migration needed to accidentally leak this data -- existing policy already covers it

**Prevention:**
1. If using a separate claims table: No change needed to `wishlist_items` RLS (claim data lives elsewhere, with its own RLS).
2. If adding `claimed_by` to `wishlist_items`: Must replace the direct table query with a VIEW that conditionally strips `claimed_by` for the item owner (see CRITICAL-02).
3. Preferred: Separate claims table with its own RLS policies. This avoids modifying the battle-tested `wishlist_items` policies.

**Suggested phase:** Phase 1 (Schema) -- foundational decision: column on existing table vs. separate table.

**Confidence:** HIGH -- Verified by reading the actual RLS policy in migration `20260201000001_initial_schema.sql`.

---

### MODERATE-14: Claims Need Celebrant Exclusion in Greetings Mode Too

**What goes wrong:** The design says "Claiming works in both Gifts and Greetings modes." But the existing mode system was designed to HIDE gift features in Greetings mode (celebrations don't get Gift Leaders, contribution UI is hidden). If claims work in both modes, the mode system needs updating to show claim UI even in Greetings mode.

**Warning signs:**
- Claim buttons hidden in Greetings mode groups because existing mode-conditional rendering hides all gift features
- Users in Greetings-mode groups can't claim items
- Mode check code (`if mode === 'gifts'`) overly aggressive in hiding new features

**Prevention:**
1. Audit all `mode === 'gifts'` conditionals in the codebase to determine which should include claims.
2. Claims and personal details are independent of mode -- they work in both.
3. Only gift-leader-specific and celebration-contribution-specific features are mode-gated.
4. Create a clear feature-mode matrix:
   | Feature | Gifts Mode | Greetings Mode |
   |---------|-----------|----------------|
   | Gift Leader | Yes | No |
   | Celebration Contributions | Yes | No |
   | Item Claims | Yes | **Yes** |
   | Personal Details | Yes | **Yes** |
   | Secret Notes | Yes | **Yes** |

**Suggested phase:** Phase 2 (Claim Operations) -- verify mode interactions during UI implementation.

**Confidence:** HIGH -- Mode system is well-documented in codebase. The conditional rendering pattern is consistent.

---

### MODERATE-15: Favorites and Claims Create Confusing UX Overlap

**What goes wrong:** An item is marked as "Most Wanted" (favorite) AND another member claims it. The celebrant sees: "Most Wanted" badge + "Taken" indicator. Non-celebrant members see: "Most Wanted" badge + "Claimed by [Name]" + "Contribute to split?" This creates visual clutter and conflicting hierarchy signals.

**Warning signs:**
- Card design has too many badges/indicators competing for attention
- Users unsure whether to prioritize Most Wanted unclaimed items or claimed items needing split contributions
- Celebration page wishlist section feels overwhelming with multiple overlapping indicators

**Prevention:**
1. Define clear visual hierarchy: Claim status > Favorite status (claiming is actionable, favorite is informational).
2. When an item is claimed, the favorite badge becomes secondary (smaller, less prominent).
3. For the celebrant view: "Taken" replaces the claim indicator. Favorite badge remains (it's their own preference).
4. Consider: Unclaimed Most Wanted items should have prominent "Claim This" CTA.

**Suggested phase:** Phase 3 (UI Integration) -- resolve during component design, with mockups before implementation.

**Confidence:** MEDIUM -- UX hierarchy is a design decision. The conflict is predictable from analyzing existing components.

---

### MODERATE-16: Realtime Subscriptions May Broadcast Claim Events to Celebrant

**What goes wrong:** The existing app uses Supabase Realtime for chat messages (`ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages`). If the claims table is added to realtime publication, INSERT/UPDATE events will broadcast to all subscribers, including the celebrant viewing their wishlist. The realtime payload includes all changed columns, potentially including `claimed_by`.

**Why it happens:** Supabase Realtime broadcasts to all authenticated subscribers of a table. RLS filters which rows are sent, but if the row passes RLS (celebrant can see their own items), all columns are included in the payload.

**Warning signs:**
- Celebrant's wishlist auto-updates when someone claims their item (reveals timing)
- Realtime event payload in network inspector shows `claimed_by` value
- Claims table added to supabase_realtime publication without considering celebrant visibility

**Prevention:**
1. Do NOT add the claims table to `supabase_realtime` publication.
2. Use polling or manual refresh for claim status updates (acceptable UX for non-real-time feature).
3. If realtime is needed: Use a separate channel/room pattern where the celebrant is excluded (similar to chat room exclusion).
4. Alternative: Use Supabase Realtime with RLS -- but only if the claims table RLS correctly hides rows from the celebrant.

**Suggested phase:** Phase 2 (Claim Operations) -- consider during claim notification/update strategy.

**Confidence:** HIGH -- Verified that existing chat uses Realtime. The broadcast behavior is documented in Supabase docs.

---

## RLS & Security Pitfalls

### CRITICAL-17: Three Different RLS Visibility Patterns Now Coexist

**What goes wrong:** After v1.3, the app will have three distinct RLS visibility patterns:

1. **Full exclusion** (chat, contributions): Celebrant cannot see ANY data
2. **Partial visibility** (claims on own items): Celebrant sees status but not claimer identity
3. **Subject exclusion** (secret notes): Note subject cannot see notes about themselves

If a developer confuses patterns -- applying "full exclusion" where "partial visibility" is needed, or "subject exclusion" where "full exclusion" is needed -- data either leaks or is incorrectly hidden.

**Warning signs:**
- New policies copy-paste from existing ones without adapting the exclusion logic
- Tests only cover one visibility pattern, not all three
- A future developer adds a table and uses the wrong pattern as template

**Prevention:**
1. Document all three patterns explicitly in a SECURITY.md or migration comment.
2. Name RLS policies clearly to indicate the pattern:
   - `"celebrant_full_exclusion_*"` for chat/contributions
   - `"celebrant_partial_visibility_*"` for claims
   - `"subject_exclusion_*"` for secret notes
3. Create a test matrix: For each protected table, test as (a) the excluded user, (b) a regular group member, (c) a non-group member.
4. Use the existing `is_group_member()` SECURITY DEFINER function as the base for all patterns.

**Suggested phase:** Phase 1 (Schema) -- establish naming and documentation conventions before writing any policies.

**Confidence:** HIGH -- Three patterns identified from codebase analysis. The risk of confusion is real based on the existing policy naming conventions.

---

### MODERATE-18: `is_group_member()` Function Performance Under Load

**What goes wrong:** The existing `is_group_member()` SECURITY DEFINER function is called in nearly every RLS policy. Adding claims and secret notes means MORE policies calling this function on EVERY query. For a group with 20 members and 50 wishlist items, loading the celebration page could trigger hundreds of `is_group_member()` calls.

**Why it happens:** PostgreSQL evaluates RLS policies per-row. Each row returned from a query triggers the policy evaluation, which calls `is_group_member()`. This was acceptable with fewer tables, but adding claims and notes increases the call volume.

**Warning signs:**
- Celebration page load time increases noticeably after v1.3
- Database CPU spikes during group view queries
- Supabase dashboard shows slow query times on wishlist_items and claims tables
- `EXPLAIN ANALYZE` shows sequential scans with high function call counts

**Prevention:**
1. Add index on `group_members(group_id, user_id)` if not already indexed (check: `idx_group_members_group` and `idx_group_members_user` exist but a composite index may be needed).
2. Consider materializing group membership into a session variable using `SET LOCAL` in transactions.
3. Use `(SELECT auth.uid())` pattern in RLS policies to prevent per-row re-evaluation of `auth.uid()` (Supabase best practice).
4. Batch load claims and notes in a single query with JOINs rather than N+1 queries.
5. Monitor with Supabase dashboard: Set alert for query times >200ms on key tables.

**Suggested phase:** Phase 5 (Integration & Polish) -- optimize after feature is working, based on actual measurements.

**Confidence:** MEDIUM -- The `(SELECT auth.uid())` pattern is verified in [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv). The actual performance impact depends on data volume.

---

## Phase-Specific Warning Summary

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Schema Design | Race condition on claims (CRITICAL-01) | Critical | Use PostgreSQL RPC function for atomic claims |
| Schema Design | Claimer identity leak to celebrant (CRITICAL-02) | Critical | Separate claims table with own RLS, or VIEW with conditional column masking |
| Schema Design | Secret note leak to subject (CRITICAL-09) | Critical | Explicit `subject_user_id != auth.uid()` in RLS policy |
| Schema Design | Status column confusion (MODERATE-04) | Moderate | Separate claims table, remove 'claimed' from status enum |
| Schema Design | Rigid personal details columns (CRITICAL-06) | Critical | Use JSONB column or key-value table |
| Schema Design | Three RLS patterns coexist (CRITICAL-17) | Critical | Document patterns, name policies clearly, test matrix |
| Schema Design | Claims vs contributions data model (CRITICAL-12) | Critical | Define relationship between item claims and celebration contributions |
| Schema Design | Existing wishlist_items RLS exposes claimed_by (CRITICAL-13) | Critical | Separate claims table avoids modifying existing policies |
| Claim Operations | Unclaim orphans contributions (MODERATE-03) | Moderate | Confirmation + notification + status transition on contributions |
| Claim Operations | Special item claimability (MINOR-05) | Minor | Define rules: Surprise Me not claimable, Mystery Box claimable |
| Claim Operations | Mode system overly hides claim features (MODERATE-14) | Moderate | Audit mode conditionals, claims work in both modes |
| Claim Operations | Realtime broadcasts claims to celebrant (MODERATE-16) | Moderate | Do not add claims to realtime publication |
| Personal Details UI | Privacy disclosure for global details (MODERATE-07) | Moderate | Clear disclosure, optional fields, preview screen |
| Personal Details UI | Stale external links (MINOR-08) | Minor | URL validation, freshness timestamp |
| Secret Notes UI | Social trust issues (MODERATE-10) | Moderate | Frame as "gift hints", limit length, positive positioning |
| Secret Notes UI | Orphaned notes on member departure (MODERATE-11) | Moderate | Define cascade behavior at schema creation |
| UI Integration | Favorites + claims visual overlap (MODERATE-15) | Moderate | Define visual hierarchy, mockup before building |
| Integration & Polish | RLS function performance (MODERATE-18) | Moderate | Composite indexes, `(SELECT auth.uid())` pattern, monitoring |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Race condition prevention | HIGH | PostgreSQL atomic UPDATE is well-documented; Supabase discussions confirm approach |
| Celebrant partial visibility | HIGH | VIEW-based column masking is standard PostgreSQL; extends existing exclusion philosophy |
| Secret notes privacy | HIGH | Direct analog to existing celebrant exclusion pattern; same RLS approach |
| Personal details schema | HIGH | JSONB for flexible attributes is established PostgreSQL pattern |
| Contribution integration | MEDIUM | Design decision needed; two valid approaches (extend vs separate) |
| Realtime broadcasting risk | HIGH | Supabase Realtime behavior documented; existing chat pattern provides precedent |
| RLS performance under load | MEDIUM | Best practices verified; actual impact depends on data volume |
| Special item claimability | MEDIUM | UX decision more than technical; no clear industry standard |
| Social trust of secret notes | LOW | Subjective user perception; mitigation is UX framing, hard to verify in advance |

## Sources

- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Preventing Race Conditions in PostgreSQL with SELECT FOR UPDATE](https://on-systems.tech/blog/128-preventing-read-committed-sql-concurrency-errors/)
- [Supabase Discussion: SERIALIZABLE Isolation for High-Concurrency Updates](https://github.com/orgs/supabase/discussions/30334)
- [Supabase Upsert Documentation](https://supabase.com/docs/reference/javascript/upsert)
- [Supabase Unique Constraint Guide](https://www.restack.io/docs/supabase-knowledge-supabase-unique-constraint-guide)
- [Database Race Conditions -- Doyensec Blog](https://blog.doyensec.com/2024/07/11/database-race-conditions.html)
- [Favory: Privacy-First Wishlist with Anonymous Claiming](https://www.openpr.com/news/4189488/favory-launches-privacy-first-wishlist-platform-with)
- [GDPR Data Compliance Best Practices 2025](https://www.alation.com/blog/gdpr-data-compliance-best-practices-2025/)
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Realtime and RLS Transactions](https://marmelab.com/blog/2025/12/08/supabase-edge-function-transaction-rls.html)
- Existing codebase analysis: all migration files, lib/contributions.ts, lib/favorites.ts, lib/wishlistItems.ts, types/database.types.ts, celebration page component

---
*Research completed: 2026-02-05*
