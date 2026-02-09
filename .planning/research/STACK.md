# Stack Research: v1.4 Friends System

**Researched:** 2026-02-09
**Overall confidence:** HIGH

## Summary

**One new npm dependency required: `expo-contacts@~15.0.11`** for device phonebook access. All other capabilities (friend relationships, public dates, calendar integration) are implementable with the existing stack. The primary work is database schema additions (friends table with bidirectional request/accept pattern), new RLS policies following proven patterns, and integration with existing calendar sync utilities.

Key finding: The project already has the permission handling pattern established via `expo-calendar` and `expo-notifications`. The `expo-contacts` integration follows the exact same pattern. The friend relationship database design uses a single-table approach with status field (simpler than dual-table approaches) that maps well to Supabase RLS policies.

---

## Required Additions

### New Dependencies

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `expo-contacts` | `~15.0.11` | Device phonebook access | Only Expo SDK library for contacts; managed workflow compatible; SDK 54 aligned |

### Installation

```bash
npx expo install expo-contacts
```

This automatically installs the SDK 54-compatible version (~15.0.11).

### Existing Stack Reuse

| Capability Needed | Existing Solution | Confidence |
|-------------------|-------------------|------------|
| Friend relationship storage | New `friends` table + Supabase RLS (pattern from `group_members`) | HIGH |
| Friend request workflow | Status field approach (pattern from `gift_claims.status`) | HIGH |
| Public dates storage | New `public_dates` table + Supabase queries | HIGH |
| Calendar sync for friend dates | `utils/deviceCalendar.ts` + `expo-calendar@~15.0.8` already installed | HIGH |
| Permission request flow | Pattern from `lib/notifications.ts` lines 44-56 | HIGH |
| Friend suggestions based on contacts | Phone number matching via Supabase query | HIGH |
| Friend suggestions based on groups | Existing `group_members` table + join query | HIGH |
| Friends list UI | `@shopify/flash-list` + existing member card patterns | HIGH |
| Request/Accept UI | Gluestack UI components (already installed) | HIGH |

---

## expo-contacts Integration

### API Methods Required

| Method | Purpose | When Used |
|--------|---------|-----------|
| `Contacts.requestPermissionsAsync()` | Request access to device contacts | On first contact import attempt |
| `Contacts.getPermissionsAsync()` | Check current permission status | Before showing import UI |
| `Contacts.getContactsAsync()` | Fetch contacts with phone numbers | After permission granted |
| `Contacts.Fields.PhoneNumbers` | Specify we only need phone numbers | Minimize data fetched |

### Permission Configuration

**app.json additions:**

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      ["expo-notifications", { ... }],
      "expo-calendar",
      [
        "expo-contacts",
        {
          "contactsPermission": "Allow Wishlist to find friends from your contacts who already use the app."
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSContactsUsageDescription": "Allow Wishlist to find friends from your contacts who already use the app."
      }
    },
    "android": {
      "permissions": [
        "android.permission.READ_CALENDAR",
        "android.permission.WRITE_CALENDAR",
        "android.permission.READ_CONTACTS"
      ]
    }
  }
}
```

**Critical Note on iOS Permission String:**
Apple has rejected apps with generic permission messages like "Allow $(PRODUCT_NAME) to access your contacts." The message MUST explain the specific purpose. The string above explicitly states "find friends...who already use the app" which matches the actual feature and should pass App Store review.

### iOS 18 Limited Access Handling

iOS 18 introduced granular contact permissions where users can grant access to only some contacts. The `expo-contacts` SDK 54 version (~15.0.11) supports this via the `accessPrivileges` property in the permission response:

```typescript
const { status, accessPrivileges } = await Contacts.getPermissionsAsync();

// status: 'granted' | 'denied' | 'undetermined'
// accessPrivileges: 'all' | 'limited' | 'none' (iOS 18+)

if (status === 'granted' && accessPrivileges === 'limited') {
  // User granted access to only some contacts
  // Show UI explaining they can add more contacts via system settings
}
```

**Recommendation:** Handle `limited` gracefully by:
1. Proceeding with the contacts the user shared
2. Showing a subtle hint that they can share more contacts if desired
3. NOT repeatedly prompting for more access (bad UX, potential rejection)

### Android Permissions

The config plugin automatically adds `READ_CONTACTS` permission to AndroidManifest.xml. No manual manifest editing required in managed workflow.

**Note:** `WRITE_CONTACTS` is NOT needed for this feature (we only read contacts to find friends, never write).

---

## Database Schema Pattern

### Friend Relationship Approach

**Recommended: Single Table with Status Field**

This approach uses one row per friend request/relationship with a status that progresses from `pending` to `accepted` (or `declined`). Simpler than dual-table approaches and maps well to RLS.

```sql
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate requests in either direction
  CONSTRAINT unique_friend_pair UNIQUE (requester_id, addressee_id),
  -- Prevent self-friending
  CONSTRAINT no_self_friend CHECK (requester_id != addressee_id)
);
```

**Why single-table over dual-table:**
- Simpler queries: One table to query for both pending requests and confirmed friends
- Atomic status transitions: `UPDATE...SET status = 'accepted'` vs multi-table transaction
- RLS is simpler: One set of policies instead of coordinating two tables
- Matches existing patterns: `gift_claims.status` progression is the same concept

### Public Dates Schema

```sql
CREATE TABLE public.public_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT true,  -- Annual recurrence like birthdays
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Why separate table from birthdays:**
- Birthdays are on `users` table (one per user, required)
- Public dates are many-per-user, optional, user-defined
- Different RLS: Birthday visible to group members; public dates visible to friends

