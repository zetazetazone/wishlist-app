# Phase 3: Calendar - Research

**Researched:** 2026-02-02
**Domain:** In-app Calendar UI, Device Calendar Sync (Google/Apple), Birthday Countdown, Auto-Celebration Creation
**Confidence:** HIGH

## Summary

This research covers the implementation of calendar features for the wishlist app: displaying birthdays in an in-app calendar, syncing events to device calendars (Google Calendar/Apple Calendar), showing countdown timers, and automatically creating celebrations from birthdays.

The primary technical challenge is the **dual-library pattern**: react-native-calendars for the in-app UI component and expo-calendar for device calendar integration. These serve different purposes - react-native-calendars renders a visual calendar with marked dates, while expo-calendar provides native API access to the device's calendar systems. Both are Expo-compatible with no ejection required.

For auto-celebration creation (CALR-02), Supabase's **pg_cron** extension enables daily scheduled jobs to scan for upcoming birthdays and create celebration records. This avoids complex client-side polling and ensures celebrations exist before users need them.

Date calculations for countdowns will use **date-fns** (already in project at v4.1.0), which provides all necessary utilities for birthday countdown calculations.

**Primary recommendation:** Use react-native-calendars for the in-app calendar UI with dot marking for birthdays, expo-calendar for native device calendar sync, date-fns for countdown calculations, and pg_cron for auto-celebration creation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-calendars | 1.1307.0 | In-app calendar UI | Most popular RN calendar, pure JS, Expo compatible, no ejection |
| expo-calendar | ~15.0.8 | Device calendar API access | Official Expo SDK, native Google/Apple calendar integration |
| date-fns | 4.1.0 | Date calculations, countdowns | Already in project, tree-shakeable, modern API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pg_cron | (Supabase extension) | Schedule auto-celebration creation | Daily job to create celebrations from birthdays |
| pg_net | (Supabase extension) | HTTP requests from database | If Edge Function needed for complex celebration logic |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-native-calendars | @marceloterreiro/flash-calendar | Better performance but newer (v1.6.0), less documentation |
| react-native-calendars | @howljs/react-native-calendar-kit | More features but higher complexity, overkill for birthday display |
| pg_cron | Client-side celebration creation | Simpler but celebrations might not exist when user opens app |

**Installation:**
```bash
# react-native-calendars (pure JS, no native linking)
npm install react-native-calendars

# expo-calendar (for device calendar sync)
npx expo install expo-calendar
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── calendar/
│       ├── BirthdayCalendar.tsx     # In-app calendar with marked birthdays
│       ├── CountdownCard.tsx        # Countdown to upcoming birthday
│       └── CalendarSyncButton.tsx   # Sync to device calendar button
├── utils/
│   ├── calendar.ts                  # Calendar calculations, date marking
│   ├── deviceCalendar.ts            # expo-calendar wrapper, permissions
│   └── countdown.ts                 # Birthday countdown logic
├── hooks/
│   └── useCalendarPermissions.ts    # Permission management hook
└── app/
    └── (app)/
        └── (tabs)/
            └── calendar.tsx         # Main calendar screen
```

### Pattern 1: Birthday Calendar with Dot Marking
**What:** Display all group birthdays on a monthly calendar with colored dots per group
**When to use:** In-app calendar view (CALR-01)
**Example:**
```typescript
// Source: react-native-calendars documentation
import { Calendar } from 'react-native-calendars';
import { useMemo } from 'react';

interface GroupBirthday {
  date: string; // YYYY-MM-DD
  groupId: string;
  groupColor: string;
  userName: string;
}

function BirthdayCalendar({ birthdays }: { birthdays: GroupBirthday[] }) {
  // Transform birthdays to markedDates format
  const markedDates = useMemo(() => {
    const marks: Record<string, { dots: Array<{ key: string; color: string }> }> = {};

    birthdays.forEach(birthday => {
      if (!marks[birthday.date]) {
        marks[birthday.date] = { dots: [] };
      }
      marks[birthday.date].dots.push({
        key: birthday.groupId,
        color: birthday.groupColor,
      });
    });

    return marks;
  }, [birthdays]);

  return (
    <Calendar
      markingType="multi-dot"
      markedDates={markedDates}
      onDayPress={(day) => {
        // Navigate to celebration detail if birthday exists
      }}
      enableSwipeMonths={true}
      firstDay={1} // Monday start
    />
  );
}
```

