import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface YourClaimIndicatorProps {
  style?: ViewStyle;
  claimType?: 'full' | 'split'; // Determines icon and label
}

/**
 * YourClaimIndicator - "Your claim" / "Your split" highlight badge
 *
 * A badge component that indicates the user's own claim.
 * Follows the MostWantedBadge pattern with burgundy colors.
 * Per CONTEXT: "Your own claims: Highlighted card treatment + Your claim indicator"
 *
 * Icon distinction:
 * - full: "gift" icon (wrapped gift)
 * - split: "gift-open" icon (open/shared gift)
 */
export function YourClaimIndicator({
  style,
  claimType = 'full',
}: YourClaimIndicatorProps) {
  const isSplit = claimType === 'split';
  const iconName = isSplit ? 'gift-open' : 'gift';
  const labelText = isSplit ? 'Your split' : 'Your claim';

  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons
        name={iconName}
        size={12}
        color={colors.burgundy[700]}
      />
      <Text style={styles.text}>{labelText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.burgundy[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    color: colors.burgundy[700],
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default YourClaimIndicator;
