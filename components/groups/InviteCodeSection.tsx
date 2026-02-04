import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { regenerateInviteCode } from '../../utils/groups';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';

interface InviteCodeSectionProps {
  inviteCode: string;
  groupId: string;
  groupName: string;
  onCodeRegenerated: (newCode: string) => void;
}

/**
 * Invite code display with copy, share, and regenerate actions.
 * Visible to all group members.
 */
export function InviteCodeSection({
  inviteCode,
  groupId,
  groupName,
  onCodeRegenerated,
}: InviteCodeSectionProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(inviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    } catch (error) {
      console.error('Error copying invite code:', error);
      Alert.alert('Error', 'Failed to copy invite code');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join "${groupName}" on Wishlist App!\n\nInvite Code: ${inviteCode}`,
        title: `Join ${groupName}`,
      });
    } catch (error) {
      console.error('Error sharing invite code:', error);
    }
  };

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Code?',
      'The current code will stop working immediately. Anyone with the old code won\'t be able to join.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setIsRegenerating(true);
            try {
              const { data: newCode, error } = await regenerateInviteCode(groupId);
              if (error) throw error;
              if (newCode) {
                onCodeRegenerated(newCode);
                Alert.alert('Done', 'New invite code generated');
              }
            } catch (error) {
              console.error('Error regenerating invite code:', error);
              Alert.alert('Error', 'Failed to regenerate invite code');
            } finally {
              setIsRegenerating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View>
      {/* Code display area */}
      <View style={styles.codeContainer}>
        <Text style={styles.codeText}>{inviteCode}</Text>
      </View>

      {/* Action buttons row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="content-copy"
            size={18}
            color={colors.white}
          />
          <Text style={styles.actionButtonText}>Copy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="share-variant"
            size={18}
            color={colors.white}
          />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.regenerateButton]}
          onPress={handleRegenerate}
          activeOpacity={0.7}
          disabled={isRegenerating}
        >
          {isRegenerating ? (
            <ActivityIndicator size="small" color={colors.burgundy[700]} />
          ) : (
            <MaterialCommunityIcons
              name="refresh"
              size={18}
              color={colors.burgundy[700]}
            />
          )}
          <Text style={[styles.actionButtonText, styles.regenerateButtonText]}>
            New Code
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info text */}
      <Text style={styles.infoText}>
        Share this code with friends to invite them to the group
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  codeContainer: {
    backgroundColor: colors.burgundy[50],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.burgundy[100],
  },
  codeText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
    color: colors.burgundy[800],
    fontFamily: 'System',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.burgundy[700],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  regenerateButton: {
    backgroundColor: colors.cream[200],
    borderWidth: 1,
    borderColor: colors.burgundy[200],
  },
  regenerateButtonText: {
    color: colors.burgundy[700],
  },
  infoText: {
    fontSize: 12,
    color: colors.cream[600],
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