### Pattern 2: Device Calendar Sync with Permissions
**What:** Create birthday events in user's Google or Apple Calendar
**When to use:** User taps "Sync to Calendar" button (CALR-03)
**Example:**
```typescript
// Source: Expo Calendar documentation
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

async function syncBirthdayToDeviceCalendar(
  title: string,
  birthdayDate: Date,
  groupName: string
) {
  // 1. Request permissions
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Calendar permission denied');
  }

  // 2. Get or create a calendar for our app
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  let targetCalendar = calendars.find(c => c.title === 'Wishlist Birthdays');

  if (!targetCalendar) {
    const defaultCalendarSource = Platform.OS === 'ios'
      ? calendars.find(c => c.source.name === 'iCloud')?.source
      : { isLocalAccount: true, name: 'Wishlist', type: Calendar.SourceType.LOCAL };

    const calendarId = await Calendar.createCalendarAsync({
      title: 'Wishlist Birthdays',
      color: '#FF6B6B',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendarSource?.id,
      source: defaultCalendarSource,
      name: 'wishlistBirthdays',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
      ownerAccount: 'Wishlist App',
    });
    targetCalendar = { id: calendarId } as Calendar.Calendar;
  }

  // 3. Create the event
  const eventId = await Calendar.createEventAsync(targetCalendar.id, {
    title: `${title}'s Birthday (${groupName})`,
    startDate: birthdayDate,
    endDate: birthdayDate,
    allDay: true,
    notes: `Birthday celebration from Wishlist app`,
    alarms: [{ relativeOffset: -1440 }], // 1 day before
    recurrenceRule: {
      frequency: Calendar.Frequency.YEARLY,
    },
  });

  return eventId;
}
```

### Pattern 3: Birthday Countdown Calculation
**What:** Calculate days remaining until next birthday occurrence
**When to use:** Countdown display for planning window (CALR-04)
**Example:**
```typescript
// Source: date-fns documentation + birthday calculation pattern
import { differenceInDays, setYear, isBefore, getYear, isValid } from 'date-fns';

function getDaysUntilBirthday(birthday: Date | string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const birthdayDate = typeof birthday === 'string' ? new Date(birthday) : birthday;
  if (!isValid(birthdayDate)) return -1;

  // Set birthday to current year
  let nextBirthday = setYear(birthdayDate, getYear(today));
  nextBirthday.setHours(0, 0, 0, 0);

  // If birthday already passed this year, set to next year
  if (isBefore(nextBirthday, today)) {
    nextBirthday = setYear(birthdayDate, getYear(today) + 1);
  }

  return differenceInDays(nextBirthday, today);
}

// Planning window categorization
function getPlanningStatus(daysUntil: number): 'urgent' | 'soon' | 'planning' | 'future' {
  if (daysUntil <= 7) return 'urgent';    // Within a week
  if (daysUntil <= 14) return 'soon';     // 1-2 weeks
  if (daysUntil <= 30) return 'planning'; // Within a month
  return 'future';
}
```

### Pattern 4: Auto-Celebration Creation with pg_cron
**What:** Database job that creates celebrations for upcoming birthdays
**When to use:** Automatic celebration creation (CALR-02)
**Example:**
```sql
-- Source: Supabase pg_cron + pg_net documentation

-- 1. Enable extensions (run once in Supabase dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Function to create celebrations from birthdays
CREATE OR REPLACE FUNCTION public.create_upcoming_celebrations()
RETURNS void AS $$
DECLARE
  target_date DATE;
  planning_window_days INTEGER := 30; -- Create celebrations 30 days in advance
BEGIN
  target_date := CURRENT_DATE + planning_window_days;

  -- Find birthdays that match target_date (month and day)
  -- and don't have a celebration for this year yet
  INSERT INTO public.celebrations (group_id, celebrant_id, event_date, year, status)
  SELECT DISTINCT
    gm.group_id,
    u.id AS celebrant_id,
    MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INT,
              EXTRACT(MONTH FROM u.birthday)::INT,
              EXTRACT(DAY FROM u.birthday)::INT) AS event_date,
    EXTRACT(YEAR FROM CURRENT_DATE)::INT AS year,
    'upcoming' AS status
  FROM public.users u
  JOIN public.group_members gm ON gm.user_id = u.id
  WHERE u.birthday IS NOT NULL
    -- Birthday falls within planning window
    AND (
      MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INT,
                EXTRACT(MONTH FROM u.birthday)::INT,
                EXTRACT(DAY FROM u.birthday)::INT)
      BETWEEN CURRENT_DATE AND target_date
    )
    -- No celebration exists for this year
    AND NOT EXISTS (
      SELECT 1 FROM public.celebrations c
      WHERE c.group_id = gm.group_id
        AND c.celebrant_id = u.id
        AND c.year = EXTRACT(YEAR FROM CURRENT_DATE)::INT
    );

  -- Also create chat rooms for new celebrations
  INSERT INTO public.chat_rooms (celebration_id)
  SELECT c.id
  FROM public.celebrations c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_rooms cr WHERE cr.celebration_id = c.id
  );

  RAISE NOTICE 'Created celebrations for birthdays within % days', planning_window_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schedule to run daily at midnight
