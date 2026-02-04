# Phase 12: Group Photo Storage - Research

**Researched:** 2026-02-04
**Domain:** Image upload, compression, and storage in React Native with Supabase
**Confidence:** HIGH

## Summary

Phase 12 implements group photo upload functionality by extending the existing avatar infrastructure (established in Phase 7) to support group-level photos. The project already has `expo-image-picker` for selection and the `avatars` Supabase bucket with RLS policies. Photo storage follows the same pattern as user avatars: store relative paths in the database (`groups.photo_url`), use `expo-image-manipulator` for compression, and construct full URLs client-side.

Generated avatars (initials-based fallbacks) leverage gluestack-ui's existing `AvatarFallbackText` component, which the project already imports and uses. The phase requires no new dependencies—all infrastructure exists from v1.0/v1.1. Group photos share the same bucket as user avatars, with RLS policies extended to allow group admins to manage group photos.

**Primary recommendation:** Extend existing `uploadAvatar()` service to support group uploads via a new `uploadGroupPhoto()` function that follows the same pattern (image picker → compression → upload → return path). Use gluestack-ui's built-in avatar fallback rendering for initials-based defaults when no photo exists.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already In Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-image-picker | ~17.0.10 | Photo selection from device | Project standard since Phase 7 |
| expo-image-manipulator | ~14.0.8 | Image compression/resizing | Bundled with Expo 54, fast native implementation |
| Supabase Storage | latest | File hosting with RLS | Project standard since v1.0 |
| gluestack-ui | ^1.1.73 | Avatar component + fallback text | Already imported in project |

### Supporting (Already In Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | 2.93.3 | Storage client API | Upload operations |
| expo | ~54.0.33 | Managed React Native | Image manipulation, permissions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-image-manipulator | react-native-compressor | RNC adds 50KB vs ~0 (bundled); expo-manipulator is sufficient for compression |
| gluestack-ui Avatar | Custom initials rendering | Custom approach requires color hashing, layout work; gluestack provides tested component |
| Single avatars bucket | Separate groups-photos bucket | Using existing bucket reduces RLS policy complexity; subdirectories are supported |
| Client-side compression | Server-side compression | Client-side reduces backend load, preserves user bandwidth on fast connections |

**No installation needed** - All libraries already present in package.json.

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── storage.ts              # Existing: uploadAvatar(), getAvatarUrl()
                           # NEW: uploadGroupPhoto(), getGroupPhotoUrl()
                           # NEW: generateInitials() utility

types/
├── database.types.ts       # Already has photo_url column (Phase 11)

app/
├── (app)/
  ├── group/
    ├── [id].tsx          # NEW: Group header with photo fallback
    └── settings/
      └── photo.tsx       # NEW: Group photo upload screen
```

### Pattern 1: Unified Photo Upload Service
**What:** Extend existing storage.ts to handle both user and group photos using a generic upload function
**When to use:** When multiple entities share similar upload patterns
**Why:** DRY principle; reuse permission handling, compression logic, error handling
**Example:**
```typescript
// Source: Existing uploadAvatar() pattern, Phase 7
// lib/storage.ts - NEW FUNCTION

/**
 * Upload group photo to Supabase Storage
 * @param groupId - The group's ID
 * @param userId - Current user ID (for permission verification)
 * @returns The storage path of the uploaded photo or null if failed
 */
export async function uploadGroupPhoto(
  groupId: string,
  userId: string
): Promise<string | null> {
  try {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.error('Media library permissions not granted');
      return null;
    }

    // Launch image picker (allow editing for group context)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],  // Group header aspect ratio
      quality: 0.85,
    });

    if (result.canceled) {
      return null;
    }

    const uri = result.assets[0].uri;

    // Compress image using expo-image-manipulator
    const manipulatorContext = ImageManipulator.manipulate(uri)
      .resize({ width: 800 })  // Optimized for header display
      .compress(0.8);

    const manipulatorResult = await manipulatorContext.renderAsync();

    // Convert compressed image to ArrayBuffer
    const response = await fetch(manipulatorResult.uri);
    const arrayBuffer = await response.arrayBuffer();

    // Generate unique file name: groups/{groupId}/{timestamp}.{ext}
    const fileExt = uri.split('.').pop() || 'jpg';
    const fileName = `groups/${groupId}/${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage (avatars bucket)
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: true,  // Allow admin to replace existing photo
      });

    if (error) {
      console.error('Error uploading group photo:', error);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error('Error in uploadGroupPhoto:', error);
    return null;
  }
}

/**
 * Get public URL for a group photo from storage
 * @param path - The storage path of the group photo
 * @returns The public URL or null if failed
 */
export function getGroupPhotoUrl(path: string | null): string | null {
  if (!path) return null;

  try {
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    console.error('Error getting group photo URL:', error);
    return null;
  }
}
```

