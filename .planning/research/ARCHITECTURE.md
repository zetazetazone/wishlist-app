# Architecture Research: v1.3 Gift Claims & Personal Details

**Domain:** Gift claiming system, personal detail profiles, secret member notes
**Researched:** 2026-02-05
**Overall confidence:** HIGH

## Summary

Gift claims and personal details introduce two independent but architecturally complementary features. Gift claims add a new `gift_claims` table with celebrant-exclusion RLS (proven pattern from chat/contributions), split contribution support, and claim/unclaim lifecycle. Personal details add a `personal_details` table at user-level (global, not per-group) with structured preference fields, plus a `member_notes` table for per-group secret notes hidden from the profile owner.

Both features integrate cleanly with the existing architecture. Gift claims extend the celebration coordination flow (celebration detail screen, wishlist card components). Personal details extend the profile system (profile screen, member cards, settings screen). No existing tables need schema modifications -- all changes are additive new tables and new RLS policies following established patterns.

**Key architectural decision:** Gift claims are tied to `wishlist_item_id` + `celebration_id` (not just item_id), because the same wishlist item could be relevant across multiple celebrations in different groups. This prevents cross-celebration claim conflicts while allowing the same item to appear in multiple group contexts.

---

## Schema Design

### Gift Claims

**Table: `gift_claims`**

```sql
CREATE TABLE public.gift_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_item_id UUID REFERENCES public.wishlist_items(id) ON DELETE CASCADE NOT NULL,
  celebration_id UUID REFERENCES public.celebrations(id) ON DELETE CASCADE NOT NULL,
  claimed_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  claim_type TEXT CHECK (claim_type IN ('full', 'split')) DEFAULT 'full',
  amount NUMERIC CHECK (amount IS NULL OR amount > 0),  -- For split claims: dollar amount pledged
  notes TEXT,  -- Optional private note (e.g., "ordering from Amazon, arrives March 5")
  status TEXT CHECK (status IN ('claimed', 'purchased', 'delivered')) DEFAULT 'claimed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Design rationale:**

| Decision | Rationale |
|----------|-----------|
| `celebration_id` required | Same wishlist item can be claimed in different celebrations (different groups). Scoping to celebration prevents conflicts. |
| `claim_type` enum | Distinguishes full claims (one person buys it) from split claims (multiple people chip in). |
| `amount` nullable | Only relevant for split claims. Full claims do not need amount. |
| `notes` field | Gift Leader and claimers need to coordinate delivery, shipping status, etc. Hidden from celebrant. |
| `status` lifecycle | `claimed` -> `purchased` -> `delivered` tracks progress without overloading `wishlist_items.status`. |
| No UNIQUE on (item_id, celebration_id) | Split claims allow multiple rows per item per celebration. |

**Uniqueness constraint for full claims:**

```sql
-- Partial unique index: only one full claim per item per celebration
CREATE UNIQUE INDEX idx_gift_claims_full_unique
  ON public.gift_claims(wishlist_item_id, celebration_id)
  WHERE claim_type = 'full';
```

This allows unlimited split claims but prevents duplicate full claims on the same item in the same celebration.

**Indexes:**

```sql
CREATE INDEX idx_gift_claims_item ON public.gift_claims(wishlist_item_id);
CREATE INDEX idx_gift_claims_celebration ON public.gift_claims(celebration_id);
CREATE INDEX idx_gift_claims_claimer ON public.gift_claims(claimed_by);
CREATE INDEX idx_gift_claims_status ON public.gift_claims(status);
```

**RLS Policies -- Celebrant Exclusion Pattern:**

This follows the exact same proven pattern used for `chat_rooms`, `chat_messages`, and `celebration_contributions`:

```sql
ALTER TABLE public.gift_claims ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Group members EXCEPT celebrant can view claims with full detail
-- (who claimed what, amounts, notes)
CREATE POLICY "Group members except celebrant can view claims"
  ON public.gift_claims FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.celebrations c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = gift_claims.celebration_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()  -- EXCLUDES CELEBRANT
    )
  );

