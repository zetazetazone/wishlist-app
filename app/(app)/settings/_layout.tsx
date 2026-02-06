import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTintColor: '#8B1538',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitle: 'Back',
        presentation: 'modal',
      }}
    >
      <Stack.Screen
        name="profile"
        options={{
          title: 'Edit Profile',
        }}
      />
      <Stack.Screen
        name="personal-details"
        options={{
          title: 'Personal Details',
        }}
      />
    </Stack>
  );
}
