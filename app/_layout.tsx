import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '../gluestack-ui.config';
import './global.css';
import { supabase } from '../lib/supabase';
import { syncLanguageFromServer } from '../lib/language';
import { initI18n } from '../src/i18n';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Initialize i18n before rendering app
  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  // Sync language preference from server when userId becomes available
  useEffect(() => {
    if (userId && i18nReady) {
      syncLanguageFromServer(userId).catch((error) => {
        console.warn('[RootLayout] Language sync failed:', error);
      });
    }
  }, [userId, i18nReady]);

  useEffect(() => {
    // Check initial session only once
    if (!initialCheckDone) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        // Extract userId for language sync
        setUserId(session?.user?.id);
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
      // Extract userId for language sync on auth state change
      setUserId(session?.user?.id);

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

  // Wait for i18n initialization before rendering
  if (!i18nReady) return null;

  return (
    <GluestackUIProvider config={config}>
      <KeyboardProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <SafeAreaProvider>
              <StatusBar style="light" />
              <Slot />
            </SafeAreaProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </KeyboardProvider>
    </GluestackUIProvider>
  );
}