SELECT cron.schedule(
  'create-upcoming-celebrations',
  '0 0 * * *',  -- Daily at midnight UTC
  $$SELECT public.create_upcoming_celebrations();$$
);
```

### Anti-Patterns to Avoid
- **Mixing react-native-calendars with expo-calendar confusion:** They serve different purposes - UI vs native API. Use both, not either/or.
- **Creating celebrations on-demand:** If celebrations are created when user opens app, there's a race condition. Use scheduled jobs.
- **Requesting calendar permissions on app launch:** Ask only when user taps "Sync to Calendar" for first time.
- **Not handling February 29 birthdays:** Leap year birthdays need special handling (show on Feb 28 or Mar 1 in non-leap years).
- **Calculating countdown with time components:** Strip time to midnight for accurate day counts.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar UI rendering | Custom month/day grid | react-native-calendars | Localization, RTL, accessibility, edge cases (Feb, leap years) |
| Device calendar access | Native modules | expo-calendar | iOS/Android differences, permissions, recurring events |
| Date difference calculation | Manual subtraction | date-fns differenceInDays | Timezone handling, DST, leap seconds |
| Yearly recurring events | Manual year increment | expo-calendar recurrenceRule | OS handles recurrence correctly |
| Permission UI | Custom modals | System dialog via expo-calendar | Users trust system dialogs more |

**Key insight:** Calendar UI and date handling have many edge cases (leap years, timezones, locales, RTL languages). Libraries handle these; custom code doesn't.

## Common Pitfalls

### Pitfall 1: iOS 17 Permission Changes
**What goes wrong:** App requests calendar permission, user grants it, but `status` still shows 'undetermined' on first session.
**Why it happens:** iOS 17 introduced new permission scopes (read, write, full access). The `useCalendarPermissions()` hook has a known bug in some expo-calendar versions.
**How to avoid:** After permission grant, verify with a second status check or use `Calendar.requestCalendarPermissionsAsync()` directly instead of the hook.
**Warning signs:** Permission granted but calendar features don't work; works after app restart.

### Pitfall 2: Calendar Source Selection on iOS
**What goes wrong:** Creating events fails on iOS because no valid calendar source exists.
**Why it happens:** iCloud calendar not set up, or source ID doesn't exist.
**How to avoid:** Always have a fallback to local calendar. Check for iCloud first, then local.
**Warning signs:** `createCalendarAsync` throws "source not found" error on iOS.

### Pitfall 3: Marked Dates Reference Stability
**What goes wrong:** Calendar doesn't update when birthdays change.
**Why it happens:** react-native-calendars compares `markedDates` by reference, not deep equality.
**How to avoid:** Use `useMemo` with proper dependencies to generate new markedDates object when data changes.
**Warning signs:** Adding/removing birthdays doesn't update the calendar UI.

### Pitfall 4: February 29 Birthday Handling
**What goes wrong:** Leap year birthdays (Feb 29) cause errors or show on wrong date in non-leap years.
**Why it happens:** JavaScript's `setYear` with Feb 29 on non-leap year rolls to March 1.
**How to avoid:** For Feb 29 birthdays, explicitly check if current year is leap year; if not, use Feb 28.
**Warning signs:** Leap year baby's birthday shows as March 1 in 2025 (non-leap year).

### Pitfall 5: Timezone Issues with All-Day Events
**What goes wrong:** Birthday shows on wrong day when user is in different timezone than server.
**Why it happens:** Dates stored as ISO strings include time component; all-day events misinterpreted.
**How to avoid:** Store birthdays as DATE type (not TIMESTAMP). Use `allDay: true` for device calendar events.
**Warning signs:** Birthday shows on previous/next day depending on user's timezone.

### Pitfall 6: pg_cron Not Running
**What goes wrong:** Scheduled celebration creation never executes.
**Why it happens:** pg_cron extension not enabled, or function has errors silently failing.
**How to avoid:** Test function manually before scheduling. Check Supabase cron logs for failures.
**Warning signs:** No new celebrations created despite upcoming birthdays; cron.job_run_details shows failures.

## Code Examples

Verified patterns from official sources:

### Complete Calendar Screen
```typescript
// Source: Combined from react-native-calendars + expo-calendar docs
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { differenceInDays, setYear, getYear, isBefore, format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Birthday {
  userId: string;
  userName: string;
  date: Date;
  groupId: string;
  groupName: string;
  groupColor: string;
}

function CalendarScreen({ birthdays }: { birthdays: Birthday[] }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Generate marked dates with multi-dot for multiple birthdays
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    const currentYear = getYear(new Date());

    birthdays.forEach(bday => {
      // Set to current year for display
      const displayDate = setYear(bday.date, currentYear);
      const dateKey = format(displayDate, 'yyyy-MM-dd');

      if (!marks[dateKey]) {
        marks[dateKey] = { dots: [] };
      }
      marks[dateKey].dots.push({
        key: `${bday.userId}-${bday.groupId}`,
        color: bday.groupColor,
      });
    });

    // Highlight selected date
    if (selectedDate && marks[selectedDate]) {
      marks[selectedDate].selected = true;
    }

    return marks;
  }, [birthdays, selectedDate]);

  // Get birthdays for selected date
  const selectedBirthdays = useMemo(() => {
    if (!selectedDate) return [];
    return birthdays.filter(bday => {
      const dateKey = format(setYear(bday.date, getYear(new Date())), 'yyyy-MM-dd');
      return dateKey === selectedDate;
    });
  }, [birthdays, selectedDate]);

  return (
    <View style={{ flex: 1 }}>
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        enableSwipeMonths
        firstDay={1}
        theme={{
          todayTextColor: '#FF6B6B',
          arrowColor: '#FF6B6B',
        }}
      />

      {selectedBirthdays.length > 0 && (
        <View style={{ padding: 16 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
            Birthdays on this day:
          </Text>
          {selectedBirthdays.map(bday => (
            <BirthdayCard key={`${bday.userId}-${bday.groupId}`} birthday={bday} />
          ))}
        </View>
      )}
    </View>
  );
}
```

### Countdown Component
```typescript
// Source: date-fns documentation
import { differenceInDays, setYear, getYear, isBefore, isValid } from 'date-fns';
import { View, Text } from 'react-native';

function getDaysUntilBirthday(birthday: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Handle Feb 29 in non-leap years
  const birthdayMonth = birthday.getMonth();
  const birthdayDay = birthday.getDate();
  const currentYear = getYear(today);

  let nextBirthday: Date;
  if (birthdayMonth === 1 && birthdayDay === 29) {
    // Feb 29 birthday - check if current year is leap
    const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0;
    nextBirthday = isLeapYear
      ? new Date(currentYear, 1, 29)
      : new Date(currentYear, 1, 28); // Show on Feb 28 in non-leap years
  } else {
    nextBirthday = setYear(birthday, currentYear);
  }
  nextBirthday.setHours(0, 0, 0, 0);

  if (isBefore(nextBirthday, today)) {
    // Birthday passed this year, calculate for next year
    const nextYear = currentYear + 1;
    if (birthdayMonth === 1 && birthdayDay === 29) {
      const isNextLeapYear = (nextYear % 4 === 0 && nextYear % 100 !== 0) || nextYear % 400 === 0;
      nextBirthday = isNextLeapYear
        ? new Date(nextYear, 1, 29)
        : new Date(nextYear, 1, 28);
    } else {
      nextBirthday = setYear(birthday, nextYear);
    }
  }

  return differenceInDays(nextBirthday, today);
}

function CountdownCard({ birthday, userName }: { birthday: Date; userName: string }) {
  const daysUntil = getDaysUntilBirthday(birthday);

  const getStatusColor = () => {
    if (daysUntil === 0) return '#FF6B6B'; // Today!
    if (daysUntil <= 7) return '#FF9F43';  // Urgent
    if (daysUntil <= 14) return '#FECA57'; // Soon
    if (daysUntil <= 30) return '#48DBFB'; // Planning
    return '#95A5A6';                      // Future
  };

  return (
    <View style={{
      backgroundColor: getStatusColor(),
      padding: 16,
      borderRadius: 12,
      marginVertical: 8,
    }}>
      <Text style={{ fontWeight: 'bold', color: 'white', fontSize: 18 }}>
        {userName}'s Birthday
      </Text>
      <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>
        {daysUntil === 0 ? 'TODAY!' : `${daysUntil} days`}
      </Text>
    </View>
  );
}
```

### Device Calendar Sync with Full Error Handling
```typescript
// Source: Expo Calendar documentation
import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';

interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

async function getOrCreateWishlistCalendar(): Promise<string> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Calendar permission not granted');
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find(c => c.title === 'Wishlist Birthdays');

  if (existing) return existing.id;

  // Find appropriate source
  let source: Calendar.Source | undefined;

  if (Platform.OS === 'ios') {
    // Try iCloud first, then local
    source = calendars.find(c => c.source.name === 'iCloud')?.source
          ?? calendars.find(c => c.source.type === Calendar.SourceType.LOCAL)?.source;
  } else {
    // Android: use local source
    source = { isLocalAccount: true, name: 'Wishlist', type: Calendar.SourceType.LOCAL } as any;
  }

  if (!source) {
    throw new Error('No calendar source available');
  }

  const calendarId = await Calendar.createCalendarAsync({
    title: 'Wishlist Birthdays',
    color: '#FF6B6B',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: source.id,
    source,
    name: 'wishlistBirthdays',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
    ownerAccount: Platform.OS === 'ios' ? 'iCloud' : 'Wishlist App',
  });

  return calendarId;
}

