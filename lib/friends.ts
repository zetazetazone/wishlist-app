/**
 * Friends Library
 * Friend management service for the Friends tab
 *
 * SECURITY: RLS Pattern: Bidirectional Friendship
 * - Users can view friends where they are either user_a or user_b
 * - Users can remove friendships they are part of
 * - Friendships are created only via accept_friend_request RPC (not direct INSERT)
 *
 * Query Pattern: Bidirectional OR
 * - The friends table stores friendships with user_a_id < user_b_id constraint
 * - To find all friends, we must query both directions:
 *   WHERE user_a_id = me OR user_b_id = me
 * - The friend's ID is the OTHER column (ternary extraction)
 */

import { supabase } from './supabase';
import { getAvatarUrl } from './storage';

/**
 * Friend with profile information for display
 *
 * The friendship row ID is needed for deletion operations.
 * The friend_user_id is the friend's actual user ID (for navigation).
 */
export interface FriendWithProfile {
  /** Friendship row ID (used for deletion) */
  id: string;
  /** The friend's user ID (navigate to /member/[friend_user_id]) */
  friend_user_id: string;
  /** When the friendship was created */
  created_at: string;
  /** Friend's profile information */
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
 * Query Strategy:
 * 1. Query friends table with bidirectional OR (user can be user_a or user_b)
 * 2. Extract friend IDs using ternary (the OTHER user in each row)
 * 3. Batch-fetch friend profiles from user_profiles
 * 4. Convert avatar_url storage paths to public URLs
 *
 * @returns Array of friends with profile info, sorted by friendship date (newest first)
 */
export async function getFriends(): Promise<FriendWithProfile[]> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('getFriends: Not authenticated');
    return [];
  }

  // Query friends table with bidirectional OR
  // User can be either user_a_id or user_b_id in the friendship row
  const { data: friendships, error } = await supabase
    .from('friends')
    .select('id, user_a_id, user_b_id, created_at')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch friends:', error);
    return [];
  }

  if (!friendships || friendships.length === 0) {
    return [];
  }

  // Extract friend IDs (the OTHER user in each friendship row)
  // If I'm user_a, my friend is user_b (and vice versa)
  const friendIds = friendships.map((f) =>
    f.user_a_id === user.id ? f.user_b_id : f.user_a_id
  );

  // Batch-fetch friend profiles
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url, birthday')
    .in('id', friendIds);

  if (profileError) {
    console.error('Failed to fetch friend profiles:', profileError);
    // Return friendships without profile data rather than failing completely
  }

  // Build profile lookup map
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  // Combine friendship data with profile data
  return friendships.map((f) => {
    const friendUserId = f.user_a_id === user.id ? f.user_b_id : f.user_a_id;
    const profile = profileMap.get(friendUserId);

    return {
      id: f.id,
      friend_user_id: friendUserId,
      created_at: f.created_at,
      friend: profile
        ? {
            id: profile.id,
            display_name: profile.display_name,
            // Convert storage path to public URL for display
            avatar_url: getAvatarUrl(profile.avatar_url),
            birthday: profile.birthday,
          }
        : undefined,
    };
  });
}

/**
 * Remove a friendship
 *
 * RLS Policy "Users can unfriend" authorizes this delete if:
 * - The current user is either user_a_id or user_b_id in the friendship row
 *
 * @param friendshipId - UUID of the friendship row to delete
 * @throws Error if delete fails (including RLS violation)
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

// ============================================================================
// Friend Request Types and Functions
// ============================================================================

/**
 * Friend request with profile information for display
 *
 * For incoming requests, profile is the sender's info
 * For outgoing requests, profile is the receiver's info
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
 * Get pending friend requests for the current user
 *
 * Returns both:
 * - incoming: requests where I am the receiver (to_user_id = me)
 * - outgoing: requests where I am the sender (from_user_id = me)
 *
 * @returns Object with incoming and outgoing arrays of requests with profiles
 */
export async function getPendingRequests(): Promise<{
  incoming: FriendRequestWithProfile[];
  outgoing: FriendRequestWithProfile[];
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('getPendingRequests: Not authenticated');
    return { incoming: [], outgoing: [] };
  }

  // Query pending requests (both directions)
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

  // Separate incoming and outgoing
  const incoming = requests.filter((r) => r.to_user_id === user.id);
  const outgoing = requests.filter((r) => r.from_user_id === user.id);

  // Collect all user IDs we need profiles for
  // For incoming: need sender profiles (from_user_id)
  // For outgoing: need receiver profiles (to_user_id)
  const incomingSenderIds = incoming.map((r) => r.from_user_id);
  const outgoingReceiverIds = outgoing.map((r) => r.to_user_id);
  const allProfileIds = Array.from(new Set([...incomingSenderIds, ...outgoingReceiverIds]));

  if (allProfileIds.length === 0) {
    return { incoming: [], outgoing: [] };
  }

  // Batch-fetch profiles
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .in('id', allProfileIds);

  if (profileError) {
    console.error('Failed to fetch request profiles:', profileError);
  }

  // Build profile lookup map
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  // Map incoming requests with sender profiles
  const incomingWithProfiles: FriendRequestWithProfile[] = incoming.map((r) => {
    const profile = profileMap.get(r.from_user_id);
    return {
      ...r,
      profile: profile
        ? {
            id: profile.id,
            display_name: profile.display_name,
            avatar_url: getAvatarUrl(profile.avatar_url),
          }
        : undefined,
    };
  });

  // Map outgoing requests with receiver profiles
  const outgoingWithProfiles: FriendRequestWithProfile[] = outgoing.map((r) => {
    const profile = profileMap.get(r.to_user_id);
    return {
      ...r,
      profile: profile
        ? {
            id: profile.id,
            display_name: profile.display_name,
            avatar_url: getAvatarUrl(profile.avatar_url),
          }
        : undefined,
    };
  });

  return {
    incoming: incomingWithProfiles,
    outgoing: outgoingWithProfiles,
  };
}

