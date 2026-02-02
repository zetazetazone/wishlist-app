# Phase 1: Foundation - Research

**Researched:** 2026-02-02
**Domain:** Push notifications infrastructure, user onboarding, profile management
**Confidence:** HIGH

## Summary

This research covers implementing push notification infrastructure and user onboarding for the Wishlist Group Gifting App built on Expo SDK 54 with Supabase backend. The phase requires establishing notification registration, implementing a blocking onboarding flow, and enabling profile viewing with optional photo uploads.

The standard approach leverages expo-notifications (already in Expo 54 SDK) for push token management, expo-router's Stack.Protected component for blocking onboarding flow, Supabase Storage for profile photos, and FlashList v2 for the notification inbox. Push notifications require development builds (not Expo Go) starting from SDK 53+, and FCM credentials must be configured via EAS for Android delivery.

**Primary recommendation:** Use Expo Push Service (not direct FCM/APNs) for simplified cross-platform delivery, implement onboarding via Stack.Protected guards in expo-router, store push tokens in a dedicated device_tokens table with staleness tracking, and use Supabase Edge Functions to trigger push delivery on database events.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-notifications | ~0.32.16 | Push token registration, notification handling, channels | Built into Expo SDK 54, unified iOS/Android API, free Expo Push Service |
| expo-image-picker | ~17.0.10 | Profile photo selection | Official Expo package, handles permissions, supports cropping |
| @shopify/flash-list | 2.0.2 | Notification inbox list | New Architecture compatible, 5x faster than FlatList, already in project |
| expo-router | ~6.0.23 | Protected routes for onboarding | Already in project, Stack.Protected for blocking navigation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-device | ~8.0.0 | Device detection for push token | Required to verify physical device before token request |
| expo-constants | ^18.0.13 | Access projectId for push token | Already in project, needed for getExpoPushTokenAsync |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Expo Push Service | Direct FCM/APNs | More control but significantly more complexity; Expo Push is free and handles device token mapping |
| FlashList | FlatList | FlatList is simpler but FlashList is already in project and much faster for notification inbox |
| Stack.Protected | Redirect-based auth | Redirects work but Protected routes auto-handle deep links and state changes |

**Installation:**
```bash
npx expo install expo-notifications expo-image-picker expo-device
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── _layout.tsx                    # Root layout with onboarding guard
├── (onboarding)/                  # Protected onboarding group
│   ├── _layout.tsx
│   └── index.tsx                  # Onboarding screen (birthday, name, photo)
├── (app)/                         # Protected authenticated group
│   ├── (tabs)/
│   │   └── notifications.tsx      # Notification inbox screen
│   └── profile/
│       └── [id].tsx               # View member profile
lib/
├── supabase.ts                    # Existing Supabase client
├── notifications.ts               # Push notification utilities
└── storage.ts                     # Supabase Storage helpers
hooks/
├── usePushNotifications.ts        # Push token registration hook
└── useOnboardingStatus.ts         # Check if user completed onboarding
supabase/
├── functions/
│   └── push/index.ts              # Edge Function for push delivery
└── migrations/
    └── YYYYMMDD_notifications.sql # Notifications + device_tokens tables
```

### Pattern 1: Blocking Onboarding with Stack.Protected

**What:** Use expo-router's Stack.Protected component to enforce onboarding completion before app access
**When to use:** When user must complete onboarding before accessing any app functionality

**Example:**
```typescript
// Source: https://docs.expo.dev/router/advanced/protected/
// app/_layout.tsx
import { Stack } from 'expo-router';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

export default function RootLayout() {
  const { isComplete, isLoading } = useOnboardingStatus();

  if (isLoading) return null; // Or splash screen

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isComplete}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={isComplete}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
```

### Pattern 2: Push Token Registration with Lifecycle Management

**What:** Register push tokens on app launch, refresh on every open, store in Supabase with metadata
**When to use:** On authenticated app launch, must happen before any push-dependent features

**Example:**
```typescript
// Source: https://docs.expo.dev/push-notifications/push-notifications-setup/
// hooks/usePushNotifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Android: Create channel BEFORE requesting token (Android 13+ requirement)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });

  return token.data;
}

export async function saveTokenToDatabase(userId: string, token: string) {
  const { error } = await supabase
    .from('device_tokens')
    .upsert({
      user_id: userId,
      expo_push_token: token,
      device_type: Platform.OS,
      last_active: new Date().toISOString(),
    }, {
      onConflict: 'user_id,expo_push_token'
    });

  if (error) console.error('Failed to save push token:', error);
}
```

