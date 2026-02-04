/**
 * Favorites Library
 * Per-group favorite wishlist item tracking ("Most Wanted" feature)
 *
 * Rules:
 * - Every user MUST have a Most Wanted for each group at all times
 * - When a Most Wanted item is deleted, the next highest priority item is automatically promoted
 * - "Surprise Me" is the fallback only when no other items exist
 * - Special items (surprise_me, mystery_box) can be Most Wanted in MULTIPLE groups
 * - Standard items can only be Most Wanted in ONE group
 */

import { supabase } from './supabase';

type ItemType = 'standard' | 'surprise_me' | 'mystery_box';

/** Check if item type allows multi-group selection */
export function isSpecialItem(itemType: ItemType): boolean {
  return itemType === 'surprise_me' || itemType === 'mystery_box';
}

/**
 * Set a user's favorite item for a group
 * - Special items: Simply set for this group (can exist in multiple)
 * - Standard items: Remove from any other group first (single group only)
 */
export async function setFavorite(
  userId: string,
  groupId: string,
  itemId: string,
  itemType: ItemType
): Promise<void> {
  // For standard items, remove from any other group first
  if (!isSpecialItem(itemType)) {
    const { error: removeError } = await supabase
      .from('group_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .neq('group_id', groupId);

    if (removeError) {
      console.error('Failed to remove item from other groups:', removeError);
      throw new Error(`Failed to update favorite: ${removeError.message}`);
    }
  }

  // Set the favorite for this group
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

/**
 * Toggle a special item's favorite status for a specific group
 * (Used for multi-group selection of surprise_me/mystery_box)
 */
export async function toggleFavoriteForGroup(
  userId: string,
  groupId: string,
  itemId: string,
  itemType: ItemType,
  currentlySelected: boolean
): Promise<void> {
  if (currentlySelected) {
    // Remove from this group, but need to set a default (Surprise Me)
    await setDefaultFavorite(userId, groupId);
  } else {
    // Add to this group
    await setFavorite(userId, groupId, itemId, itemType);
  }
}

/** Remove a user's favorite for a group (replaced by default) */
export async function removeFavorite(
  userId: string,
  groupId: string
): Promise<void> {
  // Instead of removing, set to default Surprise Me
  await setDefaultFavorite(userId, groupId);
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

  return (data || []).map(d => {
    const group = d.groups as unknown as { id: string; name: string };
    return {
      id: group.id,
      name: group.name,
    };
  });
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

  return (data || []).map(d => {
    const group = d.groups as unknown as { name: string };
    return {
      groupId: d.group_id,
      groupName: group.name,
      itemId: d.item_id,
    };
  });
}

/**
 * Get or create the user's Surprise Me item
 * Every user should have one Surprise Me item as the default Most Wanted
 */
export async function getOrCreateSurpriseMe(userId: string): Promise<string> {
  // Check if user already has a Surprise Me item
  const { data: existing, error: fetchError } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('user_id', userId)
    .eq('item_type', 'surprise_me')
    .limit(1)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create a new Surprise Me item
  const { data: newItem, error: createError } = await supabase
    .from('wishlist_items')
    .insert({
      user_id: userId,
      title: 'Surprise Me!',
      item_type: 'surprise_me',
      status: 'active',
      priority: 3,
    })
    .select('id')
    .single();

  if (createError) {
    console.error('Failed to create Surprise Me item:', createError);
    throw new Error(`Failed to create Surprise Me item: ${createError.message}`);
  }

  return newItem.id;
}

/**
 * Get or create the user's Mystery Box item
 * Every user should have one Mystery Box item as a universal option
 */
export async function getOrCreateMysteryBox(userId: string): Promise<string> {
  // Check if user already has a Mystery Box item
  const { data: existing, error: fetchError } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('user_id', userId)
    .eq('item_type', 'mystery_box')
    .limit(1)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create a new Mystery Box item
  const { data: newItem, error: createError } = await supabase
    .from('wishlist_items')
    .insert({
      user_id: userId,
      title: 'Mystery Box',
      item_type: 'mystery_box',
      status: 'active',
      priority: 3,
    })
    .select('id')
    .single();

  if (createError) {
    console.error('Failed to create Mystery Box item:', createError);
    throw new Error(`Failed to create Mystery Box item: ${createError.message}`);
  }

  return newItem.id;
}

/**
 * Ensure user has both universal special items (Surprise Me and Mystery Box)
 * Each user should have exactly ONE of each - they are universal across all lists
 */
export async function ensureUniversalSpecialItems(userId: string): Promise<void> {
  await Promise.all([
    getOrCreateSurpriseMe(userId),
    getOrCreateMysteryBox(userId),
  ]);
}

type SpecialItemType = 'surprise_me' | 'mystery_box';

/**
 * Check which special items the user is missing (were deleted)
 * Returns array of missing item types for re-add UI
 */
export async function getMissingSpecialItems(userId: string): Promise<SpecialItemType[]> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('item_type')
    .eq('user_id', userId)
    .in('item_type', ['surprise_me', 'mystery_box']);

  if (error) {
    console.error('Failed to check special items:', error);
    return [];
  }

  const existingTypes = new Set((data || []).map(d => d.item_type));
  const missing: SpecialItemType[] = [];

  if (!existingTypes.has('surprise_me')) {
    missing.push('surprise_me');
  }
  if (!existingTypes.has('mystery_box')) {
    missing.push('mystery_box');
  }

  return missing;
}

/**
 * Check if user has a specific special item
 */
export async function hasSpecialItem(userId: string, itemType: 'surprise_me' | 'mystery_box'): Promise<boolean> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .limit(1)
    .single();

  return !!data && !error;
}

