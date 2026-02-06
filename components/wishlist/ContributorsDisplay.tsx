/**
 * ContributorsDisplay Component
 *
 * Horizontal row of contributor avatars with amounts below each.
 * Tap avatar to see contributor's name in a modal.
 * Shows "+N more" indicator for overflow beyond maxVisible.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface Contributor {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  amount: number;
}

interface ContributorsDisplayProps {
  contributors: Contributor[];
  maxVisible?: number; // Default 5, show "+N more" for overflow
}

/**
 * Format currency amount for display.
 */
function formatCurrency(amount: number): string {
  if (amount % 1 === 0) {
    return `$${amount}`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * ContributorsDisplay shows contributor avatars with amounts.
 * Empty state: renders nothing.
 */
export function ContributorsDisplay({
  contributors,
  maxVisible = 5,
}: ContributorsDisplayProps) {
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);

  // Don't render anything if no contributors
  if (!contributors || contributors.length === 0) {
    return null;
  }

  // Split into visible and overflow
  const visibleContributors = contributors.slice(0, maxVisible);
  const overflowCount = contributors.length - maxVisible;

  return (
    <View style={styles.container}>
      {visibleContributors.map((contributor) => {
        const initial = (contributor.display_name || '?').charAt(0).toUpperCase();

        return (
          <View key={contributor.id} style={styles.contributorItem}>
            <TouchableOpacity
              onPress={() => setSelectedContributor(contributor)}
              activeOpacity={0.7}
            >
              {contributor.avatar_url ? (
                <Image
                  source={{ uri: contributor.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.amountText}>
              {formatCurrency(contributor.amount)}
            </Text>
          </View>
        );
      })}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <View style={styles.overflowItem}>
          <View style={styles.overflowBadge}>
            <Text style={styles.overflowText}>+{overflowCount}</Text>
          </View>
          <Text style={styles.moreText}>more</Text>
        </View>
      )}

      {/* Name popup modal */}
      <Modal
        visible={selectedContributor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedContributor(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedContributor(null)}
        >
          <View style={styles.tooltipContainer}>
            <Text style={styles.tooltipText}>
              {selectedContributor?.display_name || 'Unknown'} contributed{' '}
              {selectedContributor && formatCurrency(selectedContributor.amount)}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  contributorItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.gold[300],
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.burgundy[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gold[300],
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.burgundy[600],
  },
  amountText: {
    fontSize: 12,
    color: colors.cream[600],
    fontWeight: '500',
  },
  overflowItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  overflowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream[200],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.cream[300],
  },
  overflowText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.cream[700],
  },
  moreText: {
    fontSize: 12,
    color: colors.cream[500],
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tooltipContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.md,
  },
  tooltipText: {
    color: colors.burgundy[800],
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ContributorsDisplay;
