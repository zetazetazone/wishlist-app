---
phase: quick-007
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260218000002_add_wishlist_owner_fields.sql
  - types/database.types.ts
  - lib/wishlists.ts
  - components/wishlist/CreateWishlistModal.tsx
  - src/i18n/locales/en.json
  - src/i18n/locales/es.json
autonomous: true

must_haves:
  truths:
    - "User can select visibility (public/private/friends) when creating/editing a wishlist"
    - "User can select owner type (self/other_manual/other_user) when creating a wishlist"
    - "When owner_type is 'other_manual', user can enter a name"
    - "When owner_type is 'other_user', user can select a friend from their friend list"
  artifacts:
    - path: "supabase/migrations/20260218000002_add_wishlist_owner_fields.sql"
      provides: "Database schema with owner_type, for_user_id, for_name columns"
      contains: "ADD COLUMN owner_type"
    - path: "components/wishlist/CreateWishlistModal.tsx"
      provides: "Enhanced modal with visibility and owner type controls"
      min_lines: 300
  key_links:
    - from: "components/wishlist/CreateWishlistModal.tsx"
      to: "lib/wishlists.ts"
      via: "createWishlist mutation"
      pattern: "createMutation.mutateAsync"
---

<objective>
Enhance CreateWishlistModal with visibility toggle, owner type selection, and associated form fields.

Purpose: Allow users to create wishlists with different visibility settings and for different recipients (themselves, a manually-entered name, or a friend from their list).

Output: Database migration, updated types, enhanced modal UI with new controls.
</objective>

<execution_context>
@/home/zetaz/.claude/get-shit-done/workflows/execute-plan.md
@/home/zetaz/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/wishlist/CreateWishlistModal.tsx
@lib/wishlists.ts
@lib/friends.ts
@types/database.types.ts
@src/i18n/locales/en.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add database migration for owner fields</name>
  <files>supabase/migrations/20260218000002_add_wishlist_owner_fields.sql</files>
  <action>
Create migration adding three new columns to wishlists table:

1. `owner_type` TEXT DEFAULT 'self' CHECK (owner_type IN ('self', 'other_manual', 'other_user'))
   - 'self': wishlist for the user themselves (default, matches existing behavior)
   - 'other_manual': wishlist for someone not on the app (store name in for_name)
   - 'other_user': wishlist for a friend (store friend's user_id in for_user_id)

2. `for_user_id` UUID REFERENCES users(id) ON DELETE SET NULL
   - Only populated when owner_type = 'other_user'
   - Nullable, FK to users table

3. `for_name` TEXT
   - Only populated when owner_type = 'other_manual'
   - Nullable, stores manually entered name

Add CHECK constraint:
- When owner_type = 'other_manual', for_name must not be null
- When owner_type = 'other_user', for_user_id must not be null

Add comments documenting the columns.
  </action>
  <verify>npx supabase db reset --local (if local Supabase running) OR review migration SQL syntax</verify>
  <done>Migration file exists with correct ALTER TABLE statements and constraints</done>
</task>

<task type="auto">
  <name>Task 2: Update types and lib with new fields</name>
  <files>types/database.types.ts, lib/wishlists.ts</files>
  <action>
1. Update types/database.types.ts wishlists table:
   - Add to Row: owner_type: string | null, for_user_id: string | null, for_name: string | null
   - Add to Insert: owner_type?: string | null, for_user_id?: string | null, for_name?: string | null
   - Add to Update: owner_type?: string | null, for_user_id?: string | null, for_name?: string | null

2. Add TypeScript types in lib/wishlists.ts:
   ```typescript
   export type WishlistOwnerType = 'self' | 'other_manual' | 'other_user';
   export type WishlistVisibility = 'public' | 'private' | 'friends';
   ```

No changes to CRUD functions needed - they use generic types from Supabase.
  </action>
  <verify>npx tsc --noEmit (check for type errors)</verify>
  <done>Types updated, no TypeScript errors related to wishlists</done>
</task>

<task type="auto">
  <name>Task 3: Enhance CreateWishlistModal with visibility and owner controls</name>
  <files>components/wishlist/CreateWishlistModal.tsx, src/i18n/locales/en.json, src/i18n/locales/es.json</files>
  <action>
1. Add new state variables:
   - visibility: WishlistVisibility (default: 'public')
   - ownerType: WishlistOwnerType (default: 'self')
   - forName: string (for manual name entry)
   - forUserId: string | null (for friend selection)
   - friends: FriendWithProfile[] (loaded on mount)
   - showFriendPicker: boolean

2. Import getFriends from lib/friends and WishlistOwnerType, WishlistVisibility from lib/wishlists.

3. Load friends list when modal opens (only needed if selecting 'other_user'):
   ```typescript
   useEffect(() => {
     if (visible && ownerType === 'other_user') {
       getFriends().then(setFriends);
     }
   }, [visible, ownerType]);
   ```

4. Add UI controls after emoji picker section:

   a) Visibility Selector - segmented control with 3 options:
      - Public (globe icon)
      - Private (lock icon)
      - Friends Only (users icon)
      Style: horizontal row of TouchableOpacity buttons, selected state highlighted

   b) Owner Type Selector - vertical radio group:
      - "For myself" (default, person icon)
      - "For someone else" (shows text input when selected)
      - "For a friend" (shows friend picker when selected)

   c) Conditional inputs:
      - When ownerType === 'other_manual': Show TextInput for forName (placeholder: t('wishlists.enterName'))
      - When ownerType === 'other_user': Show friend picker (ScrollView/FlatList of friends with avatar, name, radio button)

