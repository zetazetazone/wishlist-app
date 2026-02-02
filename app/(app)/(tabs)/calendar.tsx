/**
 * Calendar Tab Screen
 * Shows birthday calendar with countdown cards for upcoming celebrations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';

import { supabase } from '../../../lib/supabase';
import { getGroupBirthdays, filterBirthdaysForDate, type GroupBirthday } from '../../../lib/birthdays';
import { getDaysUntilBirthday, filterUpcoming, sortByUpcoming } from '../../../utils/countdown';
import BirthdayCalendar from '../../../components/calendar/BirthdayCalendar';
import CountdownCard from '../../../components/calendar/CountdownCard';

// Planning window in days
const PLANNING_WINDOW_DAYS = 30;

export default function CalendarScreen() {
  const [birthdays, setBirthdays] = useState<GroupBirthday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load birthdays
  const loadBirthdays = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      const data = await getGroupBirthdays(user.id);
      setBirthdays(data);
    } catch (err) {
      console.error('Failed to load birthdays:', err);
      setError(err instanceof Error ? err.message : 'Failed to load birthdays');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadBirthdays();
  }, [loadBirthdays]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadBirthdays();
    }, [loadBirthdays])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBirthdays();
  }, [loadBirthdays]);

  // Handle date selection
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(prev => prev === date ? null : date);
  }, []);

  // Get upcoming birthdays within planning window, sorted by closest
  const upcomingBirthdays = useMemo(() => {
    const upcoming = filterUpcoming(birthdays, PLANNING_WINDOW_DAYS);
    return sortByUpcoming(upcoming);
  }, [birthdays]);

  // Get birthdays for selected date
  const selectedDateBirthdays = useMemo(() => {
    if (!selectedDate) return [];
    return filterBirthdaysForDate(birthdays, selectedDate);
  }, [birthdays, selectedDate]);

  // Render countdown card
  const renderCountdownCard = useCallback(({ item }: { item: GroupBirthday }) => {
    const daysUntil = getDaysUntilBirthday(item.birthday);
    return (
      <CountdownCard
        birthday={item}
        daysUntil={daysUntil}
        // Future: onPress to navigate to celebration
      />
    );
  }, []);

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Birthday Calendar</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B1538" />
          <Text style={styles.loadingText}>Loading birthdays...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Birthday Calendar</Text>
        </View>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText} onPress={loadBirthdays}>
            Tap to retry
          </Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (birthdays.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Birthday Calendar</Text>
        </View>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="calendar-blank" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No birthdays yet</Text>
          <Text style={styles.emptySubtitle}>
            When group members add their birthdays, they'll appear here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Birthday Calendar</Text>
        {upcomingBirthdays.length > 0 && (
          <View style={styles.headerBadge}>
            <MaterialCommunityIcons name="cake-variant" size={16} color="#8B1538" />
            <Text style={styles.headerBadgeText}>
              {upcomingBirthdays.length} upcoming
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B1538"
            colors={['#8B1538']}
          />
        }
      >
        {/* Calendar */}
        <BirthdayCalendar
          birthdays={birthdays}
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
        />

        {/* Selected date birthdays */}
        {selectedDate && selectedDateBirthdays.length > 0 && (
          <View style={styles.selectedSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="calendar-today" size={18} color="#8B1538" />
              <Text style={styles.sectionTitle}>
                {format(new Date(selectedDate), 'MMMM d')}
              </Text>
            </View>
            {selectedDateBirthdays.map((birthday) => {
              const daysUntil = getDaysUntilBirthday(birthday.birthday);
              return (
                <CountdownCard
                  key={`${birthday.userId}-${birthday.groupId}`}
                  birthday={birthday}
                  daysUntil={daysUntil}
                />
              );
            })}
          </View>
        )}

        {/* Selected date but no birthdays */}
        {selectedDate && selectedDateBirthdays.length === 0 && (
          <View style={styles.noBirthdaysSection}>
            <Text style={styles.noBirthdaysText}>
              No birthdays on {format(new Date(selectedDate), 'MMMM d')}
            </Text>
          </View>
        )}

        {/* Upcoming birthdays section */}
        <View style={styles.upcomingSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#8B1538" />
            <Text style={styles.sectionTitle}>
              Coming Up (Next {PLANNING_WINDOW_DAYS} days)
            </Text>
          </View>

          {upcomingBirthdays.length === 0 ? (
            <View style={styles.noUpcoming}>
              <Text style={styles.noUpcomingText}>
                No birthdays in the next {PLANNING_WINDOW_DAYS} days
              </Text>
            </View>
          ) : (
            <View style={styles.upcomingList}>
              {upcomingBirthdays.map((birthday) => {
                const daysUntil = getDaysUntilBirthday(birthday.birthday);
                return (
                  <CountdownCard
                    key={`upcoming-${birthday.userId}-${birthday.groupId}`}
                    birthday={birthday}
                    daysUntil={daysUntil}
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Bottom padding for scroll */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B1538',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryText: {
    marginTop: 8,
    fontSize: 14,
    color: '#8B1538',
    textDecorationLine: 'underline',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  selectedSection: {
    marginTop: 16,
  },
  upcomingSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  noBirthdaysSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  noBirthdaysText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  upcomingList: {
    paddingTop: 4,
  },
  noUpcoming: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  noUpcomingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  bottomPadding: {
    height: 40,
  },
});
