/**
 * Wishlist utility functions
 *
 * Pure utility functions for wishlist display logic:
 * - Brand parsing from product titles
 * - Price formatting with currency symbols
 * - Image placeholder configuration
 *
 * All functions are pure (no side effects) and unit testable.
 */

import { colors } from '@/constants/theme';

/**
 * Brand name stop words - common words that are not brands
 */
const BRAND_STOP_WORDS = new Set([
  'with', 'for', 'and', 'the', 'pack', 'set', 'box', 'kit',
  'piece', 'pieces', 'count', 'size', 'large', 'small', 'medium',
]);

/**
 * Pattern for detecting size/measurement words
 */
const SIZE_PATTERN = /^\d+(\.\d+)?\s*(oz|ml|g|kg|lb|inch|in|cm|mm|ft|pack|pc|ct|count)\.?$/i;

/**
 * Pattern for detecting number-only words
 */
const NUMBER_ONLY_PATTERN = /^\d+$/;

/**
 * Parse brand name from product title
 *
 * Strategy: Extract first meaningful word(s) before common separators.
 * Returns null if no brand can be confidently extracted.
 *
 * Algorithm:
 * 1. Check for common separators (-, |, :, comma) and take first part
 * 2. If no separator, use first word if it looks like a brand
 * 3. Skip numbers, sizes, and stop words
 * 4. Return first capitalized word as brand
 *
 * @param title - Product title from wishlist item
 * @returns Brand name or null if no brand detected
 *
 * @example
 * parseBrandFromTitle("Apple iPhone 15 Pro Max") // "Apple"
 *
 * @example
 * parseBrandFromTitle("Samsung Galaxy S24 Ultra 256GB") // "Samsung"
 *
 * @example
 * parseBrandFromTitle("LEGO Star Wars Millennium Falcon") // "LEGO"
 *
 * @example
 * parseBrandFromTitle("12-Pack Gift Box Set") // null (no brand detected)
 *
 * @example
 * parseBrandFromTitle("Amazing Wireless Headphones") // "Amazing" (best effort)
 */
export function parseBrandFromTitle(title: string | null | undefined): string | null {
  if (!title || typeof title !== 'string') return null;

  // Normalize dashes and trim whitespace
  const cleanTitle = title
    .replace(/[–—]/g, '-')  // Normalize em/en dashes to hyphen
    .trim();

  // Split by common brand-product separators
  const separators = [' - ', ' | ', ' : ', ', '];
  for (const sep of separators) {
    if (cleanTitle.includes(sep)) {
      const firstPart = cleanTitle.split(sep)[0].trim();
      if (firstPart && !NUMBER_ONLY_PATTERN.test(firstPart)) {
        return firstPart;
      }
    }
  }

  // Fallback: first word if it looks like a brand (capitalized, not a size)
  const words = cleanTitle.split(/\s+/);
  const firstWord = words[0];

  if (!firstWord) return null;

  // Skip if it's a number, size, or stop word
  if (NUMBER_ONLY_PATTERN.test(firstWord)) return null;
  if (SIZE_PATTERN.test(firstWord)) return null;
  if (BRAND_STOP_WORDS.has(firstWord.toLowerCase())) return null;

  // Return first word if it's capitalized (likely a brand)
  if (firstWord[0] === firstWord[0].toUpperCase()) {
    return firstWord;
  }

  return null;
}

/**
 * Format price for display with currency symbol
 *
 * Returns null for null/undefined/zero prices (free items handled differently).
 * Formats price with 2 decimal places.
 *
 * @param price - Price amount to format
 * @param currency - Currency symbol to use (default: '$')
 * @returns Formatted price string or null
 *
 * @example
 * formatPrice(29.99) // "$29.99"
 *
 * @example
 * formatPrice(29.99, '€') // "€29.99"
 *
 * @example
 * formatPrice(100) // "$100.00"
 *
 * @example
 * formatPrice(null) // null
 *
 * @example
 * formatPrice(0) // null (free items show differently)
 */
export function formatPrice(
  price: number | null | undefined,
  currency: '$' | '€' = '$'
): string | null {
  if (price === null || price === undefined || price <= 0) {
    return null;
  }

  return `${currency}${price.toFixed(2)}`;
}

/**
 * Format price for special item types
 *
 * Mystery Box items show their tier amount.
 * Surprise Me items show their budget with "Budget:" prefix.
 * Standard items use regular price formatting.
 *
 * @param item - Wishlist item with price and type information
 * @returns Formatted price string or null
 *
 * @example
 * formatItemPrice({ item_type: 'mystery_box', mystery_box_tier: 50 }) // "€50"
 *
 * @example
 * formatItemPrice({ item_type: 'mystery_box', mystery_box_tier: 100 }) // "€100"
 *
 * @example
 * formatItemPrice({ item_type: 'surprise_me', surprise_me_budget: 75 }) // "Budget: €75"
 *
 * @example
 * formatItemPrice({ item_type: 'standard', price: 29.99 }) // "$29.99"
 *
 * @example
 * formatItemPrice({ price: 49.99 }) // "$49.99"
 */
export function formatItemPrice(item: {
  price?: number | null;
  item_type?: string;
  mystery_box_tier?: 50 | 100 | null;
  surprise_me_budget?: number | null;
}): string | null {
  // Mystery Box shows tier amount
  if (item.item_type === 'mystery_box' && item.mystery_box_tier) {
    return `€${item.mystery_box_tier}`;
  }

  // Surprise Me shows budget with prefix
  if (item.item_type === 'surprise_me' && item.surprise_me_budget) {
    return `Budget: €${item.surprise_me_budget}`;
  }

  // Standard items use regular price formatting
  return formatPrice(item.price);
}

/**
 * Placeholder configuration for items without images
 */
interface PlaceholderConfig {
  iconName: 'gift-outline' | 'help-circle' | 'gift';
  iconColor: string;
  backgroundColor: string;
}

/**
 * Get placeholder icon and colors for items without images
 *
 * Matches existing LuxuryWishlistCard icon logic:
 * - Surprise Me: Help circle icon in burgundy
 * - Mystery Box: Gift icon in gold
 * - Standard: Outline gift icon in burgundy
 *
 * @param itemType - Type of wishlist item
 * @returns Icon name and color configuration
 *
 * @example
 * getImagePlaceholder('surprise_me')
 * // { iconName: 'help-circle', iconColor: '#C02550', backgroundColor: '#FDF2F4' }
 *
 * @example
 * getImagePlaceholder('mystery_box')
 * // { iconName: 'gift', iconColor: '#B8860B', backgroundColor: '#FEFCE8' }
 *
 * @example
 * getImagePlaceholder('standard')
 * // { iconName: 'gift-outline', iconColor: '#C02550', backgroundColor: '#FDF2F4' }
 *
 * @example
 * getImagePlaceholder(undefined)
 * // { iconName: 'gift-outline', iconColor: '#C02550', backgroundColor: '#FDF2F4' }
 */
export function getImagePlaceholder(
  itemType: 'standard' | 'surprise_me' | 'mystery_box' | undefined
): PlaceholderConfig {
  switch (itemType) {
    case 'surprise_me':
      return {
        iconName: 'help-circle',
        iconColor: colors.burgundy[600],
        backgroundColor: colors.burgundy[50],
      };
    case 'mystery_box':
      return {
        iconName: 'gift',
        iconColor: colors.gold[600],
        backgroundColor: colors.gold[50],
      };
    case 'standard':
    default:
      return {
        iconName: 'gift-outline',
        iconColor: colors.burgundy[600],
        backgroundColor: colors.burgundy[50],
      };
  }
}
