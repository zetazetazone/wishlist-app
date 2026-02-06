# Phase 20: Personal Details - Research

**Researched:** 2026-02-06
**Domain:** React Native forms, tag input, URL validation, profile completeness UI
**Confidence:** HIGH

## Summary

Phase 20 builds the UI layer for personal details -- a form screen for users to edit their own sizes, preferences, and external links, plus a read-only viewer for group members to see another member's personal details. The data layer already exists from Phase 18 (`personal_details` table, `lib/personalDetails.ts` service, TypeScript types). This phase is pure UI: form components, state management, and display components.

The critical UI challenges are: (1) a multi-section form with different input types (selects for sizes, tag inputs for preferences, URL inputs for external links), (2) profile completeness calculation and display, and (3) read-only view accessible from group member context. The existing codebase establishes strong patterns for forms (`app/(app)/settings/profile.tsx`), progress bars (`BudgetProgressBar.tsx`), and URL handling (`expo-linking`).

**Primary recommendation:** Extend the existing `/settings/profile` screen with a "Personal Details" section that navigates to a dedicated form screen, following the established gluestack-ui and NativeWind patterns. Use the existing `BudgetProgressBar` pattern for the completeness indicator.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gluestack-ui/themed | 1.1.73 | Form components (Input, Button, Select) | Already used throughout app for forms |
| NativeWind | 4.2.1 | Styling | Project-wide styling system |
| expo-linking | 8.0.11 | External URL opening | Already used for wishlist item URLs |
| date-fns | 4.1.0 | Timestamp formatting | Already used for date displays |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| moti | 0.30.0 | Micro-animations | Section reveals, progress bar animation |
| @expo/vector-icons | 15.0.3 | Icons | Platform badges, section headers |
| react-native-gesture-handler | 2.28.0 | Swipe gestures | Tag removal, link deletion |

### No New Dependencies Required

All UI requirements can be met with existing dependencies. Specifically:
- Tag input: Build from existing `Input` + `TouchableOpacity` components (pattern shown below)
- Multi-select colors: Build from `TouchableOpacity` chips with color swatches
- URL validation: Use JavaScript `URL` constructor (already in `AddItemBottomSheet.tsx`)
- Platform detection: Parse hostname from URL (no library needed)

---

## Architecture Patterns

### Recommended Project Structure

```
app/(app)/settings/
  _layout.tsx           # Existing - add new screen
  profile.tsx           # Existing - add "Personal Details" section/link
  personal-details.tsx  # NEW - form screen for PROF-01 to PROF-05

components/profile/
  PersonalDetailsForm.tsx      # NEW - Main form component
  SizesSection.tsx             # NEW - Clothing sizes inputs
  PreferencesSection.tsx       # NEW - Tags for colors, brands, interests, dislikes
  ExternalLinksSection.tsx     # NEW - URL list with add/remove
  TagInput.tsx                 # NEW - Reusable tag input component
  TagChip.tsx                  # NEW - Single tag display with delete
  ExternalLinkRow.tsx          # NEW - Single link display with platform icon
  CompletenessIndicator.tsx    # NEW - Progress ring or bar (PROF-08)

app/(app)/member/
  [id].tsx              # NEW - Read-only member profile view (PROF-07)
  OR
app/(app)/celebration/
  [id].tsx              # Existing - add member profile modal/sheet
```

### Pattern 1: Multi-Section Form with Local State

**What:** Form screen with multiple collapsible sections, each managing its own piece of state, with a single "Save" action that upserts the entire `personal_details` row.

**When to use:** For forms with many fields grouped logically (sizes, preferences, links).

**Example:**
```typescript
// Source: Established pattern from app/(app)/settings/profile.tsx
export default function PersonalDetailsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Local state mirrors JSONB structure
  const [sizes, setSizes] = useState<PersonalSizes>({});
  const [preferences, setPreferences] = useState<PersonalPreferences>({});
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);

  useEffect(() => {
    loadDetails();
  }, []);

  const loadDetails = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const details = await getPersonalDetails(user.id);
    if (details) {
      setSizes(details.sizes);
      setPreferences(details.preferences);
      setExternalLinks(details.external_links);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertPersonalDetails({ sizes, preferences, external_links: externalLinks });
      Alert.alert('Success', 'Personal details saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save personal details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView>
      <SizesSection sizes={sizes} onChange={setSizes} />
      <PreferencesSection preferences={preferences} onChange={setPreferences} />
      <ExternalLinksSection links={externalLinks} onChange={setExternalLinks} />
      <Button onPress={handleSave} isDisabled={isSaving}>
        <ButtonText>{isSaving ? 'Saving...' : 'Save Changes'}</ButtonText>
      </Button>
    </ScrollView>
  );
}
```

