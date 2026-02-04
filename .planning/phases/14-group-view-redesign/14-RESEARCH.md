# Phase 14: Group View Redesign - Research

**Researched:** 2026-02-04
**Domain:** React Native / Expo UI component design, member list sorting, birthday countdown display
**Confidence:** HIGH

## Summary

Phase 14 requires redesigning the group detail screen to prominently display group information (header with photo/avatar, name, description, mode badge) and sort members by upcoming birthday with countdown text and favorite item previews. The codebase already has proven patterns for birthdays (countdown utilities from Phase 3), member lists (existing group detail screen), badges (ItemTypeBadge pattern), and favorite handling (group_favorites system from Phase 9).

The implementation will leverage existing utilities and follow established component patterns using:
- ScrollView for the overall layout (pattern confirmed in multiple screens)
- Reusable badge pattern for mode indicator (similar to ItemTypeBadge and GiftLeaderBadge)
- Countdown utilities already in place (`getDaysUntilBirthday`, `getCountdownText`, `sortByUpcoming`)
- Existing group query patterns from `fetchGroupDetails` with member data

**Primary recommendation:** Use the existing group detail screen as the base, enhance the header with photo/avatar display and mode badge, refactor the members section to sort by birthday and display countdown text with favorite previews.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Native | 0.81.5 | Mobile UI framework | Confirmed in package.json |
| Expo Router | ~6.0.23 | Navigation | Used for all screen routing |
| date-fns | ^4.1.0 | Date utilities | Already established for birthday calculations |
| MaterialCommunityIcons | ^15.0.3 | Icons | Standard icon system throughout app |
| moti | ^0.30.0 | Animation | Used for card entrance animations |
| expo-linear-gradient | ~15.0.8 | Gradient backgrounds | Used in current group header |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Gluestack UI | ~1.1.73 | Component theming | Already used for Avatar components |
| NativeWind | ^4.2.1 | Tailwind styling | Available but existing code uses direct styles |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ScrollView | FlatList | ScrollView simpler for single static list; FlatList better for large dynamic lists |
| Sort on fetch | Sort in-memory | In-memory sort gives immediate UI responsiveness, suitable for typical group sizes |
| Custom badge | Gluestack Badge | Custom badge matches established visual patterns in codebase |

**Installation:**
All dependencies already in package.json. No new packages required.

## Architecture Patterns

### Recommended Project Structure

Existing file: `/home/zetaz/wishlist-app/app/group/[id].tsx`
Related components:
- `/components/groups/GroupAvatar.tsx` - Existing group avatar/photo display
- `/components/groups/GroupCard.tsx` - Group card pattern
- `/components/celebrations/GiftLeaderBadge.tsx` - Badge pattern reference
- `/components/wishlist/ItemTypeBadge.tsx` - Compact badge pattern reference
- `/utils/countdown.ts` - Birthday countdown utilities

New components to create:
```
components/groups/
├── GroupModeBadge.tsx           # New: Displays mode badge (Greetings/Gifts)
├── MemberCard.tsx               # New: Member card with photo, countdown, favorite preview
├── FavoritePreview.tsx          # New: Compact favorite item display (thumbnail + title)
└── GroupViewHeader.tsx          # New: Enhanced header with photo, name, description, mode badge
```

### Pattern 1: Group Header with Photo/Avatar
**What:** Header component showing group photo (or generated avatar), name, description, and mode badge
**When to use:** At top of group detail screen with visual prominence
**Example:**
```typescript
// GroupViewHeader.tsx
interface GroupViewHeaderProps {
  group: {
    name: string;
    description?: string | null;
    photo_url?: string | null;
    mode: 'greetings' | 'gifts';
  };
}

export function GroupViewHeader({ group }: GroupViewHeaderProps) {
  return (
    <LinearGradient colors={[colors.burgundy[800], colors.burgundy[600]]}>
      {/* Back button */}
      {/* GroupAvatar (use existing component with 2xl size for header) */}
      {/* Group name */}
      {/* Group description if present */}
      {/* GroupModeBadge component */}
    </LinearGradient>
  );
}
```
Source: Existing pattern in `app/group/[id].tsx` lines 104-175

