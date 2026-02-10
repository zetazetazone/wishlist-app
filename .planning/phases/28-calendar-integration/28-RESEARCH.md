# Phase 28: Calendar Integration - Research

**Researched:** 2026-02-10
**Domain:** React Native Calendar Integration with expo-calendar and react-native-calendars
**Confidence:** HIGH

## Summary

Phase 28 extends the existing in-app calendar and device calendar sync functionality to include friend birthdays and friend public dates. The codebase already has a working implementation for group birthdays using `react-native-calendars` (in-app display) and `expo-calendar` (device sync), making this phase primarily an extension rather than a new build.

The key architectural decision is to create a unified data model that can represent both group birthdays and friend dates while preserving source identification (for color-coding and filtering). The existing `BirthdayCalendar` component uses react-native-calendars' multi-dot marking which naturally supports multiple event types on the same date - we simply add teal-colored dots for friend events alongside the existing varied-color group dots.

For device calendar sync, the existing `deviceCalendar.ts` utility creates events with yearly recurrence and reminders. This can be extended to support friend dates by adding a new calendar ("Wishlist Friend Dates") or including them in the existing "Wishlist Birthdays" calendar with clear event titles distinguishing the source.

**Primary recommendation:** Create a new `lib/friendDates.ts` service to fetch friend birthdays and public dates, then modify the calendar screen to merge friend dates with group birthdays using a unified display type with source indicators.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-calendars | 1.1314.0 | In-app calendar display | Already used for group birthday calendar; supports multi-dot marking |
| expo-calendar | ~15.0.8 | Device calendar sync | Already used for device calendar integration |
| date-fns | 4.1.0 | Date manipulation | Already used throughout codebase |
| @supabase/supabase-js | 2.93.3 | Database queries | Already used for all data operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @expo/vector-icons | ^15.0.3 | Icons for source indicators | Display "Friend" vs "Group" badges |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate calendars by source | Single merged calendar | Separate gives filtering but adds complexity; merged is simpler and matches user mental model |
| New calendar component | Extend BirthdayCalendar | Extending preserves existing UX and reduces code duplication |

**Installation:**
```bash
# No new dependencies needed - all required packages already installed
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── birthdays.ts        # EXISTING - group birthdays (no changes needed)
├── friends.ts          # EXISTING - friend management (no changes needed)
├── publicDates.ts      # EXISTING - user's own public dates (no changes needed)
└── friendDates.ts      # NEW - fetch friend birthdays + friend public dates

utils/
├── countdown.ts        # EXISTING - countdown calculations (no changes needed)
└── deviceCalendar.ts   # MODIFY - extend to support FriendDate type

components/calendar/
├── BirthdayCalendar.tsx    # MODIFY - accept unified CalendarEvent type
├── CountdownCard.tsx       # MODIFY - add source indicator
└── CalendarSyncButton.tsx  # MODIFY - support FriendDate[] parameter
```

### Pattern 1: Unified Calendar Event Type
**What:** Create a unified type that represents any calendar event (group birthday or friend date) with source metadata.
**When to use:** Anywhere displaying or processing mixed event types.
**Example:**
```typescript
// Source: Codebase pattern analysis
// Extend existing GroupBirthday pattern to support friend dates

// Base types (from existing lib files)
type EventSource = 'group' | 'friend';
type EventType = 'birthday' | 'public_date';

interface CalendarEvent {
  id: string;             // unique identifier
  source: EventSource;    // 'group' or 'friend'
  type: EventType;        // 'birthday' or 'public_date'
  date: string;           // YYYY-MM-DD format
  month: number;          // 1-12 for recurring lookup
  day: number;            // 1-31 for recurring lookup
  title: string;          // display name (person's name for birthdays, date title for public dates)
  subtitle: string;       // group name or friend name depending on source
  color: string;          // group's assigned color OR teal (#0D9488) for friends
  avatarUrl: string | null;
}

// Teal color constant for friend events (as specified in STATE.md)
const FRIEND_DATE_COLOR = '#0D9488';
```

