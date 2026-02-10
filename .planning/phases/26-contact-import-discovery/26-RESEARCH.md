# Phase 26: Contact Import & Discovery - Research

**Researched:** 2026-02-10
**Domain:** Contact import, phone number normalization, user discovery, iOS/Android permissions
**Confidence:** HIGH

## Summary

Phase 26 implements contact import and user discovery to help users find friends who already use the app. This builds on Phase 23's database foundation (users.phone column in E.164 format, unique index) and Phase 24/25's friends system (Friends tab, friend request flow, relationship status checking).

The implementation requires four key components:

1. **Contact Access** -- Use `expo-contacts` to read device contacts with phone numbers. Handle iOS 18's new limited access mode via `accessPrivileges` property, and standard Android permission flow.

2. **Phone Number Normalization** -- Normalize all phone numbers to E.164 format using `libphonenumber-js`. This is the format stored in `users.phone` column. Critical for cross-platform matching (same number formatted differently on iOS vs Android must match).

3. **Contact Matching** -- Send normalized phone numbers to Supabase, match against `users.phone` column, return matched users with their relationship status (none/pending/friends).

4. **User Search** -- Implement name/email search using PostgreSQL ILIKE for fuzzy matching. This supplements contact import for users without phone numbers or whose contacts aren't imported.

The database schema is already complete from Phase 23 (`users.phone` column with unique index, E.164 format documented). The Friends tab from Phase 24 provides the UI home for the "Find Friends" feature (FTAB-04 requirement).

**Primary recommendation:** Use `expo-contacts` for contact access, `libphonenumber-js/mobile` bundle for E.164 normalization, and a new Supabase RPC for batch phone matching. Add "Find Friends" button to Friends tab header that navigates to a new discovery screen.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-contacts | 15.0.11 | Device contact access | Expo SDK library, managed workflow compatible |
| libphonenumber-js | 1.11.x | E.164 phone normalization | Google's libphonenumber port, smaller bundle, TypeScript native |
| @supabase/supabase-js | 2.93.3 | Database queries, RPC calls | Already in use for all data operations |
| expo-router | 6.0.23 | Navigation to discovery screen | Already powering all app navigation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| moti | 0.30.0 | Contact card animations | Matched contact cards (matches FriendCard pattern) |
| @expo/vector-icons | 15.0.3 | Icons for UI elements | Contact icons, status indicators |
| expo-linear-gradient | 15.0.8 | Header gradient | Discovery screen header (matches Friends tab) |
| @shopify/flash-list | 2.2.1 | Performant contact list | If >100 matched contacts expected |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| libphonenumber-js | google-libphonenumber | google-libphonenumber is 550KB vs 95KB for mobile bundle |
| expo-contacts | react-native-contacts | expo-contacts is Expo-native, no ejection needed |
| Client-side phone matching | Server-side Edge Function | Client-side simpler, Edge Function adds latency |
| presentContactPickerAsync | Full contact import | Picker is single-select, import enables batch matching |

**Installation:**
```bash
npx expo install expo-contacts
npm install libphonenumber-js
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
  contacts.ts                     # NEW: Contact import and phone normalization
  discovery.ts                    # NEW: User discovery (search, matching)

app/(app)/
  discover.tsx                    # NEW: Find friends screen

components/discovery/
  MatchedContactCard.tsx          # NEW: Matched contact with relationship status

supabase/migrations/
  20260212000001_contact_matching.sql  # NEW: match_phones RPC function
```