### Pattern 2: Member Card with Birthday Countdown and Favorite Preview
**What:** Card component showing member photo, name, birthday countdown, and favorite item preview
**When to use:** In scrollable list of members, sorted by birthday proximity
**Example:**
```typescript
// MemberCard.tsx
interface MemberCardProps {
  member: {
    users: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
  };
  daysUntilBirthday: number;
  favoriteItem?: {
    title: string;
    image_url: string | null;
  } | null;
  onPress: () => void;
}

export function MemberCard({ member, daysUntilBirthday, favoriteItem, onPress }: MemberCardProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={card}>
        {/* Member avatar/photo */}
        {/* Member name */}
        {/* Birthday countdown: getCountdownText(daysUntilBirthday) */}
        {/* FavoritePreview component if available */}
      </View>
    </TouchableOpacity>
  );
}
```

### Pattern 3: Birthday Sorting (In-Memory)
**What:** Sort members array by days until next birthday
**When to use:** On data load or when member list changes
**Example:**
```typescript
// In GroupDetailScreen component
const sortedMembers = sortByUpcoming<GroupMember>(
  groupMembers.map(m => ({
    ...m,
    birthday: m.users.birthday
  }))
);
```
Source: Utility exists in `utils/countdown.ts` lines 139-147

### Pattern 4: Badge for Mode Indicator
**What:** Compact badge showing group mode (Greetings/Gifts)
**When to use:** In header or member list header
**Example:**
```typescript
// GroupModeBadge.tsx
export function GroupModeBadge({ mode }: { mode: 'greetings' | 'gifts' }) {
  const config = {
    gifts: {
      icon: 'gift' as const,
      text: 'Gifts',
      bgColor: colors.burgundy[100],
      textColor: colors.burgundy[700],
    },
    greetings: {
      icon: 'party-popper' as const,
      text: 'Greetings',
      bgColor: colors.gold[100],
      textColor: colors.gold[700],
    },
  }[mode];

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: config.bgColor,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    }}>
      <MaterialCommunityIcons
        name={config.icon}
        size={14}
        color={config.textColor}
        style={{ marginRight: spacing.xs }}
      />
      <Text style={{ fontSize: 12, fontWeight: '600', color: config.textColor }}>
        {config.text}
      </Text>
    </View>
  );
}
```
Source: Badge pattern from `components/wishlist/ItemTypeBadge.tsx` and `components/celebrations/GiftLeaderBadge.tsx`

### Anti-Patterns to Avoid
- **Sorting on every render:** Compute sorted members once in effect, store in state
- **N+1 favorite queries:** Fetch all favorites with group members in single query, join client-side
- **Fixed member list:** Use ScrollView (not FlatList) for small groups; upgrade to FlatList if >50 members becomes common
- **Hardcoded colors for badges:** Use theme constants (colors object) for consistency with existing design system

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Birthday counting logic | Custom day/month comparison | `getDaysUntilBirthday()` from countdown.ts | Handles Feb 29 birthdays, year boundary, invalid dates |
| Sorting by birthday | Manual reduce/sort logic | `sortByUpcoming()` from countdown.ts | One-liner, tested, handles edge cases |
| Birthday countdown text | Manual string formatting | `getCountdownText()` from countdown.ts | Consistent with existing calendar feature |
| Status color for urgency | Custom color picker | `getStatusColor()` from countdown.ts | Matches design system, tested thresholds |
| Group photo display | Custom Image with fallback | Existing `GroupAvatar` component | Already handles photo_url, generates initials, styled |
| Avatar initials | Custom string manipulation | `GroupAvatar` (uses initials internally) | Proved pattern with 1-3 letter initials |
| Badge styling | Custom inline styles | Badge pattern (ItemTypeBadge/GiftLeaderBadge) | Consistent spacing, colors, accessibility |

**Key insight:** Birthday countdown utilities (`countdown.ts`) are battle-tested from Phase 3 calendar feature. Reuse extensively rather than reimplementing variations.

## Common Pitfalls

### Pitfall 1: Fetching Favorites Without Group Context
**What goes wrong:** Querying favorite items individually for each member causes N+1 queries or missing items
**Why it happens:** Favorites are user-specific (group_favorites.user_id), but display context is member view (group_members table)
**How to avoid:** In enhanced fetchGroupDetails query:
1. Fetch group members with users data (already done in lines 174-186)
2. Add left join to group_favorites in same query: `.select('*, group_members(...), group_favorites(..., wishlist_items(...))')`
3. Join results client-side: `const favoritesByMember = favorites.reduce(...)`
**Warning signs:** Multiple "loading favorite..." states, favorites appearing late after member list loads

