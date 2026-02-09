# Architecture Research: Friends System

**Domain:** Social connections, contact import, friend-specific calendars
**Researched:** 2026-02-09
**Overall confidence:** HIGH

## Summary

The Friends System introduces direct user-to-user relationships independent of group membership. Unlike groups (which are implicit connections through shared group_members rows), friends are explicit bidirectional relationships with request/acceptance workflow. The system adds three new tables: `friends`, `friend_requests`, and `public_dates` -- all following established Supabase RLS patterns.

**Key architectural decisions:**

1. **Bidirectional friendship via single row**: Store friendship as one row with `user_a_id < user_b_id` constraint to prevent duplicate/reversed pairs. Simpler than two symmetric rows.

2. **Public dates are user-level, not friend-scoped**: Users define their public dates once (birthday, anniversary, etc.) and friends see them. No per-friend customization needed for MVP.

3. **Contact import uses phone/email matching**: Match imported contacts against `users.email` and a new `users.phone` column. No separate contact storage -- only matched users matter.

4. **Calendar integration extends existing `getGroupBirthdays` pattern**: Create parallel `getFriendDates()` service that returns friend public dates in the same `GroupBirthday`-compatible format for calendar display.

---

## Schema Design

### Friends (Bidirectional Relationship)

**Table: `friends`**

```sql
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  user_b_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Enforce ordering to prevent duplicate pairs (a,b) and (b,a)
  CONSTRAINT friends_ordered CHECK (user_a_id < user_b_id),
  CONSTRAINT friends_unique UNIQUE (user_a_id, user_b_id)
);
```

**Design rationale:**

| Decision | Rationale |
|----------|-----------|
| Single row per friendship | `user_a_id < user_b_id` constraint prevents duplicates. Query with `OR` condition. |
| No `status` column | Accepted friendships only. Pending state lives in `friend_requests`. |
| No `relationship_type` | YAGNI. One friendship type for MVP. Can add later if needed. |
| `ON DELETE CASCADE` | Deleting a user removes all their friendships automatically. |

**Indexes:**

```sql
CREATE INDEX idx_friends_user_a ON public.friends(user_a_id);
CREATE INDEX idx_friends_user_b ON public.friends(user_b_id);
```

**RLS Policies:**

```sql
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they're part of
CREATE POLICY "Users can view own friendships"
  ON public.friends FOR SELECT USING (
    auth.uid() = user_a_id OR auth.uid() = user_b_id
  );

-- Users can delete friendships they're part of (unfriend)
CREATE POLICY "Users can delete own friendships"
  ON public.friends FOR DELETE USING (
    auth.uid() = user_a_id OR auth.uid() = user_b_id
  );

-- INSERT handled by accept_friend_request() function (see below)
-- No direct INSERT policy - friendships created via request acceptance only
```

### Friend Requests (Pending State)

**Table: `friend_requests`**

```sql
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent self-requests and duplicates
  CONSTRAINT friend_requests_not_self CHECK (from_user_id != to_user_id),
  CONSTRAINT friend_requests_unique UNIQUE (from_user_id, to_user_id)
);
```

**Design rationale:**

| Decision | Rationale |
|----------|-----------|
| `status` enum | Track full lifecycle: pending -> accepted/rejected. |
| Keep accepted/rejected rows | Audit trail + prevents re-requesting same user repeatedly. |
| No reverse constraint | Alice can request Bob even if Bob already requested Alice (rare edge case, handle in app logic). |

**Indexes:**

```sql
CREATE INDEX idx_friend_requests_to ON public.friend_requests(to_user_id, status);
CREATE INDEX idx_friend_requests_from ON public.friend_requests(from_user_id);
```

**RLS Policies:**

```sql
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Users can view requests they sent or received
CREATE POLICY "Users can view own friend requests"
  ON public.friend_requests FOR SELECT USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

-- Users can create requests (must be from themselves)
CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT WITH CHECK (
    from_user_id = auth.uid()
  );

-- Users can update requests sent TO them (accept/reject)
CREATE POLICY "Users can respond to friend requests"
  ON public.friend_requests FOR UPDATE USING (
    to_user_id = auth.uid() AND status = 'pending'
  );

-- Users can delete/cancel their own pending outbound requests
CREATE POLICY "Users can cancel own pending requests"
  ON public.friend_requests FOR DELETE USING (
    from_user_id = auth.uid() AND status = 'pending'
  );
```

