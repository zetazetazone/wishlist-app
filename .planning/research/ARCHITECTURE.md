# Architecture Research

**Research Date:** 2026-02-02
**Focus:** Integrating notifications, chat, calendar into existing Expo + Supabase app
**Overall Confidence:** HIGH (verified with official documentation)

## Database Schema Additions

### Notifications

Two-table design for scalability - message content stored once, user inbox tracks read status.

```sql
-- Push notification device tokens
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  expo_push_token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android')) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, expo_push_token)
);

-- Notification message content (stored once)
CREATE TABLE notification_messages (
  id BIGSERIAL PRIMARY KEY,
  notification_type TEXT CHECK (notification_type IN (
    'birthday_reminder_4w', 'birthday_reminder_2w', 'birthday_reminder_1w',
    'gift_leader_assigned', 'new_chat_message', 'member_joined',
    'celebration_created'
  )) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb, -- e.g., { group_id, celebration_id, chat_room_id }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification inbox (per-user delivery status)
CREATE TABLE user_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message_id BIGINT REFERENCES notification_messages(id) ON DELETE CASCADE NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_notifications_user_unread
  ON user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_device_tokens_user
  ON device_tokens(user_id) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own device tokens"
  ON device_tokens FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE USING (user_id = auth.uid());
```

### Chat

Chat rooms tied to celebrations (birthdays), messages with realtime enabled.

```sql
-- Celebrations (birthday events that spawn chat rooms)
CREATE TABLE celebrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  celebrant_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  event_date DATE NOT NULL,
  year INTEGER NOT NULL, -- celebration year (birthday can repeat annually)
  gift_leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, celebrant_id, year)
);

-- Chat rooms (one per celebration)
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages with realtime
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Indexes
CREATE INDEX idx_chat_messages_room_time
  ON chat_messages(chat_room_id, created_at DESC);
CREATE INDEX idx_celebrations_group_date
  ON celebrations(group_id, event_date);
CREATE INDEX idx_celebrations_gift_leader
  ON celebrations(gift_leader_id) WHERE gift_leader_id IS NOT NULL;

-- Enable RLS
ALTER TABLE celebrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat RLS: Group members can access chat, except celebrant
CREATE POLICY "Group members except celebrant can view chat room"
  ON chat_rooms FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM celebrations c
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE c.id = chat_rooms.celebration_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()
    )
  );

CREATE POLICY "Group members except celebrant can view messages"
  ON chat_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      JOIN celebrations c ON c.id = cr.celebration_id
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE cr.id = chat_messages.chat_room_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()
    )
  );

CREATE POLICY "Group members except celebrant can send messages"
  ON chat_messages FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_rooms cr
      JOIN celebrations c ON c.id = cr.celebration_id
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE cr.id = chat_messages.chat_room_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()
    )
  );
```

### Calendar/Events

Leverage existing `events` table type, add fields for calendar sync tracking.

```sql
-- Add calendar sync tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  calendar_sync_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  device_calendar_id TEXT; -- Store the created calendar ID on device

-- Birthday events (already have events table, extend if needed)
-- Note: Existing Event type already has group_id, user_id, event_type, event_date, title
-- Add sync tracking:
ALTER TABLE events ADD COLUMN IF NOT EXISTS
  device_event_id TEXT; -- Track corresponding device calendar event ID

-- Index for birthday lookups
CREATE INDEX idx_events_birthday_date
  ON events(event_date, event_type) WHERE event_type = 'birthday';
```

### Gift Leader

Assignment tracking on celebrations table (already defined above). Add assignment history for audit.

```sql
-- Gift Leader assignment history
CREATE TABLE gift_leader_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL = system auto-assigned
  reason TEXT CHECK (reason IN ('auto_rotation', 'manual_reassign', 'decline')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gift_leader_history_celebration
  ON gift_leader_history(celebration_id, created_at DESC);

-- Enable RLS
ALTER TABLE gift_leader_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view gift leader history"
  ON gift_leader_history FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM celebrations c
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE c.id = gift_leader_history.celebration_id
        AND gm.user_id = auth.uid()
    )
  );
```

## Service Layer Additions

### Notification Service

**Purpose:** Handle push notifications registration, sending, and in-app inbox management.

**Location:** `utils/notifications.ts`

**Functions:**
- `registerForPushNotifications()` - Request permissions, get Expo push token, store in Supabase
- `saveDeviceToken(token: string, platform: string)` - Persist token to device_tokens table
- `removeDeviceToken()` - Deactivate token on logout
- `fetchNotifications(limit?: number)` - Get user's in-app notifications
- `markNotificationRead(notificationId: string)` - Update read status
- `markAllNotificationsRead()` - Bulk update for "mark all read"
- `getUnreadCount()` - For badge count on bell icon

