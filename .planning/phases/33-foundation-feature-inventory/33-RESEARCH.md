# Phase 33: Foundation & Feature Inventory - Research

**Researched:** 2026-02-12
**Domain:** React Native Expo - Image Library, TypeScript Patterns, Utility Functions, Feature Mapping
**Confidence:** HIGH

## Summary

Phase 33 establishes the foundation for the Wishlist UI Redesign by installing expo-image for performant image handling, creating a comprehensive feature inventory that maps the 68+ props from LuxuryWishlistCard to the new component architecture (WishlistGridCard, ItemDetailScreen, ItemOptionsSheet), and building shared utility functions for brand parsing, price formatting, and image placeholders.

The existing LuxuryWishlistCard serves two contexts (owner's My Wishlist view and celebration page view for other group members) with extensive prop variations for claiming, favorites, splits, and special item types. The feature inventory must preserve all functionality (PARITY-01, PARITY-02, PARITY-03) while distributing responsibility across simpler, context-specific components.

**Primary recommendation:** Create a structured feature inventory document first, then build utilities in a new `utils/wishlist.ts` file that can be tested in isolation before the new components are created.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-image | ~3.0.11 | High-performance image component | Modern replacement for RN Image with caching, blur placeholders, format support |
| TypeScript | ^5.3.3 | Type definitions | Already in project, use interface for props following codebase convention |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @shopify/flash-list | ^2.2.1 | Virtualized grid rendering | Already installed, use for grid layout |
| expo-linear-gradient | ~15.0.8 | Gradient overlays | Already installed, reuse for card styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-image | react-native-fast-image | expo-image is newer, better maintained, native to Expo ecosystem |
| Custom brand parsing | ML/LLM extraction | Overkill for simple title parsing; regex patterns sufficient |

**Installation:**
```bash
npx expo install expo-image
```

Note: `npx expo install` auto-selects the SDK-compatible version. For Expo SDK 54 (expo ~54.0.33), this will install expo-image ~3.0.x. The user specified `~3.0.11` which is correct.

## Architecture Patterns

### Recommended Project Structure
```
utils/
├── wishlist.ts          # NEW: Brand parser, price formatter, image placeholder
├── countdown.ts         # EXISTING: Date utilities
└── ...

components/wishlist/
├── LuxuryWishlistCard.tsx    # EXISTING: Keep for reference during migration
├── types.ts                  # NEW: Shared type definitions for new components
├── WishlistGridCard.tsx      # FUTURE: Phase 34
├── ...

.planning/phases/33-foundation-feature-inventory/
├── FEATURE-INVENTORY.md      # NEW: Comprehensive prop mapping document
```

### Pattern 1: Feature Inventory as Migration Contract
**What:** Document that maps every prop from source component to destination component(s)
**When to use:** Before refactoring large components into multiple smaller ones
**Example:**
```markdown
## Feature Inventory: LuxuryWishlistCard -> New Components

| Source Prop | Type | Grid Card | Detail Screen | Options Sheet | Notes |
|-------------|------|-----------|---------------|---------------|-------|
| item | WishlistItem | YES | YES | YES (preview) | Core data |
| onDelete | (id: string) => void | NO | NO | YES | Move to options |
| isTaken | boolean | YES (badge) | YES (badge) | NO | Celebrant view |
...
```

### Pattern 2: Props Interface Organization
**What:** Use interfaces for component props, group by concern, use discriminated unions for context-specific props
**When to use:** Components that behave differently based on context (owner vs celebrant vs claimer)
**Example:**
```typescript
// components/wishlist/types.ts

import type { WishlistItem } from '@/types/database.types';
import type { ClaimWithUser } from '@/lib/claims';

/** Base props shared by all wishlist components */
interface WishlistItemBaseProps {
  item: WishlistItem;
}

/** Props for displaying claim status (badge only, no actions) */
interface ClaimDisplayProps {
  isTaken?: boolean;        // Celebrant view: shows "Taken" badge
  claim?: ClaimWithUser;    // Non-celebrant view: shows claimer info
}

/** Props for claim actions (detail page only) */
interface ClaimActionProps extends ClaimDisplayProps {
  claimable?: boolean;
  onClaim?: () => void;
  onUnclaim?: () => void;
  claiming?: boolean;
  isYourClaim?: boolean;
}

/** Grid card - minimal props, navigation only */
export interface WishlistGridCardProps extends WishlistItemBaseProps, ClaimDisplayProps {
  isFavorite: boolean;
  onPress: () => void;
  index: number;
}

/** Detail screen - full functionality */
export interface ItemDetailScreenProps extends WishlistItemBaseProps, ClaimActionProps {
  // Split props
  splitStatus?: SplitStatusInfo | null;
  contributors?: SplitContributorInfo[];
  // Favorite props
  isFavorite: boolean;
  onToggleFavorite?: () => void;
  // Owner actions
  onOpenOptions?: () => void;
}

/** Options sheet - actions only */
export interface ItemOptionsSheetProps {
  item: WishlistItem;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onClose: () => void;
}
```

### Pattern 3: Utility Functions with Pure Logic
**What:** Extract business logic into pure functions that are easy to test
**When to use:** Logic reused across components (brand parsing, formatting, defaults)
**Example:**
```typescript
// utils/wishlist.ts

/**
 * Parse brand name from product title
 * Uses first word(s) before common separators or product descriptors
 */
export function parseBrandFromTitle(title: string): string | null {
  // Implementation in Code Examples section
}

/**
 * Format price for display with currency
 */
export function formatPrice(price: number | null | undefined, currency = '$'): string | null {
  // Implementation in Code Examples section
}

/**
 * Get placeholder configuration for items without images
 */
export function getImagePlaceholder(itemType: WishlistItem['item_type']): {
  icon: string;
  backgroundColor: string;
} {
  // Implementation in Code Examples section
}
```

### Anti-Patterns to Avoid
- **Prop drilling from source component:** Don't copy all 68 props to every new component. Map each prop to its correct destination.
- **Business logic in components:** Don't inline brand parsing or formatting. Extract to utilities.
- **Over-abstracting too early:** Create types for actual needs, not hypothetical future requirements.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image caching | Custom AsyncStorage cache | expo-image cachePolicy | Built-in disk/memory caching optimized for RN |
| Blur placeholders | Manual ImageBackground blur | expo-image placeholder prop with blurhash | Native performance, automatic sizing |
| Image format detection | File extension parsing | expo-image | Auto-detects WebP, AVIF, HEIC support per platform |
| Price formatting | Complex template strings | Intl.NumberFormat | Handles locales, edge cases correctly |

**Key insight:** expo-image handles the entire image loading lifecycle including caching, placeholders, transitions, and format selection. Don't implement any of these manually.

## Common Pitfalls

### Pitfall 1: Breaking Feature Parity During Migration
**What goes wrong:** New components miss functionality that existed in LuxuryWishlistCard, violating PARITY-01/02/03.
**Why it happens:** 68 props are complex; easy to overlook edge cases like special item types or split contributions.
**How to avoid:** Create feature inventory document FIRST, verify each prop has a destination, mark "OUT OF SCOPE" items explicitly.
**Warning signs:** Tests fail for specific item types, celebrant view shows claimer info (PARITY-03 violation).

### Pitfall 2: Brand Parsing False Positives
**What goes wrong:** Parser extracts wrong "brand" from titles like "Samsung Galaxy S24 Ultra" -> "Samsung Galaxy" or "12-Pack Gift Set" -> "12-Pack".
**Why it happens:** Product titles have no standard structure; brand position varies.
**How to avoid:** Keep parsing simple, accept that some items won't have parseable brands, use null gracefully in UI.
**Warning signs:** Unusual brand names in grid cards, numbers appearing as brands.

### Pitfall 3: expo-image Placeholder Flash
**What goes wrong:** Placeholder briefly visible even when image is cached.
**Why it happens:** Default transition duration shows placeholder during load check.
**How to avoid:** Set `transition={0}` for cached images, or use `cachePolicy="memory-disk"` for instant display.
**Warning signs:** Visual flicker on fast connections, placeholder visible on scroll.

### Pitfall 4: Type Definitions Diverging from Implementation
**What goes wrong:** Types defined in Phase 33 don't match actual component needs in Phase 34+.
**Why it happens:** Types created before implementation details are known.
**How to avoid:** Keep types minimal and extend as needed. Don't over-specify.
**Warning signs:** Frequent type casts, `// @ts-ignore` comments, prop mismatches.

### Pitfall 5: Missing Split Status Interface
**What goes wrong:** SplitStatusInfo and SplitContributorInfo interfaces duplicated or inconsistent.
**Why it happens:** These are defined inline in LuxuryWishlistCard, not exported.
**How to avoid:** Extract to shared types file, import consistently.
**Warning signs:** Multiple interface definitions with same name, import errors.

## Code Examples

Verified patterns from official sources and existing codebase:

### expo-image Basic Usage
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/image/
import { Image } from 'expo-image';

// Basic usage with caching and placeholder
<Image
  source={{ uri: item.image_url }}
  style={{ width: 150, height: 150 }}
  contentFit="cover"
  cachePolicy="memory-disk"
  placeholder={require('@/assets/placeholder-gift.png')}
  transition={200}
/>

// With blurhash placeholder (no asset needed)
<Image
  source={{ uri: item.image_url }}
  style={{ width: 150, height: 150 }}
  contentFit="cover"
  cachePolicy="memory-disk"
  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
  transition={200}
/>

// No transition for cached images (instant display)
<Image
  source={{ uri: item.image_url }}
  style={{ width: 150, height: 150 }}
  contentFit="cover"
  cachePolicy="memory-disk"
  transition={0}
/>
```

### Brand Parser Utility
```typescript
// utils/wishlist.ts

// Common brand name patterns (first word or words before separator)
const BRAND_STOP_WORDS = new Set([
  'with', 'for', 'and', 'the', 'pack', 'set', 'box', 'kit',
  'piece', 'pieces', 'count', 'size', 'large', 'small', 'medium',
]);

const SIZE_PATTERN = /^\d+(\.\d+)?\s*(oz|ml|g|kg|lb|inch|in|cm|mm|ft|pack|pc|ct|count)\.?$/i;
const NUMBER_ONLY_PATTERN = /^\d+$/;

/**
 * Parse brand name from product title
 *
 * Strategy: Extract first meaningful word(s) before common separators.
 * Returns null if no brand can be confidently extracted.
 *
 * @example
 * parseBrandFromTitle("Apple iPhone 15 Pro Max") // "Apple"
 * parseBrandFromTitle("Samsung Galaxy S24 Ultra 256GB") // "Samsung"
 * parseBrandFromTitle("LEGO Star Wars Millennium Falcon") // "LEGO"
 * parseBrandFromTitle("12-Pack Gift Box Set") // null (no brand detected)
 * parseBrandFromTitle("Amazing Wireless Headphones") // "Amazing" (best effort)
 */
export function parseBrandFromTitle(title: string | null | undefined): string | null {
  if (!title || typeof title !== 'string') return null;

  // Split on common separators
  const cleanTitle = title
    .replace(/[–—]/g, '-')  // Normalize dashes
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
```

### Price Formatter Utility
```typescript
// utils/wishlist.ts

/**
 * Format price for display
 *
 * @example
 * formatPrice(29.99) // "$29.99"
 * formatPrice(29.99, '€') // "€29.99"
 * formatPrice(100) // "$100.00"
 * formatPrice(null) // null
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
 * Mystery Box shows tier, Surprise Me shows budget
 */
export function formatItemPrice(item: {
  price?: number | null;
  item_type?: string;
  mystery_box_tier?: 50 | 100 | null;
  surprise_me_budget?: number | null;
}): string | null {
  if (item.item_type === 'mystery_box' && item.mystery_box_tier) {
    return `€${item.mystery_box_tier}`;
  }

  if (item.item_type === 'surprise_me' && item.surprise_me_budget) {
    return `Budget: €${item.surprise_me_budget}`;
  }

  return formatPrice(item.price);
}
```

### Image Placeholder Utility
```typescript
// utils/wishlist.ts

import { colors } from '@/constants/theme';

type ItemType = 'standard' | 'surprise_me' | 'mystery_box';

interface PlaceholderConfig {
  iconName: 'gift-outline' | 'help-circle' | 'gift';
  iconColor: string;
  backgroundColor: string;
}

/**
 * Get placeholder configuration for items without images
 * Matches existing LuxuryWishlistCard icon logic
 */
export function getImagePlaceholder(itemType: ItemType | undefined): PlaceholderConfig {
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
```

### Shared Type Definitions
```typescript
// components/wishlist/types.ts

import type { WishlistItem, GiftClaim } from '@/types/database.types';
import type { ClaimWithUser } from '@/lib/claims';

// Re-export for convenience
export type { WishlistItem, GiftClaim, ClaimWithUser };

/**
 * Split status for displaying contribution progress
 * Matches structure used in LuxuryWishlistCard
 */
export interface SplitStatusInfo {
  itemPrice: number;
  additionalCosts: number | null;
  totalPledged: number;
  isFullyFunded: boolean;
  isOpen: boolean;
}

/**
 * Contributor info for split display
 * Matches structure used in LuxuryWishlistCard
 */
export interface SplitContributorInfo {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  amount: number;
}

/**
 * Favorite group info for badge display
 */
export interface FavoriteGroupInfo {
  groupId: string;
  groupName: string;
}

/**
 * Claim context - determines what the user can see/do
 */
export type ClaimContext =
  | { role: 'owner' }                    // Item owner viewing own wishlist
  | { role: 'celebrant' }                // Celebrant viewing own items (sees "Taken", no identity)
  | { role: 'claimer'; claimId: string } // User who claimed this item
  | { role: 'viewer' }                   // Group member viewing (can claim)
  | { role: 'contributor' };             // User who pledged to split (cannot claim)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Native `<Image>` | `expo-image` | 2023/SDK 49 | Better caching, blur placeholders, WebP/AVIF support |
| Manual image caching | `cachePolicy` prop | 2023 | No need for react-native-fast-image |
| `React.FC<Props>` | Function with typed params | 2022+ | Cleaner, less verbose, better type inference |
| Props spreading | Explicit prop picking | Always best | Type safety, no unexpected prop passing |

**Deprecated/outdated:**
- `react-native-fast-image`: expo-image provides same features natively
- `React.FC` wrapper: Community recommends direct function typing
- `@types/react-native` Image: Use `expo-image` Image component

## Open Questions

1. **Blurhash vs Static Placeholder**
   - What we know: expo-image supports both blurhash strings and image sources for placeholders
   - What's unclear: Do we want to generate blurhashes for product images or use a static gift icon?
   - Recommendation: Use static icon placeholder for Phase 33/34 (simpler), consider blurhash generation later

2. **Split Interface Extraction**
   - What we know: SplitStatusInfo and SplitContributorInfo are defined inline in LuxuryWishlistCard
   - What's unclear: Are there other places that need these types?
   - Recommendation: Extract to `components/wishlist/types.ts` and import where needed

3. **Brand Parsing Accuracy**
   - What we know: Simple regex approach works for common patterns
   - What's unclear: What percentage of actual wishlist titles will parse correctly?
   - Recommendation: Implement simple parser, monitor usage, refine later. Accept null gracefully in UI.

## Sources

### Primary (HIGH confidence)
- [Expo Image Documentation](https://docs.expo.dev/versions/latest/sdk/image/) - Installation, props, caching strategies
- Existing codebase: `/home/zetaz/wishlist-app/components/wishlist/LuxuryWishlistCard.tsx` - Source for feature inventory
- Existing codebase: `/home/zetaz/wishlist-app/lib/claims.ts` - ClaimWithUser interface
- Existing codebase: `/home/zetaz/wishlist-app/types/database.types.ts` - WishlistItem, GiftClaim types
- [React TypeScript Cheatsheets](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/basic_type_example/) - Props typing patterns

### Secondary (MEDIUM confidence)
- [React Official TypeScript Guide](https://react.dev/learn/typescript) - TypeScript with React patterns
- [Steve Kinney React TypeScript Course](https://stevekinney.com/courses/react-typescript/component-props-complete-guide) - Complete props guide
- [LogRocket React TypeScript Patterns](https://blog.logrocket.com/react-typescript-10-patterns-writing-better-code/) - Code organization patterns

### Tertiary (LOW confidence)
- [Towards AI Brand Extraction](https://towardsai.net/p/l/unlock-hidden-data-how-llms-extract-product-brand-name-size-with-ai-precision) - Brand parsing approaches (validated with simpler regex approach)
- [ResearchGate Attribute Extraction](https://www.researchgate.net/publication/306226279_Attribute_Extraction_from_Product_Titles_in_eCommerce) - Academic perspective on title parsing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - expo-image docs verified, versions confirmed
- Architecture: HIGH - Based on existing codebase patterns and prior research
- Pitfalls: MEDIUM - Based on common React Native patterns, some project-specific

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (30 days - stable patterns)
