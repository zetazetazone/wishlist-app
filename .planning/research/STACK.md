# Stack Research: URL Scraping, Share Intents & Multi-Wishlist

**Domain:** Mobile wishlist app with URL-based item creation
**Researched:** 2026-02-16
**Confidence:** HIGH

## Summary

**Two new npm dependencies** and **one new Edge Function** required for v2.0 features:

1. **`expo-share-intent@^5.1.1`** - Receive shared links from browser/store apps (requires dev client, cannot use Expo Go)
2. **`patch-package@^8.0.0`** - Required peer dependency for expo-share-intent
3. **New Edge Function** - `scrape-url` using Deno's `npm:cheerio` for server-side URL metadata extraction

**Multi-wishlist architecture requires no new dependencies** - pure database schema and RLS changes.

The existing stack already has `expo-image` (v3.0.11) for displaying scraped product images and `expo-linking` (v8.0.11) for opening external URLs.

---

## Recommended Stack

### New Dependencies (Client)

| Package | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `expo-share-intent` | `^5.1.1` | Receive shared URLs from other apps | Only actively maintained share intent library for Expo SDK 54. Native module handles iOS share extension and Android intent filters. 5.0+ required for SDK 54. |
| `patch-package` | `^8.0.0` | Post-install patches for share intent | Required peer dependency - expo-share-intent uses patches for iOS Xcode configuration. |

### New Infrastructure (Server)

| Component | Runtime | Purpose | Why Recommended |
|-----------|---------|---------|-----------------|
| `scrape-url` Edge Function | Deno + cheerio | Extract metadata from product URLs | Server-side scraping bypasses CORS. Cheerio is lightweight (~200KB) vs Puppeteer. Uses `npm:cheerio@1.0.0` specifier. |

### Already Installed (No Action Needed)

| Package | Version | Reuse For | Notes |
|---------|---------|-----------|-------|
| `expo-image` | `3.0.11` | Display scraped product images | Memory-disk caching for grid performance |
| `expo-linking` | `8.0.11` | Open product URLs in browser | `Linking.openURL(item.url)` |
| `@supabase/supabase-js` | `2.93.3` | Call Edge Function from client | `supabase.functions.invoke('scrape-url')` |

---

## Installation

```bash
# Client dependencies
npx expo install expo-share-intent
npm install patch-package --save

# Add post-install script to package.json
# "postinstall": "patch-package"

# Copy iOS patches to project
cp -r node_modules/expo-share-intent/patches ./patches
```

**Post-install configuration:**

```json
// app.json - add expo-share-intent plugin
{
  "expo": {
    "plugins": [
      [
        "expo-share-intent",
        {
          "iosShareScheme": "wishlist",
          "androidMainActivityAttributes": {
            "android:launchMode": "singleTask"
          }
        }
      ]
    ]
  }
}
```

---

## Key Implementation Patterns

### 1. Share Intent Reception (Client)

```typescript
// app/_layout.tsx or dedicated hook
import { useShareIntent } from "expo-share-intent";

export function useIncomingShare() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();

  useEffect(() => {
    if (hasShareIntent && shareIntent?.webUrl) {
      // Navigate to add-item flow with pre-filled URL
      router.push({
        pathname: "/add-item",
        params: { sharedUrl: shareIntent.webUrl }
      });
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent]);

  return { error };
}
```

**Share intent data structure:**
```typescript
interface ShareIntent {
  webUrl?: string;     // URL shared from browser/app
  text?: string;       // Plain text (may contain URL)
  files?: ShareFile[]; // Images/files (not needed for URL scraping)
}
```

### 2. URL Metadata Scraping (Edge Function)

