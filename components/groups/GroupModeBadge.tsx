import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface GroupModeBadgeProps {
  mode: 'greetings' | 'gifts';
}

const modeConfig = {
  gifts: {
    icon: 'gift' as const,
    text: 'Gifts',
    bgColor: colors.burgundy[100],
    textColor: colors.burgundy[700],
    iconColor: colors.burgundy[600],
  },
  greetings: {
    icon: 'party-popper' as const,
    text: 'Greetings',
    bgColor: colors.gold[100],
    textColor: colors.gold[700],
    iconColor: colors.gold[600],
  },
};

export function GroupModeBadge({ mode }: GroupModeBadgeProps) {
  const config = modeConfig[mode];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: config.bgColor,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
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

export default GroupModeBadge;