### Pattern 2: Avatar Fallback with Initials
**What:** Use gluestack-ui's AvatarFallbackText component to display group initials when no photo exists
**When to use:** Required for all group displays to ensure consistent user experience
**Why:** Avoids broken image states; gluestack component is battle-tested and accessible
**Example:**
```typescript
// Source: gluestack-ui Avatar component documentation
// app/group/[id].tsx - NEW SECTION

import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from '@gluestack-ui/themed';

function GroupAvatar({ group }: { group: GroupType }) {
  const groupPhotoUrl = group.photo_url ? getGroupPhotoUrl(group.photo_url) : null;

  // Generate initials: first letter of each word, max 3 chars
  const getGroupInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 3)  // Max 3 initials
      .map(word => word[0]?.toUpperCase())
      .join('')
      .slice(0, 3);
  };

  return (
    <Avatar bgColor="$blue500" size="lg">
      {groupPhotoUrl && <AvatarImage source={{ uri: groupPhotoUrl }} />}
      <AvatarFallbackText>{getGroupInitials(group.name)}</AvatarFallbackText>
    </Avatar>
  );
}
```

### Pattern 3: Storage Path Organization
**What:** Use subdirectories within avatars bucket: `groups/{groupId}/{timestamp}.{ext}`
**When to use:** When organizing photos for multiple entity types in shared bucket
**Why:** Matches user avatar pattern; RLS policies can target specific folders; clean namespace separation
**Example:**
```
avatars/
├── {userId}/                           # User avatars (Phase 7)
│   ├── user-1-1709571234567.jpg
│   └── user-1-1709571334567.jpg
└── groups/{groupId}/                   # Group photos (Phase 12)
    ├── group-uuid-123/1709571234567.jpg
    └── group-uuid-456/1709571334568.png
```

### Pattern 4: RLS Policy Extension for Group Photos
**What:** Extend avatars bucket RLS to allow group admins to manage group photos
**When to use:** When implementing group-level file management
**Why:** Maintains security while enabling admin functionality
**Example:**
```sql
-- Add to storage RLS policies (Phase 12 migration or separate)
-- Allow group admins to upload/update group photos

CREATE POLICY "Group admins can upload group photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'groups'
  AND EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = (storage.foldername(name))[2]::uuid
    AND user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Group admins can update group photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'groups'
  AND EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = (storage.foldername(name))[2]::uuid
    AND user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'groups'
);

-- Allow all authenticated users to view group photos (public bucket)
CREATE POLICY "Authenticated users can view group photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'groups'
);
```

### Anti-Patterns to Avoid
- **Uploading uncompressed images:** Phase 7 compressed user avatars; apply same approach to groups
- **Storing full URLs in database:** Changes if bucket configuration changes; store paths only (Phase 11 pattern)
- **Separate bucket for groups:** Complicates RLS policies; existing avatars bucket supports subdirectories
- **Hardcoding aspect ratios:** User avatars use 1:1; group header may need different ratio—make configurable
- **Skipping fallback avatars:** Groups without photos will break UI; always render initials fallback
- **Custom initials rendering:** gluestack provides accessible, styled component; don't reinvent

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image picker UI | Custom camera/library interface | expo-image-picker | Handles permissions, platform specifics |
| Image compression | Manual resize calculations | expo-image-manipulator | Native implementation, fast, optimized |
| Avatar fallback text | Custom initials + color rendering | gluestack-ui Avatar + AvatarFallbackText | Accessible, styled, tested component |
| Storage URL construction | Manual URL building | supabase.storage.getPublicUrl() | Handles bucket config changes, versioning |
| Permission requests | Direct permission APIs | ImagePicker.requestMediaLibraryPermissionsAsync() | Handles platform differences, user flows |
| RLS policy design | Ad-hoc SQL | Supabase helper functions (storage.foldername) | Built for storage patterns, safe |