### Pattern 1: Contact Permission with iOS 18 Limited Access
**What:** Handle contact permissions including iOS 18's new limited access mode
**When to use:** Before attempting to read contacts
**Example:**
```typescript
// Source: expo-contacts official docs + iOS 18 accessPrivileges
import * as Contacts from 'expo-contacts';

interface ContactPermissionResult {
  granted: boolean;
  accessLevel: 'all' | 'limited' | 'none';
}

/**
 * Request contact permission and determine access level
 *
 * iOS 18+ introduces limited access where user selects specific contacts.
 * accessPrivileges: 'all' | 'limited' | 'none'
 */
export async function requestContactPermission(): Promise<ContactPermissionResult> {
  const { status, accessPrivileges } = await Contacts.requestPermissionsAsync();

  if (status !== 'granted') {
    return { granted: false, accessLevel: 'none' };
  }

  // accessPrivileges is only present on iOS 18+
  // Default to 'all' if not present (older iOS or Android)
  const accessLevel = accessPrivileges ?? 'all';

  return { granted: true, accessLevel };
}

/**
 * Check current contact permission status
 */
export async function checkContactPermission(): Promise<ContactPermissionResult> {
  const { status, accessPrivileges } = await Contacts.getPermissionsAsync();

  if (status !== 'granted') {
    return { granted: false, accessLevel: 'none' };
  }

  return { granted: true, accessLevel: accessPrivileges ?? 'all' };
}
```

### Pattern 2: Fetch Contacts with Phone Numbers
**What:** Retrieve all contacts with phone number data
**When to use:** After permission granted, for contact matching
**Example:**
```typescript
// Source: expo-contacts getContactsAsync documentation

interface ImportedContact {
  id: string;
  name: string;
  phoneNumbers: string[];
  image?: string;
}

/**
 * Fetch all contacts with phone numbers
 *
 * Returns normalized contact data ready for phone matching.
 * Filters out contacts without phone numbers.
 */
export async function getContactsWithPhones(): Promise<ImportedContact[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Name,
      Contacts.Fields.Image,
    ],
  });

  // Filter to contacts with at least one phone number
  return data
    .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
    .map(contact => ({
      id: contact.id,
      name: contact.name || 'Unknown',
      phoneNumbers: contact.phoneNumbers!.map(p => p.number ?? p.digits ?? '').filter(Boolean),
      image: contact.image?.uri,
    }));
}
```

### Pattern 3: Phone Number Normalization to E.164
**What:** Normalize phone numbers to E.164 format for matching
**When to use:** Before sending phone numbers to server for matching
**Example:**
```typescript
// Source: libphonenumber-js documentation

import parsePhoneNumber from 'libphonenumber-js/mobile';
import type { CountryCode } from 'libphonenumber-js/types';

/**
 * Normalize a phone number to E.164 format
 *
 * E.164 format: +[country code][number] (e.g., +14155551234)
 * Returns null if number cannot be parsed or is invalid.
 *
 * @param phoneNumber - Raw phone number from contacts
 * @param defaultCountry - ISO 3166-1 alpha-2 country code (e.g., 'US')
 */
export function normalizeToE164(
  phoneNumber: string,
  defaultCountry: CountryCode = 'US'
): string | null {
  try {
    // parsePhoneNumber handles various formats:
    // - (555) 123-4567
    // - 555.123.4567
    // - +1 555 123 4567
    // - 5551234567
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);

    if (!parsed || !parsed.isValid()) {
      return null;
    }

    // .number property returns E.164 format
    return parsed.number;
  } catch (error) {
    return null;
  }
}

/**
 * Normalize all phone numbers from a contact
 *
 * Returns array of unique E.164 numbers.
 * Filters out invalid/unparseable numbers.
 */
export function normalizeContactPhones(
  phoneNumbers: string[],
  defaultCountry: CountryCode = 'US'
): string[] {
  const normalized = phoneNumbers
    .map(phone => normalizeToE164(phone, defaultCountry))
    .filter((phone): phone is string => phone !== null);

  // Remove duplicates (same number formatted differently)
  return [...new Set(normalized)];
}
```

### Pattern 4: Batch Phone Matching RPC
**What:** Supabase RPC function to match phone numbers against users
**When to use:** After normalizing contact phone numbers
**Example:**
```sql
-- Source: Following existing RPC patterns (accept_friend_request)

/**
 * Match phone numbers against registered users
 *
 * Returns users who have matching phone numbers, excluding:
 * - The requesting user themselves
 * - Users who have blocked or been blocked by the requester
 *
 * Security: SECURITY DEFINER to access users.phone column
 * Performance: Uses the idx_users_phone index
 */
CREATE OR REPLACE FUNCTION public.match_phones(p_phone_numbers TEXT[])
RETURNS TABLE (
  user_id UUID,
  phone TEXT,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.phone,
    u.full_name AS display_name,
    u.avatar_url
  FROM public.users u
  WHERE u.phone = ANY(p_phone_numbers)
    AND u.id != v_user_id
    -- Exclude blocked users (in either direction)
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'blocked'
        AND (
          (fr.from_user_id = v_user_id AND fr.to_user_id = u.id)
          OR (fr.to_user_id = v_user_id AND fr.from_user_id = u.id)
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_phones(TEXT[]) TO authenticated;
```

