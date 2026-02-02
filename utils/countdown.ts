/**
 * Birthday Countdown Utilities
 * Calculate days until birthdays and determine planning status
 */

import { differenceInDays, setYear, getYear, isBefore, isValid, parseISO } from 'date-fns';

export type PlanningStatus = 'urgent' | 'soon' | 'planning' | 'future';

/**
 * Check if a year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Calculate days until the next occurrence of a birthday
 *
 * Handles:
 * - Birthdays later this year
 * - Birthdays that have passed this year (calculates for next year)
 * - February 29 birthdays in non-leap years (shows on Feb 28)
 *
 * @param birthday - Date object or ISO date string (YYYY-MM-DD)
 * @returns Number of days until birthday, 0 if today, -1 if invalid
 */
export function getDaysUntilBirthday(birthday: Date | string): number {
  // Parse the birthday
  const birthdayDate = typeof birthday === 'string' ? parseISO(birthday) : birthday;

  if (!isValid(birthdayDate)) {
    return -1;
  }

  // Get today at midnight for accurate day comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentYear = getYear(today);
  const birthdayMonth = birthdayDate.getMonth();
  const birthdayDay = birthdayDate.getDate();

  // Calculate the next birthday occurrence
  let nextBirthday: Date;

  // Special handling for Feb 29 birthdays
  if (birthdayMonth === 1 && birthdayDay === 29) {
    // Check if current year is leap year
    if (isLeapYear(currentYear)) {
      nextBirthday = new Date(currentYear, 1, 29);
    } else {
      // Show on Feb 28 in non-leap years
      nextBirthday = new Date(currentYear, 1, 28);
    }
  } else {
    nextBirthday = setYear(birthdayDate, currentYear);
  }

  nextBirthday.setHours(0, 0, 0, 0);

  // If birthday has passed this year, calculate for next year
  if (isBefore(nextBirthday, today)) {
    const nextYear = currentYear + 1;

    if (birthdayMonth === 1 && birthdayDay === 29) {
      // Feb 29 birthday - check if next year is leap
      if (isLeapYear(nextYear)) {
        nextBirthday = new Date(nextYear, 1, 29);
      } else {
        nextBirthday = new Date(nextYear, 1, 28);
      }
    } else {
      nextBirthday = setYear(birthdayDate, nextYear);
    }
    nextBirthday.setHours(0, 0, 0, 0);
  }

  return differenceInDays(nextBirthday, today);
}

/**
 * Get the planning status based on days until birthday
 *
 * Status levels:
 * - urgent: <= 7 days - immediate action needed
 * - soon: 8-14 days - plan within the week
 * - planning: 15-30 days - time to organize
 * - future: > 30 days - on the radar
 *
 * @param daysUntil - Number of days until birthday
 * @returns Planning status category
 */
export function getPlanningStatus(daysUntil: number): PlanningStatus {
  if (daysUntil <= 7) return 'urgent';
  if (daysUntil <= 14) return 'soon';
  if (daysUntil <= 30) return 'planning';
  return 'future';
}

/**
 * Get a human-readable countdown string
 *
 * @param daysUntil - Number of days until birthday
 * @returns Formatted string like "TODAY!", "Tomorrow", "5 days"
 */
export function getCountdownText(daysUntil: number): string {
  if (daysUntil === 0) return 'TODAY!';
  if (daysUntil === 1) return 'Tomorrow';
  if (daysUntil === -1) return 'Invalid date';
  return `${daysUntil} days`;
}

/**
 * Get status color for UI display
 *
 * @param status - Planning status
 * @returns Hex color code
 */
export function getStatusColor(status: PlanningStatus): string {
  switch (status) {
    case 'urgent':
      return '#FF6B6B'; // Red
    case 'soon':
      return '#FF9F43'; // Orange
    case 'planning':
      return '#48DBFB'; // Blue
    case 'future':
      return '#95A5A6'; // Gray
  }
}

/**
 * Sort birthdays by days until (ascending)
 *
 * @param birthdays - Array of items with birthday property
 * @returns Sorted array (closest first)
 */
export function sortByUpcoming<T extends { birthday: string | Date }>(
  birthdays: T[]
): T[] {
  return [...birthdays].sort((a, b) => {
    const daysA = getDaysUntilBirthday(a.birthday);
    const daysB = getDaysUntilBirthday(b.birthday);
    return daysA - daysB;
  });
}

/**
 * Filter birthdays within a planning window
 *
 * @param birthdays - Array of items with birthday property
 * @param windowDays - Number of days to include (default 30)
 * @returns Filtered array of birthdays within the window
 */
export function filterUpcoming<T extends { birthday: string | Date }>(
  birthdays: T[],
  windowDays: number = 30
): T[] {
  return birthdays.filter(b => {
    const days = getDaysUntilBirthday(b.birthday);
    return days >= 0 && days <= windowDays;
  });
}
