import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Configures default notification behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers for push notifications and returns the Expo push token
 * IMPORTANT: Creates Android notification channel BEFORE requesting token
 *
 * @returns Promise<string | undefined> - Expo push token or undefined if registration fails
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return undefined;
  }

  try {
    // For Android, create notification channel FIRST (required for Android 13+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permission for push notifications was denied');
      return undefined;
    }

    // Get Expo push token
    // projectId is automatically read from app.json extra.eas.projectId
    const tokenData = await Notifications.getExpoPushTokenAsync();

    return tokenData.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return undefined;
  }
}

/**
 * Saves the Expo push token to the database
 * Uses upsert to update last_active timestamp on existing tokens
 *
 * @param userId - User ID from auth
 * @param expoPushToken - Expo push token from registerForPushNotificationsAsync
 * @returns Promise<boolean> - true if saved successfully
 */
export async function saveTokenToDatabase(
  userId: string,
  expoPushToken: string
): Promise<boolean> {
  try {
    const deviceType = Platform.OS as 'ios' | 'android' | 'web';

    const { error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          device_type: deviceType,
          last_active: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,expo_push_token',
          ignoreDuplicates: false, // Update last_active on conflict
        }
      );

    if (error) {
      console.error('Error saving token to database:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving token to database:', error);
    return false;
  }
}

/**
 * Removes a device token from the database (e.g., on logout)
 *
 * @param userId - User ID from auth
 * @param expoPushToken - Expo push token to remove
 * @returns Promise<boolean> - true if removed successfully
 */
export async function removeTokenFromDatabase(
  userId: string,
  expoPushToken: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('expo_push_token', expoPushToken);

    if (error) {
      console.error('Error removing token from database:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing token from database:', error);
    return false;
  }
}
