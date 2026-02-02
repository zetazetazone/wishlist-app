import { Stack } from 'expo-router';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function AppLayout() {
  // Initialize push notifications and timezone detection
  // Runs on mount for authenticated users - saves timezone to users.timezone
  usePushNotifications();

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
    </Stack>
  );
}
