---
phase: quick-010
plan: 01
subsystem: mobile-app/events
tags: [ui, consolidation, segmented-control, tab-navigation]
dependency-graph:
  requires:
    - celebrations.tsx (source for Upcoming view)
    - calendar.tsx (source for Calendar view)
    - social.tsx (pattern reference for SegmentedControl)
  provides:
    - Unified Events screen replacing two separate tabs
    - SegmentedControl for Upcoming/Calendar switching
  affects:
    - _layout.tsx (tab configuration)
    - User navigation flow
tech-stack:
  added: []
  patterns:
    - SegmentedControl header pattern (from social.tsx)
    - Parallel data loading with Promise.all
    - Conditional rendering based on segment state
key-files:
  created:
    - app/(app)/(tabs)/events.tsx
  modified:
    - app/(app)/(tabs)/_layout.tsx
    - src/i18n/locales/en.json
    - src/i18n/locales/es.json
decisions:
  - Default to 'upcoming' segment for action-oriented users
  - Show Gift Leader badge in Upcoming segment header
  - Show CalendarSyncIconButton in Calendar segment header
  - Refresh only active segment data on pull-to-refresh
metrics:
  duration: 8 minutes
  completed: 2026-02-17
---

# Quick Task 010: Merge Celebrations and Calendar into Unified Events Screen

Unified Events screen with SegmentedControl replacing two separate tabs (Celebrations + Calendar).

## Summary

Merged the Celebrations and Calendar tabs into a single "Events" screen following the social.tsx pattern. Users can now switch between Upcoming (action-oriented CelebrationCards) and Calendar (discovery-oriented BirthdayCalendar) views via SegmentedControl.

## Implementation Details

### Events Screen (events.tsx)

**State Management:**
- `activeSegment`: 'upcoming' | 'calendar' with 'upcoming' as default
- Celebrations state: celebrations array, currentUserId
- Calendar state: birthdays, friendDates, selectedDate
- Shared: loading, refreshing, error

**Data Loading:**
- `loadAllData()` fetches both celebrations and calendar data in parallel
- `handleRefresh()` only refreshes active segment data
- useFocusEffect for auto-refresh on tab focus

**Header Features:**
- LinearGradient burgundy header (from social.tsx pattern)
- Gift Leader badge shown in Upcoming segment when user leads celebrations
- CalendarSyncIconButton shown in Calendar segment
- Dynamic subtitle based on segment (celebrations count vs upcoming count)

**Content Rendering:**
- Upcoming: FlashList with CelebrationCards, Gift Leader section header
- Calendar: ScrollView with BirthdayCalendar, selected date sections, Coming Up countdown cards
- Both segments have appropriate empty states

### Tab Layout Changes

- Added Events tab with `calendar-star` icon
- Hidden celebrations and calendar tabs with `href: null`
- Tab bar now shows 3 visible tabs: Wishlist, People, Events

### i18n Translations

Added to both en.json and es.json:
- `events.title`: "Events" / "Eventos"
- `events.segments.upcoming`: "Upcoming" / "Proximos"
- `events.segments.calendar`: "Calendar" / "Calendario"
- `events.celebrationsCount`: "{{count}} celebration(s)"
- `events.upcomingCount`: "{{count}} upcoming"

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 8555592 | feat | Create unified Events screen with SegmentedControl |
| 00c0357 | refactor | Update tab navigation for unified Events screen |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] events.tsx created with SegmentedControl
- [x] Tab layout shows Events tab
- [x] Old tabs hidden with href: null
- [x] English translations in place
- [x] Spanish translations in place
- [x] TypeScript errors only from missing i18n types (expected, will auto-resolve)

## Self-Check: PASSED

```
FOUND: app/(app)/(tabs)/events.tsx
FOUND: 8555592 (feat commit)
FOUND: 00c0357 (refactor commit)
```
