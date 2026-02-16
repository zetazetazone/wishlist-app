# Architecture Research: URL Scraping, Share Intent, and Multi-Wishlist

**Domain:** URL scraping, share intent, and multi-wishlist integration
**Researched:** 2026-02-16
**Confidence:** HIGH (existing patterns well-documented, external libraries verified)

## Summary

This architecture extends the existing wishlist app with three interconnected features:

1. **URL Scraping:** Server-side metadata extraction via Supabase Edge Function to avoid CORS issues and provide consistent parsing
2. **Share Intent:** Native module (`expo-share-intent`) to receive URLs from OS share sheets, requiring a dev client
3. **Multi-Wishlist:** Data model evolution from group-scoped items to user-owned wishlists with optional sharing

**Key architectural decisions:**

1. **Edge Function for scraping:** Client-side fetch fails due to CORS. Server-side Deno function using `linkedom` or `deno-dom` for HTML parsing. Returns normalized metadata (title, image, price, description).

2. **expo-share-intent at layout level:** The hook must be in root `_layout.tsx` before navigation providers. Native code required (no Expo Go).

3. **Wishlists as user-owned containers:** New `wishlists` table owns items via `wishlist_id` FK. Each user has a default wishlist. Items migrate from `group_id` model to `wishlist_id` model.

4. **Rename amazon_url to source_url:** Broader naming reflects any URL source, not just Amazon.

---

## System Overview

```
                          SHARE INTENT FLOW
┌─────────────────────────────────────────────────────────────────────────────┐
│                        External Apps (Safari, Amazon, etc.)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                              OS Share Sheet                                  │
│                      (User selects Wishlist App)                             │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        expo-share-intent                                     │
│              (Native module - requires dev client)                           │
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐        │
│  │ iOS Share    │    │ Android Intent   │    │ useShareIntent()   │        │
│  │ Extension    │    │ Filter           │    │ Hook               │        │
│  └──────────────┘    └──────────────────┘    └─────────┬──────────┘        │
└────────────────────────────────────────────────────────┼────────────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         App Layer (Expo Router)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐        │
│  │ ShareIntent  │ →  │ URL Extractor    │ →  │ AddItem Flow       │        │
│  │ Handler      │    │ Service          │    │ (pre-populated)    │        │
│  │ (_layout)    │    │                  │    │                    │        │
│  └──────────────┘    └────────┬─────────┘    └────────────────────┘        │
│                               │                                              │
├───────────────────────────────┼──────────────────────────────────────────────┤
│                               ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Supabase Edge Function                             │  │
│  │                        scrape-url                                      │  │
│  │                                                                        │  │
│  │   Input: URL → Fetch HTML → Parse OG/Meta → Return Metadata           │  │
│  │                                                                        │  │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐            │  │
│  │   │ fetch()     │ → │ HTML Parse  │ → │ { title, image, │            │  │
│  │   │ with UA     │   │ (linkedom)  │   │   price, desc } │            │  │
│  │   └─────────────┘   └─────────────┘   └─────────────────┘            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                         Data Layer (Supabase)                                │
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐        │
│  │ wishlists    │ ←→ │ wishlist_items   │ ←→ │ gift_claims        │        │
│  │ (NEW)        │    │ (MODIFIED)       │    │ (existing)         │        │
│  └──────────────┘    └──────────────────┘    └────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| expo-share-intent | Receive URLs from OS share sheet | Native module with `useShareIntent` hook |
| ShareIntentHandler | Process incoming shared URLs | Top-level component in `_layout.tsx` |
| scrape-url Edge Function | Extract metadata from URLs | Deno function using linkedom for parsing |
| AddItemService | Orchestrate URL scraping + item creation | Service layer coordinating Edge Function + DB |
| wishlists table | User-owned wishlist containers | New table with name, description, ordering |
| wishlist_items.wishlist_id | Link items to user wishlists | New FK column, migration from group_id model |

---

## Data Model Changes

### Current State (Group-Scoped Items)

```
users (1) ─────────────────── (*) wishlist_items
                                       │
