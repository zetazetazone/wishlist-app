/**
 * Celebrations Library
 * Gift Leader assignment, celebration CRUD, and contribution tracking
 */

import { supabase } from './supabase';
import type { Database } from '../types/database.types';

// Types from database
type CelebrationRow = Database['public']['Tables']['celebrations']['Row'];
type GiftLeaderHistoryInsert = Database['public']['Tables']['gift_leader_history']['Insert'];

// Extended celebration type with relations
export interface Celebration extends CelebrationRow {
  celebrant?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    full_name?: string | null;
  };
  gift_leader?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    full_name?: string | null;
  };
  total_contributed?: number;
  group?: {
    id: string;
    name: string;
    mode?: 'greetings' | 'gifts';
  };
}

// Celebration with full details including history
export interface CelebrationDetail extends Celebration {
  chat_room?: {
    id: string;
    created_at: string;
  };
  gift_leader_history?: Array<{
    id: string;
    assigned_to: string | null;
    assigned_by: string | null;
    reason: 'auto_rotation' | 'manual_reassign' | 'member_left';
    created_at: string;
    assigned_to_user?: {
      display_name: string | null;
      full_name?: string | null;
    };
    assigned_by_user?: {
      display_name: string | null;
      full_name?: string | null;
    };
  }>;
  group_members?: Array<{
    user_id: string;
    role: 'admin' | 'member';
    user?: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
      full_name?: string | null;
    };
  }>;
}

// Member with birthday for Gift Leader calculation
interface MemberWithBirthday {
  user_id: string;
  birthday_month: number | null;
  birthday_day: number | null;
}

/**
 * Get the next Gift Leader based on birthday rotation
 *
 * Algorithm:
 * 1. Get all group members with their birthdays
 * 2. Sort by birthday (month-day, not year)
 * 3. Find celebrant position in sorted list
 * 4. Return the next person in rotation (wraps around)
 *
 * Edge cases:
 * - 2-person group: other person is always leader
 * - Same birthday: use user_id as stable tiebreaker
 * - < 2 members: throw error
 */
export async function getNextGiftLeader(
  groupId: string,
  celebrantId: string
): Promise<string> {
  // Query to get group members with birthday data
  // We need to join with user_profiles or users table
  const { data: members, error } = await supabase
    .from('group_members')
    .select(`
      user_id,
      users!inner (
        birthday
      )
    `)
    .eq('group_id', groupId);

  if (error) {
    throw new Error(`Failed to fetch group members: ${error.message}`);
  }

  if (!members || members.length < 2) {
    throw new Error('Group needs at least 2 members for Gift Leader assignment');
  }

  // Transform and extract birthday components
  const membersWithBirthday: MemberWithBirthday[] = members.map((m: any) => {
    const birthday = m.users?.birthday;
    let birthday_month: number | null = null;
    let birthday_day: number | null = null;

    if (birthday) {
      const date = new Date(birthday);
      birthday_month = date.getMonth() + 1; // 1-12
      birthday_day = date.getDate();
    }

    return {
      user_id: m.user_id,
      birthday_month,
      birthday_day,
    };
  });

  // Sort by birthday (month-day), with user_id as stable tiebreaker
  // Members without birthdays go to the end
  const sortedMembers = membersWithBirthday.sort((a, b) => {
    // Null birthdays go last
    if (a.birthday_month === null && b.birthday_month === null) {
      return a.user_id.localeCompare(b.user_id);
    }
    if (a.birthday_month === null) return 1;
    if (b.birthday_month === null) return -1;

    // Compare month
    if (a.birthday_month !== b.birthday_month) {
      return a.birthday_month - b.birthday_month;
    }

    // Compare day
    if (a.birthday_day !== b.birthday_day) {
      return (a.birthday_day || 1) - (b.birthday_day || 1);
    }

    // Same birthday - use user_id as stable tiebreaker
    return a.user_id.localeCompare(b.user_id);
  });

  // Find celebrant position in sorted list
  const celebrantIndex = sortedMembers.findIndex(m => m.user_id === celebrantId);

  if (celebrantIndex === -1) {
    throw new Error('Celebrant not found in group members');
  }

  // Edge case: 2-person group - the other person is always leader
  if (sortedMembers.length === 2) {
    return sortedMembers[celebrantIndex === 0 ? 1 : 0].user_id;
  }

  // Next person in rotation (wraps around with modulo)
  const nextIndex = (celebrantIndex + 1) % sortedMembers.length;

  return sortedMembers[nextIndex].user_id;
}

