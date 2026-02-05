# Stack Research: v1.3 Gift Claims & Personal Details

**Researched:** 2026-02-05
**Overall confidence:** HIGH

## Summary

**No new npm dependencies required.** Both gift claiming and personal detail profiles are implementable entirely with the existing stack. The primary work is database schema additions (new tables + columns), new RLS policies following proven celebrant-exclusion patterns, and new service/UI code using existing libraries.

Key finding: The existing codebase already has the `status` field on `wishlist_items` with values including `'claimed'`, the `contributions` table for per-item tracking, proven RLS celebrant-exclusion patterns (used in chat_rooms, chat_messages, celebration_contributions), SECURITY DEFINER helper functions (`is_group_member`, `is_group_admin`), and all the UI components needed (Gluestack forms, bottom sheets, FlashList, expo-linking for URLs). The new features are a composition of existing patterns, not new technology.

---

## Required Additions

### New Dependencies: None

All capabilities needed for v1.3 features are covered by the existing stack.

| Capability Needed | Existing Solution | Confidence |
|-------------------|-------------------|------------|
| Gift claim/unclaim | Supabase RLS + `wishlist_items.status` field (already has 'claimed') | HIGH |
| Split contributions tracking | New `gift_claims` table + Supabase queries (pattern from `celebration_contributions`) | HIGH |
| Celebrant exclusion for claims | RLS policies (proven pattern from `chat_rooms`, `chat_messages`) | HIGH |
| Personal details form | Gluestack UI (Input, Select, FormControl) - already installed | HIGH |
| JSONB storage for flexible preferences | PostgreSQL native JSONB + Supabase client | HIGH |
| JSONB schema validation | `pg_jsonschema` extension (pre-installed on Supabase, just needs enabling) | HIGH |
| External links opening | `expo-linking@8.0.11` `openURL()` - already installed | HIGH |
| Secret member notes | New `member_notes` table + Supabase RLS | HIGH |
| Realtime claim updates | Supabase Realtime `postgres_changes` (already used for chat_messages) | HIGH |
| Dropdown/picker for sizes | Gluestack UI Select component - already installed | HIGH |
| Profile data display | Existing member card pattern + new detail section | HIGH |

### Database-Only Additions (No npm packages)

The new features require schema additions at the PostgreSQL level:

**1. `gift_claims` table** - Tracks who claimed which wishlist item

Purpose: Enables claim/unclaim functionality with optional split contributions. Separate from the existing `contributions` table (which is per-item legacy from v1.0 initial schema) and `celebration_contributions` (which is per-celebration pot).

