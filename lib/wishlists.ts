import { supabase } from './supabase';
import type { Database } from '../types/database.types';

export type Wishlist = Database['public']['Tables']['wishlists']['Row'];
export type WishlistInsert = Database['public']['Tables']['wishlists']['Insert'];
export type WishlistUpdate = Database['public']['Tables']['wishlists']['Update'];

/**
 * Fetch all wishlists for the current user
 */
export async function getWishlists(userId: string) {
  const { data, error } = await supabase
    .from('wishlists')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get the default wishlist for a user
 * Creates one automatically if it doesn't exist (fallback for missing trigger)
 */
export async function getDefaultWishlist(userId: string) {
  // First, try to find a default wishlist
  const { data, error } = await supabase
    .from('wishlists')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single();

  // If found, return it
  if (data && !error) {
    console.log('[getDefaultWishlist] Found default:', data.id);
    return data;
  }

  // If no default found, check if ANY wishlists exist (maybe is_default column issue)
  const { data: anyWishlist, error: anyError } = await supabase
    .from('wishlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (anyWishlist && !anyError) {
    console.log('[getDefaultWishlist] No default flag, using first wishlist:', anyWishlist.id);
    // Mark this one as default
    await supabase
      .from('wishlists')
      .update({ is_default: true })
      .eq('id', anyWishlist.id);
    return anyWishlist;
  }

  // No wishlists at all, create one
  console.log('[getDefaultWishlist] No wishlists found, creating one...');
  const { data: newWishlist, error: createError } = await supabase
    .from('wishlists')
    .insert({
      user_id: userId,
      name: 'My Wishlist',
      emoji: '📋',
      is_default: true,
      sort_order: 0,
    })
    .select()
    .single();

  if (createError) {
    console.error('[getDefaultWishlist] Failed to create default:', createError);
    throw createError;
  }
  console.log('[getDefaultWishlist] Created default wishlist:', newWishlist?.id);
  return newWishlist;

  if (error) throw error;
  return data;
}

/**
 * Create a new wishlist
 */
export async function createWishlist(wishlist: WishlistInsert) {
  const { data, error } = await supabase
    .from('wishlists')
    .insert(wishlist)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing wishlist
 */
export async function updateWishlist(id: string, updates: WishlistUpdate) {
  const { data, error } = await supabase
    .from('wishlists')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a wishlist
 */
export async function deleteWishlist(id: string) {
  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reorder wishlists
 */
export async function reorderWishlists(updates: Array<{ id: string; sort_order: number }>) {
  // Update each wishlist's sort_order
  const promises = updates.map(({ id, sort_order }) =>
    supabase
      .from('wishlists')
      .update({ sort_order })
      .eq('id', id)
  );

  const results = await Promise.all(promises);

  // Check for errors
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    throw errors[0].error;
  }

  return true;
}

/**
 * Get item count for a wishlist
 */
export async function getWishlistItemCount(wishlistId: string) {
  const { count, error } = await supabase
    .from('wishlist_items')
    .select('*', { count: 'exact', head: true })
    .eq('wishlist_id', wishlistId);

  if (error) throw error;
  return count || 0;
}

/**
 * Move a wishlist item to a different wishlist
 * @param itemId - The item to move
 * @param targetWishlistId - The destination wishlist
 */
export async function moveItemToWishlist(
  itemId: string,
  targetWishlistId: string
): Promise<void> {
  const { error } = await supabase
    .from('wishlist_items')
    .update({ wishlist_id: targetWishlistId })
    .eq('id', itemId);

  if (error) {
    console.error('Failed to move item:', error);
    throw new Error(`Failed to move item: ${error.message}`);
  }
}
