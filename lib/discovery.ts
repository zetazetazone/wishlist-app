/**
 * Discovery Library
 * User search and discovery service for finding friends
 *
 * PURPOSE: Enables user search by name/email in "Find Friends" feature.
 * Complements contact import by allowing users to find people who:
 * - Don't have a phone number in contacts
 * - Haven't imported contacts themselves
 * - Prefer to search directly by name/email
 *
 * SEARCH BEHAVIOR:
 * - Minimum 2 characters required (prevents empty/single-char spam queries)
 * - Results limited to 20 by the search_users RPC function
 * - Results ordered by match quality (exact > starts-with > contains)
 * - Excludes current user and blocked users (handled by RPC)
 */

import { supabase } from './supabase';
import { getRelationshipStatus } from './friends';
import { getAvatarUrl } from './storage';

// ============================================================================
// Types
// ============================================================================

/**
 * A user found via search
 */
export interface SearchResult {
  /** User's ID in our system */
  userId: string;
  /** User's display name */
  displayName: string;
  /** User's email address */
  email: string;
  /** Public URL to user's avatar, or null */
  avatarUrl: string | null;
  /** Current relationship status with this user */
  relationshipStatus: 'none' | 'pending_incoming' | 'pending_outgoing' | 'friends';
}

// ============================================================================
// User Search
// ============================================================================

/**
 * Search for users by name or email
 *
 * Uses ILIKE for case-insensitive partial matching.
 * Search results are ordered by match quality:
 * 1. Exact name match
 * 2. Name starts with query
 * 3. Name contains query or email matches
 *
 * Results exclude:
 * - Current user (you don't want to friend yourself)
 * - Blocked users (either direction)
 *
 * @param query - Search query (name or email)
 * @returns Array of search results with relationship status
 */
export async function searchUsers(query: string): Promise<SearchResult[]> {
  // Minimum 2 characters to prevent overly broad searches
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

  // Enrich with relationship status for each result
  const results: SearchResult[] = [];

  for (const user of data || []) {
    const relationshipStatus = await getRelationshipStatus(user.user_id);

    // Skip blocked users (shouldn't happen as RPC filters them, but handle defensively)
    if (relationshipStatus === 'blocked') {
      continue;
    }

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
