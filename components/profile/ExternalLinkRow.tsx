/**
 * ExternalLinkRow Component
 *
 * Displays a single external wishlist link with platform icon.
 * Supports Amazon, Pinterest, Etsy, and generic link detection.
 *
 * Used in ExternalLinksSection for PROF-05.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { HStack, VStack } from '@gluestack-ui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ExternalLink } from '../../types/database.types';
import { colors, spacing, borderRadius } from '../../constants/theme';

type Platform = 'amazon' | 'pinterest' | 'etsy' | 'other';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface PlatformConfig {
  icon: IconName;
  color: string;
}

// Note: Using cart/basket icons as fallbacks since amazon/pinterest may not exist
const platformConfig: Record<Platform, PlatformConfig> = {
  amazon: { icon: 'cart' as IconName, color: '#FF9900' },
  pinterest: { icon: 'heart' as IconName, color: '#E60023' },
  etsy: { icon: 'store' as IconName, color: '#F56400' },
  other: { icon: 'link-variant' as IconName, color: colors.burgundy[600] },
};

/**
 * Detect platform from URL hostname.
 */
function detectPlatform(url: string): Platform {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('pinterest')) return 'pinterest';
    if (hostname.includes('etsy')) return 'etsy';
    return 'other';
  } catch {
    return 'other';
  }
}

interface ExternalLinkRowProps {
  link: ExternalLink;
  onRemove: () => void;
  onOpen: () => void;
}

export function ExternalLinkRow({ link, onRemove, onOpen }: ExternalLinkRowProps) {
  const platform = detectPlatform(link.url);
  const { icon, color } = platformConfig[platform];

  return (
    <View style={styles.row}>
      <HStack alignItems="center" space="md" flex={1}>
        {/* Platform Icon */}
        <MaterialCommunityIcons name={icon} size={24} color={color} />

        {/* Link Label & URL */}
        <VStack flex={1}>
          <Text style={styles.labelText} numberOfLines={1}>
            {link.label || link.url}
          </Text>
          {link.label && (
            <Text style={styles.urlText} numberOfLines={1}>
              {link.url}
            </Text>
          )}
        </VStack>

        {/* Action Buttons */}
        <HStack space="sm">
          <TouchableOpacity onPress={onOpen} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <MaterialCommunityIcons
              name="open-in-new"
              size={20}
              color={colors.burgundy[600]}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={colors.error}
            />
          </TouchableOpacity>
        </HStack>
      </HStack>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.cream[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.burgundy[800],
  },
  urlText: {
    fontSize: 12,
    color: colors.cream[600],
    marginTop: 2,
  },
});
