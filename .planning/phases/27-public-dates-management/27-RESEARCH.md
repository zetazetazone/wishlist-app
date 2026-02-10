# Phase 27: Public Dates Management - Research

**Researched:** 2026-02-10
**Domain:** React Native Forms, Supabase CRUD, Date Handling
**Confidence:** HIGH

## Summary

Phase 27 implements CRUD operations for user-owned public dates (anniversaries, special events) that are visible to the user's friends. The database schema and RLS policies already exist from Phase 23 (v1.4 Friends System Foundation migration), so this phase focuses entirely on building the UI and service layer.

The implementation follows established patterns from the existing codebase: form sections similar to `personal-details.tsx`, service functions in `/lib/`, date picking using `@react-native-community/datetimepicker`, and gluestack-ui components for consistent styling. The public_dates table stores month/day separately (not full dates) to support annual recurring events, with an optional year field for one-time events.

**Primary recommendation:** Create a new settings screen `app/(app)/settings/public-dates.tsx` with a list of existing dates and an "Add Date" flow using the established section-based form patterns. Add a service file `lib/publicDates.ts` following the friends.ts pattern.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @gluestack-ui/themed | 1.1.73 | UI components (VStack, Input, Button, etc.) | Already used throughout app, provides consistent styling |
| @react-native-community/datetimepicker | 8.6.0 | Native date picker for month/day selection | Already in package.json, used in onboarding |
| date-fns | 4.1.0 | Date formatting and manipulation | Already used app-wide for formatting dates |
| @supabase/supabase-js | 2.93.3 | Database operations with RLS | Standard app database client |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-router | 6.0.23 | Navigation between screens | Modal navigation for add/edit forms |
| moti | 0.30.0 | Animations | List item entrance animations (optional) |
| @expo/vector-icons | 15.0.3 | Icons for date types | Calendar/event icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-native-community/datetimepicker | react-native-calendars | Calendars is more visual but overkill for simple month/day selection |
| Custom month/day selects | DateTimePicker with year ignored | Native picker is simpler, just extract month/day from result |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
  publicDates.ts           # Service functions (CRUD, types)
app/(app)/settings/
  public-dates.tsx         # List + Add/Edit screen
  _layout.tsx              # Add Stack.Screen for public-dates
components/
  profile/
    PublicDateCard.tsx     # Card for displaying/editing a date
    PublicDateForm.tsx     # Form section for add/edit (optional)
```

### Pattern 1: Service Layer Pattern
**What:** Separate service file with typed functions for database operations
**When to use:** All CRUD operations on public_dates table
**Example:**
```typescript
// Source: Existing pattern from lib/friends.ts

import { supabase } from './supabase';

export interface PublicDate {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  month: number;
  day: number;
  year: number | null;
  created_at: string;
  updated_at: string;
}

export interface PublicDateInput {
  title: string;
  description?: string;
  month: number;
  day: number;
  year?: number | null;
}

export async function getMyPublicDates(): Promise<PublicDate[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('public_dates')
    .select('*')
    .eq('user_id', user.id)
    .order('month', { ascending: true })
    .order('day', { ascending: true });

  if (error) throw error;
  return data || [];
}
```

### Pattern 2: Section-Based Form Pattern
**What:** Reusable form sections with controlled state lifted to parent
**When to use:** Add/Edit public date forms
**Example:**
```typescript
// Source: Existing pattern from components/profile/SizesSection.tsx

interface PublicDateFormProps {
  date: PublicDateInput;
  onChange: (date: PublicDateInput) => void;
}

export function PublicDateForm({ date, onChange }: PublicDateFormProps) {
  const updateField = <K extends keyof PublicDateInput>(
    key: K,
    value: PublicDateInput[K]
  ) => {
    onChange({ ...date, [key]: value });
  };

  return (
    <VStack space="md">
      <VStack space="xs">
        <Text style={styles.label}>Title *</Text>
        <Input variant="outline" size="md">
          <InputField
            placeholder="e.g., Wedding Anniversary"
            value={date.title}
            onChangeText={(val) => updateField('title', val)}
          />
        </Input>
      </VStack>
      {/* Month/Day picker, description, optional year */}
    </VStack>
  );
}
```

### Pattern 3: Platform-Aware Date Picker
**What:** Different DateTimePicker display modes for iOS vs Android
**When to use:** Month/day selection for public dates
**Example:**
```typescript
// Source: Existing pattern from app/(onboarding)/index.tsx

