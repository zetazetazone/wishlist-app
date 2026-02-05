import { View, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface TakenBadgeProps {
  style?: ViewStyle;
}

/**
 * TakenBadge - Gift icon badge for celebrant view
 *
 * Shows a gift icon in gold colors to indicate an item has been claimed.
 * Used in celebrant's view where they can see "taken" status but not claimer identity.
 * Per CONTEXT: "Gift icon for taken indicator" (not text badge or checkmark)
 */
export function TakenBadge({ style }: TakenBadgeProps) {
  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons
        name="gift"
        size={18}
        color={colors.gold[600]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gold[100],
    padding: spacing.xs,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TakenBadge;
