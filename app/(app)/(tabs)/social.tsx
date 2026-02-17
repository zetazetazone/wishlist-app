import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getFriends, removeFriend, getPendingRequests, FriendWithProfile } from '../../../lib/friends';
import { fetchUserGroups } from '../../../utils/groups';
import { FriendCard } from '../../../components/friends/FriendCard';
import GroupCard from '../../../components/groups/GroupCard';
import CreateGroupModal from '../../../components/groups/CreateGroupModal';
import JoinGroupModal from '../../../components/groups/JoinGroupModal';
import { Tables } from '../../../types';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';

type Group = Tables<'groups'>;
type Segment = 'friends' | 'groups';

/**
 * Unified People Screen
 *
 * Merges the Friends and Groups screens into a single tab with segmented control.
 * - Friends segment: Shows friend list with search/requests header icons
 * - Groups segment: Shows group action buttons and group list
 *
 * Reduces tab bar from 5 to 4 tabs, providing unified social management.
 */
export default function SocialScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  // Segment state
  const [activeSegment, setActiveSegment] = useState<Segment>('friends');

  // Friends state
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Groups state
  const [groups, setGroups] = useState<Array<Group & { member_count?: number }>>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  // Shared loading state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load friends data
  const loadFriends = async () => {
    const data = await getFriends();
    setFriends(data);
  };

  // Load groups data
  const loadGroups = async () => {
    const { data } = await fetchUserGroups();
    if (data) {
      setGroups(data);
    }
  };

  // Initial load - fetch both in parallel
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadFriends(), loadGroups()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Refresh pending count when tab focuses
  useFocusEffect(
    useCallback(() => {
      const loadPendingCount = async () => {
        try {
          const { incoming } = await getPendingRequests();
          setPendingCount(incoming.length);
        } catch (error) {
          console.error('Failed to load pending count:', error);
        }
      };
      loadPendingCount();
    }, [])
  );

  // Handle pull-to-refresh - only refresh active segment
  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeSegment === 'friends') {
      await loadFriends();
    } else {
      await loadGroups();
    }
    setRefreshing(false);
  };

  // Friends handlers
  const handleFriendPress = (friendUserId: string) => {
    router.push(`/member/${friendUserId}` as any);
  };

  const handleRemoveFriend = (friendshipId: string, friendName: string) => {
    Alert.alert(
      t('friends.removeFriend'),
      t('friends.removeFriendConfirm', { name: friendName }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(friendshipId);
              loadFriends();
            } catch (error) {
              console.error('Failed to remove friend:', error);
              Alert.alert(t('alerts.titles.error'), t('friends.failedToRemove'));
            }
          },
        },
      ]
    );
  };

  // Groups handlers
  const handleGroupPress = (groupId: string) => {
    router.push(`/group/${groupId}` as any);
  };

  // Get title and subtitle based on active segment
  const getHeaderContent = () => {
    if (activeSegment === 'friends') {
      return {
        title: t('friends.title'),
        subtitle: `${friends.length} ${t('friends.friend', { count: friends.length })}`,
      };
    } else {
      return {
        title: t('groups.title'),
        subtitle: `${groups.length} ${t('groups.group', { count: groups.length })}`,
      };
    }
  };

  const headerContent = getHeaderContent();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.burgundy[600]} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[colors.burgundy[800], colors.burgundy[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Header Row with contextual icons */}
          {activeSegment === 'friends' && (
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push('/discover')}
              >
                <MaterialCommunityIcons name="account-search" size={24} color={colors.white} />
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push('/requests')}
              >
                <MaterialCommunityIcons name="account-clock" size={24} color={colors.white} />
                {pendingCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
          >
            <View>
              <Text style={styles.headerTitle}>{headerContent.title}</Text>
              <Text style={styles.headerSubtitle}>{headerContent.subtitle}</Text>
            </View>
          </MotiView>

          {/* Segmented Control */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeSegment === 'friends' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveSegment('friends')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'friends' && styles.segmentTextActive,
                ]}
              >
                {t('people.segments.friends')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeSegment === 'groups' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveSegment('groups')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'groups' && styles.segmentTextActive,
                ]}
              >
                {t('people.segments.groups')}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Content Area */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
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
          {activeSegment === 'friends' ? (
            // Friends Content
            friends.length === 0 ? (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: 200 }}
              >
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <MaterialCommunityIcons
                      name="account-heart"
                      size={60}
                      color={colors.burgundy[400]}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>{t('friends.empty.noFriends')}</Text>
                  <Text style={styles.emptyDescription}>
                    {t('friends.empty.noFriendsDescription')}
                  </Text>
                </View>
              </MotiView>
            ) : (
              friends.map((friend, index) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  onPress={() => handleFriendPress(friend.friend_user_id)}
                  onRemove={() =>
                    handleRemoveFriend(
                      friend.id,
                      friend.friend?.display_name || 'this friend'
                    )
                  }
                  index={index}
                />
              ))
            )
          ) : (
            // Groups Content
            <>
              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => setCreateModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="plus-circle"
                    size={20}
                    color={colors.white}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.createButtonText}>{t('groups.createGroup')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => setJoinModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="account-multiple-plus"
                    size={20}
                    color={colors.burgundy[700]}
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.joinButtonText}>{t('groups.joinGroup')}</Text>
                </TouchableOpacity>
              </View>

              {groups.length === 0 ? (
                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', delay: 200 }}
                >
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                      <MaterialCommunityIcons
                        name="account-group"
                        size={60}
                        color={colors.burgundy[400]}
                      />
                    </View>
                    <Text style={styles.emptyTitle}>{t('groups.empty.noGroups')}</Text>
                    <Text style={styles.emptyDescription}>
                      {t('groups.empty.noGroupsDescription')}
                    </Text>
                  </View>
                </MotiView>
              ) : (
                groups.map((group, index) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onPress={() => handleGroupPress(group.id)}
                    index={index}
                  />
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Modals */}
      <CreateGroupModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={loadGroups}
      />

      <JoinGroupModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onSuccess={loadGroups}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.cream[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.cream[50],
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerButton: {
    padding: spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.gold[200],
    fontWeight: '400',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
    padding: spacing.xs,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  segmentButtonActive: {
    backgroundColor: colors.burgundy[700],
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.burgundy[700],
  },
  segmentTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.xl,
    borderWidth: 2,
    borderColor: colors.gold[100],
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.burgundy[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.burgundy[800],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.burgundy[400],
    textAlign: 'center',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  createButton: {
    flex: 1,
    backgroundColor: colors.burgundy[700],
    borderRadius: borderRadius.lg,
    padding: spacing.md + spacing.xs,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...shadows.md,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  joinButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md + spacing.xs,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.burgundy[700],
  },
  joinButtonText: {
    color: colors.burgundy[700],
    fontSize: 15,
    fontWeight: '700',
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
});
