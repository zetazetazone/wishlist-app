# Phase 25: Friend Requests Flow - Research

**Researched:** 2026-02-09
**Domain:** Friend request lifecycle, push notifications, React Native UI, Supabase database triggers
**Confidence:** HIGH

## Summary

Phase 25 implements the complete friend request lifecycle: send, accept, decline, view pending requests, and push notifications. This phase builds on the solid foundation from Phase 23 (database schema with `friend_requests` table, `accept_friend_request()` RPC, RLS policies) and Phase 24 (Friends tab, `lib/friends.ts` service, `FriendCard` component).

The core technical work divides into three areas:

1. **Friend Request Service Layer** -- Extend `lib/friends.ts` with functions for send, decline, cancel, and get pending requests. The `accept_friend_request()` RPC already exists from Phase 23.

2. **Pending Requests UI** -- New screen accessible from Friends tab header showing incoming and outgoing requests with accept/decline/cancel actions.

3. **Push Notification Triggers** -- Two new database triggers that insert into `user_notifications` when requests are sent and accepted, piggybacking on the existing push notification infrastructure (Edge Function + webhook).

The existing notification infrastructure is mature: `user_notifications` table with webhook to Edge Function that sends via Expo Push Service. The pattern is proven in `notify_gift_leader_assigned()`. This phase follows the same pattern for friend request events.

**Primary recommendation:** Follow the existing patterns exactly: notification trigger like `notify_gift_leader_assigned()`, service functions like Phase 24's `getFriends()`/`removeFriend()`, screen structure like the existing `groups.tsx` tab. The database layer is mostly complete from Phase 23.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.93.3 | Database queries, RPC calls | Already in use for all data operations |
| expo-router | 6.0.23 | Navigation to Requests screen | Already powering all app navigation |
| expo-notifications | 0.32.16 | Local notification handling | Already configured with push token registration |
| react-native | 0.81.5 | Core UI components | Project foundation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| moti | 0.30.0 | Card animations | Request cards (matches FriendCard pattern) |
| @expo/vector-icons | 15.0.3 | MaterialCommunityIcons for actions | Accept/decline buttons, badge icons |
| expo-linear-gradient | 15.0.8 | Header gradient | Requests screen header (matches Friends tab) |
| date-fns | 4.1.0 | Date formatting for "sent 2 hours ago" | Relative time display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database trigger for notifications | Supabase Realtime subscription | Trigger is simpler and already proven in codebase |
| Dedicated push endpoint | Existing webhook flow | Reuse existing infrastructure, no new Edge Functions |
| Two separate screens (incoming/outgoing) | Single screen with tabs/segments | Single screen is simpler for v1 |

**No new packages needed** -- all required libraries are already installed.

## Architecture Patterns

### Recommended Project Structure
```
lib/
  friends.ts                    # MODIFY: Add request functions

app/(app)/
  requests.tsx                  # NEW: Pending requests screen

components/friends/
  FriendRequestCard.tsx         # NEW: Request card with actions

supabase/migrations/
  20260211000001_friend_request_notifications.sql  # NEW: Notification triggers
```

### Pattern 1: Friend Request Service Functions
**What:** Extend `lib/friends.ts` with request lifecycle operations
**When to use:** All friend request operations from UI
**Example:**
```typescript
// Source: Following lib/friends.ts getFriends() pattern

/**
 * Friend request with sender/receiver profile info
 */
export interface FriendRequestWithProfile {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Get pending friend requests for current user
 *
 * Returns both incoming and outgoing requests separately.
 * RLS automatically filters to requests involving current user.
 */
export async function getPendingRequests(): Promise<{
  incoming: FriendRequestWithProfile[];
  outgoing: FriendRequestWithProfile[];
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { incoming: [], outgoing: [] };

  const { data: requests, error } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, to_user_id, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch pending requests:', error);
    return { incoming: [], outgoing: [] };
  }

  // Separate incoming (to me) from outgoing (from me)
  const incoming = requests.filter(r => r.to_user_id === user.id);
  const outgoing = requests.filter(r => r.from_user_id === user.id);

  // Batch-fetch profiles for all senders (incoming) and receivers (outgoing)
  const senderIds = incoming.map(r => r.from_user_id);
  const receiverIds = outgoing.map(r => r.to_user_id);
  const allProfileIds = [...new Set([...senderIds, ...receiverIds])];

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .in('id', allProfileIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // Attach profiles
  const enrichRequest = (r: typeof requests[0], profileId: string) => ({
    ...r,
    profile: profileMap.get(profileId)
      ? { ...profileMap.get(profileId)!, avatar_url: getAvatarUrl(profileMap.get(profileId)!.avatar_url) }
      : undefined,
  });

  return {
    incoming: incoming.map(r => enrichRequest(r, r.from_user_id)),
    outgoing: outgoing.map(r => enrichRequest(r, r.to_user_id)),
  };
}
```

