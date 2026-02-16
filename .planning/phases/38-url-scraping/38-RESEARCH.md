# Phase 38: URL Scraping - Research

**Researched:** 2026-02-16
**Domain:** Server-side metadata extraction from product URLs using Supabase Edge Functions
**Confidence:** HIGH

## Summary

URL scraping for product metadata extraction requires a server-side approach via Supabase Edge Functions to avoid CORS restrictions. The implementation uses Deno's fetch API with cheerio (via `npm:cheerio@1.0.0` specifier) for HTML parsing, extracting Open Graph metadata, JSON-LD structured data, and falling back to common HTML patterns. The key insight is that **metadata extraction has multiple fallback layers** -- og:title -> title tag -> h1, og:image -> twitter:image -> first large image, etc.

Price extraction is the most challenging aspect due to inconsistent formats across retailers. Three metadata standards exist: Open Graph (`product:price:amount`, `product:price:currency`), Schema.org JSON-LD (`offers.price`, `offers.priceCurrency`), and microdata (`itemprop="price"`). Amazon, Target, Etsy, and generic sites each have different implementations, but Open Graph + JSON-LD covers approximately 80% of product pages. For the remaining 20%, graceful degradation with manual entry is essential.

**Primary recommendation:** Build a Supabase Edge Function using `npm:cheerio@1.0.0` that extracts metadata via prioritized fallback chains (OG -> JSON-LD -> HTML selectors), normalizes prices to numbers, and returns structured `ScrapedMetadata` to the client. Always include graceful fallback for manual entry when scraping fails.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cheerio | 1.0.0 | HTML parsing and DOM traversal | jQuery-like API, 6-8x faster than jsdom, works with Deno via npm specifier |
| Deno fetch | built-in | HTTP requests with custom headers | Native to Supabase Edge Functions, supports User-Agent spoofing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| URL API | built-in | URL parsing and normalization | Always - validate URLs, remove tracking params |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cheerio | deno-dom | Native Deno, but slower for parsing; cheerio has better jQuery-like API |
| cheerio | linkedom | Faster parsing in some cases, but cheerio has more documentation and community support |
| In-house parsing | metascraper | More comprehensive but Node-only; not available in Deno Edge Functions |

**Installation (Edge Function):**
```typescript
// Direct import in Edge Function - no npm install needed
import * as cheerio from "npm:cheerio@1.0.0";
```

**Client installation:**
```bash
# None needed - client uses supabase.functions.invoke()
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
├── functions/
│   └── scrape-url/
│       ├── index.ts           # Main Edge Function handler
│       └── deno.json          # Function-specific config (optional)

lib/
├── url-scraper.ts             # Client service layer

types/
├── scraping.types.ts          # ScrapedMetadata, ScrapeResult types
```

### Pattern 1: Prioritized Metadata Fallback Chain
**What:** Extract each field using ordered fallback sources
**When to use:** Always - different sites implement metadata differently
**Example:**
```typescript
// Source: Common scraping patterns from ZenRows, webscraping.ai
function extractTitle($: cheerio.CheerioAPI): string | null {
  return (
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text().trim() ||
    $('h1').first().text().trim() ||
    null
  );
}

function extractImage($: cheerio.CheerioAPI, baseUrl: string): string | null {
  const image = (
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('meta[itemprop="image"]').attr('content') ||
    $('link[rel="image_src"]').attr('href')
  );

  if (!image) return null;

  // Handle relative URLs
  try {
    return new URL(image, baseUrl).toString();
  } catch {
    return image;
  }
}
```

### Pattern 2: JSON-LD Schema.org Product Extraction
**What:** Parse embedded JSON-LD for structured product data
**When to use:** After OG tags fail - many retailers use JSON-LD for rich snippets
**Example:**
```typescript
// Source: schema.org/Product, schema.org/price
interface JsonLdProduct {
  '@type': 'Product';
  name?: string;
  description?: string;
  image?: string | string[];
  offers?: {
    '@type': 'Offer' | 'AggregateOffer';
    price?: string | number;
    priceCurrency?: string;
    lowPrice?: string | number;
  } | Array<{
    '@type': 'Offer';
    price?: string | number;
    priceCurrency?: string;
  }>;
}

function extractFromJsonLd($: cheerio.CheerioAPI): Partial<ScrapedMetadata> {
  const result: Partial<ScrapedMetadata> = {};

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '');
      const items = Array.isArray(json) ? json : [json];

      for (const item of items) {
        if (item['@type'] === 'Product') {
          if (!result.title && item.name) result.title = item.name;
          if (!result.description && item.description) result.description = item.description;

          // Handle offers (can be object or array)
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offers) {
            const price = offers.price || offers.lowPrice;
            if (!result.price && price) {
              result.price = typeof price === 'string'
                ? parseFloat(price.replace(/[^0-9.]/g, ''))
                : price;
            }
            if (!result.currency && offers.priceCurrency) {
              result.currency = offers.priceCurrency;
            }
          }

          // Handle image (can be string or array)
          if (!result.imageUrl && item.image) {
            result.imageUrl = Array.isArray(item.image) ? item.image[0] : item.image;
          }
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  });

  return result;
}
```

