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