-- Celebrant sees claims exist (for "taken" badge) but NOT who claimed
-- Implemented via a SEPARATE policy that returns limited data through a view or
-- by querying wishlist_items.status directly.
-- APPROACH: Use a database function (see below) rather than dual SELECT policies.

-- Group members except celebrant can create claims
CREATE POLICY "Group members except celebrant can create claims"
  ON public.gift_claims FOR INSERT WITH CHECK (
    claimed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.celebrations c
      JOIN public.group_members gm ON gm.group_id = c.group_id
      WHERE c.id = gift_claims.celebration_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()  -- EXCLUDES CELEBRANT
    )
  );

-- Claimers can update their own claims (status progression, notes)
CREATE POLICY "Claimers can update own claims"
  ON public.gift_claims FOR UPDATE USING (
    claimed_by = auth.uid()
  );

-- Claimers can delete their own claims (unclaim)
CREATE POLICY "Claimers can delete own claims"
  ON public.gift_claims FOR DELETE USING (
    claimed_by = auth.uid()
  );
```

**Celebrant "Taken" View -- Function Approach:**

The celebrant should see that an item is "taken" without seeing WHO took it. Rather than complex dual-policy RLS, use a database function:

```sql
-- Returns claim status for celebrant's own items in a celebration
-- Only returns: item_id, is_claimed (boolean), claim_count (for split)
-- Does NOT return: claimed_by, notes, amount
CREATE OR REPLACE FUNCTION public.get_item_claim_status(p_celebration_id UUID)
RETURNS TABLE (
  wishlist_item_id UUID,
  is_claimed BOOLEAN,
  claim_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      gc.wishlist_item_id,
      TRUE AS is_claimed,
      COUNT(gc.id)::INTEGER AS claim_count
    FROM public.gift_claims gc
    WHERE gc.celebration_id = p_celebration_id
    GROUP BY gc.wishlist_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

This function bypasses RLS (SECURITY DEFINER) but returns only non-identifying data. The celebrant's app calls this function to show "Taken" badges on their own items.

### Personal Details

**Table: `personal_details`**

```sql
CREATE TABLE public.personal_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- Clothing sizes
  shirt_size TEXT CHECK (shirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL')),
  pants_size TEXT,           -- Free text (e.g., "32x30", "M", "10")
  shoe_size TEXT,            -- Free text (e.g., "10 US", "42 EU")
  ring_size TEXT,            -- Free text (e.g., "7", "M")
  dress_size TEXT,           -- Free text (e.g., "8", "M")
  -- Preferences
  favorite_colors JSONB DEFAULT '[]',     -- Array of color strings
  favorite_brands JSONB DEFAULT '[]',     -- Array of brand strings
  hobbies JSONB DEFAULT '[]',             -- Array of hobby strings
  dislikes JSONB DEFAULT '[]',            -- Array of "do not gift" items
  allergies TEXT,                          -- Free text for food/material allergies
  -- External links
  amazon_wishlist_url TEXT,
  pinterest_board_url TEXT,
  other_links JSONB DEFAULT '[]',         -- Array of {label, url} objects
  -- Meta
  bio TEXT,                                -- Short personal bio/about me
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Design rationale:**

| Decision | Rationale |
|----------|-----------|
| User-level (not per-group) | Sizes/preferences are global to the person, not group-specific. Avoids data duplication. |
| UNIQUE on user_id | One row per user. Upsert pattern for updates. |
| JSONB for arrays | `favorite_colors`, `favorite_brands`, `hobbies`, `dislikes`, `other_links` are variable-length lists. JSONB provides flexible storage without join tables. |
| `shirt_size` as CHECK | Standardized sizes benefit from validation. Other sizes are too varied for CHECK constraints. |
| `allergies` as TEXT | Free text is appropriate -- structured allergy tracking is over-engineering for a gift app. |
| External links as typed fields | Amazon and Pinterest are the most common gift-relevant platforms. `other_links` JSONB handles the long tail. |

**RLS Policies:**

```sql
ALTER TABLE public.personal_details ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view personal details
-- (group membership not required -- profiles are public within the app)
CREATE POLICY "Authenticated users can view personal details"
  ON public.personal_details FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- Users can insert their own details
CREATE POLICY "Users can insert own personal details"
  ON public.personal_details FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Users can update their own details
CREATE POLICY "Users can update own personal details"
  ON public.personal_details FOR UPDATE USING (
    user_id = auth.uid()
  );
```

**Note:** Personal details are intentionally visible to all authenticated users (not scoped to group members). This mirrors how `users` and `user_profiles` work -- if someone is in your app, they can see your profile. This simplifies the query pattern and avoids N+1 group membership checks.

### Secret Member Notes

**Table: `member_notes`**

```sql
CREATE TABLE public.member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  about_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, about_user_id, author_id)  -- One note per author per subject per group
);
```

**Design rationale:**

| Decision | Rationale |
|----------|-----------|
| Per-group, per-author | Different group members can have different notes about the same person. "Mom says he wants a new wallet" vs "I noticed he's been eyeing that game." |
| UNIQUE(group_id, about_user_id, author_id) | Each person writes one note per subject per group. Upsert for updates. |
| Separate from personal_details | Notes are NOT self-authored. They are other people's observations. Different ownership, different RLS. |

**RLS Policies -- Owner Exclusion Pattern:**

```sql
ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Group members can view notes EXCEPT notes about themselves
CREATE POLICY "Group members can view notes except about self"
  ON public.member_notes FOR SELECT USING (
    about_user_id != auth.uid()  -- HIDES notes about the current user
    AND public.is_group_member(group_id, auth.uid())
  );

