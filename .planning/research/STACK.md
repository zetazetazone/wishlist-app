# Stack Research: v1.1 Wishlist Polish

## Summary

The existing React Native + Expo stack is sufficient for all v1.1 UI polish features. The current StarRating component uses emoji (⭐/☆) which already displays horizontally in flex-row layout—the "vertical bug" is likely a styling issue, not a stack limitation. Profile pictures use existing expo-image-picker (already in stack). New item types (favorite, Surprise Me, Mystery Box) require only database schema changes, not new libraries. No additional dependencies needed.

## Recommended Additions

**None.** All v1.1 features can be implemented with the existing stack.

### Why No Star Rating Library?

**Current implementation:**
- `components/ui/StarRating.tsx` uses native emoji (⭐/☆) in `flex-row` layout
- Already displays horizontally—likely CSS/styling issue, not component limitation
- No external dependencies, zero bundle size impact
- Fully functional for both interactive and readonly modes

**Alternatives considered:**
- `react-native-star-rating-widget` (TypeScript, animated, 2026-maintained)
- `react-native-rating` (flexible symbols: stars/hearts/emojis)

**Why not needed:**
- Adding library for horizontal display is overkill—fix existing CSS instead
- Current emoji approach is simpler, lighter, and already works
- Library adds 10-50KB bundle size for functionality we already have

**Decision:** Fix the styling in existing StarRating component rather than add dependency.

### Why No Avatar Library?

**Current implementation:**
- Profile pictures already use `expo-image-picker` (v17.0.10, already in dependencies)
- Supabase Storage for avatar URLs (already integrated)
- Custom circular image views in React Native (trivial with borderRadius)

**Alternatives considered:**
- `@rneui/themed` Avatar component (React Native Elements)
- `@kolking/react-native-avatar` (Gravatar, badges, initials fallback)

**Why not needed:**
- expo-image-picker already handles photo selection/upload
- Supabase Storage already handles avatar URLs
- Simple circular image is 5 lines of styling, not worth library dependency
- Initials fallback can be implemented in 10 lines if needed

**Decision:** Use native Image component with borderRadius styling.

## No Changes Needed

### React Native Core
- **Current:** React Native 0.81.5, Expo SDK 54
- **Sufficient for:** All UI polish, profile editing, new item types
- **No upgrade needed**

### UI Framework
- **Current:** NativeWind 4.2.1 + @gluestack-ui/themed 1.1.73
- **Sufficient for:** Star layout fixes, profile picture styling, favorite highlighting
- **Libraries provide:** Utility classes, theme system, responsive design
- **No additional UI libraries needed**

### Image Handling
- **Current:** expo-image-picker 17.0.10
- **Sufficient for:** Profile picture selection from gallery/camera
- **No additional libraries needed**

### Storage & Backend
- **Current:** Supabase (@supabase/supabase-js 2.93.3) + Storage
- **Sufficient for:** Avatar uploads, new item type fields (is_favorite, item_type)
- **No backend changes needed**

### Icons & Visuals
- **Current:** @expo/vector-icons 15.0.3, MaterialCommunityIcons
- **Sufficient for:** Favorite star icon, mystery box icon, surprise me icon
- **No additional icon libraries needed**

### Animation
- **Current:** Moti 0.30.0 (Reanimated wrapper)
- **Sufficient for:** Favorite item highlight animations, card transitions
- **No additional animation libraries needed**

## Integration Points

### 1. StarRating Component Fix
**File:** `components/ui/StarRating.tsx`
**Change:** CSS styling only (flex-direction, alignment)
**Stack involvement:** NativeWind/Gluestack classes
**No new dependencies**

### 2. Profile Picture in Header
**File:** `app/(app)/(tabs)/wishlist.tsx`
**Components needed:**
- Fetch avatar_url from user_profiles table (existing Supabase query)
- Render Image with borderRadius: 50% (React Native core)
- Fallback to MaterialCommunityIcons "account-circle" if no avatar
**Stack involvement:** Existing Supabase client, native Image component
**No new dependencies**

