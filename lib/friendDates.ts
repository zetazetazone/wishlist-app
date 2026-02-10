/**
 * Friend Dates Library
 * Query friend birthdays and public dates for calendar display
 *
 * Pattern: Friend dates use teal color (#0D9488) distinct from group colors
 * Query Strategy: Bidirectional friends → batch-fetch profiles + public_dates
 */

import { supabase } from './supabase';
import { getAvatarUrl } from './storage';

// Teal color for all friend dates (birthdays and public dates)
export const FRIEND_DATE_COLOR = '#0D9488';

/**
 * Friend date entry for calendar display
 *
 * Represents either a friend's birthday or public date.
 * All friend dates use the same teal color for visual consistency.
 */
export interface FriendDate {
  /** Unique identifier: 'friend-birthday-{userId}' or 'friend-date-{dateId}' */
  id: string;
  /** Always 'friend' for friend dates */
  source: 'friend';
  /** Type of date: birthday or public_date */
  type: 'birthday' | 'public_date';
  /** Date string in YYYY-MM-DD format (current year for display) */
  date: string;
  /** Month (1-12, database format) */
  month: number;
  /** Day (1-31) */
  day: number;
  /** Title: person's name for birthdays, date title for public dates */
  title: string;
  /** Friend's display name */
  friendName: string;
  /** Friend's user ID */
  friendId: string;
  /** Avatar URL for birthdays, null for public dates */
  avatarUrl: string | null;
  /** Color for calendar dot (always FRIEND_DATE_COLOR) */
  color: string;
}

/**
 * Get all friend birthdays and public dates for the current user
 *
 * Query Strategy:
 * 1. Query friends table with bidirectional OR (user can be user_a or user_b)
 * 2. Extract friend IDs using ternary (the OTHER user in each row)
 * 3. Batch-fetch friend profiles (for birthdays)
 * 4. Batch-fetch friend public_dates
 * 5. Transform both to FriendDate objects with teal color
 *
 * @returns Array of friend dates (birthdays + public dates), sorted by date
 */
export async function getFriendDates(): Promise<FriendDate[]> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('getFriendDates: Not authenticated');
    return [];
  }

  // Query friends table with bidirectional OR
  // User can be either user_a_id or user_b_id in the friendship row
  const { data: friendships, error: friendError } = await supabase
    .from('friends')
    .select('id, user_a_id, user_b_id')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

  if (friendError) {
    console.error('Failed to fetch friends:', friendError);
    return [];
  }

  if (!friendships || friendships.length === 0) {
    return [];
  }

  // Extract friend IDs (the OTHER user in each friendship row)
  const friendIds = friendships.map((f) =>
    f.user_a_id === user.id ? f.user_b_id : f.user_a_id
  );

  // Batch-fetch friend profiles (for birthdays)
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url, birthday')
    .in('id', friendIds);

  if (profileError) {
    console.error('Failed to fetch friend profiles:', profileError);
  }

  // Batch-fetch friend public dates
  const { data: publicDates, error: publicDatesError } = await supabase
    .from('public_dates')
    .select('id, user_id, title, month, day, year')
    .in('user_id', friendIds);

  if (publicDatesError) {
    console.error('Failed to fetch friend public dates:', publicDatesError);
  }

  // Create profile lookup map for efficient access
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  const friendDates: FriendDate[] = [];
  const currentYear = new Date().getFullYear();

  // Transform friend birthdays to FriendDate objects
  profiles?.forEach((profile) => {
    if (!profile.birthday) return; // Skip users without birthdays

    // Parse birthday string to extract month/day
    // Birthday format: YYYY-MM-DD (e.g., "1990-03-15")
    const parts = profile.birthday.split('-').map(Number);
    const [, month, day] = parts;

    // Construct date string using current year for display
    const dateString = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    friendDates.push({
      id: `friend-birthday-${profile.id}`,
      source: 'friend',
      type: 'birthday',
      date: dateString,
      month,
      day,
      title: profile.display_name || 'Friend',
      friendName: profile.display_name || 'Friend',
      friendId: profile.id,
      avatarUrl: getAvatarUrl(profile.avatar_url),
      color: FRIEND_DATE_COLOR,
    });
  });

  // Transform friend public dates to FriendDate objects
  publicDates?.forEach((publicDate) => {
    const profile = profileMap.get(publicDate.user_id);
    if (!profile) return; // Skip if profile not found

    // Use specified year if present, otherwise use current year for recurring dates
    const year = publicDate.year || currentYear;

    // Construct date string for display
    const dateString = `${year}-${String(publicDate.month).padStart(2, '0')}-${String(publicDate.day).padStart(2, '0')}`;

    friendDates.push({
      id: `friend-date-${publicDate.id}`,
      source: 'friend',
      type: 'public_date',
      date: dateString,
      month: publicDate.month,
      day: publicDate.day,
      title: publicDate.title,
      friendName: profile.display_name || 'Friend',
      friendId: publicDate.user_id,
      avatarUrl: null, // Public dates don't show avatars
      color: FRIEND_DATE_COLOR,
    });
  });

  return friendDates;
}
