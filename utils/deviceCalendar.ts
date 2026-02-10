/**
 * Device Calendar Sync Utility
 * Syncs birthday events to Google Calendar (Android) or Apple Calendar (iOS)
 */

import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

// Re-export types for consistency
export type { GroupBirthday } from '../lib/birthdays';
export type { FriendDate } from '../lib/friendDates';
import type { GroupBirthday } from '../lib/birthdays';
import type { FriendDate } from '../lib/friendDates';

// Result type for sync operations
export interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

// Calendar configuration
const CALENDAR_NAME = 'Wishlist Birthdays';
const CALENDAR_COLOR = '#FF6B6B';

/**
 * Check if calendar permission has been granted
 */
export async function checkCalendarPermission(): Promise<boolean> {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to check calendar permission:', error);
    return false;
  }
}

/**
 * Request calendar permission from the user
 * Returns true if permission was granted
 */
export async function requestCalendarPermission(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();

    // iOS 17 quirk: Sometimes status shows as undetermined after grant
    // Verify by checking again
    if (status === 'granted') {
      return true;
    }

    // Double-check permission status (iOS 17 workaround)
    const { status: verifyStatus } = await Calendar.getCalendarPermissionsAsync();
    return verifyStatus === 'granted';
  } catch (error) {
    console.error('Failed to request calendar permission:', error);
    return false;
  }
}

/**
 * Get or create the "Wishlist Birthdays" calendar
 * Creates a dedicated calendar for birthday events if it doesn't exist
 */
export async function getOrCreateWishlistCalendar(): Promise<string> {
  // Ensure we have permission
  const hasPermission = await checkCalendarPermission();
  if (!hasPermission) {
    const granted = await requestCalendarPermission();
    if (!granted) {
      throw new Error('Calendar permission not granted');
    }
  }

  // Get existing calendars
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

  // Check if our calendar already exists
  const existingCalendar = calendars.find(c => c.title === CALENDAR_NAME);
  if (existingCalendar) {
    return existingCalendar.id;
  }

  // Find appropriate source for the new calendar
  let source: Calendar.Source | undefined;

  if (Platform.OS === 'ios') {
    // Try iCloud first (most common), then fall back to local
    source = calendars.find(c => c.source?.name === 'iCloud')?.source
          ?? calendars.find(c => c.source?.type === Calendar.SourceType.LOCAL)?.source
          ?? calendars[0]?.source; // Fallback to any available source
  } else {
    // Android: Create a local calendar
    // We need to find a local source or use a local account
    const localSource = calendars.find(c =>
      c.source?.type === Calendar.SourceType.LOCAL ||
      c.source?.isLocalAccount === true
    )?.source;

    source = localSource ?? {
      isLocalAccount: true,
      name: 'Wishlist',
      type: Calendar.SourceType.LOCAL,
    } as Calendar.Source;
  }

  if (!source) {
    throw new Error('No calendar source available. Please ensure you have at least one calendar set up on your device.');
  }

  // Create the calendar
  try {
    const calendarId = await Calendar.createCalendarAsync({
      title: CALENDAR_NAME,
      color: CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: source.id,
      source,
      name: 'wishlistBirthdays',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
      ownerAccount: Platform.OS === 'ios' ? source.name : 'Wishlist App',
    });

    return calendarId;
  } catch (error) {
    console.error('Failed to create calendar:', error);
    throw new Error('Failed to create Wishlist Birthdays calendar');
  }
}

/**
 * Calculate the next occurrence of a birthday from today
 */
function getNextBirthdayOccurrence(birthday: Date | string): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse string dates
  const birthdayDate = typeof birthday === 'string' ? new Date(birthday) : birthday;

  const currentYear = today.getFullYear();
  const birthdayMonth = birthdayDate.getMonth();
  const birthdayDay = birthdayDate.getDate();

  // Handle Feb 29 (leap year birthday)
  let nextBirthday: Date;
  if (birthdayMonth === 1 && birthdayDay === 29) {
    // Check if current year is a leap year
    const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0;
    if (isLeapYear) {
      nextBirthday = new Date(currentYear, 1, 29);
    } else {
      // Use Feb 28 in non-leap years
      nextBirthday = new Date(currentYear, 1, 28);
    }
  } else {
    nextBirthday = new Date(currentYear, birthdayMonth, birthdayDay);
  }

  nextBirthday.setHours(0, 0, 0, 0);

  // If birthday already passed this year, set to next year
  if (nextBirthday < today) {
    const nextYear = currentYear + 1;
    if (birthdayMonth === 1 && birthdayDay === 29) {
      // Check if next year is a leap year
      const isNextLeapYear = (nextYear % 4 === 0 && nextYear % 100 !== 0) || nextYear % 400 === 0;
      nextBirthday = isNextLeapYear
        ? new Date(nextYear, 1, 29)
        : new Date(nextYear, 1, 28);
    } else {
      nextBirthday = new Date(nextYear, birthdayMonth, birthdayDay);
    }
  }

  return nextBirthday;
}

/**
 * Calculate the next occurrence of a date from month/day
 * Handles Feb 29 leap year edge case
 */
