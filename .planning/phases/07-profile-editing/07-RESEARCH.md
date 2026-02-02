# Phase 7: Profile Editing - Research

**Researched:** 2026-02-02
**Domain:** React Native Profile Editing, Supabase Storage, Expo Router Navigation
**Confidence:** HIGH

## Summary

Phase 7 focuses on enabling users to edit their profile information (display name, profile photo) post-onboarding, while keeping the birthday field locked. The codebase already has strong foundations: an existing onboarding flow (`app/(onboarding)/index.tsx`), a profile view screen (`app/profile/[id].tsx`), and working avatar upload infrastructure (`lib/storage.ts`).

The key implementation areas are:
1. **Profile Settings Screen** - A new settings/edit profile screen accessible from the main app
2. **Birthday Confirmation Step** - Enhance onboarding to clearly explain birthday lock policy
3. **Locked Field UX** - Display birthday as read-only with visual distinction

**Primary recommendation:** Create a new profile settings screen at `app/(app)/settings/profile.tsx` using the existing Gluestack UI components and reuse the avatar upload infrastructure from `lib/storage.ts`. Add a confirmation step to onboarding before birthday submission.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-image-picker | 55.0.x | Photo selection from device | Already installed and used in onboarding; provides native image picker UI |
| @supabase/supabase-js | 2.93.3 | Storage bucket operations | Already configured; handles avatar uploads to `avatars` bucket |
| @gluestack-ui/themed | 1.1.73 | Form components (Input, Avatar, FormControl) | Already the project's UI library |
| expo-router | ~6.0.23 | Navigation and routing | File-based routing already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-native-community/datetimepicker | (existing) | Date display for birthday | Already used in onboarding; for displaying locked date |
| date-fns | (existing) | Date formatting | Already used in profile/[id].tsx for birthday display |
| moti | 0.30.0 | Subtle animations | For locked field visual feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New settings tab | Modal from wishlist header | Settings tab is more scalable for future features |
| Stack navigation | Modal presentation | Modal feels more natural for "quick edit" flows |

**Installation:**
```bash
# No new packages needed - all dependencies exist
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── (app)/
│   ├── (tabs)/
│   │   └── ... (existing tabs)
│   └── settings/
│       ├── _layout.tsx       # Stack layout for settings screens
│       └── profile.tsx       # Profile editing screen (new)
├── (onboarding)/
│   ├── _layout.tsx           # Existing
│   ├── index.tsx             # Modify: add birthday confirmation step
│   └── confirm-birthday.tsx  # New: birthday confirmation screen (optional)
└── profile/
    └── [id].tsx              # Existing view-only profile
```

### Pattern 1: Reuse Existing Avatar Upload
**What:** The `lib/storage.ts` module already implements avatar upload with proper error handling
**When to use:** For profile photo editing - reuse `uploadAvatar()` and `getAvatarUrl()`
**Example:**
```typescript
// Source: Existing lib/storage.ts pattern
import { uploadAvatar, getAvatarUrl } from '@/lib/storage';

const handleAvatarChange = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const path = await uploadAvatar(user.id);
  if (path) {
    // Update profile in database
    await supabase
      .from('user_profiles')
      .update({ avatar_url: path })
      .eq('id', user.id);
    // Update local state
    setAvatarPath(path);
  }
};
```

### Pattern 2: Locked Field with Visual Distinction
**What:** Display birthday as read-only with clear visual indicator that it cannot be changed
**When to use:** For PROF-03 requirement
**Example:**
```typescript
// Source: Gluestack UI FormControl pattern
<VStack space="sm">
  <HStack alignItems="center" space="xs">
    <Text fontWeight="$medium">Birthday</Text>
    <MaterialCommunityIcons name="lock" size={14} color="$textLight500" />
  </HStack>
  <Input variant="outline" size="lg" isReadOnly isDisabled>
    <InputField
      value={formatBirthday(profile?.birthday)}
      editable={false}
      style={{ color: '$textLight500', backgroundColor: '$backgroundLight100' }}
    />
  </Input>
  <Text fontSize="$xs" color="$textLight500">
    Birthday cannot be changed after initial setup
  </Text>
</VStack>
```

### Pattern 3: Modal Navigation for Profile Editing
**What:** Present profile editing as a modal from the settings flow
**When to use:** For seamless edit experience without losing context
**Example:**
```typescript
// Source: Expo Router modal pattern
// In app/(app)/settings/_layout.tsx
<Stack>
  <Stack.Screen name="profile" options={{
    presentation: 'modal',
    title: 'Edit Profile'
  }} />
</Stack>
```