/**
 * Send a friend request to another user
 *
 * Validates:
 * - Not sending to self
 * - Not blocked by/blocking target user
 * - Rate limit: max 20 requests per hour
 * - No duplicate pending request
 *
 * @param toUserId - UUID of the user to send request to
 * @throws Error if blocked, rate limited, or duplicate request
 */
export async function sendFriendRequest(toUserId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  if (user.id === toUserId) {
    throw new Error('Cannot send friend request to yourself');
  }

  // Check if either user has blocked the other
  const { data: blockedRecord } = await supabase
    .from('friend_requests')
    .select('id')
    .or(
      `and(from_user_id.eq.${user.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${user.id})`
    )
    .eq('status', 'blocked')
    .maybeSingle();

  if (blockedRecord) {
    throw new Error('Cannot send request to this user');
  }

  // Check rate limit: max 20 requests in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('friend_requests')
    .select('id', { count: 'exact', head: true })
    .eq('from_user_id', user.id)
    .gte('created_at', oneHourAgo);

  if (count !== null && count >= 20) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Insert friend request
  const { error } = await supabase.from('friend_requests').insert({
    from_user_id: user.id,
    to_user_id: toUserId,
    status: 'pending',
  });

  if (error) {
    // Handle unique constraint violation (duplicate request)
    if (error.code === '23505') {
      throw new Error('Friend request already pending');
    }
    console.error('Failed to send friend request:', error);
    throw new Error(`Failed to send friend request: ${error.message}`);
  }
}

/**
 * Accept a friend request
 *
 * Uses the accept_friend_request RPC which:
 * 1. Updates request status to 'accepted'
 * 2. Creates the friendship row in friends table
 *
 * @param requestId - UUID of the friend request to accept
 * @returns The friendship ID of the newly created friendship
 * @throws Error if request not found or not authorized
 */
export async function acceptFriendRequest(requestId: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_friend_request', {
    p_request_id: requestId,
  });

  if (error) {
    console.error('Failed to accept friend request:', error);
    throw new Error(`Failed to accept friend request: ${error.message}`);
  }

  return data as string;
}

/**
 * Decline a friend request
 *
 * Updates request status to 'rejected'
 * RLS policy allows receiver to update status
 *
 * @param requestId - UUID of the friend request to decline
 * @throws Error if request not found or not authorized
 */
export async function declineFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);

  if (error) {
    console.error('Failed to decline friend request:', error);
    throw new Error(`Failed to decline friend request: ${error.message}`);
  }
}

/**
 * Cancel an outgoing friend request
 *
 * Deletes the pending request
 * RLS policy allows sender to delete their own pending requests
 *
 * @param requestId - UUID of the friend request to cancel
 * @throws Error if request not found or not authorized
 */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error('Failed to cancel friend request:', error);
    throw new Error(`Failed to cancel friend request: ${error.message}`);
  }
}

/**
 * Get relationship status with another user
 *
 * Used to determine which button to show on profile:
 * - 'friends': Already friends - show Remove Friend
 * - 'pending_incoming': They sent me a request - show Accept/Decline
 * - 'pending_outgoing': I sent them a request - show Cancel Request
 * - 'blocked': One of us blocked the other - show nothing or Unblock
 * - 'none': No relationship - show Add Friend
 *
 * @param otherUserId - UUID of the other user
 * @returns Relationship status string
 */
export async function getRelationshipStatus(
  otherUserId: string
): Promise<'friends' | 'pending_incoming' | 'pending_outgoing' | 'blocked' | 'none'> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 'none';
  }

  // Check if already friends using the are_friends RPC
  const { data: areFriends } = await supabase.rpc('are_friends', {
    p_user_a: user.id,
    p_user_b: otherUserId,
  });

  if (areFriends) {
    return 'friends';
  }

  // Check for pending or blocked requests
  const { data: request } = await supabase
    .from('friend_requests')
    .select('from_user_id, to_user_id, status')
    .or(
      `and(from_user_id.eq.${user.id},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${user.id})`
    )
    .in('status', ['pending', 'blocked'])
    .maybeSingle();

  if (!request) {
    return 'none';
  }

  if (request.status === 'blocked') {
    return 'blocked';
  }

  // Pending request
  if (request.from_user_id === user.id) {
    return 'pending_outgoing';
  } else {
    return 'pending_incoming';
  }
}

/**
 * Block a user
 *
 * If a pending request exists between users, updates it to blocked
 * If no request exists, creates a new blocked request
 *
 * @param userId - UUID of the user to block
 * @throws Error if block operation fails
 */
export async function blockUser(userId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Check for existing request in either direction
  const { data: existingRequest } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, to_user_id')
    .or(
      `and(from_user_id.eq.${user.id},to_user_id.eq.${userId}),and(from_user_id.eq.${userId},to_user_id.eq.${user.id})`
    )
    .maybeSingle();

  if (existingRequest) {
    // Update existing request to blocked
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'blocked' })
      .eq('id', existingRequest.id);

    if (error) {
      console.error('Failed to block user:', error);
      throw new Error(`Failed to block user: ${error.message}`);
    }
  } else {
    // Create new blocked request
    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: user.id,
      to_user_id: userId,
      status: 'blocked',
    });

    if (error) {
      console.error('Failed to block user:', error);
      throw new Error(`Failed to block user: ${error.message}`);
    }
  }
}
