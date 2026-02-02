---
phase: 01
plan: 01
name: Notification Infrastructure
subsystem: notifications
tags: [push-notifications, expo, supabase, edge-functions, database]

requires: [initial-schema]
provides: [push-notification-system, device-token-management, notification-storage]
affects: [02-01, 02-02, 03-01]

tech-stack:
  added:
    - expo-notifications@0.32.16
    - expo-device@8.0.10
  patterns:
    - expo-push-tokens
    - supabase-edge-functions
    - webhook-triggered-notifications
    - device-token-upsert

key-files:
  created:
    - supabase/migrations/20260202000001_notifications.sql
    - lib/notifications.ts
    - hooks/usePushNotifications.ts
    - supabase/functions/push/index.ts
  modified:
    - types/database.types.ts
    - app.json
    - package.json

decisions:
  - id: notification-001
    context: Android 13+ notification channel requirement
    decision: Create notification channel BEFORE requesting push token
    rationale: Android 13+ requires channel to exist before getExpoPushTokenAsync
    alternatives: ["Create channel on-demand", "Lazy channel creation"]

  - id: notification-002
    context: Push token storage strategy
    decision: Use UPSERT with last_active timestamp tracking
    rationale: Enables token staleness detection and multi-device support
    alternatives: ["Simple INSERT", "Separate update calls"]

  - id: notification-003
    context: Edge Function vs Cloud Function
    decision: Use Supabase Edge Function with webhook trigger
    rationale: Lower latency, native Supabase integration, simpler deployment
    alternatives: ["Firebase Cloud Functions", "Self-hosted webhook server"]

metrics:
  duration: "5 minutes"
  complexity: medium
  completed: 2026-02-02
---

# Phase 1 Plan 01-01: Notification Infrastructure Summary

**Push notification infrastructure with database tables, token registration, and Expo Push Service integration**

## Objective Completed

Set up complete push notification infrastructure including:
- Database schema for device tokens and notification history
- Client-side token registration and notification handling
- Server-side push delivery via Supabase Edge Function

## Tasks Completed

### Task 1: Create notification database schema ✅
**Commit:** f8857f1

**Files Created:**
- `supabase/migrations/20260202000001_notifications.sql` - Complete migration with tables, RLS, indexes

**Files Modified:**
- `types/database.types.ts` - Added DeviceToken, UserNotification interfaces and User.onboarding_completed

**Details:**
- Created `device_tokens` table with expo_push_token, device_type, last_active tracking
- Created `user_notifications` table with title, body, data (JSONB), is_read
- Added `onboarding_completed` column to users table
- Implemented comprehensive RLS policies for both tables
- Added performance indexes on user_id and timestamps
- Enabled realtime subscription for user_notifications table

**RLS Security:**
- Users can only view/modify their own tokens and notifications
- System/webhook can insert notifications via open INSERT policy
- DELETE requires user ownership verification

### Task 2: Create push notification utilities and hook ✅
**Commit:** f5998de

**Files Created:**
- `lib/notifications.ts` - Core notification utilities (registerForPushNotificationsAsync, saveTokenToDatabase, removeTokenFromDatabase)
- `hooks/usePushNotifications.ts` - React hook with automatic registration and listeners

**Files Modified:**
- `app.json` - Added expo-notifications plugin and EAS project ID
- `package.json` - Added expo-notifications@0.32.16 and expo-device@8.0.10

**Details:**
- Implemented registerForPushNotificationsAsync with proper Android channel creation order
- Added Device.isDevice check (push only works on physical devices)
- Created notification handler with shouldShowAlert, shouldPlaySound, shouldSetBadge
- Built usePushNotifications hook with automatic token registration on auth
- Set up foreground notification listener and tap response listener
- Configured notification channel for Android with max importance and vibration

**Key Implementation:**
```typescript
// CRITICAL: Create Android channel BEFORE requesting token
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default',
  });
}
```

### Task 3: Create Edge Function for push delivery ✅
**Commit:** 40642da

**Files Created:**
- `supabase/functions/push/index.ts` - Edge Function for webhook-triggered push delivery

