---
phase: quick-010
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(app)/(tabs)/events.tsx
  - app/(app)/(tabs)/_layout.tsx
  - src/i18n/locales/en.json
  - src/i18n/locales/es.json
autonomous: true

must_haves:
  truths:
    - "User sees unified Events tab in tab bar (replaces Celebrations + Calendar)"
    - "User can switch between Upcoming and Calendar views via SegmentedControl"
    - "Upcoming view shows CelebrationCards with Gift Leader badge and action-oriented content"
    - "Calendar view shows BirthdayCalendar with date selection and CountdownCards"
    - "Tab bar has 4 tabs: Wishlist, People, Events, (Settings hidden)"
  artifacts:
    - path: "app/(app)/(tabs)/events.tsx"
      provides: "Unified Events screen with SegmentedControl"
      min_lines: 200
    - path: "app/(app)/(tabs)/_layout.tsx"
      provides: "Updated tab layout hiding old tabs, showing Events"
      contains: "events"
  key_links:
    - from: "app/(app)/(tabs)/events.tsx"
      to: "lib/celebrations.ts"
      via: "getCelebrations import"
      pattern: "getCelebrations"
    - from: "app/(app)/(tabs)/events.tsx"
      to: "lib/birthdays.ts"
      via: "getGroupBirthdays import"
      pattern: "getGroupBirthdays"
    - from: "app/(app)/(tabs)/events.tsx"
      to: "components/calendar/BirthdayCalendar.tsx"
      via: "BirthdayCalendar component"
      pattern: "BirthdayCalendar"
---

<objective>
Merge the Celebrations and Calendar tabs into a unified "Events" screen with SegmentedControl.

Purpose: Reduce tab bar from 4 visible tabs to 3 (Wishlist, People, Events), providing a single entry point for all birthday-related information. Serves both action-oriented users (Upcoming view with celebrations to manage) and discovery-oriented users (Calendar view for browsing).

Output: Unified events.tsx screen, updated tab layout, i18n translations
</objective>

<execution_context>
@/home/zetaz/.claude/get-shit-done/workflows/execute-plan.md
@/home/zetaz/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

Reference implementation pattern:
@app/(app)/(tabs)/social.tsx (unified People screen with SegmentedControl - follow this pattern)

Source screens to merge:
@app/(app)/(tabs)/celebrations.tsx (action view - CelebrationCards)
@app/(app)/(tabs)/calendar.tsx (discovery view - BirthdayCalendar + CountdownCards)

Tab layout to update:
@app/(app)/(tabs)/_layout.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create unified Events screen with SegmentedControl</name>
  <files>app/(app)/(tabs)/events.tsx</files>
  <action>
Create events.tsx following the social.tsx pattern:

1. **Imports**: Combine imports from both celebrations.tsx and calendar.tsx:
   - React state/hooks, RN components, FlashList, expo-router, i18n
   - LinearGradient, MotiView from social.tsx pattern
   - getCelebrations, Celebration from lib/celebrations
   - getGroupBirthdays, filterBirthdaysForDate, GroupBirthday from lib/birthdays
   - getFriendDates, FriendDate, FRIEND_DATE_COLOR from lib/friendDates
   - BirthdayCalendar, CountdownCard, CelebrationCard components
   - CalendarSyncIconButton for calendar segment
   - theme constants (colors, spacing, borderRadius, shadows)

2. **State Management**:
   - `activeSegment`: 'upcoming' | 'calendar' (default: 'upcoming' for action-oriented default)
   - Celebrations state from celebrations.tsx (celebrations, currentUserId)
   - Calendar state from calendar.tsx (birthdays, friendDates, selectedDate)
   - Shared: loading, refreshing, error

3. **Data Loading**:
   - loadData() fetches both celebrations AND calendar data in parallel (Promise.all)
   - Load on mount (useEffect) and on focus (useFocusEffect)
   - Refresh only refreshes active segment data (like social.tsx pattern)

4. **Header Structure** (follow social.tsx LinearGradient pattern):
   - Gradient header with burgundy colors
   - Title: t('events.title') - "Events"
   - Subtitle: Show count based on active segment
     - Upcoming: "X celebrations"
     - Calendar: "X upcoming" (birthdays in next 30 days)
   - SegmentedControl with two buttons: t('events.segments.upcoming'), t('events.segments.calendar')
   - Contextual header icons:
     - Calendar segment: CalendarSyncIconButton (top right)
     - Upcoming segment: Gift Leader badge if user leads any (like current celebrations header)

