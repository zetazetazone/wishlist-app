# Phase 39: Share Intent - Research

**Researched:** 2026-02-16
**Domain:** Native share intent handling for iOS and Android in Expo/React Native
**Confidence:** HIGH

## Summary

Share intent functionality allows users to share URLs from Safari, Chrome, and other apps directly into the wishlist app. The **expo-share-intent** library (v5.x for SDK 54) is the standard solution for Expo apps, providing a unified API for both iOS Share Extensions and Android Intent Filters. The implementation requires native code, meaning Expo Go cannot be used - only development builds via `expo run:ios` or `expo run:android`.

The key integration point is wrapping the root layout with `ShareIntentProvider` and using the `useShareIntentContext` hook to detect shared content. When a user shares from Safari/Chrome, the app receives either a direct URL (`webUrl` field) or text containing a URL (`text` field). For SHARE-07 (extracting URLs from text blocks), a regex-based URL extractor must be implemented since expo-share-intent only provides raw text content. The extracted URL is then passed to the existing Phase 38 scraper infrastructure.

**Primary recommendation:** Install `expo-share-intent@^5.1.1` with `patch-package` for xcode fix, configure iOS activation rules and Android intent filters in app.json, wrap `_layout.tsx` with `ShareIntentProvider`, and create a share handler that extracts URLs, calls the scraper, and presents quick-add UI to the user's default wishlist.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-share-intent | ^5.1.1 | Native share intent handling for iOS/Android | Only Expo-native module supporting share intent; maintained, SDK 54 compatible |
| expo-linking | ^8.0.11 | Deep link URL parsing and handling | Required peer dependency for expo-share-intent; already in project |
| patch-package | ^8.0.0 | Patch xcode dependency bug | Required workaround for expo-share-intent prebuild |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| url-regex-safe | ^4.0.0 | Extract URLs from text blocks | When shared content is text, not direct URL (SHARE-07) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-share-intent | expo-share-extension | More customization (custom iOS share view), but more complex setup; use if need Pinterest-style share sheet |
| url-regex-safe | Manual regex | Works for simple cases, but url-regex-safe handles edge cases better |
| expo-share-intent | react-native-receive-sharing-intent | Older, requires more manual native config; not designed for Expo workflow |

**Installation:**
```bash
npm install expo-share-intent@^5.1.1
npm install --save-dev patch-package

# Add postinstall script to package.json
# "postinstall": "patch-package"

# Copy xcode patch from expo-share-intent example to patches/xcode+3.0.1.patch
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── _layout.tsx              # Wrap with ShareIntentProvider (top-level)
├── (app)/
│   ├── _layout.tsx          # Handle share intent routing
│   ├── add-from-url.tsx     # Existing manual URL entry (reuse components)
│   └── shared-url.tsx       # NEW: Share intent handler screen

lib/
├── urlScraper.ts            # Existing scraper service
├── shareIntent.ts           # NEW: Share intent utilities (URL extraction, etc.)

types/
├── scraping.types.ts        # Existing types (reuse ScrapedMetadata)
├── shareIntent.types.ts     # NEW: Share intent type definitions

patches/
└── xcode+3.0.1.patch        # Required xcode fix
```

### Pattern 1: ShareIntentProvider Integration
**What:** Wrap root layout with ShareIntentProvider to enable share intent detection
**When to use:** Always - required for expo-share-intent to function
**Example:**
```typescript
// Source: expo-share-intent GitHub docs
// app/_layout.tsx
import { ShareIntentProvider } from "expo-share-intent";

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <GluestackUIProvider config={config}>
        <KeyboardProvider>
          {/* ... existing providers ... */}
          <Slot />
        </KeyboardProvider>
      </GluestackUIProvider>
    </ShareIntentProvider>
  );
}
```

### Pattern 2: Share Intent Detection and Routing
**What:** Detect incoming share intent and route to handler screen
**When to use:** In authenticated app layout to handle shared content
**Example:**
```typescript
// Source: expo-share-intent demo, expo-router integration
// app/(app)/_layout.tsx
import { useShareIntentContext } from "expo-share-intent";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function AppLayout() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      // Extract URL from shareIntent
      const url = shareIntent.webUrl || extractUrlFromText(shareIntent.text);

      if (url) {
        // Navigate to share handler with URL
        router.push({
          pathname: '/(app)/shared-url',
          params: { url }
        });
      }

      // Reset after handling to prevent re-triggering
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent]);

  return <Stack />;
}
```