### Pattern 2: Tag Input with Predefined + Custom Options

**What:** Tag selector that offers predefined options (e.g., common colors) but also allows free-text custom entries.

**When to use:** For PROF-02 (colors), PROF-03 (brands, interests), PROF-04 (dislikes).

**Example:**
```typescript
// Source: Custom implementation following gluestack-ui patterns
interface TagInputProps {
  tags: PreferenceTag[];
  onChange: (tags: PreferenceTag[]) => void;
  predefinedOptions?: string[];  // e.g., ['Red', 'Blue', 'Green', 'Black', 'White']
  placeholder?: string;
  maxTags?: number;
}

function TagInput({ tags, onChange, predefinedOptions = [], placeholder, maxTags = 20 }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (label: string, isCustom: boolean = false) => {
    const normalized = label.trim();
    if (!normalized) return;
    if (tags.some(t => t.label.toLowerCase() === normalized.toLowerCase())) return;
    if (maxTags && tags.length >= maxTags) return;

    onChange([...tags, { label: normalized, custom: isCustom || !predefinedOptions.includes(normalized) }]);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <VStack space="sm">
      {/* Selected tags */}
      <HStack flexWrap="wrap" space="xs">
        {tags.map((tag, index) => (
          <TagChip
            key={`${tag.label}-${index}`}
            label={tag.label}
            isCustom={tag.custom}
            onRemove={() => removeTag(index)}
          />
        ))}
      </HStack>

      {/* Predefined options (show unselected only) */}
      {predefinedOptions.length > 0 && (
        <HStack flexWrap="wrap" space="xs">
          {predefinedOptions
            .filter(opt => !tags.some(t => t.label.toLowerCase() === opt.toLowerCase()))
            .map(option => (
              <TouchableOpacity key={option} onPress={() => addTag(option, false)}>
                <TagChip label={option} selectable />
              </TouchableOpacity>
            ))}
        </HStack>
      )}

      {/* Custom input */}
      <Input variant="outline">
        <InputField
          placeholder={placeholder || 'Add custom...'}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={() => addTag(inputValue, true)}
          returnKeyType="done"
        />
      </Input>
    </VStack>
  );
}
```

### Pattern 3: Completeness Calculation

**What:** Calculate profile completeness percentage based on filled fields.

**When to use:** For PROF-08 completeness indicator.

**Example:**
```typescript
// Source: Business logic implementation
interface CompletenessResult {
  percentage: number;
  filledCount: number;
  totalCount: number;
  missingSections: string[];
}

function calculateCompleteness(
  sizes: PersonalSizes,
  preferences: PersonalPreferences,
  externalLinks: ExternalLink[]
): CompletenessResult {
  const sections = [
    { name: 'Clothing sizes', filled: Object.values(sizes).some(v => v && v.trim()) },
    { name: 'Favorite colors', filled: (preferences.colors?.length || 0) > 0 },
    { name: 'Favorite brands', filled: (preferences.brands?.length || 0) > 0 },
    { name: 'Interests', filled: (preferences.interests?.length || 0) > 0 },
    { name: 'Dislikes', filled: (preferences.dislikes?.length || 0) > 0 },
    { name: 'External wishlists', filled: externalLinks.length > 0 },
  ];

  const filled = sections.filter(s => s.filled);
  const missing = sections.filter(s => !s.filled).map(s => s.name);

  return {
    percentage: Math.round((filled.length / sections.length) * 100),
    filledCount: filled.length,
    totalCount: sections.length,
    missingSections: missing,
  };
}
```

### Pattern 4: External Link with Platform Detection

**What:** Display external link with platform icon (Amazon, Pinterest, Etsy, generic).

**When to use:** For PROF-05 external wishlist links.