export async function syncBirthdayEvent(
  userName: string,
  birthday: Date,
  groupName: string
): Promise<SyncResult> {
  try {
    const calendarId = await getOrCreateWishlistCalendar();

    // Calculate next occurrence
    const today = new Date();
    let eventDate = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
    if (eventDate < today) {
      eventDate = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
    }

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `${userName}'s Birthday`,
      notes: `Birthday celebration for ${groupName} group - Wishlist App`,
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
  } catch (error) {
    console.error('Calendar sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-permissions for calendar | Built-in Calendar.requestCalendarPermissionsAsync() | Expo SDK 48+ | Single import for permissions |
| react-native-add-calendar-event | expo-calendar | 2024 | More features, better Expo support |
| Manual recurring event creation | expo-calendar recurrenceRule | Always available | OS handles recurrence correctly |
| Client-side celebration creation | pg_cron scheduled jobs | Supabase 2024+ | Reliable, no client polling needed |

**Deprecated/outdated:**
- `expo-permissions` package: Use permission methods directly from expo-calendar
- `react-native-add-calendar-event`: Author recommends expo-calendar instead
- Polling for celebrations: Use database-level scheduling with pg_cron

## Open Questions

Things that couldn't be fully resolved:

1. **Planning Window Duration**
   - What we know: Need to create celebrations before birthday
   - What's unclear: How many days in advance? 7? 14? 30?
   - Recommendation: Start with 30 days (configurable in DB function). Adjust based on user feedback.

2. **Calendar Sync Scope**
   - What we know: User wants to sync birthdays to device calendar
   - What's unclear: All birthdays at once, or one-by-one? All groups or selected?
   - Recommendation: Provide "Sync All" button plus individual sync per birthday. Let user choose.

3. **Recurring Event Updates**
   - What we know: expo-calendar can create yearly recurring events
   - What's unclear: If user changes birthday, how to update existing device calendar event?
   - Recommendation: Store eventId mapping in database. On birthday change, delete old event, create new.

4. **Non-Leap Year Feb 29 Display**
   - What we know: Feb 29 birthdays exist; non-leap years don't have Feb 29
   - What's unclear: Show on Feb 28 or March 1?
   - Recommendation: Feb 28 (before, not after). This is common convention.

## Sources

### Primary (HIGH confidence)
- [Expo Calendar Documentation](https://docs.expo.dev/versions/latest/sdk/calendar/) - API reference, permissions, events
- [react-native-calendars Documentation](https://wix.github.io/react-native-calendars/docs/Intro) - Components, marking, theming
- [Supabase pg_cron Documentation](https://supabase.com/docs/guides/functions/schedule-functions) - Scheduled functions

### Secondary (MEDIUM confidence)
- [Expo Calendar GitHub Issues](https://github.com/expo/expo/issues?q=expo-calendar) - iOS 17 permission bug reports
- [react-native-calendars Multi-Dot Example](https://wix.github.io/react-native-calendars/docs/Components/Calendar) - Marking patterns

### Tertiary (LOW confidence)
- Flash Calendar as alternative - needs validation if performance is critical
- iOS 17 useCalendarPermissions hook bug - may be fixed in newer expo-calendar versions

## Metadata

**Confidence breakdown:**
- In-app calendar UI: HIGH - react-native-calendars well-documented, Expo compatible
- Device calendar sync: HIGH - expo-calendar is official Expo SDK
- Countdown calculations: HIGH - date-fns is battle-tested, already in project
- Auto-celebration creation: MEDIUM - pg_cron works but needs testing for edge cases
- iOS 17 permission handling: MEDIUM - known issues but workarounds exist

**Research date:** 2026-02-02
**Valid until:** 30 days (stable libraries, no rapid changes expected)