### Pattern 5: User Search by Name/Email
**What:** Search for users by name or email using ILIKE
**When to use:** User types in search box on discovery screen
**Example:**
```sql
-- Source: Standard PostgreSQL pattern search

/**
 * Search users by name or email
 *
 * Uses ILIKE for case-insensitive partial matching.
 * Excludes blocked users and self.
 * Returns up to 20 results for performance.
 */
CREATE OR REPLACE FUNCTION public.search_users(p_query TEXT)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_search_pattern TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Escape special ILIKE characters and add wildcards
  v_search_pattern := '%' ||
    regexp_replace(p_query, '([%_\\])', '\\\1', 'g') ||
    '%';

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.full_name AS display_name,
    u.email,
    u.avatar_url
  FROM public.users u
  WHERE u.id != v_user_id
    AND (
      u.full_name ILIKE v_search_pattern
      OR u.email ILIKE v_search_pattern
    )
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'blocked'
        AND (
          (fr.from_user_id = v_user_id AND fr.to_user_id = u.id)
          OR (fr.to_user_id = v_user_id AND fr.from_user_id = u.id)
        )
    )
  ORDER BY
    -- Prioritize exact name match, then starts-with, then contains
    CASE WHEN lower(u.full_name) = lower(p_query) THEN 0
         WHEN lower(u.full_name) LIKE lower(p_query) || '%' THEN 1
         ELSE 2
    END,
    u.full_name
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_users(TEXT) TO authenticated;
```

### Pattern 6: Discovery Screen with Matched Contacts
**What:** Screen showing matched contacts with relationship status
**When to use:** User taps "Find Friends" in Friends tab
**Example:**
```typescript
// Source: Following app/(app)/(tabs)/friends.tsx pattern

interface MatchedContact {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  contactName: string; // Name from device contacts
  relationshipStatus: 'none' | 'pending_incoming' | 'pending_outgoing' | 'friends';
}

export default function DiscoverScreen() {
  const [contacts, setContacts] = useState<MatchedContact[]>([]);
  const [searchResults, setSearchResults] = useState<MatchedContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessLevel, setAccessLevel] = useState<'all' | 'limited' | 'none'>('none');

  // Load matched contacts on mount
  useEffect(() => {
    loadMatchedContacts();
  }, []);

  const loadMatchedContacts = async () => {
    const permission = await checkContactPermission();
    setAccessLevel(permission.accessLevel);

    if (!permission.granted) {
      setLoading(false);
      return;
    }

    const deviceContacts = await getContactsWithPhones();
    // ... normalize phones and match against server
  };

  // Show permission request UI if not granted
  if (!loading && accessLevel === 'none') {
    return <PermissionRequestView onRequest={handleRequestPermission} />;
  }

  // Show limited access info if applicable
  if (accessLevel === 'limited') {
    // Show banner explaining user can grant access to more contacts
  }

  // ... render matched contacts and search results
}
```

