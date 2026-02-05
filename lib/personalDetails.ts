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
} from '../types/database.types';

/** Personal details with typed JSONB fields */
export interface TypedPersonalDetails extends Omit<PersonalDetails, 'sizes' | 'preferences' | 'external_links'> {
  sizes: PersonalSizes;
  preferences: PersonalPreferences;
  external_links: ExternalLink[];
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

  return {
    ...data,
    sizes: (data.sizes as PersonalSizes) || {},
    preferences: (data.preferences as PersonalPreferences) || {},
    external_links: (data.external_links as ExternalLink[]) || [],
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
}): Promise<TypedPersonalDetails> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('personal_details')
    .upsert(
      {
        user_id: user.id,
        sizes: (details.sizes ?? {}) as unknown as Record<string, unknown>,
        preferences: (details.preferences ?? {}) as unknown as Record<string, unknown>,
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

  return {
    ...data,
    sizes: (data.sizes as PersonalSizes) || {},
    preferences: (data.preferences as PersonalPreferences) || {},
    external_links: (data.external_links as ExternalLink[]) || [],
  };
}
