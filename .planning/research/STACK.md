# Stack Research: v1.2 Group Experience

## Executive Summary

The existing stack is well-suited for the new group customization, modes, and budget tracking features. **No new external dependencies are required.** The current combination of expo-image-picker + Supabase Storage (with ArrayBuffer upload pattern already implemented in `lib/storage.ts`) handles image uploads. Gluestack UI's Radio, Switch, and form components cover all UI needs for group modes and budget selection. Budget calculations are simple arithmetic that PostgreSQL + Supabase can handle natively without specialized libraries.

## Recommended Stack Changes

### New Dependencies

**None required.** All capabilities needed for v1.2 features are covered by the existing stack:

| Capability Needed | Existing Solution | Status |
|-------------------|-------------------|--------|
| Group photo upload | `expo-image-picker@17.0.10` + Supabase Storage | Already implemented in `lib/storage.ts` |
| Radio buttons for group modes | `@gluestack-ui/themed` (Radio, RadioGroup) | Already installed |
| Toggle switch for settings | `@gluestack-ui/themed` (Switch) | Already installed |
| Budget input forms | `@gluestack-ui/themed` (Input, FormControl) | Already installed |
| Budget calculations | PostgreSQL aggregations via Supabase | Native capability |
| State management | React useState/useEffect | Built-in |

### Optional Enhancement: base64-arraybuffer

**Consider but not required:**

```json
"base64-arraybuffer": "^1.0.2"
```

**Why consider:** The Supabase official React Native guide recommends this package for more reliable image uploads, especially on iOS where Blob/File uploads can result in 0-byte files.

**Why not required:** The existing `lib/storage.ts` already uses `fetch(uri) -> response.arrayBuffer()` pattern which works for the current avatar upload. If group photo uploads experience issues on iOS, this package can be added later.

**Current implementation in `lib/storage.ts`:**
```typescript
const response = await fetch(uri);
const arrayBuffer = await response.arrayBuffer();
```

**Alternative with base64-arraybuffer (if needed later):**
```typescript
import { decode } from 'base64-arraybuffer';
const result = await ImagePicker.launchImageLibraryAsync({ base64: true });
const { data } = await supabase.storage.upload('path', decode(result.base64));
```

### No Changes Needed

| Area | Why Current Stack Suffices |
|------|---------------------------|
| **Image Picker** | `expo-image-picker@17.0.10` already installed, supports all needed features including quality control and editing |
| **Supabase Storage** | Already configured for avatars; group photos use identical pattern with different bucket/path |
| **UI Components** | Gluestack UI provides Radio, RadioGroup, Switch, Input, Select - all needed for mode/budget selection |
| **Form Validation** | React Native TextInput + useState sufficient for budget inputs; no form library needed |
| **Currency/Money Handling** | Simple USD amounts stored as integers (cents) or decimals; no currency conversion needed |
| **Date Handling** | `date-fns@4.1.0` already installed for any date calculations related to monthly/yearly budgets |
| **Animations** | `moti@0.30.0` + `react-native-reanimated@4.1.1` for any new UI animations |
| **Lists** | `@shopify/flash-list@2.2.1` for member cards in group view |

### Rejected Alternatives

| Library | Why Not |
|---------|---------|
| `react-hook-form` | Overkill for simple group settings forms; useState pattern is sufficient and already used throughout app |
| `yup` / `zod` | Form validation complexity not justified; budget validation is simple (> 0, reasonable max) |
| `dinero.js` / `currency.js` | Money calculations are simple addition/averaging; no multi-currency support needed |
| `expo-file-system` | The fetch + arrayBuffer pattern works; adding another dependency for image upload is unnecessary |
| `react-native-radio-buttons-group` | Gluestack UI already provides Radio components with NativeWind styling compatibility |
| State management libs (Zustand, Redux) | Current useState + Supabase real-time pattern is sufficient for group state |

## Integration Considerations

### Database Schema Extensions

The new features require schema additions (not stack changes):

```sql
-- Groups table additions
ALTER TABLE groups ADD COLUMN description TEXT;
ALTER TABLE groups ADD COLUMN photo_url TEXT;
ALTER TABLE groups ADD COLUMN mode VARCHAR(20) DEFAULT 'gifts'; -- 'greetings' | 'gifts'
ALTER TABLE groups ADD COLUMN budget_type VARCHAR(20) DEFAULT 'per_gift'; -- 'per_gift' | 'monthly_pooled' | 'yearly'
ALTER TABLE groups ADD COLUMN monthly_budget DECIMAL(10,2);
ALTER TABLE groups ADD COLUMN yearly_budget DECIMAL(10,2);
```

### Supabase Storage

**New bucket needed:** `group-photos` (or extend existing `avatars` bucket with path-based organization)

**Storage policy pattern** (mirrors existing avatar policy):
```sql
CREATE POLICY "Group admins can upload group photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'group-photos' AND
  -- Verify user is admin of the group referenced in path
  auth.uid() IN (
    SELECT user_id FROM group_members
    WHERE group_id = split_part(name, '/', 1)::uuid
    AND role = 'admin'
  )
);
```

### Budget Aggregation Queries

PostgreSQL views or functions can pre-compute budget summaries:

```sql
-- View for group budget status
CREATE VIEW group_budget_summary AS
SELECT
  g.id AS group_id,
  g.budget_type,
  g.budget_limit_per_gift,
  g.monthly_budget,
  g.yearly_budget,
  COALESCE(SUM(cc.amount), 0) AS total_contributed,
  COUNT(DISTINCT cc.user_id) AS contributors_count
FROM groups g
LEFT JOIN celebrations c ON c.group_id = g.id
LEFT JOIN celebration_contributions cc ON cc.celebration_id = c.id
WHERE c.year = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY g.id;
```

