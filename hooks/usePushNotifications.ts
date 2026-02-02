import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import {
  registerForPushNotificationsAsync,
  saveTokenToDatabase,
} from '../lib/notifications';

/**
 * Detects and saves user's timezone to the database
 * Runs on every app open to catch timezone changes (travel, DST)
 *
 * @param userId - The authenticated user's ID
 */
async function saveUserTimezone(userId: string): Promise<void> {
  try {
    // Detect timezone using Intl API (works across all platforms)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Save to users table (non-blocking - failure shouldn't affect push registration)
    const { error } = await supabase
      .from('users')
      .update({ timezone })
      .eq('id', userId);

    if (error) {
      // Log but don't throw - timezone save is not critical
      console.warn('Failed to save timezone:', error.message);
    }
  } catch (err) {
    // Intl API should always work, but catch just in case
    console.warn('Failed to detect timezone:', err);
  }
}

/**
 * Hook for managing push notifications
 * Automatically registers for push notifications when user is authenticated
 * Sets up notification listeners for foreground and interaction events
 * Also detects and saves user timezone for 9:00 AM local delivery
 *
 * @returns {Object} - { expoPushToken, notification }
 */
export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();

  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Check if user is authenticated and register for push notifications
    const setupPushNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Save timezone on every app open (catches travel, DST changes)
        // This runs in parallel with token registration - non-blocking
        saveUserTimezone(session.user.id);

        const token = await registerForPushNotificationsAsync();

        if (token) {
          setExpoPushToken(token);
          await saveTokenToDatabase(session.user.id, token);
        }
      }
    };

    setupPushNotifications();

    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listener for when user interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap here (e.g., navigate to specific screen)
      // You can access notification data via response.notification.request.content.data
    });

    // Cleanup listeners on unmount
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
}
