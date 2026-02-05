import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface YourClaimIndicatorProps {
  style?: ViewStyle;
}

/**
 * YourClaimIndicator - "Your claim" highlight badge
 *
 * A simple badge component that indicates the user's own claim.
 * Follows the MostWantedBadge pattern with burgundy colors.
 * Per CONTEXT: "Your own claims: Highlighted card treatment + Your claim indicator"
 */
export function YourClaimIndicator({ style }: YourClaimIndicatorProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>Your claim</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
