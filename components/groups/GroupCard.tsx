import { View, Text, TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Group } from '../../types';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface GroupCardProps {
  group: Group & { member_count?: number };
  onPress: () => void;
  index?: number;
}

export default function GroupCard({ group, onPress, index = 0 }: GroupCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: index * 100 }}
    >
      <TouchableOpacity
        onPress={onPress}
        style={{
          backgroundColor: colors.white,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.md,
          borderWidth: 2,
          borderColor: colors.gold[100],
          ...shadows.md,
        }}
        activeOpacity={0.7}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: spacing.sm,
          }}
        >
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.burgundy[800],
                marginBottom: spacing.xs,
              }}
            >
              {group.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="cash"
                size={16}
                color={colors.gold[600]}
                style={{ marginRight: spacing.xs }}
              />
              <Text
                style={{
                  color: colors.burgundy[600],
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                ${group.budget_limit_per_gift} per gift
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: colors.burgundy[50],
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: borderRadius.sm,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.burgundy[100],
            }}
          >
            <MaterialCommunityIcons
              name="account-multiple"
              size={14}
              color={colors.burgundy[700]}
              style={{ marginRight: 4 }}
            />
            <Text
              style={{
                color: colors.burgundy[700],
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {group.member_count || 0}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}