### Pattern 3: URL Extraction from Text Blocks
**What:** Extract URLs from shared text content (SHARE-07)
**When to use:** When shareIntent.webUrl is null but shareIntent.text contains URLs
**Example:**
```typescript
// Source: Aggregated from url-regex-safe, GeeksforGeeks patterns
// lib/shareIntent.ts

// Robust URL extraction pattern
const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;

export function extractUrlFromText(text: string | null | undefined): string | null {
  if (!text) return null;

  const matches = text.match(URL_REGEX);
  return matches?.[0] || null;
}

// Alternative using URL constructor for validation
export function extractAndValidateUrl(text: string | null | undefined): string | null {
  if (!text) return null;

  // Split by whitespace and try each word
  const words = text.split(/\s+/);

  for (const word of words) {
    // Check if word looks like a URL
    if (word.includes('http://') || word.includes('https://')) {
      try {
        const url = new URL(word);
        if (['http:', 'https:'].includes(url.protocol)) {
          return url.href;
        }
      } catch {
        // Not a valid URL, continue
      }
    }
  }

  // Fallback to regex for URLs without protocol
  const matches = text.match(URL_REGEX);
  return matches?.[0] || null;
}
```

### Pattern 4: Quick-Add to Default Wishlist (SHARE-06)
**What:** One-tap save to user's default wishlist after scraping
**When to use:** After successful scrape, show preview with quick-add button
**Example:**
```typescript
// Source: Existing add-from-url.tsx pattern
// lib/shareIntent.ts

export async function quickAddToDefaultWishlist(
  metadata: ScrapedMetadata,
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  try {
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

    // Insert item
    const { error: insertError } = await supabase
      .from('wishlist_items')
      .insert({
        user_id: user.id,
        wishlist_id: defaultWishlist.id,
        group_id: null,
        name: metadata.title || 'Untitled Item',
        description: metadata.description || null,
        price: metadata.price,
        image_url: metadata.imageUrl,
        amazon_url: metadata.sourceUrl, // Legacy column name
        priority: 0,
        status: 'active',
        item_type: 'standard',
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Anti-Patterns to Avoid
- **Using useShareIntent outside ShareIntentProvider:** Will crash. Provider must wrap entire app.
- **Not resetting share intent:** Will cause re-triggering on every navigation.
- **Testing in Expo Go:** Share intent requires native code; must use dev-client builds.
- **Ignoring cold start:** App may not be ready when share arrives; handle loading states.
- **Hard-coding URL schemes:** Use app.json scheme configuration, not string literals.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| iOS Share Extension | Native Swift extension | expo-share-intent plugin | Complex Xcode config, app groups, IPC |
| Android Intent Filters | AndroidManifest.xml edits | expo-share-intent plugin | Expo prebuild handles this |
| URL extraction | Simple indexOf checks | url-regex-safe or robust regex | Edge cases: query params, fragments, encoded chars |
| Deep link handling | Manual Linking.addEventListener | expo-share-intent + expo-router | Handles cold/warm start, cleanup |

**Key insight:** Share intents involve native platform APIs (iOS Share Extensions, Android Intents) that are complex to configure manually. expo-share-intent abstracts this complexity into a config plugin that handles app.json configuration, native code generation, and a unified React hook API.

## Common Pitfalls

### Pitfall 1: Share Intent Not Detected on Cold Start
**What goes wrong:** App opens but shared content not processed
**Why it happens:** App not ready when share intent arrives; race condition with auth/navigation
**How to avoid:**
- Place ShareIntentProvider at top of component tree (before auth checks)
- Add loading state while checking for share intent
- Use `useEffect` dependency array correctly to detect changes
**Warning signs:** Works on warm start but not cold start; intermittent behavior

### Pitfall 2: xcode Prebuild Fails Without Patch
**What goes wrong:** `expo prebuild` crashes with "Cannot read properties of null (reading 'path')"
**Why it happens:** Bug in xcode npm package that expo-share-intent depends on
**How to avoid:**
- Install patch-package as dev dependency
- Copy xcode+3.0.1.patch to patches/ directory
- Add "postinstall": "patch-package" to package.json scripts
**Warning signs:** Prebuild works on clean install, fails on subsequent runs

### Pitfall 3: Share Intent Works for URLs but Not Text with URLs
**What goes wrong:** Direct URL shares work; shares from apps that embed URL in text fail
**Why it happens:** Some apps share "Check out this: https://..." not just the URL
**How to avoid:**
- Check shareIntent.webUrl first
- Fall back to extracting URL from shareIntent.text
- Test with multiple source apps (Safari, Chrome, Messages, etc.)
**Warning signs:** Safari works, other apps don't; inconsistent behavior

### Pitfall 4: iOS Share Extension Not Appearing in Share Sheet
**What goes wrong:** App doesn't appear when tapping share icon
**Why it happens:** Missing activation rules; wrong content types configured
**How to avoid:**
- Configure NSExtensionActivationSupportsWebURLWithMaxCount: 1
- Configure NSExtensionActivationSupportsWebPageWithMaxCount: 1
- Run fresh prebuild after changing app.json
- Restart device/simulator after install
**Warning signs:** Works for images but not URLs; works in Android but not iOS

### Pitfall 5: EAS Build Fails for Share Extension
**What goes wrong:** Build succeeds locally but fails on EAS
**Why it happens:** EAS auto-generates appExtensions config that conflicts
**How to avoid:**
- Manually configure eas.json to prevent auto-generation
- Only have one extension target during credentials setup
- Check EAS build logs for extension-related errors
**Warning signs:** Works with `expo run:ios`, fails on EAS build

### Pitfall 6: Auth State Not Available When Handling Share
**What goes wrong:** User shares URL but gets "not authenticated" error
**Why it happens:** Share intent processed before auth state restored from storage
**How to avoid:**
- Wait for auth state before processing share intent
- Show loading/splash while determining auth state
- Queue share intent if user not authenticated, process after login
**Warning signs:** Works when app already open; fails on cold start

## Code Examples

### Complete app.json Plugin Configuration
```json
// Source: expo-share-intent GitHub docs
{
  "expo": {
    "scheme": "wishlist-app",
    "plugins": [
      "expo-router",
      [
        "expo-share-intent",
        {
          "iosActivationRules": {
            "NSExtensionActivationSupportsWebURLWithMaxCount": 1,
            "NSExtensionActivationSupportsWebPageWithMaxCount": 1
          },
          "androidIntentFilters": ["text/*"],
          "androidMainActivityAttributes": {
            "android:launchMode": "singleTask"
          }
        }
      ]
    ]
  }
}
```

### Share Handler Screen Component
```typescript
// Source: Pattern derived from existing add-from-url.tsx
// app/(app)/shared-url.tsx
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { scrapeUrl } from '../../lib/urlScraper';
import { quickAddToDefaultWishlist } from '../../lib/shareIntent';
import { supabase } from '../../lib/supabase';
import type { ScrapedMetadata } from '../../types/scraping.types';

