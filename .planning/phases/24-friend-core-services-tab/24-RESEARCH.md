# Phase 24: Friend Core Services & Tab - Research

**Researched:** 2026-02-09
**Domain:** React Native/Expo tab navigation, Supabase services, TypeScript service patterns
**Confidence:** HIGH

## Summary

Phase 24 implements the core Friend CRUD operations (view friends list, view friend profile, remove friend) and adds the Friends tab to the main navigation. This phase builds directly on Phase 23's database foundation (friends table, are_friends() helper, accept_friend_request() RPC) and follows established patterns from the codebase.

The implementation is straightforward: one new TypeScript service file (`lib/friends.ts`), one new tab screen (`app/(app)/(tabs)/friends.tsx`), one optional card component (`components/friends/FriendCard.tsx`), and integration with the existing tab layout and profile screens. The database layer is complete from Phase 23 -- no new migrations needed.

**Primary recommendation:** Follow the established patterns exactly: lib service file like `memberNotes.ts`, tab screen like `groups.tsx`, card component like `MemberCard.tsx`, and navigation integration in the existing `_layout.tsx`. Reuse existing profile screens for viewing friend profiles.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.93.3 | Database queries via lib/supabase.ts | Already in use for all data operations |
| expo-router | 6.0.23 | Tab navigation and routing | Already powering all app navigation |
| react-native | 0.81.5 | Core UI components | Project foundation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| moti | 0.30.0 | Staggered list animations | FriendCard animations (matches MemberCard) |
| @expo/vector-icons | 15.0.3 | MaterialCommunityIcons for tab and UI | Tab icon, friend card icons |
| @shopify/flash-list | 2.2.1 | Performant list rendering | Friends list if >100 friends expected |
| expo-linear-gradient | 15.0.8 | Header gradient | Friends tab header (matches Groups pattern) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ScrollView + map | FlashList | FlashList better for large lists, ScrollView simpler for <50 items |
| Custom profile screen | Existing profile/[id].tsx | Reuse existing is simpler and consistent |
| Dedicated unfriend modal | Inline confirm | Modal is cleaner UX but more code |

**No new packages needed** -- all required libraries are already installed.

## Architecture Patterns

### Recommended Project Structure
```
lib/
  friends.ts                    # NEW: Friend CRUD operations

app/(app)/(tabs)/
  _layout.tsx                   # MODIFY: Add Friends tab
  friends.tsx                   # NEW: Friends tab screen

components/friends/
  FriendCard.tsx                # NEW: Friend list item component

types/
  database.types.ts             # MODIFY: Add friends table types
```

### Pattern 1: Service File Pattern
**What:** TypeScript module exporting async functions that wrap Supabase queries
**When to use:** All database operations (friends CRUD)
**Example:**
```typescript
// Source: Adapted from lib/memberNotes.ts pattern
import { supabase } from './supabase';
import { getAvatarUrl } from './storage';

export interface FriendWithProfile {
  id: string;
  friend_user_id: string;
  created_at: string;
  friend?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    birthday: string | null;
  };
}

/**
 * Get all friends for the current user
 *
 * Queries the friends table using bidirectional lookup
 * (current user can be either user_a_id or user_b_id)
 */
export async function getFriends(): Promise<FriendWithProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Query both directions since user can be user_a or user_b
  const { data: friendships, error } = await supabase
    .from('friends')
    .select('*')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch friends:', error);
    return [];
  }

  // Extract friend IDs (the OTHER user in each friendship)
  const friendIds = friendships.map(f =>
    f.user_a_id === user.id ? f.user_b_id : f.user_a_id
  );

  // Batch-fetch friend profiles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url, birthday')
    .in('id', friendIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  return friendships.map(f => {
    const friendUserId = f.user_a_id === user.id ? f.user_b_id : f.user_a_id;
    const profile = profileMap.get(friendUserId);
    return {
      id: f.id,
      friend_user_id: friendUserId,
      created_at: f.created_at,
      friend: profile ? {
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: getAvatarUrl(profile.avatar_url),
        birthday: profile.birthday,
      } : undefined,
    };
  });
}
```

### Pattern 2: Tab Screen Pattern
**What:** Screen component with gradient header, loading state, empty state, and list
**When to use:** Main tab screens (Friends tab)
**Example:**
```typescript
// Source: Adapted from app/(app)/(tabs)/groups.tsx pattern
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getFriends, FriendWithProfile } from '../../../lib/friends';
import FriendCard from '../../../components/friends/FriendCard';
import { colors, spacing } from '../../../constants/theme';

export default function FriendsScreen() {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFriends = async () => {
    const data = await getFriends();
    setFriends(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadFriends(); }, []);

  const handleFriendPress = (friendUserId: string) => {
    router.push(`/profile/${friendUserId}`);
  };

  // ... loading state, header, list rendering
}
```

