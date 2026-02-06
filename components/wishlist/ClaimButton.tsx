import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

export type ClaimButtonVariant = 'claim' | 'openSplit' | 'contribute' | 'closeSplit';

interface ClaimButtonProps {
  onClaim: () => void;
  onUnclaim: () => void;
  isClaimed: boolean;
  isYourClaim: boolean;
  loading: boolean;
  disabled?: boolean; // For surprise_me/mystery_box items
  // Split variant props
  variant?: ClaimButtonVariant;
  onOpenSplit?: () => void;
  onContribute?: () => void;
  onCloseSplit?: () => void;
}

/**
 * ClaimButton - Claim/Unclaim button with loading state
 *
 * Visual states:
 * - Not claimed: Gold/success background, "Claim" text
 * - Your claim: Cream background with burgundy border, "Unclaim" text
 * - Claimed by other: Disabled (button shouldn't be shown in this case)
 * - Loading: ActivityIndicator spinner
 * - Disabled: Returns null (for special item types)
 */
export function ClaimButton({
  onClaim,
  onUnclaim,
  isClaimed,
  isYourClaim,
  loading,
  disabled,
  variant,
  onOpenSplit,
  onContribute,
  onCloseSplit,
}: ClaimButtonProps) {
  // Don't render for surprise_me/mystery_box items
  if (disabled) return null;

  // Handle split variants first
  if (variant === 'openSplit' && onOpenSplit) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.openSplitButton, loading && styles.disabledButton]}
        onPress={loading ? undefined : onOpenSplit}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.burgundy[600]} />
        ) : (
          <>
            <MaterialCommunityIcons name="account-group" size={18} color={colors.burgundy[600]} />
            <Text style={styles.openSplitText}>Open for Split</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'contribute' && onContribute) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.contributeButton, loading && styles.disabledButton]}
        onPress={loading ? undefined : onContribute}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <MaterialCommunityIcons name="hand-heart" size={18} color={colors.white} />
            <Text style={styles.contributeText}>Contribute</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'closeSplit' && onCloseSplit) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.closeSplitButton, loading && styles.disabledButton]}
        onPress={loading ? undefined : onCloseSplit}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.burgundy[600]} />
        ) : (
          <>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.burgundy[600]} />
            <Text style={styles.closeSplitText}>Cover Remaining</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  // Standard claim/unclaim logic
  const handlePress = () => {
    if (loading) return;
    if (isClaimed && isYourClaim) {
      // User's own claim - unclaim
      onUnclaim();
    } else if (!isClaimed) {
      // Not claimed - claim
      onClaim();
    }
    // If claimed by someone else, button shouldn't be pressable
  };

  // Determine button text
  const buttonText = loading
    ? ''
    : isClaimed && isYourClaim
      ? 'Unclaim'
      : 'Claim';

  // Determine if this is the unclaim variant (outline style)
  const isUnclaimVariant = isClaimed && isYourClaim;

  // Button is disabled when loading or claimed by someone else
  const isDisabled = loading || (isClaimed && !isYourClaim);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isUnclaimVariant ? styles.unclaimButton : styles.claimButton,
        isDisabled && styles.disabledButton,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isUnclaimVariant ? colors.burgundy[600] : colors.white}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isUnclaimVariant ? styles.unclaimText : styles.claimText,
          ]}
        >
          {buttonText}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    minHeight: 40,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  claimButton: {
    backgroundColor: colors.success,
    ...shadows.sm,
  },
  unclaimButton: {
    backgroundColor: colors.cream[300],
    borderWidth: 2,
    borderColor: colors.burgundy[300],
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  claimText: {
    color: colors.white,
  },
  unclaimText: {
    color: colors.burgundy[700],
  },
  // Split variant styles
  openSplitButton: {
    backgroundColor: colors.cream[100],
    borderWidth: 2,
    borderColor: colors.burgundy[300],
  },
  openSplitText: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.burgundy[600],
  },
  contributeButton: {
    backgroundColor: colors.success,
    ...shadows.sm,
  },
  contributeText: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.white,
  },
  closeSplitButton: {
    backgroundColor: colors.cream[100],
    borderWidth: 2,
    borderColor: colors.burgundy[300],
    borderStyle: 'dashed',
  },
  closeSplitText: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.burgundy[600],
  },
});

export default ClaimButton;
