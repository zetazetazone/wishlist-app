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
        name="groups"
        options={{
          title: 'Groups',
          headerShown: false, // Groups has its own custom header
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          headerShown: false, // Friends has its own custom gradient header
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="celebrations"
        options={{
          title: 'Celebrations',
          headerShown: false, // Celebrations has its own custom header
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="party-popper" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          headerShown: false, // Calendar has its own custom header
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" size={size} color={color} />
          ),
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