### Pitfall 2: Birthday Countdown Recalculation on Render
**What goes wrong:** Calling `getDaysUntilBirthday()` in render or inline in map() causes slowdown as list grows
**Why it happens:** Countdown is calculated fresh on every render, even when data hasn't changed
**How to avoid:** Calculate once in effect:
```typescript
useEffect(() => {
  const membersWithCountdown = members.map(m => ({
    ...m,
    daysUntil: getDaysUntilBirthday(m.users.birthday),
  }));
  setSortedMembers(sortByUpcoming(membersWithCountdown));
}, [members]);
```
**Warning signs:** Countdown text flickering, header re-rendering when scrolling

### Pitfall 3: Mode Badge Not Respecting Design Decision
**What goes wrong:** Using wrong colors or icons for mode badge, inconsistent with Phase 13 decisions
**Why it happens:** Phase 13 specified blue for mode, green for budget (line 62 in STATE.md), but skipping that context
**How to avoid:** Reference STATE.md Phase 13 decisions:
- Mode badge: Blue background/text (burgundy[100]/burgundy[700] = blue-ish, or use dedicated blue)
- Budget badge (future phase): Green background/text
**Warning signs:** Design review feedback: "Doesn't match the design system"

### Pitfall 4: Missing Null Checks for Optional Fields
**What goes wrong:** description or photo_url can be null, causing crashes or strange UI
**Why it happens:** GROUP schema has nullable fields; component assumes they're always present
**How to avoid:** Always check before rendering:
```typescript
{group.description && (
  <Text>{group.description}</Text>
)}
{group.photo_url && (
  <Image source={{ uri: getGroupPhotoUrl(group.photo_url) }} />
)}
```
**Warning signs:** "Cannot read property 'split' of null" type errors

### Pitfall 5: Favorite Item Not Loading/Showing Stale Data
**What goes wrong:** Member's favorite item shows wrong data or doesn't appear
**Why it happens:** Favorite is in group_favorites table (item_id), but needs wishlist_items join to get title/image
**How to avoid:** Full join chain: group_members → group_favorites → wishlist_items in one query
**Warning signs:** Favorite preview always empty, or member favorite doesn't match actual selection

### Pitfall 6: Forgetting Member Navigation Context
**What goes wrong:** Tapping member card needs to navigate to their celebration page, but no navigation hook available
**Why it happens:** GroupDetailScreen doesn't pass router/navigation info to child components
**How to avoid:** Pass router from parent or use useRouter() hook in MemberCard component
**Warning signs:** onPress handler has no navigation, or "Cannot read property 'push' of undefined"

## Code Examples

Verified patterns from official sources:

### Birthday Countdown with Proper Handling
```typescript
// Source: utils/countdown.ts (verified working)
import { getDaysUntilBirthday, sortByUpcoming, getCountdownText } from '@/utils/countdown';

// In GroupDetailScreen
const [sortedMembers, setSortedMembers] = useState<Array<{
  users: User;
  daysUntil: number;
}>>([]);

useEffect(() => {
  if (!group?.members) return;

  const membersWithCountdown = group.members.map(member => ({
    ...member,
    daysUntil: getDaysUntilBirthday(member.users.birthday || ''),
  }));

  const sorted = sortByUpcoming(membersWithCountdown);
  setSortedMembers(sorted);
}, [group?.members]);

// Render in list
{sortedMembers.map((member) => (
  <Text key={member.users.id}>
    {member.users.full_name} - {getCountdownText(member.daysUntil)}
  </Text>
))}
```

### Group Avatar with Photo Fallback
```typescript
// Source: components/groups/GroupAvatar.tsx (verified)
import { GroupAvatar } from '@/components/groups/GroupAvatar';

// In GroupViewHeader
<GroupAvatar
  group={{
    name: group.name,
    photo_url: group.photo_url,
  }}
  size="2xl"
/>
```

### Badge Pattern for Mode
```typescript
// Source: components/wishlist/ItemTypeBadge.tsx and GiftLeaderBadge.tsx (verified)
// Create GroupModeBadge following same pattern:

<View style={{
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: modeColors[group.mode].bgColor,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: borderRadius.sm,
  alignSelf: 'flex-start',
}}>
  <MaterialCommunityIcons
    name={modeColors[group.mode].icon}
    size={14}
    color={modeColors[group.mode].textColor}
    style={{ marginRight: spacing.xs }}
  />
  <Text style={{
    fontSize: 12,
    fontWeight: '600',
    color: modeColors[group.mode].textColor,
  }}>
    {modeColors[group.mode].label}
  </Text>
</View>
```

