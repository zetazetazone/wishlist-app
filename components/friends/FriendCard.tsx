import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { FriendWithProfile } from '../../lib/friends';

interface FriendCardProps {
  friend: FriendWithProfile;
  onPress: () => void;
  onRemove: () => void;
  index?: number; // For staggered animation
}

/**
 * FriendCard - Friend list item component
 *
 * Displays:
 * - Profile photo (56x56 circle) or initials fallback
 * - Display name
 * - "Friends since [date]" formatted text
 * - Three-dot menu button for actions (remove friend)
 *
 * Uses staggered slide-in animation matching group member cards.
 */
export function FriendCard({ friend, onPress, onRemove, index = 0 }: FriendCardProps) {
  const { friend: profile, created_at } = friend;

  // Get initials for avatar fallback
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // Format "Friends since" date
  const formatFriendsSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const displayName = profile?.display_name || 'Unknown';
  const avatarUrl = profile?.avatar_url;
  const friendsSince = formatFriendsSince(created_at);

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'spring', delay: 150 + index * 50 }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
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

          {/* Friend Info Column */}
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

            {/* Row 2: Friends Since */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="heart"
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
                Friends since {friendsSince}
              </Text>
            </View>
          </View>

          {/* Three-dot Menu Button */}
          <TouchableOpacity
            onPress={onRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              padding: spacing.xs,
              marginLeft: spacing.sm,
            }}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={24}
              color={colors.cream[400]}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

export default FriendCard;