### Pattern 3: Tab Layout Integration
**What:** Add new tab to Tabs layout with proper icon and positioning
**When to use:** Adding Friends tab
**Example:**
```typescript
// Source: app/(app)/(tabs)/_layout.tsx modification
<Tabs.Screen
  name="friends"
  options={{
    title: 'Friends',
    headerShown: false,
    tabBarIcon: ({ color, size }) => (
      <MaterialCommunityIcons name="account-heart" size={size} color={color} />
    ),
  }}
/>
```

### Pattern 4: Card Component Pattern
**What:** Touchable card with avatar, name, and secondary info
**When to use:** Friend list items
**Example:**
```typescript
// Source: Adapted from components/groups/MemberCard.tsx
interface FriendCardProps {
  friend: FriendWithProfile;
  onPress: () => void;
  onRemove?: () => void;
  index?: number;
}

export function FriendCard({ friend, onPress, onRemove, index = 0 }: FriendCardProps) {
  const profile = friend.friend;

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'spring', delay: 150 + index * 50 }}
    >
      <TouchableOpacity onPress={onPress} style={styles.card}>
        {/* Avatar */}
        {/* Name */}
        {/* Friend since date */}
        {/* Optional remove button */}
      </TouchableOpacity>
    </MotiView>
  );
}
```

### Anti-Patterns to Avoid
- **Raw SQL in components:** All database operations go through lib service files
- **Inline auth checks in components:** Services handle auth, components handle UI
- **Duplicating profile screen:** Reuse existing `/profile/[id].tsx` for friend profiles
- **Creating friendship rows directly:** Phase 23's accept_friend_request RPC handles creation atomically

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Avatar URL resolution | Manual bucket path building | `getAvatarUrl()` from lib/storage.ts | Already handles storage path conversion |
| Friend existence check | Raw EXISTS query | `are_friends()` RPC from Phase 23 | Handles ordered constraint automatically |
| Friendship deletion | Complex bi-directional check | Simple DELETE via RLS | RLS policy allows either party to delete |
| Profile viewing | New friend-specific profile screen | Existing `/profile/[id].tsx` | Consistent UX, less code |

**Key insight:** Phase 23 provided all the database infrastructure. This phase is purely TypeScript services and React Native UI -- no new SQL or RPC functions needed.

## Common Pitfalls

### Pitfall 1: Querying Only One Direction
**What goes wrong:** Query `WHERE user_a_id = currentUser` misses friendships where user is user_b_id
**Why it happens:** Forgetting the ordered bidirectional constraint
**How to avoid:** Always query both directions: `.or(\`user_a_id.eq.${userId},user_b_id.eq.${userId}\`)`
**Warning signs:** Friends list shows fewer friends than expected, some friends missing

### Pitfall 2: Wrong Friend ID Extraction
**What goes wrong:** Extracting user_a_id when current user IS user_a_id returns self instead of friend
**Why it happens:** Not checking which position current user occupies
**How to avoid:** Always use ternary: `f.user_a_id === user.id ? f.user_b_id : f.user_a_id`
**Warning signs:** Friend list shows current user's own profile

### Pitfall 3: Tab Position Not Matching Design
**What goes wrong:** Friends tab appears in wrong position (e.g., after Calendar)
**Why it happens:** Tab order is determined by position in _layout.tsx
**How to avoid:** Consult design/UX for proper tab ordering (typically: Wishlist, Friends, Groups, ...)
**Warning signs:** User confusion, tab not where expected

### Pitfall 4: Missing Avatar URL Conversion
**What goes wrong:** Avatar images fail to load, showing broken image placeholders
**Why it happens:** Using raw `avatar_url` from database instead of public URL
**How to avoid:** Always call `getAvatarUrl(profile.avatar_url)` before rendering
**Warning signs:** Console errors about image loading, missing avatars

### Pitfall 5: Not Handling Empty Friend List
**What goes wrong:** Blank screen with no guidance when user has no friends
**Why it happens:** Forgetting empty state component
**How to avoid:** Add empty state with friendly message and CTA to add friends
**Warning signs:** New users see blank Friends tab

## Code Examples