### Public Dates (User-Level Important Dates)

**Table: `public_dates`**

```sql
CREATE TABLE public.public_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date_type TEXT CHECK (date_type IN ('birthday', 'anniversary', 'custom')) NOT NULL,
  label TEXT NOT NULL,  -- e.g., "Wedding Anniversary", "Dog's Birthday"
  month INTEGER CHECK (month BETWEEN 1 AND 12) NOT NULL,
  day INTEGER CHECK (day BETWEEN 1 AND 31) NOT NULL,
  year INTEGER,  -- Optional: year for age calculation, NULL for recurring-only dates
  visibility TEXT CHECK (visibility IN ('friends_only', 'public')) DEFAULT 'friends_only',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Design rationale:**

| Decision | Rationale |
|----------|-----------|
| `month` + `day` (not DATE) | Birthday/anniversary dates recur annually. Year is optional for age display. |
| `date_type` enum | Distinguish birthday (syncs with user.birthday) vs other dates. |
| `visibility` | Future-proofing for public profiles. Default to friends_only for privacy. |
| No UNIQUE on (user_id, date_type) | Users can have multiple custom dates. |

**Indexes:**

```sql
CREATE INDEX idx_public_dates_user ON public.public_dates(user_id);
CREATE INDEX idx_public_dates_month_day ON public.public_dates(month, day);
```

**RLS Policies:**

```sql
ALTER TABLE public.public_dates ENABLE ROW LEVEL SECURITY;

-- Users can view their own dates
CREATE POLICY "Users can view own public dates"
  ON public.public_dates FOR SELECT USING (
    user_id = auth.uid()
  );

-- Friends can view dates with appropriate visibility
CREATE POLICY "Friends can view friend public dates"
  ON public.public_dates FOR SELECT USING (
    visibility = 'public'
    OR (
      visibility = 'friends_only'
      AND public.are_friends(user_id, auth.uid())
    )
  );

-- Users can manage their own dates
CREATE POLICY "Users can insert own public dates"
  ON public.public_dates FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Users can update own public dates"
  ON public.public_dates FOR UPDATE USING (
    user_id = auth.uid()
  );

CREATE POLICY "Users can delete own public dates"
  ON public.public_dates FOR DELETE USING (
    user_id = auth.uid()
  );
```

### Users Table Extension

**Add phone column for contact matching:**

```sql
-- Add phone column for contact import matching
ALTER TABLE public.users
ADD COLUMN phone TEXT UNIQUE;

CREATE INDEX idx_users_phone ON public.users(phone);
CREATE INDEX idx_users_email_lower ON public.users(LOWER(email));
```

---

## Database Functions

### Friend Check Helper

```sql
-- Helper function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friends
    WHERE (user_a_id = LEAST(p_user_a, p_user_b) AND user_b_id = GREATEST(p_user_a, p_user_b))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Accept Friend Request

