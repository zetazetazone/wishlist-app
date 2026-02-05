import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface ClaimButtonProps {
  onClaim: () => void;
  onUnclaim: () => void;
  isClaimed: boolean;
  isYourClaim: boolean;
  loading: boolean;
  disabled?: boolean; // For surprise_me/mystery_box items
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
}: ClaimButtonProps) {
  // Don't render for surprise_me/mystery_box items
  if (disabled) return null;

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
});

export default ClaimButton;