### Pattern 7: Add Friend Button with Relationship Status
**What:** Button that adapts based on relationship status
**When to use:** On matched contact cards
**Example:**
```typescript
// Source: Following components/friends/FriendCard.tsx pattern

interface FriendButtonProps {
  userId: string;
  status: 'none' | 'pending_incoming' | 'pending_outgoing' | 'friends';
  onStatusChange: () => void;
}

function FriendButton({ userId, status, onStatusChange }: FriendButtonProps) {
  const handlePress = async () => {
    switch (status) {
      case 'none':
        await sendFriendRequest(userId);
        onStatusChange();
        break;
      case 'pending_incoming':
        // Could show accept/decline options
        break;
      case 'pending_outgoing':
        // Already sent, button disabled or shows "Pending"
        break;
      case 'friends':
        // Already friends, button shows "Friends"
        break;
    }
  };

  // Render button based on status
  if (status === 'none') {
    return <TouchableOpacity onPress={handlePress}><Text>Add Friend</Text></TouchableOpacity>;
  }
  if (status === 'pending_outgoing') {
    return <View style={styles.pending}><Text>Request Sent</Text></View>;
  }
  if (status === 'pending_incoming') {
    return <View style={styles.pending}><Text>Respond to Request</Text></View>;
  }
  if (status === 'friends') {
    return <View style={styles.friends}><MaterialCommunityIcons name="check" /><Text>Friends</Text></View>;
  }
}
```

### Anti-Patterns to Avoid
- **Storing raw phone numbers:** Always normalize to E.164 before storage or matching
- **Client-side phone storage:** Don't store contact phone numbers on client beyond the session
- **Single batch of 1000+ phones:** Batch in chunks of ~100 for API limits and performance
- **Missing country code:** Always provide default country when parsing numbers
- **Ignoring limited access:** Always check and handle iOS 18 limited access mode

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone number parsing | Regex-based parser | libphonenumber-js | International formats, edge cases, validation |
| E.164 normalization | String manipulation | libphonenumber-js | Country codes, formatting rules |
| Contact access | Native modules | expo-contacts | Managed workflow, permissions handled |
| Permission dialogs | Custom modal | System permission flow | Platform conventions, App Store compliance |

**Key insight:** Phone number normalization is deceptively complex. International formats, country codes, and edge cases make regex approaches fragile. Use the battle-tested library.

## Common Pitfalls

### Pitfall 1: Phone Number Format Mismatch
**What goes wrong:** Contacts imported on iOS don't match same number imported on Android
**Why it happens:** Different devices format numbers differently ((555) 123-4567 vs 5551234567)
**How to avoid:** Always normalize to E.164 before matching. E.164 is unambiguous.
**Warning signs:** Low match rates, users complaining their friends aren't found

### Pitfall 2: iOS 18 Limited Access Not Handled
**What goes wrong:** App shows "0 contacts found" even though user granted permission
**Why it happens:** iOS 18 limited access returns only user-selected contacts
**How to avoid:** Check `accessPrivileges` property, show UI to expand access via `presentAccessPickerAsync()`
**Warning signs:** iOS 18 users have dramatically lower match rates than older iOS

### Pitfall 3: Contact Permission Denied Forever
**What goes wrong:** User denies permission, no way to recover
**Why it happens:** Once denied, app must guide user to Settings
**How to avoid:** Show clear explanation before requesting, provide "Open Settings" button if denied
**Warning signs:** Users stuck on permission screen with no path forward

### Pitfall 4: Large Contact Lists Cause Timeout
**What goes wrong:** API call times out for users with 1000+ contacts
**Why it happens:** Sending too many phone numbers in one batch
**How to avoid:** Batch phone numbers in chunks of ~100, show progress indicator
**Warning signs:** Timeout errors in production for specific users

### Pitfall 5: Country Code Detection Wrong
**What goes wrong:** Numbers parsed with wrong country code, no matches
**Why it happens:** User's device locale doesn't match contact's country
**How to avoid:** Detect country from device locale, allow user to change default country
**Warning signs:** International users getting zero matches

### Pitfall 6: Missing Phone in users Table
**What goes wrong:** User has phone in their contacts but no match
**Why it happens:** The matched user never added their phone number to their profile
**How to avoid:** Encourage users to add phone number during onboarding/profile setup
**Warning signs:** Low overall match rates across all users

### Pitfall 7: Search Returns Self
**What goes wrong:** User searches their own name and sees themselves
**Why it happens:** Forgot to exclude current user from search results
**How to avoid:** Always filter out `auth.uid()` in search query
**Warning signs:** User profile appears in their own search results

