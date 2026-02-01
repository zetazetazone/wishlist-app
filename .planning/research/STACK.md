# Stack Research

**Research Date:** 2026-02-02
**Focus:** Adding notifications, chat, and calendar to Expo + Supabase app
**Overall Confidence:** HIGH

## Executive Summary

This research identifies the specific libraries needed to add push notifications, in-app notifications, real-time chat, and calendar integration to the existing Expo 54 + Supabase wishlist app. The existing stack (React 19.1, React Native 0.81.5, Expo 54 with New Architecture enabled) is modern and well-positioned for these features. Most requirements can be met using Expo SDK packages and Supabase's built-in realtime capabilities.

---

## Notifications

### Push Notifications

| Aspect | Details |
|--------|---------|
| **Library** | expo-notifications ~0.32.16 |
| **Confidence** | HIGH |

**Why expo-notifications:**
- Official Expo SDK package with first-class support
- Unified API for Android (FCM) and iOS (APNs)
- Free Expo Push Service handles token management and delivery
- Deep integration with expo-router for notification-triggered navigation
- Already bundled with Expo 54 SDK, no additional native dependencies

**Integration with Existing Stack:**
- Works seamlessly with Supabase: store Expo push tokens in user profiles
- Trigger notifications from Supabase Edge Functions or database triggers
- expo-router's built-in deep linking handles notification taps

**Requirements (SDK 54 specific):**
- Development build required (push notifications removed from Expo Go in SDK 53+)
- Physical device required for testing (emulators/simulators not supported)
- Android: google-services.json + FCM Service Account Key in EAS
- iOS: Apple Push Notification certificate configured in EAS

**Additional Required Packages:**
- expo-device ~7.1.1 - Detect if running on physical device
- expo-constants ~18.0.13 - Already installed, provides projectId

**Installation:**
```bash
npx expo install expo-notifications expo-device
```

**app.json Configuration:**
```json
{
  "expo": {
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "android": {
      "googleServicesFile": "./google-services.json",
      "useNextNotificationsApi": true
    }
  }
}
```