5. Update handleSubmit to include new fields:
   ```typescript
   await createMutation.mutateAsync({
     user_id: user.id,
     name: name.trim(),
     emoji,
     visibility,
     owner_type: ownerType,
     for_name: ownerType === 'other_manual' ? forName.trim() : null,
     for_user_id: ownerType === 'other_user' ? forUserId : null,
     is_default: false,
   });
   ```

6. Add validation:
   - If ownerType === 'other_manual' and forName is empty, show error
   - If ownerType === 'other_user' and forUserId is null, show error

7. Reset new fields when modal closes or editingWishlist changes.

8. For edit mode: Load existing values from editingWishlist (visibility, owner_type, for_name, for_user_id).

9. Add translation keys to en.json under "wishlists":
   ```json
   "visibility": "Visibility",
   "public": "Public",
   "private": "Private",
   "friendsOnly": "Friends Only",
   "ownerType": "This wishlist is for",
   "forMyself": "For myself",
   "forOther": "For someone else",
   "forFriend": "For a friend",
   "enterName": "Enter their name",
   "selectFriend": "Select a friend",
   "noFriendsYet": "You don't have any friends yet"
   ```

10. Add Spanish translations to es.json under "wishlists":
    ```json
    "visibility": "Visibilidad",
    "public": "Publico",
    "private": "Privado",
    "friendsOnly": "Solo amigos",
    "ownerType": "Esta lista es para",
    "forMyself": "Para mi",
    "forOther": "Para otra persona",
    "forFriend": "Para un amigo",
    "enterName": "Ingresa su nombre",
    "selectFriend": "Selecciona un amigo",
    "noFriendsYet": "Aun no tienes amigos"
    ```

Styling approach:
- Use existing theme (colors.burgundy, colors.cream, spacing, borderRadius)
- Segmented control: flexDirection: 'row', equal flex for buttons
- Selected state: backgroundColor: colors.burgundy[600], color: white
- Friend list items: flexDirection: 'row', avatar (32px), name, checkmark if selected
  </action>
  <verify>
1. Open app, navigate to wishlists tab
2. Tap create wishlist
3. Verify visibility selector appears with 3 options (Public selected by default)
4. Verify owner type selector appears with "For myself" selected by default
5. Select "For someone else" - verify text input appears
6. Select "For a friend" - verify friend list appears (or "no friends" message)
7. Create wishlist with each combination and verify data saved correctly
  </verify>
  <done>
- CreateWishlistModal shows visibility selector with 3 options
- CreateWishlistModal shows owner type selector with 3 options
- Selecting "For someone else" shows name input
- Selecting "For a friend" shows friend picker
- Form validates new required fields
- Creates wishlist with correct visibility, owner_type, for_name, for_user_id values
- Translation keys added for both en and es locales
  </done>
</task>

</tasks>

<verification>
1. Database migration applies without errors
2. TypeScript compiles without errors (npx tsc --noEmit)
3. CreateWishlistModal renders all new controls
4. Creating a wishlist with visibility='private' saves correctly
5. Creating a wishlist with owner_type='other_manual' and for_name saves correctly
6. Creating a wishlist with owner_type='other_user' and for_user_id saves correctly
7. Editing a wishlist loads existing visibility/owner values
</verification>

<success_criteria>
- All 3 visibility options selectable and saved to database
- All 3 owner type options functional with appropriate conditional inputs
- Form validation prevents submission with missing required fields
- Translation keys work in both English and Spanish
- No regression to existing emoji picker and name input functionality
</success_criteria>

<output>
After completion, create `.planning/quick/007-enhance-create-wishlist-modal-with-emoji/007-SUMMARY.md`
</output>
