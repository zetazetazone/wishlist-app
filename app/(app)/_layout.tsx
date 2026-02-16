import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { extractUrlFromText } from '../../lib/shareIntent';

export default function AppLayout() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  // Initialize push notifications and timezone detection
  // Runs on mount for authenticated users - saves timezone to users.timezone
  usePushNotifications();

  // Handle incoming share intents (SHARE-04 cold start, SHARE-05 warm start)
  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      // Extract URL: prefer webUrl, fall back to extracting from text (SHARE-07)
      const url = shareIntent.webUrl || extractUrlFromText(shareIntent.text);

      if (url) {
        // Navigate to share handler with URL as param
        router.push({
          pathname: '/(app)/shared-url',
          params: { url }
        });
      }

      // Reset after handling to prevent re-triggering on navigation
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="celebration/[id]"
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#8B1538',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="member/[id]"
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#8B1538',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="requests"
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#8B1538',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="add-from-url"
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#8B1538',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitle: 'Back',
          title: 'Add from URL',
        }}
      />
      <Stack.Screen
        name="shared-url"
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#8B1538',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerBackTitle: 'Back',
          title: 'Add Shared Item',
        }}
      />
    </Stack>
  );
}