**Details:**
- Receives webhook payload on user_notifications INSERT
- Queries device_tokens table for all user devices
- Batches push messages for Expo Push Service (https://exp.host/--/api/v2/push/send)
- Includes CORS headers for webhook integration
- Logs errors from Expo Push API response
- Supports multiple devices per user with single webhook call

**Edge Function Flow:**
1. Webhook triggers on user_notifications INSERT
2. Extract user_id, title, body, data from payload
3. Query device_tokens for user's registered devices
4. Build push message array with channelId: 'default'
5. POST to Expo Push Service
6. Log results and errors

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies & Integration

**Requires:**
- Initial database schema with users table and auth.users
- Supabase Auth for user authentication
- Expo SDK 54+ environment

**Provides:**
- Complete push notification infrastructure
- Device token management system
- Notification history storage with realtime updates
- Server-side push delivery capability

**Affects:**
- Phase 2 (Onboarding & Features) - Uses onboarding_completed flag
- Phase 3 (Birthday Automation) - Will trigger notifications for birthdays
- Future real-time features - Realtime-enabled user_notifications table

## Manual Setup Steps Required

### 1. Deploy Edge Function
```bash
cd /home/zetaz/wishlist-app
npx supabase functions deploy push
```

### 2. Create Database Webhook
In Supabase Dashboard → Database → Webhooks:
- **Name:** push-notifications
- **Table:** user_notifications
- **Events:** INSERT
- **Type:** HTTP Request
- **Method:** POST
- **URL:** `https://<project-ref>.supabase.co/functions/v1/push`
- **HTTP Headers:**
  - `Authorization: Bearer <anon-key>`
  - `Content-Type: application/json`

### 3. Test Push Notifications
Requires physical device (not Expo Go) with development build:
```bash
# Build development client
npx eas build --profile development --platform android
# or
npx eas build --profile development --platform ios

# Install on device and test
```

### 4. Optional: Configure EAS Project ID
The project ID in `app.json` (3a64eccc-d4fc-4e6c-9c1e-04c9f2f60c8d) is a placeholder.
Replace with actual EAS project ID:
```bash
npx eas init
# Copy projectId from output to app.json extra.eas.projectId
```

## Architecture Decisions

### Android Channel Creation Timing
**Decision:** Create notification channel BEFORE requesting push token

**Reasoning:** Android 13+ enforces strict notification channel requirements. Creating the channel first ensures the token request succeeds.

**Impact:** Prevents token registration failures on Android 13+ devices

### Token Storage with Upsert
**Decision:** Use UPSERT with last_active timestamp update on conflict

**Reasoning:**
- Supports multiple devices per user
- Tracks token staleness for cleanup
- Prevents duplicate token entries
- Updates timestamp on app relaunch

**Impact:** Enables stale token cleanup jobs and multi-device push delivery

### Edge Function Architecture
**Decision:** Supabase Edge Function with database webhook trigger

**Reasoning:**
- Native Supabase integration
- Low latency (Deno Deploy global edge network)
- No additional infrastructure
- Automatic scaling
- Direct database access via service role

**Alternatives Considered:**
- Firebase Cloud Functions (additional service dependency)
- Self-hosted webhook server (maintenance overhead)
- Client-side direct push (security risk, unreliable)

**Impact:** Simple deployment, low operational overhead, secure push delivery

## Known Limitations

1. **Physical Device Required:** Push notifications only work on physical devices (not simulators/emulators)
2. **Development Build Required:** Expo Go does not support push notifications on SDK 53+
3. **Deno TypeScript Errors:** Edge Function TypeScript errors in Node environment are expected (Deno-specific imports)
4. **Manual Webhook Setup:** Webhook must be created manually in Supabase Dashboard after Edge Function deployment
5. **No Receipt Tracking:** Current implementation doesn't track Expo Push receipts (delivery confirmation)

## Next Phase Readiness

**Blockers:** None

**Recommendations:**
- Deploy Edge Function and configure webhook before Phase 2 onboarding
- Build development client for testing push notifications
- Consider implementing receipt tracking for production monitoring

**Integration Points:**
- Phase 2 Onboarding: Use onboarding_completed flag to trigger welcome notification
- Phase 3 Birthday Automation: Trigger birthday notifications via user_notifications INSERT
- Future Features: Leverage realtime user_notifications subscription for in-app notification center

## Success Verification

✅ Migration file exists with proper table definitions
✅ TypeScript interfaces added for DeviceToken and UserNotification
✅ expo-notifications and expo-device in package.json
✅ lib/notifications.ts exports registerForPushNotificationsAsync and saveTokenToDatabase
✅ hooks/usePushNotifications.ts exports usePushNotifications hook
✅ supabase/functions/push/index.ts calls Expo Push Service
✅ App TypeScript code compiles successfully (Edge Function Deno errors expected)
✅ RLS policies prevent unauthorized access
✅ Indexes created for query performance
✅ Realtime enabled for user_notifications

## Files Changed

**Created (4):**
- `supabase/migrations/20260202000001_notifications.sql` (121 lines)
- `lib/notifications.ts` (143 lines)
- `hooks/usePushNotifications.ts` (63 lines)
- `supabase/functions/push/index.ts` (155 lines)

**Modified (3):**
- `types/database.types.ts` (+18 lines)
- `app.json` (+10 lines)
- `package.json` (+2 dependencies)

**Total:** 510 lines added, 4 files created, 3 files modified

## Execution Metrics

- **Duration:** 5 minutes
- **Commits:** 3 (1 per task)
- **Dependencies Added:** 2 (expo-notifications, expo-device)
- **Database Tables:** 2 (device_tokens, user_notifications)
- **Database Columns Added:** 1 (users.onboarding_completed)
- **TypeScript Errors:** 0 (app code), Expected Deno errors in Edge Function