```sql
-- New table following existing patterns
CREATE TABLE public.gift_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.wishlist_items(id) ON DELETE CASCADE NOT NULL,
  claimer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  contribution_amount NUMERIC,  -- NULL = claiming full item, set = split contribution
  status TEXT CHECK (status IN ('claimed', 'purchased')) DEFAULT 'claimed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**2. `personal_details` table or column** - Stores user sizes, preferences

Two approaches evaluated (recommendation below):
- **Approach A: JSONB column on `users` table** - Single column stores flexible key-value data
- **Approach B: Dedicated `personal_details` table with JSONB** - Separate table for cleaner separation

**3. `member_notes` table** - Secret notes from group members about each other

```sql
-- Secret notes one member writes about another (within a group context)
CREATE TABLE public.member_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, author_id, subject_id)  -- One note per author per subject per group
);
```

**4. `pg_jsonschema` extension** - Validates JSONB personal details structure

Already available on Supabase (pre-installed), just needs `CREATE EXTENSION pg_jsonschema WITH SCHEMA extensions;`. Provides database-level validation so malformed JSON is rejected before storage, rather than relying solely on client-side validation.

---

## Existing Stack Reuse

### Gift Claiming - Fully Covered

| Need | Existing Asset | Location |
|------|---------------|----------|
| Claim status tracking | `wishlist_items.status` already includes `'claimed'` | `types/database.types.ts` line 152 |
| Celebrant exclusion RLS | Proven pattern with `c.celebrant_id != auth.uid()` | `supabase/migrations/20260202000005_celebrations.sql` |
| RLS helper functions | `is_group_member()`, `is_group_admin()` SECURITY DEFINER | `migrations/20260202000003`, `20260205000003` |
| Contribution tracking pattern | `celebration_contributions` upsert + select pattern | `lib/contributions.ts` |
| Service function pattern | `{ data, error }` tuple return pattern | All `lib/*.ts` files |
| Realtime subscription | `supabase_realtime` publication pattern | `migrations/20260202000005` (chat_messages) |
| Bottom sheet UI for actions | `@gorhom/bottom-sheet` for claim/unclaim actions | `components/wishlist/LuxuryBottomSheet.tsx` |
| Progress indicators | `ContributionProgress` component for split displays | `components/celebrations/ContributionProgress.tsx` |

### Personal Details - Fully Covered

| Need | Existing Asset | Location |
|------|---------------|----------|
| Profile editing UI | Profile settings screen pattern | `app/(app)/settings/profile.tsx` |
| Form inputs | Gluestack UI Input, InputField, Select | Already imported in profile screen |
| Avatar display | Avatar, AvatarImage, AvatarFallbackText | `app/(app)/settings/profile.tsx` |
| External URL opening | `expo-linking` Linking.openURL() | `package.json` - `expo-linking@8.0.11` |
| User profile queries | `user_profiles` view + Supabase select | `lib/contributions.ts`, `app/(app)/settings/profile.tsx` |
| JSONB column support | Supabase client handles JSONB natively (read/write as JS objects) | `@supabase/supabase-js@2.93.3` |
| Member card display | MemberCard component | `components/groups/MemberCard.tsx` |
| Member list in group view | Group detail screen with sorted members | `app/group/[id]/index.tsx` |

### Supabase JSONB Support - Native

The `@supabase/supabase-js` client handles JSONB columns transparently:
- **Read**: JSONB columns are returned as parsed JavaScript objects
- **Write**: JavaScript objects are serialized to JSONB automatically
- **Filter**: `.eq()`, `.contains()`, `.containedBy()` operators work on JSONB
- **Partial update**: Requires an RPC function for deep merge (supabase `.update()` replaces the whole column)

For personal details, the volume of data per user is small (shirt size, shoe size, a few preferences). Full-column replacement on update is acceptable and simpler than implementing an RPC partial-merge function.

---

## Rejected Alternatives

| Library/Approach | Why Not |
|------------------|---------|
| `react-hook-form` | Personal details form has ~8 fields. The existing `useState` pattern used throughout the app (see `profile.tsx`) is sufficient. Adding a form library for one screen creates inconsistency. |
| `yup` / `zod` (client validation) | Validation is simple (non-empty strings, valid URLs, enum values). PostgreSQL CHECK constraints + `pg_jsonschema` provide database-level validation. Client-side validation is basic regex/length checks. |
| `zustand` / `redux` (state management) | Gift claim state can be managed with component-local state + Supabase Realtime subscriptions. The app has no global state manager and adding one for this feature would be scope creep. |
| `expo-web-browser` (in-app browser) | `expo-linking.openURL()` opens external browser which is the standard pattern for external links (Amazon, other stores). In-app browser adds a dependency and is unnecessary for "view this product" links. |
| Dedicated columns instead of JSONB for personal details | User preferences are semi-structured: different users care about different sizes (shirt, shoe, ring, pants). Some may have 2 preferences, others 10. JSONB handles this flexibility without schema migrations for each new preference type. Known-and-stable fields (like `shirt_size`) could be columns, but the mix of known and unknown preferences makes JSONB the better choice per Supabase's own recommendation. |
| Separate `external_links` table | External links (Amazon wishlist URL, Pinterest board, etc.) are per-user with low cardinality (2-5 links). A JSONB array on the personal details record is simpler than a join table and sufficient for the expected data volume. |
| EAV (Entity-Attribute-Value) pattern for preferences | Classic anti-pattern. Poor query performance, impossible to validate, harder to reason about. JSONB with `pg_jsonschema` is the modern PostgreSQL equivalent with better performance and validation. |

---

## Integration Points

### 1. Gift Claims -> Wishlist Items

The `wishlist_items` table already has a `status` field with `'claimed'` as a valid value. Gift claiming integrates by:
- Creating a row in the new `gift_claims` table (who claimed it)
- Updating `wishlist_items.status` to `'claimed'` (what changed)
- RLS on `gift_claims` excludes the celebrant (they see status='claimed' on the item but not who claimed it)

The existing `wishlist_items` RLS allows group members to SELECT items. The claim action needs a new policy: group members (except celebrant) can INSERT/UPDATE/DELETE on `gift_claims`.

### 2. Gift Claims -> Celebrations

Gift claims can work in two modes based on the existing `groups.mode`:
- **Gifts mode**: Full claim/unclaim with split contributions, celebrant exclusion
- **Greetings mode**: Claims are hidden or disabled (no gifts in greetings mode)

This reuses the existing mode system from v1.2.

### 3. Gift Claims -> Realtime

Add `gift_claims` to the `supabase_realtime` publication (same pattern as `chat_messages`). This enables live updates when someone claims/unclaims an item -- other group members see the change immediately.

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_claims;
```

### 4. Personal Details -> User Profiles

Personal details extend the existing `users` / `user_profiles` system. Two integration approaches:

**Recommended: New `personal_details` table**
- Keeps the users table clean and focused on auth/identity
- Personal details have different access patterns (viewed by group members, edited by owner)
- RLS can be scoped differently (group members can view but only owner can edit)
- JSONB `sizes`, `preferences`, `external_links` columns with `pg_jsonschema` validation

**Why not a column on users:**
- The `users` table is already extended with `onboarding_completed` from v1.0
- Personal details are optional and potentially large (JSONB)
- Different RLS requirements: `users` has "all users can view" but personal details may need group-scoped visibility

### 5. Member Notes -> Group Context

Member notes are scoped to a group (not global), so the same member can have different notes in different groups. This matches the existing group-scoping pattern used in `group_favorites` (one favorite per user per group).

RLS pattern: Author can CRUD their own notes. Group members can view notes about any subject in their groups (to help coordinate gifts). The subject user cannot see notes about themselves (follows the celebrant-exclusion philosophy).

### 6. Personal Details -> Member Card Display

The `MemberCard` component in `app/group/[id]/index.tsx` already shows member info and favorite items. Personal details would add a "View Details" action that opens a detail view showing:
- Sizes (shirt, shoe, ring, etc.)
- Preferences (favorite colors, brands, etc.)
- External links (Amazon list, Pinterest, etc.)
- Secret member notes (from other group members)

This uses the existing `expo-linking.openURL()` for external links and Gluestack UI components for the detail display.

---

## Schema Design Recommendations

### Personal Details JSONB Structure

```typescript
// Recommended JSONB structure for personal_details.sizes
interface Sizes {
  shirt?: string;       // "S", "M", "L", "XL", etc.
  pants?: string;       // "32x30", "Medium", etc.
  shoe?: string;        // "10", "10.5", "42 EU", etc.
  ring?: string;        // "7", "8", etc.
  dress?: string;       // "6", "8", "M", etc.
  hat?: string;         // "S/M", "L/XL", "7 1/4", etc.
  [key: string]: string | undefined;  // Extensible
}

// Recommended JSONB structure for personal_details.preferences
interface Preferences {
  favorite_colors?: string[];
  favorite_brands?: string[];
  interests?: string[];
  dislikes?: string[];
  dietary_restrictions?: string[];
  [key: string]: string[] | string | undefined;
}

// Recommended JSONB structure for personal_details.external_links
interface ExternalLinks {
  amazon_wishlist?: string;
  pinterest?: string;
  etsy?: string;
  other?: Array<{ label: string; url: string }>;
}
```

### pg_jsonschema Validation

```sql
-- Validate sizes JSONB has only string values
ALTER TABLE personal_details
ADD CONSTRAINT sizes_schema CHECK (
  sizes IS NULL OR
  extensions.jsonb_matches_schema(
    '{"type":"object","additionalProperties":{"type":"string"}}',
    sizes
  )
);
```

This prevents malformed data at the database level without requiring client-side validation libraries.

---

## Realtime Considerations for Gift Claims

The app already uses Supabase Realtime for `chat_messages`. For gift claims, the same pattern applies but with an important caveat:

**RLS + Realtime interaction**: When RLS is enabled and a table is in the realtime publication, Supabase checks each subscriber's RLS policy on every change event. For a group of 10 members where one person claims an item, Supabase performs 10 RLS checks (one per subscriber).

**At the scale of this app** (small friend groups, ~5-15 members), this is not a performance concern. The celebrant-exclusion RLS check is a simple join through celebrations + group_members, same as the existing chat pattern.

**If scale becomes a concern later**: Supabase recommends using Broadcast instead of Postgres Changes. But this is a premature optimization for a birthday gift coordination app.

---

## Confidence Assessment

| Area | Confidence | Evidence |
|------|------------|---------|
| No new npm dependencies needed | HIGH | All features map to existing installed packages; verified against package.json |
| Gift claims via existing status field | HIGH | `wishlist_items.status` already includes 'claimed' value (database.types.ts line 152) |
| Celebrant exclusion RLS pattern | HIGH | Proven pattern in 3 existing tables (chat_rooms, chat_messages, celebration_contributions) |
| JSONB for personal details | HIGH | Supabase official docs recommend JSONB for semi-structured user data; pg_jsonschema available for validation |
| expo-linking for external URLs | HIGH | Already installed (v8.0.11); `Linking.openURL()` is the standard Expo pattern for external browser |
| Supabase Realtime for claims | HIGH | Already implemented for chat_messages; same pattern applies |
| Gluestack UI for forms | HIGH | Already used in profile settings screen with Input, InputField, Avatar, Button, etc. |
| pg_jsonschema availability | HIGH | Pre-installed on Supabase (needs `CREATE EXTENSION`); verified via Supabase docs |

---

## Sources

- [Supabase: Managing JSON and unstructured data](https://supabase.com/docs/guides/database/json) -- JSONB best practices and structured vs unstructured guidance
- [Supabase: pg_jsonschema extension docs](https://supabase.com/docs/guides/database/extensions/pg_jsonschema) -- JSON Schema validation, pre-installed on Supabase
- [Supabase: RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- RLS performance guidance for JSONB columns and security definer functions
- [Supabase: Postgres Changes (Realtime)](https://supabase.com/docs/guides/realtime/postgres-changes) -- Realtime subscription patterns for table changes
- [Expo: Linking into other apps](https://docs.expo.dev/linking/into-other-apps/) -- expo-linking openURL for external browser
- [Expo: Linking SDK reference](https://docs.expo.dev/versions/latest/sdk/linking/) -- Linking.openURL API
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS policy patterns
- [GitHub: supabase/pg_jsonschema](https://github.com/supabase/pg_jsonschema) -- pg_jsonschema extension source and docs
- [Supabase: Column Level Security](https://supabase.com/docs/guides/database/postgres/column-level-security) -- Relevant for personal details visibility control

---

## Previous Research (Preserved)

### v1.2 Group Experience (2026-02-04)
No new dependencies needed. expo-image-picker + Supabase Storage for group photos. Gluestack UI for mode/budget selection. PostgreSQL aggregations for budget calculations.

### v1.1 Wishlist Polish (2026-02-03)
No new dependencies needed. Existing StarRating, expo-image-picker, MaterialCommunityIcons, NativeWind sufficient for all UI polish features.

---
*Research completed: 2026-02-05*
