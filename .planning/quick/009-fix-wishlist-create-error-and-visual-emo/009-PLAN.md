---
phase: quick-009
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/wishlist/CreateWishlistModal.tsx
  - components/wishlist/EmojiPickerModal.tsx
autonomous: true

must_haves:
  truths:
    - "User can create a wishlist without database errors"
    - "User can edit an existing wishlist without database errors"
    - "User sees a grid of emojis when opening the emoji picker"
    - "User can tap an emoji to select it"
  artifacts:
    - path: "components/wishlist/CreateWishlistModal.tsx"
      provides: "Wishlist create/edit form that only uses existing database columns"
    - path: "components/wishlist/EmojiPickerModal.tsx"
      provides: "Visual emoji picker with visible emoji grid"
  key_links:
    - from: "CreateWishlistModal.tsx"
      to: "lib/wishlists.ts"
      via: "useCreateWishlist, useUpdateWishlist hooks"
      pattern: "createMutation|updateMutation"
---

<objective>
Fix two blocking issues in wishlist functionality:

1. **Database Error**: The code tries to use columns (`for_name`, `owner_type`, `for_user_id`) that don't exist in the database yet. The migration exists but hasn't been applied. Solution: Remove these fields from the create/update mutations until migration is applied.

2. **Emoji Picker Not Showing Emojis**: The emoji grid has no explicit height, causing it to collapse. The modal layout needs a minimum height for the emoji content to be visible.

Purpose: Unblock wishlist creation and provide working emoji selection
Output: Working CreateWishlistModal and EmojiPickerModal
</objective>

<execution_context>
@/home/zetaz/.claude/get-shit-done/workflows/execute-plan.md
@/home/zetaz/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/wishlist/CreateWishlistModal.tsx
@components/wishlist/EmojiPickerModal.tsx
@lib/wishlists.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove non-existent database columns from wishlist mutations</name>
  <files>components/wishlist/CreateWishlistModal.tsx</files>
  <action>
The CreateWishlistModal is trying to insert/update columns that don't exist in the database yet:
- `owner_type`
- `for_name`
- `for_user_id`
- `visibility`

These were added in migration `20260218000002_add_wishlist_owner_fields.sql` which hasn't been applied.

**Changes to make:**

1. **Remove the owner type and visibility state/UI** (lines 52-57, 84-95, 114-123, 374-414):
   - Remove state: `visibility`, `ownerType`, `forName`, `forUserId`, `friends`, `loadingFriends`
   - Remove the useEffect that loads friends
   - Remove validation for ownerType-specific fields
   - Remove the visibility selector section from JSX
   - Remove the owner type selector section from JSX
   - Remove the conditional forName input
   - Remove the conditional friend picker

2. **Simplify handleSubmit** (lines 127-160):
   - For update: only pass `name`, `emoji` to the mutation
   - For create: only pass `user_id`, `name`, `emoji`, `is_default`, `sort_order`
   - Remove `visibility`, `owner_type`, `for_name`, `for_user_id` from both mutations

3. **Clean up imports**:
   - Remove `FriendWithProfile` import
   - Remove `getFriends` import
   - Remove `WishlistOwnerType`, `WishlistVisibility` imports (they're not in lib/wishlists.ts exports anyway for actual use)
   - Remove `Image` import if no longer used

4. **Simplify useEffect for edit mode** (lines 63-82):
   - Only set `name` and `emoji` from editingWishlist
   - Remove references to `visibility`, `owner_type`, `for_name`, `for_user_id`

5. **Remove unused style definitions**:
   - `visibilityContainer`, `visibilityOption`, `visibilityOptionSelected`, `visibilityOptionText`, `visibilityOptionTextSelected`
   - `ownerTypeContainer`, `ownerTypeOption`, `ownerTypeOptionSelected`, `radioOuter`, `radioInner`, `ownerTypeIcon`, `ownerTypeText`
   - `friendPickerLoading`, `noFriendsContainer`, `noFriendsText`, `friendList`, `friendListContent`, `friendItem`, `friendItemSelected`, `friendAvatar`, `friendAvatarPlaceholder`, `friendName`

**Note:** The visibility and owner type features can be re-added when the database migration is actually applied. For now, keep the component simple and working.
  </action>
  <verify>
- TypeScript compiles: `cd /home/zetaz/wishlist-app && npx tsc --noEmit`
- App builds: `cd /home/zetaz/wishlist-app && npx expo export --platform web --output-dir /tmp/test-build`
  </verify>
  <done>
- CreateWishlistModal creates wishlists without database error
- CreateWishlistModal edits wishlists without database error
- Only uses columns that exist: user_id, name, emoji, is_default, sort_order
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix emoji picker modal to display emoji grid</name>
  <files>components/wishlist/EmojiPickerModal.tsx</files>
  <action>
The emoji picker shows category tabs but no emojis because the emoji grid container has no explicit height. When using `flex: 1` in a modal without a defined container height, the content collapses.

**Changes to make:**

1. **Add minHeight to modalContainer** (line 138-144):
   ```typescript
   modalContainer: {
     backgroundColor: colors.white,
     borderTopLeftRadius: borderRadius.xl,
     borderTopRightRadius: borderRadius.xl,
     minHeight: 400,  // Add this - ensures content has space
     maxHeight: '80%',
     ...shadows.lg,
   },
   ```

2. **Give emojiScrollView a specific height instead of flex** (line 187-189):
   ```typescript
   emojiScrollView: {
     height: 280,  // Change from flex: 1 to explicit height
   },
   ```

3. **Optional improvement - Add padding bottom for safe area**:
   ```typescript
   emojiGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     padding: spacing.md,
     paddingBottom: spacing.xl + 20,  // Extra padding for bottom safe area
   },
   ```

**Why this works:**
- The modal uses `justifyContent: 'flex-end'` positioning (bottom sheet style)
- Without minHeight, the modalContainer only takes space of header + categories
- The emojiScrollView with `flex: 1` has nothing to flex into
- Explicit height ensures the emoji grid is always visible
  </action>
  <verify>
- TypeScript compiles: `cd /home/zetaz/wishlist-app && npx tsc --noEmit`
- Visual verification: Open the app, create wishlist modal, tap emoji button - should see 8 emojis in a 4x2 grid for the selected category
  </verify>
  <done>
- Emoji picker modal shows category tabs at top
- Emoji grid displays 8 emojis (4 per row, 2 rows) for each category
- Tapping an emoji selects it and closes the picker
- Selected emoji shows checkmark indicator
  </done>
</task>

</tasks>

<verification>
After both tasks:
1. Open the app
2. Navigate to wishlists screen
3. Tap "+" to create new wishlist
4. Tap emoji selector - should see emoji grid with 8 emojis
5. Select an emoji - modal closes, emoji is shown
6. Enter a name
7. Tap Create - wishlist should be created without error
8. Edit the wishlist - should load name/emoji and save without error
</verification>

<success_criteria>
- No database errors when creating or editing wishlists
- Emoji picker displays a visible grid of emojis organized by category
- Category tabs work to switch between emoji sets
- Selected emoji has visual checkmark indicator
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/009-fix-wishlist-create-error-and-visual-emo/009-SUMMARY.md`
</output>