**Example:**
```typescript
// Source: Pattern from components/wishlist/WishlistItemCard.tsx (Linking usage)
function detectPlatform(url: string): 'amazon' | 'pinterest' | 'etsy' | 'other' {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('pinterest')) return 'pinterest';
    if (hostname.includes('etsy')) return 'etsy';
    return 'other';
  } catch {
    return 'other';
  }
}

const platformIcons: Record<string, { icon: string; color: string }> = {
  amazon: { icon: 'amazon', color: '#FF9900' },
  pinterest: { icon: 'pinterest', color: '#E60023' },
  etsy: { icon: 'etsy', color: '#F56400' },
  other: { icon: 'link-variant', color: colors.burgundy[600] },
};

function ExternalLinkRow({ link, onRemove, onOpen }: ExternalLinkRowProps) {
  const platform = detectPlatform(link.url);
  const { icon, color } = platformIcons[platform];

  return (
    <HStack alignItems="center" space="md" padding="$3">
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <VStack flex={1}>
        <Text fontWeight="$medium" numberOfLines={1}>
          {link.label || link.url}
        </Text>
        {link.label && (
          <Text fontSize="$xs" color="$textLight500" numberOfLines={1}>
            {link.url}
          </Text>
        )}
      </VStack>
      <TouchableOpacity onPress={onOpen}>
        <MaterialCommunityIcons name="open-in-new" size={20} color={colors.burgundy[600]} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove}>
        <MaterialCommunityIcons name="close-circle" size={20} color={colors.error} />
      </TouchableOpacity>
    </HStack>
  );
}
```

### Anti-Patterns to Avoid

- **Nested ScrollViews:** Don't nest a `ScrollView` inside another. Use `FlatList` with `ListHeaderComponent` or a single `ScrollView` with sections.
- **Inline complex forms:** Don't put all form logic in one massive component. Extract each section (Sizes, Preferences, Links) into its own component.
- **Server-side validation only:** Don't rely on database constraints for user feedback. Validate URLs and tag limits client-side before submission.
- **Fetching on every keystroke:** Don't debounce or auto-save on each change. Use explicit "Save" button for form submission.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom date parser | `date-fns` `formatDistanceToNow()` | Already used, handles localization |
| URL validation | Regex pattern | `new URL()` constructor | Standard, handles edge cases |
| URL opening | Custom intent system | `Linking.openURL()` | Already used for wishlist items |
| Form state | Custom reducer | useState per section | Simple, sufficient for this use case |
| Tag deduplication | Complex merge logic | Array.filter + toLowerCase() | Simple, handles case-insensitive uniqueness |

**Key insight:** The personal details form is essentially a preferences editor. It doesn't need complex form libraries like Formik or react-hook-form -- simple useState with section components is sufficient. The existing `profile.tsx` proves this pattern works.

---

## Common Pitfalls

### Pitfall 1: JSONB Column Merging

**What goes wrong:** Saving only `sizes` overwrites `preferences` and `external_links` to their defaults.
**Why it happens:** The `upsertPersonalDetails` function replaces the entire row.
**How to avoid:** Always pass all three fields when saving. Load the full current state on mount, update in local state, save all together.
**Warning signs:** User saves sizes, returns later, and preferences are gone.

### Pitfall 2: Empty State vs Null

**What goes wrong:** `getPersonalDetails` returns `null` for new users, but form expects objects.
**Why it happens:** PGRST116 error (no rows) is caught and returns `null`.
**How to avoid:** Initialize state with empty defaults: `useState<PersonalSizes>({})`, not `useState(null)`.
**Warning signs:** "Cannot read property 'shirt' of null" errors.

### Pitfall 3: External Link URL Validation Timing

**What goes wrong:** User pastes invalid URL, saves, database accepts it but platform detection fails.
**Why it happens:** pg_jsonschema was omitted (18-01 decision), so database has no URL validation.
**How to avoid:** Validate URL on add (before adding to local state), not just on save.
**Warning signs:** External links section shows "broken" icons for malformed URLs.

### Pitfall 4: Tag Case Sensitivity

**What goes wrong:** User adds "Red" then "red" as separate tags.
**Why it happens:** Array comparison uses strict equality.
**How to avoid:** Normalize to lowercase when checking for duplicates: `tags.some(t => t.label.toLowerCase() === label.toLowerCase())`.
**Warning signs:** Duplicate-looking tags in preferences.

### Pitfall 5: Read-Only View Access Control

**What goes wrong:** User sees personal details for someone not in their groups.
**Why it happens:** RLS allows any authenticated user to SELECT from `personal_details`.
**How to avoid:** Client-side guard: only navigate to member profile from group context. The RLS policy is intentionally permissive (global details shared across groups). The UI should only expose details from shared-group contexts.
**Warning signs:** Privacy concern if details page is directly navigable by URL.

