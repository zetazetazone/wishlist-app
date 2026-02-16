/**
 * Scraping Types
 * Types for URL metadata extraction
 */

export interface ScrapedMetadata {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  siteName: string | null;
  sourceUrl: string;
}

export type ScrapeErrorCode =
  | 'INVALID_URL'
  | 'SCRAPE_FAILED'
  | 'TIMEOUT'
  | 'BLOCKED';

export interface ScrapeResult {
  success: boolean;
  data?: ScrapedMetadata;
  error?: string;
  code?: ScrapeErrorCode;
}