-- Group members can create notes about others (not about themselves)
CREATE POLICY "Group members can create notes about others"
  ON public.member_notes FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND about_user_id != auth.uid()  -- Cannot write notes about yourself
    AND public.is_group_member(group_id, auth.uid())
  );

-- Authors can update their own notes
CREATE POLICY "Authors can update own notes"
  ON public.member_notes FOR UPDATE USING (
    author_id = auth.uid()
  );

-- Authors can delete their own notes
CREATE POLICY "Authors can delete own notes"
  ON public.member_notes FOR DELETE USING (
    author_id = auth.uid()
  );
```

**Indexes:**

```sql
CREATE INDEX idx_member_notes_group ON public.member_notes(group_id);
CREATE INDEX idx_member_notes_about ON public.member_notes(about_user_id);
CREATE INDEX idx_member_notes_author ON public.member_notes(author_id);
```

---

## Integration Points

### How Gift Claims Connect to Existing Architecture

**1. `wishlist_items` table (existing)**

- Gift claims reference `wishlist_items.id` via FK.
- The existing `status` column on `wishlist_items` (`'active' | 'claimed' | 'purchased' | 'received' | 'archived'`) should NOT be used for claim tracking. Instead, claim status lives in `gift_claims.status`.
- Rationale: A single wishlist item can be claimed in multiple celebrations (different groups). The `wishlist_items.status` would conflict if one celebration claims it and another does not.
- The `wishlist_items.status` field can remain for the item owner's personal tracking (e.g., archiving items they no longer want).

**2. `celebrations` table (existing)**

- Gift claims are scoped to a celebration via `celebration_id` FK.
- The celebration detail screen (`app/(app)/celebration/[id].tsx`) already shows the celebrant's wishlist. Claims add an overlay showing claim status on each item.

**3. `celebration_contributions` table (existing)**

- Gift claims and contributions are complementary but independent:
  - Contributions track money pooled for the celebration fund.
  - Claims track who is buying which specific item.
- A group can use contributions, claims, or both.
- No FK relationship between claims and contributions.

**4. `lib/celebrations.ts` (existing service)**

- `getCelebration()` already fetches celebration details. Gift claims add a parallel fetch for claim data.
- `getCelebrations()` list view could show claim counts per celebration.

**5. `lib/wishlistItems.ts` (existing service)**

- `getWishlistItemsByUserId()` returns items for the celebrant. The celebration view currently shows these items via `LuxuryWishlistCard`. Claims add a "Claimed by X" or "Taken" badge to these cards.

**6. `lib/budget.ts` (existing service)**

- Budget tracking currently uses `celebration_contributions.amount`. If gift claims include amounts (split claims), these could optionally feed into budget calculations. However, recommend keeping them separate initially -- contributions are the "official" budget tracker.

### How Personal Details Connect to Existing Architecture

**1. `users` / `user_profiles` tables (existing)**

- Personal details are a separate table (not columns on users) because:
  - The fields are numerous and optional (would bloat the users row).
  - The data has different access patterns (rarely read, infrequently written).
  - Cleaner separation of concerns.
- Query pattern: Join or separate fetch from user_profiles.

**2. Profile screen (`app/profile/[id].tsx`)**

- Currently shows: avatar, display_name, birthday, member_since, email.
- Personal details add new sections: sizes, preferences, external links.
- Existing screen uses GlueStack UI components. New sections follow the same pattern.

**3. Settings profile screen (`app/(app)/settings/profile.tsx`)**

- Currently allows editing: display_name, avatar.
- Personal details add new editable sections with structured inputs.
- Use upsert pattern: check if `personal_details` row exists, create or update.

**4. Member cards (`components/groups/MemberCard.tsx`)**

- Currently shows: avatar, name, birthday countdown, favorite preview.
- Member notes add a small icon/indicator if notes exist for this member.
- Tapping a member card could navigate to an expanded profile view with personal details.

**5. Celebration detail screen (`app/(app)/celebration/[id].tsx`)**

- Currently shows celebrant's wishlist.
- Personal details add a "Quick Reference" section showing the celebrant's sizes, preferences, and external links -- critical for gift selection.

---

## New Components

### Services (lib/)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `lib/claims.ts` | Gift claim CRUD operations | `claimItem()`, `unclaimItem()`, `getClaimsForCelebration()`, `getClaimStatusForCelebrant()`, `updateClaimStatus()` |
| `lib/personalDetails.ts` | Personal details CRUD | `getPersonalDetails()`, `upsertPersonalDetails()` |
| `lib/memberNotes.ts` | Secret member notes CRUD | `getNotesForMember()`, `upsertNote()`, `deleteNote()` |

### UI Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `ClaimBadge` | Shows claim status on wishlist items ("Claimed by Alice", "Taken", "2 people splitting") | `components/claims/ClaimBadge.tsx` |
| `ClaimButton` | "Claim This" / "Unclaim" action button on wishlist cards | `components/claims/ClaimButton.tsx` |
| `ClaimModal` | Full claim form (claim type, amount for split, optional note) | `components/claims/ClaimModal.tsx` |
| `ClaimList` | List of claims for a celebration (Gift Leader dashboard view) | `components/claims/ClaimList.tsx` |
| `PersonalDetailsCard` | Read-only display of sizes/preferences/links | `components/profile/PersonalDetailsCard.tsx` |
| `PersonalDetailsForm` | Edit form for personal details with structured inputs | `components/profile/PersonalDetailsForm.tsx` |
| `SizeSelector` | Segmented control for shirt size, free text for others | `components/profile/SizeSelector.tsx` |
| `TagInput` | Multi-value input for colors, brands, hobbies (chip/tag UI) | `components/profile/TagInput.tsx` |
| `MemberNoteCard` | Displays a secret note about a member | `components/groups/MemberNoteCard.tsx` |
| `MemberNoteInput` | Inline text input for adding/editing a note | `components/groups/MemberNoteInput.tsx` |
| `QuickReferenceSection` | Celebrant's sizes/prefs shown in celebration detail view | `components/celebrations/QuickReferenceSection.tsx` |

### Routes

| Route | Purpose | Type |
|-------|---------|------|
| `app/(app)/settings/personal-details.tsx` | Edit personal details screen | NEW |
| No new routes for claims | Claims are inline within celebration detail | N/A |
| No new routes for notes | Notes are inline within member/profile views | N/A |

---

## Modified Components

### Screens

| Screen | Changes |
|--------|---------|
| `app/(app)/celebration/[id].tsx` | Add claim badges on wishlist items, add ClaimButton actions, add QuickReferenceSection for celebrant's personal details, add member notes section |
| `app/profile/[id].tsx` | Add PersonalDetailsCard section below existing profile info |
| `app/(app)/settings/profile.tsx` | Add navigation link to personal-details edit screen |
| `app/group/[id]/index.tsx` | Add note indicator on MemberCard, add route to expanded profile with notes |

### Components

| Component | Changes |
|-----------|---------|
| `LuxuryWishlistCard.tsx` | Add optional `claimStatus` prop to show ClaimBadge and ClaimButton |
| `MemberCard.tsx` | Add optional `hasNotes` indicator icon, optional notes count badge |

### Services

| Service | Changes |
|---------|---------|
| `lib/celebrations.ts` | `getCelebration()` optionally fetches claims alongside existing data |
| `utils/groups.ts` | `fetchGroupDetails()` optionally fetches note counts per member |

### Types

| File | Changes |
|------|---------|
| `types/database.types.ts` | Add `gift_claims`, `personal_details`, `member_notes` table type definitions |

---

## Data Flow

### Gift Claim Flow (Non-Celebrant)

```
User views celebration detail (gifts mode)
    |
    v