### Pattern 2: Query Friends' Data with RLS
**What:** Fetch friend birthdays and public dates using existing RLS policies.
**When to use:** Getting data from friends table (joined with user_profiles) and public_dates table.
**Example:**
```typescript
// Source: Existing lib/friends.ts pattern + Phase 23 RLS research

// Friend birthdays: Get friend user IDs -> fetch their profiles with birthday
async function getFriendBirthdays(): Promise<CalendarEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get all friend user IDs (bidirectional query)
  const { data: friendships } = await supabase
    .from('friends')
    .select('user_a_id, user_b_id')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

  if (!friendships?.length) return [];

  // Extract friend IDs (the OTHER user in each row)
  const friendIds = friendships.map(f =>
    f.user_a_id === user.id ? f.user_b_id : f.user_a_id
  );

  // Fetch friend profiles with birthdays
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url, birthday')
    .in('id', friendIds)
    .not('birthday', 'is', null); // Only friends with birthdays set

  // Transform to CalendarEvent format
  return profiles?.map(p => ({
    id: `friend-birthday-${p.id}`,
    source: 'friend' as const,
    type: 'birthday' as const,
    date: p.birthday!,
    month: parseInt(p.birthday!.split('-')[1]),
    day: parseInt(p.birthday!.split('-')[2]),
    title: p.display_name || 'Friend',
    subtitle: 'Friend',
    color: FRIEND_DATE_COLOR,
    avatarUrl: getAvatarUrl(p.avatar_url),
  })) ?? [];
}

// Friend public dates: RLS allows reading friends' public_dates
async function getFriendPublicDates(): Promise<CalendarEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get friend IDs first
  const { data: friendships } = await supabase
    .from('friends')
    .select('user_a_id, user_b_id')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

  if (!friendships?.length) return [];

  const friendIds = friendships.map(f =>
    f.user_a_id === user.id ? f.user_b_id : f.user_a_id
  );

  // Fetch public_dates for all friends
  // RLS policy "Users can view own and friends public dates" authorizes this
  const { data: dates } = await supabase
    .from('public_dates')
    .select('id, user_id, title, month, day, year')
    .in('user_id', friendIds);

  if (!dates?.length) return [];

  // Need friend names for subtitle
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', friendIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

  // Transform to CalendarEvent format
  return dates.map(d => {
    const profile = profileMap.get(d.user_id);
    // Construct date string (use current year for display)
    const currentYear = new Date().getFullYear();
    const displayYear = d.year ?? currentYear;
    const dateStr = `${displayYear}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

    return {
      id: `friend-date-${d.id}`,
      source: 'friend' as const,
      type: 'public_date' as const,
      date: dateStr,
      month: d.month,
      day: d.day,
      title: d.title,
      subtitle: profile?.display_name || 'Friend',
      color: FRIEND_DATE_COLOR,
      avatarUrl: null, // Public dates don't have avatars
    };
  });
}
```

### Pattern 3: Multi-Dot Calendar Marking
**What:** react-native-calendars supports multi-dot marking where each date can have multiple colored dots.
**When to use:** Displaying multiple events on the same date with different colors.
**Example:**
```typescript
// Source: Existing BirthdayCalendar.tsx pattern (verified in codebase)
// Calendar markingType="multi-dot" allows multiple dots per date

interface MarkedDates {
  [date: string]: {
    dots?: { key: string; color: string }[];
    selected?: boolean;
    selectedColor?: string;
  };
}

