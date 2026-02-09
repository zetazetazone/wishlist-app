import { supabase } from '../lib/supabase';
import { Group, GroupMember } from '../types';
import { setDefaultFavorite } from '../lib/favorites';
import { getNextGiftLeader } from '../lib/celebrations';
import { getAvatarUrl } from '../lib/storage';

/**
 * Generate a unique 6-character invite code
 */
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Options for creating a new group (v1.2 schema)
 */
export interface CreateGroupOptions {
  name: string;
  description?: string | null;
  photo_url?: string | null;
  mode?: 'greetings' | 'gifts';
  budget_approach?: 'per_gift' | 'monthly' | 'yearly' | null;
  budget_amount?: number | null;  // in cents
}

/**
 * Create a new group
 */
export async function createGroup(options: CreateGroupOptions) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('Creating group for user:', user.id, 'email:', user.email);

    // Ensure user exists in public.users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    console.log('Existing user check:', existingUser ? 'Found' : 'Not found');

    if (!existingUser) {
      // Create user profile if it doesn't exist
      console.log('Creating user profile...');
      const { error: userCreateError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          birthday: user.user_metadata?.birthday || null,
        });

      if (userCreateError) {
        console.error('Failed to create user profile:', userCreateError);
        // If error is duplicate key, ignore it (user was created by trigger)
        if (userCreateError.code !== '23505') {
          throw new Error(`Failed to create user profile: ${userCreateError.message}`);
        }
        console.log('User profile already exists (created by trigger)');
      } else {
        console.log('User profile created successfully');
      }
    }

    // Create the group with v1.2 fields
    console.log('Creating group with name:', options.name, 'mode:', options.mode || 'gifts');
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: options.name,
        created_by: user.id,
        budget_limit_per_gift: 50, // Legacy field, keep default for compatibility
        description: options.description || null,
        photo_url: options.photo_url || null,
        mode: options.mode || 'gifts',
        budget_approach: options.budget_approach || null,
        budget_amount: options.budget_amount || null,
      })
      .select()
      .single();

    if (groupError) {
      console.error('Failed to create group:', groupError);
      throw new Error(`Failed to create group: ${groupError.message}`);
    }

    console.log('Group created:', group.id);

    // Add creator as admin member
    console.log('Adding creator as admin member...');
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
      });

    if (memberError) {
      console.error('Failed to add group member:', memberError);
      throw new Error(`Failed to add group member: ${memberError.message}`);
    }

    // Set Surprise Me as the default favorite for this new group
    try {
      await setDefaultFavorite(user.id, group.id);
      console.log('Default favorite set for new group');
    } catch (error) {
      console.error('Error setting default favorite:', error);
      // Non-blocking - group creation still succeeded
    }

    console.log('Group created successfully!');
    return { data: group, error: null };
  } catch (error) {
    console.error('Error in createGroup:', error);
    return { data: null, error };
  }
}

/**
 * Fetch all groups for the current user
 */
