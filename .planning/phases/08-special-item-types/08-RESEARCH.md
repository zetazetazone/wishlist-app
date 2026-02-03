# Phase 8: Special Item Types - Research

**Researched:** 2026-02-03
**Domain:** React Native UI components, form handling, conditional rendering, wishlist item types
**Confidence:** HIGH

## Summary

This phase implements the UI layer for special wishlist item types (Surprise Me and Mystery Box) that were established in Phase 6's schema foundation. The database already supports `item_type` (standard, surprise_me, mystery_box), `mystery_box_tier` (25, 50, 100), and `surprise_me_budget` columns. This research focuses on the frontend implementation: creating the add item flows, display components, and ensuring special items render correctly for both the item owner and other group members.

The existing codebase uses a modal-based add item flow (`AddItemModal.tsx`) with form validation, star rating priority selection, and the project's luxury boutique theme (burgundy/gold color palette). Special items require a modified flow: Surprise Me items need budget guidance input instead of Amazon URL/price, while Mystery Box items need tier selection (25/50/100) with no URL required.

**Primary recommendation:** Extend the existing AddItemModal with a type selector, use conditional form fields based on item type, create type-specific card variants in LuxuryWishlistCard using distinct visual badges (colors/icons), and handle the item_type field throughout the insert/display pipeline.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Native | 0.76.7 | Mobile UI | Project framework |
| Expo | 54 | Managed workflow | Project standard |
| TypeScript | 5.9.2 | Type safety | Project-wide standard |
| @supabase/supabase-js | 2.93.3 | Database operations | Already configured |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @expo/vector-icons | 14.0.2 | Icons (MaterialCommunityIcons) | All icons in app |
| moti | 0.30.0 | Animations | Card animations |
| expo-linear-gradient | 14.0.2 | Gradient accents | Card styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending AddItemModal | Separate modal per type | Separate modals duplicate code; extension is DRYer |
| Inline type selector | Separate "Add Special" button | Inline selector keeps flow unified |
| Tab-based type selection | Segmented control or dropdown | Segmented control fits the form better |

**Installation:**
No new packages needed - all UI infrastructure already in place.

## Architecture Patterns

### Recommended Project Structure
```
components/
  wishlist/
    AddItemModal.tsx         # Extended with type selector
    LuxuryWishlistCard.tsx   # Extended with type-specific rendering
    ItemTypeBadge.tsx        # NEW: Reusable badge component
    SpecialItemCard.tsx      # NEW: Alternative card for special items (optional)
```

### Pattern 1: Segmented Control for Item Type Selection
**What:** Use a horizontal segmented control at the top of AddItemModal for type selection
**When to use:** When user needs to choose between 2-4 mutually exclusive options before filling form
**Example:**
```typescript
// Source: Project pattern adapted from existing UI components
type ItemType = 'standard' | 'surprise_me' | 'mystery_box';

const [itemType, setItemType] = useState<ItemType>('standard');

// Segmented control UI
<View style={styles.typeSelector}>
  <TouchableOpacity
    style={[styles.typeOption, itemType === 'standard' && styles.typeOptionActive]}
    onPress={() => setItemType('standard')}
  >
    <MaterialCommunityIcons name="gift-outline" size={20} color={itemType === 'standard' ? colors.white : colors.burgundy[600]} />
    <Text style={[styles.typeText, itemType === 'standard' && styles.typeTextActive]}>Gift</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.typeOption, itemType === 'surprise_me' && styles.typeOptionActive]}
    onPress={() => setItemType('surprise_me')}
  >
    <MaterialCommunityIcons name="help-circle-outline" size={20} color={itemType === 'surprise_me' ? colors.white : colors.burgundy[600]} />
    <Text style={[styles.typeText, itemType === 'surprise_me' && styles.typeTextActive]}>Surprise</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.typeOption, itemType === 'mystery_box' && styles.typeOptionActive]}
    onPress={() => setItemType('mystery_box')}
  >
    <MaterialCommunityIcons name="gift" size={20} color={itemType === 'mystery_box' ? colors.white : colors.burgundy[600]} />
    <Text style={[styles.typeText, itemType === 'mystery_box' && styles.typeTextActive]}>Mystery</Text>
  </TouchableOpacity>
</View>
```