**Integration:**
- Follows existing pattern in `utils/auth.ts` - async functions returning `{ data, error }` tuple
- Called from screens and a `NotificationsProvider` context at root layout
- Push token registration in `app/_layout.tsx` after auth confirmed

**Supabase Edge Function:** `supabase/functions/send-push/index.ts`
- Triggered by database webhook on `notification_messages` insert
- Fetches recipient device tokens, sends via Expo Push API
- Handles token invalidation (removes stale tokens)

### Chat Service

**Purpose:** Real-time chat message handling with Supabase Realtime subscriptions.

**Location:** `utils/chat.ts`

**Functions:**
- `getChatRoom(celebrationId: string)` - Get or verify chat room for a celebration
- `fetchMessages(chatRoomId: string, limit?: number, before?: string)` - Paginated message fetch
- `sendMessage(chatRoomId: string, content: string)` - Insert message
- `subscribeToMessages(chatRoomId: string, onMessage: callback)` - Realtime subscription
- `unsubscribeFromMessages(channelId: string)` - Cleanup subscription
- `canAccessChat(celebrationId: string)` - Check if current user is not celebrant

**Realtime Pattern:**
```typescript
const channel = supabase
  .channel(`chat:${chatRoomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `chat_room_id=eq.${chatRoomId}`
  }, (payload) => onMessage(payload.new))
  .subscribe();
```

**Integration:**
- Single Supabase client instance from `lib/supabase.ts` (critical for connection management)
- Realtime subscription managed in chat screen component with cleanup on unmount
- Messages stored in component state, new messages prepended via subscription

### Calendar Service

**Purpose:** Manage in-app calendar view data and device calendar sync.

**Location:** `utils/calendar.ts`

**Functions:**
- `fetchGroupBirthdays(groupId?: string)` - Get all birthdays for user's groups
- `getBirthdaysForMonth(year: number, month: number)` - Calendar view data
- `syncToDeviceCalendar(birthdays: Event[])` - Bulk sync birthdays to device
- `createDeviceCalendar()` - Create "Wishlist Birthdays" calendar on device
- `removeDeviceCalendarEvent(eventId: string)` - Remove synced event
- `requestCalendarPermissions()` - Wrapper around expo-calendar permissions

**expo-calendar Integration:**
```typescript
import * as Calendar from 'expo-calendar';

// Create app-specific calendar
const calendarId = await Calendar.createCalendarAsync({
  title: 'Wishlist Birthdays',
  color: '#6366F1', // Match app theme
  source: defaultSource,
  name: 'wishlist-birthdays',
  ownerAccount: 'Wishlist App',
  accessLevel: Calendar.CalendarAccessLevel.OWNER,
});