### Pattern 3: Edge Function with CORS and Error Handling
**What:** Proper Edge Function structure with CORS headers and graceful error handling
**When to use:** All Edge Functions called from client
**Example:**
```typescript
// Source: Supabase Edge Functions docs, existing push/index.ts pattern
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as cheerio from "npm:cheerio@1.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    // Validate URL
    if (!url || !isValidProductUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL', code: 'INVALID_URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadata = await scrapeUrl(url);

    return new Response(
      JSON.stringify({ success: true, data: metadata }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scrape error:', error);

    // Return graceful error for client handling
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: 'SCRAPE_FAILED'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Pattern 4: Client Service Layer with Type Safety
**What:** Typed client service wrapping Edge Function calls
**When to use:** All client-side Edge Function interactions
**Example:**
```typescript
// Source: Existing lib/*.ts patterns in project
import { supabase } from './supabase';

export interface ScrapedMetadata {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  siteName: string | null;
  sourceUrl: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapedMetadata;
  error?: string;
  code?: 'INVALID_URL' | 'SCRAPE_FAILED' | 'TIMEOUT' | 'BLOCKED';
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const normalizedUrl = normalizeUrl(url);

  const { data, error } = await supabase.functions.invoke<ScrapeResult>('scrape-url', {
    body: { url: normalizedUrl }
  });

  if (error) {
    console.error('Edge Function error:', error);
    return {
      success: false,
      error: error.message,
      code: 'SCRAPE_FAILED'
    };
  }

  return data || { success: false, error: 'No response', code: 'SCRAPE_FAILED' };
}
```

### Anti-Patterns to Avoid
- **Client-side fetch for scraping:** CORS will block requests. Always use Edge Function.
- **Single extraction method:** Sites vary wildly. Always implement fallback chains.
- **Blocking UI on slow scrapes:** Show loading state immediately, allow cancellation.
- **Discarding source URL:** Always store the original URL for re-scraping and user verification.
- **Assuming price format:** Prices come in $19.99, 19,99 EUR, and many other formats. Always normalize.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML parsing | Custom regex | cheerio | Handles malformed HTML, encoding issues, edge cases |
| URL normalization | String manipulation | URL API | Handles encoding, relative URLs, query params correctly |
| Price parsing | Custom regex | Structured extraction + parseFloat | Currencies, locales, formats vary enormously |
| User-Agent rotation | Manual string selection | Predefined browser-like headers | Anti-bot detection looks for many signals |
| JSON-LD parsing | Custom parser | JSON.parse + type guards | Standard JSON, just needs error handling |

**Key insight:** Product pages are wildly inconsistent. The complexity isn't in parsing one site -- it's in gracefully handling thousands of different implementations without breaking.

## Common Pitfalls

### Pitfall 1: JavaScript-Rendered Content Returns Empty
**What goes wrong:** Scraper returns null/empty for dynamic sites (SPAs, React stores)
**Why it happens:** Server-side fetch only gets initial HTML; JavaScript hasn't executed
**How to avoid:**
- Accept this limitation for v1 (affects ~15-20% of sites)
- Implement graceful fallback UI for manual entry
- Consider Puppeteer/Playwright for v2 (significant complexity increase)
**Warning signs:** Consistent failures for Shopify stores, modern React sites

### Pitfall 2: Anti-Bot Protection Returns Wrong Content
**What goes wrong:** Scraper gets CAPTCHA page, login wall, or different HTML than browser
**Why it happens:** Sites detect non-browser User-Agent, request patterns, or datacenter IPs
**How to avoid:**
- Use realistic browser User-Agent string
- Add Accept, Accept-Language headers
- Don't scrape too frequently (no retry storms)
- Return graceful error, don't retry aggressively
**Warning signs:** HTML contains "captcha", "verify you're human", or is suspiciously short

### Pitfall 3: Price Extraction Returns Wrong Currency/Format
**What goes wrong:** User sees $1999 instead of $19.99, or EUR price displayed as USD
**Why it happens:** Inconsistent decimal separators (1.999,00 vs 1,999.00), missing currency metadata
**How to avoid:**
- Extract currency alongside price (product:price:currency, priceCurrency)
- Handle both comma and dot as decimal separators based on locale hints
- Validate price is reasonable (not 0, not millions)
- Store raw scraped price string for debugging
**Warning signs:** Prices that are 100x too high or low, mismatched currencies

### Pitfall 4: Edge Function Timeout on Slow Sites
**What goes wrong:** Function returns 504 after 150s, user sees error
**Why it happens:** Target site is slow, or redirect chains add latency
**How to avoid:**
- Set fetch timeout (5-10s max)
- Use AbortController for fetch timeout
- Return partial results if some extraction succeeded
- Show loading state with "taking longer than expected" message after 3s
**Warning signs:** Intermittent timeouts, specific domains consistently slow

### Pitfall 5: Image URLs That Expire or Are Relative
**What goes wrong:** Scraped image shows as broken after hours/days, or is 404 immediately
**Why it happens:** Some sites use signed URLs with expiration, or return relative paths
**How to avoid:**
- Convert relative URLs to absolute using base URL
- Store source URL for re-scraping if image fails
- Consider downloading and storing images in Supabase Storage (v2)
- Implement image fallback in UI
**Warning signs:** Images that work initially but break later

## Code Examples

### Complete Metadata Extraction Function
```typescript
// Source: Aggregated from cheerio docs, Open Graph protocol, schema.org
interface ExtractedMetadata {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  siteName: string | null;
}