### Pattern 2: Send Friend Request with Rate Limiting
**What:** Rate-limited friend request sending with duplicate prevention
**When to use:** Sending friend requests from member profile
**Example:**
```typescript
// Source: Following lib/friends.ts removeFriend() pattern

/**
 * Send a friend request to another user
 *
 * RLS prevents:
 * - Sending to self
 * - Sending if blocked
 * - Sending if already friends
 *
 * Application layer enforces rate limiting (max 20/hour).
 *
 * @param toUserId - UUID of the user to send request to
 * @throws Error if request fails
 */
export async function sendFriendRequest(toUserId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check rate limit (last hour's requests)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('friend_requests')
    .select('*', { count: 'exact', head: true })
    .eq('from_user_id', user.id)
    .gte('created_at', oneHourAgo);

  if (count !== null && count >= 20) {
    throw new Error('Rate limit exceeded. Please wait before sending more requests.');
  }

  const { error } = await supabase
    .from('friend_requests')
    .insert({
      from_user_id: user.id,
      to_user_id: toUserId,
      status: 'pending',
    });

  if (error) {
    // Handle specific constraint violations
    if (error.code === '23505') { // unique_violation
      throw new Error('Friend request already pending');
    }
    if (error.message.includes('blocked')) {
      throw new Error('Cannot send request to this user');
    }
    throw new Error(`Failed to send friend request: ${error.message}`);
  }
}
```

### Pattern 3: Accept via RPC Function
**What:** Use existing `accept_friend_request()` RPC for atomic accept
**When to use:** Accepting an incoming friend request
**Example:**
```typescript
// Source: Following existing RPC patterns from Phase 23

/**
 * Accept an incoming friend request
 *
 * Uses accept_friend_request RPC which:
 * 1. Validates current user is the receiver
 * 2. Validates request is pending
 * 3. Creates friendship row atomically
 * 4. Updates request status to accepted
 *
 * @param requestId - UUID of the friend_requests row
 * @returns The new friend's user ID on success
 * @throws Error if accept fails
 */
export async function acceptFriendRequest(requestId: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('accept_friend_request', { p_request_id: requestId });

  if (error) {
    throw new Error(`Failed to accept request: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to accept request');
  }

  return data.friend_id;
}
```

### Pattern 4: Decline Friend Request
**What:** Simple UPDATE to change status to rejected
**When to use:** Declining an incoming friend request
**Example:**
```typescript
/**
 * Decline an incoming friend request
 *
 * RLS policy "Receivers can update friend request status" allows
 * the receiver to change status.
 *
 * @param requestId - UUID of the friend_requests row
 * @throws Error if decline fails
 */
export async function declineFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);

  if (error) {
    throw new Error(`Failed to decline request: ${error.message}`);
  }
}
```

### Pattern 5: Cancel Pending Request (Sender)
**What:** DELETE to cancel a request the sender sent
**When to use:** Canceling an outgoing pending request
**Example:**
```typescript
/**
 * Cancel a pending friend request (as sender)
 *
 * RLS policy "Senders can cancel pending requests" allows
 * DELETE only when: sender = auth.uid() AND status = 'pending'
 *
 * @param requestId - UUID of the friend_requests row
 * @throws Error if cancel fails
 */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    throw new Error(`Failed to cancel request: ${error.message}`);
  }
}
```

### Pattern 6: Database Trigger for Push Notifications
**What:** Trigger on friend_requests INSERT that creates user_notification
**When to use:** Automatically notify user when they receive a friend request
**Example:**
```sql
-- Source: Following notify_gift_leader_assigned() pattern from 20260202000008