### Pattern 4: Birthday Confirmation Step in Onboarding
**What:** Add a dedicated confirmation screen before finalizing birthday
**When to use:** For ONBD-01 and ONBD-02 requirements
**Example:**
```typescript
// Before saving onboarding data, show confirmation
<VStack space="md" padding="$6">
  <Heading>Confirm Your Birthday</Heading>
  <Text size="lg">
    {birthday.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })}
  </Text>
  <Box
    backgroundColor="$warning100"
    padding="$4"
    borderRadius="$md"
  >
    <HStack space="sm" alignItems="center">
      <MaterialCommunityIcons name="information" size={20} color="$warning600" />
      <Text color="$warning800">
        Your birthday cannot be changed after this step.
        Please make sure it's correct.
      </Text>
    </HStack>
  </Box>
  <Button onPress={handleConfirmAndContinue}>
    <ButtonText>Confirm Birthday</ButtonText>
  </Button>
  <Button variant="link" onPress={handleGoBack}>
    <ButtonText>Go Back and Edit</ButtonText>
  </Button>
</VStack>
```

### Anti-Patterns to Avoid
- **Don't use inline date picker for locked birthday:** Show formatted text only, no picker
- **Don't allow keyboard focus on locked field:** Use `isDisabled` alongside `isReadOnly`
- **Don't create new avatar upload logic:** Reuse `lib/storage.ts`
- **Don't store avatar as base64:** Use Supabase Storage paths as implemented

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image picking | Custom file picker | expo-image-picker `launchImageLibraryAsync()` | Permission handling, cropping, platform differences |
| Avatar storage | Base64 in database | Supabase Storage bucket | Performance, CDN, proper URL handling |
| Image cropping | Manual crop UI | expo-image-picker `allowsEditing: true` | Native crop UI is familiar to users |
| Profile data updates | Direct API calls | Existing supabase client patterns | RLS policies already configured |
| Locked field styling | Custom disabled styles | Gluestack `isReadOnly` + `isDisabled` | Consistent with app design system |

**Key insight:** The project already has 80% of the infrastructure for profile editing. The onboarding screen (`app/(onboarding)/index.tsx`) contains working patterns for avatar upload, display name input, and birthday selection. Extract and reuse these patterns for the settings screen.

## Common Pitfalls

### Pitfall 1: Avatars Storage Bucket Not Created
**What goes wrong:** Avatar upload fails with storage error
**Why it happens:** The `avatars` bucket needs manual creation in Supabase
**How to avoid:** Verify bucket exists before implementing; document in setup requirements
**Warning signs:** `Error uploading avatar: Bucket not found` in console

### Pitfall 2: Birthday Still Editable via API
**What goes wrong:** Users could theoretically bypass UI and update birthday via API
**Why it happens:** Only UI prevents editing, not database constraints
**How to avoid:** Consider adding database trigger to prevent birthday updates after initial set (optional hardening)
**Warning signs:** Birthday changes appearing in database without user action

### Pitfall 3: TextInput Still Focusable When ReadOnly
**What goes wrong:** Keyboard appears when tapping locked birthday field
**Why it happens:** React Native `editable={false}` doesn't prevent all interactions
**How to avoid:** Use both `isReadOnly` and `isDisabled` props; wrap in non-pressable container
**Warning signs:** Keyboard appearing, text selection showing on locked fields

### Pitfall 4: Onboarding Flow Confusion
**What goes wrong:** User skips confirmation or doesn't understand birthday is permanent
**Why it happens:** Confirmation message not prominent enough
**How to avoid:** Use warning-colored box, require explicit confirmation tap, show birthday prominently
**Warning signs:** Support requests about changing birthday

### Pitfall 5: Profile Updates Not Reflecting Immediately
**What goes wrong:** User changes name but sees old name elsewhere in app
**Why it happens:** Components cache user data, no refresh trigger
**How to avoid:** Use React Query or implement context-based profile state that refreshes on updates
**Warning signs:** Stale display name in headers after editing

## Code Examples

Verified patterns from official sources and existing codebase:

### Profile Settings Screen Structure
```typescript
// Source: Existing onboarding/index.tsx + gluestack patterns
import { useState, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import {
  VStack,
  HStack,
  Text,
  Button,
  ButtonText,
  Input,
  InputField,
  Heading,
  Avatar,
  AvatarFallbackText,
  AvatarImage,
  Pressable,
  Box,
} from '@gluestack-ui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { uploadAvatar, getAvatarUrl } from '@/lib/storage';
import { Database } from '@/types/database.types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export default function ProfileSettingsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || '');
      setAvatarPath(data.avatar_url);
    }
    setIsLoading(false);
  };

  const handleAvatarUpload = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const path = await uploadAvatar(user.id);
    if (path) {
      setAvatarPath(path);
      // Immediately update database
      await supabase
        .from('user_profiles')
        .update({ avatar_url: path })
        .eq('id', user.id);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Required', 'Display name cannot be empty');
      return;
    }

    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        display_name: displayName.trim(),
        avatar_url: avatarPath,
      })
      .eq('id', user.id);

    setIsSaving(false);

    if (error) {
      Alert.alert('Error', 'Failed to save profile');
    } else {
      Alert.alert('Success', 'Profile updated');
    }
  };

  const avatarUrl = avatarPath ? getAvatarUrl(avatarPath) : null;

  // ... render JSX
}
```

