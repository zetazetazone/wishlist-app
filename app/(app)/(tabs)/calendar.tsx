/**
 * Calendar Tab Screen
 * Shows birthday calendar with countdown cards for upcoming celebrations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLocalizedFormat } from '../../../hooks/useLocalizedFormat';

import { supabase } from '../../../lib/supabase';
import { getGroupBirthdays, filterBirthdaysForDate, type GroupBirthday } from '../../../lib/birthdays';
import { getFriendDates, type FriendDate, FRIEND_DATE_COLOR } from '../../../lib/friendDates';
import { getDaysUntilBirthday, filterUpcoming, sortByUpcoming } from '../../../utils/countdown';
import BirthdayCalendar from '../../../components/calendar/BirthdayCalendar';
import CountdownCard from '../../../components/calendar/CountdownCard';
import { CalendarSyncIconButton } from '../../../components/calendar/CalendarSyncButton';

// Planning window in days
const PLANNING_WINDOW_DAYS = 30;

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { format } = useLocalizedFormat();
  const [birthdays, setBirthdays] = useState<GroupBirthday[]>([]);
  const [friendDates, setFriendDates] = useState<FriendDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load calendar data (group birthdays and friend dates)
  const loadCalendarData = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Load both in parallel for efficiency
      const [birthdaysData, friendDatesData] = await Promise.all([
        getGroupBirthdays(user.id),
        getFriendDates(),
      ]);

      setBirthdays(birthdaysData);
      setFriendDates(friendDatesData);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadCalendarData();
    }, [loadCalendarData])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCalendarData();
  }, [loadCalendarData]);

  // Handle date selection
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(prev => prev === date ? null : date);
  }, []);

  // Helper to get days until a specific month/day
  const getDaysUntilDate = (month: number, day: number): number => {
    const today = new Date();
    const currentYear = today.getFullYear();

    // Create target date for this year
    let targetDate = new Date(currentYear, month - 1, day);

    // If target date has passed this year, use next year
    if (targetDate < today) {
      targetDate = new Date(currentYear + 1, month - 1, day);
    }

    // Calculate days difference
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Get upcoming birthdays within planning window, sorted by closest
  const upcomingBirthdays = useMemo(() => {
    const upcoming = filterUpcoming(birthdays, PLANNING_WINDOW_DAYS);
    return sortByUpcoming(upcoming);
  }, [birthdays]);

  // Get upcoming friend dates within planning window
  const upcomingFriendDates = useMemo(() => {
    return friendDates.filter(fd => {
      const days = getDaysUntilDate(fd.month, fd.day);
      return days >= 0 && days <= PLANNING_WINDOW_DAYS;
    });
  }, [friendDates]);

  // Total upcoming count for badge
  const totalUpcoming = upcomingBirthdays.length + upcomingFriendDates.length;

  // Get birthdays for selected date
  const selectedDateBirthdays = useMemo(() => {
    if (!selectedDate) return [];
    return filterBirthdaysForDate(birthdays, selectedDate);
  }, [birthdays, selectedDate]);

  // Get friend dates for selected date (month-day matching)
  const selectedDateFriendDates = useMemo(() => {
    if (!selectedDate) return [];
    const [, month, day] = selectedDate.split('-');
    return friendDates.filter(fd =>
      String(fd.month).padStart(2, '0') === month &&
      String(fd.day).padStart(2, '0') === day
    );
  }, [friendDates, selectedDate]);

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
          <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8B1538" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
        </View>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText} onPress={loadCalendarData}>
            {t('common.retry')}
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
          <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
        </View>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="calendar-blank" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>{t('calendar.empty.noBirthdays')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('calendar.empty.noBirthdaysDescription')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
        <View style={styles.headerRight}>
          {totalUpcoming > 0 && (
            <View style={styles.headerBadge}>
              <MaterialCommunityIcons name="cake-variant" size={16} color="#8B1538" />
              <Text style={styles.headerBadgeText}>
                {t('calendar.upcoming', { count: totalUpcoming })}
              </Text>
            </View>
          )}
          {birthdays.length > 0 && (
            <CalendarSyncIconButton
              birthdays={birthdays}
              friendDates={friendDates}
              onSyncComplete={(results) => {
                console.log('Calendar sync complete:', results);
              }}
            />
          )}
        </View>
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
          friendDates={friendDates}
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

        {/* Selected date friend dates */}
        {selectedDate && selectedDateFriendDates.length > 0 && (
          <View style={styles.selectedSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="account-heart" size={18} color={FRIEND_DATE_COLOR} />
              <Text style={[styles.sectionTitle, { color: FRIEND_DATE_COLOR }]}>
                {t('calendar.friendDates')}
              </Text>
            </View>
            {selectedDateFriendDates.map((friendDate) => {
              const daysUntil = getDaysUntilDate(friendDate.month, friendDate.day);
              return (
                <View key={friendDate.id} style={styles.friendDateCard}>
                  <View style={styles.friendDateIcon}>
                    <MaterialCommunityIcons
                      name={friendDate.type === 'birthday' ? 'cake-variant' : 'heart-outline'}
                      size={20}
                      color={FRIEND_DATE_COLOR}
                    />
                  </View>
                  <View style={styles.friendDateContent}>
                    <Text style={styles.friendDateTitle}>{friendDate.title}</Text>
                    <Text style={styles.friendDateSubtitle}>
                      {friendDate.friendName} • {friendDate.type === 'birthday' ? t('calendar.birthday') : t('calendar.specialDate')}
                    </Text>
                    {daysUntil === 0 && (
                      <Text style={[styles.friendDateBadge, { color: FRIEND_DATE_COLOR }]}>{t('calendar.countdown.today')}</Text>
                    )}
                    {daysUntil > 0 && daysUntil <= 7 && (
                      <Text style={[styles.friendDateBadge, { color: FRIEND_DATE_COLOR }]}>
                        {t('calendar.countdown.daysLeft', { count: daysUntil })}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Selected date but no birthdays or friend dates */}
        {selectedDate && selectedDateBirthdays.length === 0 && selectedDateFriendDates.length === 0 && (
          <View style={styles.noBirthdaysSection}>
            <Text style={styles.noBirthdaysText}>
              {t('calendar.noEventsOnDate', { date: format(new Date(selectedDate), 'MMMM d') })}
            </Text>
          </View>
        )}

        {/* Upcoming birthdays section */}
        <View style={styles.upcomingSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#8B1538" />
            <Text style={styles.sectionTitle}>
              {t('calendar.comingUp', { days: PLANNING_WINDOW_DAYS })}
            </Text>
          </View>

          {upcomingBirthdays.length === 0 ? (
            <View style={styles.noUpcoming}>
              <Text style={styles.noUpcomingText}>
                {t('calendar.noUpcoming', { days: PLANNING_WINDOW_DAYS })}
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
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
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
  friendDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: FRIEND_DATE_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  friendDateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendDateContent: {
    flex: 1,
  },
  friendDateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  friendDateSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  friendDateBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
});
