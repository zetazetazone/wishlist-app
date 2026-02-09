/**
 * Member Profile Screen
 *
 * Read-only view of another member's profile and personal details.
 * Accessible from group member lists and celebration screens.
 *
 * PROF-07: Group members can view another member's personal details
 * PROF-09: Last updated timestamp displays on member profile
 */

import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import {
  VStack,
  Avatar,
  AvatarImage,
  AvatarFallbackText,
} from '@gluestack-ui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getPersonalDetails, TypedPersonalDetails } from '@/lib/personalDetails';
import { getAvatarUrl } from '@/lib/storage';
import {
  getRelationshipStatus,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from '@/lib/friends';
import { CompletenessIndicator } from '@/components/profile/CompletenessIndicator';
import { PersonalDetailsReadOnly } from '@/components/profile/PersonalDetailsReadOnly';
import { MemberNotesSection } from '@/components/notes/MemberNotesSection';
import { calculateCompleteness, CompletenessResult } from '@/lib/profileCompleteness';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

interface MemberProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function MemberProfileScreen() {
  const { id, groupId } = useLocalSearchParams<{ id: string; groupId?: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [personalDetails, setPersonalDetails] = useState<TypedPersonalDetails | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessResult | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [relationshipStatus, setRelationshipStatus] = useState<
    'none' | 'friends' | 'pending_incoming' | 'pending_outgoing' | 'blocked' | 'loading'
  >('loading');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadMemberData();
    }
  }, [id]);

  const loadMemberData = async () => {
    try {
      setIsLoading(true);

      // Get current user ID for isSubject check
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Fetch member's user_profile for name/avatar
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .eq('id', id)
        .single();

      if (profileError) {
        console.error('Error loading member profile:', profileError);
        return;
      }

      setMemberProfile(profile);

      // Fetch member's personal_details
      const details = await getPersonalDetails(id);
      setPersonalDetails(details);

      // Calculate completeness if details exist
      if (details) {
        const result = calculateCompleteness(
          details.sizes,
          details.preferences,
          details.external_links,
          details.delivery_address,
          details.bank_details
        );
        setCompleteness(result);
      }

      // Load relationship status (only for other users, not self)
      if (user && id !== user.id) {
        try {
          const status = await getRelationshipStatus(id);
          setRelationshipStatus(status);
        } catch (error) {
          console.error('Error loading relationship status:', error);
          setRelationshipStatus('none');
        }
      } else {
        // This is the current user viewing their own profile - no relationship status needed
        setRelationshipStatus('none');
      }
    } catch (error) {
      console.error('Error loading member data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get incoming request ID for accept/decline operations
  const getIncomingRequestId = async (fromUserId: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('from_user_id', fromUserId)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (error || !data) throw new Error('Request not found');
    return data.id;
  };

  const handleSendRequest = async () => {
    try {
      setActionLoading(true);
      await sendFriendRequest(id);
      setRelationshipStatus('pending_outgoing');
      Alert.alert('Success', 'Friend request sent!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setActionLoading(true);
      const requestId = await getIncomingRequestId(id);
      await acceptFriendRequest(requestId);
      setRelationshipStatus('friends');
      Alert.alert('Success', 'You are now friends!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this friend request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const requestId = await getIncomingRequestId(id);
              await declineFriendRequest(requestId);
              setRelationshipStatus('none');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to decline request');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const avatarUrl = memberProfile?.avatar_url
    ? getAvatarUrl(memberProfile.avatar_url)
    : null;

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerShown: true,
            headerStyle: { backgroundColor: '#ffffff' },
            headerTintColor: colors.burgundy[700],
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.burgundy[600]} />
        </View>
      </>
    );
  }

  if (!memberProfile) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerShown: true,
            headerStyle: { backgroundColor: '#ffffff' },
            headerTintColor: colors.burgundy[700],
          }}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Member not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: memberProfile.display_name || 'Profile',
          headerShown: true,
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: colors.burgundy[700],
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Member Header */}
        <View style={styles.headerCard}>
          <Avatar size="xl" borderRadius="$full">
            {avatarUrl ? (
              <AvatarImage source={{ uri: avatarUrl }} alt={memberProfile.display_name || 'Member'} />
            ) : (
              <AvatarFallbackText>
                {memberProfile.display_name || 'Member'}
              </AvatarFallbackText>
            )}
          </Avatar>
          <Text style={styles.displayName}>
            {memberProfile.display_name || 'Member'}
          </Text>
        </View>

        {/* Friend Action Button - only show for other users */}
        {id !== currentUserId && relationshipStatus !== 'loading' && (
          <View style={styles.friendActionContainer}>
            {relationshipStatus === 'none' && (
              <TouchableOpacity
                style={[styles.friendButton, styles.addFriendButton]}
                onPress={handleSendRequest}
                disabled={actionLoading}
              >
                <MaterialCommunityIcons name="account-plus" size={20} color={colors.white} />
                <Text style={styles.friendButtonText}>Add Friend</Text>
              </TouchableOpacity>
            )}
            {relationshipStatus === 'pending_outgoing' && (
              <View style={[styles.friendButton, styles.pendingButton]}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={colors.cream[600]} />
                <Text style={styles.pendingText}>Request Pending</Text>
              </View>
            )}
            {relationshipStatus === 'pending_incoming' && (
              <View style={styles.incomingActions}>
                <TouchableOpacity
                  style={[styles.friendButton, styles.acceptButton]}
                  onPress={handleAccept}
                  disabled={actionLoading}
                >
                  <MaterialCommunityIcons name="check" size={18} color={colors.white} />
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.friendButton, styles.declineButton]}
                  onPress={handleDecline}
                  disabled={actionLoading}
                >
                  <MaterialCommunityIcons name="close" size={18} color={colors.error} />
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
            {relationshipStatus === 'friends' && (
              <View style={[styles.friendButton, styles.friendsIndicator]}>
                <MaterialCommunityIcons name="account-check" size={20} color={colors.success} />
                <Text style={styles.friendsText}>Friends</Text>
              </View>
            )}
          </View>
        )}

        {/* Personal Details */}
        {personalDetails ? (
          <VStack space="md">
            {/* Completeness Indicator */}
            {completeness && <CompletenessIndicator result={completeness} />}

            {/* Read-only Personal Details */}
            <PersonalDetailsReadOnly
              sizes={personalDetails.sizes}
              preferences={personalDetails.preferences}
              externalLinks={personalDetails.external_links}
              deliveryAddress={personalDetails.delivery_address}
              bankDetails={personalDetails.bank_details}
              visibility={personalDetails.visibility}
              updatedAt={personalDetails.updated_at}
              isGroupMember={!!groupId}
            />
          </VStack>
        ) : (
          <View style={styles.noDetailsCard}>
            <Text style={styles.noDetailsText}>
              This member hasn't added personal details yet
            </Text>
          </View>
        )}

        {/* Notes Section - only shown when accessed with groupId context */}
        {groupId && (
          <View style={styles.notesContainer}>
            <MemberNotesSection
              groupId={groupId}
              aboutUserId={id}
              aboutUserName={memberProfile?.display_name || 'Member'}
              isSubject={id === currentUserId}
            />
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream[100],
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream[100],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream[100],
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: colors.cream[600],
  },
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.burgundy[800],
    marginTop: spacing.md,
  },
  noDetailsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  noDetailsText: {
    fontSize: 15,
    color: colors.cream[600],
    fontStyle: 'italic',
    textAlign: 'center',
  },
  notesContainer: {
    marginTop: spacing.lg,
  },
  friendActionContainer: {
    marginBottom: spacing.lg,
  },
  friendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  addFriendButton: {
    backgroundColor: colors.burgundy[600],
  },
  friendButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  pendingButton: {
    backgroundColor: colors.cream[200],
    borderWidth: 1,
    borderColor: colors.cream[400],
  },
  pendingText: {
    color: colors.cream[600],
    fontWeight: '500',
    fontSize: 15,
  },
  incomingActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  acceptButton: {
    backgroundColor: colors.success,
    flex: 1,
  },
  acceptText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  declineButton: {
    backgroundColor: colors.cream[100],
    borderWidth: 1,
    borderColor: colors.cream[300],
    flex: 1,
  },
  declineText: {
    color: colors.error,
    fontWeight: '500',
    fontSize: 15,
  },
  friendsIndicator: {
    backgroundColor: colors.cream[100],
    borderWidth: 1,
    borderColor: colors.cream[300],
  },
  friendsText: {
    color: colors.success,
    fontWeight: '600',
    fontSize: 15,
  },
});
