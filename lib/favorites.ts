/**
 * Favorites Library
 * Per-group favorite wishlist item tracking ("Most Wanted" feature)
 *
 * Each user can mark one item as their favorite per group.
 * Favorites are pinned to the top of wishlists.
 */

import { supabase } from './supabase';

/** Set a user's favorite item for a group */
export async function setFavorite(
  userId: string,
  groupId: string,
  itemId: string
): Promise<void> {
  const { error } = await supabase
    .from('group_favorites')
    .upsert(
      {
        user_id: userId,
        group_id: groupId,
        item_id: itemId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,group_id',
      }
    );

  if (error) {
    console.error('Failed to set favorite:', error);
    throw new Error(`Failed to set favorite: ${error.message}`);
  }
}

/** Remove a user's favorite for a group */
export async function removeFavorite(
  userId: string,
  groupId: string
): Promise<void> {
  const { error } = await supabase
    .from('group_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('group_id', groupId);

  if (error) {
    console.error('Failed to remove favorite:', error);
    throw new Error(`Failed to remove favorite: ${error.message}`);
  }
}

/** Get a user's favorite item ID for a group, or null if none */
export async function getFavoriteForGroup(
  userId: string,
  groupId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('group_favorites')
    .select('item_id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - no favorite set
      return null;
    }
    console.error('Failed to get favorite:', error);
    throw new Error(`Failed to get favorite: ${error.message}`);
  }

  return data?.item_id || null;
}

/** Get all groups user belongs to */
export async function getUserGroups(userId: string): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, groups!inner(id, name)')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch user groups:', error);
    throw new Error(`Failed to fetch user groups: ${error.message}`);
  }

  return (data || []).map(d => ({
    id: d.groups.id,
    name: d.groups.name,
  }));
}

/** Get all favorites for a user across all groups (for My Wishlist view) */
export async function getAllFavoritesForUser(userId: string): Promise<Array<{ groupId: string; groupName: string; itemId: string }>> {
  const { data, error } = await supabase
    .from('group_favorites')
    .select('group_id, item_id, groups!inner(name)')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to fetch user favorites:', error);
    throw new Error(`Failed to fetch user favorites: ${error.message}`);
  }

  return (data || []).map(d => ({
    groupId: d.group_id,
    groupName: d.groups.name,
    itemId: d.item_id,
  }));
}