// Create event
await Calendar.createEventAsync(calendarId, {
  title: `${userName}'s Birthday`,
  startDate: birthdayDate,
  endDate: birthdayDate,
  allDay: true,
  notes: `Group: ${groupName}`,
  alarms: [
    { relativeOffset: -28 * 24 * 60 }, // 4 weeks before
    { relativeOffset: -7 * 24 * 60 },  // 1 week before
  ],
});
```

### Gift Leader Service

**Purpose:** Auto-assign gift leaders based on birthday rotation, handle reassignments.

**Location:** `utils/giftLeader.ts`

**Functions:**
- `assignGiftLeader(celebrationId: string)` - Auto-assign based on birthday order
- `reassignGiftLeader(celebrationId: string, newLeaderId: string)` - Manual reassign by admin
- `getNextGiftLeader(groupId: string, celebrantId: string)` - Calculate next person in rotation
- `getGiftLeaderResponsibilities(userId: string)` - Fetch celebrations where user is leader
- `isCurrentUserGiftLeader(celebrationId: string)` - Quick check for UI

**Birthday Rotation Logic:**
```typescript
// Get all group members sorted by birthday (month, day)
// Find celebrant's position
// Gift Leader = next person in list (wraps around)
async function getNextGiftLeader(groupId: string, celebrantId: string) {
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, users(birthday)')
    .eq('group_id', groupId)
    .order('users(birthday)'); // Sort by month-day

  const celebrantIndex = members.findIndex(m => m.user_id === celebrantId);
  const nextIndex = (celebrantIndex + 1) % members.length;

  // Skip if next person is also the celebrant (edge case: 2-person group)
  return members[nextIndex].user_id;
}
```

**Supabase Edge Function/Cron:** `supabase/functions/assign-gift-leaders/index.ts`
- Runs daily via pg_cron
- Creates celebrations for upcoming birthdays (30 days ahead)
- Auto-assigns gift leaders
- Sends notification to assigned leader

## Component Architecture

### New Screens

| Screen | Location | Purpose |
|--------|----------|---------|
| `app/(app)/onboarding.tsx` | Onboarding flow | Collect birthday, display name before first use |
| `app/(app)/(tabs)/calendar.tsx` | Calendar tab | In-app calendar view of all birthdays |
| `app/(app)/profile/[id].tsx` | Profile view | View any user's profile in group |
| `app/(app)/profile/edit.tsx` | Profile edit | Edit own name, birthday, photo |
| `app/(app)/celebration/[id].tsx` | Celebration detail | Chat room + gift coordination for a birthday |
| `app/(app)/notifications.tsx` | Notification inbox | List of all in-app notifications |

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `NotificationBell.tsx` | `components/notifications/` | Header bell icon with unread badge |
| `NotificationItem.tsx` | `components/notifications/` | Single notification in inbox list |
| `NotificationProvider.tsx` | `components/notifications/` | Context for notification state + push setup |
| `ChatBubble.tsx` | `components/chat/` | Single message bubble (sent vs received styling) |
| `ChatInput.tsx` | `components/chat/` | Message input with send button |
| `ChatList.tsx` | `components/chat/` | Scrollable message list with infinite scroll |
| `CalendarMonth.tsx` | `components/calendar/` | Month view with birthday dots |
| `BirthdayCard.tsx` | `components/calendar/` | Birthday event card in list view |
| `GiftLeaderBadge.tsx` | `components/celebrations/` | Badge showing user is Gift Leader |
| `CelebrationCard.tsx` | `components/celebrations/` | Card for upcoming celebrations list |
| `ProfileAvatar.tsx` | `components/profile/` | Avatar with edit capability |
| `OnboardingStep.tsx` | `components/onboarding/` | Reusable onboarding step layout |

## Data Flow

### Notification Flow

1. **Trigger Event:** Birthday 4w away, Gift Leader assigned, new chat message
2. **Cron/Webhook:** Supabase Edge Function triggered
3. **Create Message:** Insert into `notification_messages` with type and payload
4. **Create Deliveries:** Insert into `user_notifications` for each recipient
5. **Database Webhook:** Fires on `user_notifications` insert
6. **Edge Function:** `send-push` fetches device tokens for user
7. **Expo Push:** POST to `https://exp.host/--/api/v2/push/send`
8. **Device Receipt:** User sees push notification
9. **App Open:** `NotificationProvider` fetches unread count, updates badge
10. **Inbox View:** User taps bell, sees notification list from `user_notifications`
11. **Mark Read:** Tap notification, call `markNotificationRead()`, update UI

### Chat Message Flow

1. **User Opens Celebration:** Navigate to `/celebration/[id]`
2. **Verify Access:** `canAccessChat()` confirms user is not celebrant
3. **Get Chat Room:** `getChatRoom(celebrationId)` returns room ID
4. **Subscribe:** `subscribeToMessages(roomId, handleNewMessage)`
5. **Load History:** `fetchMessages(roomId, 50)` populates initial state
6. **User Types:** Input in `ChatInput` component
7. **Send Message:** `sendMessage(roomId, content)` inserts to DB
8. **Realtime Broadcast:** Supabase broadcasts INSERT to all subscribers
9. **Receive Message:** All connected clients receive via subscription callback
10. **Update UI:** New message appended to state, scrolls to bottom
11. **Cleanup:** On unmount, `unsubscribeFromMessages(channelId)`

### Gift Leader Assignment Flow

1. **Daily Cron Job:** Runs at midnight UTC
2. **Find Upcoming Birthdays:** Query events 30 days ahead
3. **Check Existing Celebrations:** Skip if celebration already exists for that year
4. **Create Celebration:** Insert with status 'upcoming'
5. **Calculate Gift Leader:** `getNextGiftLeader(groupId, celebrantId)`
6. **Assign Leader:** Update `gift_leader_id` on celebration
7. **Log History:** Insert into `gift_leader_history` with reason 'auto_rotation'
8. **Create Chat Room:** Insert into `chat_rooms` linked to celebration
9. **Notify Leader:** Create notification for assigned Gift Leader
10. **UI Update:** Gift Leader sees badge/indicator on celebrations tab

### Manual Gift Leader Reassignment Flow

1. **Admin Action:** Group admin opens celebration settings
2. **Select New Leader:** Pick from group members (not celebrant)
3. **API Call:** `reassignGiftLeader(celebrationId, newLeaderId)`
4. **Update Celebration:** Set new `gift_leader_id`
5. **Log History:** Insert with reason 'manual_reassign' and `assigned_by`
6. **Notify New Leader:** Send notification to newly assigned leader
7. **Notify Old Leader:** Optional - inform they've been relieved

## Build Order (Dependencies)

