import { useState } from 'react';
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

interface Claimer {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ClaimerAvatarProps {
  claimer: Claimer;
  size?: number;
}

/**
 * ClaimerAvatar - Small avatar with name popup on tap
 *
 * Displays a tappable avatar that reveals the claimer's name in a popup.
 * Used in non-celebrant views to show who claimed an item.
 * Per CONTEXT: "Small claimer avatar shown on claimed item cards" and
 * "Tapping shows tooltip/popup with claimer's name"
 */
export function ClaimerAvatar({ claimer, size = 28 }: ClaimerAvatarProps) {
  const [showName, setShowName] = useState(false);

  // Get display initial for placeholder avatar
  const initial = (claimer.display_name || '?').charAt(0).toUpperCase();

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShowName(true)}
        activeOpacity={0.7}
      >
        {claimer.avatar_url ? (
          <Image
            source={{ uri: claimer.avatar_url }}
            style={[
              styles.avatar,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarInitial,
                { fontSize: size * 0.45 },
              ]}
            >
              {initial}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Name popup modal */}
      <Modal
        visible={showName}
        transparent
        animationType="fade"
        onRequestClose={() => setShowName(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowName(false)}
        >
          <View style={styles.tooltipContainer}>
            <Text style={styles.tooltipText}>
              Claimed by {claimer.display_name || 'Unknown'}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 2,
    borderColor: colors.gold[300],
  },
  avatarPlaceholder: {
    backgroundColor: colors.burgundy[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gold[300],
  },
  avatarInitial: {
    color: colors.burgundy[600],
    fontWeight: '600',
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

export default ClaimerAvatar;
