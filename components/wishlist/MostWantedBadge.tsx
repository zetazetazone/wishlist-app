import { View, Text } from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface MostWantedBadgeProps {
  groupName?: string; // Optional: show "MOST WANTED in [Group]"
  allGroups?: boolean; // Optional: show "MOST WANTED in all groups"
}

export function MostWantedBadge({ groupName, allGroups }: MostWantedBadgeProps) {
  const getBadgeText = () => {
    if (allGroups) {
      return '♥ MOST WANTED in all groups';
    }
    if (groupName) {
      return `♥ MOST WANTED in ${groupName}`;
    }
    return '♥ MOST WANTED';
  };

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
        {getBadgeText()}
      </Text>
    </View>
  );
}

export default MostWantedBadge;