/**
 * Create a new celebration with auto-assigned Gift Leader
 *
 * This function:
 * 1. Validates user is a group member
 * 2. Calculates the next Gift Leader using birthday rotation
 * 3. Creates the celebration record
 * 4. Creates the associated chat room
 * 5. Records the Gift Leader assignment in history
 */
export async function createCelebration(
  groupId: string,
  celebrantId: string,
  eventDate: Date
): Promise<Celebration> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify current user is a group member (and admin)
  const { data: membership, error: memberError } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership) {
    throw new Error('You must be a group member to create celebrations');
  }

  if (membership.role !== 'admin') {
    throw new Error('Only group admins can create celebrations');
  }

  // Get the Gift Leader using birthday rotation
  const giftLeaderId = await getNextGiftLeader(groupId, celebrantId);

  // Create the celebration
  const year = eventDate.getFullYear();
  const eventDateStr = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  const { data: celebration, error: celebrationError } = await supabase
    .from('celebrations')
    .insert({
      group_id: groupId,
      celebrant_id: celebrantId,
      event_date: eventDateStr,
      year,
      gift_leader_id: giftLeaderId,
      status: 'upcoming',
    })
    .select()
    .single();

  if (celebrationError) {
    throw new Error(`Failed to create celebration: ${celebrationError.message}`);
  }

  // Create the chat room for this celebration
  const { error: chatRoomError } = await supabase
    .from('chat_rooms')
    .insert({
      celebration_id: celebration.id,
    });

  if (chatRoomError) {
    console.error('Failed to create chat room:', chatRoomError);
    // Non-fatal - celebration was created successfully
  }

  // Record the Gift Leader assignment in history
  const { error: historyError } = await supabase
    .from('gift_leader_history')
    .insert({
      celebration_id: celebration.id,
      assigned_to: giftLeaderId,
      assigned_by: null, // NULL means auto-assigned
      reason: 'auto_rotation',
    } as GiftLeaderHistoryInsert);

  if (historyError) {
    console.error('Failed to record gift leader history:', historyError);
    // Non-fatal - celebration was created successfully
  }

  return celebration;
}

/**
 * Reassign Gift Leader for a celebration
 *
 * Only group admins can perform this action.
 * Records the reassignment in gift_leader_history.
 */
export async function reassignGiftLeader(
  celebrationId: string,
  newLeaderId: string
): Promise<void> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get the celebration to verify group membership and admin role
  const { data: celebration, error: celebrationError } = await supabase
    .from('celebrations')
    .select('group_id, celebrant_id')
    .eq('id', celebrationId)
    .single();

  if (celebrationError || !celebration) {
    throw new Error('Celebration not found');
  }

  // Verify new leader is not the celebrant
  if (newLeaderId === celebration.celebrant_id) {
    throw new Error('Cannot assign celebrant as Gift Leader');
  }

  // Verify current user is group admin
  const { data: membership, error: memberError } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', celebration.group_id)
    .eq('user_id', user.id)
    .single();

  if (memberError || !membership || membership.role !== 'admin') {
    throw new Error('Only group admins can reassign Gift Leaders');
  }

  // Verify new leader is a group member
  const { data: newLeaderMembership, error: newLeaderError } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', celebration.group_id)
    .eq('user_id', newLeaderId)
    .single();

  if (newLeaderError || !newLeaderMembership) {
    throw new Error('New Gift Leader must be a group member');
  }

  // Update the celebration
  const { error: updateError } = await supabase
    .from('celebrations')
    .update({ gift_leader_id: newLeaderId, updated_at: new Date().toISOString() })
    .eq('id', celebrationId);

  if (updateError) {
    throw new Error(`Failed to update Gift Leader: ${updateError.message}`);
  }

  // Record the reassignment in history
  const { error: historyError } = await supabase
    .from('gift_leader_history')
    .insert({
      celebration_id: celebrationId,
      assigned_to: newLeaderId,
      assigned_by: user.id, // Current user performed the reassignment
      reason: 'manual_reassign',
    } as GiftLeaderHistoryInsert);

  if (historyError) {
    console.error('Failed to record gift leader history:', historyError);
    // Non-fatal - reassignment was successful
  }
}

/**
 * Get all celebrations accessible to the current user
 *
 * Returns celebrations where:
 * - User is a group member
 * - User is NOT the celebrant (they shouldn't see coordination details)
 *
 * Includes celebrant info, gift leader info, and contribution totals.
 * Ordered by event_date ASC (upcoming first).
 */