### Pattern 3: Supabase Edge Function for Push Delivery

**What:** Server-side Edge Function that sends push via Expo Push Service when notifications are inserted
**When to use:** When database event (insert) should trigger push notification

**Example:**
```typescript
// Source: https://supabase.com/docs/guides/functions/examples/push-notifications
// supabase/functions/push/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

interface NotificationPayload {
  type: 'INSERT'
  table: string
  record: {
    id: string
    user_id: string
    title: string
    body: string
    data?: Record<string, unknown>
  }
}

serve(async (req) => {
  const payload: NotificationPayload = await req.json()

  // Fetch user's push tokens
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('expo_push_token')
    .eq('user_id', payload.record.user_id)

  if (!tokens?.length) {
    return new Response(JSON.stringify({ success: false, reason: 'no_tokens' }))
  }

  // Send via Expo Push Service
  const messages = tokens.map(t => ({
    to: t.expo_push_token,
    sound: 'default',
    title: payload.record.title,
    body: payload.record.body,
    data: payload.record.data,
  }))

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
    },
    body: JSON.stringify(messages),
  })

  return new Response(JSON.stringify(await response.json()))
})
```

### Pattern 4: Profile Photo Upload with ArrayBuffer

**What:** Convert image picker result to ArrayBuffer for Supabase Storage upload
**When to use:** When uploading profile photos from expo-image-picker

**Example:**
```typescript
// Source: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export async function uploadAvatar(userId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const image = result.assets[0];
  const arraybuffer = await fetch(image.uri).then(res => res.arrayBuffer());
  const fileExt = image.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, arraybuffer, {
      contentType: image.mimeType ?? 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;
  return data.path;
}

export function getAvatarUrl(path: string): string {
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
```

### Anti-Patterns to Avoid

- **Requesting push permissions at app start:** Request in context (during onboarding) with explanation. Generic "allow notifications" dialogs have high denial rates.
- **Skipping notification channel creation on Android:** Create channels BEFORE requesting push token on Android 13+. Token request will fail otherwise.
- **Storing tokens without lifecycle tracking:** Tokens go stale on reinstall/device change. Track `last_active` and clean up tokens that haven't been active in 30+ days.
- **Using FlatList for notification inbox:** FlashList is already in project and handles recycling properly for potentially large notification lists.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push delivery infrastructure | Custom FCM/APNs integration | Expo Push Service | Free, unified API, handles token translation, receipt tracking |
| Image picker | Custom camera/gallery access | expo-image-picker | Permission handling, cropping UI, cross-platform |
| Blocking navigation guards | Custom redirect logic | Stack.Protected | Handles deep links, history cleanup, state changes automatically |
| Performant list scrolling | Custom virtualization | @shopify/flash-list | Recycling, memory management, New Architecture support |
| Push token generation | Manual FCM/APNs token fetch | Notifications.getExpoPushTokenAsync | Handles projectId, device registration, platform differences |

**Key insight:** Push notifications look simple but have significant platform-specific complexity (Android channels, iOS authorization status, token lifecycle). Expo Push Service abstracts this entirely.

## Common Pitfalls

### Pitfall 1: Push Notifications Don't Work in Expo Go (SDK 53+)

**What goes wrong:** App works in development but push notifications never arrive
**Why it happens:** Expo removed push notification support from Expo Go starting SDK 53 to reduce app size
**How to avoid:** Use development builds for testing push notifications:
```bash
npx expo install expo-dev-client
eas build --profile development --platform ios
eas build --profile development --platform android
```
**Warning signs:** getExpoPushTokenAsync returns null or throws in Expo Go

### Pitfall 2: Android Token Request Fails Without Notification Channel

**What goes wrong:** getExpoPushTokenAsync fails on Android 13+ devices
**Why it happens:** Android requires at least one notification channel before granting token
**How to avoid:** Always call setNotificationChannelAsync BEFORE getExpoPushTokenAsync:
```typescript
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
  });
}
const token = await Notifications.getExpoPushTokenAsync({ projectId });
```
**Warning signs:** Promise rejection or null token on Android 13+

### Pitfall 3: Push Token Staleness Causes Silent Failures