groups (1) ─────────────────── (*) ────┘ (via group_id, nullable)
```

Items can belong to groups via `group_id`. Users have items directly via `user_id`. There is no concept of named personal wishlists - all items are in one flat list.

### Target State (User-Owned Wishlists)

```
users (1) ─────── (*) wishlists (1) ─────── (*) wishlist_items
                        │
                        └── (*) wishlist_shares (visibility)
                              │
                              └── friends / groups (sharing targets)
```

Users own wishlists. Items belong to wishlists. Wishlists can be shared with friends or groups.

### New Table: `wishlists`

```sql
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Wishlist',
  description TEXT,
  emoji TEXT DEFAULT '🎁',        -- Visual identifier
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,   -- For manual ordering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one default wishlist per user (partial unique index)
CREATE UNIQUE INDEX idx_wishlists_default_per_user
  ON public.wishlists(user_id)
  WHERE (is_default = TRUE);

-- Index for user's wishlists
CREATE INDEX idx_wishlists_user ON public.wishlists(user_id);

-- RLS
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their wishlists"
  ON public.wishlists FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own wishlists"
  ON public.wishlists FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own wishlists"
  ON public.wishlists FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own wishlists"
  ON public.wishlists FOR DELETE
  USING (user_id = (SELECT auth.uid()) AND is_default = FALSE);
```

### Modified Table: `wishlist_items`

```sql
-- Phase 1: Add wishlist_id column (nullable for migration)
ALTER TABLE public.wishlist_items
ADD COLUMN wishlist_id UUID REFERENCES public.wishlists(id) ON DELETE CASCADE;

-- Index for wishlist items
CREATE INDEX idx_wishlist_items_wishlist ON public.wishlist_items(wishlist_id);

-- Phase 2: Rename amazon_url to source_url
ALTER TABLE public.wishlist_items
RENAME COLUMN amazon_url TO source_url;

-- Phase 2: Add scraped metadata columns
ALTER TABLE public.wishlist_items
ADD COLUMN scraped_at TIMESTAMPTZ,          -- When metadata was last fetched
ADD COLUMN scrape_status TEXT CHECK (scrape_status IN ('pending', 'success', 'failed', 'manual'));

-- Phase 3: Update constraint for source_url
ALTER TABLE public.wishlist_items
DROP CONSTRAINT IF EXISTS amazon_url_by_item_type;

ALTER TABLE public.wishlist_items
ADD CONSTRAINT source_url_by_item_type CHECK (
  (item_type = 'standard' AND source_url IS NOT NULL AND source_url != '')
  OR
  (item_type != 'standard')
);
```

### New Table: `wishlist_shares` (Phase 2 - for friend/group visibility)

```sql
CREATE TABLE public.wishlist_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID REFERENCES public.wishlists(id) ON DELETE CASCADE NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('friend', 'group', 'link')),
  -- friend_id for direct shares, group_id for group shares
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Must have exactly one target (or none for link shares)
  CONSTRAINT valid_share_target CHECK (
    (share_type = 'friend' AND target_user_id IS NOT NULL AND target_group_id IS NULL) OR
    (share_type = 'group' AND target_group_id IS NOT NULL AND target_user_id IS NULL) OR
    (share_type = 'link' AND target_user_id IS NULL AND target_group_id IS NULL)
  ),

  -- Prevent duplicate shares
  CONSTRAINT unique_friend_share UNIQUE (wishlist_id, target_user_id),
  CONSTRAINT unique_group_share UNIQUE (wishlist_id, target_group_id)
);
```

### Migration Strategy

**Phase 1: Add wishlists structure (non-breaking)**

1. Create `wishlists` table with RLS
2. Add `wishlist_id` column to `wishlist_items` (nullable initially)
3. Create default wishlist for each user with existing items
4. Backfill `wishlist_id` for all existing items

```sql
-- Example migration for Phase 1
BEGIN;

-- 1. Create wishlists table (shown above)

-- 2. Add wishlist_id to items
ALTER TABLE public.wishlist_items
ADD COLUMN wishlist_id UUID REFERENCES public.wishlists(id);

-- 3. Create default wishlists for all users who have items
INSERT INTO public.wishlists (user_id, name, is_default)
SELECT DISTINCT user_id, 'My Wishlist', TRUE
FROM public.wishlist_items
ON CONFLICT DO NOTHING;

