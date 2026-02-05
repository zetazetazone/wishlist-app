import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
import { getCountdownText, getPlanningStatus, getStatusColor } from '../../utils/countdown';
import { FavoritePreview } from './FavoritePreview';

interface MemberCardProps {
  member: {
    role: string;
    users: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
  };
  daysUntilBirthday: number;
  favoriteItem?: {
    title: string;
    image_url: string | null;
    item_type: 'standard' | 'surprise_me' | 'mystery_box';
  } | null;
  mode?: 'greetings' | 'gifts';
  onPress: () => void;
  index?: number; // For staggered animation
}

/**
 * MemberCard - Birthday-focused member display component
 *
 * Shows:
 * - Profile photo/initials (56x56 circle)
 * - Full name with optional Admin badge
 * - Birthday countdown with urgency coloring
 * - Optional favorite item preview
 *
 * IMPORTANT: Does NOT show member email (GVIEW-03 requirement)
 */
export function MemberCard({
  member,
  daysUntilBirthday,
  favoriteItem,
  mode,
  onPress,
  index = 0,
}: MemberCardProps) {
  const { users, role } = member;
  const isAdmin = role === 'admin';

  // Get countdown text and urgency-based coloring
  const countdownText = getCountdownText(daysUntilBirthday);
  const planningStatus = getPlanningStatus(daysUntilBirthday);
  const statusColor = getStatusColor(planningStatus);

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

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
          ...shadows.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Avatar - Photo or Initials */}
          {users.avatar_url ? (
            <Image
              source={{ uri: users.avatar_url }}
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
                {getInitials(users.full_name)}
              </Text>
            </View>
          )}

          {/* Member Info Column */}
          <View style={{ flex: 1 }}>
            {/* Row 1: Name + Admin Badge */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: spacing.xs,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.burgundy[800],
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {users.full_name}
              </Text>
              {isAdmin && (
                <View
                  style={{
                    backgroundColor: colors.gold[100],
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 4,
                    borderRadius: borderRadius.sm,
                    borderWidth: 1,
                    borderColor: colors.gold[300],
                    marginLeft: spacing.xs,
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

            {/* Row 2: Birthday Countdown */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="cake-variant"
                size={14}
                color={statusColor}
                style={{ marginRight: spacing.xs }}
              />
              <Text
                style={{
                  fontSize: 13,
                  color: statusColor,
                  fontWeight: '500',
                }}
              >
                {countdownText}
              </Text>
            </View>
          </View>
        </View>

        {/* Favorite Item Preview (if available, hidden in Greetings mode) */}
        {mode !== 'greetings' && favoriteItem && (
          <View style={{ marginTop: spacing.sm }}>
            <FavoritePreview item={favoriteItem} />
          </View>
        )}
      </TouchableOpacity>
    </MotiView>
  );
}

export default MemberCard;