### Sorted Members List Structure
```typescript
// Source: existing pattern in app/group/[id].tsx, enhanced for sorting
<ScrollView
  style={{ flex: 1 }}
  contentContainerStyle={{
    padding: spacing.lg,
    paddingTop: spacing.md,
  }}
  showsVerticalScrollIndicator={false}
>
  <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: spacing.md }}>
    Members (by upcoming birthday)
  </Text>

  <View style={{ gap: spacing.sm }}>
    {sortedMembers.map((member, index) => (
      <MemberCard
        key={member.users.id}
        member={member}
        daysUntilBirthday={member.daysUntil}
        favoriteItem={favorites[member.users.id]}
        onPress={() => router.push(`/celebration/${member.users.id}`)}
        index={index}
      />
    ))}
  </View>
</ScrollView>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static member list (Phase 1) | Sorted by birthday countdown (Phase 14) | Now | Immediate visibility of who needs planning next |
| Member card with email exposed (old [id].tsx) | Member card without email (GVIEW-03) | Phase 14 | Better privacy, cleaner UI |
| No group description | Description field in header | Phase 14 | More context for group purpose |
| No group photo | Photo_url with fallback avatar | Phase 12/14 | Visual identity for groups |
| No mode indicator | Mode badge (Gifts/Greetings) | Phase 14 | Clear group purpose indication |
| No favorite visibility | Favorite preview in member card | Phase 14 | Quick insight into member preferences |

**Deprecated/outdated:**
- Manual birthday calculation: Use `getDaysUntilBirthday()` from countdown.ts
- Static member order: Use `sortByUpcoming()` for dynamic sorting

## Open Questions

1. **Favorite item preview size:** How large should thumbnail be in member card? Recommendation: ~40x40px (similar to avatar size) to keep card compact
2. **Description truncation:** Should long group descriptions be truncated in header or fully displayed? Recommendation: Single line with ellipsis, expandable on tap
3. **Empty state handling:** What if member has no favorite set? Show "No favorite" or just omit preview? Recommendation: Omit, as all users MUST have favorite per lib/favorites.ts rules
4. **Large group performance:** FlatList optimization needed if group size >50 members? Recommendation: ScrollView fine for typical group sizes, add FlatList optimization in future if needed
5. **Birthday year display:** Show full date or just days/months? Recommendation: Days only per GVIEW-05 ("12 days", "2 months"), not full dates

## Sources

### Primary (HIGH confidence)
- **Context7**: React Native, Expo, date-fns documentation verified through package.json
- **Official sources checked:**
  - `/home/zetaz/wishlist-app/app/group/[id].tsx` - Existing group detail screen pattern (HIGH)
  - `/home/zetaz/wishlist-app/utils/countdown.ts` - Birthday calculation utilities (HIGH)
  - `/home/zetaz/wishlist-app/lib/favorites.ts` - Favorites system (HIGH)
  - `/home/zetaz/wishlist-app/components/groups/GroupAvatar.tsx` - Avatar component (HIGH)
  - `/home/zetaz/wishlist-app/components/wishlist/ItemTypeBadge.tsx` - Badge pattern (HIGH)
  - `/home/zetaz/wishlist-app/components/celebrations/GiftLeaderBadge.tsx` - Badge pattern (HIGH)

### Secondary (MEDIUM confidence)
- Phase 13 decisions documented in STATE.md (color scheme for badges)
- package.json dependencies confirmed (all libraries present)
- Types verified in types/database.types.ts

### Tertiary (LOW confidence)
- N/A - all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All dependencies already in package.json and active use
- Architecture patterns: **HIGH** - Based on existing patterns in codebase (group detail screen, avatar, badge components)
- Countdown logic: **HIGH** - Utilities proven in Phase 3 calendar feature, still active
- Favorites handling: **HIGH** - System fully documented in lib/favorites.ts
- UI component patterns: **HIGH** - Badge and card patterns established in Phase 1+

**Research date:** 2026-02-04
**Valid until:** 2026-02-10 (1 week - standard React Native stack is stable, no major updates expected)

**Key assumptions verified:**
- Group schema includes: id, name, description, photo_url, mode (verified in types/database.types.ts)
- Group members include: users table with full_name, avatar_url, birthday (verified in fetchGroupDetails query)
- Favorites accessible via group_favorites table with item_id (verified in lib/favorites.ts)
- Countdown utilities production-ready (verified in use across codebase)