export async function fetchUserGroups() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members (
          user_id
        )
      `)
      .eq('group_members.user_id', user.id);

    if (error) throw error;

    // Add member count to each group
    const groupsWithCount = await Promise.all(
      (data || []).map(async (group) => {
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        return { ...group, member_count: count || 0 };
      })
    );

    return { data: groupsWithCount, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Fetch a single group with members and their favorites
 */
export async function fetchGroupDetails(groupId: string) {
  try {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError) throw groupError;

    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select(`
        *,
        users (
          id,
          email,
          full_name,
          avatar_url,
          birthday
        )
      `)
      .eq('group_id', groupId);

    if (membersError) throw membersError;

    // Convert storage paths to public URLs for member avatars
    const membersWithAvatarUrls = (members || []).map(member => ({
      ...member,
      users: {
        ...member.users,
        avatar_url: getAvatarUrl(member.users.avatar_url),
      },
    }));

    // Fetch favorites for all members in this group (batch query to avoid N+1)
    const memberIds = membersWithAvatarUrls.map(m => m.users.id);
    const { data: favorites, error: favoritesError } = await supabase
      .from('group_favorites')
      .select(`
        user_id,
        item_id,
        wishlist_items (
          id,
          title,
          image_url,
          item_type
        )
      `)
      .eq('group_id', groupId)
      .in('user_id', memberIds);

    if (favoritesError) {
      console.error('Failed to fetch favorites:', favoritesError);
      // Non-blocking - continue without favorites
    }

    // Build a map of user_id -> favorite item
    const favoritesByUser: Record<string, { title: string; image_url: string | null; item_type: string } | null> = {};
    (favorites || []).forEach(f => {
      if (f.wishlist_items) {
        const item = f.wishlist_items as unknown as { title: string; image_url: string | null; item_type: string };
        favoritesByUser[f.user_id] = item;
      }
    });

    return { data: { ...group, members: membersWithAvatarUrls, favoritesByUser }, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Options for updating group info (admin editing)
 */
export interface UpdateGroupInfoOptions {
  name?: string;
  description?: string | null;
  photo_url?: string | null;
}

/**
 * Update group info (name, description, photo)
 * Used by admin from the group settings screen
 */
export async function updateGroupInfo(groupId: string, updates: UpdateGroupInfoOptions) {
  try {
    const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Regenerate the invite code for a group
 * Calls the database function created in the group settings migration.
 * Any group member can call this (SECURITY DEFINER bypasses admin-only UPDATE RLS).
 */
export async function regenerateInviteCode(groupId: string) {
  try {
    const { data, error } = await supabase
      .rpc('regenerate_invite_code', { p_group_id: groupId });

    if (error) throw error;
    return { data: data as string, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Join a group using an invite code or group ID
 * Accepts either a UUID (direct group ID) or a 6-character invite code.
 */
export async function joinGroup(codeOrId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // If it doesn't look like a UUID, treat as invite code and use RPC
    // (RLS prevents non-members from querying groups table directly)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(codeOrId)) {
      // Use SECURITY DEFINER function that handles the entire join flow atomically:
      // 1. Looks up group by invite code (bypasses RLS)
      // 2. Checks if already a member
      // 3. Adds user as member if not
      const { data: result, error: rpcError } = await supabase
        .rpc('join_group_by_invite_code', { p_invite_code: codeOrId });

      if (rpcError) {
        // Extract user-friendly error message from Postgres exception
        const errorMsg = rpcError.message || 'Failed to join group';
        throw new Error(errorMsg.includes('Invalid invite code') ? 'Invalid invite code' : errorMsg);
      }

      const joinResult = result?.[0];
      if (!joinResult) throw new Error('Invalid invite code');

      // Set default favorite (non-blocking)
      if (!joinResult.already_member) {
        try {
          await setDefaultFavorite(user.id, joinResult.group_id);
        } catch (error) {
          console.error('Error setting default favorite:', error);
        }
      }

      // Return result matching existing interface
      return {
        data: { id: joinResult.group_id, name: joinResult.group_name } as Group,
        error: joinResult.already_member ? new Error('Already a member of this group') : null,
      };
    }

    // Direct UUID join flow (legacy support for deep links with group ID)
    const groupId = codeOrId;

    // Check if group exists
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError) throw new Error('Group not found');

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return { data: group, error: new Error('Already a member of this group') };
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: user.id,
        role: 'member',
      });

    if (memberError) throw memberError;

    // Set Surprise Me as the default favorite for this group
    try {
      await setDefaultFavorite(user.id, groupId);
    } catch (error) {
      console.error('Error setting default favorite:', error);
      // Non-blocking - group join still succeeded
    }

    return { data: group, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Leave a group
 */
export async function leaveGroup(groupId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error };
  }
}

/**
 * Update a group's mode (greetings or gifts)
 * Separate from updateGroupInfo to keep concerns clean -- mode changes have
 * different UX flow (confirmation dialog) from info edits (name/description).
 */
export async function updateGroupMode(groupId: string, mode: 'greetings' | 'gifts') {
  try {
    const { data, error } = await supabase
      .from('groups')
      .update({ mode })
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Update group settings
 */
export async function updateGroup(groupId: string, updates: { name?: string; budget_limit_per_gift?: number }) {
  try {
    const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Remove a member from a group (admin action)
 *
 * Handles Gift Leader reassignment before deletion:
 * 1. Finds all active/upcoming celebrations where removed user is Gift Leader
 * 2. Reassigns Gift Leader using birthday rotation (getNextGiftLeader)
 * 3. Records reassignment in gift_leader_history with 'member_left' reason
 * 4. Deletes the group_members row
 *
 * If reassignment fails (e.g., group would have <2 members), sets gift_leader_id to NULL.
 */
export async function removeMember(groupId: string, removedUserId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Step 1: Check if removed user is Gift Leader for any active/upcoming celebrations
    const { data: celebrations } = await supabase
      .from('celebrations')
      .select('id, celebrant_id')
      .eq('group_id', groupId)
      .eq('gift_leader_id', removedUserId)
      .in('status', ['upcoming', 'active']);

    // Step 2: Reassign Gift Leader for each affected celebration
    if (celebrations && celebrations.length > 0) {
      for (const celebration of celebrations) {
        try {
          const newLeaderId = await getNextGiftLeader(groupId, celebration.celebrant_id);

          // Update celebration with new leader
          await supabase
            .from('celebrations')
            .update({ gift_leader_id: newLeaderId })
            .eq('id', celebration.id);

          // Record in gift_leader_history with 'member_left' reason
          await supabase
            .from('gift_leader_history')
            .insert({
              celebration_id: celebration.id,
              assigned_to: newLeaderId,
              assigned_by: null, // System reassignment
              reason: 'member_left',
            });
        } catch (reassignError) {
          console.error('Failed to reassign gift leader for celebration:', celebration.id, reassignError);
          // If reassignment fails (e.g., only 2 members and removing one leaves <2),
          // set gift_leader_id to NULL as fallback
          await supabase
            .from('celebrations')
            .update({ gift_leader_id: null })
            .eq('id', celebration.id);
        }
      }
    }

    // Step 3: Delete the group_members row
    // RLS policy allows admin to delete other members
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', removedUserId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

/**
 * Transfer admin role to another member (atomic via database function)
 *
 * Calls the transfer_admin_role RPC which:
 * - Demotes current admin to 'member'
 * - Promotes target user to 'admin'
 * - Executes in a single transaction for atomicity
 */
export async function transferAdmin(groupId: string, newAdminId: string) {
  try {
    const { error } = await supabase
      .rpc('transfer_admin_role', {
        p_group_id: groupId,
        p_new_admin_id: newAdminId,
      });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

/**
 * Options for updating group budget configuration
 */
export interface UpdateGroupBudgetOptions {
  approach: 'per_gift' | 'monthly' | 'yearly' | null;
  amount: number | null;  // in cents, null for per_gift or when removing budget
}

/**
 * Update a group's budget approach and amount
 *
 * Separate from updateGroupInfo/updateGroupMode -- budget changes
 * have their own UX flow (confirmation dialog, approach selector cards).
 *
 * @param groupId - The group UUID
 * @param options - Budget approach and amount (cents)
 * @returns Updated group data or error
 */
export async function updateGroupBudget(
  groupId: string,
  options: UpdateGroupBudgetOptions
) {
  try {
    const { data, error } = await supabase
      .from('groups')
      .update({
        budget_approach: options.approach,
        budget_amount: options.amount,
      })
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