/**
 * Re-add a deleted special item
 * Only allows adding if user doesn't already have one
 */
export async function readdSpecialItem(
  userId: string,
  itemType: 'surprise_me' | 'mystery_box'
): Promise<string | null> {
  const hasItem = await hasSpecialItem(userId, itemType);
  if (hasItem) {
    return null; // Already has this item
  }

  if (itemType === 'surprise_me') {
    return getOrCreateSurpriseMe(userId);
  } else {
    return getOrCreateMysteryBox(userId);
  }
}

/**
 * Set the default favorite (Surprise Me) for a group
 * Called when user joins a group or removes their current favorite
 */
export async function setDefaultFavorite(userId: string, groupId: string): Promise<void> {
  const surpriseMeId = await getOrCreateSurpriseMe(userId);

  const { error } = await supabase
    .from('group_favorites')
    .upsert(
      {
        user_id: userId,
        group_id: groupId,
        item_id: surpriseMeId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,group_id',
      }
    );

  if (error) {
    console.error('Failed to set default favorite:', error);
    throw new Error(`Failed to set default favorite: ${error.message}`);
  }
}

/**
 * Set the next highest priority item as favorite for a group
 * Called when deleting a Most Wanted item - automatically promotes next item
 * Falls back to Surprise Me if no other items exist
 */
export async function setNextHighestPriorityFavorite(
  userId: string,
  groupId: string,
  excludeItemId: string
): Promise<void> {
  // Get user's items ordered by priority (highest first), excluding the deleted item
  const { data: items, error: fetchError } = await supabase
    .from('wishlist_items')
    .select('id, item_type')
    .eq('user_id', userId)
    .eq('status', 'active')
    .neq('id', excludeItemId)
    .order('priority', { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error('Failed to fetch items for next favorite:', fetchError);
    // Fall back to default on error
    await setDefaultFavorite(userId, groupId);
    return;
  }

  if (!items || items.length === 0) {
    // No other items exist, fall back to Surprise Me
    await setDefaultFavorite(userId, groupId);
    return;
  }

  const nextItem = items[0];
  const itemType = (nextItem.item_type || 'standard') as ItemType;

  // Set the next highest priority item as favorite
  await setFavorite(userId, groupId, nextItem.id, itemType);
}

/**
 * Ensure user has a favorite set for all their groups
 * Should be called on app load or after joining a group
 */
export async function ensureAllGroupsHaveFavorites(userId: string): Promise<void> {
  const groups = await getUserGroups(userId);
  const favorites = await getAllFavoritesForUser(userId);

  const groupsWithFavorites = new Set(favorites.map(f => f.groupId));

  for (const group of groups) {
    if (!groupsWithFavorites.has(group.id)) {
      await setDefaultFavorite(userId, group.id);
    }
  }
}

/**
 * Get groups where an item is currently set as Most Wanted
 */
export async function getGroupsWithItemAsFavorite(
  userId: string,
  itemId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('group_favorites')
    .select('group_id')
    .eq('user_id', userId)
    .eq('item_id', itemId);

  if (error) {
    console.error('Failed to fetch groups with item as favorite:', error);
    return [];
  }

  return (data || []).map(d => d.group_id);
}
