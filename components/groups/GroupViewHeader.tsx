import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GroupAvatar } from './GroupAvatar';
import { GroupModeBadge } from './GroupModeBadge';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface GroupViewHeaderProps {
  group: {
    name: string;
    description?: string | null;
    photo_url?: string | null;
    mode: 'greetings' | 'gifts';
  };
  memberCount: number;
  onBack: () => void;
}

export function GroupViewHeader({
  group,
  memberCount,
  onBack,
}: GroupViewHeaderProps) {
  return (
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
        {/* Back Button */}
        <View style={{ marginBottom: spacing.md }}>
          <TouchableOpacity
            onPress={onBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: borderRadius.full,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>

        {/* Group Avatar */}
        <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
          <GroupAvatar
            group={{ name: group.name, photo_url: group.photo_url ?? null }}
            size="2xl"
          />
        </View>

        {/* Group Name */}
        <Text
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: colors.white,
            textAlign: 'center',
            marginBottom: spacing.xs,
          }}
        >
          {group.name}
        </Text>

        {/* Group Description (optional) */}
        {group.description && (
          <Text
            style={{
              fontSize: 14,
              color: colors.gold[200],
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
            numberOfLines={2}
          >
            {group.description}
          </Text>
        )}

        {/* Mode Badge and Member Count Row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.md,
            marginTop: spacing.sm,
          }}
        >
          <GroupModeBadge mode={group.mode} />

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons
              name="account-multiple"
              size={16}
              color={colors.gold[200]}
              style={{ marginRight: spacing.xs }}
            />
            <Text
              style={{
                fontSize: 14,
                color: colors.gold[200],
                fontWeight: '500',
              }}
            >
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </View>
      </MotiView>
    </LinearGradient>
  );
}

export default GroupViewHeader;