### Pattern 2: Conditional Form Fields
**What:** Show different form fields based on selected item type
**When to use:** When form structure varies significantly between options
**Example:**
```typescript
// Source: Standard React pattern
{itemType === 'standard' && (
  <>
    <TextInput placeholder="Amazon URL" ... />
    <TextInput placeholder="Title" ... />
    <TextInput placeholder="Price" keyboardType="decimal-pad" ... />
  </>
)}

{itemType === 'surprise_me' && (
  <>
    <Text style={styles.helpText}>
      Let your group know you're open to any gift!
    </Text>
    <TextInput placeholder="Budget hint (optional)" keyboardType="decimal-pad" ... />
  </>
)}

{itemType === 'mystery_box' && (
  <>
    <Text style={styles.helpText}>
      Select a Mystery Box tier for your group to fulfill
    </Text>
    <View style={styles.tierSelector}>
      {[25, 50, 100].map(tier => (
        <TouchableOpacity
          key={tier}
          style={[styles.tierOption, selectedTier === tier && styles.tierOptionActive]}
          onPress={() => setSelectedTier(tier)}
        >
          <Text style={styles.tierText}>{tier}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </>
)}
```

### Pattern 3: Type-Specific Card Rendering
**What:** Render different card variants based on item_type in wishlist display
**When to use:** When items of different types need distinct visual treatment
**Example:**
```typescript
// Source: Project pattern from LuxuryWishlistCard
const getTypeConfig = (itemType: string) => {
  switch (itemType) {
    case 'surprise_me':
      return {
        icon: 'help-circle' as const,
        badgeText: 'Surprise Me',
        gradientColors: [colors.burgundy[400], colors.burgundy[600]] as const,
        showUrl: false,
        showPrice: false,
      };
    case 'mystery_box':
      return {
        icon: 'gift' as const,
        badgeText: 'Mystery Box',
        gradientColors: [colors.gold[400], colors.gold[600]] as const,
        showUrl: false,
        showPrice: true, // Shows tier as price
      };
    default:
      return {
        icon: 'gift-outline' as const,
        badgeText: null,
        gradientColors: [colors.gold[400], colors.gold[600]] as const,
        showUrl: true,
        showPrice: true,
      };
  }
};
```

### Pattern 4: Type Badge Component
**What:** Reusable badge to identify special item types
**When to use:** On cards, in list headers, anywhere item type needs visual indicator
**Example:**
```typescript
// Source: New component following project styling patterns
interface ItemTypeBadgeProps {
  itemType: 'standard' | 'surprise_me' | 'mystery_box';
  tier?: 25 | 50 | 100 | null;
}

export function ItemTypeBadge({ itemType, tier }: ItemTypeBadgeProps) {
  if (itemType === 'standard') return null;

  const config = {
    surprise_me: {
      icon: 'help-circle',
      text: 'Surprise Me',
      bgColor: colors.burgundy[100],
      textColor: colors.burgundy[700],
    },
    mystery_box: {
      icon: 'gift',
      text: tier ? `${tier} Mystery Box` : 'Mystery Box',
      bgColor: colors.gold[100],
      textColor: colors.gold[700],
    },
  }[itemType];

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <MaterialCommunityIcons name={config.icon} size={14} color={config.textColor} />
      <Text style={[styles.badgeText, { color: config.textColor }]}>{config.text}</Text>
    </View>
  );
}
```

### Anti-Patterns to Avoid
- **Duplicating the entire AddItemModal:** Creates maintenance burden. Extend the existing modal with conditional rendering.
- **Hardcoding tier values outside of types:** Use the TypeScript union type `25 | 50 | 100` from database.types.ts. Don't use magic numbers.
- **Accessing amazon_url for special items without guards:** Special items may have empty/placeholder URLs. Always check `item_type` first.
- **Showing "View on Amazon" button for special items:** These items have no Amazon URL. Conditionally hide the button.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Item type validation | Custom validation | TypeScript union types + database CHECK | Already enforced at DB level |
| Tier selection state | Complex state machine | Simple useState with fixed values | 3 options is simple |
| Badge styling | Inline styles | Reusable ItemTypeBadge component | DRY, consistent styling |
| Conditional form reset | Manual field clearing | Single resetForm() function | Less error-prone |

**Key insight:** The schema already enforces constraints (mystery_box_tier requires item_type='mystery_box'). Frontend just needs to present valid options - no complex validation logic needed.

## Common Pitfalls

### Pitfall 1: Forgetting item_type Default for Standard Items
**What goes wrong:** Existing "Add Item" flow doesn't set item_type, causing inserts to fail or items to have wrong type
**Why it happens:** AddItemModal was built before item_type existed
**How to avoid:** Always set `item_type: 'standard'` explicitly in standard item inserts, or rely on database DEFAULT
**Warning signs:** Items appear without type badge when they should be standard

### Pitfall 2: amazon_url Required for All Items
**What goes wrong:** Form validation rejects Surprise Me/Mystery Box items that don't have URLs
**Why it happens:** Original validation required amazon_url unconditionally
**How to avoid:** Make validation conditional: only require URL for `item_type === 'standard'`
**Warning signs:** Users cannot submit special item forms