// Build marked dates from unified events
function buildMarkedDates(events: CalendarEvent[], selectedDate: string | null): MarkedDates {
  const marks: MarkedDates = {};
  const currentYear = new Date().getFullYear();

  events.forEach(event => {
    // Normalize to current year for calendar display
    const dateKey = `${currentYear}-${String(event.month).padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;

    if (!marks[dateKey]) {
      marks[dateKey] = { dots: [] };
    }

    // Add dot if not already present for this event
    const existingDot = marks[dateKey].dots?.find(d => d.key === event.id);
    if (!existingDot) {
      marks[dateKey].dots!.push({
        key: event.id,
        color: event.color, // Teal for friends, varied for groups
      });
    }
  });

  // Handle selected date highlighting
  if (selectedDate && marks[selectedDate]) {
    marks[selectedDate].selected = true;
    marks[selectedDate].selectedColor = '#8B1538';
  } else if (selectedDate) {
    marks[selectedDate] = {
      selected: true,
      selectedColor: '#f3e5e8',
    };
  }

  return marks;
}
```

### Pattern 4: Device Calendar Sync with Event Types
**What:** Extend existing deviceCalendar.ts to create events for friend dates.
**When to use:** When user triggers device calendar sync.
**Example:**
```typescript
// Source: Existing utils/deviceCalendar.ts pattern

// Extend existing types
interface SyncableEvent {
  title: string;        // Event title (e.g., "John's Birthday" or "Anniversary")
  date: string | Date;  // Date for the event
  source: 'group' | 'friend';
  type: 'birthday' | 'public_date';
  contextName: string;  // Group name or friend name
}

// Create event with source-aware title and notes
async function syncCalendarEvent(event: SyncableEvent): Promise<SyncResult> {
  const calendarId = await getOrCreateWishlistCalendar();
  const eventDate = getNextOccurrence(event.date);

  // Format title based on type
  const title = event.type === 'birthday'
    ? `${event.title}'s Birthday`
    : event.title;

  // Format notes with source context
  const notes = event.source === 'group'
    ? `Birthday celebration for ${event.contextName} group - Wishlist App`
    : `${event.type === 'birthday' ? 'Friend birthday' : 'Friend event'} - ${event.contextName} - Wishlist App`;

  const eventId = await Calendar.createEventAsync(calendarId, {
    title,
    notes,
    startDate: eventDate,
    endDate: eventDate,
    allDay: true,
    alarms: [
      { relativeOffset: -10080 }, // 1 week before
      { relativeOffset: -1440 },  // 1 day before
    ],
    recurrenceRule: {
      frequency: Calendar.Frequency.YEARLY,
    },
  });

  return { success: true, eventId };
}
```

### Anti-Patterns to Avoid
- **Separate calendar components:** Don't create a new FriendsCalendar component - extend BirthdayCalendar to accept unified events.
- **N+1 queries:** Don't fetch profiles individually per friend - batch fetch all profiles after getting friend IDs.
- **Mutating existing GroupBirthday type:** Don't modify lib/birthdays.ts - create new CalendarEvent type in lib/friendDates.ts.
- **Hard-coded dates:** Don't assume current year - properly handle year rollover for recurring dates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date recurrence calculation | Custom leap year/rollover logic | date-fns with existing `getNextBirthdayOccurrence()` pattern | Leap year edge cases (Feb 29), year rollover complexity |
| Calendar permission handling | Custom permission flow | Existing `checkCalendarPermission()`, `requestCalendarPermission()` | iOS/Android differences already handled |
| Multi-dot calendar rendering | Custom dot overlay | react-native-calendars markingType="multi-dot" | Well-tested, handles overflow, performance optimized |
| Friend list queries | Custom bidirectional SQL | Existing `getFriends()` pattern from lib/friends.ts | Bidirectional OR query pattern already proven |

**Key insight:** The existing codebase has solved the hard problems (device calendar permissions, recurring events, bidirectional friendships). Phase 28 is primarily data aggregation and UI extension.

## Common Pitfalls

### Pitfall 1: Date Month Indexing Mismatch
**What goes wrong:** JavaScript Date months are 0-indexed (0-11) but database stores 1-12.
**Why it happens:** Mixing database month values with JavaScript Date constructor.
**How to avoid:** Always use `month - 1` when creating Date objects from database values; use `getMonth() + 1` when storing.
**Warning signs:** Dates appearing one month off in calendar.

### Pitfall 2: Public Dates Without Year Display
**What goes wrong:** Public dates with `year = null` (recurring) don't have a full date string.
**Why it happens:** Database stores month/day separately for recurring dates.
**How to avoid:** Construct date string using current year for display: `${currentYear}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`.
**Warning signs:** "Invalid Date" errors, NaN in calendar marking.

### Pitfall 3: Calendar Sync Creates Duplicates
**What goes wrong:** User syncs multiple times, creating duplicate events.
**Why it happens:** expo-calendar `createEventAsync` doesn't check for existing events.
**How to avoid:** Option A: Track synced event IDs in AsyncStorage; Option B: Check existing events before creating; Option C: Use "sync" terminology and warn user about potential duplicates.
**Warning signs:** Same birthday appearing multiple times in device calendar.

### Pitfall 4: Friend Dates RLS Policy Confusion
**What goes wrong:** Query returns empty when friends have public dates.
**Why it happens:** Forgetting that public_dates RLS allows friends to READ but query might not be constructed correctly.
**How to avoid:** Query public_dates with `.in('user_id', friendIds)` - RLS handles the authorization.
**Warning signs:** getFriendPublicDates() returns empty array despite friends having dates.

### Pitfall 5: Empty Calendar State Handling
**What goes wrong:** Calendar shows confusing state when user has no friends.
**Why it happens:** Not distinguishing "loading" from "no data" from "no friends".
**How to avoid:** Clear empty states: "Add friends to see their special dates" vs "Your friends haven't added any dates yet".
**Warning signs:** Blank calendar with no explanation.

### Pitfall 6: February 29 Leap Year Handling
**What goes wrong:** Friend born on Feb 29 not shown in non-leap years.
**Why it happens:** Feb 29 doesn't exist in non-leap years.
**How to avoid:** Follow existing `getNextBirthdayOccurrence()` pattern - show Feb 28 in non-leap years.
**Warning signs:** Some birthdays disappear in certain years.

## Code Examples

Verified patterns from official sources:

### Fetch All Friend Dates (Combined Service)
```typescript
// Source: Codebase pattern analysis + RLS policy research

import { supabase } from './supabase';
import { getAvatarUrl } from './storage';

export const FRIEND_DATE_COLOR = '#0D9488'; // Teal

export interface FriendDate {
  id: string;
  source: 'friend';
  type: 'birthday' | 'public_date';
  date: string;
  month: number;
  day: number;
  title: string;
  friendName: string;
  friendId: string;
  avatarUrl: string | null;
  color: string;
}

export async function getFriendDates(): Promise<FriendDate[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Step 1: Get friend IDs
  const { data: friendships, error: friendError } = await supabase
    .from('friends')
    .select('user_a_id, user_b_id')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

  if (friendError || !friendships?.length) return [];

  const friendIds = friendships.map(f =>
    f.user_a_id === user.id ? f.user_b_id : f.user_a_id
  );

  // Step 2: Batch fetch friend profiles (for birthdays and names)
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url, birthday')
    .in('id', friendIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

  // Step 3: Batch fetch friend public dates
  const { data: publicDates } = await supabase
    .from('public_dates')
    .select('id, user_id, title, month, day, year')
    .in('user_id', friendIds);

  const results: FriendDate[] = [];
  const currentYear = new Date().getFullYear();

  // Add friend birthdays
  profiles?.forEach(profile => {
    if (profile.birthday) {
      const [year, month, day] = profile.birthday.split('-').map(Number);
      results.push({
        id: `friend-birthday-${profile.id}`,
        source: 'friend',
        type: 'birthday',
        date: profile.birthday,
        month,
        day,
        title: profile.display_name || 'Friend',
        friendName: profile.display_name || 'Friend',
        friendId: profile.id,
        avatarUrl: getAvatarUrl(profile.avatar_url),
        color: FRIEND_DATE_COLOR,
      });
    }
  });

  // Add friend public dates
  publicDates?.forEach(date => {
    const profile = profileMap.get(date.user_id);
    const displayYear = date.year ?? currentYear;
    const dateStr = `${displayYear}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;

    results.push({
      id: `friend-date-${date.id}`,
      source: 'friend',
      type: 'public_date',
      date: dateStr,
      month: date.month,
      day: date.day,
      title: date.title,
      friendName: profile?.display_name || 'Friend',
      friendId: date.user_id,
      avatarUrl: null,
      color: FRIEND_DATE_COLOR,
    });
  });

  return results;
}
```

### Modified BirthdayCalendar Props
```typescript
// Source: Extending existing BirthdayCalendar.tsx

import type { GroupBirthday } from '../../lib/birthdays';
import type { FriendDate } from '../../lib/friendDates';

interface BirthdayCalendarProps {
  birthdays: GroupBirthday[];          // Existing prop
  friendDates?: FriendDate[];          // NEW: Friend dates
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}
```

### CountdownCard Source Indicator
```typescript
// Source: Extending existing CountdownCard.tsx

interface CountdownCardProps {
  birthday: GroupBirthday | FriendDate;
  daysUntil: number;
  onPress?: () => void;
}

// Inside component:
const sourceLabel = 'source' in birthday
  ? (birthday.source === 'friend'
      ? (birthday.type === 'birthday' ? 'Friend Birthday' : 'Friend Date')
      : birthday.groupName)
  : birthday.groupName;

// Render source badge
<View style={styles.sourceRow}>
  <View style={[styles.sourceBadge, { backgroundColor: birthday.source === 'friend' ? '#E6FFFA' : `${birthday.groupColor}20` }]}>
    <Text style={[styles.sourceText, { color: birthday.source === 'friend' ? '#0D9488' : birthday.groupColor }]}>
      {sourceLabel}
    </Text>
  </View>
</View>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate birthday/event calendars | Unified multi-dot calendar | react-native-calendars multi-dot has been standard | Single view for all dates, less navigation |
| expo-calendar async status | Permission APIs stabilized | Expo SDK 50+ | iOS 17 quirks handled in existing code |

**Deprecated/outdated:**
- `Calendar.requestPermissionsAsync()` - use `Calendar.requestCalendarPermissionsAsync()` (already correct in codebase)

## Open Questions

1. **Single calendar or separate calendars for device sync?**
   - What we know: Existing code creates "Wishlist Birthdays" calendar
   - What's unclear: Should friend dates go in same calendar or separate "Wishlist Friend Dates"?
   - Recommendation: Same calendar with clear event titles; simpler for users, less calendar clutter

2. **Duplicate event prevention strategy?**
   - What we know: expo-calendar doesn't auto-dedupe
   - What's unclear: Best UX for handling re-sync (warn user? skip existing? update?)
   - Recommendation: For MVP, warn user "This will add new events. Existing events won't be modified." Track in v1.5 for proper sync state management.

3. **Performance with many friends?**
   - What we know: Current design does 3 queries (friends + profiles + public_dates)
   - What's unclear: Performance impact with 100+ friends
   - Recommendation: Acceptable for MVP. If slow, optimize with single RPC function in future.

## Sources

### Primary (HIGH confidence)
- `/home/zetaz/wishlist-app/lib/birthdays.ts` - Existing GroupBirthday type and query patterns
- `/home/zetaz/wishlist-app/lib/friends.ts` - Bidirectional friendship queries with profile batch fetch
- `/home/zetaz/wishlist-app/lib/publicDates.ts` - Public dates CRUD operations
- `/home/zetaz/wishlist-app/utils/deviceCalendar.ts` - Device calendar sync implementation
- `/home/zetaz/wishlist-app/components/calendar/BirthdayCalendar.tsx` - Multi-dot marking implementation
- `/home/zetaz/wishlist-app/components/calendar/CountdownCard.tsx` - Event display card pattern
- `/home/zetaz/wishlist-app/supabase/migrations/20260210000001_v1.4_friends_system_foundation.sql` - RLS policies for friends and public_dates

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` - Decision: Friend dates use teal color (#0D9488)
- `.planning/research/SUMMARY.md` - Phase ordering and dependency rationale
- `.planning/REQUIREMENTS.md` - FCAL-01 through FCAL-05 requirements

### Tertiary (LOW confidence, validate during implementation)
- Device calendar duplicate handling behavior may vary by platform/calendar app version

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, extending existing patterns
- Architecture: HIGH - Clear patterns from existing calendar implementation
- Pitfalls: HIGH - Most identified from actual codebase issues and month indexing patterns

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable patterns, no expected changes to expo-calendar or react-native-calendars)
