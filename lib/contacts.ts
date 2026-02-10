/**
 * Contacts Library
 * Contact import and phone number normalization for user discovery
 *
 * PURPOSE: Enables "Find Friends" feature by:
 * 1. Checking/requesting contact permission (iOS 18 limited access support)
 * 2. Fetching contacts with phone numbers from device
 * 3. Normalizing phone numbers to E.164 format for matching
 * 4. Matching normalized phones against registered users via RPC
 *
 * iOS 18 Limited Access:
 * iOS 18 introduced "limited access" where users can grant access to only
 * specific contacts. The `accessPrivileges` property indicates:
 * - 'all': Full access to all contacts
 * - 'limited': Access to user-selected contacts only
 * - 'none': No access granted
 * Use `expandContactAccess()` to prompt user to select more contacts.
 *
 * E.164 Format:
 * Phone numbers are normalized to E.164 format (+[country][number]) for
 * reliable matching across platforms. The same number formatted differently
 * on iOS vs Android will normalize to the same E.164 string.
 */

import * as Contacts from 'expo-contacts';
import parsePhoneNumber, { type CountryCode } from 'libphonenumber-js/mobile';
import { supabase } from './supabase';
import { getRelationshipStatus } from './friends';
import { getAvatarUrl } from './storage';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of checking or requesting contact permission
 */
export interface ContactPermissionResult {
  /** Whether permission was granted (status === 'granted') */
  granted: boolean;
  /** Access level: 'all' (full), 'limited' (iOS 18 partial), or 'none' */
  accessLevel: 'all' | 'limited' | 'none';
}

/**
 * A contact imported from the device
 */
export interface ImportedContact {
  /** Unique contact ID from device */
  id: string;
  /** Contact's display name */
  name: string;
  /** Array of phone numbers (raw, not normalized) */
  phoneNumbers: string[];
  /** Contact's image URI if available */
  image?: string;
}

/**
 * A registered user matched from device contacts
 */
export interface MatchedUser {
  /** User's ID in our system */
  userId: string;
  /** User's display name in our app */
  displayName: string;
  /** Public URL to user's avatar, or null */
  avatarUrl: string | null;
  /** Name from device contacts (may differ from displayName) */
  contactName: string;
  /** The E.164 phone number that matched */
  matchedPhone: string;
  /** Current relationship status with this user */
  relationshipStatus: 'none' | 'pending_incoming' | 'pending_outgoing' | 'friends';
}

// ============================================================================
// Permission Handling
// ============================================================================

/**
 * Check current contact permission status
 *
 * Use before attempting to read contacts to determine if permission
 * request is needed or if user has limited access.
 *
 * @returns Permission result with granted status and access level
 */
export async function checkContactPermission(): Promise<ContactPermissionResult> {
  const { status, accessPrivileges } = await Contacts.getPermissionsAsync();

  if (status !== 'granted') {
    return { granted: false, accessLevel: 'none' };
  }

  // accessPrivileges is only present on iOS 18+
  // Default to 'all' if not present (older iOS or Android)
  const accessLevel = accessPrivileges ?? 'all';

  return { granted: true, accessLevel };
}

/**
 * Request contact permission from the user
 *
 * Shows the system permission dialog. On iOS 18+, user may grant
 * limited access to specific contacts rather than all contacts.
 *
 * @returns Permission result with granted status and access level
 */
export async function requestContactPermission(): Promise<ContactPermissionResult> {
  const { status, accessPrivileges } = await Contacts.requestPermissionsAsync();

  if (status !== 'granted') {
    return { granted: false, accessLevel: 'none' };
  }

  return { granted: true, accessLevel: accessPrivileges ?? 'all' };
}

/**
 * Open iOS 18+ contact access picker to grant access to more contacts
 *
 * Only works on iOS 18+. On Android or older iOS, returns empty array.
 * Use when user has limited access and wants to add more contacts.
 *
 * @returns Array of newly granted contact IDs, or empty if not supported
 */
export async function expandContactAccess(): Promise<string[]> {
  try {
    const newlyGrantedIds = await Contacts.presentAccessPickerAsync();
    return newlyGrantedIds;
  } catch (error) {
    // Not supported on this platform/version
    return [];
  }
}

// ============================================================================
// Phone Number Normalization
// ============================================================================

