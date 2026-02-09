/**
 * Personal Details Library
 * User profile extension for clothing sizes, preferences, and external links
 *
 * SECURITY: RLS Pattern: Public Read / Owner Write
 * - Any authenticated user can view personal details (for gift coordination)
 * - Only the owner can insert, update, or delete their own details
 *
 * Storage: Uses JSONB columns for flexible schema (sizes, preferences, external_links)
 * Validation: Client-side only (pg_jsonschema omitted per 18-01 decision)
 */

import { supabase } from './supabase';
import type {
  PersonalDetails,
  PersonalSizes,
  PersonalPreferences,
  ExternalLink,
  DeliveryAddress,
  BankDetails,
  PersonalDetailsVisibility,
} from '../types/database.types';

/** Extended preferences with nested delivery/bank/visibility */
interface ExtendedPreferences extends PersonalPreferences {
  delivery_address?: DeliveryAddress;
  bank_details?: BankDetails;
  visibility?: PersonalDetailsVisibility;
}

/** Personal details with typed JSONB fields */
export interface TypedPersonalDetails extends Omit<PersonalDetails, 'sizes' | 'preferences' | 'external_links'> {
  sizes: PersonalSizes;
  preferences: PersonalPreferences;
  external_links: ExternalLink[];
  // Exposed at top level for cleaner API (stored in preferences JSONB)
  delivery_address: DeliveryAddress;
  bank_details: BankDetails;
  visibility: PersonalDetailsVisibility;
}

/**
 * Get personal details for a user
 *
 * Any authenticated user can view (RLS: public read).
 * Returns null if the user hasn't set up personal details yet.
 *
 * @param userId - UUID of the user whose details to fetch
 */
export async function getPersonalDetails(
  userId: string
): Promise<TypedPersonalDetails | null> {
  const { data, error } = await supabase
    .from('personal_details')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned -- user hasn't set up details yet
      return null;
    }
    console.error('Failed to fetch personal details:', error);
    return null;
  }

  // Extract nested fields from preferences for top-level access
  const prefs = (data.preferences as ExtendedPreferences) || {};
  const { delivery_address, bank_details, visibility, ...basePreferences } = prefs;

  return {
    ...data,
    sizes: (data.sizes as PersonalSizes) || {},
    preferences: basePreferences as PersonalPreferences,
    external_links: (data.external_links as ExternalLink[]) || [],
    delivery_address: delivery_address || {},
    bank_details: bank_details || {},
    visibility: visibility || { delivery_address: 'friends_only', bank_details: 'friends_only' },
  };
}

/**
 * Create or update personal details for the current user
 *
 * Uses UPSERT on user_id (UNIQUE constraint) so callers don't need to
 * check whether a row exists. First call creates, subsequent calls update.
 *
 * RLS enforces owner-only write (user_id must match auth.uid()).
 *
 * @param details - Partial details to upsert (sizes, preferences, external_links)
 */
export async function upsertPersonalDetails(details: {
  sizes?: PersonalSizes;
  preferences?: PersonalPreferences;
  external_links?: ExternalLink[];
  delivery_address?: DeliveryAddress;
  bank_details?: BankDetails;
  visibility?: PersonalDetailsVisibility;
}): Promise<TypedPersonalDetails> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Merge delivery_address, bank_details, visibility into preferences JSONB
  const extendedPreferences: ExtendedPreferences = {
    ...(details.preferences ?? {}),
    delivery_address: details.delivery_address,
    bank_details: details.bank_details,
    visibility: details.visibility,
  };

  const { data, error } = await supabase
    .from('personal_details')
    .upsert(
      {
        user_id: user.id,
        sizes: (details.sizes ?? {}) as unknown as Record<string, unknown>,
        preferences: extendedPreferences as unknown as Record<string, unknown>,
        external_links: (details.external_links ?? []) as unknown as Record<string, unknown>[],
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to upsert personal details:', error);
    throw new Error(`Failed to save personal details: ${error.message}`);
  }

  // Extract nested fields from preferences for top-level access
  const prefs = (data.preferences as ExtendedPreferences) || {};
  const { delivery_address, bank_details, visibility, ...basePreferences } = prefs;

  return {
    ...data,
    sizes: (data.sizes as PersonalSizes) || {},
    preferences: basePreferences as PersonalPreferences,
    external_links: (data.external_links as ExternalLink[]) || [],
    delivery_address: delivery_address || {},
    bank_details: bank_details || {},
    visibility: visibility || { delivery_address: 'friends_only', bank_details: 'friends_only' },
  };
}
