import { View, Text } from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

export function MostWantedBadge() {
  return (
    <View
      style={{
        backgroundColor: colors.gold[100],
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginBottom: spacing.xs,
      }}
    >
      <Text
        style={{
          color: colors.gold[700],
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        }}
      >
        MOST WANTED
      </Text>
    </View>
  );
}

export default MostWantedBadge;