Load celebrant's wishlist items [existing flow]
    |
    v
Load claims for this celebration [NEW: getClaimsForCelebration()]
    |
    v
Merge claim data onto wishlist items
    - Each item gets: claimedBy[], claimType, totalClaimed
    |
    v
Render LuxuryWishlistCard with ClaimBadge
    - Unclaimed: "Claim This" button
    - Fully claimed: "Claimed by Alice" badge (or "Claimed by You")
    - Split claimed: "2/3 claimed ($45 of $60)" progress
    |
    v
User taps "Claim This"
    |
    v
ClaimModal opens
    - Claim type: Full | Split
    - If split: Amount input
    - Optional note
    |
    v
claimItem(wishlistItemId, celebrationId, claimType, amount?, note?)
    |
    v
INSERT into gift_claims
    - RLS validates: user is group member AND not celebrant
    |
    v
Refresh claim data
```

### Gift Claim Flow (Celebrant View)

```
Celebrant views their own wishlist items in app
    |
    v
App calls get_item_claim_status(celebrationId)
    - SECURITY DEFINER function returns: item_id, is_claimed, claim_count
    - Does NOT return: who claimed, notes, amounts
    |
    v
Render wishlist items with "Taken" badge (no claimer info)
    - Unclaimed items: normal display
    - Claimed items: "Someone has this covered!" badge