**Key insight:** The project has already solved photo upload complexity in Phase 7 (avatars). Group photos follow the same pattern—reuse code, don't duplicate work.

## Common Pitfalls

### Pitfall 1: Uncompressed Images Uploaded to Storage
**What goes wrong:** Large images consume storage quota, slow download speeds, poor UX on slow networks
**Why it happens:** Skipping compression step seems faster; actually creates worse user experience
**How to avoid:** Always compress with expo-image-manipulator before upload (match Phase 7 pattern)
**Warning signs:** File sizes >500KB in storage; slow loading in UI; storage quota warnings

### Pitfall 2: Missing Avatar Fallback in UI
**What goes wrong:** Groups without photos show broken image states, confusing users
**Why it happens:** Assuming photo always exists (it doesn't on initial creation)
**How to avoid:** Always render gluestack Avatar with AvatarFallbackText; conditional AvatarImage
**Warning signs:** Blank spaces in group displays; users complain about "missing photos"

### Pitfall 3: Storing Full Storage URLs in Database
**What goes wrong:** URLs break if Supabase bucket configuration changes (rare but possible)
**Why it happens:** Copying external image URL patterns
**How to avoid:** Store relative paths only (Phase 11 already enforces this); construct URLs client-side
**Warning signs:** Database has hardcoded URLs like `https://project.supabase.co/...`

### Pitfall 4: Wrong Image Aspect Ratio for Group Context
**What goes wrong:** User avatar ratio (1:1 square) doesn't work for group header (wider, shorter)
**Why it happens:** Copy-pasting user avatar code without considering context
**How to avoid:** Expose aspect ratio as parameter to uploadGroupPhoto(); use 16:9 for headers, 1:1 for small icons
**Warning signs:** Group photos look stretched or squished in header; UI layout breaks

### Pitfall 5: Forgetting RLS Policy Updates for Group Photos
**What goes wrong:** Group admins cannot upload photos; regular members shouldn't modify; chaos
**Why it happens:** Phase 7 created avatars bucket with user-only policies; groups need different access model
**How to avoid:** Extend RLS policies to check group_members table; verify admin before allowing upload
**Warning signs:** "Permission denied" errors when admin tries to upload; security breach if non-admins can modify

### Pitfall 6: Compression Quality Too Aggressive
**What goes wrong:** Group photos look blurry or pixelated in group header
**Why it happens:** Setting compression to 0.5-0.6 to minimize file size
**How to avoid:** Use 0.8-0.85 compression (Phase 7 uses 0.8); test on target devices
**Warning signs:** Visible compression artifacts; users complain about photo quality

### Pitfall 7: Image Picker Not Requesting Permissions
**What goes wrong:** Image picker fails silently on real devices (permissions required)
**Why it happens:** Testing on simulator where permissions are always granted
**How to avoid:** Always call ImagePicker.requestMediaLibraryPermissionsAsync() before launching picker
**Warning signs:** Works in Expo Go, fails on physical device; console errors about permissions

## Code Examples

Verified patterns from existing project code and official documentation:

### Complete Group Photo Upload Function
```typescript
// Source: Phase 7 uploadAvatar() pattern + expo-image-manipulator docs
// lib/storage.ts - NEW FUNCTION

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

/**
 * Upload group photo to Supabase Storage
 * Compresses image and stores at: groups/{groupId}/{timestamp}.{ext}
 *
 * @param groupId - The group's ID
 * @returns The storage path of the uploaded photo or null if failed
 */
export async function uploadGroupPhoto(groupId: string): Promise<string | null> {
  try {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.error('Media library permissions not granted');
      return null;
    }

    // Launch image picker with group header aspect ratio
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],  // Group header context
      quality: 0.85,
    });

    if (result.canceled) {
      return null;
    }

    const uri = result.assets[0].uri;

    // Compress image using expo-image-manipulator
    // Resize to max width 800px (sufficient for all display sizes)
    // Compress at 0.8 quality (balance between quality and file size)
    const manipulatorContext = ImageManipulator.manipulate(uri);
    const resized = await manipulatorContext
      .resize({ width: 800 })
      .compress(0.8)
      .renderAsync();

    // Convert compressed image to ArrayBuffer
    const response = await fetch(resized.uri);
    const arrayBuffer = await response.arrayBuffer();

    // Generate unique file name with group scoping
    const fileExt = uri.split('.').pop() || 'jpg';
    const fileName = `groups/${groupId}/${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage (avatars bucket)
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: true,  // Allow admin to replace existing photo
      });

    if (error) {
      console.error('Error uploading group photo:', error);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error('Error in uploadGroupPhoto:', error);
    return null;
  }
}