**What goes wrong:** Notifications work initially but gradually stop arriving for some users
**Why it happens:** Tokens become invalid on app reinstall, device restore, or after 270 days of inactivity (FCM)
**How to avoid:**
1. Refresh token on every app open (upsert to database)
2. Track `last_active` timestamp
3. Handle DeviceNotRegistered receipts to remove invalid tokens
4. Periodic cleanup of tokens inactive >30 days
**Warning signs:** Push receipts show DeviceNotRegistered errors

### Pitfall 4: Onboarding Guard Doesn't Block Deep Links

**What goes wrong:** User receives deep link and bypasses onboarding
**Why it happens:** Custom redirect logic doesn't check all entry points
**How to avoid:** Use Stack.Protected instead of manual redirects. Protected routes evaluate guard on ALL navigation including deep links.
**Warning signs:** Users with incomplete profiles appearing in app

### Pitfall 5: Profile Photo Upload Fails on Large Images

**What goes wrong:** ArrayBuffer creation fails or times out on high-resolution photos
**Why it happens:** Device memory constraints when converting large images
**How to avoid:** Use quality: 0.8 or lower in ImagePicker options. Consider adding maxWidth/maxHeight constraints:
```typescript
const result = await ImagePicker.launchImageLibraryAsync({
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8, // Compress to 80%
});
```
**Warning signs:** Memory warnings, slow uploads, upload timeouts

### Pitfall 6: Missing FCM Credentials for Android Push

**What goes wrong:** Push notifications never arrive on Android
**Why it happens:** FCM V1 credentials not configured in EAS
**How to avoid:**
1. Download google-services.json from Firebase Console
2. Generate Service Account Key JSON from Firebase > Project Settings > Service Accounts
3. Upload Service Account Key to EAS via `eas credentials`
4. Add googleServicesFile to app.json
**Warning signs:** Expo Push Service returns 200 but notifications never arrive

## Code Examples

### Complete Onboarding Screen with All Fields

```typescript
// app/(onboarding)/index.tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { uploadAvatar, getAvatarUrl } from '@/lib/storage';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function OnboardingScreen() {
  const [displayName, setDisplayName] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleComplete() {
    if (!displayName.trim() || !birthday) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({
          full_name: displayName.trim(),
          birthday: birthday.toISOString().split('T')[0],
          avatar_url: avatarPath,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      router.replace('/(app)/(tabs)/wishlist');
    } catch (error) {
      console.error('Onboarding failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAvatarPress() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const path = await uploadAvatar(user.id);
    if (path) setAvatarPath(path);
  }

  return (
    <View className="flex-1 bg-white p-6">
      <Text className="text-2xl font-bold mb-8">Complete Your Profile</Text>

      <Pressable onPress={handleAvatarPress} className="self-center mb-8">
        {avatarPath ? (
          <Image
            source={{ uri: getAvatarUrl(avatarPath) }}
            className="w-24 h-24 rounded-full"
          />
        ) : (
          <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center">
            <Text className="text-gray-500">Add Photo</Text>
          </View>
        )}
      </Pressable>

      <Text className="text-sm font-medium mb-2">Display Name *</Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        className="border border-gray-300 rounded-lg p-3 mb-6"
      />

      <Text className="text-sm font-medium mb-2">Birthday *</Text>
      <DateTimePicker
        value={birthday ?? new Date()}
        mode="date"
        onChange={(_, date) => date && setBirthday(date)}
        maximumDate={new Date()}
      />

      <Pressable
        onPress={handleComplete}
        disabled={!displayName.trim() || !birthday || isLoading}
        className="bg-blue-500 rounded-lg p-4 mt-8 disabled:opacity-50"
      >
        <Text className="text-white text-center font-semibold">
          {isLoading ? 'Saving...' : 'Continue'}
        </Text>
      </Pressable>
    </View>
  );
}
```

### Notification Inbox with FlashList

```typescript
// app/(app)/(tabs)/notifications.tsx
import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_notifications' },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setIsLoading(false);
  }

  async function markAsRead(id: string) {
    await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  }

  return (
    <View className="flex-1 bg-white">
      <FlashList
        data={notifications}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => markAsRead(item.id)}
            className={`p-4 border-b border-gray-100 ${
              !item.is_read ? 'bg-blue-50' : ''
            }`}
          >
            <Text className="font-semibold">{item.title}</Text>
            <Text className="text-gray-600 mt-1">{item.body}</Text>
            <Text className="text-gray-400 text-xs mt-2">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </Text>
          </Pressable>
        )}
        estimatedItemSize={100}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center p-8">
            <Text className="text-gray-500">No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}
```