```

### Personal Details Flow

```
User navigates to Settings > Personal Details
    |
    v
Load existing personal_details [getPersonalDetails(userId)]
    - Returns null if no details saved yet
    |
    v
PersonalDetailsForm renders with existing data or empty defaults
    - Sizes section: shirt (dropdown), pants/shoe/ring/dress (free text)
    - Preferences section: colors, brands, hobbies (TagInput)
    - Dislikes/allergies section
    - External links section
    |
    v
User edits and taps "Save"
    |
    v
upsertPersonalDetails(userId, data)
    - UPSERT on user_id (unique constraint)
    |
    v
Success feedback, navigate back
```

### Secret Member Notes Flow

```
User views member in group context
    - Could be: celebration detail, member card, expanded profile
    |
    v
Load notes for this member in this group [getNotesForMember(groupId, aboutUserId)]
    - RLS automatically excludes notes about the current user
    |
    v
Display MemberNoteCards from other group members
    |
    v
User taps "Add Note" or edits existing note
    |
    v
MemberNoteInput renders inline
    |
    v
upsertNote(groupId, aboutUserId, content)
    - UPSERT on (group_id, about_user_id, author_id)
    |
    v
Refresh notes list
```

---

## Suggested Build Order

### Phase 1: Gift Claims Schema + Service (Foundation)

**Rationale:** Schema must exist before any UI can consume it. Gift claims are the higher-priority feature (directly improves gift coordination).

Tasks:
- Migration: Create `gift_claims` table with RLS policies
- Migration: Create `get_item_claim_status()` function
- Service: Create `lib/claims.ts` with CRUD functions
- Types: Add `gift_claims` to `database.types.ts`

**Dependencies:** None (standalone tables with FKs to existing tables).

### Phase 2: Gift Claims UI (Celebration Integration)

**Rationale:** Claims are useless without UI. This phase adds claim visualization and interaction to the existing celebration detail screen.

Tasks:
- Component: `ClaimBadge` (read-only claim status display)
- Component: `ClaimButton` (claim/unclaim action)
- Component: `ClaimModal` (full claim form with split support)
- Modify: `LuxuryWishlistCard` to accept claim status props
- Modify: `app/(app)/celebration/[id].tsx` to fetch and display claims
- Component: `ClaimList` (Gift Leader view of all claims)

**Dependencies:** Phase 1 (schema + service).

### Phase 3: Personal Details Schema + Service

**Rationale:** Independent of claims. Can start after or in parallel with Phase 2.

Tasks:
- Migration: Create `personal_details` table with RLS
- Service: Create `lib/personalDetails.ts`
- Types: Add `personal_details` to `database.types.ts`

**Dependencies:** None.

### Phase 4: Personal Details UI

**Rationale:** Requires schema from Phase 3.

Tasks:
- Component: `PersonalDetailsForm` (edit form)
- Component: `PersonalDetailsCard` (read-only display)
- Component: `SizeSelector`, `TagInput` (input primitives)
- Route: `app/(app)/settings/personal-details.tsx`
- Modify: `app/(app)/settings/profile.tsx` (add link to personal details)
- Modify: `app/profile/[id].tsx` (show personal details card)
- Component: `QuickReferenceSection` for celebration detail screen
- Modify: `app/(app)/celebration/[id].tsx` (add quick reference)

**Dependencies:** Phase 3.

### Phase 5: Member Notes Schema + UI

**Rationale:** Lower priority than claims and personal details. Depends on established patterns from earlier phases.

Tasks:
- Migration: Create `member_notes` table with owner-exclusion RLS
- Service: Create `lib/memberNotes.ts`
- Types: Add `member_notes` to `database.types.ts`
- Component: `MemberNoteCard`, `MemberNoteInput`
- Modify: `MemberCard` (add notes indicator)
- Modify: Celebration detail or member profile view (show/add notes)

**Dependencies:** Phases 1-4 establish patterns; Notes follow the same architecture.

### Phase ordering rationale:

1. **Claims first** because they directly enhance the core celebration coordination workflow. Members can immediately start claiming items, making gift buying less chaotic.
2. **Personal details second** because they help gift-givers make better choices (sizes, preferences).
3. **Member notes last** because they are an enhancement on top of personal details -- "what I've observed about this person" supplements "what this person told me about themselves."

---

## Performance Considerations

### Gift Claims Query Pattern

Claims should be fetched in a single batch alongside wishlist items in the celebration detail screen:

```typescript
// Fetch claims for all items in one query (not N+1)
const { data: claims } = await supabase
  .from('gift_claims')
  .select(`
    *,
    claimer:users!claimed_by (
      id, full_name, avatar_url
    )
  `)
  .eq('celebration_id', celebrationId);