export default function SharedUrlScreen() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [metadata, setMetadata] = useState<ScrapedMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (url) {
      handleScrape(url);
    }
  }, [url]);

  async function handleScrape(targetUrl: string) {
    setIsLoading(true);
    setError(null);

    const result = await scrapeUrl(targetUrl);

    if (result.success && result.data) {
      setMetadata(result.data);
    } else {
      setError(result.error || 'Failed to extract product info');
      // Still set partial metadata for manual editing
      setMetadata({
        title: null,
        description: null,
        imageUrl: null,
        price: null,
        currency: null,
        siteName: null,
        sourceUrl: targetUrl,
      });
    }

    setIsLoading(false);
  }

  async function handleQuickAdd() {
    if (!metadata) return;

    setIsSaving(true);
    const result = await quickAddToDefaultWishlist(metadata, supabase);
    setIsSaving(false);

    if (result.success) {
      // Success - return to app
      router.replace('/(app)/(tabs)');
    } else {
      setError(result.error || 'Failed to save');
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading product info...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Preview component - reuse from add-from-url */}
      {metadata && (
        <>
          {/* Image preview */}
          {/* Title, price, description */}

          {/* Quick Add Button */}
          <TouchableOpacity
            onPress={handleQuickAdd}
            disabled={isSaving}
            style={{ /* gold button styles */ }}
          >
            <Text>{isSaving ? 'Saving...' : 'Add to Wishlist'}</Text>
          </TouchableOpacity>

          {/* Edit button - navigate to full form */}
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/(app)/add-from-url',
              params: { prefillUrl: url }
            })}
          >
            <Text>Edit Details</Text>
          </TouchableOpacity>
        </>
      )}

      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