/**
 * Get public URL for a group photo
 * @param path - The storage path from groups.photo_url
 * @returns The public URL or null if failed
 */
export function getGroupPhotoUrl(path: string | null): string | null {
  if (!path) return null;

  try {
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    console.error('Error getting group photo URL:', error);
    return null;
  }
}
```

### Group Avatar Component with Initials Fallback
```typescript
// Source: gluestack-ui Avatar component + Phase 7 user avatar pattern
// app/group/[id].tsx - NEW COMPONENT

import { Avatar, AvatarFallbackText, AvatarImage, Text } from '@gluestack-ui/themed';
import { getGroupPhotoUrl } from '@/lib/storage';
import { Group } from '@/types';

interface GroupAvatarProps {
  group: Group;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function GroupAvatar({ group, size = 'lg' }: GroupAvatarProps) {
  const photoUrl = group.photo_url ? getGroupPhotoUrl(group.photo_url) : null;

  // Generate initials: first letter of each word, max 3 chars
  // Examples: "Engineering Team" → "ET", "Project X" → "PX", "A B C D" → "ABC"
  const getGroupInitials = (name: string): string => {
    return name
      .trim()
      .split(/\s+/)  // Split on any whitespace
      .slice(0, 3)   // Max 3 words
      .map(word => word[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 3);
  };

  return (
    <Avatar bgColor="$blue500" size={size}>
      {photoUrl && (
        <AvatarImage
          source={{ uri: photoUrl }}
          alt={group.name}
        />
      )}
      <AvatarFallbackText>
        {getGroupInitials(group.name)}
      </AvatarFallbackText>
    </Avatar>
  );
}

// Usage in group header
export function GroupHeader({ group }: { group: Group }) {
  return (
    <VStack space="md">
      <HStack space="md" alignItems="center">
        <GroupAvatar group={group} size="xl" />
        <VStack>
          <Heading size="lg">{group.name}</Heading>
          {group.description && (
            <Text size="sm" color="$textLight600">
              {group.description}
            </Text>
          )}
        </VStack>
      </HStack>
    </VStack>
  );
}
```

### TypeScript Types Update
```typescript
// Source: Phase 11 v1.2_groups_schema.sql + supabase gen types
// types/database.types.ts - ALREADY EXISTS (photo_url column added in Phase 11)

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string
          name: string
          created_by: string
          budget_limit_per_gift: number
          mode: 'greetings' | 'gifts'              // Phase 11
          budget_approach: 'per_gift' | 'monthly' | 'yearly' | null  // Phase 11
          budget_amount: number | null             // Phase 11
          description: string | null               // Phase 11
          photo_url: string | null                 // Phase 11 - Phase 12 USES THIS
          created_at: string
          updated_at: string
        }
        Insert: {
          // ... same as Row with optional id, created_at, updated_at
        }
        Update: {
          // ... optional fields
        }
      }
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No group photos | Group photo upload + initials fallback | Phase 12 (v1.2) | Improves group identity and UX |
| Custom initials rendering | gluestack-ui Avatar + AvatarFallbackText | v1.2 standard | Consistent, accessible fallbacks |
| Separate storage buckets | Single avatars bucket with subdirectories | Phase 7 → Phase 12 | Simpler RLS policies, unified management |
| Manual image resizing | expo-image-manipulator compression | Phase 7 → Phase 12 | Native performance, optimized quality |

