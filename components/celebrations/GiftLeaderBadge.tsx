/**
 * Gift Leader Badge Component
 * Shows a badge indicating the Gift Leader role
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface GiftLeaderBadgeProps {
  /** Whether this badge indicates the current user is the Gift Leader */
  isCurrentUser?: boolean;
  /** Whether to show the compact version (just icon + "Leader") */
  compact?: boolean;
  /** Custom style override */
  style?: object;
}

export function GiftLeaderBadge({
  isCurrentUser = false,
  compact = false,
  style,
}: GiftLeaderBadgeProps) {
  const { t } = useTranslation();
  const backgroundColor = isCurrentUser ? '#8B1538' : '#f3f4f6'; // Burgundy or light gray
  const textColor = isCurrentUser ? '#ffffff' : '#4b5563';
  const iconColor = isCurrentUser ? '#ffffff' : '#8B1538';

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor }, style]}>
        <MaterialCommunityIcons name="crown" size={14} color={iconColor} />
        <Text style={[styles.compactText, { color: textColor }]}>{t('celebrations.giftLeader.leader')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <MaterialCommunityIcons name="crown" size={16} color={iconColor} />
      <Text style={[styles.text, { color: textColor }]}>
        {isCurrentUser ? t('celebrations.giftLeader.youAreLeader') : t('celebrations.giftLeader.title')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default GiftLeaderBadge;
