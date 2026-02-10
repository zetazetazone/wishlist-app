import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { MatchedUser } from '../../lib/contacts';
import { SearchResult } from '../../lib/discovery';
import { sendFriendRequest } from '../../lib/friends';

interface MatchedContactCardProps {
  /** User data from contact match or search */
  user: MatchedUser | SearchResult;
  /** Callback after status changes (re-fetch list) */
  onStatusChange: () => void;
  /** Index for staggered animation */
  index?: number;
}

/**
 * MatchedContactCard - Card for matched contacts or search results
 *
 * Displays:
 * - Avatar (photo or initials fallback)
 * - Contact name (from device) and display name (from app)
 * - Status-aware action button (Add/Sent/Accept/Friends)
 *
 * Uses staggered fade-in animation for list rendering.
 */
export function MatchedContactCard({ user, onStatusChange, index = 0 }: MatchedContactCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Optimistic UI: locally override status after successful action
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  // Check if this is a MatchedUser (has contactName) or SearchResult (has email)
  const isMatchedUser = 'contactName' in user;
  const contactName = isMatchedUser ? (user as MatchedUser).contactName : null;
  const displayName = user.displayName;
  const avatarUrl = user.avatarUrl;
  // Use local status if set (optimistic), otherwise use server status
  const relationshipStatus = localStatus || user.relationshipStatus;

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // Handle "Add Friend" button press
  const handleAddFriend = async () => {
    setLoading(true);
    try {
      await sendFriendRequest(user.userId);
      // Optimistic UI: immediately show "Sent" without waiting for refresh
      setLocalStatus('pending_outgoing');
      // Still trigger refresh for consistency
      onStatusChange();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to send friend request'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle "Accept" button press - navigate to requests screen
  // Since MatchedUser/SearchResult doesn't include requestId,
  // we direct user to the requests tab to accept
  const handleAccept = () => {
    Alert.alert(
      'Accept Request',
      'Go to Requests to accept this friend request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go to Requests',
          onPress: () => router.push('/requests'),
        },
      ]
    );
  };

  // Render the action button based on relationship status
  const renderActionButton = () => {
    switch (relationshipStatus) {
      case 'none':
        return (
          <TouchableOpacity
            onPress={handleAddFriend}
            disabled={loading}
            style={{
              backgroundColor: colors.success,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              opacity: loading ? 0.7 : 1,
              minWidth: 60,
              alignItems: 'center',
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={{ color: colors.white, fontWeight: '600', fontSize: 14 }}>
                Add
              </Text>
            )}
          </TouchableOpacity>
        );

      case 'pending_outgoing':
        return (
          <View
            style={{
              backgroundColor: colors.gold[100],
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
            }}
          >
            <Text style={{ color: colors.gold[700], fontWeight: '600', fontSize: 14 }}>
              Sent
            </Text>
          </View>
        );

      case 'pending_incoming':
        return (
          <TouchableOpacity
            onPress={handleAccept}
            style={{
              backgroundColor: colors.success,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
            }}
          >
            <Text style={{ color: colors.white, fontWeight: '600', fontSize: 14 }}>
              Accept
            </Text>
          </TouchableOpacity>
        );

      case 'friends':
        return (
          <View
            style={{
              backgroundColor: colors.success + '20',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <MaterialCommunityIcons
              name="check"
              size={16}
              color={colors.success}
              style={{ marginRight: spacing.xs }}
            />
            <Text style={{ color: colors.success, fontWeight: '600', fontSize: 14 }}>
              Friends
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: 100 + index * 50 }}
    >
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          borderWidth: 2,
          borderColor: colors.gold[100],
          marginBottom: spacing.sm,
          ...shadows.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Avatar - Photo or Initials */}
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                marginRight: spacing.md,
              }}
              resizeMode="cover"
            />
          ) : (
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
                {getInitials(displayName)}
              </Text>
            </View>
          )}

          {/* Info Column */}
          <View style={{ flex: 1 }}>
            {/* Contact name from device (if available) - smaller text */}
            {contactName && contactName !== displayName && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.cream[500],
                  fontWeight: '500',
                  marginBottom: 2,
                }}
                numberOfLines={1}
              >
                {contactName}
              </Text>
            )}

            {/* Display name from app - larger text */}
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.burgundy[800],
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>

            {/* Show email for search results */}
            {!isMatchedUser && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.cream[500],
                  fontWeight: '400',
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {(user as SearchResult).email}
              </Text>
            )}
          </View>

          {/* Action Button */}
          {renderActionButton()}
        </View>
      </View>
    </MotiView>
  );
}

export default MatchedContactCard;