/**
 * Normalize a phone number to E.164 format
 *
 * E.164 is the international standard format: +[country code][number]
 * Examples: +14155551234, +442071838750
 *
 * Handles various input formats:
 * - (555) 123-4567 -> +15551234567
 * - 555.123.4567 -> +15551234567
 * - +1 555 123 4567 -> +15551234567
 *
 * @param phoneNumber - Raw phone number from contacts
 * @param defaultCountry - ISO 3166-1 alpha-2 country code (default: 'US')
 * @returns E.164 formatted number or null if invalid
 */
export function normalizeToE164(
  phoneNumber: string,
  defaultCountry: CountryCode = 'US'
): string | null {
  try {
    const parsed = parsePhoneNumber(phoneNumber, defaultCountry);

    if (!parsed || !parsed.isValid()) {
      return null;
    }

    // .number property returns E.164 format
    return parsed.number;
  } catch (error) {
    // Invalid input that parsePhoneNumber couldn't handle
    return null;
  }
}

/**
 * Normalize all phone numbers from a contact
 *
 * Filters out invalid numbers and removes duplicates
 * (same number formatted differently normalizes to same E.164).
 *
 * @param phoneNumbers - Array of raw phone numbers
 * @param defaultCountry - ISO 3166-1 alpha-2 country code (default: 'US')
 * @returns Array of unique E.164 formatted numbers
 */
export function normalizeContactPhones(
  phoneNumbers: string[],
  defaultCountry: CountryCode = 'US'
): string[] {
  const normalized = phoneNumbers
    .map((phone) => normalizeToE164(phone, defaultCountry))
    .filter((phone): phone is string => phone !== null);

  // Remove duplicates using Set
  return [...new Set(normalized)];
}

// ============================================================================
// Contact Fetching
// ============================================================================

/**
 * Fetch all contacts with phone numbers from device
 *
 * Filters to contacts that have at least one phone number.
 * Call after verifying permission is granted.
 *
 * @returns Array of imported contacts with phone numbers
 */
export async function getContactsWithPhones(): Promise<ImportedContact[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Name,
      Contacts.Fields.Image,
    ],
  });

  // Filter to contacts with at least one phone number
  return data
    .filter((contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0)
    .map((contact) => ({
      id: contact.id,
      name: contact.name || 'Unknown',
      // Handle both number and digits properties for phone extraction
      phoneNumbers: contact.phoneNumbers!
        .map((p) => p.number ?? p.digits ?? '')
        .filter(Boolean),
      image: contact.image?.uri,
    }));
}

// ============================================================================
// Contact Matching
// ============================================================================

/**
 * Match device contacts against registered users
 *
 * Full flow:
 * 1. Fetches contacts from device
 * 2. Normalizes phone numbers to E.164
 * 3. Batches phone numbers (100 per request) for API performance
 * 4. Calls match_phones RPC to find registered users
 * 5. Enriches results with relationship status
 *
 * @param defaultCountry - ISO 3166-1 alpha-2 country code for phone parsing
 * @returns Array of matched users with relationship status
 */
export async function matchContacts(
  defaultCountry: CountryCode = 'US'
): Promise<MatchedUser[]> {
  // Get contacts from device
  const contacts = await getContactsWithPhones();

  if (contacts.length === 0) {
    return [];
  }

  // Build phone -> contact name mapping for later enrichment
  const phoneToContact: Map<string, string> = new Map();
  const allNormalizedPhones: string[] = [];

  for (const contact of contacts) {
    const normalized = normalizeContactPhones(contact.phoneNumbers, defaultCountry);
    for (const phone of normalized) {
      phoneToContact.set(phone, contact.name);
      allNormalizedPhones.push(phone);
    }
  }

  if (allNormalizedPhones.length === 0) {
    return [];
  }

  // Batch in chunks of 100 for API performance
  const BATCH_SIZE = 100;
  const matchedUsers: MatchedUser[] = [];

  for (let i = 0; i < allNormalizedPhones.length; i += BATCH_SIZE) {
    const batch = allNormalizedPhones.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase.rpc('match_phones', {
      p_phone_numbers: batch,
    });

    if (error) {
      console.error('Phone matching failed:', error);
      continue;
    }

    // Enrich with relationship status for each match
    for (const match of data || []) {
      const relationshipStatus = await getRelationshipStatus(match.user_id);

      // Skip blocked users (shouldn't happen as RPC filters them, but handle defensively)
      if (relationshipStatus === 'blocked') {
        continue;
      }

      matchedUsers.push({
        userId: match.user_id,
        displayName: match.display_name,
        avatarUrl: getAvatarUrl(match.avatar_url),
        contactName: phoneToContact.get(match.phone) || 'Unknown',
        matchedPhone: match.phone,
        relationshipStatus,
      });
    }
  }

  return matchedUsers;
}