### Contact Matching Schema

For efficient contact-to-user matching, store normalized phone numbers:

```sql
-- Add to users table or create separate table
ALTER TABLE public.users
ADD COLUMN phone_number TEXT,
ADD COLUMN phone_number_normalized TEXT GENERATED ALWAYS AS (
  regexp_replace(phone_number, '[^0-9]', '', 'g')
) STORED;

CREATE INDEX idx_users_phone_normalized ON public.users(phone_number_normalized);
```

**Normalization logic:** Strip all non-digits for matching. Device contacts have varied formats (+1 555-123-4567, 5551234567, etc.). Normalizing to digits-only enables simple equality matching.

---

## RLS Patterns

### Friends Table RLS

Follows patterns established in `group_members` and `gift_claims`:

```sql
-- SELECT: Users can see their own friend relationships
CREATE POLICY "Users can view own friend relationships"
  ON public.friends FOR SELECT
  USING (
    requester_id = (SELECT auth.uid()) OR
    addressee_id = (SELECT auth.uid())
  );

-- INSERT: Users can send friend requests
CREATE POLICY "Users can send friend requests"
  ON public.friends FOR INSERT
  WITH CHECK (requester_id = (SELECT auth.uid()));

-- UPDATE: Only addressee can accept/decline pending requests
CREATE POLICY "Addressee can respond to requests"
  ON public.friends FOR UPDATE
  USING (
    addressee_id = (SELECT auth.uid()) AND
    status = 'pending'
  )
  WITH CHECK (
    addressee_id = (SELECT auth.uid()) AND
    status IN ('accepted', 'declined', 'blocked')
  );

-- DELETE: Either party can remove accepted friendship
CREATE POLICY "Users can remove friendships"
  ON public.friends FOR DELETE
  USING (
    (requester_id = (SELECT auth.uid()) OR addressee_id = (SELECT auth.uid()))
    AND status = 'accepted'
  );
```

### Public Dates RLS

```sql
-- SELECT: Friends can view each other's public dates
CREATE POLICY "Friends can view public dates"
  ON public.public_dates FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.friends f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = (SELECT auth.uid()) AND f.addressee_id = public_dates.user_id)
          OR (f.addressee_id = (SELECT auth.uid()) AND f.requester_id = public_dates.user_id)
        )
    )
  );

-- INSERT/UPDATE/DELETE: Owner only
CREATE POLICY "Users can manage own public dates"
  ON public.public_dates FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

---

## Integration Points

### 1. Contact Import -> Friend Suggestions

```typescript
// Fetch device contacts
const { data: contacts } = await Contacts.getContactsAsync({
  fields: [Contacts.Fields.PhoneNumbers],
});

// Normalize phone numbers
const phoneNumbers = contacts
  .flatMap(c => c.phoneNumbers?.map(p => p.number?.replace(/\D/g, '')) ?? [])
  .filter(Boolean);

// Match against users table
const { data: matchedUsers } = await supabase
  .from('users')
  .select('id, display_name, avatar_url, phone_number_normalized')
  .in('phone_number_normalized', phoneNumbers)
  .neq('id', currentUserId); // Exclude self
```

### 2. Friend Request -> Notifications

Reuse existing `device_tokens` and Edge Function pattern from gift leader notifications:

```sql
-- Trigger on friends INSERT where status = 'pending'
-- Calls notify_friend_request() which inserts into notifications
-- Edge Function sends push via Expo Push API
```

### 3. Friend Dates -> Calendar Sync

Extend existing `utils/deviceCalendar.ts`:

```typescript
// New function alongside existing syncBirthdayEvent
export async function syncFriendDates(
  friendId: string,
  birthday: Date,
  publicDates: PublicDate[]
): Promise<SyncResult[]> {
  // Reuse getOrCreateWishlistCalendar()
  // Create events for birthday + each public date
  // Set yearly recurrence for recurring dates
}
```

### 4. Friends -> Group Invitations

Friends list provides a natural source for group invites:

```typescript
// When inviting to group, show friends first
const { data: friends } = await supabase
  .from('friends')
  .select(`
    requester:requester_id(id, display_name, avatar_url),
    addressee:addressee_id(id, display_name, avatar_url)
  `)
  .eq('status', 'accepted')
  .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