### Pitfall 3: Accessing amazon_url Without Type Guard
**What goes wrong:** "View on Amazon" button crashes or shows empty link for special items
**Why it happens:** LuxuryWishlistCard assumes all items have valid amazon_url
**How to avoid:** Check `item.item_type === 'standard'` before rendering Amazon-related UI
**Warning signs:** Empty or broken links, console errors about undefined URL

### Pitfall 4: Mystery Box Tier Not Clearing on Type Change
**What goes wrong:** User selects Mystery Box, picks tier, switches to Surprise Me, submits - tier value still attached
**Why it happens:** State not reset when item type changes
**How to avoid:** Reset type-specific fields when itemType changes: `setSelectedTier(null)` when switching away from mystery_box
**Warning signs:** Database constraint violation (tier requires mystery_box type)

### Pitfall 5: Missing Special Item Display in Group Views
**What goes wrong:** Special items work for owner but appear broken when other group members view the wishlist
**Why it happens:** Celebration detail or group wishlist view doesn't handle item_type
**How to avoid:** Ensure all wishlist item displays use the same type-aware rendering logic
**Warning signs:** Items look different in owner view vs group member view

### Pitfall 6: Currency Symbol for Euro Tiers
**What goes wrong:** Mystery Box shows "$25" instead of "25"
**Why it happens:** Requirements specify Euro tiers (25, 50, 100) but may display with wrong currency
**How to avoid:** Display tier with Euro symbol () or currency-agnostic (just the number), per requirements
**Warning signs:** Wrong currency symbol in UI

## Code Examples

Verified patterns from project codebase and requirements:

### Extended AddItemModal Handler
```typescript
// Source: Extending existing AddItemModal.tsx pattern
interface AddItemData {
  item_type: 'standard' | 'surprise_me' | 'mystery_box';
  amazon_url: string;
  title: string;
  price?: number;
  priority: number;
  mystery_box_tier?: 25 | 50 | 100 | null;
  surprise_me_budget?: number | null;
}

const handleSubmit = async () => {
  // Type-specific validation
  if (itemType === 'standard') {
    if (!amazonUrl.trim()) {
      Alert.alert('Error', 'Please enter an Amazon URL');
      return;
    }
    if (!validateAmazonUrl(amazonUrl)) {
      Alert.alert('Error', 'Please enter a valid Amazon URL');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a product title');
      return;
    }
  }

  if (itemType === 'mystery_box' && !selectedTier) {
    Alert.alert('Error', 'Please select a Mystery Box tier');
    return;
  }

  // Build payload based on type
  const payload: AddItemData = {
    item_type: itemType,
    amazon_url: itemType === 'standard' ? amazonUrl.trim() : '',
    title: itemType === 'standard'
      ? title.trim()
      : itemType === 'surprise_me'
        ? 'Surprise Me!'
        : `${selectedTier} Mystery Box`,
    price: itemType === 'standard'
      ? (price ? parseFloat(price) : undefined)
      : itemType === 'mystery_box'
        ? selectedTier
        : undefined,
    priority: itemType === 'surprise_me' ? priority : 3,
    mystery_box_tier: itemType === 'mystery_box' ? selectedTier : null,
    surprise_me_budget: itemType === 'surprise_me' && budget
      ? parseFloat(budget)
      : null,
  };

  await onAdd(payload);
};
```

### Database Insert with Item Type
```typescript
// Source: Extending existing wishlist.tsx insert pattern
const handleAddItem = async (itemData: AddItemData) => {
  if (!userId) {
    Alert.alert('Error', 'You must be logged in to add items');
    throw new Error('Not logged in');
  }

  try {
    const { data, error } = await supabase
      .from('wishlist_items')
      .insert([
        {
          user_id: userId,
          amazon_url: itemData.amazon_url,
          title: itemData.title,
          price: itemData.price,
          priority: itemData.priority,
          status: 'active',
          item_type: itemData.item_type,
          mystery_box_tier: itemData.mystery_box_tier,
          surprise_me_budget: itemData.surprise_me_budget,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const message = itemData.item_type === 'surprise_me'
      ? 'Added Surprise Me to your wishlist!'
      : itemData.item_type === 'mystery_box'
        ? 'Added Mystery Box to your wishlist!'
        : 'Gift added to your wishlist!';

    Alert.alert('Success!', message);
    return data;
  } catch (error) {
    console.error('Error adding item:', error);
    throw error;
  }
};
```

