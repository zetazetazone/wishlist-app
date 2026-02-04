import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
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
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        const inAuthGroup = segments[0] === 'auth';
        const inOnboardingGroup = segments[0] === '(onboarding)';

        if (!session && !inAuthGroup) {
          // No session and not on auth pages, go to login
          router.replace('/auth/login');
        } else if (session) {
          // Has session, check onboarding status
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('onboarding_completed')
            .eq('id', session.user.id)
            .single();

          const isOnboarded = profile?.onboarding_completed ?? false;

          if (!isOnboarded && !inOnboardingGroup) {
            // Not onboarded, send to onboarding
            router.replace('/(onboarding)');
          } else if (isOnboarded && (inAuthGroup || inOnboardingGroup)) {
            // Onboarded but still on auth/onboarding, go to app
            router.replace('/(app)/(tabs)');
          }
        }
        // Otherwise stay on current page

        setInitialCheckDone(true);
      });
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!initialCheckDone) return; // Wait for initial check

      const inAuthGroup = segments[0] === 'auth';
      const inOnboardingGroup = segments[0] === '(onboarding)';

      if (!session && !inAuthGroup) {
        // User logged out and not in auth, redirect to login
        router.replace('/auth/login');
      } else if (session) {
        // Check onboarding status
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();

        const isOnboarded = profile?.onboarding_completed ?? false;

        if (!isOnboarded && !inOnboardingGroup) {
          // Not onboarded, send to onboarding
          router.replace('/(onboarding)');
        } else if (isOnboarded && (inAuthGroup || inOnboardingGroup)) {
          // Onboarded but on auth/onboarding, go to app
          router.replace('/(app)/(tabs)');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [segments, initialCheckDone]);

  return (
    <GluestackUIProvider config={config}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <Slot />
          </SafeAreaProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </GluestackUIProvider>
  );
}
