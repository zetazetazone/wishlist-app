import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface ItemTypeBadgeProps {
  itemType: 'standard' | 'surprise_me' | 'mystery_box';
  tier?: 25 | 50 | 100 | null;
}

export function ItemTypeBadge({ itemType, tier }: ItemTypeBadgeProps) {
  // Standard items show no badge
  if (itemType === 'standard') return null;

  const config = {
    surprise_me: {
      icon: 'help-circle' as const,
      text: 'Surprise Me',
      bgColor: colors.burgundy[100],
      textColor: colors.burgundy[700],
      iconColor: colors.burgundy[600],
    },
    mystery_box: {
      icon: 'gift' as const,
      text: tier ? `€${tier} Mystery Box` : 'Mystery Box',
      bgColor: colors.gold[100],
      textColor: colors.gold[700],
      iconColor: colors.gold[600],
    },
  }[itemType];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: config.bgColor,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
        alignSelf: 'flex-start',
        marginBottom: spacing.xs,
      }}
    >
      <MaterialCommunityIcons
        name={config.icon}
        size={14}
        color={config.iconColor}
        style={{ marginRight: spacing.xs }}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: config.textColor,
        }}
      >
        {config.text}
      </Text>
    </View>
  );
}

export default ItemTypeBadge;