```sql
-- Accept a friend request (creates friendship row)
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id UUID)
RETURNS JSON AS $$
DECLARE
  v_request friend_requests%ROWTYPE;
  v_friend_id UUID;
BEGIN
  -- Get and validate request
  SELECT * INTO v_request
  FROM friend_requests
  WHERE id = p_request_id
    AND to_user_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;

  -- Check if already friends (shouldn't happen but defensive)
  IF public.are_friends(v_request.from_user_id, v_request.to_user_id) THEN
    -- Update request status anyway
    UPDATE friend_requests SET status = 'accepted', updated_at = NOW()
    WHERE id = p_request_id;
    RETURN json_build_object('success', true, 'message', 'Already friends');
  END IF;

  -- Create friendship (ordered)
  INSERT INTO friends (user_a_id, user_b_id)
  VALUES (
    LEAST(v_request.from_user_id, v_request.to_user_id),
    GREATEST(v_request.from_user_id, v_request.to_user_id)
  )
  RETURNING id INTO v_friend_id;

  -- Update request status
  UPDATE friend_requests SET status = 'accepted', updated_at = NOW()
  WHERE id = p_request_id;

  RETURN json_build_object(
    'success', true,
    'friend_id', v_friend_id,
    'friend_user_id', v_request.from_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Get User Friends

```sql
-- Get all friends for the current user
CREATE OR REPLACE FUNCTION public.get_my_friends()
RETURNS TABLE (
  friend_id UUID,
  friend_user_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    CASE WHEN f.user_a_id = auth.uid() THEN f.user_b_id ELSE f.user_a_id END,
    f.created_at
  FROM friends f
  WHERE f.user_a_id = auth.uid() OR f.user_b_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Match Contacts by Email/Phone

```sql
-- Match contacts against existing users
CREATE OR REPLACE FUNCTION public.match_contacts(
  p_emails TEXT[],
  p_phones TEXT[]
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  phone TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_friend BOOLEAN,
  has_pending_request BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.phone,
    u.full_name,
    u.avatar_url,
    public.are_friends(auth.uid(), u.id),
    EXISTS (
      SELECT 1 FROM friend_requests fr
      WHERE (fr.from_user_id = auth.uid() AND fr.to_user_id = u.id)
         OR (fr.from_user_id = u.id AND fr.to_user_id = auth.uid())
        AND fr.status = 'pending'
    )
  FROM users u
  WHERE u.id != auth.uid()
    AND (
      LOWER(u.email) = ANY(SELECT LOWER(unnest(p_emails)))
      OR u.phone = ANY(p_phones)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## Integration Points

### Existing Calendar System

**Current flow (`lib/birthdays.ts`):**
```
getGroupBirthdays(userId)
  -> Query group_members for user's groups
  -> Query all members of those groups
  -> Query user_profiles for birthdays
  -> Return GroupBirthday[] with groupId, groupName, groupColor
```

**New parallel flow (`lib/friendDates.ts`):**
```
getFriendDates(userId)
  -> Call get_my_friends() for friend list
  -> Query public_dates for those friend user_ids
  -> Query user_profiles for names/avatars
  -> Return FriendDate[] (compatible shape with GroupBirthday)
```

**Calendar screen integration:**
- `calendar.tsx` currently calls `getGroupBirthdays()`
- Add parallel call to `getFriendDates()`
- Merge both arrays for unified calendar display
- Use distinct color for friend dates vs group birthday colors

### Existing Notification System

**Current tables:** `user_notifications`, `device_tokens`
**Current pattern:** Insert rows to trigger notification, Realtime subscription for live updates

**New notification types:**
```typescript
// Add to notification data JSONB schema
type NotificationData = {
  type: 'friend_request' | 'friend_request_accepted' | 'friend_date_reminder' | ...;
  from_user_id?: string;
  friend_id?: string;
  date_id?: string;
}
```

**Triggers needed:**
- On `friend_requests` INSERT: Notify `to_user_id` of new request
- On `friend_requests` UPDATE (to 'accepted'): Notify `from_user_id` of acceptance

### Existing Profile System

**Current flow:**
- `app/profile/[id].tsx` - View any user's public profile
- `app/(app)/settings/profile.tsx` - Edit own profile
- `app/(app)/settings/personal-details.tsx` - Edit sizes/preferences

**New integration:**
- Profile screen shows "Add Friend" / "Friends" / "Pending" button based on relationship
- Settings adds "My Public Dates" section for managing anniversary/custom dates
- Settings adds "Find Friends" option (contact import flow)

### Tab Navigation

**Current tabs:** My Wishlist, Groups, Celebrations, Calendar

**Option A (Recommended):** Add "Friends" tab
- **Pros:** Clear dedicated space for friend management
- **Cons:** 5 tabs is maximum comfortable limit

**Option B:** Friends as sub-section of Profile/Settings
- **Pros:** Fewer tabs, friends are "settings"-ish
- **Cons:** Less discoverable, friend dates in calendar need nav to manage

**Recommendation:** Option A - Add Friends tab at position 2:
```
My Wishlist | Friends | Groups | Celebrations | Calendar
```

---

## New Components

### Services (lib/)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `lib/friends.ts` | Friend relationship CRUD | `getFriends()`, `sendFriendRequest()`, `acceptFriendRequest()`, `rejectFriendRequest()`, `removeFriend()`, `areFriends()` |
| `lib/friendDates.ts` | Friend public dates | `getFriendDates()`, `getPublicDatesForCalendar()` |
| `lib/publicDates.ts` | User's own public dates | `getMyPublicDates()`, `addPublicDate()`, `updatePublicDate()`, `deletePublicDate()` |
| `lib/contactImport.ts` | Contact matching | `importContacts()`, `matchContacts()`, `normalizePhone()` |

### UI Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `FriendCard` | Display friend with avatar, name, recent activity | `components/friends/FriendCard.tsx` |
| `FriendRequestCard` | Incoming request with accept/reject buttons | `components/friends/FriendRequestCard.tsx` |
| `AddFriendButton` | Context-aware button (profile view) | `components/friends/AddFriendButton.tsx` |
| `FriendStatusBadge` | Shows relationship status on any profile | `components/friends/FriendStatusBadge.tsx` |
| `ContactMatchList` | List of matched contacts from import | `components/friends/ContactMatchList.tsx` |
| `PublicDateCard` | Display/edit a public date entry | `components/profile/PublicDateCard.tsx` |
| `PublicDateForm` | Add/edit form for public dates | `components/profile/PublicDateForm.tsx` |
| `FriendDateCard` | Calendar countdown card for friend dates | `components/calendar/FriendDateCard.tsx` |

### Routes

| Route | Purpose | Type |
|-------|---------|------|
| `app/(app)/(tabs)/friends.tsx` | Friends tab main screen (friend list) | NEW |
| `app/(app)/friends/requests.tsx` | Pending friend requests | NEW |
| `app/(app)/friends/find.tsx` | Find friends (contact import, search) | NEW |
| `app/(app)/settings/public-dates.tsx` | Manage own public dates | NEW |

---

## Modified Components

### Screens

| Screen | Changes |
|--------|---------|
| `app/(app)/(tabs)/_layout.tsx` | Add Friends tab at position 2 |
| `app/(app)/(tabs)/calendar.tsx` | Merge friend dates into calendar display, add section for "Friend Dates" alongside "Group Birthdays" |
| `app/profile/[id].tsx` | Add `AddFriendButton` or `FriendStatusBadge` based on relationship |
| `app/(app)/settings/profile.tsx` | Add link to "My Public Dates" settings |

### Components

| Component | Changes |
|-----------|---------|
| `BirthdayCalendar.tsx` | Accept combined `birthdays + friendDates` array, use different dot colors |
| `CountdownCard.tsx` | Support `source: 'group' | 'friend'` prop for visual distinction |

### Services

| Service | Changes |
|---------|---------|
| `lib/birthdays.ts` | Export types for reuse by `friendDates.ts` |
| `lib/notifications.ts` | No changes (handles any notification type) |

### Types

| File | Changes |
|------|---------|
| `types/database.types.ts` | Add `friends`, `friend_requests`, `public_dates` table definitions |

---

## Data Flow

### Send Friend Request Flow

```
User A views User B's profile
    |
    v
Profile shows AddFriendButton (state: 'add')
    |
    v
User A taps "Add Friend"
    |
    v
sendFriendRequest(userBId)
    - INSERT into friend_requests
    - RLS validates from_user_id = auth.uid()
    |
    v
DB trigger creates notification for User B
    - INSERT into user_notifications
    - type: 'friend_request'
    |
    v
User B sees notification in-app (Realtime) or push
    |
    v
User B navigates to Requests screen
    - getFriendRequests() returns pending requests
    |
    v
User B taps "Accept"
    |
    v
acceptFriendRequest(requestId)
    - Calls accept_friend_request() function
    - Creates friends row
    - Updates request status to 'accepted'
    |
    v
DB trigger creates notification for User A
    - type: 'friend_request_accepted'
    |
    v
Both users now see each other in Friends list
```

### Contact Import Flow

```
User navigates to Find Friends
    |
    v
App requests Contacts permission
    - expo-contacts API
    |
    v
If granted: Load device contacts
    - Extract emails[], phones[]
    |
    v
importContacts(emails, phones)
    - Calls match_contacts() function
    - Returns matched users with friendship status
    |
    v
Display ContactMatchList
    - For each match: show name, avatar
    - Button: "Add" / "Pending" / "Friends"
    |
    v
User taps "Add" on matched contact
    |
    v
sendFriendRequest(matchedUserId)
    - Same flow as above
```

### Calendar Friend Dates Flow

```
Calendar screen loads
    |
    v
Parallel fetch:
    - getGroupBirthdays(userId)    [existing]
    - getFriendDates(userId)       [NEW]
    |
    v
Merge results into unified array
    - GroupBirthday[] + FriendDate[]
    - Assign distinct colors: group vs friend
    |
    v
BirthdayCalendar renders with combined data
    - Dots: multiple colors per date (group=varied, friend=teal)
    |
    v
Upcoming section shows both sources
    - CountdownCard with source indicator
```

---

## Suggested Build Order

### Phase 1: Database Foundation

**Rationale:** Schema must exist before any features. Friends table is the core relationship.

Tasks:
1. Migration: Add `phone` column to `users` table
2. Migration: Create `friends` table with ordered constraint
3. Migration: Create `friend_requests` table
4. Migration: Create `public_dates` table
5. Migration: Create helper functions (`are_friends`, `accept_friend_request`, `get_my_friends`, `match_contacts`)
6. Types: Add all new tables to `database.types.ts`

**Dependencies:** None.

### Phase 2: Friend Core Services + Tab

**Rationale:** Core friend CRUD enables all other features. Tab provides navigation home.

Tasks:
1. Service: Create `lib/friends.ts` with all friend operations
2. Route: Create `app/(app)/(tabs)/friends.tsx` (friend list screen)
3. Component: Create `FriendCard.tsx`
4. Modify: `app/(app)/(tabs)/_layout.tsx` to add Friends tab

**Dependencies:** Phase 1.

### Phase 3: Friend Requests Flow

**Rationale:** Need requests to actually make friends.

Tasks:
1. Route: Create `app/(app)/friends/requests.tsx` (pending requests screen)
2. Component: Create `FriendRequestCard.tsx` with accept/reject
3. Service: Add request-specific functions to `lib/friends.ts`
4. Component: Create `AddFriendButton.tsx`
5. Component: Create `FriendStatusBadge.tsx`
6. Modify: `app/profile/[id].tsx` to show friend status/button
7. Notification triggers: Create DB triggers for request notifications

**Dependencies:** Phase 2.

### Phase 4: Contact Import

**Rationale:** Major friend discovery mechanism. Requires expo-contacts.

Tasks:
1. Install: Add `expo-contacts` dependency
2. Service: Create `lib/contactImport.ts`
3. Route: Create `app/(app)/friends/find.tsx`
4. Component: Create `ContactMatchList.tsx`
5. Link: Add "Find Friends" button to friends tab

**Dependencies:** Phase 3 (uses sendFriendRequest).

### Phase 5: Public Dates

**Rationale:** User-defined dates for friends to see.

Tasks:
1. Service: Create `lib/publicDates.ts`
2. Route: Create `app/(app)/settings/public-dates.tsx`
3. Component: Create `PublicDateCard.tsx` and `PublicDateForm.tsx`
4. Modify: `app/(app)/settings/profile.tsx` to link to public dates

**Dependencies:** Phase 1 (schema only).

### Phase 6: Calendar Integration

**Rationale:** Final integration - friend dates appear in calendar.

Tasks:
1. Service: Create `lib/friendDates.ts`
2. Modify: `lib/birthdays.ts` to export types
3. Modify: `app/(app)/(tabs)/calendar.tsx` to fetch and merge friend dates
4. Modify: `BirthdayCalendar.tsx` to support friend date colors
5. Component: Create or adapt `CountdownCard` for friend dates
6. Calendar sync: Update `deviceCalendar.ts` to support friend dates

**Dependencies:** Phases 1, 2, 5.

### Phase Ordering Rationale

1. **Database first** - Everything depends on schema
2. **Friends tab + core** - Establishes navigation and basic viewing
3. **Requests** - Enables creating friendships
4. **Contact import** - Major discoverability feature, uses request flow
5. **Public dates** - Can be done in parallel after Phase 1
6. **Calendar integration** - Requires friends + public dates to exist

---

## Performance Considerations

### Friend List Query

```typescript
// Efficient friend list with profiles in single query
const { data: friends } = await supabase
  .rpc('get_my_friends')
  .then(async (res) => {
    if (!res.data) return res;
    const friendIds = res.data.map(f => f.friend_user_id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url, birthday')
      .in('id', friendIds);
    // Merge profiles with friend data
    return {
      ...res,
      data: res.data.map(f => ({
        ...f,
        profile: profiles?.find(p => p.id === f.friend_user_id)
      }))
    };
  });
```

### Friend Dates for Calendar

```typescript
// Batch fetch friend dates
const { data: dates } = await supabase
  .from('public_dates')
  .select(`
    *,
    user:users!user_id (
      id, full_name, avatar_url
    )
  `)
  .in('user_id', friendIds)
  .eq('visibility', 'friends_only'); // RLS handles friend check
```

### Contact Matching

- Limit contact import to 1000 contacts to prevent slow queries
- Use batch insert for multiple friend requests
- Normalize phone numbers server-side for consistent matching

---

## Realtime Subscriptions

### Friend Requests

```typescript
// Subscribe to new friend requests
const channel = supabase
  .channel('friend_requests')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'friend_requests',
      filter: `to_user_id=eq.${userId}`,
    },
    handleNewRequest
  )
  .subscribe();