-- 4. Backfill wishlist_id
UPDATE public.wishlist_items wi
SET wishlist_id = (
  SELECT id FROM public.wishlists w
  WHERE w.user_id = wi.user_id AND w.is_default = TRUE
)
WHERE wi.wishlist_id IS NULL;

COMMIT;
```

**Phase 2: URL column rename (non-breaking)**

1. Rename `amazon_url` to `source_url`
2. Add new metadata columns
3. Update TypeScript types
4. Update all component references (grep shows ~50 occurrences)

**Phase 3: Enforce wishlists (after backfill verified)**

1. Make `wishlist_id` NOT NULL
2. Update RLS policies for wishlist-based access
3. Keep group_id for backwards compatibility with group celebrations

---

## Architectural Patterns

### Pattern 1: Share Intent Handler at Layout Level

**What:** Process share intents in the root `_layout.tsx` using `useShareIntent` hook, then navigate to add-item flow with pre-populated data.

**When to use:** Always for share intent handling - the hook must be at the top level before any navigation providers.

**Trade-offs:**
- Pro: Single entry point, consistent handling across app states
- Pro: Works whether app is fresh launch or already running
- Con: Root layout becomes more complex
- Con: Must handle auth state (can't add items if not logged in)

**Example:**

```typescript
// app/_layout.tsx
import { useShareIntent } from 'expo-share-intent';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function RootLayout() {
  const router = useRouter();
  const { session } = useAuth();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (hasShareIntent && shareIntent?.type === 'url') {
      if (session) {
        // User is logged in, navigate to add item
        router.push({
          pathname: '/(app)/add-from-url',
          params: { url: shareIntent.value }
        });
      } else {
        // Store URL for after login
        AsyncStorage.setItem('pending_share_url', shareIntent.value);
      }
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, session]);

  return <Stack />;
}
```

### Pattern 2: Edge Function for URL Scraping

**What:** Server-side scraping in Supabase Edge Function to avoid CORS, handle anti-bot measures, and provide consistent metadata extraction.

**When to use:** For any URL metadata extraction. Client-side fetch fails due to CORS.

**Trade-offs:**
- Pro: No CORS issues
- Pro: Can add proxy/retry logic
- Pro: Single implementation for all platforms
- Pro: Can cache results for duplicate URLs
- Con: Cold start latency (100-300ms)
- Con: Edge Function invocation costs
- Con: Some sites block server-side requests

**Example:**

```typescript
// supabase/functions/scrape-url/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts';

interface ScrapeResult {
  title: string | null;
  description: string | null;
  image: string | null;
  price: string | null;
  currency: string | null;
  siteName: string | null;
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || !isValidUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch with browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WishlistBot/1.0; +https://wishlist.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Extract Open Graph metadata
    const getMetaContent = (property: string) =>
      doc?.querySelector(`meta[property="${property}"]`)?.getAttribute('content') ||
      doc?.querySelector(`meta[name="${property}"]`)?.getAttribute('content');

    const result: ScrapeResult = {
      title: getMetaContent('og:title') || doc?.querySelector('title')?.textContent?.trim() || null,
      description: getMetaContent('og:description') || getMetaContent('description'),
      image: getMetaContent('og:image'),
      price: getMetaContent('product:price:amount') || extractPriceFromPage(doc),
      currency: getMetaContent('product:price:currency') || 'USD',
      siteName: getMetaContent('og:site_name') || new URL(url).hostname,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function extractPriceFromPage(doc: Document | null): string | null {
  if (!doc) return null;

  // Common price selectors
  const selectors = [
    '[data-price]',
    '.price',
    '#price',
    '[itemprop="price"]',
    '.a-price .a-offscreen', // Amazon
  ];

  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = element.textContent || element.getAttribute('content') || '';
      const match = text.match(/[\d,.]+/);
      if (match) return match[0];
    }
  }

  return null;
}
```

### Pattern 3: Service Layer for URL Processing

**What:** Dedicated service that orchestrates URL validation, Edge Function calls, and database writes.

**When to use:** To keep components thin and logic reusable across add-from-share and manual URL entry.

**Trade-offs:**
- Pro: Testable, reusable, separation of concerns
- Pro: Single place to add caching, retry logic
- Con: Extra layer of indirection

**Example:**

```typescript
// services/url-scraper.ts
import { supabase } from '@/lib/supabase';