export async function getCelebrations(userId: string): Promise<Celebration[]> {
  // First get all groups the user is a member of
  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (memberError) {
    throw new Error(`Failed to fetch group memberships: ${memberError.message}`);
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const groupIds = memberships.map(m => m.group_id);

  // Get celebrations for those groups, excluding where user is celebrant
  const { data: celebrations, error: celebrationsError } = await supabase
    .from('celebrations')
    .select(`
      *,
      groups (
        id,
        name
      )
    `)
    .in('group_id', groupIds)
    .neq('celebrant_id', userId) // Exclude user's own celebrations
    .order('event_date', { ascending: true });

  if (celebrationsError) {
    throw new Error(`Failed to fetch celebrations: ${celebrationsError.message}`);
  }

  if (!celebrations || celebrations.length === 0) {
    return [];
  }

  // Collect all user IDs we need to fetch (celebrants and gift leaders)
  const userIds = new Set<string>();
  celebrations.forEach(c => {
    userIds.add(c.celebrant_id);
    if (c.gift_leader_id) {
      userIds.add(c.gift_leader_id);
    }
  });

  // Fetch user info for celebrants and gift leaders
  // Try user_profiles first, fall back to users table
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .in('id', Array.from(userIds));

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, avatar_url')
    .in('id', Array.from(userIds));

  // Create lookup maps
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  const userMap = new Map(users?.map(u => [u.id, u]) || []);

  // Get contribution totals for each celebration
  const celebrationIds = celebrations.map(c => c.id);
  const { data: contributions } = await supabase
    .from('celebration_contributions')
    .select('celebration_id, amount')
    .in('celebration_id', celebrationIds);

  // Calculate totals per celebration
  const totalsMap = new Map<string, number>();
  contributions?.forEach(c => {
    const current = totalsMap.get(c.celebration_id) || 0;
    totalsMap.set(c.celebration_id, current + Number(c.amount));
  });

  // Build the result with enriched data
  return celebrations.map((c: any) => {
    const celebrantProfile = profileMap.get(c.celebrant_id);
    const celebrantUser = userMap.get(c.celebrant_id);
    const giftLeaderProfile = c.gift_leader_id ? profileMap.get(c.gift_leader_id) : null;
    const giftLeaderUser = c.gift_leader_id ? userMap.get(c.gift_leader_id) : null;

    return {
      ...c,
      group: c.groups,
      celebrant: {
        id: c.celebrant_id,
        display_name: celebrantProfile?.display_name || celebrantUser?.full_name || null,
        avatar_url: celebrantProfile?.avatar_url || celebrantUser?.avatar_url || null,
        full_name: celebrantUser?.full_name,
      },
      gift_leader: c.gift_leader_id ? {
        id: c.gift_leader_id,
        display_name: giftLeaderProfile?.display_name || giftLeaderUser?.full_name || null,
        avatar_url: giftLeaderProfile?.avatar_url || giftLeaderUser?.avatar_url || null,
        full_name: giftLeaderUser?.full_name,
      } : undefined,
      total_contributed: totalsMap.get(c.id) || 0,
    };
  });
}

/**
 * Get a single celebration with full details
 *
 * RLS handles celebrant exclusion automatically.
 * Includes chat room, gift leader history, and group members.
 */
export async function getCelebration(celebrationId: string): Promise<CelebrationDetail | null> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Fetch celebration with related data
  const { data: celebration, error: celebrationError } = await supabase
    .from('celebrations')
    .select(`
      *,
      groups (
        id,
        name,
        mode
      )
    `)
    .eq('id', celebrationId)
    .single();

  if (celebrationError) {
    if (celebrationError.code === 'PGRST116') {
      // No rows returned - either doesn't exist or RLS blocked
      return null;
    }
    throw new Error(`Failed to fetch celebration: ${celebrationError.message}`);
  }

  if (!celebration) {
    return null;
  }

  // Fetch chat room (RLS will exclude celebrant)
  const { data: chatRoom } = await supabase
    .from('chat_rooms')
    .select('id, created_at')
    .eq('celebration_id', celebrationId)
    .single();

  // Fetch gift leader history
  const { data: history } = await supabase
    .from('gift_leader_history')
    .select('*')
    .eq('celebration_id', celebrationId)
    .order('created_at', { ascending: false });

  // Fetch group members
  const { data: members } = await supabase
    .from('group_members')
    .select(`
      user_id,
      role
    `)
    .eq('group_id', celebration.group_id);

  // Get user info for celebrant, gift leader, and members
  const userIds = new Set<string>();
  userIds.add(celebration.celebrant_id);
  if (celebration.gift_leader_id) {
    userIds.add(celebration.gift_leader_id);
  }
  members?.forEach(m => userIds.add(m.user_id));
  history?.forEach(h => {
    if (h.assigned_to) userIds.add(h.assigned_to);
    if (h.assigned_by) userIds.add(h.assigned_by);
  });

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .in('id', Array.from(userIds));

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, avatar_url')
    .in('id', Array.from(userIds));

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  const userMap = new Map(users?.map(u => [u.id, u]) || []);

  // Get contribution total
  const { data: contributions } = await supabase
    .from('celebration_contributions')
    .select('amount')
    .eq('celebration_id', celebrationId);

  const totalContributed = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

  // Build celebrant info
  const celebrantProfile = profileMap.get(celebration.celebrant_id);
  const celebrantUser = userMap.get(celebration.celebrant_id);

  // Build gift leader info
  let giftLeaderInfo = undefined;
  if (celebration.gift_leader_id) {
    const glProfile = profileMap.get(celebration.gift_leader_id);
    const glUser = userMap.get(celebration.gift_leader_id);
    giftLeaderInfo = {
      id: celebration.gift_leader_id,
      display_name: glProfile?.display_name || glUser?.full_name || null,
      avatar_url: glProfile?.avatar_url || glUser?.avatar_url || null,
      full_name: glUser?.full_name,
    };
  }

  // Build history with user info
  const enrichedHistory = history?.map(h => {
    const assignedToProfile = h.assigned_to ? profileMap.get(h.assigned_to) : null;
    const assignedToUser = h.assigned_to ? userMap.get(h.assigned_to) : null;
    const assignedByProfile = h.assigned_by ? profileMap.get(h.assigned_by) : null;
    const assignedByUser = h.assigned_by ? userMap.get(h.assigned_by) : null;

    return {
      ...h,
      assigned_to_user: h.assigned_to ? {
        display_name: assignedToProfile?.display_name || assignedToUser?.full_name || null,
        full_name: assignedToUser?.full_name,
      } : undefined,
      assigned_by_user: h.assigned_by ? {
        display_name: assignedByProfile?.display_name || assignedByUser?.full_name || null,
        full_name: assignedByUser?.full_name,
      } : undefined,
    };
  });

  // Build group members with user info
  const enrichedMembers = members?.map(m => {
    const memberProfile = profileMap.get(m.user_id);
    const memberUser = userMap.get(m.user_id);
    return {
      ...m,
      user: {
        id: m.user_id,
        display_name: memberProfile?.display_name || memberUser?.full_name || null,
        avatar_url: memberProfile?.avatar_url || memberUser?.avatar_url || null,
        full_name: memberUser?.full_name,
      },
    };
  });

  return {
    ...celebration,
    group: (celebration as any).groups,
    celebrant: {
      id: celebration.celebrant_id,
      display_name: celebrantProfile?.display_name || celebrantUser?.full_name || null,
      avatar_url: celebrantProfile?.avatar_url || celebrantUser?.avatar_url || null,
      full_name: celebrantUser?.full_name,
    },
    gift_leader: giftLeaderInfo,
    total_contributed: totalContributed,
    chat_room: chatRoom || undefined,
    gift_leader_history: enrichedHistory,
    group_members: enrichedMembers,
  };
}

