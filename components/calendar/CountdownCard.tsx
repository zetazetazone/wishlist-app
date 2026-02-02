/**
 * CountdownCard Component
 * Display countdown to an upcoming birthday with urgency coloring
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { GroupBirthday } from '../../lib/birthdays';
import { getPlanningStatus, getCountdownText, getStatusColor, type PlanningStatus } from '../../utils/countdown';

interface CountdownCardProps {
  birthday: GroupBirthday;
  daysUntil: number;
  onPress?: () => void;
}

/**
 * Card showing countdown to a birthday
 *
 * Features:
 * - Color-coded by urgency (red/orange/blue/gray)
 * - Shows user name and group
 * - Displays days remaining or "TODAY!"
 * - Optional press handler for navigation
 */
export default function CountdownCard({
  birthday,
  daysUntil,
  onPress,
}: CountdownCardProps) {
  const status = getPlanningStatus(daysUntil);
  const countdownText = getCountdownText(daysUntil);
  const statusColor = getStatusColor(status);

  // Get icon based on status
  const getStatusIcon = (s: PlanningStatus): string => {
    switch (s) {
      case 'urgent':
        return 'alert-circle';
      case 'soon':
        return 'clock-alert';
      case 'planning':
        return 'calendar-clock';
      case 'future':
        return 'calendar-month';
    }
  };

  // Get status label
  const getStatusLabel = (s: PlanningStatus): string => {
    switch (s) {
      case 'urgent':
        return 'Urgent';
      case 'soon':
        return 'Coming Soon';
      case 'planning':
        return 'Plan Ahead';
      case 'future':
        return 'On Radar';
    }
  };

  const CardContent = (
    <View style={[styles.card, { borderLeftColor: statusColor }]}>
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, { backgroundColor: `${statusColor}20` }]}>
          <MaterialCommunityIcons
            name={getStatusIcon(status) as any}
            size={24}
            color={statusColor}
          />
        </View>
      </View>

      <View style={styles.middleSection}>
        <Text style={styles.userName} numberOfLines={1}>
          {birthday.userName}
        </Text>
        <View style={styles.groupRow}>
          <View style={[styles.groupDot, { backgroundColor: birthday.groupColor }]} />
          <Text style={styles.groupName} numberOfLines={1}>
            {birthday.groupName}
          </Text>
        </View>
        <Text style={[styles.statusLabel, { color: statusColor }]}>
          {getStatusLabel(status)}
        </Text>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.countdownText, { color: statusColor }]}>
          {countdownText}
        </Text>
        {daysUntil > 0 && (
          <Text style={styles.daysLabel}>
            {daysUntil === 1 ? '' : 'days left'}
          </Text>
        )}
      </View>

      {onPress && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color="#d1d5db"
          style={styles.chevron}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          pressed && styles.pressed,
        ]}
      >
        {CardContent}
      </Pressable>
    );
  }

  return <View style={styles.wrapper}>{CardContent}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pressable: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leftSection: {
    marginRight: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleSection: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  groupName: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  countdownText: {
    fontSize: 20,
    fontWeight: '700',
  },
  daysLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
});