export interface ScrapedMetadata {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  siteName: string | null;
}

export async function scrapeUrl(url: string): Promise<ScrapedMetadata> {
  // Normalize URL (remove tracking params)
  const normalizedUrl = normalizeUrl(url);

  // Call Edge Function
  const { data, error } = await supabase.functions.invoke('scrape-url', {
    body: { url: normalizedUrl }
  });

  if (error) {
    console.error('Scrape error:', error);
    throw new Error(`Failed to scrape URL: ${error.message}`);
  }

  // Parse price string to number
  const price = data.price ? parseFloat(data.price.replace(/[^0-9.]/g, '')) : null;

  return {
    title: data.title,
    description: data.description,
    imageUrl: data.image,
    price: isNaN(price) ? null : price,
    siteName: data.siteName,
  };
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'tag', 'fbclid', 'gclid', 'msclkid'
    ];

    trackingParams.forEach(param => parsed.searchParams.delete(param));

    return parsed.toString();
  } catch {
    return url;
  }
}
```

---

## Data Flow

### Share Intent Flow

```
[User shares URL from browser/app]
        │
        ▼
[OS Share Sheet] ── (user selects wishlist app)
        │
        ▼
[expo-share-intent native module]
        │
        ├── iOS: Share Extension receives URL
        └── Android: Intent filter captures ACTION_SEND
        │
        ▼
[useShareIntent hook in _layout.tsx]
        │
        ├── hasShareIntent: true
        └── shareIntent: { type: 'url', value: 'https://...' }
        │
        ▼
[Check auth state]
        │
        ├── Logged in → Navigate to /add-from-url?url=...
        └── Not logged in → Store URL, show login
        │
        ▼
[AddFromUrlScreen]
        │
        ├── Show loading state
        ├── Call scrapeUrl(url) service
        │       │
        │       ▼
        │   [supabase.functions.invoke('scrape-url')]
        │       │
        │       ▼
        │   [Edge Function fetches & parses HTML]
        │       │
        │       ▼
        │   [Return { title, image, price, ... }]
        │
        ▼
[Display pre-filled form]
        │
        ├── Title (editable)
        ├── Image preview
        ├── Price (editable)
        ├── Priority picker
        └── Wishlist picker (select which wishlist)
        │
        ▼
[User confirms → insert to wishlist_items]
        │
        ├── source_url = normalized URL
        ├── scraped_at = NOW()
        ├── scrape_status = 'success'
        └── wishlist_id = selected wishlist
```

### Multi-Wishlist State Management

```
┌─────────────────────────────────────────────────────────────┐
│                     Wishlist State                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   React Context                       │   │
│  │              (or Zustand if needed)                   │   │
│  │                                                       │   │
│  │  wishlists: Wishlist[]                               │   │
│  │  selectedWishlistId: string | null                    │   │
│  │  defaultWishlistId: string                            │   │
│  │                                                       │   │
│  │  actions:                                             │   │
│  │    - createWishlist(name, emoji)                      │   │
│  │    - updateWishlist(id, { name, emoji })              │   │
│  │    - deleteWishlist(id)                               │   │
│  │    - selectWishlist(id)                               │   │
│  │    - reorderWishlists(ids)                            │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Supabase Realtime                       │   │
│  │                                                       │   │
│  │  subscribe('wishlists', { user_id: auth.uid })        │   │
│  │  subscribe('wishlist_items', { wishlist_id: [...] })  │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Recommended Project Structure