### Pitfall 8: Blocked Users Appear in Results
**What goes wrong:** User sees someone they blocked in contact matches
**Why it happens:** Forgot to check friend_requests.status = 'blocked'
**How to avoid:** Exclude blocked users (both directions) in match and search queries
**Warning signs:** Blocked users appearing in discovery results

## Code Examples

### Complete Contact Import Flow
```typescript
// lib/contacts.ts
import * as Contacts from 'expo-contacts';
import parsePhoneNumber from 'libphonenumber-js/mobile';
import type { CountryCode } from 'libphonenumber-js/types';
import { supabase } from './supabase';
import { getRelationshipStatus } from './friends';
import { getAvatarUrl } from './storage';

// ============================================
// Types
// ============================================

export interface ContactPermissionResult {
  granted: boolean;
  accessLevel: 'all' | 'limited' | 'none';
}

export interface ImportedContact {
  id: string;
  name: string;
  phoneNumbers: string[];
  image?: string;
}

export interface MatchedUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  contactName: string;
  matchedPhone: string;
  relationshipStatus: 'none' | 'pending_incoming' | 'pending_outgoing' | 'friends';
}

// ============================================
// Permission Handling
// ============================================

export async function checkContactPermission(): Promise<ContactPermissionResult> {
  const { status, accessPrivileges } = await Contacts.getPermissionsAsync();

  if (status !== 'granted') {
    return { granted: false, accessLevel: 'none' };
  }

  return { granted: true, accessLevel: accessPrivileges ?? 'all' };
}

export async function requestContactPermission(): Promise<ContactPermissionResult> {
  const { status, accessPrivileges } = await Contacts.requestPermissionsAsync();

  if (status !== 'granted') {
    return { granted: false, accessLevel: 'none' };
  }

  return { granted: true, accessLevel: accessPrivileges ?? 'all' };
}

/**
 * Open iOS 18+ contact access picker to grant access to more contacts
 * Only works on iOS 18+, no-op on Android/older iOS
 */
export async function expandContactAccess(): Promise<string[]> {
  try {
    const newlyGrantedIds = await Contacts.presentAccessPickerAsync();
    return newlyGrantedIds;
  } catch (error) {
    // Not supported on this platform/version
    return [];
  }
}

// ============================================
// Phone Number Normalization
// ============================================

export function normalizeToE164(
  phoneNumber: string,
  defaultCountry: CountryCode = 'US'
): string | null {
  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);
    if (!parsed || !parsed.isValid()) {
      return null;
    }
    return parsed.number;
  } catch (error) {
    return null;
  }
}

export function normalizeContactPhones(
  phoneNumbers: string[],
  defaultCountry: CountryCode = 'US'
): string[] {
  const normalized = phoneNumbers
    .map(phone => normalizeToE164(phone, defaultCountry))
    .filter((phone): phone is string => phone !== null);

  return [...new Set(normalized)];
}

// ============================================
// Contact Fetching
// ============================================

export async function getContactsWithPhones(): Promise<ImportedContact[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Name,
      Contacts.Fields.Image,
    ],
  });

  return data
    .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
    .map(contact => ({
      id: contact.id,
      name: contact.name || 'Unknown',
      phoneNumbers: contact.phoneNumbers!
        .map(p => p.number ?? p.digits ?? '')
        .filter(Boolean),
      image: contact.image?.uri,
    }));
}

// ============================================
// Contact Matching
// ============================================

/**
 * Match device contacts against registered users
 *
 * 1. Fetches contacts from device
 * 2. Normalizes phone numbers to E.164
 * 3. Sends to server for matching
 * 4. Enriches results with relationship status
 */
export async function matchContacts(
  defaultCountry: CountryCode = 'US'
): Promise<MatchedUser[]> {
  // Get contacts from device
  const contacts = await getContactsWithPhones();

  if (contacts.length === 0) {
    return [];
  }

  // Build phone -> contact name mapping
  const phoneToContact: Map<string, string> = new Map();
  const allNormalizedPhones: string[] = [];

  for (const contact of contacts) {
    const normalized = normalizeContactPhones(contact.phoneNumbers, defaultCountry);
    for (const phone of normalized) {
      phoneToContact.set(phone, contact.name);
      allNormalizedPhones.push(phone);
    }
  }

  if (allNormalizedPhones.length === 0) {
    return [];
  }

  // Batch in chunks of 100 for API performance
  const BATCH_SIZE = 100;
  const matchedUsers: MatchedUser[] = [];

  for (let i = 0; i < allNormalizedPhones.length; i += BATCH_SIZE) {
    const batch = allNormalizedPhones.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase.rpc('match_phones', {
      p_phone_numbers: batch,
    });

    if (error) {
      console.error('Phone matching failed:', error);
      continue;
    }

    // Enrich with relationship status
    for (const match of data || []) {
      const relationshipStatus = await getRelationshipStatus(match.user_id);

      matchedUsers.push({
        userId: match.user_id,
        displayName: match.display_name,
        avatarUrl: getAvatarUrl(match.avatar_url),
        contactName: phoneToContact.get(match.phone) || 'Unknown',
        matchedPhone: match.phone,
        relationshipStatus,
      });
    }
  }

  return matchedUsers;
}
```