---

## Code Examples

### Sizes Section Component

```typescript
// Source: Pattern from app/(app)/settings/profile.tsx + gluestack-ui Select docs
import { Select, SelectTrigger, SelectInput, SelectPortal, SelectBackdrop, SelectContent, SelectItem } from '@gluestack-ui/themed';

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

interface SizesSectionProps {
  sizes: PersonalSizes;
  onChange: (sizes: PersonalSizes) => void;
}

function SizesSection({ sizes, onChange }: SizesSectionProps) {
  const updateSize = (key: keyof PersonalSizes, value: string) => {
    onChange({ ...sizes, [key]: value || undefined });
  };

  return (
    <VStack space="md" padding="$4">
      <Heading size="sm">Clothing Sizes</Heading>
      <Text fontSize="$sm" color="$textLight500">
        Help gift-givers pick the right size
      </Text>

      {/* Shirt Size - Select */}
      <VStack space="xs">
        <Text fontWeight="$medium">Shirt</Text>
        <Select
          selectedValue={sizes.shirt}
          onValueChange={(val) => updateSize('shirt', val)}
        >
          <SelectTrigger variant="outline">
            <SelectInput placeholder="Select shirt size" />
          </SelectTrigger>
          <SelectPortal>
            <SelectBackdrop />
            <SelectContent>
              {SHIRT_SIZES.map(size => (
                <SelectItem key={size} label={size} value={size} />
              ))}
            </SelectContent>
          </SelectPortal>
        </Select>
      </VStack>

      {/* Shoe Size - Free Text */}
      <VStack space="xs">
        <Text fontWeight="$medium">Shoe</Text>
        <Input variant="outline">
          <InputField
            placeholder="e.g., 10 US, 42 EU"
            value={sizes.shoe || ''}
            onChangeText={(val) => updateSize('shoe', val)}
          />
        </Input>
      </VStack>

      {/* Similar for pants, ring, dress, jacket... */}
    </VStack>
  );
}
```

### Add External Link Modal

```typescript
// Source: Pattern from components/wishlist/AddItemBottomSheet.tsx
function AddLinkModal({ visible, onClose, onAdd }: AddLinkModalProps) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [urlError, setUrlError] = useState('');

  const validateUrl = (input: string): boolean => {
    if (!input.trim()) {
      setUrlError('');
      return false;
    }
    try {
      const urlObj = new URL(input);
      const isValid = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      setUrlError(isValid ? '' : 'Please enter a valid URL');
      return isValid;
    } catch {
      setUrlError('Please enter a valid URL');
      return false;
    }
  };

  const handleAdd = () => {
    if (!validateUrl(url)) return;
    onAdd({ url: url.trim(), label: label.trim() || undefined });
    setUrl('');
    setLabel('');
    onClose();
  };

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <VStack padding="$6" space="md">
        <Heading size="md">Add External Wishlist</Heading>

        <VStack space="xs">
          <Text fontWeight="$medium">URL</Text>
          <Input variant="outline">
            <InputField
              placeholder="https://amazon.com/wishlist/..."
              value={url}
              onChangeText={(val) => { setUrl(val); validateUrl(val); }}
              autoCapitalize="none"
              keyboardType="url"
            />
          </Input>
          {urlError && <Text color="$error500">{urlError}</Text>}
        </VStack>

        <VStack space="xs">
          <Text fontWeight="$medium">Label (optional)</Text>
          <Input variant="outline">
            <InputField
              placeholder="My Amazon Wishlist"
              value={label}
              onChangeText={setLabel}
            />
          </Input>
        </VStack>

        <Button onPress={handleAdd}>
          <ButtonText>Add Link</ButtonText>
        </Button>
      </VStack>
    </Modal>
  );
}
```

### Completeness Indicator Component

```typescript
// Source: Pattern from components/groups/BudgetProgressBar.tsx
function CompletenessIndicator({ percentage, filledCount, totalCount }: CompletenessProps) {
  const getColor = () => {
    if (percentage >= 80) return colors.success;
    if (percentage >= 50) return colors.warning;
    return colors.burgundy[400];
  };

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring' }}
    >
      <View style={styles.card}>
        <HStack alignItems="center" space="md">
          <View style={styles.progressRing}>
            {/* Circular progress using react-native-svg or simple bar */}
            <Text style={[styles.percentageText, { color: getColor() }]}>
              {percentage}%
            </Text>
          </View>
          <VStack flex={1}>
            <Text style={styles.labelText}>Profile Completeness</Text>
            <Text style={styles.subText}>
              {filledCount} of {totalCount} sections filled
            </Text>
          </VStack>
        </HStack>
      </View>
    </MotiView>
  );
}
```

