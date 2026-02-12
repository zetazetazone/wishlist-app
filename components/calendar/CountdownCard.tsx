/**
 * CountdownCard Component
 * Display countdown to an upcoming birthday with urgency coloring
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { GroupBirthday } from '../../lib/birthdays';
import { type FriendDate, FRIEND_DATE_COLOR } from '../../lib/friendDates';
import { getPlanningStatus, getStatusColor, type PlanningStatus } from '../../utils/countdown';

type CalendarEvent = GroupBirthday | FriendDate;

interface CountdownCardProps {
  birthday: CalendarEvent;
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
  const { t } = useTranslation();
  const status = getPlanningStatus(daysUntil);
  const statusColor = getStatusColor(status);

  // Localized countdown text
  const getCountdownText = (days: number): string => {
    if (days === 0) return t('calendar.countdown.today');
    if (days === 1) return t('calendar.countdown.tomorrow');
    if (days === -1) return t('calendar.countdown.invalidDate');
    return t('calendar.countdown.daysCount', { count: days });
  };

  const countdownText = getCountdownText(daysUntil);

  // Type guard to check if event is a friend date
  const isFriendDate = (event: CalendarEvent): event is FriendDate => {
    return 'source' in event && event.source === 'friend';
  };

  // Derive display values based on type
  const isFromFriend = isFriendDate(birthday);

  // Get display name (person's name)
  const displayName = isFromFriend
    ? birthday.title
    : birthday.userName;

  // Get source label for badge
  const sourceLabel = isFromFriend
    ? (birthday.type === 'birthday' ? t('calendar.countdown.friend') : birthday.friendName)
    : birthday.groupName;

  // Get color for source indicator
  const sourceColor = isFromFriend
    ? FRIEND_DATE_COLOR
    : birthday.groupColor;

  // Get icon for type
  const typeIcon = isFromFriend && birthday.type === 'public_date'
    ? 'calendar-heart'  // Special icon for friend public dates
    : undefined;        // Default icons from status

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

  // Get localized status label
  const getStatusLabel = (s: PlanningStatus): string => {
    switch (s) {
      case 'urgent':
        return t('calendar.countdown.urgent');
      case 'soon':
        return t('calendar.countdown.comingSoon');
      case 'planning':
        return t('calendar.countdown.planAhead');
      case 'future':
        return t('calendar.countdown.onRadar');
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
          {displayName}
        </Text>
        <View style={styles.groupRow}>
          <View style={[styles.groupDot, { backgroundColor: sourceColor }]} />
          <Text style={styles.groupName} numberOfLines={1}>
            {sourceLabel}
          </Text>
          {isFromFriend && (
            <View style={[styles.sourceBadge, { backgroundColor: `${FRIEND_DATE_COLOR}15` }]}>
              <Text style={[styles.sourceBadgeText, { color: FRIEND_DATE_COLOR }]}>
                {birthday.type === 'birthday' ? t('calendar.countdown.birthdayLabel') : t('calendar.countdown.dateLabel')}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.statusLabel, { color: statusColor }]}>
          {getStatusLabel(status)}
        </Text>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.countdownText, { color: statusColor }]}>
          {countdownText}
        </Text>
        {daysUntil > 1 && (
          <Text style={styles.daysLabel}>
            {t('calendar.countdown.daysLeft')}
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
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
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
