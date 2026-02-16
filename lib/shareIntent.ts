/**
 * Share Intent Utilities
 * URL extraction and quick-add functions for share intent handling
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScrapedMetadata } from '../types/scraping.types';

/**
 * Result of a quick-add operation
 */
export interface QuickAddResult {
  success: boolean;
  error?: string;
  itemId?: string;
}

/**
 * Extract first URL from text content
 * Handles both direct URLs and URLs embedded in text
 *
 * @param text - Text that may contain a URL
 * @returns First URL found, or null if none
 *
 * @example
 * extractUrlFromText('Check this out: https://amazon.com/product')
 * // => 'https://amazon.com/product'
 *
 * @example
 * extractUrlFromText('https://amazon.com/product')
 * // => 'https://amazon.com/product'
 *
 * @example
 * extractUrlFromText('No URL here')
 * // => null
 */
export function extractUrlFromText(text: string | null | undefined): string | null {
  if (!text) return null;

  // Pattern for HTTP/HTTPS URLs
  // Matches: protocol, optional www, domain, TLD, optional path/query/fragment
  const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;

  const matches = text.match(URL_REGEX);
  return matches?.[0] || null;
}

/**
 * Quick-add scraped item to user's default wishlist
 * Used for one-tap save from share intent flow
 *
 * @param metadata - Scraped metadata from URL
 * @param supabase - Supabase client instance
 * @returns Result with success status and optional error/itemId
 */
export async function quickAddToDefaultWishlist(
  metadata: ScrapedMetadata,
  supabase: SupabaseClient
): Promise<QuickAddResult> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get default wishlist
    const { data: defaultWishlist, error: wishlistError } = await supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();

    if (wishlistError || !defaultWishlist) {
      return { success: false, error: 'No default wishlist found' };
    }

    // Insert item (follows pattern from add-from-url.tsx)
    const { data: insertedItem, error: insertError } = await supabase
      .from('wishlist_items')
      .insert({
        user_id: user.id,
        wishlist_id: defaultWishlist.id,
        group_id: null, // Will be set when sharing (Phase 42)
        name: metadata.title || 'Untitled Item',
        description: metadata.description || null,
        price: metadata.price,
        image_url: metadata.imageUrl,
        amazon_url: metadata.sourceUrl, // Legacy column name
        priority: 0,
        status: 'active',
        item_type: 'standard',
      })
      .select('id')
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true, itemId: insertedItem?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
