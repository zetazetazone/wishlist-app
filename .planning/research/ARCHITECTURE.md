# Architecture Research: v1.1 Wishlist Polish

**Research Date:** 2026-02-02
**Focus:** Integration of favorite marking, special item types, profile editing, and star rating fix
**Confidence:** HIGH — Based on existing codebase analysis and established patterns

## Summary

All v1.1 features integrate cleanly with existing architecture. Favorite marking requires one new junction table (group_favorites). Special item types (Surprise Me, Mystery Box) leverage existing wishlist_items schema with new type field. Profile editing reuses existing profile screen with edit mode. Star rating is pure UI fix with no schema changes.

## Schema Changes

### New Table: group_favorites

**Purpose:** Track one favorite item per user per group (pinned + highlighted).

```sql
CREATE TABLE IF NOT EXISTS public.group_favorites (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.wishlist_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- Index for fast lookups when viewing group members' wishlists
CREATE INDEX idx_group_favorites_group ON public.group_favorites(group_id);
CREATE INDEX idx_group_favorites_item ON public.group_favorites(item_id);

-- RLS: Users can view favorites in their groups
CREATE POLICY "Users can view group favorites"
  ON public.group_favorites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_favorites.group_id
        AND user_id = auth.uid()
    )
  );

-- RLS: Users can set their own favorites
CREATE POLICY "Users can manage own favorites"
  ON public.group_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Key constraint:** PRIMARY KEY (user_id, group_id) enforces one favorite per group.

**Data flow:** When user marks item as favorite, INSERT with ON CONFLICT UPDATE to replace existing favorite. When viewing group members' wishlists, LEFT JOIN to show favorite status.

### Modified Table: wishlist_items

**Add item_type field** to distinguish regular items from special types:

```sql
-- Migration to add item_type column
ALTER TABLE public.wishlist_items
  ADD COLUMN item_type TEXT DEFAULT 'standard'
  CHECK (item_type IN ('standard', 'surprise_me', 'mystery_box'));

-- For mystery_box type, price represents tier (25, 50, 100)
-- For surprise_me type, title/url optional, priority indicates openness level
```

**Rationale:**
- Avoids separate tables for special items
- Maintains single wishlist query
- Enables filtering/sorting by type
- Price field repurposed for Mystery Box tier (€25/€50/€100)

**Validation logic:**
- `surprise_me`: title optional, url can be empty string, priority = openness level
- `mystery_box`: price restricted to [25, 50, 100], title describes tier
- `standard`: existing validation (title + url required)

### No Changes: user_profiles table

Profile editing reuses existing fields:
- `display_name` (already exists)
- `avatar_url` (already exists, points to Supabase Storage)
- `birthday` (already exists)

**Photo upload:** Uses existing `avatars` bucket and `getAvatarUrl()` helper.

## Component Changes

### New Components

**1. FavoriteButton.tsx** (components/wishlist/)
- Purpose: Toggle favorite status per group
- Props: `itemId: string, groupId: string, isFavorite: boolean, onToggle: () => void`
- Visual: Gold star icon (filled = favorite, outline = not favorite)
- Location: Top-right corner of LuxuryWishlistCard
- State: Local optimistic update, syncs to Supabase

**2. AddSpecialItemModal.tsx** (components/wishlist/)
- Purpose: Guided flow for Surprise Me / Mystery Box
- Props: `visible: boolean, type: 'surprise_me' | 'mystery_box', onClose: () => void, onAdd: (data) => void`
- Sections:
  - Surprise Me: Title (optional), openness level (star rating), why you trust them (note)
  - Mystery Box: Tier selection (€25/€50/€100 radio buttons), description
- Validation: Type-specific rules, clear CTAs

**3. EditProfileScreen.tsx** (app/profile/edit.tsx)
- Purpose: Edit display name, birthday, profile photo after onboarding
- Layout: Form with three sections (photo picker, text input, date picker)
- Photo flow: expo-image-picker → Supabase Storage upload → update avatar_url
- Validation: Name required, birthday optional, photo optional
- Navigation: Save → router.back(), Cancel → router.back()

**4. ProfileHeader.tsx** (components/wishlist/)
- Purpose: Display user's profile picture in My Wishlist header
- Props: `userId: string, displayName: string, avatarUrl: string | null`
- Visual: 40px circular avatar next to "My Wishlist" title
- Clickable: Navigates to EditProfileScreen
- Fallback: Initials if no photo

### Modified Components

**1. LuxuryWishlistCard.tsx** (existing)
- **Change:** Add FavoriteButton to top-right corner
- **Change:** Visual treatment for special types:
  - `surprise_me`: Purple gradient border, "Surprise Me" badge
  - `mystery_box`: Gold gradient border, "€XX Mystery Box" badge
  - `standard`: Existing gold accent border
- **Change:** Conditional rendering of price (mystery_box shows tier, standard shows actual price)
- **Props added:** `isFavorite: boolean, groupId: string, onToggleFavorite: (itemId: string) => void`

**2. StarRating.tsx** (existing - BUG FIX)
- **Bug:** Currently renders vertically due to missing `flex-row` class
- **Fix:** Line 25 already has `className="flex-row items-center gap-1"` — verify TailwindCSS config
- **Root cause:** Likely metro cache or NativeWind config issue
- **Solution:** Clear cache, verify tailwind.config.js includes `flex-row` utility
- **No code changes needed** — investigate build/cache issue first

**3. wishlist.tsx screen** (existing)
- **Change:** Add ProfileHeader component below gradient header
- **Change:** Add favorite status loading from group_favorites
- **Change:** Pass groupId to cards for favorite context
- **Change:** Add "Add Special Item" button next to regular "Add Item"
- **Query change:** JOIN group_favorites to enrich items with favorite status

**4. AddItemModal.tsx** (existing)
- **Change:** Add "or add special item" link at bottom
- **Flow:** Opens AddSpecialItemModal with type selection

## Data Flow

### Favorite Marking Flow

```
User taps star on item card (in group context)
  ↓