```typescript
// supabase/functions/scrape-url/index.ts
import * as cheerio from "npm:cheerio@1.0.0";

interface ScrapedMetadata {
  title: string | null;
  description: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  site_name: string | null;
}

Deno.serve(async (req) => {
  const { url } = await req.json();

  // Fetch page HTML
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WishlistBot/1.0)',
      'Accept': 'text/html',
    }
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract Open Graph metadata (priority)
  const metadata: ScrapedMetadata = {
    title: $('meta[property="og:title"]').attr('content')
           || $('title').text()
           || null,
    description: $('meta[property="og:description"]').attr('content')
                 || $('meta[name="description"]').attr('content')
                 || null,
    image_url: $('meta[property="og:image"]').attr('content')
               || $('meta[property="og:image:url"]').attr('content')
               || null,
    price: extractPrice($),
    currency: $('meta[property="product:price:currency"]').attr('content')
              || $('meta[property="og:price:currency"]').attr('content')
              || 'USD',
    site_name: $('meta[property="og:site_name"]').attr('content')
               || new URL(url).hostname.replace('www.', '')
               || null,
  };

  return new Response(JSON.stringify(metadata), {
    headers: { 'Content-Type': 'application/json' }
  });
});

function extractPrice($: cheerio.CheerioAPI): number | null {
  // Try product schema price
  const schemaPrice = $('meta[property="product:price:amount"]').attr('content')
                      || $('meta[property="og:price:amount"]').attr('content');
  if (schemaPrice) return parseFloat(schemaPrice);

  // Try JSON-LD product schema
  const jsonLd = $('script[type="application/ld+json"]').html();
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd);
      if (data['@type'] === 'Product' && data.offers?.price) {
        return parseFloat(data.offers.price);
      }
    } catch {}
  }

  return null;
}
```

**Edge Function config:**
```json
// supabase/functions/scrape-url/deno.json
{
  "imports": {
    "cheerio": "npm:cheerio@1.0.0"
  }
}
```

### 3. Client Scraping Integration

```typescript
// utils/scraping.ts
import { supabase } from '@/lib/supabase';

export async function scrapeProductUrl(url: string): Promise<ScrapedMetadata | null> {
  const { data, error } = await supabase.functions.invoke('scrape-url', {
    body: { url }
  });

  if (error) {
    console.error('Scraping failed:', error);
    return null;
  }

  return data;
}
```

### 4. Multi-Wishlist Data Model

**No new dependencies** - schema changes only:

```sql
-- Migration: 00XX_multi_wishlist.sql

-- New wishlists table (owned by users, not groups)
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎁',
  is_default BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'group', 'public')),
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL, -- Optional group association
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update wishlist_items to reference wishlists
ALTER TABLE wishlist_items
  ADD COLUMN wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE;

-- Migrate existing items to default wishlist
-- (Migration script creates default wishlist per user and links items)

-- RLS: Users can CRUD their own wishlists
CREATE POLICY "users_own_wishlists" ON wishlists
  FOR ALL USING (auth.uid() = user_id);

-- RLS: Visibility-based read access (friends, group members, public)
CREATE POLICY "visibility_read_wishlists" ON wishlists
  FOR SELECT USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'friends' AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND ((user_id = auth.uid() AND friend_id = wishlists.user_id)
           OR (friend_id = auth.uid() AND user_id = wishlists.user_id))
    ))
    OR (visibility = 'group' AND group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    ))
  );
```

---

## Version Compatibility

| Package | Version | Expo SDK 54 | React Native 0.81 | Notes |
|---------|---------|-------------|-------------------|-------|
| `expo-share-intent` | `5.1.1` | Yes (5.0+ for SDK 54) | Yes | Requires dev client, no Expo Go |
| `patch-package` | `8.0.0` | N/A (dev tool) | N/A | Stable, widely used |
| `cheerio` (Deno) | `1.0.0` | N/A (server) | N/A | Works with `npm:` specifier |