// Build lookup map: itemId -> claims[]
const claimsByItem = new Map<string, GiftClaim[]>();
claims?.forEach(c => {
  const existing = claimsByItem.get(c.wishlist_item_id) || [];
  existing.push(c);
  claimsByItem.set(c.wishlist_item_id, existing);
});
```

### Personal Details Query

One row per user, fetched with profile data. Add to existing profile fetch:

```typescript
const [profile, details] = await Promise.all([
  supabase.from('user_profiles').select('*').eq('id', userId).single(),
  supabase.from('personal_details').select('*').eq('user_id', userId).maybeSingle(),
]);
```

### Member Notes Query

Batch fetch for all members in a celebration, not per-member:

```typescript
const { data: notes } = await supabase
  .from('member_notes')
  .select('*, author:users!author_id(id, full_name, avatar_url)')
  .eq('group_id', groupId)
  .eq('about_user_id', celebrantId);
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Gift claims schema | HIGH | Follows proven celebrant-exclusion pattern from chat/contributions |
| Gift claims RLS | HIGH | Identical pattern to `celebration_contributions` RLS |
| Celebrant "Taken" view | HIGH | SECURITY DEFINER function is a clean solution, follows `is_group_member()` pattern |
| Split claims design | MEDIUM | Multiple claims per item works in schema, but UI for split coordination may need iteration |
| Personal details schema | HIGH | Straightforward JSONB + text fields, standard upsert pattern |
| Personal details RLS | HIGH | Simple owner-based access, mirrors `users` table pattern |
| Member notes schema | HIGH | Clean per-group, per-author model with owner-exclusion RLS |
| Member notes RLS | HIGH | `about_user_id != auth.uid()` is simple and effective |
| UI integration | MEDIUM | Celebration detail screen is already complex (1400 lines). Adding claims and quick reference requires careful layout |
| Performance | HIGH | Batch queries, no N+1 patterns, indexed FKs |