### Complete User Search Service
```typescript
// lib/discovery.ts
import { supabase } from './supabase';
import { getRelationshipStatus } from './friends';
import { getAvatarUrl } from './storage';

export interface SearchResult {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  relationshipStatus: 'none' | 'pending_incoming' | 'pending_outgoing' | 'friends';
}

/**
 * Search for users by name or email
 *
 * Uses ILIKE for fuzzy matching.
 * Excludes self and blocked users.
 */
export async function searchUsers(query: string): Promise<SearchResult[]> {
  if (query.length < 2) {
    return [];
  }

  const { data, error } = await supabase.rpc('search_users', {
    p_query: query,
  });

  if (error) {
    console.error('User search failed:', error);
    return [];
  }

  // Enrich with relationship status
  const results: SearchResult[] = [];

  for (const user of data || []) {
    const relationshipStatus = await getRelationshipStatus(user.user_id);

    results.push({
      userId: user.user_id,
      displayName: user.display_name,
      email: user.email,
      avatarUrl: getAvatarUrl(user.avatar_url),
      relationshipStatus,
    });
  }

  return results;
}
```

### Complete Migration for RPC Functions
```sql
-- Phase 26: Contact Matching RPC Functions
-- Enables phone number matching and user search

-- ============================================
-- PART 1: match_phones function
-- ============================================

CREATE OR REPLACE FUNCTION public.match_phones(p_phone_numbers TEXT[])
RETURNS TABLE (
  user_id UUID,
  phone TEXT,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.phone,
    u.full_name AS display_name,
    u.avatar_url
  FROM public.users u
  WHERE u.phone = ANY(p_phone_numbers)
    AND u.id != v_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'blocked'
        AND (
          (fr.from_user_id = v_user_id AND fr.to_user_id = u.id)
          OR (fr.to_user_id = v_user_id AND fr.from_user_id = u.id)
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_phones(TEXT[]) TO authenticated;

COMMENT ON FUNCTION public.match_phones IS
  'Match phone numbers against registered users. Returns user info for matching phones, excluding self and blocked users. Phone numbers must be E.164 format.';

-- ============================================
-- PART 2: search_users function
-- ============================================

CREATE OR REPLACE FUNCTION public.search_users(p_query TEXT)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_search_pattern TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Escape special ILIKE characters and add wildcards
  v_search_pattern := '%' ||
    regexp_replace(p_query, '([%_\\])', '\\\1', 'g') ||
    '%';

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.full_name AS display_name,
    u.email,
    u.avatar_url
  FROM public.users u
  WHERE u.id != v_user_id
    AND (
      u.full_name ILIKE v_search_pattern
      OR u.email ILIKE v_search_pattern
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'blocked'
        AND (
          (fr.from_user_id = v_user_id AND fr.to_user_id = u.id)
          OR (fr.to_user_id = v_user_id AND fr.from_user_id = u.id)
        )
    )
  ORDER BY
    CASE WHEN lower(u.full_name) = lower(p_query) THEN 0
         WHEN lower(u.full_name) LIKE lower(p_query) || '%' THEN 1
         ELSE 2
    END,
    u.full_name
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_users(TEXT) TO authenticated;

COMMENT ON FUNCTION public.search_users IS
  'Search users by name or email using ILIKE. Returns up to 20 results, excluding self and blocked users. Results prioritized by match quality.';

-- ============================================
-- PART 3: Completion notice
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Phase 26 RPC functions created successfully!';
  RAISE NOTICE 'Functions: match_phones(TEXT[]), search_users(TEXT)';
  RAISE NOTICE 'Permissions: GRANT EXECUTE to authenticated role';
END $$;
```

