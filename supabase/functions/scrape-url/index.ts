// Edge Function for URL metadata extraction
// Scrapes product pages for title, image, price, description using OG tags, JSON-LD, HTML fallback

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as cheerio from "npm:cheerio@1.0.0";

interface ScrapedMetadata {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  siteName: string | null;
  sourceUrl: string;
}

type ScrapeErrorCode =
  | 'INVALID_URL'
  | 'SCRAPE_FAILED'
  | 'TIMEOUT'
  | 'BLOCKED';

interface ScrapeResult {
  success: boolean;
  data?: ScrapedMetadata;
  error?: string;
  code?: ScrapeErrorCode;
}

// Browser-like headers to avoid bot detection
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};

// Validate URL is http/https
function isValidProductUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Normalize URL: remove tracking params, ensure https
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid'];
    trackingParams.forEach(param => parsed.searchParams.delete(param));

    // Prefer HTTPS
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

// Parse price from string (handles US/EU formats)
function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null;

  // Remove currency symbols and whitespace
  const cleaned = priceStr.replace(/[€$£¥₹\s,]/g, '').trim();

  // Parse as float
  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}

// Extract data from JSON-LD Product schema
function extractFromJsonLd($: cheerio.CheerioAPI): Partial<ScrapedMetadata> {
  const metadata: Partial<ScrapedMetadata> = {};

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const jsonLdText = $(element).html();
      if (!jsonLdText) return;

      const jsonLd = JSON.parse(jsonLdText);

      // Handle @graph array
      const items = Array.isArray(jsonLd['@graph']) ? jsonLd['@graph'] : [jsonLd];

      items.forEach((item: any) => {
        if (item['@type'] === 'Product') {
          if (!metadata.title && item.name) {
            metadata.title = item.name;
          }
          if (!metadata.description && item.description) {
            metadata.description = item.description;
          }
          if (!metadata.imageUrl && item.image) {
            metadata.imageUrl = Array.isArray(item.image) ? item.image[0] : item.image;
          }

          // Extract price from offers
          if (item.offers) {
            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (!metadata.price && offer.price) {
              metadata.price = parsePrice(offer.price.toString());
            }
            if (!metadata.currency && offer.priceCurrency) {
              metadata.currency = offer.priceCurrency;
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to parse JSON-LD:', error);
    }
  });

  return metadata;
}

// Resolve relative URLs to absolute
function resolveUrl(baseUrl: string, relativeUrl: string | undefined): string | null {
  if (!relativeUrl) return null;

  try {
    // Already absolute
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }

    // Protocol-relative
    if (relativeUrl.startsWith('//')) {
      return 'https:' + relativeUrl;
    }

    // Relative to base
    const base = new URL(baseUrl);
    return new URL(relativeUrl, base.origin).toString();
  } catch {
    return null;
  }
}

// Main metadata extraction with fallback chain
function extractMetadata(html: string, url: string): ScrapedMetadata {
  const $ = cheerio.load(html);

  // Try JSON-LD first
  const jsonLdData = extractFromJsonLd($);

  // Extract with fallback chain
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    jsonLdData.title ||
    $('title').text() ||
    $('h1').first().text() ||
    null;

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    jsonLdData.description ||
    $('meta[name="description"]').attr('content') ||
    null;

  const imageUrlRaw =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    jsonLdData.imageUrl ||
    $('meta[itemprop="image"]').attr('content') ||
    null;

  const imageUrl = resolveUrl(url, imageUrlRaw);

  const priceRaw =
    $('meta[property="product:price:amount"]').attr('content') ||
    jsonLdData.price?.toString() ||
    null;

  const price = priceRaw ? parsePrice(priceRaw) : null;

  const currency =
    $('meta[property="product:price:currency"]').attr('content') ||
    jsonLdData.currency ||
    'USD';

  const siteName =
    $('meta[property="og:site_name"]').attr('content') ||
    new URL(url).hostname.replace('www.', '') ||
    null;

  return {
    title: title?.trim() || null,
    description: description?.trim() || null,
    imageUrl,
    price,
    currency,
    siteName,
    sourceUrl: url,
  };
}

serve(async (req) => {
  // CORS headers for client calls
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { url } = await req.json();

    console.log('Scraping URL:', url);

    // Validate URL
    if (!url || !isValidProductUrl(url)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid URL provided',
          code: 'INVALID_URL' as ScrapeErrorCode,
        } as ScrapeResult),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize URL
    const normalizedUrl = normalizeUrl(url);

    // Fetch with timeout (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(normalizedUrl, {
        headers: BROWSER_HEADERS,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Failed to fetch ${normalizedUrl}: ${response.status}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to fetch URL (${response.status})`,
            code: 'SCRAPE_FAILED' as ScrapeErrorCode,
          } as ScrapeResult),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const html = await response.text();
      const metadata = extractMetadata(html, normalizedUrl);

      console.log('Extracted metadata:', metadata);

      return new Response(
        JSON.stringify({
          success: true,
          data: metadata,
        } as ScrapeResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (fetchError.name === 'AbortError') {
        console.warn('Scrape timeout for:', normalizedUrl);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Request timeout',
            code: 'TIMEOUT' as ScrapeErrorCode,
          } as ScrapeResult),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Other fetch errors (network, blocked, etc.)
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to scrape URL',
          code: 'SCRAPE_FAILED' as ScrapeErrorCode,
        } as ScrapeResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        code: 'SCRAPE_FAILED' as ScrapeErrorCode,
      } as ScrapeResult),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