### 3. Favorite Item Feature
**Database change:** Add `is_favorite` boolean to wishlist_items table
**UI changes:**
- Add star/bookmark icon to card (MaterialCommunityIcons)
- Toggle button (TouchableOpacity + Supabase update)
- Conditional styling for highlighted card (NativeWind/Gluestack)
**Stack involvement:** Existing React Native + Supabase
**No new dependencies**

### 4. Surprise Me & Mystery Box Items
**Database change:** Add `item_type` enum to wishlist_items table
- Values: 'standard' | 'surprise_me' | 'mystery_box'
- Add `mystery_box_tier` field for €25/€50/€100
**UI changes:**
- Special card styling for each type (existing theme system)
- Type selector in AddItemModal (existing modal component)
- Icons for special types (MaterialCommunityIcons: gift-outline, help-circle-outline)
**Stack involvement:** Existing React Native + Supabase + icons
**No new dependencies**

### 5. Profile Editing Screen
**File:** New screen `app/(app)/profile/edit.tsx`
**Components needed:**
- TextInput for display_name (React Native core)
- DatePicker for birthday (existing @react-native-community/datetimepicker)
- Image picker for avatar (existing expo-image-picker)
- Save button with Supabase update (existing client)
**Stack involvement:** All existing dependencies
**No new dependencies**

## Database Schema Changes Required

**Not stack-related, but documented for completeness:**

```sql
-- Add to wishlist_items table
ALTER TABLE wishlist_items
  ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE,
  ADD COLUMN item_type TEXT DEFAULT 'standard' CHECK (item_type IN ('standard', 'surprise_me', 'mystery_box')),
  ADD COLUMN mystery_box_tier INTEGER CHECK (mystery_box_tier IN (25, 50, 100));

-- Add constraint: only one favorite per user per group
CREATE UNIQUE INDEX unique_favorite_per_user_group
  ON wishlist_items (user_id, group_id)
  WHERE is_favorite = TRUE AND group_id IS NOT NULL;
```

## Confidence

**HIGH** — All features implementable with existing stack.

### Evidence
1. ✅ **StarRating component already exists** — Line 188 in `LuxuryWishlistCard.tsx` renders stars horizontally with flex-row
2. ✅ **expo-image-picker already in package.json** — Line 20, version 17.0.10
3. ✅ **Supabase Storage already integrated** — avatar_url field exists in user_profiles (database.types.ts line 22)
4. ✅ **MaterialCommunityIcons already provides** — gift, star, bookmark, help-circle icons for new item types
5. ✅ **NativeWind + Gluestack** — Sufficient for all styling needs (conditional classes, highlights, badges)

### Risk Assessment
- **Zero risk** — No new dependencies = no version conflicts, no bundle bloat
- **Minimal effort** — Styling fixes + schema changes + UI composition with existing components
- **Proven stack** — All components used successfully in v1.0 (shipped 2026-02-02)

### What Could Go Wrong
- **Nothing stack-related** — All risks are implementation/design, not technology choice
- Star emoji rendering inconsistent across iOS/Android → Verify in testing (not a blocker, fallback to text works)
- Profile picture upload size limits → Supabase Storage handles compression (already solved in onboarding)

## Sources

- [react-native-star-rating-widget - npm](https://www.npmjs.com/package/react-native-star-rating-widget) — Alternative considered but not needed
- [GitHub - kolking/react-native-rating](https://github.com/kolking/react-native-rating) — Alternative considered but not needed
- [Avatar | React Native Elements](https://reactnativeelements.com/docs/1.2.0/avatar) — Alternative considered but not needed
- [Build a User Management App with Expo React Native | Supabase Docs](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) — Confirms avatar pattern already in use
- [@kolking/react-native-avatar - npm](https://www.npmjs.com/package/@kolking/react-native-avatar) — Alternative considered but not needed
