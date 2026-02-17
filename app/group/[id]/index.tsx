import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  StatusBar,
} from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fetchGroupDetails } from '../../../utils/groups';
import { Group, User } from '../../../types';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';
import { GroupViewHeader } from '../../../components/groups/GroupViewHeader';
import { MemberCard } from '../../../components/groups/MemberCard';
import { getDaysUntilBirthday } from '../../../utils/countdown';
import { findCelebrationForMember } from '../../../lib/celebrations';
import { getGroupBudgetStatus, BudgetStatus } from '../../../lib/budget';
import { BudgetProgressBar } from '../../../components/groups/BudgetProgressBar';
import { useGroupForOthersWishlists } from '../../../hooks/useWishlists';

interface GroupWithMembers extends Group {
  members: Array<{
    role: string;
    users: User;
  }>;
  favoritesByUser?: Record<string, { title: string; image_url: string | null; item_type: string } | null>;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortedMembers, setSortedMembers] = useState<Array<{
    role: string;
    users: User;
    daysUntil: number;
  }>>([]);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);

  // Fetch for-others wishlists linked to this group
  const { data: forOthersWishlists, isLoading: forOthersLoading } = useGroupForOthersWishlists(id);

  useEffect(() => {
    loadGroupDetails();
  }, [id]);

  // Refresh budget status on screen focus (picks up changes from settings)
  useFocusEffect(
    useCallback(() => {
      if (!group?.id) return;
      if ((group.mode || 'gifts') !== 'gifts') {
        setBudgetStatus(null);
        return;
      }
      getGroupBudgetStatus(group.id)
        .then(setBudgetStatus)
        .catch(err => {
          console.error('Failed to load budget status:', err);
          setBudgetStatus(null);
        });
    }, [group?.id, group?.mode])
  );

  // Sort members by birthday when group data loads
  useEffect(() => {
    if (!group?.members) return;

    const membersWithCountdown = group.members.map(member => ({
      ...member,
      daysUntil: getDaysUntilBirthday(member.users.birthday || ''),
    }));

    // Sort by daysUntil (ascending - closest birthday first)
    const sorted = [...membersWithCountdown].sort((a, b) => {
      // Handle invalid dates (-1) by putting them at the end
      if (a.daysUntil === -1) return 1;
      if (b.daysUntil === -1) return -1;
      return a.daysUntil - b.daysUntil;
    });

    setSortedMembers(sorted);
  }, [group?.members]);

  const loadGroupDetails = async () => {
    if (!id) return;

    setLoading(true);
    const { data, error } = await fetchGroupDetails(id);
    setLoading(false);

    if (error || !data) {
      Alert.alert(t('alerts.titles.error'), t('groups.failedToLoad'));
      router.back();
      return;
    }

    setGroup(data as GroupWithMembers);
  };

  const handleMemberPress = async (userId: string) => {
    if (!id) return;

    const celebration = await findCelebrationForMember(userId, id);

    if (celebration) {
      router.push(`/(app)/celebration/${celebration.id}`);
    } else {
      Alert.alert(
        t('groups.noCelebrationYet'),
        t('groups.celebrationsCreatedAutomatically')
      );
    }
  };

  const handleShare = async () => {
    if (!group) return;

    try {
      await Share.share({
        message: t('groups.shareMessage', { name: group.name, code: group.invite_code }),
        title: t('groups.joinGroup', { name: group.name }),
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const copyInviteCode = () => {
    if (!group) return;
    // Note: Clipboard API would be used here in a full implementation
    Alert.alert(
      t('groups.inviteCode'),
      group.invite_code,
      [
        { text: t('common.share'), onPress: handleShare },
        { text: t('common.close') },
      ]
    );
  };

  const renderForOthersSection = () => {
    // Only show in gifts mode (greetings mode has no gift coordination context)
    if ((group?.mode || 'gifts') !== 'gifts') return null;

    if (forOthersLoading) {
      return (
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.burgundy[800], marginBottom: spacing.md }}>
            {t('groups.forOthersWishlists')}
          </Text>
          <View style={{ padding: spacing.lg, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.burgundy[600]} />
          </View>
        </View>
      );
    }

    if (!forOthersWishlists || forOthersWishlists.length === 0) {
      return (
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.burgundy[800], marginBottom: spacing.md }}>
            {t('groups.forOthersWishlists')}
          </Text>
          <View style={{
            backgroundColor: colors.white,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            alignItems: 'center',
            ...shadows.sm,
          }}>
            <MaterialCommunityIcons name="gift-outline" size={32} color={colors.burgundy[300]} />
            <Text style={{ color: colors.burgundy[400], marginTop: spacing.sm, textAlign: 'center' }}>
              {t('groups.forOthersWishlistsEmpty')}
            </Text>
            <Text style={{ color: colors.burgundy[300], fontSize: 12, marginTop: spacing.xs, textAlign: 'center' }}>
              {t('groups.forOthersWishlistsEmptyHint')}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.burgundy[800], marginBottom: spacing.md }}>
          {t('groups.forOthersWishlists')}
        </Text>
        <View style={{ gap: spacing.sm }}>
          {forOthersWishlists.map((wishlist) => {
            // Extract item count from the nested items array (Supabase returns [{count: N}])
            const itemCount = Array.isArray(wishlist.items) && wishlist.items[0]?.count
              ? wishlist.items[0].count
              : 0;

            return (
              <TouchableOpacity
                key={wishlist.id}
                style={{
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...shadows.sm,
                }}
                onPress={() => router.push(`/(app)/for-others-wishlist/${wishlist.id}`)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 28, marginRight: spacing.sm }}>
                  {wishlist.emoji || '🎁'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.burgundy[800] }}>
                    {wishlist.name}
                  </Text>
                  {wishlist.for_name && (
                    <Text style={{ fontSize: 13, color: colors.burgundy[500], marginTop: 2 }}>
                      {t('groups.forOthersFor', { name: wishlist.for_name })}
                    </Text>
                  )}
                  <Text style={{ fontSize: 12, color: colors.burgundy[400], marginTop: 2 }}>
                    {t('groups.forOthersItemCount', { count: itemCount })}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.burgundy[400]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream[50], alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: t('common.loading'), headerShown: false }} />
        <ActivityIndicator size="large" color={colors.burgundy[600]} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream[50], alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: t('groups.notFound'), headerShown: false }} />
        <Text style={{ color: colors.burgundy[400] }}>{t('groups.notFound')}</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: colors.cream[50] }}>
        {/* Group Header with Avatar, Name, Description, Mode Badge */}
        <GroupViewHeader
          group={{
            name: group.name,
            description: group.description,
            photo_url: group.photo_url,
            mode: group.mode || 'gifts',
          }}
          memberCount={group.members?.length || 0}
          onBack={() => router.push('/(app)/(tabs)/groups')}
          onSettings={() => router.push(`/group/${id}/settings`)}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingTop: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Action Buttons */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 100 }}
          >
            <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.burgundy[700],
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...shadows.md,
                }}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="share-variant"
                  size={20}
                  color={colors.white}
                  style={{ marginRight: spacing.sm }}
                />
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  {t('groups.shareInviteCode')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.burgundy[700],
                }}
                onPress={copyInviteCode}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="content-copy"
                  size={20}
                  color={colors.burgundy[700]}
                  style={{ marginRight: spacing.sm }}
                />
                <Text
                  style={{
                    color: colors.burgundy[700],
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  {t('groups.viewInviteCode')}
                </Text>
              </TouchableOpacity>
            </View>
          </MotiView>

          {/* Budget Section - visible to all members in gifts mode */}
          {budgetStatus && (group.mode || 'gifts') === 'gifts' && (
            <View style={{ marginBottom: spacing.lg }}>
              <BudgetProgressBar status={budgetStatus} />
            </View>
          )}

          {/* For-Others Wishlists Section - visible in gifts mode */}
          {renderForOthersSection()}

          {/* Members Section - Sorted by Birthday */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.burgundy[800],
                marginBottom: spacing.md,
              }}
            >
              {t('groups.members')}
            </Text>

            <View style={{ gap: spacing.sm }}>
              {sortedMembers.map((member, index) => (
                <MemberCard
                  key={member.users.id}
                  member={{
                    role: member.role,
                    users: {
                      id: member.users.id,
                      full_name: member.users.full_name || t('common.unknown'),
                      avatar_url: member.users.avatar_url,
                    },
                  }}
                  daysUntilBirthday={member.daysUntil}
                  favoriteItem={group.favoritesByUser?.[member.users.id] as { title: string; image_url: string | null; item_type: 'standard' | 'surprise_me' | 'mystery_box' } | null}
                  mode={group.mode || 'gifts'}
                  onPress={() => handleMemberPress(member.users.id)}
                  index={index}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