5. **Content Rendering** (conditional on activeSegment):
   - **Upcoming segment**:
     - Render celebrations using FlashList with CelebrationCard
     - Show Gift Leader section header if user leads any
     - Empty state with party-popper icon
   - **Calendar segment**:
     - ScrollView containing BirthdayCalendar
     - Selected date section (birthdays + friend dates)
     - "Coming Up" section with CountdownCards for next 30 days
     - Empty state with calendar-blank icon

6. **Styles**: Combine styles from social.tsx (header, segment control) with celebrations/calendar content styles.
  </action>
  <verify>
    - File exists at app/(app)/(tabs)/events.tsx
    - No TypeScript errors: `npx tsc --noEmit 2>&1 | grep -i events || echo "No errors"`
    - Imports all required components and functions
  </verify>
  <done>
    - events.tsx created with SegmentedControl switching between Upcoming (CelebrationCards) and Calendar (BirthdayCalendar + CountdownCards) views
    - Both data sources loaded in parallel
    - Follows social.tsx gradient header pattern
  </done>
</task>

<task type="auto">
  <name>Task 2: Update tab layout and add i18n translations</name>
  <files>app/(app)/(tabs)/_layout.tsx, src/i18n/locales/en.json, src/i18n/locales/es.json</files>
  <action>
**_layout.tsx updates:**

1. Add Events tab configuration:
```tsx
<Tabs.Screen
  name="events"
  options={{
    title: 'Events',
    headerShown: false, // Events has its own custom header
    tabBarIcon: ({ color, size }) => (
      <MaterialCommunityIcons name="calendar-star" size={size} color={color} />
    ),
  }}
/>
```

2. Hide old tabs (add href: null like friends/groups pattern):
```tsx
{/* DEPRECATED: Use events.tsx - unified Events screen */}
<Tabs.Screen
  name="celebrations"
  options={{
    href: null, // Hidden - replaced by events.tsx
  }}
/>
<Tabs.Screen
  name="calendar"
  options={{
    href: null, // Hidden - replaced by events.tsx
  }}
/>
```

3. Ensure tab order is: index (Wishlist), social (People), events (Events)

**en.json translations - add "events" section:**
```json
"events": {
  "title": "Events",
  "segments": {
    "upcoming": "Upcoming",
    "calendar": "Calendar"
  },
  "celebrationsCount": "{{count}} celebration",
  "celebrationsCount_plural": "{{count}} celebrations",
  "upcomingCount": "{{count}} upcoming",
  "upcomingCount_plural": "{{count}} upcoming"
}
```

**es.json translations - add "events" section:**
```json
"events": {
  "title": "Eventos",
  "segments": {
    "upcoming": "Proximos",
    "calendar": "Calendario"
  },
  "celebrationsCount": "{{count}} celebracion",
  "celebrationsCount_plural": "{{count}} celebraciones",
  "upcomingCount": "{{count}} proximo",
  "upcomingCount_plural": "{{count}} proximos"
}
```
  </action>
  <verify>
    - Tab layout shows Events tab: `grep -n "events" app/(app)/(tabs)/_layout.tsx`
    - Old tabs hidden: `grep -n "href: null" app/(app)/(tabs)/_layout.tsx | grep -E "celebrations|calendar"`
    - English translations exist: `grep -n '"events"' src/i18n/locales/en.json`
    - Spanish translations exist: `grep -n '"events"' src/i18n/locales/es.json`
  </verify>
  <done>
    - Tab bar shows 3 tabs: Wishlist, People, Events
    - Celebrations and Calendar tabs hidden with href: null
    - events.title, events.segments.upcoming, events.segments.calendar translations in both locales
  </done>
</task>

</tasks>

<verification>
1. App compiles without errors: `npx expo start --clear` (manual check)
2. Tab bar shows 3 tabs: Wishlist, People, Events
3. Events tab opens unified screen with SegmentedControl
4. Switching segments shows correct content (Upcoming vs Calendar)
5. Data loads for both segments (may need user to have celebrations/birthdays)
</verification>

<success_criteria>
- Unified Events screen replaces Celebrations + Calendar tabs
- SegmentedControl switches between Upcoming and Calendar views
- Tab bar reduced from 4 to 3 visible tabs
- All existing functionality preserved (CelebrationCards, BirthdayCalendar, CalendarSync)
- Translations work for both en and es locales
</success_criteria>

<output>
After completion, create `.planning/quick/010-merge-celebrations-and-calendar-into-uni/010-SUMMARY.md`
</output>
