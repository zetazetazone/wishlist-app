/**
 * Birthdays Library
 * Query birthdays from all user groups for calendar display
 */

import { supabase } from './supabase';

// Color palette for groups (8 distinct colors)
const GROUP_COLORS = [
  '#8B1538', // Burgundy (app primary)
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#E91E63', // Pink
  '#795548', // Brown
] as const;

// Type for birthday data with group info
export interface GroupBirthday {
  userId: string;
  userName: string;
  birthday: string; // YYYY-MM-DD format
  groupId: string;
  groupName: string;
  groupColor: string;
  avatarUrl: string | null;
}

/**
 * Get all birthdays from groups the user belongs to
 *
 * Returns birthdays for all group members (including the current user)
 * across all groups the user is a member of.
 *
 * Each group gets a unique color from the palette based on order.
 */
export async function getGroupBirthdays(userId: string): Promise<GroupBirthday[]> {
  // First get all groups the user is a member of
  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select(`
      group_id,
      groups (
        id,
        name
      )
    `)
    .eq('user_id', userId);

  if (memberError) {
    throw new Error(`Failed to fetch group memberships: ${memberError.message}`);
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  // Create a map of group IDs to their info and colors
  const groupMap = new Map<string, { name: string; color: string }>();
  memberships.forEach((m: any, index: number) => {
    if (m.groups) {
      groupMap.set(m.groups.id, {
        name: m.groups.name,
        color: GROUP_COLORS[index % GROUP_COLORS.length],
      });
    }
  });

  const groupIds = Array.from(groupMap.keys());

  // Get all members of these groups
  const { data: allMembers, error: membersError } = await supabase
    .from('group_members')
    .select('group_id, user_id')
    .in('group_id', groupIds);

  if (membersError) {
    throw new Error(`Failed to fetch group members: ${membersError.message}`);
  }

  if (!allMembers || allMembers.length === 0) {
    return [];
  }

  // Collect all unique user IDs
  const userIds = new Set<string>();
  allMembers.forEach(m => userIds.add(m.user_id));

  // Fetch user profiles for birthdays and names
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, birthday, avatar_url')
    .in('id', Array.from(userIds));

  // Also try users table as fallback
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, birthday, avatar_url')
    .in('id', Array.from(userIds));

  // Create lookup maps
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  const userMap = new Map(users?.map(u => [u.id, u]) || []);

  // Build the birthday list
  const birthdays: GroupBirthday[] = [];

  allMembers.forEach(member => {
    const profile = profileMap.get(member.user_id);
    const user = userMap.get(member.user_id);
    const groupInfo = groupMap.get(member.group_id);

    if (!groupInfo) return;

    // Get birthday from profile or user
    const birthday = profile?.birthday || user?.birthday;
    if (!birthday) return; // Skip users without birthdays

    // Get display name
    const userName = profile?.display_name || user?.full_name || 'Unknown';

    // Get avatar
    const avatarUrl = profile?.avatar_url || user?.avatar_url || null;

    birthdays.push({
      userId: member.user_id,
      userName,
      birthday,
      groupId: member.group_id,
      groupName: groupInfo.name,
      groupColor: groupInfo.color,
      avatarUrl,
    });
  });

  return birthdays;
}

/**
 * Get birthdays for a specific date (month-day matching)
 *
 * Returns birthdays that match the given date's month and day,
 * regardless of year.
 */
export function filterBirthdaysForDate(
  birthdays: GroupBirthday[],
  dateString: string // YYYY-MM-DD format
): GroupBirthday[] {
  const [, month, day] = dateString.split('-');

  return birthdays.filter(b => {
    const [, bMonth, bDay] = b.birthday.split('-');
    return bMonth === month && bDay === day;
  });
}

/**
 * Get unique group colors map for calendar marking
 */
export function getGroupColorsMap(birthdays: GroupBirthday[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  birthdays.forEach(b => {
    if (!colorMap.has(b.groupId)) {
      colorMap.set(b.groupId, b.groupColor);
    }
  });
  return colorMap;
}