## Risk Areas

### Celebration Detail Screen Complexity

The `app/(app)/celebration/[id].tsx` screen is already 1400 lines with info/chat toggle, greetings/gifts mode branching, contributions, wishlist display, and Gift Leader management. Adding claims UI, quick reference, and notes will increase complexity.

**Mitigation:** Extract claim-related logic into a custom hook (`useClaimData`). Extract the wishlist section with claims into a standalone component (`ClaimableWishlistSection`). Consider splitting the info view into sub-tabs (Gifts, Details, Notes) if the scroll gets too long.

### Split Claims UI/UX

Split claims are conceptually more complex than full claims. Users need to:
1. See how much is already covered
2. Pledge their portion
3. See remaining amount needed

**Mitigation:** Start with full claims only in Phase 2. Add split claim support as an enhancement after the basic claim flow is proven. The schema supports both from day one.

### Claim Status vs Item Status

The existing `wishlist_items.status` field includes `'claimed'` and `'purchased'` values. The new `gift_claims.status` also has these values. This creates potential confusion.

**Mitigation:** Document clearly that `wishlist_items.status` is for the item owner's personal tracking and `gift_claims.status` is for the claim lifecycle within a celebration. Do NOT sync them automatically. If needed later, add a view or computed field.

### Notes Privacy Expectations

Users may not immediately understand that their notes about someone are visible to other group members but NOT to the person themselves.

**Mitigation:** Add clear UI labels: "Only visible to other [Group Name] members" on the notes section. Add a confirmation dialog on first note creation explaining the privacy model.

---

*Research completed: 2026-02-05*
*Source: Existing codebase analysis (23 files read), established RLS patterns from celebrations/chat schema*
