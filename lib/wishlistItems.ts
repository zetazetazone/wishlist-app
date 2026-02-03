/**
 * Wishlist Items Library
 * Functions for fetching wishlist items
 */

import { supabase } from './supabase';
import type { Database } from '../types/database.types';

// Type from database
export type WishlistItem = Database['public']['Tables']['wishlist_items']['Row'];

/**
 * Fetch wishlist items for a specific user
 * Used when viewing celebrant's wishlist in celebration view
 */
export async function getWishlistItemsByUserId(userId: string): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: false });

  if (error) {
    console.error('Failed to fetch wishlist items:', error);
    throw new Error(`Failed to fetch wishlist items: ${error.message}`);
  }

  return data || [];
}