### Birthday Confirmation Component
```typescript
// Source: Based on Gluestack UI patterns + expo-router
import { router } from 'expo-router';
import { VStack, HStack, Text, Button, ButtonText, Box, Heading } from '@gluestack-ui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface BirthdayConfirmationProps {
  birthday: Date;
  onConfirm: () => void;
  onBack: () => void;
}

export function BirthdayConfirmation({ birthday, onConfirm, onBack }: BirthdayConfirmationProps) {
  return (
    <VStack flex={1} padding="$6" space="xl" justifyContent="center">
      <Heading size="2xl" textAlign="center">
        Confirm Your Birthday
      </Heading>

      <Text size="xl" textAlign="center" fontWeight="$semibold">
        {birthday.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}
      </Text>

      <Box
        backgroundColor="$amber100"
        padding="$4"
        borderRadius="$lg"
        borderWidth={1}
        borderColor="$amber300"
      >
        <HStack space="md" alignItems="flex-start">
          <MaterialCommunityIcons name="alert-circle" size={24} color="#B45309" />
          <VStack flex={1} space="xs">
            <Text fontWeight="$bold" color="$amber900">
              Important Notice
            </Text>
            <Text color="$amber800" size="sm">
              Your birthday cannot be changed after you complete setup.
              This helps ensure fair birthday celebrations in your groups.
            </Text>
          </VStack>
        </HStack>
      </Box>

      <VStack space="md" marginTop="$4">
        <Button size="lg" onPress={onConfirm}>
          <ButtonText>Yes, This Is Correct</ButtonText>
        </Button>
        <Button variant="outline" size="lg" onPress={onBack}>
          <ButtonText>Go Back and Edit</ButtonText>
        </Button>
      </VStack>
    </VStack>
  );
}
```

### Locked Birthday Field Component
```typescript
// Source: Gluestack UI FormControl + Input patterns
import { VStack, HStack, Text, Input, InputField, Box } from '@gluestack-ui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface LockedBirthdayFieldProps {
  birthday: string | null;
}

export function LockedBirthdayField({ birthday }: LockedBirthdayFieldProps) {
  const formattedBirthday = birthday
    ? format(new Date(birthday), 'MMMM d, yyyy')
    : 'Not set';

  return (
    <VStack space="xs">
      <HStack alignItems="center" space="xs">
        <Text fontWeight="$medium" color="$textLight700">Birthday</Text>
        <MaterialCommunityIcons name="lock" size={14} color="#9CA3AF" />
      </HStack>

      <Box
        backgroundColor="$backgroundLight100"
        borderRadius="$md"
        padding="$3"
        borderWidth={1}
        borderColor="$borderLight200"
      >
        <Text color="$textLight600">{formattedBirthday}</Text>
      </Box>

      <Text fontSize="$xs" color="$textLight500">
        Birthday cannot be changed after initial setup
      </Text>
    </VStack>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FormData upload | ArrayBuffer upload | 2024 | React Native requires ArrayBuffer for Supabase Storage uploads |
| `MediaTypeOptions.Images` | `mediaTypes: 'images'` | expo-image-picker 15+ | New API simplifies media type selection |
| `editable={false}` only | `isReadOnly` + `isDisabled` | Gluestack v1.1 | Proper accessibility and interaction blocking |

**Deprecated/outdated:**
- `MediaTypeOptions` enum: replaced with string array `['images', 'videos']` or single string `'images'`

## Open Questions

Things that couldn't be fully resolved:

1. **Entry Point for Settings**
   - What we know: No settings tab currently exists; profile editing is new
   - What's unclear: Should settings be a new tab, accessible from wishlist header, or via profile icon?
   - Recommendation: Start with a gear icon in the Home screen header; add settings tab if more settings features come later

2. **Database-Level Birthday Lock**
   - What we know: UI will prevent editing, but no database constraint
   - What's unclear: Should we add a database trigger to hard-prevent birthday updates?
   - Recommendation: UI-only for now; add database trigger if abuse is detected

3. **Profile Picture Cache Invalidation**
   - What we know: Supabase Storage URLs may be cached by CDN
   - What's unclear: Will new avatar show immediately after upload?
   - Recommendation: Add timestamp query param to avatar URL to bust cache: `getAvatarUrl(path) + '?t=' + Date.now()`

## Sources

### Primary (HIGH confidence)
- Expo ImagePicker Docs (https://docs.expo.dev/versions/latest/sdk/imagepicker/) - API, permissions, return values
- Supabase Expo Tutorial (https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) - Avatar upload pattern
- Gluestack UI Input Component (https://gluestack.io/ui/docs/components/input) - isReadOnly, isDisabled props
- Expo Router Modals (https://docs.expo.dev/router/advanced/modals/) - Modal navigation pattern

### Secondary (MEDIUM confidence)
- Existing codebase `app/(onboarding)/index.tsx` - Working avatar upload implementation
- Existing codebase `lib/storage.ts` - uploadAvatar and getAvatarUrl functions
- Existing codebase `app/profile/[id].tsx` - Profile display patterns

### Tertiary (LOW confidence)
- WebSearch: React Native readonly field patterns - confirmed with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in project
- Architecture: HIGH - Patterns extracted from existing working code
- Pitfalls: MEDIUM - Some based on documented issues, some on general React Native experience

**Research date:** 2026-02-02
**Valid until:** 30 days (stable domain, existing libraries)