### Reusing Existing Patterns

| Feature | Existing Pattern to Follow | Location |
|---------|---------------------------|----------|
| Group photo upload | Avatar upload flow | `lib/storage.ts` |
| Group creation form | CreateGroupModal | `components/groups/CreateGroupModal.tsx` |
| Member cards UI | Current member list | `app/group/[id].tsx` |
| Budget display | Contribution progress | `components/celebrations/ContributionProgress.tsx` |
| Mode selection | Use Gluestack RadioGroup | New implementation |

## TypeScript Type Extensions

Update `types/database.types.ts`:

```typescript
groups: {
  Row: {
    id: string
    name: string
    description: string | null           // NEW
    photo_url: string | null             // NEW
    mode: 'greetings' | 'gifts'          // NEW
    budget_type: 'per_gift' | 'monthly_pooled' | 'yearly'  // NEW
    created_by: string
    budget_limit_per_gift: number
    monthly_budget: number | null        // NEW
    yearly_budget: number | null         // NEW
    created_at: string
    updated_at: string
  }
  // ... Insert and Update types follow same pattern
}
```

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| No new dependencies needed | HIGH | Verified existing packages cover all requirements |
| Image upload pattern | HIGH | Already implemented and working in `lib/storage.ts` |
| Gluestack UI components | HIGH | Official docs confirm Radio, Switch, Form components available |
| Budget calculations | HIGH | Simple arithmetic; PostgreSQL handles aggregations natively |
| base64-arraybuffer optional | MEDIUM | Current ArrayBuffer pattern works, but official guide recommends base64 for iOS reliability |
| Database schema approach | HIGH | Standard Supabase/PostgreSQL patterns |

## Sources

- [Supabase React Native Storage Blog](https://supabase.com/blog/react-native-storage)
- [Expo Image Picker Documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Gluestack UI Radio Component](https://gluestack.io/ui/docs/components/radio)
- [Gluestack UI Switch Component](https://gluestack.io/ui/docs/components/switch)
- [PostgREST Aggregate Functions](https://supabase.com/blog/postgrest-aggregate-functions)
- [Supabase GitHub Discussion #1268](https://github.com/orgs/supabase/discussions/1268)
- [base64-arraybuffer npm](https://www.npmjs.com/package/base64-arraybuffer)

---
*Research completed: 2026-02-04*

---

# Stack Research: v1.1 Wishlist Polish (Previous)

## Summary

The existing React Native + Expo stack is sufficient for all v1.1 UI polish features. The current StarRating component uses emoji which already displays horizontally in flex-row layout. Profile pictures use existing expo-image-picker (already in stack). New item types (favorite, Surprise Me, Mystery Box) require only database schema changes, not new libraries. No additional dependencies needed.

## Recommended Additions

**None.** All v1.1 features can be implemented with the existing stack.

### Why No Star Rating Library?

**Current implementation:**
- `components/ui/StarRating.tsx` uses native emoji in `flex-row` layout
- Already displays horizontally—likely CSS/styling issue, not component limitation
- No external dependencies, zero bundle size impact
- Fully functional for both interactive and readonly modes

**Decision:** Fix the styling in existing StarRating component rather than add dependency.

### Why No Avatar Library?

**Current implementation:**
- Profile pictures already use `expo-image-picker` (v17.0.10, already in dependencies)
- Supabase Storage for avatar URLs (already integrated)
- Custom circular image views in React Native (trivial with borderRadius)

**Decision:** Use native Image component with borderRadius styling.

## No Changes Needed

### React Native Core
- **Current:** React Native 0.81.5, Expo SDK 54
- **Sufficient for:** All UI polish, profile editing, new item types
- **No upgrade needed**

### UI Framework
- **Current:** NativeWind 4.2.1 + @gluestack-ui/themed 1.1.73
- **Sufficient for:** Star layout fixes, profile picture styling, favorite highlighting
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
- Add `mystery_box_tier` field for tiers
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

## Confidence

**HIGH** — All features implementable with existing stack.

### Evidence
1. **StarRating component already exists** — Line 188 in `LuxuryWishlistCard.tsx` renders stars horizontally with flex-row
2. **expo-image-picker already in package.json** — Line 20, version 17.0.10
3. **Supabase Storage already integrated** — avatar_url field exists in user_profiles (database.types.ts line 22)
4. **MaterialCommunityIcons already provides** — gift, star, bookmark, help-circle icons for new item types
5. **NativeWind + Gluestack** — Sufficient for all styling needs (conditional classes, highlights, badges)

### Risk Assessment
- **Zero risk** — No new dependencies = no version conflicts, no bundle bloat
- **Minimal effort** — Styling fixes + schema changes + UI composition with existing components
- **Proven stack** — All components used successfully in v1.0

## Sources

- [react-native-star-rating-widget - npm](https://www.npmjs.com/package/react-native-star-rating-widget) — Alternative considered but not needed
- [GitHub - kolking/react-native-rating](https://github.com/kolking/react-native-rating) — Alternative considered but not needed
- [Avatar | React Native Elements](https://reactnativeelements.com/docs/1.2.0/avatar) — Alternative considered but not needed
- [Build a User Management App with Expo React Native | Supabase Docs](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) — Confirms avatar pattern already in use
- [@kolking/react-native-avatar - npm](https://www.npmjs.com/package/@kolking/react-native-avatar) — Alternative considered but not needed
