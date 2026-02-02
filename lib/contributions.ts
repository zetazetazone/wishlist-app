/**
 * Contributions Library
 * Per-celebration contribution tracking (general pot, not per-item)
 *
 * CONTEXT DECISION: Contributions are per-celebration, not tied to specific
 * wishlist items. This creates a general gift fund that the Gift Leader
 * coordinates.
 *
 * SECURITY: RLS policies exclude celebrant from viewing contributions.
 */

import { supabase } from './supabase';
import type { Database } from '../types/database.types';

// Types from database
type ContributionRow = Database['public']['Tables']['celebration_contributions']['Row'];

/**
 * Extended contribution type with contributor info
 */
export interface Contribution {
  id: string;
  celebration_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
  contributor?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Get all contributions for a celebration
 *
 * Returns contributions with contributor info.
 * RLS automatically excludes celebrant.
 * Ordered by amount DESC (largest contributions first).
 */
export async function getContributions(
  celebrationId: string
): Promise<Contribution[]> {
  // Fetch contributions
  const { data: contributions, error } = await supabase
    .from('celebration_contributions')
    .select('*')
    .eq('celebration_id', celebrationId)
    .order('amount', { ascending: false });

  if (error) {
    console.error('Failed to fetch contributions:', error);
    throw new Error(`Failed to fetch contributions: ${error.message}`);
  }

  if (!contributions || contributions.length === 0) {
    return [];
  }

  // Collect user IDs for batch fetching
  const userIds = contributions.map(c => c.user_id);

  // Fetch contributor info from user_profiles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  // Create lookup map
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // Build enriched contributions
  return contributions.map(c => {
    const profile = profileMap.get(c.user_id);
    return {
      id: c.id,
      celebration_id: c.celebration_id,
      user_id: c.user_id,
      amount: Number(c.amount),
      created_at: c.created_at,
      updated_at: c.updated_at,
      contributor: profile ? {
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      } : undefined,
    };
  });
}

/**
 * Add or update a contribution
 *
 * Uses UPSERT pattern - if user already has a contribution for this
 * celebration, it updates the amount. Otherwise creates new.
 *
 * Validation:
 * - Amount must be > 0
 * - RLS validates user is group member and not celebrant
 */
export async function addContribution(
  celebrationId: string,
  amount: number
): Promise<Contribution> {
  // Validate amount
  if (amount <= 0) {
    throw new Error('Contribution amount must be greater than 0');
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Upsert contribution (insert or update on conflict)
  const { data: contribution, error } = await supabase
    .from('celebration_contributions')
    .upsert(
      {
        celebration_id: celebrationId,
        user_id: user.id,
        amount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'celebration_id,user_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to add contribution:', error);
    throw new Error(`Failed to add contribution: ${error.message}`);
  }

  // Fetch contributor info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  return {
    id: contribution.id,
    celebration_id: contribution.celebration_id,
    user_id: contribution.user_id,
    amount: Number(contribution.amount),
    created_at: contribution.created_at,
    updated_at: contribution.updated_at,
    contributor: profile ? {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    } : undefined,
  };
}

/**
 * Update an existing contribution
 *
 * Only the contribution owner can update (RLS enforced).
 * Amount must be > 0.
 */
export async function updateContribution(
  contributionId: string,
  amount: number
): Promise<Contribution> {
  // Validate amount
  if (amount <= 0) {
    throw new Error('Contribution amount must be greater than 0');
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Update contribution
  const { data: contribution, error } = await supabase
    .from('celebration_contributions')
    .update({
      amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contributionId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update contribution:', error);
    throw new Error(`Failed to update contribution: ${error.message}`);
  }

  // Fetch contributor info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .eq('id', contribution.user_id)
    .single();

  return {
    id: contribution.id,
    celebration_id: contribution.celebration_id,
    user_id: contribution.user_id,
    amount: Number(contribution.amount),
    created_at: contribution.created_at,
    updated_at: contribution.updated_at,
    contributor: profile ? {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    } : undefined,
  };
}

/**
 * Get total contributions for a celebration
 *
 * Returns the sum of all contributions.
 * RLS automatically excludes celebrant.
 */
export async function getCelebrationTotal(
  celebrationId: string
): Promise<number> {
  const { data: contributions, error } = await supabase
    .from('celebration_contributions')
    .select('amount')
    .eq('celebration_id', celebrationId);

  if (error) {
    console.error('Failed to fetch celebration total:', error);
    throw new Error(`Failed to fetch celebration total: ${error.message}`);
  }

  if (!contributions || contributions.length === 0) {
    return 0;
  }

  return contributions.reduce((sum, c) => sum + Number(c.amount), 0);
}

/**
 * Get current user's contribution for a celebration
 *
 * Returns null if user hasn't contributed yet.
 */
export async function getCurrentUserContribution(
  celebrationId: string
): Promise<Contribution | null> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: contribution, error } = await supabase
    .from('celebration_contributions')
    .select('*')
    .eq('celebration_id', celebrationId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - user hasn't contributed
      return null;
    }
    console.error('Failed to fetch user contribution:', error);
    return null;
  }

  // Fetch contributor info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  return {
    id: contribution.id,
    celebration_id: contribution.celebration_id,
    user_id: contribution.user_id,
    amount: Number(contribution.amount),
    created_at: contribution.created_at,
    updated_at: contribution.updated_at,
    contributor: profile ? {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    } : undefined,
  };
}

/**
 * Delete a contribution
 *
 * Only the contribution owner can delete (RLS enforced).
 */
export async function deleteContribution(contributionId: string): Promise<void> {
  const { error } = await supabase
    .from('celebration_contributions')
    .delete()
    .eq('id', contributionId);

  if (error) {
    throw new Error(`Failed to delete contribution: ${error.message}`);
  }
}