### Database Schema for Notifications and Device Tokens

```sql
-- supabase/migrations/YYYYMMDD_notifications.sql

-- Device tokens table for push notification delivery
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  expo_push_token TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('ios', 'android')) NOT NULL,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, expo_push_token)
);

-- User notifications table (inbox)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Device tokens: users can only manage their own
CREATE POLICY "Users can insert own device tokens"
  ON public.device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device tokens"
  ON public.device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own device tokens"
  ON public.device_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can read all tokens (for Edge Function)
CREATE POLICY "Service role can read all device tokens"
  ON public.device_tokens FOR SELECT
  TO service_role
  USING (true);

-- User notifications: users can only see their own
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON public.user_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add onboarding_completed to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_last_active ON public.device_tokens(last_active);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created ON public.user_notifications(created_at DESC);

-- Enable realtime for notifications inbox
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Push in Expo Go | Development builds only | SDK 53 (2024) | Must use eas build for push testing |
| expo-image-picker v14 | expo-image-picker v17 | SDK 54 (2025) | New "fast-path" for unmodified images |
| FlashList v1 (native) | FlashList v2 (JS-only) | Late 2024 | New Architecture only, no native deps |
| Manual redirect auth | Stack.Protected | expo-router v3+ | Declarative guards, auto deep link handling |
| FCM legacy API | FCM V1 API | 2024 | Service Account Key required instead of Server Key |

**Deprecated/outdated:**
- expo-notifications in Expo Go on Android: Removed in SDK 53+
- FCM Legacy Server Key: Replaced by FCM V1 with Service Account
- FlatList for long lists: FlashList is significantly faster with recycling

## Open Questions

1. **Notification channel grouping strategy**
   - What we know: Android allows multiple channels with different settings
   - What's unclear: How many channels needed for this app (urgent, social, reminders?)
   - Recommendation: Start with single "default" channel, add specialized channels in later phases if needed

2. **Badge count management**
   - What we know: iOS and Android handle badges differently; iOS setBadgeCountAsync(0) also clears notification center
   - What's unclear: Should badge count be server-managed or client-managed?
   - Recommendation: Server-managed count sent with each push; clear badge on app open

3. **Supabase Storage bucket configuration for avatars**
   - What we know: Need an "avatars" bucket with public access
   - What's unclear: Exact RLS policies needed for storage
   - Recommendation: Create public bucket, allow authenticated users to upload to their own folder (userId prefix)

## Sources

### Primary (HIGH confidence)
- [Expo Notifications SDK Reference](https://docs.expo.dev/versions/latest/sdk/notifications/) - API methods, Android channel requirements, permission handling
- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) - Development build requirements, FCM configuration
- [Expo Router Protected Routes](https://docs.expo.dev/router/advanced/protected/) - Stack.Protected syntax and guard behavior
- [Supabase Edge Functions Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications) - Edge Function pattern, Expo Push Service integration
- [Supabase Expo Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) - Avatar upload with ArrayBuffer pattern
- [FlashList v2 Documentation](https://shopify.github.io/flash-list/docs/) - Installation, New Architecture compatibility
- [Expo FCM Credentials](https://docs.expo.dev/push-notifications/fcm-credentials/) - Service Account Key setup for FCM V1

### Secondary (MEDIUM confidence)
- [Making Expo Notifications Work on Android 12+](https://medium.com/@gligor99/making-expo-notifications-actually-work-even-on-android-12-and-ios-206ff632a845) - Android-specific pitfalls and solutions
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) - Development build requirements, React 19 compatibility
- [Makerkit Notification System](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs) - Realtime subscription patterns

### Tertiary (LOW confidence, needs validation)
- Badge count behavior differences between iOS and Android - needs testing on physical devices
- Optimal notification channel grouping for wishlist app use cases

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified with official Expo/Supabase documentation
- Architecture: HIGH - Patterns from official docs (Stack.Protected, Edge Functions, ArrayBuffer upload)
- Pitfalls: HIGH - Documented in official troubleshooting guides and GitHub issues

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable ecosystem)
