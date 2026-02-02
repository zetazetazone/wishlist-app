import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import {
  registerForPushNotificationsAsync,
  saveTokenToDatabase,
} from '../lib/notifications';

/**
 * Hook for managing push notifications
 * Automatically registers for push notifications when user is authenticated
 * Sets up notification listeners for foreground and interaction events
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
