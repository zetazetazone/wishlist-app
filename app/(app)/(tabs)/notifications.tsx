import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useLocalizedFormat } from '../../../hooks/useLocalizedFormat';
import {
  VStack,
  HStack,
  Text,
  Pressable,
  Box,
  Heading,
  Center,
  Spinner,
} from '@gluestack-ui/themed';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

type UserNotification = Database['public']['Tables']['user_notifications']['Row'];

interface NotificationWithDetails extends UserNotification {
  display_text: string;
  timestamp: string;
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { formatDistanceToNow } = useLocalizedFormat();
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadNotifications() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        setUserId(user.id);

        // Fetch notifications
        const { data, error } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching notifications:', error);
          setIsLoading(false);
          return;
        }

        // Transform notifications for display
        const transformedNotifications: NotificationWithDetails[] = (data || []).map(notification => ({
          ...notification,
          display_text: notification.body || notification.title || t('notifications.notification'),
          timestamp: formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }),
        }));

        setNotifications(transformedNotifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadNotifications();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to new notifications
    const channel = supabase
      .channel('user_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as UserNotification;
          const transformedNotification: NotificationWithDetails = {
            ...newNotification,
            display_text: newNotification.body || newNotification.title || t('notifications.notification'),
            timestamp: formatDistanceToNow(new Date(newNotification.created_at), { addSuffix: true }),
          };

          setNotifications(prev => [transformedNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleNotificationPress = async (notification: NotificationWithDetails) => {
    // Mark as read if not already
    if (!notification.read_at) {
      await supabase
        .from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.id);

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
    }

    // TODO: Navigate based on notification type
    // For now, just mark as read
  };

  const renderNotification = ({ item }: any) => {
    const isUnread = !item.read_at;

    return (
      <Pressable onPress={() => handleNotificationPress(item)}>
        <Box
          padding="$4"
          borderBottomWidth={1}
          borderBottomColor="$borderLight200"
          backgroundColor={isUnread ? '$backgroundLight50' : '$backgroundLight0'}
        >
          <VStack space="xs">
            <HStack justifyContent="space-between" alignItems="flex-start">
              <VStack flex={1} space="xs">
                <Text
                  fontWeight={isUnread ? '$bold' : '$normal'}
                  fontSize="$md"
                >
                  {item.title}
                </Text>
                {item.body && (
                  <Text
                    fontSize="$sm"
                    color="$textLight600"
                    numberOfLines={2}
                  >
                    {item.body}
                  </Text>
                )}
              </VStack>
              {isUnread && (
                <Box
                  width={8}
                  height={8}
                  borderRadius="$full"
                  backgroundColor="$blue500"
                  marginLeft="$2"
                />
              )}
            </HStack>
            <Text fontSize="$xs" color="$textLight500">
              {item.timestamp}
            </Text>
          </VStack>
        </Box>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('notifications.title'),
          headerShown: true,
        }}
      />

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <Center flex={1}>
            <Spinner size="large" />
          </Center>
        ) : notifications.length === 0 ? (
          <Center flex={1} padding="$6">
            <VStack space="md" alignItems="center">
              <Heading size="lg" color="$textLight600">
                {t('notifications.empty.noNotifications')}
              </Heading>
              <Text textAlign="center" color="$textLight500">
                {t('notifications.empty.noNotificationsDescription')}
              </Text>
            </VStack>
          </Center>
        ) : (
          <FlashList
            data={notifications}
            renderItem={renderNotification}
            estimatedItemSize={100}
          />
        )}
      </View>
    </>
  );
}