function getNextOccurrence(month: number, day: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentYear = today.getFullYear();

  // Handle Feb 29 (leap year)
  let nextDate: Date;
  if (month === 2 && day === 29) {
    const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0;
    if (isLeapYear) {
      nextDate = new Date(currentYear, 1, 29); // Feb is month 1 (0-indexed)
    } else {
      nextDate = new Date(currentYear, 1, 28);
    }
  } else {
    // month is 1-12 in database, Date constructor uses 0-11
    nextDate = new Date(currentYear, month - 1, day);
  }

  nextDate.setHours(0, 0, 0, 0);

  // If date already passed this year, set to next year
  if (nextDate < today) {
    const nextYear = currentYear + 1;
    if (month === 2 && day === 29) {
      const isNextLeapYear = (nextYear % 4 === 0 && nextYear % 100 !== 0) || nextYear % 400 === 0;
      nextDate = isNextLeapYear
        ? new Date(nextYear, 1, 29)
        : new Date(nextYear, 1, 28);
    } else {
      nextDate = new Date(nextYear, month - 1, day);
    }
  }

  return nextDate;
}

/**
 * Sync a single birthday event to the device calendar
 * Creates a yearly recurring event with reminders
 */
export async function syncBirthdayEvent(
  userName: string,
  birthday: Date | string,
  groupName: string
): Promise<SyncResult> {
  try {
    const calendarId = await getOrCreateWishlistCalendar();

    // Calculate next occurrence
    const eventDate = getNextBirthdayOccurrence(birthday);

    // Create the event
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `${userName}'s Birthday`,
      notes: `Birthday celebration for ${groupName} group - Wishlist App`,
      startDate: eventDate,
      endDate: eventDate,
      allDay: true,
      alarms: [
        { relativeOffset: -10080 }, // 1 week before (7 days * 24 hours * 60 minutes)
        { relativeOffset: -1440 },  // 1 day before (24 hours * 60 minutes)
      ],
      recurrenceRule: {
        frequency: Calendar.Frequency.YEARLY,
      },
    });

    return { success: true, eventId };
  } catch (error) {
    console.error('Calendar sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Sync a friend date event to the device calendar
 * Creates a yearly recurring event with reminders
 */
export async function syncFriendDateEvent(
  friendDate: FriendDate
): Promise<SyncResult> {
  try {
    const calendarId = await getOrCreateWishlistCalendar();

    // Construct date from month/day using current year
    const eventDate = getNextOccurrence(friendDate.month, friendDate.day);

    // Format title based on type
    const title = friendDate.type === 'birthday'
      ? `${friendDate.title}'s Birthday`
      : friendDate.title;

    // Format notes with friend context
    const notes = friendDate.type === 'birthday'
      ? `Friend birthday - ${friendDate.friendName} - Wishlist App`
      : `${friendDate.friendName}'s special date - Wishlist App`;

    const eventId = await Calendar.createEventAsync(calendarId, {
      title,
      notes,
      startDate: eventDate,
      endDate: eventDate,
      allDay: true,
      alarms: [
        { relativeOffset: -10080 }, // 1 week before
        { relativeOffset: -1440 },  // 1 day before
      ],
      recurrenceRule: {
        frequency: Calendar.Frequency.YEARLY,
      },
    });

    return { success: true, eventId };
  } catch (error) {
    console.error('Friend date sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Sync all birthdays to the device calendar
 * Returns results for each sync attempt
 */
export async function syncAllBirthdays(birthdays: GroupBirthday[]): Promise<SyncResult[]> {
  if (birthdays.length === 0) {
    return [];
  }

  const results: SyncResult[] = [];

  // First, ensure we have the calendar
  try {
    await getOrCreateWishlistCalendar();
  } catch (error) {
    // Return error for all if we can't get/create calendar
    return birthdays.map(() => ({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to access calendar',
    }));
  }

  // Sync each birthday
  for (const birthday of birthdays) {
    const result = await syncBirthdayEvent(
      birthday.userName,
      birthday.birthday,
      birthday.groupName
    );
    results.push(result);
  }

  return results;
}

/**
 * Sync all calendar events (group birthdays + friend dates) to device calendar
 * Returns results for each sync attempt
 */
export async function syncAllCalendarEvents(
  birthdays: GroupBirthday[],
  friendDates: FriendDate[]
): Promise<SyncResult[]> {
  const totalEvents = birthdays.length + friendDates.length;
  if (totalEvents === 0) {
    return [];
  }

  const results: SyncResult[] = [];

  // Ensure we have the calendar
  try {
    await getOrCreateWishlistCalendar();
  } catch (error) {
    return Array(totalEvents).fill({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to access calendar',
    });
  }

  // Sync group birthdays
  for (const birthday of birthdays) {
    const result = await syncBirthdayEvent(
      birthday.userName,
      birthday.birthday,
      birthday.groupName
    );
    results.push(result);
  }

  // Sync friend dates
  for (const friendDate of friendDates) {
    const result = await syncFriendDateEvent(friendDate);
    results.push(result);
  }

  return results;
}

/**
 * Get summary of sync results
 * Returns counts for success and failure
 */
export function getSyncSummary(results: SyncResult[]): {
  total: number;
  success: number;
  failed: number;
} {
  const success = results.filter(r => r.success).length;
  return {
    total: results.length,
    success,
    failed: results.length - success,
  };
}