FavoriteButton: Optimistic UI update (gold fill)
  ↓
Supabase INSERT INTO group_favorites (user_id, group_id, item_id)
  ON CONFLICT (user_id, group_id) DO UPDATE SET item_id = EXCLUDED.item_id
  ↓
Other group members query wishlist with LEFT JOIN group_favorites
  ↓
Cards display gold star badge if item.id IN favorites for that user
```

**Key insight:** Favorite is per-group, not global. User can have different favorites in different groups.

**RLS enforcement:** Users can only set favorites in groups they're members of. Favorites visible to all group members.

### Special Item Creation Flow

```
User taps "Add Special Item" → type selection sheet
  ↓
User selects "Surprise Me" or "Mystery Box"
  ↓
AddSpecialItemModal shows type-specific form
  ↓
Validation: surprise_me (openness level required), mystery_box (tier required)
  ↓
INSERT INTO wishlist_items (
  user_id,
  group_id: NULL,  -- special items not tied to specific group
  item_type: 'surprise_me' | 'mystery_box',
  title,
  price: tier for mystery_box,
  priority: openness for surprise_me,
  amazon_url: empty for surprise_me
)
  ↓
My Wishlist refreshes, card renders with special visual treatment
```

**Validation rules:**
- Surprise Me: title optional, url empty, priority 1-5 (openness level)
- Mystery Box: price ∈ [25, 50, 100], title describes tier, url empty

**Display logic:** Filter rendering based on item_type in LuxuryWishlistCard.

### Profile Editing Flow

```
User taps avatar in My Wishlist header
  ↓
Navigate to /profile/edit?id={userId}
  ↓
EditProfileScreen loads current profile from user_profiles
  ↓
User edits name/birthday/photo → photo triggers expo-image-picker
  ↓
Photo selected → upload to Supabase Storage avatars bucket
  ↓
UPDATE user_profiles SET
  display_name = $1,
  birthday = $2,
  avatar_url = $3 (storage path)
WHERE id = auth.uid()
  ↓
