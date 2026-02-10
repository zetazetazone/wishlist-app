/**
 * Public Dates Library
 * Service for managing user-owned public dates (anniversaries, special events)
 *
 * SECURITY: RLS Pattern: Owner Write, Friends Read
 * - Users can CRUD their own public dates
 * - Friends can view dates (read-only)
 *
 * Date Storage Pattern:
 * - month/day stored separately for annual recurrence
 * - year is optional: null = annual recurring, number = one-time event
 * - CRITICAL: Use getMonth() + 1 when storing, month - 1 when creating Date objects
 */

import { supabase } from './supabase';

/**
 * Public date with full database fields
 */
export interface PublicDate {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  /** Month 1-12 (NOT 0-indexed) */
  month: number;
  /** Day 1-31 */
  day: number;
  /** Year for one-time events, null for annual recurring */
  year: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating or updating a public date
 */
export interface PublicDateInput {
  title: string;
  description?: string;
  /** Month 1-12 (NOT 0-indexed) */
  month: number;
  /** Day 1-31 */
  day: number;
  /** Year for one-time events, null/undefined for annual recurring */
  year?: number | null;
}

/**
 * Get all public dates for the current user
 *
 * Query Strategy:
 * 1. Get current authenticated user
 * 2. Query public_dates where user_id = current user
 * 3. Order by month ASC, then day ASC (chronological within year)
 *
 * @returns Array of public dates, sorted chronologically, or empty array if not authenticated
 */
export async function getMyPublicDates(): Promise<PublicDate[]> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('getMyPublicDates: Not authenticated');
    return [];
  }

  // Query public_dates table
  const { data, error } = await supabase
    .from('public_dates')
    .select('*')
    .eq('user_id', user.id)
    .order('month', { ascending: true })
    .order('day', { ascending: true });

  if (error) {
    console.error('Failed to fetch public dates:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a new public date
 *
 * Inserts a new public date for the current user with:
 * - Trimmed title and description
 * - Month/day as-is (already 1-indexed from UI)
 * - Year as null if not provided (annual recurring)
 *
 * @param input - Public date data
 * @returns Created public date record
 * @throws Error if not authenticated or insert fails
 */
export async function createPublicDate(input: PublicDateInput): Promise<PublicDate> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('public_dates')
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      month: input.month,
      day: input.day,
      year: input.year ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create public date:', error);
    throw new Error(`Failed to create public date: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing public date
 *
 * RLS Policy "Users can update their own dates" authorizes this update if:
 * - The current user is the owner (user_id = auth.uid())
 *
 * @param id - UUID of the public date to update
 * @param input - Partial public date data to update
 * @returns Updated public date record
 * @throws Error if update fails (including RLS violation)
 */
export async function updatePublicDate(
  id: string,
  input: Partial<PublicDateInput>
): Promise<PublicDate> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Only include fields that are present in input
  if (input.title !== undefined) {
    updateData.title = input.title.trim();
  }
  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null;
  }
  if (input.month !== undefined) {
    updateData.month = input.month;
  }
  if (input.day !== undefined) {
    updateData.day = input.day;
  }
  if (input.year !== undefined) {
    updateData.year = input.year ?? null;
  }

  const { data, error } = await supabase
    .from('public_dates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update public date:', error);
    throw new Error(`Failed to update public date: ${error.message}`);
  }

  return data;
}

/**
 * Delete a public date
 *
 * RLS Policy "Users can delete their own dates" authorizes this delete if:
 * - The current user is the owner (user_id = auth.uid())
 *
 * @param id - UUID of the public date to delete
 * @throws Error if delete fails (including RLS violation)
 */
export async function deletePublicDate(id: string): Promise<void> {
  const { error } = await supabase.from('public_dates').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete public date:', error);
    throw new Error(`Failed to delete public date: ${error.message}`);
  }
}