1. **Database Schema** - All other features depend on tables existing
   - Migration file with all tables, indexes, RLS policies
   - Must be deployed before any service code

2. **Notification Infrastructure** - Foundation for all alerts
   - `device_tokens` table, `notification_messages`, `user_notifications`
   - `NotificationProvider` and push token registration
   - Edge function for sending pushes
   - **Why first:** Gift Leader, chat, calendar all need to send notifications

3. **Profile & Onboarding** - Birthday data required for everything
   - Onboarding screen to collect birthday
   - Profile view/edit screens
   - **Why second:** Birthday is required for celebrations, calendar, Gift Leader

4. **Celebrations & Gift Leader** - Core coordination feature
   - `celebrations` table, `gift_leader_history`
   - Gift Leader service and auto-assignment cron
   - Celebration list/detail screens
   - **Why third:** Chat rooms depend on celebrations existing

5. **Chat System** - Tied to celebrations
   - `chat_rooms`, `chat_messages` tables with realtime
   - Chat service with subscriptions
   - Chat UI components
   - **Why fourth:** Requires celebrations to exist first

6. **Calendar Feature** - Independent but enhances UX
   - Calendar tab screen
   - Device calendar sync with expo-calendar
   - **Why fifth:** Can be built in parallel with chat, no hard dependency

7. **Notification Inbox UI** - Polish/completion
   - Notification list screen
   - Bell icon with badge
   - **Why sixth:** Push notifications work without inbox, this is enhancement

## Integration Points

### Existing Files Requiring Changes

| File | Changes Needed |
|------|----------------|
| `app/_layout.tsx` | Add `NotificationProvider`, push token registration after auth, notification listeners |
| `app/(app)/_layout.tsx` | Add notification bell to header, check for onboarding completion |
| `app/(app)/(tabs)/_layout.tsx` | Add calendar tab, potentially celebrations tab |
| `app/(app)/(tabs)/groups.tsx` | Add link to celebration for upcoming birthdays, Gift Leader indicators |
| `app/group/[id].tsx` | Show upcoming celebrations, member birthdays, Gift Leader assignments |
| `utils/auth.ts` | Clear device token on logout |
| `types/database.types.ts` | Add new table types: Celebration, ChatRoom, ChatMessage, Notification, DeviceToken |
| `lib/supabase.ts` | No changes needed (singleton pattern already correct) |
| `constants/theme.ts` | Add calendar colors, notification badge color, chat bubble colors |

### New Dependencies

```bash
# Push Notifications
npx expo install expo-notifications expo-device expo-constants

# Calendar
npx expo install expo-calendar

# Date handling (for calendar views)
npm install date-fns
```

### Supabase Dashboard Configuration

1. **Enable Realtime:** For `chat_messages` table
2. **Create Edge Functions:** `send-push`, `assign-gift-leaders`, `birthday-reminders`
3. **Configure Database Webhooks:** Trigger push function on notification insert
4. **Enable pg_cron:** For daily Gift Leader assignment and reminder scheduling
5. **Set Secrets:** `EXPO_ACCESS_TOKEN` for push notifications

## Summary

The architecture integrates four major features into the existing Expo + Supabase app:

1. **Notifications** use a scalable two-table design (message content + user inbox) with Expo Push Notifications via Supabase Edge Functions. Device tokens stored in Supabase enable push delivery.

2. **Chat** leverages Supabase Realtime with `postgres_changes` subscriptions. Chat rooms are tied to celebrations (one per birthday), with RLS policies ensuring the celebrant cannot see their own birthday chat.

3. **Calendar** combines an in-app view (React Native calendar component) with device sync via expo-calendar. Birthday events auto-sync with configurable reminder alarms.

4. **Gift Leader** uses birthday-order rotation with auto-assignment via pg_cron. History tracking enables audit trail, and manual reassignment gives admins flexibility.

**Key architectural decision:** Celebrations are the central entity connecting birthdays, chat rooms, and Gift Leaders. This provides clean data modeling and enables per-celebration features without complex cross-table queries.

---

## Sources

- [Supabase Push Notifications Guide](https://supabase.com/docs/guides/functions/examples/push-notifications)
- [Expo Push Notifications Documentation](https://docs.expo.dev/guides/using-push-notifications-services/)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [expo-calendar Documentation](https://docs.expo.dev/versions/latest/sdk/calendar/)
- [Supabase Cron Documentation](https://supabase.com/docs/guides/cron)
- [Scalable Notifications Database Design](https://medium.com/@aboud-khalaf/building-scalable-notifications-a-journey-to-the-perfect-database-design-part-1-a7818edad0ba)
- [Supabase GitHub Example: Expo Push Notifications](https://github.com/supabase/supabase/tree/master/examples/user-management/expo-push-notifications)

*Research completed: 2026-02-02*