function extractMetadata(html: string, url: string): ExtractedMetadata {
  const $ = cheerio.load(html);
  const baseUrl = new URL(url).origin;

  // Helper to get meta content
  const getMeta = (selectors: string[]): string | null => {
    for (const selector of selectors) {
      const content = $(selector).attr('content');
      if (content) return content.trim();
    }
    return null;
  };

  // Extract from JSON-LD first (most structured)
  const jsonLdData = extractFromJsonLd($);

  // Title fallback chain
  const title = jsonLdData.title ||
    getMeta(['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    $('title').text().trim() ||
    $('h1').first().text().trim() ||
    null;

  // Description fallback chain
  const description = jsonLdData.description ||
    getMeta([
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]'
    ]) ||
    null;

  // Image fallback chain
  let imageUrl = jsonLdData.imageUrl ||
    getMeta([
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]'
    ]);

  // Resolve relative image URLs
  if (imageUrl && !imageUrl.startsWith('http')) {
    try {
      imageUrl = new URL(imageUrl, baseUrl).toString();
    } catch {
      // Keep original if URL parsing fails
    }
  }

  // Price extraction: OG -> JSON-LD -> microdata -> common selectors
  const priceAmount = getMeta([
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]'
  ]);

  let price: number | null = null;
  if (priceAmount) {
    price = parsePrice(priceAmount);
  } else if (jsonLdData.price !== undefined) {
    price = jsonLdData.price;
  } else {
    // Fallback to HTML selectors
    price = extractPriceFromSelectors($);
  }

  // Currency
  const currency = getMeta([
    'meta[property="product:price:currency"]',
    'meta[property="og:price:currency"]'
  ]) || jsonLdData.currency || 'USD';

  // Site name
  const siteName = getMeta(['meta[property="og:site_name"]']) ||
    new URL(url).hostname.replace('www.', '');

  return { title, description, imageUrl, price, currency, siteName };
}
```

### Price Parsing Utility
```typescript
// Source: price-parser patterns, international price formats
function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null;

  // Remove currency symbols and whitespace
  let cleaned = priceStr.replace(/[^\d.,\s]/g, '').trim();

  // Handle European format (1.234,56 or 1 234,56)
  if (cleaned.includes(',') && cleaned.indexOf(',') > cleaned.lastIndexOf('.')) {
    // Comma is decimal separator
    cleaned = cleaned.replace(/[.\s]/g, '').replace(',', '.');
  } else {
    // Dot is decimal separator (US format)
    cleaned = cleaned.replace(/[,\s]/g, '');
  }

  const price = parseFloat(cleaned);

  // Sanity check: price should be reasonable
  if (isNaN(price) || price <= 0 || price > 1000000) {
    return null;
  }

  return Math.round(price * 100) / 100; // Round to cents
}

function extractPriceFromSelectors($: cheerio.CheerioAPI): number | null {
  const selectors = [
    '[itemprop="price"]',
    '[data-price]',
    '.price .amount',
    '.product-price',
    '#price',
    '.a-price .a-offscreen', // Amazon
  ];

  for (const selector of selectors) {
    const el = $(selector).first();
    const content = el.attr('content') || el.text();
    if (content) {
      const price = parsePrice(content);
      if (price) return price;
    }
  }

  return null;
}
```

### URL Normalization
```typescript
// Source: normalize-url patterns, common tracking parameters
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'tag', 'fbclid', 'gclid', 'msclkid', 'dclid',
      'mc_cid', 'mc_eid', 'zanpid', '_ga', 'sref'
    ];

    trackingParams.forEach(param => parsed.searchParams.delete(param));

    // Ensure HTTPS
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function isValidProductUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

