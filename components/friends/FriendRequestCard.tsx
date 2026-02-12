import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalizedFormat } from '../../hooks/useLocalizedFormat';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { FriendRequestWithProfile } from '../../lib/friends';

interface FriendRequestCardProps {
  request: FriendRequestWithProfile;
  type: 'incoming' | 'outgoing';
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  index?: number; // For staggered animation
}

/**
 * FriendRequestCard - Friend request list item component
 *
 * Displays:
 * - Profile photo (56x56 circle) or initials fallback
 * - Display name
 * - Relative time since request was sent
 * - Action buttons based on request type:
 *   - Incoming: Accept (green) and Decline (outline) buttons
 *   - Outgoing: Cancel (text) button
 *
 * Uses staggered slide-in animation matching FriendCard pattern.
 */
export function FriendRequestCard({
  request,
  type,
  onAccept,
  onDecline,
  onCancel,
  index = 0,
}: FriendRequestCardProps) {
  const { t } = useTranslation();
  const { formatDistanceToNow } = useLocalizedFormat();
  const { profile, created_at } = request;

  // Get initials for avatar fallback
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // Format relative time: "2 hours ago", "3 days ago"
  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return t('common.time.justNow');
    }
  };

  const displayName = profile?.display_name || t('common.unknown');
  const avatarUrl = profile?.avatar_url;
  const relativeTime = getRelativeTime(created_at);

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'spring', delay: 150 + index * 50 }}
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

          {/* Request Info Column */}
          <View style={{ flex: 1 }}>
            {/* Row 1: Name */}
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.burgundy[800],
                marginBottom: spacing.xs,
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>

            {/* Row 2: Relative Time */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={14}
                color={colors.cream[500]}
                style={{ marginRight: spacing.xs }}
              />
              <Text
                style={{
                  fontSize: 13,
                  color: colors.cream[500],
                  fontWeight: '500',
                }}
              >
                {type === 'incoming' ? t('friends.received') : t('friends.sent')} {relativeTime}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: spacing.md,
            gap: spacing.sm,
          }}
        >
          {type === 'incoming' ? (
            <>
              {/* Accept Button */}
              <TouchableOpacity
                onPress={() => onAccept?.(request.id)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.success,
                  borderRadius: borderRadius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                }}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color={colors.white}
                  style={{ marginRight: spacing.xs }}
                />
                <Text
                  style={{
                    color: colors.white,
                    fontWeight: '600',
                    fontSize: 14,
                  }}
                >
                  {t('friends.accept')}
                </Text>
              </TouchableOpacity>

              {/* Decline Button */}
              <TouchableOpacity
                onPress={() => onDecline?.(request.id)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.white,
                  borderRadius: borderRadius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.cream[400],
                }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={colors.cream[600]}
                  style={{ marginRight: spacing.xs }}
                />
                <Text
                  style={{
                    color: colors.cream[600],
                    fontWeight: '600',
                    fontSize: 14,
                  }}
                >
                  {t('friends.decline')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Cancel Button (for outgoing requests) */
            <TouchableOpacity
              onPress={() => onCancel?.(request.id)}
              activeOpacity={0.7}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.white,
                borderRadius: borderRadius.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderWidth: 1,
                borderColor: colors.error,
              }}
            >
              <MaterialCommunityIcons
                name="cancel"
                size={18}
                color={colors.error}
                style={{ marginRight: spacing.xs }}
              />
              <Text
                style={{
                  color: colors.error,
                  fontWeight: '600',
                  fontSize: 14,
                }}
              >
                {t('friends.cancelRequest')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </MotiView>
  );
}

export default FriendRequestCard;
