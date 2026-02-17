import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#8B1538', // Burgundy
        tabBarInactiveTintColor: '#6b7280',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Wishlist',
          headerShown: false, // Wishlist has its own custom header
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="gift" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'People',
          headerShown: false, // Social has its own custom header with segmented control
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          headerShown: false, // Events has its own custom header with segmented control
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-star" size={size} color={color} />
          ),
        }}
      />
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
      {/* DEPRECATED: Use social.tsx - unified People screen */}
      <Tabs.Screen
        name="friends"
        options={{
          href: null, // Hidden - replaced by social.tsx People tab
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          href: null, // Hidden - replaced by social.tsx People tab
        }}
      />
      {/* Notifications is accessed via header icon, not as a tab */}
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Hide from tab bar - accessed via notification icon in header
        }}
      />
      {/* Hide backup/alternate versions */}
      <Tabs.Screen
        name="wishlist-simple"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wishlist-luxury"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wishlist-old-backup"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