```

### Friend Status Changes

```typescript
// Subscribe to friendship changes (for profile view)
const channel = supabase
  .channel('friends')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'friends',
      filter: `user_a_id=eq.${userId}`,
    },
    handleFriendChange
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'friends',
      filter: `user_b_id=eq.${userId}`,
    },
    handleFriendChange
  )
  .subscribe();
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Friends schema (single-row bidirectional) | HIGH | Standard pattern, ordered constraint prevents duplicates cleanly |
| Friend requests flow | HIGH | Simple state machine (pending -> accepted/rejected) |
| Public dates schema | HIGH | Straightforward month/day storage for recurring dates |
| RLS for friends visibility | HIGH | `are_friends()` helper makes policies clean |
| Contact import matching | MEDIUM | Phone normalization varies by region (E.164 format recommended) |
| Calendar integration | HIGH | Follows established `getGroupBirthdays` pattern exactly |
| Tab navigation (5 tabs) | MEDIUM | 5 tabs is UI limit; may need redesign if more features added |
| Notification triggers | HIGH | Same pattern as celebration notifications |

## Risk Areas

### Phone Number Normalization

Contact phone numbers come in various formats. Matching requires normalization.

**Mitigation:**
- Store phones in E.164 format (`+1234567890`)
- Normalize on input (both user registration and contact import)
- Consider using a library like `libphonenumber-js` for robust parsing

### Friend Ordering Constraint

The `user_a_id < user_b_id` constraint requires consistent ordering in all queries.

**Mitigation:**
- Always use `LEAST/GREATEST` in functions
- Service layer normalizes before queries
- Single `are_friends()` helper function used everywhere

### Tab Overflow

Adding Friends tab makes 5 tabs. Future features may need different navigation.

**Mitigation:**
- Consider combining Celebrations into Calendar as a "Events" tab
- Or move Friends to Settings/Profile area if usage is low
- Monitor analytics for tab usage patterns

### Contact Permission Denial

Users may deny contact access.

**Mitigation:**
- Provide alternative: manual username/email search
- Clear explanation of why contacts are needed
- Graceful fallback UI when permission denied

---

*Research completed: 2026-02-09*
*Source: Existing codebase analysis, Supabase RLS patterns from celebrations/claims schemas, expo-contacts and expo-calendar documentation*