### Opening External Link

```typescript
// Source: Established pattern from components/wishlist/WishlistItemCard.tsx
import { Linking, Alert } from 'react-native';

async function openExternalLink(url: string) {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this link');
    }
  } catch (error) {
    console.error('Error opening link:', error);
    Alert.alert('Error', 'Failed to open link');
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate input libraries (Formik) | Built-in gluestack-ui components | Project decision | Simpler, no extra dependencies |
| Web-style checkbox multi-select | Chip/tag patterns | React Native standard | Better touch UX |
| In-app WebView for links | Linking.openURL to external browser | Project pattern | Cleaner, respects user's browser choice |

**Deprecated/outdated:**
- `expo-web-browser` for external links: The project intentionally uses `expo-linking.openURL()` to open external browser, not in-app browser. This was a researched decision (see `.planning/research/STACK.md`).

---

## Open Questions

### Resolved by Codebase Analysis

1. **Where should the form live?** In `app/(app)/settings/personal-details.tsx`, linked from the existing profile screen.
2. **What UI library for forms?** Gluestack-ui (existing project standard).
3. **How to open external URLs?** `expo-linking.openURL()` (established pattern).
4. **Progress bar style?** Follow `BudgetProgressBar.tsx` pattern with percentage display.

### Resolved by Requirements Analysis

1. **Which sizes are required?** PROF-01 specifies: shirt, shoe, pants, ring. Schema also has dress and jacket (optional extras).
2. **Predefined colors list?** Not specified -- use common colors (Red, Blue, Green, Black, White, Pink, Purple, Orange, Yellow, Gray, Brown) as suggestions.
3. **Read-only access for non-group members?** PROF-06 says "global across all groups user belongs to" -- so visible to anyone who shares a group with the user. RLS handles this.

### Remaining for Planner

1. **Circular vs linear progress for completeness?** Recommend linear (like `BudgetProgressBar`) for consistency, but circular (ring) is also viable.
2. **Member profile route structure?** Either `app/(app)/member/[id].tsx` as standalone, or integrate into celebration page as a modal/sheet. Recommend standalone for cleaner navigation.
3. **Should completeness indicator show on the main profile page?** Recommend yes, as a "nudge" to encourage users to fill out details.

---

## Sources

### Primary (HIGH confidence)
- `/home/zetaz/wishlist-app/lib/personalDetails.ts` -- Existing service layer with `getPersonalDetails`, `upsertPersonalDetails`
- `/home/zetaz/wishlist-app/types/database.types.ts` -- JSONB interfaces: `PersonalSizes`, `PersonalPreferences`, `ExternalLink`
- `/home/zetaz/wishlist-app/app/(app)/settings/profile.tsx` -- Established form pattern with gluestack-ui
- `/home/zetaz/wishlist-app/components/groups/BudgetProgressBar.tsx` -- Progress indicator pattern
- `/home/zetaz/wishlist-app/components/wishlist/WishlistItemCard.tsx` -- `Linking.openURL` pattern for external URLs
- `/home/zetaz/wishlist-app/components/wishlist/AddItemBottomSheet.tsx` -- URL validation pattern with `new URL()`
- `/home/zetaz/wishlist-app/constants/theme.ts` -- Design system colors and spacing

### Secondary (MEDIUM confidence)
- `.planning/phases/18-schema-atomic-functions/18-RESEARCH.md` -- Schema design decisions and JSONB structure
- `.planning/phases/18-schema-atomic-functions/18-02-SUMMARY.md` -- Service layer implementation details
- `.planning/research/STACK.md` -- Library decisions including expo-linking vs expo-web-browser

### Tertiary (LOW confidence)
- None -- all patterns verified against existing codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, patterns verified
- Architecture: HIGH -- follows established patterns from profile.tsx, BudgetProgressBar.tsx
- Pitfalls: HIGH -- derived from analysis of existing service layer and schema decisions

**Research date:** 2026-02-06
**Valid until:** 60 days (stable UI patterns, existing codebase)
