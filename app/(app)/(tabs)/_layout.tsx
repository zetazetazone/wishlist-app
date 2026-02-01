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
          title: 'Home',
          headerShown: false, // Home has its own custom header
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
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
