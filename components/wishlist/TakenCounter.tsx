import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface TakenCounterProps {
  takenCount: number;
  totalCount: number;
}

/**
 * TakenCounter - Displays "X of Y items taken" for celebrant view
 *
 * Shows the celebrant how many of their wishlist items have been claimed
 * without revealing who claimed them. Builds anticipation.
 *
 * Per CONTEXT: "Show count: X of Y items taken visible to celebrant - builds anticipation"
 */
export function TakenCounter({ takenCount, totalCount }: TakenCounterProps) {
  // Don't render if no items
  if (totalCount === 0) return null;

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.gold[50],
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    }}>
      <MaterialCommunityIcons name="gift" size={16} color={colors.gold[600]} />
      <Text style={{
        marginLeft: spacing.xs,
        color: colors.gold[700],
        fontSize: 13,
        fontWeight: '600',
      }}>
        {takenCount} of {totalCount} items taken
      </Text>
    </View>
  );
}
