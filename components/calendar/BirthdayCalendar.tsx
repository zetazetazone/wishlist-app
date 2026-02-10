/**
 * BirthdayCalendar Component
 * Calendar view with multi-dot marking for birthdays across groups
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { format, setYear, getYear } from 'date-fns';
import type { GroupBirthday } from '../../lib/birthdays';
import type { FriendDate } from '../../lib/friendDates';

// react-native-calendars marking types
interface DotMarking {
  key: string;
  color: string;
}

interface MarkedDates {
  [date: string]: {
    dots?: DotMarking[];
    selected?: boolean;
    selectedColor?: string;
  };
}

interface BirthdayCalendarProps {
  birthdays: GroupBirthday[];
  friendDates?: FriendDate[];
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}

/**
 * Calendar component showing birthdays with colored dots per group
 *
 * Features:
 * - Multi-dot marking for multiple birthdays on same date
 * - Each group gets a unique color
 * - Friend dates shown with teal dots
 * - Swipe between months
 * - Monday start
 * - Burgundy theme matching app
 */
export default function BirthdayCalendar({
  birthdays,
  friendDates = [],
  onDateSelect,
  selectedDate,
}: BirthdayCalendarProps) {
  // Transform birthdays and friend dates to markedDates format
  // Critical: useMemo for performance (react-native-calendars compares by reference)
  const markedDates = useMemo<MarkedDates>(() => {
    const marks: MarkedDates = {};
    const currentYear = getYear(new Date());

    // Process group birthdays
    birthdays.forEach(birthday => {
      // Parse the birthday date and set to current year for display
      const birthdayDate = new Date(birthday.birthday);
      const displayDate = setYear(birthdayDate, currentYear);
      const dateKey = format(displayDate, 'yyyy-MM-dd');

      // Initialize date entry if needed
      if (!marks[dateKey]) {
        marks[dateKey] = { dots: [] };
      }

      // Add dot for this birthday if not already added for this group
      const existingDot = marks[dateKey].dots?.find(
        d => d.key === `${birthday.userId}-${birthday.groupId}`
      );
      if (!existingDot) {
        marks[dateKey].dots!.push({
          key: `${birthday.userId}-${birthday.groupId}`,
          color: birthday.groupColor,
        });
      }
    });

    // Process friend dates (birthdays and public dates)
    friendDates.forEach(friendDate => {
      // Normalize to current year for calendar display
      const dateKey = `${currentYear}-${String(friendDate.month).padStart(2, '0')}-${String(friendDate.day).padStart(2, '0')}`;

      // Initialize date entry if needed
      if (!marks[dateKey]) {
        marks[dateKey] = { dots: [] };
      }

      // Add dot for this friend date if not already present
      const existingDot = marks[dateKey].dots?.find(d => d.key === friendDate.id);
      if (!existingDot) {
        marks[dateKey].dots!.push({
          key: friendDate.id,
          color: friendDate.color, // Teal (#0D9488)
        });
      }
    });

    // Highlight selected date if it has birthdays or friend dates
    if (selectedDate && marks[selectedDate]) {
      marks[selectedDate].selected = true;
      marks[selectedDate].selectedColor = '#8B1538';
    } else if (selectedDate) {
      // Add selected date even without birthdays/dates
      marks[selectedDate] = {
        selected: true,
        selectedColor: '#f3e5e8',
      };
    }

    return marks;
  }, [birthdays, friendDates, selectedDate]);

  // Handle day press
  const handleDayPress = (day: DateData) => {
    onDateSelect(day.dateString);
  };

  return (
    <View style={styles.container}>
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={handleDayPress}
        enableSwipeMonths={true}
        firstDay={1} // Monday start
        theme={{
          // Header
          arrowColor: '#8B1538',
          monthTextColor: '#1f2937',
          textMonthFontWeight: '600',
          textMonthFontSize: 18,

          // Days
          todayTextColor: '#8B1538',
          todayBackgroundColor: '#fef2f2',
          dayTextColor: '#1f2937',
          textDayFontSize: 16,

          // Selected day
          selectedDayBackgroundColor: '#8B1538',
          selectedDayTextColor: '#ffffff',

          // Disabled/inactive
          textDisabledColor: '#d1d5db',
          textInactiveColor: '#9ca3af',

          // Week header
          textSectionTitleColor: '#6b7280',
          textDayHeaderFontSize: 13,
          textDayHeaderFontWeight: '600',

          // Calendar background
          calendarBackground: '#ffffff',
          backgroundColor: '#ffffff',

          // Dots
          dotStyle: {
            marginTop: 1,
          },
        }}
        style={styles.calendar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  calendar: {
    borderRadius: 12,
  },
});