### Browser-Like Fetch Headers
```typescript
// Source: ScrapeOps header optimization guide, common browser headers
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

async function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jsdom in Node | cheerio or linkedom | 2020+ | 6-8x faster, less memory |
| Puppeteer for everything | Static HTML first, Puppeteer fallback | 2022+ | Much faster for ~80% of sites |
| Custom regex for prices | JSON-LD + OG meta + fallback selectors | 2021+ | More reliable, currency-aware |
| esm.sh imports | npm: specifier in Deno | 2023 | Better compatibility, versioning |
| Import maps (legacy) | deno.json imports | 2024+ | Per-function config, clearer |

**Deprecated/outdated:**
- `deno.land/x` imports for npm packages - prefer `npm:package@version` specifier
- jsdom in Edge Functions - too heavy, use cheerio
- Scraping without User-Agent - most sites block default Deno/Node agents

## Retailer-Specific Notes

### Amazon
- **OG tags:** Generally present for og:title, og:image, og:description
- **Price:** NOT in OG meta. Use JSON-LD `offers.price` or `.a-price .a-offscreen` selector
- **Gotchas:** Aggressive bot detection, may require residential proxy for production scale

### Target
- **OG tags:** Good support for standard tags
- **Price:** Available in JSON-LD Schema.org Product format
- **Gotchas:** Uses signed image URLs that may expire

### Etsy
- **OG tags:** Full support including product:price:amount
- **Price:** Both OG meta and JSON-LD available
- **Gotchas:** Heavily JS-rendered listing pages, but individual product pages have good HTML

### Generic (Shopify, WooCommerce, etc.)
- **OG tags:** Usually present via platform plugins
- **Price:** JSON-LD often available (recommended by Google for rich snippets)
- **Gotchas:** Quality varies by store configuration

## Open Questions

1. **Image caching strategy**
   - What we know: Some retailer images have signed URLs that expire
   - What's unclear: How long do different retailers' image URLs last?
   - Recommendation: For v1, store source URL for re-scraping. For v2, consider Supabase Storage proxy.

2. **Rate limiting from retailers**
   - What we know: Amazon and others rate-limit scrapers
   - What's unclear: What request volume triggers blocks from Supabase Edge Function IPs?
   - Recommendation: Start conservatively. Add caching for duplicate URLs. Monitor for blocks.

3. **Scrape result caching**
   - What we know: Same URL scraped multiple times wastes resources
   - What's unclear: Cache duration? Store in DB or Edge Function?
   - Recommendation: For v1, no caching (simple). For v2, add `url_scrape_cache` table.

## Sources

### Primary (HIGH confidence)
- [Supabase Edge Functions Dependencies](https://supabase.com/docs/guides/functions/dependencies) - npm: specifier syntax
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) - 2s CPU, 150s wall clock, 256MB memory
- [Open Graph Protocol](https://ogp.me/) - og:title, og:image, og:description standard
- [schema.org/Product](https://schema.org/Product) - JSON-LD Product type with offers/price
- [cheerio GitHub](https://github.com/cheeriojs/cheerio) - jQuery-like HTML parsing

### Secondary (MEDIUM confidence)
- [ZenRows Cheerio Guide](https://www.zenrows.com/blog/jsdom-vs-cheerio) - Performance comparison, API patterns
- [WebScraping.AI Cheerio Meta Tags](https://webscraping.ai/faq/cheerio/how-do-you-use-cheerio-to-extract-social-media-meta-tags) - Extraction examples
- [ScrapeOps Header Guide](https://scrapeops.io/web-scraping-playbook/web-scraping-guide-header-user-agents/) - Browser-like headers for anti-bot
- [price-parser GitHub](https://github.com/scrapinghub/price-parser) - International price format patterns

### Tertiary (LOW confidence - needs validation)
- Retailer-specific selectors (Amazon, Target, Etsy) - tested patterns but may change
- Image expiration behaviors - observed but not officially documented

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - cheerio + Deno fetch is well-documented, matches existing Edge Function patterns
- Architecture: HIGH - follows existing project patterns (lib/supabase.ts, push/index.ts)
- Pitfalls: MEDIUM-HIGH - known issues from research, but retailer-specific behaviors may vary

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - cheerio stable, OG protocol stable, retailer implementations may change)