### Complete getFriends Service Function
```typescript
// Source: Following lib/memberNotes.ts and lib/claims.ts patterns
import { supabase } from './supabase';
import { getAvatarUrl } from './storage';

export interface FriendWithProfile {
  id: string;
  friend_user_id: string;
  created_at: string;
  friend?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    birthday: string | null;
  };
}

/**
 * Get all friends for the current user with profile info
 *
 * RLS automatically filters to friendships involving current user.
 * Returns friend profiles with avatar URLs converted for display.
 */
export async function getFriends(): Promise<FriendWithProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Query friendships where current user is either party
  const { data: friendships, error } = await supabase
    .from('friends')
    .select('id, user_a_id, user_b_id, created_at')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch friends:', error);
    return [];
  }

  if (!friendships || friendships.length === 0) return [];

  // Extract the OTHER user's ID from each friendship
  const friendIds = friendships.map(f =>
    f.user_a_id === user.id ? f.user_b_id : f.user_a_id
  );

  // Batch-fetch friend profiles (efficient single query)
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url, birthday')
    .in('id', friendIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  return friendships.map(f => {
    const friendUserId = f.user_a_id === user.id ? f.user_b_id : f.user_a_id;
    const profile = profileMap.get(friendUserId);
    return {
      id: f.id,
      friend_user_id: friendUserId,
      created_at: f.created_at,
      friend: profile ? {
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: getAvatarUrl(profile.avatar_url),
        birthday: profile.birthday,
      } : undefined,
    };
  });
}
```

### Remove Friend Function
```typescript
// Source: Following lib/memberNotes.ts deleteNote pattern
/**
 * Remove a friend (unfriend)
 *
 * RLS policy "Users can unfriend" allows either party to delete.
 * Just delete the row -- no need to check which position user is in.
 *
 * @param friendshipId - UUID of the friends row (not the friend's user ID)
 */
export async function removeFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('id', friendshipId);

  if (error) {
    console.error('Failed to remove friend:', error);
    throw new Error(`Failed to remove friend: ${error.message}`);
  }
}
```

### Tab Layout Addition
```typescript
// Source: app/(app)/(tabs)/_layout.tsx
// Add after Groups tab, before Celebrations
<Tabs.Screen
  name="friends"
  options={{
    title: 'Friends',
    headerShown: false, // Friends has its own custom header
    tabBarIcon: ({ color, size }) => (
      <MaterialCommunityIcons name="account-heart" size={size} color={color} />
    ),
  }}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate friend list and profile screens | Reuse existing profile/[id].tsx | Project inception | Consistent UX, less code |
| FlatList for all lists | ScrollView for small, FlashList for large | v1.0 | Performance optimization |
| useEffect for data loading | Simple async in useEffect | Project pattern | Keeps logic straightforward |

**Project-specific patterns established:**
- Service files in `lib/` with TSDoc comments documenting RLS patterns
- Tab screens with gradient headers matching Groups/Celebrations
- Card components with moti animations and staggered delays
- Profile reuse via `/profile/[id]` or `/member/[id]` routes

## Open Questions

1. **Tab Position**
   - What we know: Current tabs are Wishlist, Groups, Celebrations, Calendar
   - What's unclear: Where should Friends tab be positioned?
   - Recommendation: Position between Wishlist and Groups (index 1) for prominence, or after Groups (index 2) if groups are more central. Ask user or check design if available.

2. **Friend Card Information**
   - What we know: Must show profile photo, name, basic info
   - What's unclear: Should birthday be shown? "Friends since" date? Birthday countdown?
   - Recommendation: Show avatar, name, and "Friends since [date]" initially. Birthday is visible when tapping to view profile.

3. **Remove Friend UX**
   - What we know: User can remove an existing friend
   - What's unclear: Inline swipe action, three-dot menu, or dedicated button?
   - Recommendation: Three-dot menu with "Remove Friend" option, matching iOS/Android conventions. Confirm via Alert.alert() before deletion.

## Sources

### Primary (HIGH confidence)
- Existing migration `20260210000001_v1.4_friends_system_foundation.sql` - Complete friends table, RLS policies, are_friends() helper
- Existing service `lib/memberNotes.ts` - Service file pattern with TSDoc comments
- Existing service `lib/claims.ts` - RPC calling pattern, interface definitions
- Existing tab `app/(app)/(tabs)/groups.tsx` - Complete tab screen pattern with gradient header, loading, empty state
- Existing component `components/groups/MemberCard.tsx` - Card component pattern with moti animations
- Existing layout `app/(app)/(tabs)/_layout.tsx` - Tab configuration pattern

### Secondary (MEDIUM confidence)
- Phase 23 RESEARCH.md - Database design rationale, RLS patterns documentation
- Existing utils `utils/groups.ts` - Service function patterns with error handling

### Tertiary (LOW confidence, validate during implementation)
- Tab positioning decision needs UX input or design reference
- Friend card exact layout needs visual design reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all libraries already in use
- Architecture: HIGH - Patterns proven throughout codebase (groups, claims, notes)
- Pitfalls: HIGH - Clear understanding of bidirectional query requirements

**Research date:** 2026-02-09
**Valid until:** 90 days (stable React Native patterns, no external API dependencies)
