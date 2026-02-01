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
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { fetchGroupDetails } from '../../utils/groups';
import { Group, User } from '../../types';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface GroupWithMembers extends Group {
  members: Array<{
    role: string;
    users: User;
  }>;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroupDetails();
  }, [id]);

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
        {/* Gradient Header */}
        <LinearGradient
          colors={[colors.burgundy[800], colors.burgundy[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 60,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.lg,
          }}
        >
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
          >
            {/* Back Button - Positioned at top */}
            <View style={{ marginBottom: spacing.md }}>
              <TouchableOpacity
                onPress={() => router.push('/(app)/(tabs)/groups')}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            {/* Group Info */}
            <View>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: '700',
                  color: colors.white,
                  marginBottom: spacing.xs,
                }}
              >
                {group.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons
                    name="cash"
                    size={16}
                    color={colors.gold[200]}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text style={{ fontSize: 14, color: colors.gold[200], fontWeight: '500' }}>
                    ${group.budget_limit_per_gift} per gift
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons
                    name="account-multiple"
                    size={16}
                    color={colors.gold[200]}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text style={{ fontSize: 14, color: colors.gold[200], fontWeight: '500' }}>
                    {group.members?.length || 0} members
                  </Text>
                </View>
              </View>
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

          {/* Members Section */}
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
              {group.members?.map((member, index) => (
                <MotiView
                  key={member.users.id}
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ type: 'spring', delay: 200 + index * 50 }}
                >
                  <View
                    style={{
                      backgroundColor: colors.white,
                      borderRadius: borderRadius.lg,
                      padding: spacing.md,
                      borderWidth: 2,
                      borderColor: colors.gold[100],
                      ...shadows.sm,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {/* Avatar Circle */}
                      <View
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          backgroundColor: colors.burgundy[100],
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: spacing.md,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: '700',
                            color: colors.burgundy[700],
                          }}
                        >
                          {member.users.full_name?.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      {/* Member Info */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: '700',
                              color: colors.burgundy[800],
                              flex: 1,
                            }}
                          >
                            {member.users.full_name}
                          </Text>
                          {member.role === 'admin' && (
                            <View
                              style={{
                                backgroundColor: colors.gold[100],
                                paddingHorizontal: spacing.sm,
                                paddingVertical: 4,
                                borderRadius: borderRadius.sm,
                                borderWidth: 1,
                                borderColor: colors.gold[300],
                              }}
                            >
                              <Text
                                style={{
                                  color: colors.gold[800],
                                  fontSize: 11,
                                  fontWeight: '700',
                                }}
                              >
                                ADMIN
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs / 2 }}>
                          <MaterialCommunityIcons
                            name="email"
                            size={14}
                            color={colors.burgundy[400]}
                            style={{ marginRight: spacing.xs }}
                          />
                          <Text
                            style={{
                              fontSize: 13,
                              color: colors.burgundy[500],
                            }}
                          >
                            {member.users.email}
                          </Text>
                        </View>

                        {member.users.birthday && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons
                              name="cake-variant"
                              size={14}
                              color={colors.gold[600]}
                              style={{ marginRight: spacing.xs }}
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                color: colors.gold[700],
                                fontWeight: '500',
                              }}
                            >
                              Birthday: {new Date(member.users.birthday).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </MotiView>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
