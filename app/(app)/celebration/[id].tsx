/**
 * Celebration Detail Screen
 * Shows celebration info, Gift Leader section, contributions, and chat
 *
 * Layout:
 * 1. Header Card - Celebrant info, event date, status
 * 2. Gift Leader Section - Current leader with reassign option
 * 3. Contribution Section - Progress bar and contributor list
 * 4. Chat Section - Real-time messages (takes remaining space)
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
  KeyboardAvoidingView,
  Platform,
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
import { getChatRoomForCelebration, sendMessage } from '../../../lib/chat';
import {
  getContributions,
  getCurrentUserContribution,
  type Contribution,
} from '../../../lib/contributions';
import { GiftLeaderBadge } from '../../../components/celebrations/GiftLeaderBadge';
import { ContributionProgress } from '../../../components/celebrations/ContributionProgress';
import { ContributionModal } from '../../../components/celebrations/ContributionModal';
import { ChatList } from '../../../components/chat/ChatList';
import { ChatInput } from '../../../components/chat/ChatInput';
import { getFavoriteForGroup } from '../../../lib/favorites';
import { getWishlistItemsByUserId, WishlistItem } from '../../../lib/wishlistItems';
import LuxuryWishlistCard from '../../../components/wishlist/LuxuryWishlistCard';

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

  // Celebration state
  const [celebration, setCelebration] = useState<CelebrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Gift Leader state
  const [reassignModalVisible, setReassignModalVisible] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  // Contributions state
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [userContribution, setUserContribution] = useState<Contribution | null>(null);
  const [contributionsLoading, setContributionsLoading] = useState(true);
  const [contributionModalVisible, setContributionModalVisible] = useState(false);

  // Chat state
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  // Celebrant wishlist state
  const [celebrantItems, setCelebrantItems] = useState<WishlistItem[]>([]);
  const [celebrantFavoriteId, setCelebrantFavoriteId] = useState<string | null>(null);
  const [wishlistLoading, setWishlistLoading] = useState(true);

  // View mode: 'info' shows header/contributions, 'chat' shows full chat
  const [viewMode, setViewMode] = useState<'info' | 'chat'>('info');

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

      // Get chat room
      const chatRoom = await getChatRoomForCelebration(id);
      if (chatRoom) {
        setChatRoomId(chatRoom.id);
      } else {
        setChatError('Chat not available for this celebration');
      }
    } catch (err) {
      console.error('Failed to load celebration:', err);
      setError(err instanceof Error ? err.message : 'Failed to load celebration');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load contributions
  const loadContributions = useCallback(async () => {
    if (!id) return;

    try {
      setContributionsLoading(true);
      const [allContributions, myContribution] = await Promise.all([
        getContributions(id),
        getCurrentUserContribution(id),
      ]);
      setContributions(allContributions);
      setUserContribution(myContribution);
    } catch (err) {
      console.error('Failed to load contributions:', err);
    } finally {
      setContributionsLoading(false);
    }
  }, [id]);

  // Load celebrant's wishlist items and their favorite
  const loadCelebrantWishlist = useCallback(async () => {
    if (!celebration?.celebrant_id || !celebration?.group_id) return;

    setWishlistLoading(true);
    try {
      const [items, favoriteId] = await Promise.all([
        getWishlistItemsByUserId(celebration.celebrant_id),
        getFavoriteForGroup(celebration.celebrant_id, celebration.group_id),
      ]);
      setCelebrantItems(items);
      setCelebrantFavoriteId(favoriteId);
    } catch (err) {
      console.error('Failed to load celebrant wishlist:', err);
    } finally {
      setWishlistLoading(false);
    }
  }, [celebration?.celebrant_id, celebration?.group_id]);

  useEffect(() => {
    loadCelebration();
    loadContributions();
  }, [loadCelebration, loadContributions]);

  // Load celebrant wishlist when celebration is loaded
  useEffect(() => {
    if (celebration) {
      loadCelebrantWishlist();
    }
  }, [celebration, loadCelebrantWishlist]);

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

  // Handle sending chat message
  const handleSendMessage = async (content: string) => {
    if (!chatRoomId) {
      Alert.alert('Error', 'Chat not available');
      return;
    }

    try {
      await sendMessage(chatRoomId, content);
    } catch (err) {
      console.error('Failed to send message:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to send message'
      );
      throw err; // Re-throw so ChatInput can handle
    }
  };

  // Handle contribution modal save
  const handleContributionSave = () => {
    loadContributions(); // Refresh contributions
    loadCelebration(); // Refresh total
  };

  // Navigate to wishlist item (from linked item in chat)
  const handleLinkedItemPress = (itemId: string) => {
    // Navigate to wishlist item detail
    router.push(`/wishlist/${itemId}`);
  };

  // Check if current user is the Gift Leader
  const isCurrentUserGiftLeader =
    currentUserId !== null && celebration?.gift_leader_id === currentUserId;

  // Get eligible members for reassignment (group members except celebrant)
  const eligibleMembers = celebration?.group_members?.filter(
    m => m.user_id !== celebration.celebrant_id
  ) || [];

  // Calculate contribution totals
  const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0);

  // Sort celebrant items with favorite pinned to top
  const sortedCelebrantItems = [...celebrantItems].sort((a, b) => {
    if (a.id === celebrantFavoriteId) return -1;
    if (b.id === celebrantFavoriteId) return 1;
    return (b.priority || 0) - (a.priority || 0);
  });

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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.toggleButton, viewMode === 'info' && styles.toggleButtonActive]}
            onPress={() => setViewMode('info')}
          >
            <MaterialCommunityIcons
              name="information"
              size={18}
              color={viewMode === 'info' ? '#8B1538' : '#6b7280'}
            />
            <Text style={[styles.toggleText, viewMode === 'info' && styles.toggleTextActive]}>
              Info
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, viewMode === 'chat' && styles.toggleButtonActive]}
            onPress={() => setViewMode('chat')}
          >
            <MaterialCommunityIcons
              name="chat"
              size={18}
              color={viewMode === 'chat' ? '#8B1538' : '#6b7280'}
            />
            <Text style={[styles.toggleText, viewMode === 'chat' && styles.toggleTextActive]}>
              Chat
            </Text>
          </Pressable>
        </View>

        {viewMode === 'info' ? (
          // INFO VIEW: Header, Gift Leader, Contributions
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

            {/* Contributions Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="cash-multiple" size={22} color="#22c55e" />
                <Text style={styles.sectionTitle}>Contributions</Text>
              </View>

              {contributionsLoading ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="small" color="#8B1538" />
                </View>
              ) : (
                <>
                  <ContributionProgress
                    totalContributed={totalContributed}
                    targetAmount={celebration.target_amount}
                    contributorCount={contributions.length}
                  />

                  {/* Your Contribution Card */}
                  <Pressable
                    style={styles.yourContributionCard}
                    onPress={() => setContributionModalVisible(true)}
                  >
                    <View style={styles.yourContributionInfo}>
                      <MaterialCommunityIcons
                        name={userContribution ? 'check-circle' : 'plus-circle-outline'}
                        size={24}
                        color={userContribution ? '#22c55e' : '#8B1538'}
                      />
                      <View style={styles.yourContributionText}>
                        <Text style={styles.yourContributionLabel}>
                          {userContribution ? 'Your Contribution' : 'Add Your Contribution'}
                        </Text>
                        {userContribution && (
                          <Text style={styles.yourContributionAmount}>
                            ${userContribution.amount.toFixed(2)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                  </Pressable>

                  {/* Contributors List */}
                  {contributions.length > 0 && (
                    <View style={styles.contributorsList}>
                      <Text style={styles.contributorsTitle}>
                        Contributors ({contributions.length})
                      </Text>
                      {contributions.slice(0, 5).map(contribution => {
                        const name = contribution.contributor?.display_name || 'Unknown';
                        const isYou = contribution.user_id === currentUserId;
                        return (
                          <View key={contribution.id} style={styles.contributorRow}>
                            {contribution.contributor?.avatar_url ? (
                              <Image
                                source={{ uri: contribution.contributor.avatar_url }}
                                style={styles.contributorAvatar}
                              />
                            ) : (
                              <View style={[styles.contributorAvatar, styles.contributorAvatarPlaceholder]}>
                                <Text style={styles.contributorInitial}>
                                  {name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <Text style={styles.contributorName}>
                              {isYou ? 'You' : name}
                            </Text>
                            <Text style={styles.contributorAmount}>
                              ${contribution.amount.toFixed(2)}
                            </Text>
                          </View>
                        );
                      })}
                      {contributions.length > 5 && (
                        <Text style={styles.moreContributors}>
                          +{contributions.length - 5} more contributors
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Celebrant's Wishlist Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="gift" size={22} color="#8B1538" />
                <Text style={styles.sectionTitle}>{celebrantName}'s Wishlist</Text>
              </View>

              {wishlistLoading ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="small" color="#8B1538" />
                </View>
              ) : sortedCelebrantItems.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No wishlist items yet</Text>
                </View>
              ) : (
                <View style={styles.wishlistContainer}>
                  {sortedCelebrantItems.map((item, index) => (
                    <LuxuryWishlistCard
                      key={item.id}
                      item={item}
                      index={index}
                      isFavorite={item.id === celebrantFavoriteId}
                      showFavoriteHeart={false}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Gift Leader History (Collapsible) */}
            {celebration.gift_leader_history && celebration.gift_leader_history.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="history" size={22} color="#6b7280" />
                  <Text style={styles.sectionTitle}>Gift Leader History</Text>
                </View>

                <View style={styles.historyCard}>
                  {celebration.gift_leader_history.slice(0, 3).map((entry) => (
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

            {/* Quick Chat Preview */}
            <Pressable
              style={styles.chatPreviewCard}
              onPress={() => setViewMode('chat')}
            >
              <MaterialCommunityIcons name="chat" size={24} color="#3b82f6" />
              <View style={styles.chatPreviewText}>
                <Text style={styles.chatPreviewTitle}>Group Chat</Text>
                <Text style={styles.chatPreviewSubtitle}>
                  {chatRoomId ? 'Tap to join the conversation' : 'Chat not available'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </Pressable>
          </ScrollView>
        ) : (
          // CHAT VIEW: Full screen chat
          <View style={styles.chatContainer}>
            {chatError ? (
              <View style={styles.chatErrorContainer}>
                <MaterialCommunityIcons name="chat-remove-outline" size={48} color="#ef4444" />
                <Text style={styles.chatErrorText}>{chatError}</Text>
                <Text style={styles.chatErrorSubtext}>
                  You cannot view this celebration's chat
                </Text>
              </View>
            ) : chatRoomId ? (
              <>
                <ChatList
                  chatRoomId={chatRoomId}
                  onLinkedItemPress={handleLinkedItemPress}
                />
                <ChatInput
                  onSend={handleSendMessage}
                  disabled={celebration.status === 'completed'}
                  placeholder={
                    celebration.status === 'completed'
                      ? 'Chat is closed for completed celebrations'
                      : 'Type a message...'
                  }
                />
              </>
            ) : (
              <View style={styles.chatLoadingContainer}>
                <ActivityIndicator size="large" color="#8B1538" />
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Reassign Gift Leader Modal */}
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

      {/* Contribution Modal */}
      <ContributionModal
        isOpen={contributionModalVisible}
        onClose={() => setContributionModalVisible(false)}
        celebrationId={id || ''}
        existingContribution={userContribution}
        onSave={handleContributionSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flex: {
    flex: 1,
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
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#fef2f2',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#8B1538',
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
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  wishlistContainer: {
    gap: 12,
  },
  yourContributionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  yourContributionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yourContributionText: {
    flex: 1,
  },
  yourContributionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  yourContributionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
    marginTop: 2,
  },
  contributorsList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  contributorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contributorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  contributorAvatarPlaceholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contributorInitial: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  contributorName: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  contributorAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  moreContributors: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
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
  chatPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  chatPreviewText: {
    flex: 1,
  },
  chatPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  chatPreviewSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  chatErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  chatErrorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 12,
    textAlign: 'center',
  },
  chatErrorSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  chatLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
