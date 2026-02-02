/**
 * Celebration Detail Screen
 * Shows celebration info, Gift Leader section, and admin controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import {
  getCelebration,
  reassignGiftLeader,
  isCurrentUserGroupAdmin,
  type CelebrationDetail,
} from '../../../lib/celebrations';
import { GiftLeaderBadge } from '../../../components/celebrations/GiftLeaderBadge';

/**
 * Format date as "Month Day, Year" (e.g., "March 15, 2026")
 */
function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get status badge styling
 */
function getStatusStyle(status: string) {
  switch (status) {
    case 'active':
      return { bg: '#dcfce7', text: '#15803d', label: 'Active' };
    case 'completed':
      return { bg: '#f3f4f6', text: '#4b5563', label: 'Completed' };
    case 'upcoming':
    default:
      return { bg: '#dbeafe', text: '#1d4ed8', label: 'Upcoming' };
  }
}

export default function CelebrationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [celebration, setCelebration] = useState<CelebrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  // Load celebration details
  const loadCelebration = useCallback(async () => {
    if (!id) return;

    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }
      setCurrentUserId(user.id);

      const data = await getCelebration(id);
      if (!data) {
        setError('Celebration not found or access denied');
        return;
      }
      setCelebration(data);

      // Check if current user is admin
      const adminStatus = await isCurrentUserGroupAdmin(id);
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error('Failed to load celebration:', err);
      setError(err instanceof Error ? err.message : 'Failed to load celebration');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCelebration();
  }, [loadCelebration]);

  // Handle Gift Leader reassignment
  const handleReassign = async (newLeaderId: string) => {
    if (!id || !celebration) return;

    setReassigning(true);
    try {
      await reassignGiftLeader(id, newLeaderId);
      setReassignModalVisible(false);
      // Reload to get updated data
      await loadCelebration();
      Alert.alert('Success', 'Gift Leader has been reassigned');
    } catch (err) {
      console.error('Failed to reassign Gift Leader:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to reassign Gift Leader'
      );
    } finally {
      setReassigning(false);
    }
  };

  // Check if current user is the Gift Leader
  const isCurrentUserGiftLeader =
    currentUserId !== null && celebration?.gift_leader_id === currentUserId;

  // Get eligible members for reassignment (group members except celebrant)
  const eligibleMembers = celebration?.group_members?.filter(
    m => m.user_id !== celebration.celebrant_id
  ) || [];

  // Loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#8B1538" />
      </View>
    );
  }

  // Error state
  if (error || !celebration) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Error' }} />
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error || 'Celebration not found'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const celebrantName = celebration.celebrant?.display_name ||
    celebration.celebrant?.full_name ||
    'Unknown';
  const giftLeaderName = celebration.gift_leader?.display_name ||
    celebration.gift_leader?.full_name ||
    'Unassigned';
  const statusStyle = getStatusStyle(celebration.status);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `${celebrantName}'s Birthday`,
          headerBackTitle: 'Celebrations',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          {/* Celebrant Avatar */}
          <View style={styles.avatarContainer}>
            {celebration.celebrant?.avatar_url ? (
              <Image
                source={{ uri: celebration.celebrant.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {celebrantName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Celebrant Name */}
          <Text style={styles.celebrantName}>{celebrantName}'s Birthday</Text>

          {/* Event Date */}
          <View style={styles.dateRow}>
            <MaterialCommunityIcons name="calendar" size={18} color="#6b7280" />
            <Text style={styles.dateText}>{formatEventDate(celebration.event_date)}</Text>
          </View>

          {/* Group */}
          <View style={styles.groupRow}>
            <MaterialCommunityIcons name="account-group" size={18} color="#6b7280" />
            <Text style={styles.groupText}>{celebration.group?.name || 'Unknown Group'}</Text>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        {/* Gift Leader Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="crown" size={22} color="#8B1538" />
            <Text style={styles.sectionTitle}>Gift Leader</Text>
          </View>

          <View style={styles.giftLeaderCard}>
            {/* Gift Leader Info */}
            <View style={styles.giftLeaderInfo}>
              {celebration.gift_leader?.avatar_url ? (
                <Image
                  source={{ uri: celebration.gift_leader.avatar_url }}
                  style={styles.leaderAvatar}
                />
              ) : (
                <View style={[styles.leaderAvatar, styles.leaderAvatarPlaceholder]}>
                  <MaterialCommunityIcons name="account" size={24} color="#8B1538" />
                </View>
              )}
              <View style={styles.leaderDetails}>
                <Text style={styles.leaderName}>{giftLeaderName}</Text>
                {isCurrentUserGiftLeader ? (
                  <GiftLeaderBadge isCurrentUser />
                ) : (
                  <GiftLeaderBadge />
                )}
              </View>
            </View>

            {/* Message for Gift Leader */}
            {isCurrentUserGiftLeader && (
              <View style={styles.leaderMessage}>
                <MaterialCommunityIcons name="star" size={18} color="#8B1538" />
                <Text style={styles.leaderMessageText}>
                  You are coordinating this gift! Organize the group, collect contributions,
                  and make this celebration special.
                </Text>
              </View>
            )}

            {/* Reassign Button (Admin only) */}
            {isAdmin && celebration.status !== 'completed' && (
              <Pressable
                style={styles.reassignButton}
                onPress={() => setReassignModalVisible(true)}
              >
                <MaterialCommunityIcons name="account-switch" size={18} color="#8B1538" />
                <Text style={styles.reassignButtonText}>Reassign Gift Leader</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Contributions Section - Placeholder */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="cash-multiple" size={22} color="#22c55e" />
            <Text style={styles.sectionTitle}>Contributions</Text>
          </View>

          <View style={styles.placeholderCard}>
            {celebration.target_amount && celebration.target_amount > 0 ? (
              <>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, ((celebration.total_contributed || 0) / celebration.target_amount) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  ${celebration.total_contributed?.toFixed(0) || 0} of ${celebration.target_amount} target
                </Text>
              </>
            ) : (
              <Text style={styles.totalText}>
                Total: ${celebration.total_contributed?.toFixed(2) || '0.00'}
              </Text>
            )}
            <Text style={styles.placeholderText}>
              Full contribution tracking coming in Phase 02-02
            </Text>
          </View>
        </View>

        {/* Chat Section - Placeholder */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="chat" size={22} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Group Chat</Text>
          </View>

          <View style={styles.placeholderCard}>
            {celebration.chat_room ? (
              <Text style={styles.chatIdText}>
                Chat room ready: {celebration.chat_room.id.substring(0, 8)}...
              </Text>
            ) : (
              <Text style={styles.chatIdText}>Chat room not available</Text>
            )}
            <Text style={styles.placeholderText}>
              Real-time chat coming in Phase 02-02
            </Text>
          </View>
        </View>

        {/* Gift Leader History */}
        {celebration.gift_leader_history && celebration.gift_leader_history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="history" size={22} color="#6b7280" />
              <Text style={styles.sectionTitle}>Gift Leader History</Text>
            </View>

            <View style={styles.historyCard}>
              {celebration.gift_leader_history.map((entry, index) => (
                <View key={entry.id} style={styles.historyItem}>
                  <View style={styles.historyDot} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyName}>
                      {entry.assigned_to_user?.display_name ||
                        entry.assigned_to_user?.full_name ||
                        'Unknown'}
                    </Text>
                    <Text style={styles.historyReason}>
                      {entry.reason === 'auto_rotation'
                        ? 'Automatically assigned'
                        : entry.reason === 'manual_reassign'
                          ? `Reassigned by ${entry.assigned_by_user?.display_name || 'admin'}`
                          : 'Member left group'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(entry.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Reassign Modal */}
      <Modal
        visible={reassignModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReassignModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reassign Gift Leader</Text>
            <Pressable onPress={() => setReassignModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>

          <Text style={styles.modalSubtitle}>
            Select a group member to become the new Gift Leader
          </Text>

          <ScrollView style={styles.memberList}>
            {eligibleMembers.map(member => {
              const isCurrentLeader = member.user_id === celebration?.gift_leader_id;
              const memberName = member.user?.display_name ||
                member.user?.full_name ||
                'Unknown';

              return (
                <Pressable
                  key={member.user_id}
                  style={[
                    styles.memberItem,
                    isCurrentLeader && styles.memberItemDisabled,
                  ]}
                  onPress={() => !isCurrentLeader && handleReassign(member.user_id)}
                  disabled={isCurrentLeader || reassigning}
                >
                  {member.user?.avatar_url ? (
                    <Image
                      source={{ uri: member.user.avatar_url }}
                      style={styles.memberAvatar}
                    />
                  ) : (
                    <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
                      <Text style={styles.memberAvatarText}>
                        {memberName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{memberName}</Text>
                    {isCurrentLeader && (
                      <Text style={styles.currentLeaderText}>Current Gift Leader</Text>
                    )}
                    {member.role === 'admin' && !isCurrentLeader && (
                      <Text style={styles.adminText}>Admin</Text>
                    )}
                  </View>
                  {!isCurrentLeader && !reassigning && (
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                  )}
                  {reassigning && (
                    <ActivityIndicator size="small" color="#8B1538" />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#8B1538',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    backgroundColor: '#8B1538',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '600',
  },
  celebrantName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#6b7280',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  groupText: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  giftLeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  giftLeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  leaderAvatarPlaceholder: {
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderDetails: {
    flex: 1,
    gap: 8,
  },
  leaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  leaderMessage: {
    flexDirection: 'row',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  leaderMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#8B1538',
    lineHeight: 20,
  },
  reassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  reassignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B1538',
  },
  placeholderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
    fontStyle: 'italic',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  chatIdText: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B1538',
    marginTop: 6,
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  historyReason: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    padding: 16,
    paddingTop: 8,
  },
  memberList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  memberItemDisabled: {
    opacity: 0.5,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  memberAvatarPlaceholder: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  currentLeaderText: {
    fontSize: 13,
    color: '#8B1538',
    marginTop: 2,
  },
  adminText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});