const [showDatePicker, setShowDatePicker] = useState(false);
const [selectedDate, setSelectedDate] = useState(new Date());

const handleDateChange = (event: any, date?: Date) => {
  if (Platform.OS === 'android') {
    setShowDatePicker(false);
  }
  if (date) {
    setSelectedDate(date);
    // Extract month and day for storage
    onChange({
      ...publicDate,
      month: date.getMonth() + 1, // getMonth() is 0-indexed
      day: date.getDate(),
    });
  }
};

{Platform.OS === 'ios' ? (
  <DateTimePicker
    value={selectedDate}
    mode="date"
    display="spinner"
    onChange={handleDateChange}
  />
) : (
  <>
    <Pressable onPress={() => setShowDatePicker(true)}>
      {/* Display current month/day */}
    </Pressable>
    {showDatePicker && (
      <DateTimePicker
        value={selectedDate}
        mode="date"
        display="default"
        onChange={handleDateChange}
      />
    )}
  </>
)}
```

### Anti-Patterns to Avoid
- **Storing full date strings:** Store month/day separately for recurring dates. The schema already does this correctly.
- **Bypassing RLS:** Use the established supabase client; RLS policies already enforce owner-write/friends-read.
- **Creating new navigation patterns:** Use the existing settings stack modal presentation.
- **Custom date validation:** Trust the database CHECK constraints (month 1-12, day 1-31).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date picker UI | Custom month/day dropdowns | @react-native-community/datetimepicker | Native UX, accessibility, already installed |
| Date formatting | Manual string formatting | date-fns format() | Localization, edge cases |
| Form state management | Redux/Zustand | useState with lift-to-parent | Pattern established in codebase |
| Delete confirmation | Custom modal | Alert.alert() | Platform-native UX, established pattern |

**Key insight:** The codebase uses simple patterns (useState, Alert.alert, platform date pickers). Adding complexity would create inconsistency.

## Common Pitfalls

### Pitfall 1: Month Index Mismatch
**What goes wrong:** JavaScript Date.getMonth() returns 0-11, but database stores 1-12
**Why it happens:** Easy to forget the index offset
**How to avoid:** Always use `date.getMonth() + 1` when storing, `month - 1` when creating Date objects
**Warning signs:** Dates off by one month in display vs database

### Pitfall 2: Year Field Confusion
**What goes wrong:** Mishandling the optional year field for annual vs one-time events
**Why it happens:** Unclear when to set year vs leave null
**How to avoid:** Add clear UI toggle: "Repeat annually" checkbox. If checked, year = null
**Warning signs:** User expects recurring date but year is stored

### Pitfall 3: Invalid Day for Month
**What goes wrong:** User selects Feb 30 via date picker, database rejects
**Why it happens:** DateTimePicker prevents invalid dates, but manual entry or edge cases can occur
**How to avoid:** Use DateTimePicker exclusively (not manual inputs). The picker auto-validates.
**Warning signs:** Database constraint errors on insert

### Pitfall 4: Android DatePicker Not Closing
**What goes wrong:** DatePicker stays open after selection on Android
**Why it happens:** Android DatePicker requires manual dismiss
**How to avoid:** Always `setShowDatePicker(false)` in onChange handler for Android
**Warning signs:** User must tap twice to confirm

### Pitfall 5: Friends-Only Visibility Assumption
**What goes wrong:** Showing delete button for dates that aren't owned by current user
**Why it happens:** Forgetting that friends can see (but not edit) the dates
**How to avoid:** Check `date.user_id === currentUserId` before showing edit/delete
**Warning signs:** RLS errors on delete attempts

## Code Examples

Verified patterns from existing codebase:

### CRUD Service Functions
```typescript
// Source: Pattern from lib/friends.ts