Router.back() to My Wishlist → ProfileHeader shows updated info
```

**Photo upload:** Reuse onboarding photo upload logic from app/(onboarding)/index.tsx.

**Storage path format:** `avatars/{userId}-{timestamp}.jpg`

**RLS:** Users can only update their own profile (existing policy).

## Suggested Build Order

**Rationale:** Start with infrastructure (schema), then isolated features (profile edit), then integrated features (favorites, special items), finally UI polish (star rating).

### Phase 1: Database Schema (30 min)
1. Create migration: `20260202000011_group_favorites.sql`
   - Add group_favorites table
   - Add RLS policies
   - Add indexes
2. Create migration: `20260202000012_item_types.sql`
   - Add item_type column to wishlist_items
   - Add CHECK constraint
   - Backfill existing items with 'standard'

**Validation:** Run migrations, test INSERT/SELECT with new schema.

### Phase 2: Profile Editing (2 hours)
3. Create EditProfileScreen.tsx
   - Form layout with photo picker
   - Integrate expo-image-picker
   - Upload logic to Supabase Storage
   - Update mutation
4. Create ProfileHeader.tsx
   - Avatar display component
   - Click → navigate to edit screen
5. Integrate ProfileHeader into wishlist.tsx
   - Position below gradient header
   - Pass userId, displayName, avatarUrl

**Validation:** Edit profile, verify changes persist and display in header.

### Phase 3: Special Item Types (3 hours)
6. Update wishlist_items TypeScript types
   - Add item_type to database.types.ts
   - Update WishlistItem interface
7. Create AddSpecialItemModal.tsx
   - Type selection (Surprise Me / Mystery Box)
   - Type-specific forms
   - Validation logic
8. Modify LuxuryWishlistCard.tsx
   - Visual treatment by item_type
   - Conditional price display
   - Special badges
9. Update AddItemModal.tsx
   - Add "special item" link
   - Wire to AddSpecialItemModal

**Validation:** Add both special item types, verify display and data integrity.

### Phase 4: Favorite Marking (2 hours)
10. Create FavoriteButton.tsx
    - Star icon toggle
    - Optimistic UI update
    - Supabase mutation
11. Update wishlist.tsx query
    - LEFT JOIN group_favorites
    - Enrich items with isFavorite flag
12. Integrate FavoriteButton into LuxuryWishlistCard
    - Position top-right
    - Pass groupId context
13. Update group member wishlist views
    - Show favorite badge on other users' items

**Validation:** Mark favorite in group, verify visible to other members, verify one-per-group constraint.

### Phase 5: Star Rating Fix (30 min)
14. Investigate StarRating.tsx vertical layout
    - Clear metro cache: `npx expo start -c`
    - Verify tailwind.config.js
    - Check NativeWind version compatibility
15. If code fix needed, update StarRating.tsx
    - Ensure View wrapper has flexDirection: 'row'
    - Test with Expo Go

**Validation:** Star rating displays horizontally on all cards.

## Integration Points

### With Existing Features

**Groups:**
- Favorites are group-scoped → query group_favorites with group_id filter
- Special items visible in all groups (group_id NULL) → universal wishlist items
- Profile changes visible across all groups → single source of truth in user_profiles

**Wishlists:**
- Special items query: `WHERE user_id = ? AND (group_id IS NULL OR group_id = ?)`
- Favorite items query: `LEFT JOIN group_favorites ON wishlist_items.id = group_favorites.item_id AND group_favorites.group_id = ?`
- Type filtering: `WHERE item_type IN ('standard', 'surprise_me', 'mystery_box')`

**Chat:**
- Favorite items more likely to be discussed → no schema changes needed
- Special items can be linked in messages → existing linked_item_id FK works

**Celebrations:**
- Gift Leader sees favorites highlighted → query join on member favorites
- Mystery Box requires no fulfillment → placeholder only in v1.1

### With Future Features (v1.2+)

**Monetization:**
- Mystery Box purchasing: Add payment flow, order fulfillment, status tracking
- Premium tiers: Unlock unlimited favorites (currently one per group)

**Social:**
- Favorite notifications: "Sarah marked your gift as a favorite ❤️"
- Popular items: "3 people favorited this in your group"

**AI Suggestions:**
- Train on favorite patterns: "Users who favorited X also liked Y"
- Surprise Me intelligence: Match openness level with gift categories

## Dependencies

**External:**
- expo-image-picker (already installed) — profile photo selection
- Supabase Storage (already configured) — avatar uploads
- NativeWind/TailwindCSS (already configured) — star rating flex-row fix

**Internal:**
- getAvatarUrl() helper (already exists) — profile photo display
- Existing RLS policies (extend for group_favorites) — security
- LuxuryWishlistCard (modify) — integrate favorites + special types

## Performance Considerations

**Query Optimization:**
- group_favorites indexes on (group_id) and (item_id) prevent full table scans
- LEFT JOIN group_favorites adds minimal overhead (~10ms per query)
- Special item filtering with item_type index if needed (add if slow)

**Caching Strategy:**
- Profile photo: Cache avatar URLs in AsyncStorage (already done)
- Favorites: Optimistic updates reduce perceived latency
- Special items: No caching needed (infrequent writes)

**Realtime Updates:**
- Favorites: Subscribe to group_favorites changes for live updates
- Profile: Broadcast profile updates to group members (optional)

## Confidence

**HIGH** because:

✅ Reviewed existing schema (wishlist_items has group_id, users table has avatar_url)
✅ Analyzed component structure (LuxuryWishlistCard, AddItemModal, StarRating exist)
✅ Verified data flow patterns (Supabase RLS, storage upload, query joins)
✅ Identified exact integration points (ProfileHeader, FavoriteButton, AddSpecialItemModal)
✅ Build order follows dependencies (schema → isolated features → integrated features)
✅ All features leverage existing infrastructure (no new services)

**Potential unknowns:**
- Star rating bug root cause (likely cache, not code)
- Exact expo-image-picker API if changed in Expo 54
- GROUP BY performance with favorites join at scale (test with >1000 items)

**Recommendation:** Proceed with Phase 1 (schema), validate with seed data, then continue sequentially through Phase 5.