**Deprecated/outdated:**
- Building custom avatar fallbacks: gluestack provides battle-tested component (use instead)
- Storing full storage URLs: store paths only, construct URLs client-side (Phase 11 pattern)

## Open Questions

Things that couldn't be fully resolved:

1. **Should group photo RLS policies be created in Phase 12 or separate migration?**
   - What we know: Phase 7 created user avatar policies; Phase 12 extends for groups
   - What's unclear: Whether to add group policies in Phase 11 migration (schema phase) or Phase 12 (upload phase)
   - Recommendation: Create group RLS policies in Phase 12 migration (with upload logic) for logical grouping; reference Phase 7 pattern for syntax

2. **What image aspect ratio should be enforced in image picker?**
   - What we know: User avatars use 1:1 (square); group header is typically 16:9 (wide)
   - What's unclear: Whether to fix aspect ratio or make it flexible
   - Recommendation: Set aspect ratio to 16:9 for group header context; make configurable if future phases need different ratios

3. **Should deleted group photos be archived or immediately removed?**
   - What we know: Phase 11 research noted "soft-archiving consideration" for mode switching
   - What's unclear: Whether to keep deleted photos for recovery or delete immediately
   - Recommendation: Implement immediate deletion in Phase 12 (simpler); add recovery in Phase 15+ if needed

4. **Should image upload include progress tracking?**
   - What we know: Existing uploadAvatar() doesn't track progress
   - What's unclear: Whether Phase 12 should add progress bars for better UX
   - Recommendation: Skip in Phase 12; add progress bar in Phase 13+ if needed for large files

## Sources

### Primary (HIGH confidence)
- [expo-image-manipulator documentation](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/) - Compression, resizing, format conversion API
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) - RLS policies for storage buckets
- [Supabase Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions) - storage.foldername() and RLS policy patterns
- gluestack-ui Avatar component - AvatarFallbackText for initials display (imported in project)
- `/home/zetaz/wishlist-app/lib/storage.ts` - Existing uploadAvatar() pattern to reuse
- `/home/zetaz/wishlist-app/supabase/migrations/20260204000002_avatars_storage_policies.sql` - Storage RLS policy syntax and pattern

### Secondary (MEDIUM confidence)
- [2026 Guide: Mastering Media Uploads in React Native](https://dev.to/fasthedeveloper/mastering-media-uploads-in-react-native-images-videos-smart-compression-2026-guide-5g2i) - Image compression best practices for React Native
- [react-native-compressor vs expo-image-manipulator comparison](https://www.npmjs.com/package/react-native-compressor) - Alternative approaches; expo-manipulator chosen as bundled solution
- [Deterministic React Avatar Fallbacks](https://www.joshuaslate.com/blog/deterministic-react-avatar-fallback) - Initials generation patterns and color consistency
- [React Native Avatar Initials Implementation](https://medium.com/@aswingiftson007/react-native-how-to-create-an-avatar-with-initials-in-react-native-4ccc7e9e7ddc) - Fallback avatar design patterns

### Project Sources (HIGH confidence)
- `/home/zetaz/wishlist-app/.planning/phases/11-schema-foundation/11-RESEARCH.md` - Phase 11 storage path pattern and RLS foundation
- `/home/zetaz/wishlist-app/supabase/migrations/20260205000001_v1.2_groups_schema.sql` - Groups table schema including photo_url column
- `/home/zetaz/wishlist-app/package.json` - Verified expo-image-picker, expo-image-manipulator, gluestack-ui versions
- `/home/zetaz/wishlist-app/app/profile/[id].tsx` - Avatar display pattern using gluestack-ui Avatar component

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, patterns established in Phase 7
- Architecture: HIGH - Verified against Phase 7 avatar pattern, Supabase docs, gluestack-ui documentation
- Pitfalls: HIGH - Based on Phase 7 learnings and real-world React Native image handling issues
- RLS Policies: MEDIUM - Pattern clear from Phase 7; group-specific extension requires validation in Phase 12 planning

**Research date:** 2026-02-04
**Valid until:** 60 days (stable patterns, not fast-moving; Supabase and expo APIs stable)
