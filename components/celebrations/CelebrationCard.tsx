/**
 * Celebration Card Component
 * Displays a celebration in a list with celebrant info and Gift Leader badge
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GiftLeaderBadge } from './GiftLeaderBadge';
import type { Celebration } from '../../lib/celebrations';

interface CelebrationCardProps {
  celebration: Celebration;
  /** Whether the current user is the Gift Leader for this celebration */
  isGiftLeader: boolean;
  /** Callback when card is pressed */
  onPress: () => void;
}

/**
 * Format date as "Month Day" (e.g., "March 15")
 */
function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get status badge info
 */
function getStatusInfo(status: string): { label: string; color: string } {
  switch (status) {
    case 'active':
      return { label: 'Active', color: '#22c55e' }; // Green
    case 'completed':
      return { label: 'Completed', color: '#6b7280' }; // Gray
    case 'upcoming':
    default:
      return { label: 'Upcoming', color: '#3b82f6' }; // Blue
  }
}

export function CelebrationCard({
  celebration,
  isGiftLeader,
  onPress,
}: CelebrationCardProps) {
  const celebrantName = celebration.celebrant?.display_name ||
    celebration.celebrant?.full_name ||
    'Unknown';
  const celebrantAvatar = celebration.celebrant?.avatar_url;
  const eventDate = formatEventDate(celebration.event_date);
  const statusInfo = getStatusInfo(celebration.status);
  const groupName = celebration.group?.name || 'Unknown Group';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {celebrantAvatar ? (
            <Image source={{ uri: celebrantAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {celebrantName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {celebrantName}'s Birthday
          </Text>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="calendar" size={14} color="#6b7280" />
            <Text style={styles.date}>{eventDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="account-group" size={14} color="#6b7280" />
            <Text style={styles.groupName} numberOfLines={1}>{groupName}</Text>
          </View>

          {/* Gift Leader Badge */}
          {isGiftLeader && (
            <View style={styles.badgeContainer}>
              <GiftLeaderBadge isCurrentUser compact />
            </View>
          )}
        </View>

        {/* Right side - Status and chevron */}
        <View style={styles.rightSide}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
        </View>
      </View>

      {/* Progress bar if target amount is set */}
      {celebration.target_amount && celebration.target_amount > 0 && (
        <View style={styles.progressContainer}>
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
            ${celebration.total_contributed?.toFixed(0) || 0} / ${celebration.target_amount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: '#8B1538',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
  },
  groupName: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  badgeContainer: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  rightSide: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'right',
  },
});

export default CelebrationCard;
