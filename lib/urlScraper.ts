/**
 * URL Scraper Library
 * Client service for URL metadata extraction via Edge Function
 */

import { supabase } from './supabase';
import type { ScrapedMetadata, ScrapeResult, ScrapeErrorCode } from '../types/scraping.types';

// Re-export types for convenience
export type { ScrapedMetadata, ScrapeResult, ScrapeErrorCode };

// Common tracking parameters to remove
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ref', 'tag', 'fbclid', 'gclid', 'msclkid', 'dclid',
  'mc_cid', 'mc_eid', 'zanpid', '_ga', 'sref'
];

/**
 * Validate if string is a valid HTTP/HTTPS URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Normalize URL by removing tracking params and ensuring HTTPS
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove tracking parameters
    TRACKING_PARAMS.forEach(param => parsed.searchParams.delete(param));

    // Ensure HTTPS
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Scrape metadata from a product URL
 *
 * @param url - The product URL to scrape
 * @returns ScrapeResult with metadata on success, error details on failure
 *
 * @example
 * const result = await scrapeUrl('https://amazon.com/dp/B09V3KXJPB');
 * if (result.success && result.data) {
 *   console.log(result.data.title, result.data.price);
 * } else {
 *   console.log('Scraping failed:', result.error);
 * }
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  // Client-side URL validation
  if (!isValidUrl(url)) {
    return {
      success: false,
      error: 'Invalid URL format',
      code: 'INVALID_URL'
    };
  }

  // Normalize URL before sending to Edge Function
  const normalizedUrl = normalizeUrl(url);

  try {
    const { data, error } = await supabase.functions.invoke<ScrapeResult>('scrape-url', {
      body: { url: normalizedUrl }
    });

    if (error) {
      console.error('Edge Function invocation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to invoke scrape function',
        code: 'SCRAPE_FAILED'
      };
    }

    // Edge Function returns ScrapeResult directly
    if (!data) {
      return {
        success: false,
        error: 'No response from scrape function',
        code: 'SCRAPE_FAILED'
      };
    }

    return data;
  } catch (err) {
    console.error('Unexpected error during scrape:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      code: 'SCRAPE_FAILED'
    };
  }
}
