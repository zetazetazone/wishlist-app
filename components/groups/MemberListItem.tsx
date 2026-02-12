import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface MemberListItemProps {
  member: {
    user_id: string;
    role: 'admin' | 'member';
    full_name: string;
    avatar_url: string | null;
  };
  isCurrentUser: boolean;
  isViewerAdmin: boolean;
  onRemove?: () => void;
  onMakeAdmin?: () => void;
}

/**
 * MemberListItem - Row component for member management in group settings
 *
 * Shows:
 * - User avatar (photo or initials fallback)
 * - Full name with "(You)" suffix if current user
 * - Role badge ("Admin" in burgundy)
 * - Action buttons for admin viewers (Remove, Make Admin) on non-self, non-admin members
 */
export function MemberListItem({
  member,
  isCurrentUser,
  isViewerAdmin,
  onRemove,
  onMakeAdmin,
}: MemberListItemProps) {
  const { t } = useTranslation();
  const isAdmin = member.role === 'admin';

  // Show action buttons only when viewer is admin, target is not self, and target is not admin
  const showActions = isViewerAdmin && !isCurrentUser && !isAdmin;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.cream[200],
      }}
    >
      {/* Avatar */}
      {member.avatar_url ? (
        <Image
          source={{ uri: member.avatar_url }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            marginRight: spacing.md,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.burgundy[100],
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.md,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.burgundy[700],
            }}
          >
            {getInitials(member.full_name)}
          </Text>
        </View>
      )}

      {/* Name + Role */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: colors.burgundy[800],
            }}
            numberOfLines={1}
          >
            {member.full_name}
            {isCurrentUser && (
              <Text style={{ color: colors.cream[600], fontWeight: '400' }}>
                {' '}({t('common.you')})
              </Text>
            )}
          </Text>
        </View>
        {isAdmin && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 2,
            }}
          >
            <View
              style={{
                backgroundColor: colors.burgundy[100],
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: borderRadius.sm,
                borderWidth: 1,
                borderColor: colors.burgundy[200],
              }}
            >
              <Text
                style={{
                  color: colors.burgundy[700],
                  fontSize: 10,
                  fontWeight: '700',
                }}
              >
                {t('groups.admin').toUpperCase()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {showActions && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {/* Make Admin Button */}
          {onMakeAdmin && (
            <TouchableOpacity
              onPress={onMakeAdmin}
              activeOpacity={0.7}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: colors.gold[100],
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.gold[300],
              }}
            >
              <MaterialCommunityIcons
                name="shield-account"
                size={18}
                color={colors.gold[800]}
              />
            </TouchableOpacity>
          )}

          {/* Remove Button */}
          {onRemove && (
            <TouchableOpacity
              onPress={onRemove}
              activeOpacity={0.7}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#FEE2E2',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#FECACA',
              }}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={18}
                color={colors.error}
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default MemberListItem;