### xcode Patch File
```diff
// Source: expo-share-intent/example/basic/patches/xcode+3.0.1.patch
// Save to: patches/xcode+3.0.1.patch

diff --git a/node_modules/xcode/lib/pbxProject.js b/node_modules/xcode/lib/pbxProject.js
index 1234567..abcdefg 100644
--- a/node_modules/xcode/lib/pbxProject.js
+++ b/node_modules/xcode/lib/pbxProject.js
@@ -1678,7 +1678,7 @@ function correctForPath(project, group) {
-    if (project.pbxGroupByName(group).path)
+    if (project.pbxGroupByName(group) && project.pbxGroupByName(group).path)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-native-receive-sharing-intent | expo-share-intent | 2023 | Expo-native, simpler config |
| Manual iOS Share Extension | Config plugin generation | 2023 | No Xcode project editing |
| expo-config-plugin-ios-share-extension | expo-share-intent (unified) | 2024 | Single package for iOS+Android |
| Expo SDK 52 (v3.x) | Expo SDK 54 (v5.x) | 2025 | Breaking changes, expo-linking required |

**Deprecated/outdated:**
- `expo-config-plugin-ios-share-extension` - Superseded by expo-share-intent for simple cases
- `react-native-receive-sharing-intent` - Not designed for Expo workflow
- Testing in Expo Go - Never worked, requires dev-client

## Platform-Specific Notes

### iOS
- **Share Extension** automatically created by expo-share-intent config plugin
- **Activation Rules** in app.json control what content types trigger the share sheet entry
- **NSExtensionActivationSupportsWebURLWithMaxCount: 1** - Enables direct URL sharing
- **NSExtensionActivationSupportsWebPageWithMaxCount: 1** - Enables sharing from Safari/Chrome web pages
- **App must be built** - Share extension only exists in compiled app, not Expo Go
- **Restart device** after first install for share sheet to recognize new app

### Android
- **Intent Filters** defined in app.json, injected into AndroidManifest.xml
- **android:launchMode="singleTask"** ensures single app instance handles share
- **"text/*" filter** catches URL shares and text with URLs
- **Cold start** may have brief delay before intent data available
- **ACTION_SEND** intent used by most apps for sharing

## Open Questions

1. **EAS Build Credential Handling**
   - What we know: Share extensions require separate provisioning profile
   - What's unclear: Exact eas.json configuration to prevent auto-generation conflicts
   - Recommendation: Test EAS build early in development; follow expo-share-intent docs for eas.json setup

2. **Authentication State on Cold Start**
   - What we know: Share can arrive before auth state restored
   - What's unclear: Best pattern for queuing share intent while awaiting auth
   - Recommendation: Show loading state, wait for session check, then process share

3. **Universal Links vs Custom Scheme**
   - What we know: Custom scheme (wishlist-app://) works for share intent
   - What's unclear: Whether Universal Links needed for share functionality
   - Recommendation: Custom scheme sufficient for share intent; Universal Links separate concern

## Sources

### Primary (HIGH confidence)
- [expo-share-intent GitHub](https://github.com/achorein/expo-share-intent) - Installation, configuration, usage patterns
- [expo-share-intent npm](https://www.npmjs.com/package/expo-share-intent) - Version compatibility, peer dependencies
- [Expo Linking Documentation](https://docs.expo.dev/versions/latest/sdk/linking/) - Deep link handling
- [Expo Router Native Intent](https://docs.expo.dev/router/advanced/native-intent/) - SDK 52+ native intent handling

### Secondary (MEDIUM confidence)
- [expo-share-intent-demo](https://github.com/achorein/expo-share-intent-demo) - expo-router integration examples
- [URL Regex Patterns](https://uibakery.io/regex-library/url) - URL extraction patterns
- [GeeksforGeeks URL Extraction](https://www.geeksforgeeks.org/javascript/how-to-extract-urls-from-a-string-in-javascript/) - JavaScript URL parsing

### Tertiary (LOW confidence - needs validation)
- EAS build configuration specifics - May vary by project setup
- Device restart requirement for iOS share sheet - Anecdotal from community

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - expo-share-intent is the canonical solution for Expo, actively maintained
- Architecture: HIGH - Patterns derived from official examples and project's existing code
- Pitfalls: MEDIUM-HIGH - Known issues from GitHub issues, community reports; some edge cases may exist

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - expo-share-intent stable, SDK 54 recent)