```
src/
├── app/
│   ├── _layout.tsx              # Share intent handler (MODIFIED)
│   └── (app)/
│       ├── add-from-url.tsx     # NEW: URL scrape result → add item
│       ├── wishlists/
│       │   ├── index.tsx        # NEW: Wishlist list view
│       │   ├── [id].tsx         # NEW: Single wishlist view (items)
│       │   ├── create.tsx       # NEW: Create wishlist form
│       │   └── edit/[id].tsx    # NEW: Edit wishlist form
│       └── (tabs)/
│           └── index.tsx        # MODIFIED: Show selected wishlist
│
├── components/
│   └── wishlist/
│       ├── WishlistPicker.tsx   # NEW: Dropdown to select wishlist
│       ├── WishlistCard.tsx     # NEW: Card for wishlist in list
│       ├── WishlistEmoji.tsx    # NEW: Emoji picker for wishlists
│       ├── UrlPreviewCard.tsx   # NEW: Show scraped URL metadata
│       └── AddFromUrlForm.tsx   # NEW: Form with pre-filled metadata
│
├── services/
│   └── url-scraper.ts           # NEW: URL scraping orchestration
│
├── contexts/
│   └── WishlistContext.tsx      # NEW: Multi-wishlist state
│
└── hooks/
    ├── useShareIntent.ts        # NEW: Share intent wrapper
    └── useWishlists.ts          # NEW: Wishlist CRUD operations

supabase/
├── functions/
│   ├── push/                    # EXISTING
│   └── scrape-url/              # NEW: URL metadata extraction
│       └── index.ts
│
└── migrations/
    ├── [timestamp]_create_wishlists.sql          # NEW
    ├── [timestamp]_add_wishlist_id_to_items.sql  # NEW
    └── [timestamp]_rename_amazon_url.sql         # NEW
```

### Structure Rationale

- **app/add-from-url.tsx:** Dedicated screen for share intent flow, keeps tabs clean
- **app/wishlists/:** Full CRUD for managing multiple wishlists
- **services/url-scraper.ts:** Isolates Edge Function communication, enables testing
- **contexts/WishlistContext.tsx:** React Context for wishlists (simpler than Zustand for this scope)
- **supabase/functions/scrape-url/:** Server-side scraping avoids CORS, enables caching

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| expo-share-intent | NPM package + native module | Requires dev client build, no Expo Go |
| Supabase Edge Functions | `supabase.functions.invoke()` | Cold start ~100-300ms, use CORS headers |
| Open Graph / HTML | Server-side fetch in Edge Function | Some sites may block; consider fallback |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Share Intent → Add Item | Navigation params | URL passed as query param |
| Add Item → Edge Function | `supabase.functions.invoke` | Async, show loading state |
| Edge Function → Client | JSON response | Return metadata or error |
| Wishlist Context → Components | React Context | Subscribe for updates |
| Database → Realtime | Supabase Realtime | Live updates on wishlist changes |

### RLS Policy Changes

```sql
-- wishlists: Users can only see their own wishlists
CREATE POLICY "Users can view their wishlists"
  ON public.wishlists FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- wishlist_items: Add wishlist-based visibility
-- Keep existing policies for group-based visibility during migration
CREATE POLICY "Users can view items in their wishlists"
  ON public.wishlist_items FOR SELECT
  USING (
    -- Owner can always see their items
    user_id = (SELECT auth.uid())
    OR
    -- Items in user's wishlists
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.user_id = (SELECT auth.uid())
    )
    OR
    -- Legacy: items with group_id (existing policy)
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = wishlist_items.group_id
        AND gm.user_id = (SELECT auth.uid())
    ))
  );
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current approach fine. Edge Function cold starts acceptable. |
| 1k-100k users | Add URL scrape caching (store results for 24h). Consider Supabase Storage for scraped images. |
| 100k+ users | External scraping API (Microlink, ScraperAPI) to handle rate limits. Queue scrape requests. |

### Scaling Priorities

1. **First bottleneck:** Edge Function cold starts and rate limits from target sites
   - Fix: Cache scrape results in database, re-use for duplicate URLs
   - Fix: Add retry with exponential backoff
   - Fix: Store scraped images in Supabase Storage

2. **Second bottleneck:** Database queries for multi-wishlist views
   - Fix: Add compound indexes on `(wishlist_id, created_at)`, `(user_id, is_default)`
   - Fix: Paginate wishlist items (already using FlashList)

---

## Anti-Patterns

### Anti-Pattern 1: Client-Side URL Fetching

**What people do:** Try to fetch URL metadata directly from React Native using `fetch()`
**Why it's wrong:** CORS blocks most requests; no access to server-side HTML parsing libraries
**Do this instead:** Always use Edge Function for URL scraping

### Anti-Pattern 2: Share Intent in Nested Components

**What people do:** Use `useShareIntent` hook deep in the component tree
**Why it's wrong:** Hook must be at root level before navigation providers; deep placement causes missed intents
**Do this instead:** Handle share intents in `_layout.tsx`, pass data via navigation params

### Anti-Pattern 3: Storing Scraped Data Without Source

**What people do:** Only store extracted title/price, discard original URL
**Why it's wrong:** User can't verify source; re-scraping becomes impossible; link rot undetectable
**Do this instead:** Always store `source_url` and `scraped_at` timestamp

### Anti-Pattern 4: Blocking Scrape on Item Creation

**What people do:** Wait for scrape to complete before saving item
**Why it's wrong:** Slow scrapes block user; failed scrapes prevent item creation
**Do this instead:** Save item immediately with `scrape_status: 'pending'` if needed, but for share intent flow, scrape first since user expects metadata preview

### Anti-Pattern 5: Modifying group_id Migration Too Early

**What people do:** Make `wishlist_id` NOT NULL before backfill complete
**Why it's wrong:** Breaks existing data; group celebrations depend on group_id
**Do this instead:** Keep both columns during migration; deprecate group_id only after full transition verified

---

## Build Order (Dependencies)

```
Phase 1: Foundation (no external dependencies)
├── 1.1 Create wishlists table + RLS
├── 1.2 Add wishlist_id to wishlist_items (nullable)
├── 1.3 Backfill default wishlists + link items
├── 1.4 TypeScript types for wishlists
└── 1.5 WishlistContext + useWishlists hook