### app.json Plugin Configuration
```json
{
  "expo": {
    "plugins": [
      [
        "expo-contacts",
        {
          "contactsPermission": "Allow Wishlist to find friends who already use the app"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSContactsUsageDescription": "Allow Wishlist to find friends who already use the app"
      }
    },
    "android": {
      "permissions": [
        "android.permission.READ_CONTACTS"
      ]
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CNAuthorizationStatus.authorized | accessPrivileges: 'all' / 'limited' | iOS 18 (2024) | Must handle limited access mode |
| google-libphonenumber (550KB) | libphonenumber-js/mobile (95KB) | Ongoing | Smaller bundle, same accuracy |
| Individual phone queries | Batch phone matching | Standard practice | Better performance |

**iOS 18 Limited Access (NEW):**
- iOS 18 introduced `CNAuthorizationStatusLimited` for contacts
- User can grant access to specific contacts only
- `accessPrivileges` property indicates 'all', 'limited', or 'none'
- Use `presentAccessPickerAsync()` to prompt user to expand access

**Expo SDK 54 (Current):**
- `expo-contacts` 15.0.11 includes accessPrivileges support
- ContactsPermissionResponse type includes accessPrivileges field

## Open Questions

1. **Default Country Detection**
   - What we know: libphonenumber needs a default country for local numbers
   - What's unclear: How to reliably detect user's country?
   - Recommendation: Use device locale (Expo Localization), allow manual override in settings

2. **Phone Number in Profile**
   - What we know: users.phone column exists but app doesn't prompt for it
   - What's unclear: When should users be prompted to add their phone?
   - Recommendation: Add optional phone field to profile editing, encourage during onboarding

3. **Contact Sync Frequency**
   - What we know: Contacts change over time
   - What's unclear: Should we re-sync automatically or only on user action?
   - Recommendation: Re-sync on pull-to-refresh in discover screen, cache results for 1 hour

4. **Privacy Disclosure**
   - What we know: App Store requires disclosure for contact access
   - What's unclear: Exact privacy policy wording needed
   - Recommendation: Add privacy notice before contact import explaining data usage

## Sources

### Primary (HIGH confidence)
- [Expo Contacts Documentation](https://docs.expo.dev/versions/latest/sdk/contacts/) - API reference, iOS 18 accessPrivileges
- [Expo PR #35772](https://github.com/expo/expo/pull/35772) - iOS 18 limited access implementation
- [libphonenumber-js GitHub](https://github.com/catamphetamine/libphonenumber-js) - E.164 parsing, bundle sizes
- Existing migration `20260210000001_v1.4_friends_system_foundation.sql` - users.phone column, E.164 format
- Existing service `lib/friends.ts` - getRelationshipStatus pattern

### Secondary (MEDIUM confidence)
- [react-native-permissions Issue #894](https://github.com/zoontek/react-native-permissions/issues/894) - iOS 18 limited access discussion
- [Supabase RPC Documentation](https://supabase.com/docs/reference/javascript/rpc) - RPC function patterns

### Tertiary (LOW confidence)
- Default country detection strategy needs validation
- Contact sync frequency recommendation is based on general UX patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - expo-contacts is Expo native, libphonenumber-js is well-documented
- Architecture: HIGH - Patterns follow existing codebase (friends service, RPC functions)
- Pitfalls: HIGH - iOS 18 limited access is well-documented, phone normalization is understood

**Research date:** 2026-02-10
**Valid until:** 60 days (stable Expo SDK, iOS 18 patterns established)
