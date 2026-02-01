import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '../gluestack-ui.config';
import './global.css';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    // Check initial session only once
    if (!initialCheckDone) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const inAuthGroup = segments[0] === 'auth';

        if (!session && !inAuthGroup) {
          // No session and not on auth pages, go to login
          router.replace('/auth/login');
        } else if (session && !inAuthGroup) {
          // Has session but not on app pages, go to wishlist
          router.replace('/(app)/(tabs)/wishlist');
        }
        // Otherwise stay on current page (signup, login, or app)

        setInitialCheckDone(true);
      });
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!initialCheckDone) return; // Wait for initial check

      const inAuthGroup = segments[0] === 'auth';

      if (!session && !inAuthGroup) {
        // User logged out and not in auth, redirect to login
        router.replace('/auth/login');
      } else if (session && inAuthGroup) {
        // User logged in but still on auth pages, redirect to wishlist
        router.replace('/(app)/(tabs)/wishlist');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [segments, initialCheckDone]);

  return (
    <GluestackUIProvider config={config}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Slot />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </GluestackUIProvider>
  );
}