**Expo SDK 55 Note:** [expo-sharing](https://docs.expo.dev/versions/latest/sdk/sharing/) will add experimental config plugin for receive-sharing in SDK 55 (January 2026). For SDK 54, expo-share-intent is the solution.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-native-receive-sharing-intent` | Bare workflow only, not Expo compatible | `expo-share-intent` |
| `link-preview-js` (client-side) | CORS blocked in browsers, docs say "DO NOT FETCH FROM USER DEVICE" | Edge Function with cheerio |
| `puppeteer` in Edge Function | Too heavy (50MB+), timeout issues in serverless | cheerio (200KB) |
| `@lowkey/react-native-link-preview` | Native module, adds complexity for simple metadata | Edge Function |
| `metascraper` | Node-only, many dependencies | cheerio (single package) |
| `expo-share-extension` | For custom iOS share view UI, overkill for URL capture | `expo-share-intent` |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `expo-share-intent` | `expo-share-extension` | When you need custom iOS share sheet UI (Pinterest-style) |
| Edge Function scraping | External API (OpenGraph.io, Zyte) | High volume (>10K URLs/month) or need anti-bot bypass |
| cheerio | `deno-dom-wasm` | If cheerio has issues; deno-dom is Deno-native but less jQuery-like API |
| Server-side scraping | Client-side `link-preview-js` | Never for user devices (CORS), only for Node backends |

---

## Stack Patterns by Variant

**If app uses Expo Go for development:**
- Share intents require a dev client build
- Run `npx expo prebuild` then `npx expo run:ios` or `run:android`
- Cannot test share intent in Expo Go

**If high-volume URL scraping needed:**
- Consider external API (OpenGraph.io: $49/mo for 50K requests)
- Add rate limiting to Edge Function
- Cache scraped metadata in database (dedupe by URL)

**If scraping e-commerce sites with anti-bot protection:**
- Edge Function cheerio approach may fail on some sites
- Consider Zyte API or BrightData for production
- Start with cheerio, escalate if needed

---

## Integration Points

### Share Intent Flow

```
User shares URL from browser
        |
        v
expo-share-intent receives
        |
        v
Navigate to /add-item with URL param
        |
        v
Call supabase.functions.invoke('scrape-url')
        |
        v
Display scraped metadata (editable)
        |
        v
Save to wishlist_items with url, scraped data
```

### Database Schema Changes

```
users (1) ----< wishlists (N) ----< wishlist_items (N)
                    |
                    v (optional)
                 groups
```

**Migration considerations:**
1. Create default wishlist per user
2. Move existing items to default wishlist
3. Keep `group_id` on items for backward compat during transition
4. Eventually deprecate `group_id` on items, use `wishlist.group_id`

---

## Confidence Assessment

| Area | Confidence | Evidence |
|------|------------|----------|
| expo-share-intent SDK 54 compat | HIGH | [npm](https://www.npmjs.com/package/expo-share-intent): v5.1.1 states "SDK 54: 5.0+" |
| Cheerio in Deno Edge Functions | HIGH | [Supabase docs](https://supabase.com/docs/guides/functions/dependencies): `npm:` specifier supported |
| Server-side scraping requirement | HIGH | [link-preview-js docs](https://github.com/ospfranco/link-preview-js): "DO NOT FETCH FROM USER DEVICE" |
| Multi-wishlist schema | HIGH | Standard relational pattern, no external dependencies |
| Dev client requirement | HIGH | [expo-share-intent README](https://github.com/achorein/expo-share-intent): "cannot use Expo Go" |

---

## Sources

### Share Intent
- [expo-share-intent GitHub](https://github.com/achorein/expo-share-intent) - Installation, SDK compatibility
- [expo-share-intent npm](https://www.npmjs.com/package/expo-share-intent) - Version 5.1.1
- [Expo Sharing Docs](https://docs.expo.dev/versions/latest/sdk/sharing/) - SDK 55 experimental receive support

### URL Scraping
- [link-preview-js](https://github.com/ospfranco/link-preview-js) - CORS warning, server-side only
- [Supabase Edge Functions Dependencies](https://supabase.com/docs/guides/functions/dependencies) - npm: specifier
- [Open Graph Protocol](https://ogp.me/) - Metadata schema reference

### Multi-Wishlist
- No external sources - standard PostgreSQL schema design

---

## Previous Stack Research (Preserved)

### v1.6 Wishlist UI Redesign (2025-02-12)
One new dependency: `expo-image@~3.0.11` for product image handling. FlashList masonry for Pinterest-style grid.

### v1.5 Localization (2025-02-11)
Two new dependencies: `expo-localization@~17.0.8` and `i18next@^25.8.5` + `react-i18next@^16.5.4`.

### v1.4 Friends System (2025-02-09)
One new dependency: `expo-contacts@~15.0.11` for device phonebook access.

### v1.3 Gift Claims & Personal Details (2025-02-05)
No new dependencies. gift_claims and personal_details tables.

### v1.2 Group Experience (2025-02-04)
No new dependencies. expo-image-picker + Supabase Storage.

### v1.1 Wishlist Polish (2025-02-03)
No new dependencies.

---
*Research completed: 2026-02-16*