### Type-Aware Card Component
```typescript
// Source: Extending LuxuryWishlistCard.tsx
export default function LuxuryWishlistCard({ item, onDelete, index }: LuxuryWishlistCardProps) {
  const isSpecialItem = item.item_type !== 'standard';

  const handleOpenLink = async () => {
    // Only allow for standard items with valid URLs
    if (isSpecialItem || !item.amazon_url) return;

    try {
      const canOpen = await Linking.canOpenURL(item.amazon_url);
      if (canOpen) {
        await Linking.openURL(item.amazon_url);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const getCardIcon = () => {
    switch (item.item_type) {
      case 'surprise_me':
        return 'help-circle';
      case 'mystery_box':
        return 'gift';
      default:
        return 'gift-outline';
    }
  };

  const formatPrice = () => {
    if (item.item_type === 'mystery_box' && item.mystery_box_tier) {
      return `${item.mystery_box_tier}`;
    }
    if (item.item_type === 'surprise_me' && item.surprise_me_budget) {
      return `Budget: ${item.surprise_me_budget}`;
    }
    if (item.price) {
      return `$${item.price.toFixed(2)}`;
    }
    return null;
  };

  return (
    <MotiView ...>
      <View style={styles.card}>
        {/* Type badge for special items */}
        {isSpecialItem && (
          <ItemTypeBadge itemType={item.item_type} tier={item.mystery_box_tier} />
        )}

        {/* Card icon */}
        <MaterialCommunityIcons name={getCardIcon()} size={28} ... />

        {/* Title */}
        <Text>{item.title}</Text>

        {/* Price/Tier/Budget */}
        {formatPrice() && <Text>{formatPrice()}</Text>}

        {/* Action button - only for standard items */}
        {!isSpecialItem && (
          <TouchableOpacity onPress={handleOpenLink}>
            <Text>View on Amazon</Text>
          </TouchableOpacity>
        )}
      </View>
    </MotiView>
  );
}
```

### Visual Distinction Styles
```typescript
// Source: Following project theme constants
const getSpecialItemBorderColor = (itemType: string) => {
  switch (itemType) {
    case 'surprise_me':
      return colors.burgundy[300]; // Distinct burgundy for surprise
    case 'mystery_box':
      return colors.gold[400]; // Gold for mystery box (matches luxury theme)
    default:
      return colors.gold[100]; // Default light gold
  }
};

// In card styles:
borderColor: getSpecialItemBorderColor(item.item_type),
borderWidth: item.item_type !== 'standard' ? 2 : 1,
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate forms per item type | Single form with conditional fields | Current best practice | Less code, unified UX |
| Custom dropdown for tier | Segmented control or button group | React Native standard | Better touch target, clearer selection |
| Badge as inline style | Reusable Badge component | Component library pattern | Consistent, maintainable |

**Deprecated/outdated:**
- Using magic numbers for tiers: Use TypeScript union from database.types.ts

## Open Questions

Things that couldn't be fully resolved:

1. **Should Surprise Me have a priority field?**
   - What we know: Standard items have priority (1-5 stars), requirements mention "optional budget guidance"
   - What's unclear: Does priority indicate "openness level" or is it irrelevant for Surprise Me?
   - Recommendation: Hide priority for Surprise Me items; they signal maximum openness by definition

2. **What happens when user tries to edit a special item?**
   - What we know: Phase doesn't mention edit flows
   - What's unclear: Can user change tier after creation? Convert Surprise Me to specific gift?
   - Recommendation: Defer edit functionality; allow delete-and-recreate for v1.1

3. **Display in group member views (celebration detail)?**
   - What we know: Success criteria says "Special items appear correctly in other group members' views"
   - What's unclear: Does this require changes to celebration detail screen?
   - Recommendation: Verify if celebration detail shows wishlist items; if so, apply same type-aware rendering

## Sources

### Primary (HIGH confidence)
- `/home/zetaz/wishlist-app/components/wishlist/AddItemModal.tsx` - Existing add item patterns
- `/home/zetaz/wishlist-app/components/wishlist/LuxuryWishlistCard.tsx` - Card rendering patterns
- `/home/zetaz/wishlist-app/types/database.types.ts` - TypeScript types for item_type, mystery_box_tier
- `/home/zetaz/wishlist-app/constants/theme.ts` - Color palette, spacing, styling constants
- `/home/zetaz/wishlist-app/.planning/phases/06-schema-foundation/06-RESEARCH.md` - Schema patterns
- `/home/zetaz/wishlist-app/supabase/migrations/20260202000011_schema_foundation.sql` - Database constraints

### Secondary (MEDIUM confidence)
- React Native official documentation - Form handling, conditional rendering
- MaterialCommunityIcons - Icon names (help-circle, gift)

### Project Context (HIGH confidence)
- STATE.md Phase 6 deliverables confirm: item_type, mystery_box_tier, surprise_me_budget columns exist
- REQUIREMENTS.md SPEC-01 through SPEC-05 define the feature scope

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project components and patterns
- Architecture: HIGH - Extension of existing patterns, no new libraries
- Pitfalls: HIGH - Based on code analysis and constraint knowledge
- Code examples: HIGH - Adapted from actual codebase files

**Research date:** 2026-02-03
**Valid until:** 30 days (UI patterns are stable, feature scope is well-defined)