Phase 2: URL Scraping (depends on: none, can parallel with Phase 1)
├── 2.1 Create scrape-url Edge Function
├── 2.2 Deploy and test Edge Function
├── 2.3 Create url-scraper service
├── 2.4 Create UrlPreviewCard component
└── 2.5 Create AddFromUrlScreen

Phase 3: Share Intent (depends on: Phase 2.3, 2.5)
├── 3.1 Install expo-share-intent
├── 3.2 Configure app.json/app.config.js for share extensions
├── 3.3 Add ShareIntentHandler to _layout.tsx
├── 3.4 Build dev client for testing
└── 3.5 Test share flow end-to-end

Phase 4: Multi-Wishlist UI (depends on: Phase 1)
├── 4.1 Create WishlistPicker component
├── 4.2 Create wishlist list screen
├── 4.3 Create wishlist create/edit screens
├── 4.4 Integrate picker into add-item flows
└── 4.5 Update tabs to show selected wishlist

Phase 5: Column Rename (depends on: Phase 4 complete)
├── 5.1 Rename amazon_url → source_url in DB
├── 5.2 Update all component references (~50 files)
└── 5.3 Update TypeScript types

Phase 6: Enforce & Cleanup (depends on: Phase 5, verified backfill)
├── 6.1 Make wishlist_id NOT NULL
├── 6.2 Update RLS for wishlist-based access
└── 6.3 Document group_id deprecation plan
```

### Phase Ordering Rationale

1. **Phase 1 & 2 in parallel:** No dependencies between wishlists schema and URL scraping
2. **Phase 3 after 2:** Share intent needs scraping service to work
3. **Phase 4 after 1:** UI needs wishlists table and context
4. **Phase 5 after 4:** Rename column only after all UI migrated to support new pattern
5. **Phase 6 last:** Only enforce constraints after everything works

---

## Sources

- [expo-share-intent on GitHub](https://github.com/achorein/expo-share-intent)
- [expo-share-intent on npm](https://www.npmjs.com/package/expo-share-intent)
- [Expo Linking Documentation](https://docs.expo.dev/versions/latest/sdk/linking/)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [metascraper (Open Graph extraction)](https://github.com/microlinkhq/metascraper)
- [Open Graph Protocol](https://ogp.me/)
- [deno-dom (HTML parsing in Deno)](https://deno.land/x/deno_dom)
- [Geekflare Meta Scraping API](https://geekflare.com/api/metascraping/)

---
*Architecture research for: URL scraping, share intent, and multi-wishlist integration*
*Researched: 2026-02-16*