```

---

## Rejected Alternatives

| Alternative | Why Not |
|-------------|---------|
| `react-native-contacts` (community) | Not maintained for managed Expo workflow; expo-contacts is official and SDK-aligned |
| Dual-table approach (friend_requests + friendships) | More complex, requires transaction for accept, harder RLS coordination |
| Store raw phone numbers without normalization | Matching fails on format differences; normalization enables simple equality |
| Use email for matching instead of phone | Phone contacts rarely have email; phone is the primary identifier |
| expo-contacts/next (new API) | SDK 55+ only; current project is SDK 54 |
| `ContactAccessButton` (iOS 18 SwiftUI) | Requires native module; managed workflow should use standard permission flow |
| Storing full contact data | Privacy concern; only store phone numbers for matching, never names/photos from contacts |

---

## What NOT to Add

The following are NOT needed for the Friends System:

| Package | Why Not Needed |
|---------|---------------|
| `react-hook-form` | Friend request UI is simple (accept/decline buttons); existing useState patterns sufficient |
| `zustand` / state management | Friend state is fetched from Supabase; no complex client-side state needed |
| `expo-sharing` | No share-to-invite flow in scope; invite codes work via copy/paste |
| `expo-sms` | No SMS invite flow in scope |
| `@react-native-community/contacts` | Deprecated; expo-contacts is the replacement |

---

## Confidence Assessment

| Area | Confidence | Evidence |
|------|------------|----------|
| expo-contacts version ~15.0.11 for SDK 54 | HIGH | NPM shows 15.0.11 as latest; SDK 54 changelog confirms ~15.x range |
| Permission configuration via config plugin | HIGH | Verified in Expo docs; same pattern as expo-calendar already in project |
| iOS 18 limited access support | HIGH | expo/expo PR #35772 merged April 2025; accessPrivileges property documented |
| Single-table friend schema | HIGH | Industry standard pattern; Supabase-compatible; matches existing status-field patterns |
| RLS for bidirectional relationships | MEDIUM | Pattern is sound; complexity is in the OR conditions for bidirectional queries |
| Phone number normalization for matching | HIGH | Standard approach; digits-only normalization handles format variations |
| Calendar integration reuse | HIGH | Existing `deviceCalendar.ts` has all primitives; extension is straightforward |

---

## Sources

### expo-contacts
- [Expo Contacts SDK Documentation](https://docs.expo.dev/versions/latest/sdk/contacts/) - Official API reference
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) - SDK version compatibility
- [expo-contacts npm package](https://www.npmjs.com/package/expo-contacts) - Version 15.0.11 confirmed
- [GitHub PR #35772: iOS Limited Access Support](https://github.com/expo/expo/pull/35772) - accessPrivileges property

### iOS 18 Permissions
- [Apple: Meet the Contact Access Button (WWDC24)](https://developer.apple.com/videos/play/wwdc2024/10121/) - iOS 18 contact permission changes
- [Apple: Accessing the Contact Store](https://developer.apple.com/documentation/contacts/accessing-the-contact-store) - CNAuthorizationStatus.limited
- [GitHub Issue #894: react-native-permissions iOS 18](https://github.com/zoontek/react-native-permissions/issues/894) - Community discussion on limited access

### Database Patterns
- [User Friends System & Database Design](https://www.coderbased.com/p/user-friends-system-and-database) - Single-table with status approach
- [Modeling Mutual Friendship](https://minimalmodeling.substack.com/p/modeling-mutual-friendship) - Bidirectional relationship patterns
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) - Policy patterns
- [Neon: Modelling Authorization for Social Networks](https://neon.com/blog/modelling-authorization-for-a-social-network-with-postgres-rls-and-drizzle-orm) - RLS best practices

### Existing Project Patterns
- `lib/notifications.ts` lines 44-56 - Permission request pattern
- `utils/deviceCalendar.ts` - Calendar sync pattern
- `supabase/migrations/20260206000001_v1.3_claims_details_notes.sql` - Status field RLS pattern

---

## Previous Research (Preserved)

### v1.3 Gift Claims & Personal Details (2026-02-05)
No new npm dependencies needed. gift_claims table with celebrant-exclusion RLS, personal_details with public-read/owner-write, member_notes with subject-exclusion. JSONB for flexible preferences with pg_jsonschema validation.

### v1.2 Group Experience (2026-02-04)
No new dependencies needed. expo-image-picker + Supabase Storage for group photos. Gluestack UI for mode/budget selection. PostgreSQL aggregations for budget calculations.

### v1.1 Wishlist Polish (2026-02-03)
No new dependencies needed. Existing StarRating, expo-image-picker, MaterialCommunityIcons, NativeWind sufficient for all UI polish features.

---
*Research completed: 2026-02-09*
