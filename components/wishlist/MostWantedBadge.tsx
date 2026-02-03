import { View, Text } from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface MostWantedBadgeProps {
  groupName?: string; // Optional: show "MOST WANTED in [Group]"
}

export function MostWantedBadge({ groupName }: MostWantedBadgeProps) {
  return (
    <View
      style={{
        backgroundColor: colors.burgundy[100],
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginBottom: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.burgundy[700],
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        }}
        numberOfLines={1}
      >
        {groupName ? `♥ MOST WANTED in ${groupName}` : '♥ MOST WANTED'}
      </Text>
    </View>
  );
}

export default MostWantedBadge;