export async function createPublicDate(input: PublicDateInput): Promise<PublicDate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('public_dates')
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      month: input.month,
      day: input.day,
      year: input.year ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePublicDate(
  id: string,
  input: Partial<PublicDateInput>
): Promise<PublicDate> {
  const { data, error } = await supabase
    .from('public_dates')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePublicDate(id: string): Promise<void> {
  const { error } = await supabase
    .from('public_dates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

### Screen Pattern with List and Add
```typescript
// Source: Pattern from app/(app)/(tabs)/friends.tsx

export default function PublicDatesScreen() {
  const router = useRouter();
  const [dates, setDates] = useState<PublicDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadDates = async () => {
    try {
      const data = await getMyPublicDates();
      setDates(data);
    } catch (error) {
      console.error('Failed to load dates:', error);
      Alert.alert('Error', 'Failed to load dates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDates();
  }, []);

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Date',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePublicDate(id);
              loadDates();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete date');
            }
          },
        },
      ]
    );
  };

  // ... render list with FlatList or ScrollView
}
```

### Date Card Component
```typescript
// Source: Pattern from components/friends/FriendCard.tsx

interface PublicDateCardProps {
  date: PublicDate;
  onEdit: () => void;
  onDelete: () => void;
}

export function PublicDateCard({ date, onEdit, onDelete }: PublicDateCardProps) {
  const formattedDate = format(
    new Date(2000, date.month - 1, date.day), // Use any year for formatting
    'MMMM d'
  );

  return (
    <Pressable onPress={onEdit}>
      <Box
        backgroundColor="$white"
        borderRadius="$lg"
        padding="$4"
        marginBottom="$3"
        borderWidth={1}
        borderColor="$borderLight200"
      >
        <HStack justifyContent="space-between" alignItems="center">
          <VStack>
            <Text fontWeight="$semibold">{date.title}</Text>
            <Text fontSize="$sm" color="$textLight500">
              {formattedDate}
              {date.year ? ` (${date.year})` : ' (Annual)'}
            </Text>
            {date.description && (
              <Text fontSize="$xs" color="$textLight400" marginTop="$1">
                {date.description}
              </Text>
            )}
          </VStack>
          <TouchableOpacity onPress={onDelete}>
            <MaterialCommunityIcons name="delete-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </HStack>
      </Box>
    </Pressable>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full date strings | month/day/year columns | Phase 23 schema | Enables annual recurrence |
| Custom date inputs | Native DateTimePicker | Always | Better UX, accessibility |
| Global state (Redux) | Local useState | Project convention | Simpler, sufficient for forms |

**Deprecated/outdated:**
- N/A - This is a new feature with established patterns

## Open Questions

1. **Where to access Public Dates in UI?**
   - What we know: Could be in profile settings or as standalone settings section
   - What's unclear: Should there be a link from the main profile or just settings?
   - Recommendation: Add to settings via profile.tsx link (like "Personal Details") + add Stack.Screen in settings/_layout.tsx

2. **Edit inline vs separate screen?**
   - What we know: Personal details uses single screen with sections
   - What's unclear: Should public dates edit inline (swipe to edit) or navigate to edit screen?
   - Recommendation: List view with tap-to-edit modal/screen, consistent with settings pattern

3. **Friends view of public dates (Phase 28)?**
   - What we know: RLS allows friends to read public_dates
   - What's unclear: Where friends will see these dates (calendar? profile?)
   - Recommendation: Out of scope for Phase 27 (CRUD only); Phase 28 calendar will handle display

## Sources

### Primary (HIGH confidence)
- `/home/zetaz/wishlist-app/supabase/migrations/20260210000001_v1.4_friends_system_foundation.sql` - Schema definition, RLS policies, CHECK constraints
- `/home/zetaz/wishlist-app/package.json` - Dependency versions
- `/home/zetaz/wishlist-app/app/(onboarding)/index.tsx` - DateTimePicker usage pattern
- `/home/zetaz/wishlist-app/lib/friends.ts` - Service layer pattern
- `/home/zetaz/wishlist-app/app/(app)/settings/personal-details.tsx` - Form screen pattern
- `/home/zetaz/wishlist-app/components/profile/SizesSection.tsx` - Form section pattern

### Secondary (MEDIUM confidence)
- `/home/zetaz/wishlist-app/components/friends/FriendCard.tsx` - Card component pattern
- `/home/zetaz/wishlist-app/constants/theme.ts` - Styling constants

### Tertiary (LOW confidence)
- N/A - All patterns verified from existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json and used throughout app
- Architecture: HIGH - Patterns directly copied from existing similar features
- Pitfalls: HIGH - Based on observed patterns and schema constraints in codebase

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable patterns, schema already locked)
