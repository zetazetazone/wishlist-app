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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  checkCalendarPermission,
  requestCalendarPermission,
  syncAllBirthdays,
  getSyncSummary,
  type GroupBirthday,
  type SyncResult,
} from '../../utils/deviceCalendar';

interface CalendarSyncButtonProps {
  birthdays: GroupBirthday[];
  onSyncComplete?: (results: SyncResult[]) => void;
  style?: object;
}

export function CalendarSyncButton({
  birthdays,
  onSyncComplete,
  style,
}: CalendarSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  const handleSync = useCallback(async () => {
    if (birthdays.length === 0) {
      Alert.alert(
        'No Birthdays to Sync',
        'There are no birthdays in your groups to sync to your calendar.',
        [{ text: 'OK' }]
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
            'Permission Required',
            'Calendar access is required to sync birthdays. Please enable calendar access in your device settings.',
            [{ text: 'OK' }]
          );
          setSyncing(false);
          return;
        }
      }

      // Sync all birthdays (dates can be strings, deviceCalendar handles conversion)
      const results = await syncAllBirthdays(birthdays);

      const summary = getSyncSummary(results);

      if (summary.failed === 0) {
        Alert.alert(
          'Sync Complete',
          `Successfully synced ${summary.success} birthday${summary.success > 1 ? 's' : ''} to your calendar.`,
          [{ text: 'OK' }]
        );
        setSyncComplete(true);
      } else if (summary.success === 0) {
        Alert.alert(
          'Sync Failed',
          'Failed to sync birthdays to your calendar. Please try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Partial Sync',
          `Synced ${summary.success} of ${summary.total} birthdays. ${summary.failed} failed.`,
          [{ text: 'OK' }]
        );
        setSyncComplete(true);
      }

      // Call callback if provided
      onSyncComplete?.(results);
    } catch (error) {
      console.error('Calendar sync error:', error);
      Alert.alert(
        'Sync Error',
        error instanceof Error ? error.message : 'An unexpected error occurred.',
        [{ text: 'OK' }]
      );
    } finally {
      setSyncing(false);
    }
  }, [birthdays, onSyncComplete]);

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
          <Text style={styles.buttonText}>Syncing...</Text>
        </>
      ) : (
        <>
          <MaterialCommunityIcons
            name={syncComplete ? 'check-circle' : 'calendar-sync'}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.buttonText}>
            {syncComplete ? 'Synced!' : 'Sync to Calendar'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// Compact version for header placement
export function CalendarSyncIconButton({
  birthdays,
  onSyncComplete,
  style,
}: CalendarSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  const handleSync = useCallback(async () => {
    if (birthdays.length === 0) {
      Alert.alert(
        'No Birthdays',
        'There are no birthdays in your groups to sync.',
        [{ text: 'OK' }]
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
            'Permission Required',
            'Calendar access is required. Please enable it in Settings.',
            [{ text: 'OK' }]
          );
          setSyncing(false);
          return;
        }
      }

      // Sync all birthdays (dates can be strings, deviceCalendar handles conversion)
      const results = await syncAllBirthdays(birthdays);

      const summary = getSyncSummary(results);

      if (summary.failed === 0) {
        Alert.alert('Success', `Synced ${summary.success} birthdays!`, [{ text: 'OK' }]);
        setSyncComplete(true);
      } else {
        Alert.alert(
          summary.success > 0 ? 'Partial Sync' : 'Failed',
          summary.success > 0
            ? `${summary.success}/${summary.total} synced`
            : 'Could not sync birthdays',
          [{ text: 'OK' }]
        );
      }

      onSyncComplete?.(results);
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', 'Failed to sync. Please try again.', [{ text: 'OK' }]);
    } finally {
      setSyncing(false);
    }
  }, [birthdays, onSyncComplete]);

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
