import { useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { fetchGroupDetails } from '../../utils/groups';
import { Group, User } from '../../types';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { GroupViewHeader } from '../../components/groups/GroupViewHeader';
import { MemberCard } from '../../components/groups/MemberCard';
import { getDaysUntilBirthday } from '../../utils/countdown';

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
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortedMembers, setSortedMembers] = useState<Array<{
    role: string;
    users: User;
    daysUntil: number;
  }>>([]);

  useEffect(() => {
    loadGroupDetails();
  }, [id]);

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
      Alert.alert('Error', 'Failed to load group details');
      router.back();
      return;
    }

    setGroup(data as GroupWithMembers);
  };

  const handleShare = async () => {
    if (!group) return;

    try {
      await Share.share({
        message: `Join "${group.name}" on Wishlist App!\n\nInvite Code: ${group.id}\n\nUse this code to join our gift-giving group.`,
        title: `Join ${group.name}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const copyInviteCode = () => {
    if (!group) return;
    // Note: Clipboard API would be used here in a full implementation
    Alert.alert(
      'Invite Code',
      group.id,
      [
        { text: 'Share', onPress: handleShare },
        { text: 'Close' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream[50], alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Loading...', headerShown: false }} />
        <ActivityIndicator size="large" color={colors.burgundy[600]} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream[50], alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Group Not Found', headerShown: false }} />
        <Text style={{ color: colors.burgundy[400] }}>Group not found</Text>
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
                  Share Invite Code
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
                  View Invite Code
                </Text>
              </TouchableOpacity>
            </View>
          </MotiView>

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
              Members
            </Text>

            <View style={{ gap: spacing.sm }}>
              {sortedMembers.map((member, index) => (
                <MemberCard
                  key={member.users.id}
                  member={{
                    role: member.role,
                    users: {
                      id: member.users.id,
                      full_name: member.users.full_name || 'Unknown',
                      avatar_url: member.users.avatar_url,
                    },
                  }}
                  daysUntilBirthday={member.daysUntil}
                  favoriteItem={group.favoritesByUser?.[member.users.id] as { title: string; image_url: string | null; item_type: 'standard' | 'surprise_me' | 'mystery_box' } | null}
                  onPress={() => router.push(`/(app)/celebration/${member.users.id}`)}
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