CREATE OR REPLACE FUNCTION public.notify_friend_request_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name TEXT;
  v_sender_avatar TEXT;
BEGIN
  -- Only process new pending requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get sender info
  SELECT
    COALESCE(u.full_name, u.email) AS name,
    u.avatar_url
  INTO v_sender_name, v_sender_avatar
  FROM public.users u
  WHERE u.id = NEW.from_user_id;

  -- Create notification for receiver
  INSERT INTO public.user_notifications (
    user_id,
    title,
    body,
    data
  ) VALUES (
    NEW.to_user_id,
    v_sender_name || ' sent you a friend request',
    'Tap to view and respond',
    jsonb_build_object(
      'type', 'friend_request_received',
      'screen', 'requests',
      'request_id', NEW.id,
      'from_user_id', NEW.from_user_id,
      'avatar_url', v_sender_avatar
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friend_request_sent
  AFTER INSERT ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request_sent();
```

### Pattern 7: Notification on Request Accepted
**What:** Trigger on friend_requests UPDATE to notify sender when accepted
**When to use:** Automatically notify when friend request is accepted
**Example:**
```sql
CREATE OR REPLACE FUNCTION public.notify_friend_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_accepter_name TEXT;
  v_accepter_avatar TEXT;
BEGIN
  -- Only process status change to 'accepted'
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get accepter info (the receiver who accepted)
    SELECT
      COALESCE(u.full_name, u.email) AS name,
      u.avatar_url
    INTO v_accepter_name, v_accepter_avatar
    FROM public.users u
    WHERE u.id = NEW.to_user_id;

    -- Notify the original sender
    INSERT INTO public.user_notifications (
      user_id,
      title,
      body,
      data
    ) VALUES (
      NEW.from_user_id,
      v_accepter_name || ' accepted your friend request!',
      'You are now friends. Tap to view their profile.',
      jsonb_build_object(
        'type', 'friend_request_accepted',
        'screen', 'member',
        'friend_user_id', NEW.to_user_id,
        'avatar_url', v_accepter_avatar
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE OF status ON public.friend_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'accepted')
  EXECUTE FUNCTION public.notify_friend_request_accepted();
```

### Pattern 8: Requests Screen Structure
**What:** Screen showing incoming and outgoing pending requests
**When to use:** Accessed from Friends tab header
**Example:**
```typescript
// Source: Following app/(app)/(tabs)/friends.tsx pattern

export default function RequestsScreen() {
  const [incoming, setIncoming] = useState<FriendRequestWithProfile[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');

  const loadRequests = async () => {
    const { incoming, outgoing } = await getPendingRequests();
    setIncoming(incoming);
    setOutgoing(outgoing);
    setLoading(false);
  };

  const handleAccept = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      loadRequests(); // Reload to update lists
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDecline = async (requestId: string) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this friend request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await declineFriendRequest(requestId);
              loadRequests();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // ... render with segment control for incoming/outgoing
}
```

### Pattern 9: Friend Request Button on Member Profile
**What:** Conditional button on member profile based on relationship status
**When to use:** Adding "Add Friend" button to member/[id].tsx
**Example:**
```typescript
// Add to member/[id].tsx

const [relationshipStatus, setRelationshipStatus] = useState<
  'none' | 'friends' | 'pending_incoming' | 'pending_outgoing'
>('none');

// In loadMemberData:
// 1. Check if already friends via are_friends check
// 2. Check for pending request in either direction

// Button logic:
{relationshipStatus === 'none' && (
  <TouchableOpacity onPress={handleSendRequest}>
    <Text>Add Friend</Text>
  </TouchableOpacity>
)}
{relationshipStatus === 'pending_outgoing' && (
  <View><Text>Request Pending</Text></View>
)}
{relationshipStatus === 'pending_incoming' && (
  <View>
    <TouchableOpacity onPress={handleAccept}><Text>Accept</Text></TouchableOpacity>
    <TouchableOpacity onPress={handleDecline}><Text>Decline</Text></TouchableOpacity>
  </View>
)}
{relationshipStatus === 'friends' && (
  <View><Text>Friends</Text></View>
)}
```

### Anti-Patterns to Avoid
- **Direct INSERT to friends table:** Always use accept_friend_request RPC for atomic creation
- **Polling for new requests:** Use Supabase Realtime subscription or push notifications instead
- **Missing rate limiting:** Always check request count before INSERT (20/hour limit)
- **Sending request from friends list:** Request should be sent from member profile, not friends tab

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic friendship creation | Direct INSERT to friends | `accept_friend_request()` RPC | Race conditions, ordered constraint handling |
| Push notification delivery | Custom push logic | Existing user_notifications + Edge Function | Proven infrastructure |
| Relationship status check | Multiple queries | Single query with are_friends() + pending check | Efficiency |
| Rate limiting | Application-only check | DB query for count + application check | Accurate count |

**Key insight:** Phase 23 already provides the complex database logic. This phase is service functions + UI + notification triggers.

## Common Pitfalls

### Pitfall 1: Duplicate Request After Decline
**What goes wrong:** User declines request, sender immediately re-sends, request goes through
**Why it happens:** Declined request row still exists, no cooldown
**How to avoid:** Either delete declined requests after 24 hours, or check for recently declined in INSERT policy
**Warning signs:** Users complaining about harassment via repeated requests

### Pitfall 2: Race Condition on Accept
**What goes wrong:** User taps Accept rapidly, two friendship rows created
**Why it happens:** Multiple accept requests before first completes
**How to avoid:** Disable button immediately on tap, use existing RPC's unique_violation handling
**Warning signs:** Duplicate friendship entries in database

### Pitfall 3: Notification Not Arriving
**What goes wrong:** User sends request but receiver gets no push notification
**Why it happens:** Trigger creates user_notification row, but webhook doesn't fire
**How to avoid:** Verify webhook is configured for user_notifications INSERT in Supabase dashboard
**Warning signs:** Notifications work for gift leader but not friend requests

### Pitfall 4: Wrong Profile Shown in Notification
**What goes wrong:** Push notification shows wrong name/avatar
**Why it happens:** Querying from wrong user table (users vs user_profiles) or wrong user_id
**How to avoid:** Follow existing pattern: query `users` table with from_user_id for sent notifications
**Warning signs:** Notification says "null sent you a request"

### Pitfall 5: Pending Requests Badge Not Updating
**What goes wrong:** Badge shows "3 pending" after user accepted all requests
**Why it happens:** Badge count cached, not refreshed after actions
**How to avoid:** Re-fetch pending count after any accept/decline action, or use Realtime subscription
**Warning signs:** Badge number doesn't match actual pending count

### Pitfall 6: Send Button Visible When Already Friends
**What goes wrong:** User can tap "Add Friend" for someone they're already friends with
**Why it happens:** Relationship status not checked on profile load
**How to avoid:** Always check are_friends() AND pending requests on profile load
**Warning signs:** RLS error when trying to send request, or duplicate request created

### Pitfall 7: Rate Limit Not Enforced Server-Side
**What goes wrong:** Attacker bypasses app and sends 1000 requests via API
**Why it happens:** Rate limit only checked in application layer
**How to avoid:** Could add database trigger to check count, but complexity may not be worth it for MVP
**Warning signs:** Users receiving hundreds of spam requests

## Code Examples

### Complete getPendingRequests Implementation
```typescript
// Source: Following lib/friends.ts pattern

export interface FriendRequestWithProfile {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export async function getPendingRequests(): Promise<{
  incoming: FriendRequestWithProfile[];
  outgoing: FriendRequestWithProfile[];
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { incoming: [], outgoing: [] };

  // Fetch all pending requests involving current user
  const { data: requests, error } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, to_user_id, status, created_at')
    .eq('status', 'pending')
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch pending requests:', error);
    return { incoming: [], outgoing: [] };
  }

  if (!requests || requests.length === 0) {
    return { incoming: [], outgoing: [] };
  }

  // Separate incoming from outgoing
  const incoming = requests.filter(r => r.to_user_id === user.id);
  const outgoing = requests.filter(r => r.from_user_id === user.id);

  // Collect all profile IDs to fetch
  const profileIds = [
    ...incoming.map(r => r.from_user_id),
    ...outgoing.map(r => r.to_user_id),
  ];
  const uniqueProfileIds = [...new Set(profileIds)];

  // Batch-fetch profiles
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .in('id', uniqueProfileIds);

  if (profileError) {
    console.error('Failed to fetch profiles:', profileError);
  }

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // Helper to attach profile
  const withProfile = (
    request: typeof requests[0],
    profileId: string
  ): FriendRequestWithProfile => {
    const profile = profileMap.get(profileId);
    return {
      ...request,
      profile: profile
        ? {
            id: profile.id,
            display_name: profile.display_name,
            avatar_url: getAvatarUrl(profile.avatar_url),
          }
        : undefined,
    };
  };

  return {
    incoming: incoming.map(r => withProfile(r, r.from_user_id)),
    outgoing: outgoing.map(r => withProfile(r, r.to_user_id)),
  };
}
```

### Check Relationship Status for Profile Page
```typescript
/**
 * Check the relationship status between current user and another user
 *
 * Returns one of:
 * - 'friends': Already friends
 * - 'pending_incoming': They sent us a request
 * - 'pending_outgoing': We sent them a request
 * - 'blocked': One of us blocked the other
 * - 'none': No relationship
 */
export async function getRelationshipStatus(
  otherUserId: string
): Promise<'friends' | 'pending_incoming' | 'pending_outgoing' | 'blocked' | 'none'> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'none';
  if (user.id === otherUserId) return 'none'; // Can't have relationship with self

  // Check friendship
  const { data: isFriends } = await supabase
    .rpc('are_friends', { p_user_a: user.id, p_user_b: otherUserId });

  if (isFriends) return 'friends';

  // Check pending requests
  const { data: requests } = await supabase
    .from('friend_requests')
    .select('from_user_id, to_user_id, status')
    .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${user.id})`)
    .in('status', ['pending', 'blocked'])
    .limit(1)
    .single();

  if (!requests) return 'none';

  if (requests.status === 'blocked') return 'blocked';

  if (requests.from_user_id === user.id) return 'pending_outgoing';
  return 'pending_incoming';
}
```

### Complete Notification Trigger Migration
```sql
-- Phase 25: Friend Request Notification Triggers
-- Creates push notifications when friend requests are sent and accepted

-- ============================================
-- PART 1: Notification on friend request sent
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_friend_request_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sender_name TEXT;
  v_sender_avatar TEXT;
BEGIN
  -- Only process new pending requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get sender info from users table
  SELECT
    COALESCE(u.full_name, up.display_name, u.email) AS name,
    up.avatar_url
  INTO v_sender_name, v_sender_avatar
  FROM public.users u
  LEFT JOIN public.user_profiles up ON up.id = u.id
  WHERE u.id = NEW.from_user_id;

  -- Create notification for receiver
  INSERT INTO public.user_notifications (
    user_id,
    title,
    body,
    data
  ) VALUES (
    NEW.to_user_id,
    v_sender_name || ' sent you a friend request',
    'Tap to view and respond',
    jsonb_build_object(
      'type', 'friend_request_received',
      'screen', 'requests',
      'request_id', NEW.id,
      'from_user_id', NEW.from_user_id,
      'avatar_url', v_sender_avatar
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friend_request_sent ON public.friend_requests;
CREATE TRIGGER on_friend_request_sent
  AFTER INSERT ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request_sent();

-- ============================================
-- PART 2: Notification on friend request accepted
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_friend_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_accepter_name TEXT;
  v_accepter_avatar TEXT;
BEGIN
  -- Only notify if status changed from pending to accepted
  IF NOT (OLD.status = 'pending' AND NEW.status = 'accepted') THEN
    RETURN NEW;
  END IF;

  -- Get accepter info (the receiver who accepted)
  SELECT
    COALESCE(u.full_name, up.display_name, u.email) AS name,
    up.avatar_url
  INTO v_accepter_name, v_accepter_avatar
  FROM public.users u
  LEFT JOIN public.user_profiles up ON up.id = u.id
  WHERE u.id = NEW.to_user_id;

  -- Notify the original sender
  INSERT INTO public.user_notifications (
    user_id,
    title,
    body,
    data
  ) VALUES (
    NEW.from_user_id,
    v_accepter_name || ' accepted your friend request!',
    'You are now friends. Tap to view their profile.',
    jsonb_build_object(
      'type', 'friend_request_accepted',
      'screen', 'member',
      'friend_user_id', NEW.to_user_id,
      'avatar_url', v_accepter_avatar
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_friend_request_accepted ON public.friend_requests;
CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE OF status ON public.friend_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'accepted')
  EXECUTE FUNCTION public.notify_friend_request_accepted();

-- ============================================
-- PART 3: Completion notice
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Friend request notification triggers created!';
  RAISE NOTICE 'Trigger 1: on_friend_request_sent (INSERT, status = pending)';
  RAISE NOTICE 'Trigger 2: on_friend_request_accepted (UPDATE, pending -> accepted)';
END $$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for new requests | Database triggers + push notifications | Standard in 2024+ | Instant delivery, no battery drain |
| Separate accept/create logic | Atomic RPC function | Phase 23 | Race condition prevention |
| Two notification Edge Functions | Single push Edge Function + multiple triggers | Project pattern | Simpler infrastructure |

**Project-specific patterns already established:**
- `notify_gift_leader_assigned()` trigger for push notifications (exact pattern to follow)
- `accept_friend_request()` RPC for atomic acceptance (already exists from Phase 23)
- `user_notifications` table with webhook to Edge Function (proven infrastructure)
- Service pattern in `lib/friends.ts` (extend existing file)

## Open Questions

1. **Badge Count on Friends Tab**
   - What we know: User should see pending request count
   - What's unclear: Badge on tab icon or link in header?
   - Recommendation: Add badge count to header link that navigates to Requests screen. Tab badges are complex in expo-router.

2. **Request Expiration**
   - What we know: PITFALLS doc mentions 30-day auto-expire
   - What's unclear: Should Phase 25 implement expiration, or defer?
   - Recommendation: Defer to future phase. Core lifecycle (send/accept/decline) is sufficient for MVP.

3. **Blocking Flow**
   - What we know: FRND-07 includes "block user" requirement
   - What's unclear: Is blocking from friend request, profile, or both?
   - Recommendation: Add "Block" option in decline confirmation or as third option on incoming requests. Simple update to status='blocked'.

4. **Notification Deep Link**
   - What we know: Notification data includes `screen` field
   - What's unclear: How does app handle deep links from notifications?
   - Recommendation: Check existing notification handling in `app/_layout.tsx` or `App.tsx`. May need to add handling for 'requests' and 'member' screens.

## Sources

### Primary (HIGH confidence)
- Existing migration `20260210000001_v1.4_friends_system_foundation.sql` - Complete friend_requests schema, accept_friend_request RPC
- Existing migration `20260202000008_gift_leader_notifications.sql` - Notification trigger pattern template
- Existing service `lib/friends.ts` - Service function patterns (getFriends, removeFriend)
- Existing Edge Function `supabase/functions/push/index.ts` - Push notification infrastructure
- Existing screen `app/(app)/(tabs)/friends.tsx` - Screen structure pattern
- Existing screen `app/(app)/member/[id].tsx` - Profile page to add request button

### Secondary (MEDIUM confidence)
- Phase 23 RESEARCH.md - Database design rationale, RLS policies
- Phase 24 RESEARCH.md - Service layer patterns, tab screen patterns
- PITFALLS-FRIENDS.md - Rate limiting (Pitfall #7), request lifecycle (Pitfall #12)

### Tertiary (LOW confidence, validate during implementation)
- Deep link handling needs verification against existing notification handlers
- Badge count implementation depends on expo-router tab badge support

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all libraries already in use
- Architecture: HIGH - Patterns proven throughout codebase (notifications, services, screens)
- Pitfalls: HIGH - Clear understanding from PITFALLS research and existing trigger patterns

**Research date:** 2026-02-09
**Valid until:** 60 days (stable React Native patterns, database triggers well-understood)
