import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getPendingRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  blockUser,
  FriendRequestWithProfile,
} from '../../lib/friends';
import { FriendRequestCard } from '../../components/friends/FriendRequestCard';
import { colors, spacing, borderRadius } from '../../constants/theme';

/**
 * Friend Requests Screen
 *
 * Displays pending friend requests in two tabs:
 * - Incoming: Requests sent to the current user (Accept/Decline)
 * - Outgoing: Requests sent by the current user (Cancel)
 *
 * Accessible via /requests route, linked from Friends tab header.
 */
export default function RequestsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [incoming, setIncoming] = useState<FriendRequestWithProfile[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const result = await getPendingRequests();
      setIncoming(result.incoming);
      setOutgoing(result.outgoing);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleAccept = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      Alert.alert(t('common.success'), t('friends.requestAccepted'));
      loadRequests();
    } catch (error) {
      console.error('Failed to accept request:', error);
      Alert.alert(
        t('alerts.titles.error'),
        error instanceof Error ? error.message : t('friends.failedToAcceptRequest')
      );
    }
  };

  const handleDecline = (requestId: string, fromUserId: string) => {
    Alert.alert(
      t('friends.declineRequest'),
      t('friends.whatWouldYouLikeToDo'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('friends.decline'),
          onPress: async () => {
            try {
              await declineFriendRequest(requestId);
              loadRequests();
            } catch (error) {
              console.error('Failed to decline request:', error);
              Alert.alert(
                t('alerts.titles.error'),
                error instanceof Error ? error.message : t('friends.failedToDeclineRequest')
              );
            }
          },
        },
        {
          text: t('friends.blockAndDecline'),
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(fromUserId);
              loadRequests();
            } catch (error) {
              console.error('Failed to block user:', error);
              Alert.alert(
                t('alerts.titles.error'),
                error instanceof Error ? error.message : t('friends.failedToBlockUser')
              );
            }
          },
        },
      ]
    );
  };

  const handleCancel = (requestId: string) => {
    Alert.alert(
      t('friends.cancelRequest'),
      t('friends.cancelRequestConfirm'),
      [
        {
          text: t('common.no'),
          style: 'cancel',
        },
        {
          text: t('friends.yesCancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelFriendRequest(requestId);
              loadRequests();
            } catch (error) {
              console.error('Failed to cancel request:', error);
              Alert.alert(
                t('alerts.titles.error'),
                error instanceof Error ? error.message : t('friends.failedToCancelRequest')
              );
            }
          },
        },
      ]
    );
  };

  const currentRequests = activeTab === 'incoming' ? incoming : outgoing;

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('friends.friendRequests'),
            headerShown: true,
            headerStyle: { backgroundColor: colors.white },
            headerTintColor: colors.burgundy[700],
          }}
        />
        <View
          style={{
            flex: 1,
            backgroundColor: colors.cream[50],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color={colors.burgundy[600]} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('friends.friendRequests'),
          headerShown: true,
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.burgundy[700],
        }}
      />
      <StatusBar barStyle="dark-content" />
      <View style={{ flex: 1, backgroundColor: colors.cream[50] }}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[colors.burgundy[800], colors.burgundy[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: spacing.lg,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.lg,
          }}
        >
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
          >
            <View>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '700',
                  color: colors.white,
                  marginBottom: spacing.xs,
                }}
              >
                {t('friends.friendRequests')}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: colors.gold[200],
                  fontWeight: '400',
                }}
              >
                {t('friends.pendingRequestCount', { count: incoming.length + outgoing.length })}
              </Text>
            </View>
          </MotiView>

          {/* Segment Control */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 200 }}
          >
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: borderRadius.lg,
                padding: spacing.xs,
                marginTop: spacing.lg,
              }}
            >
              <TouchableOpacity
                onPress={() => setActiveTab('incoming')}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: borderRadius.md,
                  backgroundColor:
                    activeTab === 'incoming' ? colors.white : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color:
                      activeTab === 'incoming'
                        ? colors.burgundy[700]
                        : colors.white,
                  }}
                >
                  {t('friends.incoming')} ({incoming.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('outgoing')}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: borderRadius.md,
                  backgroundColor:
                    activeTab === 'outgoing' ? colors.white : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color:
                      activeTab === 'outgoing'
                        ? colors.burgundy[700]
                        : colors.white,
                  }}
                >
                  {t('friends.outgoing')} ({outgoing.length})
                </Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingTop: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.burgundy[600]}
              colors={[colors.burgundy[600]]}
            />
          }
        >
          {currentRequests.length === 0 ? (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 200 }}
            >
              <View
                style={{
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.xl,
                  padding: spacing.xxl,
                  alignItems: 'center',
                  marginTop: spacing.xl,
                  borderWidth: 2,
                  borderColor: colors.gold[100],
                  borderStyle: 'dashed',
                }}
              >
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: colors.burgundy[50],
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.lg,
                  }}
                >
                  <MaterialCommunityIcons
                    name={
                      activeTab === 'incoming'
                        ? 'account-arrow-left'
                        : 'account-arrow-right'
                    }
                    size={60}
                    color={colors.burgundy[400]}
                  />
                </View>

                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: colors.burgundy[800],
                    marginBottom: spacing.sm,
                    textAlign: 'center',
                  }}
                >
                  {activeTab === 'incoming'
                    ? t('friends.noPendingRequests')
                    : t('friends.noSentRequests')}
                </Text>

                <Text
                  style={{
                    fontSize: 15,
                    color: colors.burgundy[400],
                    textAlign: 'center',
                    lineHeight: 22,
                  }}
                >
                  {activeTab === 'incoming'
                    ? t('friends.noPendingRequestsDescription')
                    : t('friends.noSentRequestsDescription')}
                </Text>
              </View>
            </MotiView>
          ) : (
            currentRequests.map((request, index) => (
              <FriendRequestCard
                key={request.id}
                request={request}
                type={activeTab}
                onAccept={handleAccept}
                onDecline={(reqId) => handleDecline(reqId, request.from_user_id)}
                onCancel={handleCancel}
                index={index}
              />
            ))
          )}
        </ScrollView>
      </View>
    </>
  );
}