/**
 * Check if current user is the Gift Leader for a celebration
 */
export async function isCurrentUserGiftLeader(celebrationId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: celebration } = await supabase
    .from('celebrations')
    .select('gift_leader_id')
    .eq('id', celebrationId)
    .single();

  return celebration?.gift_leader_id === user.id;
}

/**
 * Check if current user is an admin of the celebration's group
 */
export async function isCurrentUserGroupAdmin(celebrationId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: celebration } = await supabase
    .from('celebrations')
    .select('group_id')
    .eq('id', celebrationId)
    .single();

  if (!celebration) return false;

  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', celebration.group_id)
    .eq('user_id', user.id)
    .single();

  return membership?.role === 'admin';
}

/**
 * Find a celebration for a specific member in a group
 *
 * Looks up the most recent celebration where the given user is the celebrant
 * in the given group. Returns the celebration ID and status, or null if none exists.
 *
 * RLS handles access control -- no explicit auth check needed here.
 */
export async function findCelebrationForMember(
  userId: string,
  groupId: string
): Promise<{ id: string; status: string } | null> {
  const { data, error } = await supabase
    .from('celebrations')
    .select('id, status')
    .eq('celebrant_id', userId)
    .eq('group_id', groupId)
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to find celebration for member:', error);
    return null;
  }

  return data;
}