**Sources:**
- [Expo Notifications SDK Reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Push Notifications Setup Guide](https://docs.expo.dev/push-notifications/push-notifications-setup/)

---

### In-App Notification Inbox

| Aspect | Details |
|--------|---------|
| **Approach** | Custom implementation with Supabase table + FlashList |
| **Confidence** | HIGH |

**Why custom implementation (not a third-party service):**
- Supabase already provides database + realtime subscriptions
- Third-party services (Novu, MagicBell, Courier) add unnecessary complexity and cost
- Full control over notification types, UI, and business logic
- Consistent with existing Supabase-first architecture

**Architecture:**
```
notifications table (Supabase)
  - id: uuid
  - user_id: uuid (FK to auth.users)
  - type: text (birthday_reminder, gift_leader_assigned, chat_message, etc.)
  - title: text
  - body: text
  - data: jsonb (payload for navigation)
  - read: boolean
  - created_at: timestamp
```

**UI Components Needed:**
- @shopify/flash-list 2.0.2 - For performant notification list rendering
- Already have: Gluestack UI for styling, Moti for animations

**Realtime Updates:**
- Use Supabase postgres_changes subscription for new notifications
- When notification inserted, update inbox UI in real-time
- Mark as read via simple update query

**Installation:**
```bash
npx expo install @shopify/flash-list
```

**Why FlashList 2.0:**
- Required for New Architecture (app already has newArchEnabled: true)
- 5x faster than FlatList with cell recycling
- Perfect for notification lists with varying content heights
- No estimatedItemSize needed in v2

**Sources:**
- [FlashList v2 Documentation](https://shopify.github.io/flash-list/)
- [Expo FlashList SDK Reference](https://docs.expo.dev/versions/latest/sdk/flash-list/)

---

## Real-Time Chat

| Aspect | Details |
|--------|---------|
| **Library** | Supabase Realtime Broadcast (built into @supabase/supabase-js) |
| **UI Component** | @shopify/flash-list 2.0.2 |
| **Confidence** | HIGH |

**Why Supabase Broadcast (not postgres_changes):**
- Lower latency for client-to-client messaging
- Better scalability for high-traffic chat rooms
- More control over payload content
- Better handling of connection drops
- Less database overhead (no replication slots needed)
- Supabase officially recommends Broadcast for chat applications

**Architecture:**
```
Chat Flow:
1. Create channel: supabase.channel(`celebration-${celebrationId}`)
2. Subscribe to broadcast events for incoming messages
3. Send messages via channel.send() (WebSocket after subscription)
4. Store messages in Supabase table for history/persistence

chat_messages table (Supabase)
  - id: uuid
  - celebration_id: uuid (FK to celebrations)
  - sender_id: uuid (FK to auth.users)
  - content: text
  - created_at: timestamp
```

**Implementation Pattern:**
```typescript
// Join chat room
const channel = supabase.channel(`celebration-${celebrationId}`, {
  config: { broadcast: { self: true, ack: true } }
})

channel
  .on('broadcast', { event: 'message' }, ({ payload }) => {
    // Handle incoming message
  })
  .subscribe()

// Send message
channel.send({
  type: 'broadcast',
  event: 'message',
  payload: { content, senderId, timestamp }
})
```

**Chat UI Components:**
- FlashList with inverted prop for chat-style scrolling
- maintainVisibleContentPosition for real-time message insertion
- Already have: react-native-reanimated for smooth animations

**RLS Policy for Chat (celebrant exclusion):**
```sql
CREATE POLICY "celebration_members_except_celebrant" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM celebrations c
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE c.id = chat_messages.celebration_id
      AND gm.user_id = auth.uid()
      AND c.celebrant_id != auth.uid()
    )
  );
```

**Sources:**
- [Supabase Broadcast Documentation](https://supabase.com/docs/guides/realtime/broadcast)
- [Realtime Architecture](https://supabase.com/docs/guides/realtime/architecture)

---

## Calendar

### In-App Calendar View

| Aspect | Details |
|--------|---------|
| **Library** | react-native-calendars 1.1313.0 |
| **Confidence** | MEDIUM |

**Why react-native-calendars:**
- Most popular React Native calendar library (10.2k GitHub stars)
- Pure JavaScript - no native code required
- Compatible with Expo managed workflow
- Multiple view types: Calendar, CalendarList, Agenda
- Extensive customization for marking dates
- MIT licensed

**Confidence Note (MEDIUM):**
React-native-calendars doesn't explicitly declare React 19 peer dependency support. However, it's a pure JS library and community reports indicate it works. May require `--legacy-peer-deps` during installation.

**Features Needed:**
- Mark all group birthdays on calendar
- Show upcoming celebrations
- Navigate to celebration detail on date tap

**Installation:**
```bash
npm install react-native-calendars --legacy-peer-deps
```

**Implementation:**
```typescript
import { Calendar } from 'react-native-calendars';

// Mark birthdays with dots
const markedDates = {
  '2026-03-15': { marked: true, dotColor: 'blue' },
  '2026-04-22': { marked: true, dotColor: 'green' }
};

<Calendar
  markedDates={markedDates}
  onDayPress={(day) => navigateToCelebration(day.dateString)}
/>
```

**Sources:**
- [react-native-calendars GitHub](https://github.com/wix/react-native-calendars)
- [react-native-calendars Docs](https://wix.github.io/react-native-calendars/docs/Intro)

---

### Device Calendar Sync

| Aspect | Details |
|--------|---------|
| **Library** | expo-calendar ~15.0.8 |
| **Confidence** | HIGH |

**Why expo-calendar:**
- Official Expo SDK package
- Unified API for iOS and Android device calendars
- Can create events in Google Calendar (via Android calendar sync) and Apple Calendar
- System UI integration for event creation/editing
- Already compatible with Expo 54

**Capabilities:**
- Create a new calendar on device for "Wishlist Birthdays"
- Add birthday events to device calendar
- Update/delete events when members join/leave
- Launch system calendar UI for editing

**Permissions Required:**

| Platform | Permission | Purpose |
|----------|------------|---------|
| Android | READ_CALENDAR | Read existing calendars |
| Android | WRITE_CALENDAR | Create birthday events |
| iOS | NSCalendarsUsageDescription | Calendar access |
| iOS | NSRemindersUsageDescription | (optional, if using reminders) |

**Known iOS Limitation:**
When using `createEventInCalendarAsync`, iOS may override calendarId and use user's default calendar. Workaround: create events in a dedicated app calendar created via `createCalendarAsync`.

**Installation:**
```bash
npx expo install expo-calendar
```

**app.json Configuration:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-calendar",
        {
          "calendarPermission": "Allow Wishlist to add birthday reminders to your calendar"
        }
      ]
    ]
  }
}
```

**Implementation Pattern:**
```typescript
import * as Calendar from 'expo-calendar';

// Request permissions
const { status } = await Calendar.requestCalendarPermissionsAsync();

// Create app-specific calendar
const calendarId = await Calendar.createCalendarAsync({
  title: 'Wishlist Birthdays',
  color: '#6366F1',
  source: defaultSource,
  name: 'wishlist-birthdays',
  ownerAccount: 'wishlist',
  accessLevel: Calendar.CalendarAccessLevel.OWNER,
});

// Create birthday event
await Calendar.createEventAsync(calendarId, {
  title: `${memberName}'s Birthday`,
  startDate: birthdayDate,
  endDate: birthdayDate,
  allDay: true,
  alarms: [
    { relativeOffset: -7 * 24 * 60 }, // 1 week before
    { relativeOffset: -24 * 60 }      // 1 day before
  ]
});
```

**Sources:**
- [Expo Calendar SDK Reference](https://docs.expo.dev/versions/latest/sdk/calendar/)

---

## Additional Supporting Libraries

### Date Handling

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| date-fns | 3.x | Date manipulation, formatting, comparison | HIGH |

**Why date-fns (not Moment.js, not Day.js):**
- Tree-shakeable - only import functions you use
- Modern ES modules
- Immutable operations
- No global pollution
- Well-maintained with TypeScript support

**Installation:**
```bash
npm install date-fns
```

---

### Date Picker (for birthday selection)

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| @react-native-community/datetimepicker | 8.4.4 | Native date picker for birthday input | HIGH |

**Why this library:**
- Recommended by Expo for SDK 54
- Native system pickers (Material on Android, native wheel on iOS)
- New Architecture compatible
- Already bundled with Expo SDK

**Installation:**
```bash
npx expo install @react-native-community/datetimepicker
```

**Sources:**
- [Expo DateTimePicker Reference](https://docs.expo.dev/versions/latest/sdk/date-time-picker/)

---

## NOT Recommended

| Library/Approach | Why to Avoid |
|------------------|--------------|
| **Novu, MagicBell, Courier** (notification services) | Adds external dependency, cost, and complexity when Supabase already provides database + realtime. Overkill for a simple in-app inbox. |
| **Stream Chat, Sendbird** (chat SDKs) | Expensive, adds vendor lock-in. Supabase Realtime is free and already integrated. Chat requirements are simple (text only, per-celebration rooms). |
| **Moment.js** | Deprecated, not tree-shakeable, bundle size bloat. Use date-fns instead. |
| **react-native-push-notification** | Requires ejecting from Expo managed workflow. expo-notifications works without ejecting. |
| **Firebase Cloud Messaging (direct)** | expo-notifications abstracts FCM/APNs, providing a simpler unified API. Only use FCM directly if you need features expo-notifications doesn't support. |
| **Supabase postgres_changes for chat** | Higher latency, uses replication slots, scales poorly. Supabase recommends Broadcast for real-time messaging. |
| **react-big-calendar** | Web-only library, not for React Native. |
| **@legendapp/list** | Newer alternative to FlashList but less battle-tested. FlashList v2 is mature and recommended by Expo. |
| **FlatList** | FlashList v2 is 5x faster and required for New Architecture performance. Project already has newArchEnabled: true. |

---

## Summary

**Recommended Stack Addition:**

| Feature | Library | Version |
|---------|---------|---------|
| Push Notifications | expo-notifications | ~0.32.16 |
| Push Token Detection | expo-device | ~7.1.1 |
| In-App Notification List | @shopify/flash-list | 2.0.2 |
| Real-Time Chat | Supabase Realtime Broadcast | Built into @supabase/supabase-js |
| In-App Calendar View | react-native-calendars | 1.1313.0 |
| Device Calendar Sync | expo-calendar | ~15.0.8 |
| Birthday Date Picker | @react-native-community/datetimepicker | 8.4.4 |
| Date Utilities | date-fns | 3.x |

**Installation Command:**
```bash
# Expo SDK packages (managed versions)
npx expo install expo-notifications expo-device expo-calendar @react-native-community/datetimepicker @shopify/flash-list

# npm packages
npm install date-fns react-native-calendars --legacy-peer-deps
```

**Key Integration Points:**
1. **Supabase is central**: Push tokens stored in profiles, notifications in dedicated table, chat via Realtime Broadcast
2. **FlashList for lists**: Both notification inbox and chat messages benefit from FlashList v2 performance
3. **Development builds required**: Push notifications need EAS development builds, not Expo Go
4. **New Architecture ready**: All recommended libraries support React Native 0.81's New Architecture

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Push Notifications | HIGH | Official Expo SDK, verified with docs |
| In-App Inbox | HIGH | Custom implementation with proven stack |
| Real-Time Chat | HIGH | Supabase Broadcast is documented, recommended pattern |
| In-App Calendar | MEDIUM | react-native-calendars works but React 19 peer deps unverified |
| Device Calendar | HIGH | Official Expo SDK, verified with docs |
| Date Utilities | HIGH | Standard, well-maintained library |

---

*Research completed: 2026-02-02*
*Sources: Expo Documentation, Supabase Documentation, GitHub repositories, npm registry*
