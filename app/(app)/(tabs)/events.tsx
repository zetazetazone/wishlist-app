/**
 * Unified Events Screen
 *
 * Merges the Celebrations and Calendar tabs into a single screen with segmented control.
 * - Upcoming segment: Shows CelebrationCards with Gift Leader badge
 * - Calendar segment: Shows BirthdayCalendar with CountdownCards
 *
 * Reduces tab bar from 4 to 3 visible tabs, providing unified event management.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { supabase } from '../../../lib/supabase';
import { getCelebrations, type Celebration } from '../../../lib/celebrations';
import { getGroupBirthdays, filterBirthdaysForDate, type GroupBirthday } from '../../../lib/birthdays';
import { getFriendDates, type FriendDate, FRIEND_DATE_COLOR } from '../../../lib/friendDates';
import { getDaysUntilBirthday, filterUpcoming, sortByUpcoming } from '../../../utils/countdown';
import BirthdayCalendar from '../../../components/calendar/BirthdayCalendar';
import CountdownCard from '../../../components/calendar/CountdownCard';
import { CelebrationCard } from '../../../components/celebrations/CelebrationCard';
import { CalendarSyncIconButton } from '../../../components/calendar/CalendarSyncButton';
import { useLocalizedFormat } from '../../../hooks/useLocalizedFormat';
import { colors, spacing, borderRadius, shadows } from '../../../constants/theme';

type Segment = 'upcoming' | 'calendar';

// Planning window in days for calendar view
const PLANNING_WINDOW_DAYS = 30;

export default function EventsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { format } = useLocalizedFormat();

  // Segment state - default to 'upcoming' for action-oriented default
  const [activeSegment, setActiveSegment] = useState<Segment>('upcoming');

  // Celebrations state (for Upcoming segment)
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Calendar state (for Calendar segment)
  const [birthdays, setBirthdays] = useState<GroupBirthday[]>([]);
  const [friendDates, setFriendDates] = useState<FriendDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Shared loading state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load celebrations data
  const loadCelebrations = useCallback(async (userId: string) => {
    const data = await getCelebrations(userId);
    setCelebrations(data);
  }, []);

  // Load calendar data (birthdays and friend dates)
  const loadCalendarData = useCallback(async (userId: string) => {
    const [birthdaysData, friendDatesData] = await Promise.all([
      getGroupBirthdays(userId),
      getFriendDates(),
    ]);
    setBirthdays(birthdaysData);
    setFriendDates(friendDatesData);
  }, []);

  // Initial load - fetch all data in parallel
  const loadAllData = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }
      setCurrentUserId(user.id);

      // Load both data sources in parallel
      await Promise.all([
        loadCelebrations(user.id),
        loadCalendarData(user.id),
      ]);
    } catch (err) {
      console.error('Failed to load events data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [loadCelebrations, loadCalendarData]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        loadAllData();
      }
    }, [loadAllData, loading])
  );

  // Handle pull-to-refresh - only refresh active segment data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (activeSegment === 'upcoming') {
        await loadCelebrations(user.id);
      } else {
        await loadCalendarData(user.id);
      }
    } catch (err) {
      console.error('Failed to refresh:', err);
    } finally {
      setRefreshing(false);
    }
  }, [activeSegment, loadCelebrations, loadCalendarData]);

  // Celebrations handlers
  const handleCelebrationPress = useCallback((celebration: Celebration) => {
    router.push(`/celebration/${celebration.id}`);
  }, [router]);

  const isUserGiftLeader = useCallback((celebration: Celebration): boolean => {
    return currentUserId !== null && celebration.gift_leader_id === currentUserId;
  }, [currentUserId]);

  // Gift Leader celebrations count
  const giftLeaderCelebrations = useMemo(() => {
    return celebrations.filter(c => isUserGiftLeader(c));
  }, [celebrations, isUserGiftLeader]);

  // Calendar handlers
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(prev => prev === date ? null : date);
  }, []);

  // Helper to get days until a specific month/day
  const getDaysUntilDate = useCallback((month: number, day: number): number => {
    const today = new Date();
    const currentYear = today.getFullYear();
    let targetDate = new Date(currentYear, month - 1, day);
    if (targetDate < today) {
      targetDate = new Date(currentYear + 1, month - 1, day);
    }
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // Get upcoming birthdays within planning window
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
  }, [friendDates, getDaysUntilDate]);

  // Total upcoming count for calendar badge
  const totalUpcoming = upcomingBirthdays.length + upcomingFriendDates.length;

  // Get birthdays for selected date
  const selectedDateBirthdays = useMemo(() => {
    if (!selectedDate) return [];
    return filterBirthdaysForDate(birthdays, selectedDate);
  }, [birthdays, selectedDate]);

  // Get friend dates for selected date
  const selectedDateFriendDates = useMemo(() => {
    if (!selectedDate) return [];
    const [, month, day] = selectedDate.split('-');
    return friendDates.filter(fd =>
      String(fd.month).padStart(2, '0') === month &&
      String(fd.day).padStart(2, '0') === day
    );
  }, [friendDates, selectedDate]);

  // Get header content based on active segment
  const getHeaderContent = useCallback(() => {
    if (activeSegment === 'upcoming') {
      return {
        title: t('events.title'),
        subtitle: t('events.celebrationsCount', { count: celebrations.length }),
      };
    } else {
      return {
        title: t('events.title'),
        subtitle: t('events.upcomingCount', { count: totalUpcoming }),
      };
    }
  }, [activeSegment, celebrations.length, totalUpcoming, t]);

  const headerContent = getHeaderContent();

  // Render celebration item
  const renderCelebrationItem = useCallback(({ item }: { item: Celebration }) => (
    <CelebrationCard
      celebration={item}
      isGiftLeader={isUserGiftLeader(item)}
      onPress={() => handleCelebrationPress(item)}
    />
  ), [isUserGiftLeader, handleCelebrationPress]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.burgundy[600]} />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <View style={styles.container}>
          <LinearGradient
            colors={[colors.burgundy[800], colors.burgundy[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <MotiView
              from={{ opacity: 0, translateY: -20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 600 }}
            >
              <Text style={styles.headerTitle}>{t('events.title')}</Text>
            </MotiView>
          </LinearGradient>
          <View style={styles.centered}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText} onPress={loadAllData}>
              {t('common.retry')}
            </Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[colors.burgundy[800], colors.burgundy[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Header Row with contextual icons */}
          <View style={styles.headerRow}>
            {/* Gift Leader badge for Upcoming segment */}
            {activeSegment === 'upcoming' && giftLeaderCelebrations.length > 0 && (
              <View style={styles.giftLeaderBadge}>
                <MaterialCommunityIcons name="crown" size={16} color={colors.gold[300]} />
                <Text style={styles.giftLeaderBadgeText}>
                  {t('celebrations.leading', { count: giftLeaderCelebrations.length })}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }} />

            {/* Calendar sync button for Calendar segment */}
            {activeSegment === 'calendar' && birthdays.length > 0 && (
              <CalendarSyncIconButton
                birthdays={birthdays}
                friendDates={friendDates}
                onSyncComplete={(results) => {
                  console.log('Calendar sync complete:', results);
                }}
              />
            )}
          </View>

          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
          >
            <View>
              <Text style={styles.headerTitle}>{headerContent.title}</Text>
              <Text style={styles.headerSubtitle}>{headerContent.subtitle}</Text>
            </View>
          </MotiView>

          {/* Segmented Control */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeSegment === 'upcoming' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveSegment('upcoming')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'upcoming' && styles.segmentTextActive,
                ]}
              >
                {t('events.segments.upcoming')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeSegment === 'calendar' && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveSegment('calendar')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'calendar' && styles.segmentTextActive,
                ]}
              >
                {t('events.segments.calendar')}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Content Area */}
        {activeSegment === 'upcoming' ? (
          // Upcoming Segment - CelebrationCards with FlashList
          celebrations.length === 0 ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.burgundy[600]}
                  colors={[colors.burgundy[600]]}
                />
              }
            >
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: 200 }}
              >
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <MaterialCommunityIcons
                      name="party-popper"
                      size={60}
                      color={colors.burgundy[400]}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>{t('celebrations.empty.noCelebrations')}</Text>
                  <Text style={styles.emptyDescription}>
                    {t('celebrations.empty.noCelebrationsDescription')}
                  </Text>
                </View>
              </MotiView>
            </ScrollView>
          ) : (
            <FlashList
              data={celebrations}
              renderItem={renderCelebrationItem}
              estimatedItemSize={130}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.burgundy[600]}
                  colors={[colors.burgundy[600]]}
                />
              }
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                giftLeaderCelebrations.length > 0 ? (
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="star" size={18} color={colors.burgundy[600]} />
                    <Text style={styles.sectionTitle}>
                      {t('celebrations.giftLeaderFor', { count: giftLeaderCelebrations.length })}
                    </Text>
                  </View>
                ) : null
              }
            />
          )
        ) : (
          // Calendar Segment - BirthdayCalendar with CountdownCards
          birthdays.length === 0 ? (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.burgundy[600]}
                  colors={[colors.burgundy[600]]}
                />
              }
            >
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: 200 }}
              >
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <MaterialCommunityIcons
                      name="calendar-blank"
                      size={60}
                      color={colors.burgundy[400]}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>{t('calendar.empty.noBirthdays')}</Text>
                  <Text style={styles.emptyDescription}>
                    {t('calendar.empty.noBirthdaysDescription')}
                  </Text>
                </View>
              </MotiView>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.calendarScrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.burgundy[600]}
                  colors={[colors.burgundy[600]]}
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
                  <View style={styles.calendarSectionHeader}>
                    <MaterialCommunityIcons name="calendar-today" size={18} color={colors.burgundy[600]} />
                    <Text style={styles.calendarSectionTitle}>
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
                  <View style={styles.calendarSectionHeader}>
                    <MaterialCommunityIcons name="account-heart" size={18} color={FRIEND_DATE_COLOR} />
                    <Text style={[styles.calendarSectionTitle, { color: FRIEND_DATE_COLOR }]}>
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

              {/* Coming Up section with CountdownCards */}
              <View style={styles.upcomingSection}>
                <View style={styles.calendarSectionHeader}>
                  <MaterialCommunityIcons name="clock-outline" size={18} color={colors.burgundy[600]} />
                  <Text style={styles.calendarSectionTitle}>
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
          )
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.cream[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.cream[50],
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    minHeight: 32,
  },
  giftLeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  giftLeaderBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold[200],
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.gold[200],
    fontWeight: '400',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
    padding: spacing.xs,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  segmentButtonActive: {
    backgroundColor: colors.burgundy[700],
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.burgundy[700],
  },
  segmentTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  calendarScrollContent: {
    paddingTop: spacing.sm,
  },
  listContent: {
    paddingVertical: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  retryText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.burgundy[600],
    textDecorationLine: 'underline',
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.xl,
    borderWidth: 2,
    borderColor: colors.gold[100],
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.burgundy[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.burgundy[800],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.burgundy[400],
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.burgundy[600],
  },
  // Calendar-specific styles
  selectedSection: {
    marginTop: 16,
  },
  upcomingSection: {
    marginTop: 24,
  },
  calendarSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  calendarSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.burgundy[800],
  },
  noBirthdaysSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  noBirthdaysText: {
    fontSize: 14,
    color: colors.burgundy[400],
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
    color: colors.burgundy[400],
  },
  bottomPadding: {
    height: 40,
  },
  friendDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: FRIEND_DATE_COLOR,
    ...shadows.sm,
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
    color: colors.burgundy[800],
    marginBottom: 2,
  },
  friendDateSubtitle: {
    fontSize: 13,
    color: colors.burgundy[400],
    marginBottom: 4,
  },
  friendDateBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
});
