/**
 * CalendarSyncButton Component
 * Button to sync all birthdays to the device calendar
 */

import React, { useState, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  checkCalendarPermission,
  requestCalendarPermission,
  syncAllCalendarEvents,
  getSyncSummary,
  type GroupBirthday,
  type FriendDate,
  type SyncResult,
} from '../../utils/deviceCalendar';

interface CalendarSyncButtonProps {
  birthdays: GroupBirthday[];
  friendDates?: FriendDate[];
  onSyncComplete?: (results: SyncResult[]) => void;
  style?: object;
}

export function CalendarSyncButton({
  birthdays,
  friendDates = [],
  onSyncComplete,
  style,
}: CalendarSyncButtonProps) {
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  const handleSync = useCallback(async () => {
    if (birthdays.length === 0 && friendDates.length === 0) {
      Alert.alert(
        t('calendar.sync.noEventsTitle'),
        t('calendar.sync.noEventsMessage'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    setSyncing(true);

    try {
      // Check if we have permission
      const hasPermission = await checkCalendarPermission();

      if (!hasPermission) {
        // Request permission
        const granted = await requestCalendarPermission();

        if (!granted) {
          Alert.alert(
            t('calendar.sync.permissionTitle'),
            t('calendar.sync.permissionMessage'),
            [{ text: t('common.ok') }]
          );
          setSyncing(false);
          return;
        }
      }

      // Sync all calendar events (group birthdays + friend dates)
      const results = await syncAllCalendarEvents(birthdays, friendDates);

      const summary = getSyncSummary(results);

      if (summary.failed === 0) {
        Alert.alert(
          t('calendar.sync.completeTitle'),
          t('calendar.sync.completeMessage', { count: summary.success }),
          [{ text: t('common.ok') }]
        );
        setSyncComplete(true);
      } else if (summary.success === 0) {
        Alert.alert(
          t('calendar.sync.failedTitle'),
          t('calendar.sync.failedMessage'),
          [{ text: t('common.ok') }]
        );
      } else {
        Alert.alert(
          t('calendar.sync.partialTitle'),
          t('calendar.sync.partialMessage', { success: summary.success, total: summary.total, failed: summary.failed }),
          [{ text: t('common.ok') }]
        );
        setSyncComplete(true);
      }

      // Call callback if provided
      onSyncComplete?.(results);
    } catch (error) {
      console.error('Calendar sync error:', error);
      Alert.alert(
        t('calendar.sync.errorTitle'),
        error instanceof Error ? error.message : t('calendar.sync.errorMessage'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setSyncing(false);
    }
  }, [birthdays, friendDates, onSyncComplete, t]);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        syncComplete && styles.buttonComplete,
        syncing && styles.buttonDisabled,
        style,
      ]}
      onPress={handleSync}
      disabled={syncing}
      activeOpacity={0.7}
    >
      {syncing ? (
        <>
          <ActivityIndicator size="small" color="#ffffff" />
          <Text style={styles.buttonText}>{t('calendar.sync.syncing')}</Text>
        </>
      ) : (
        <>
          <MaterialCommunityIcons
            name={syncComplete ? 'check-circle' : 'calendar-sync'}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.buttonText}>
            {syncComplete ? t('calendar.sync.synced') : t('calendar.sync.syncToCalendar')}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// Compact version for header placement
export function CalendarSyncIconButton({
  birthdays,
  friendDates = [],
  onSyncComplete,
  style,
}: CalendarSyncButtonProps) {
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  const handleSync = useCallback(async () => {
    if (birthdays.length === 0 && friendDates.length === 0) {
      Alert.alert(
        t('calendar.sync.noEventsShort'),
        t('calendar.sync.noEventsMessage'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    setSyncing(true);

    try {
      const hasPermission = await checkCalendarPermission();

      if (!hasPermission) {
        const granted = await requestCalendarPermission();
        if (!granted) {
          Alert.alert(
            t('calendar.sync.permissionTitle'),
            t('calendar.sync.permissionShortMessage'),
            [{ text: t('common.ok') }]
          );
          setSyncing(false);
          return;
        }
      }

      // Sync all calendar events (group birthdays + friend dates)
      const results = await syncAllCalendarEvents(birthdays, friendDates);

      const summary = getSyncSummary(results);

      if (summary.failed === 0) {
        Alert.alert(t('common.success'), t('calendar.sync.syncedCount', { count: summary.success }), [{ text: t('common.ok') }]);
        setSyncComplete(true);
      } else {
        Alert.alert(
          summary.success > 0 ? t('calendar.sync.partialTitle') : t('calendar.sync.failedShort'),
          summary.success > 0
            ? t('calendar.sync.partialShort', { success: summary.success, total: summary.total })
            : t('calendar.sync.couldNotSync'),
          [{ text: t('common.ok') }]
        );
      }

      onSyncComplete?.(results);
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert(t('common.error'), t('calendar.sync.tryAgain'), [{ text: t('common.ok') }]);
    } finally {
      setSyncing(false);
    }
  }, [birthdays, friendDates, onSyncComplete, t]);

  return (
    <TouchableOpacity
      style={[styles.iconButton, style]}
      onPress={handleSync}
      disabled={syncing}
      activeOpacity={0.7}
    >
      {syncing ? (
        <ActivityIndicator size="small" color="#8B1538" />
      ) : (
        <MaterialCommunityIcons
          name={syncComplete ? 'check-circle' : 'calendar-sync'}
          size={24}
          color={syncComplete ? '#22c55e' : '#8B1538'}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B1538',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonComplete: {
    backgroundColor: '#22c55e',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    padding: 8,
  },
});

export default CalendarSyncButton;
