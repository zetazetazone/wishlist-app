/**
 * Contributions Library
 * Split contribution operations via RPC functions and direct queries,
 * plus per-celebration contribution tracking.
 *
 * SECURITY: Split contributions use RPC functions (open_split, pledge_contribution,
 * close_split) which are SECURITY DEFINER and handle all validation atomically.
 * Direct queries go through RLS which excludes the item owner (celebrant) from viewing.
 *
 * RLS Pattern: Celebrant Partial Visibility
 * - Item owner is BLOCKED from SELECT on gift_claims
 * - Non-owner group members see full claim/split details
 */

import { supabase } from './supabase';
import { getAvatarUrl } from './storage';
import type { Database } from '../types/database.types';

// ============================================
// SPLIT CONTRIBUTION TYPES
// ============================================

/** Result from open_split RPC */
export interface OpenSplitResult {
  success: boolean;
  error?: string;
}

/** Result from pledge_contribution RPC */
export interface PledgeResult {
  success: boolean;
  claim_id?: string;
  remaining?: number;
  error?: string;
}

/** Result from close_split RPC */
export interface CloseSplitResult {
  success: boolean;
  final_amount?: number;
  error?: string;
}

/** Split status from get_split_status RPC */
export interface SplitStatus {
  item_price: number;
  additional_costs: number | null;
  total_pledged: number;
  is_fully_funded: boolean;
  is_open: boolean;
  contributor_count: number;
}

/** Suggested share from get_suggested_share RPC */
export interface SuggestedShare {
  suggested_amount: number;
  remaining_members: number;
}

/** Contributor info for split display */
export interface SplitContributor {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  amount: number;
  created_at: string;
}

/** Claim summary for celebration headers */
export interface ClaimSummary {
  total_items: number;
  claimed_items: number; // Full claims
  split_items: number; // Items with split contributions
  unclaimed_items: number;
}

// ============================================
// SPLIT CONTRIBUTION RPC WRAPPER FUNCTIONS
// ============================================

/**
 * Open a split contribution for an item
 *
 * Converts the caller's existing full claim to a split-open state.
 * The original claimer starts with amount=0 and covers remaining via close_split.
 *
 * @param itemId - UUID of the wishlist item
 * @param additionalCosts - Optional shipping/delivery costs to add
 */
export async function openSplit(
  itemId: string,
  additionalCosts?: number
): Promise<OpenSplitResult> {
  const { data, error } = await supabase.rpc('open_split', {
    p_item_id: itemId,
    p_additional_costs: additionalCosts ?? null,
  });

  if (error) {
    console.error('Failed to call open_split RPC:', error);
    return { success: false, error: error.message };
  }

  return data as OpenSplitResult;
}

/**
 * Pledge a contribution to a split item
 *
 * Validates:
 * - User is group member (not celebrant)
 * - Split is open (has at least one split claim)
 * - User hasn't already pledged
 * - Amount doesn't exceed remaining needed
 *
 * @param itemId - UUID of the wishlist item
 * @param amount - Dollar amount to pledge
 */
export async function pledgeContribution(
  itemId: string,
  amount: number
): Promise<PledgeResult> {
  const { data, error } = await supabase.rpc('pledge_contribution', {
    p_item_id: itemId,
    p_amount: amount,
  });

  if (error) {
    console.error('Failed to call pledge_contribution RPC:', error);
    return { success: false, error: error.message };
  }

  return data as PledgeResult;
}

/**
 * Close a split by covering the remaining amount
 *
 * Only the original claimer can close. Their pledge amount is updated
 * to cover whatever remains unfunded.
 *
 * @param itemId - UUID of the wishlist item
 */
export async function closeSplit(itemId: string): Promise<CloseSplitResult> {
  const { data, error } = await supabase.rpc('close_split', {
    p_item_id: itemId,
  });

  if (error) {
    console.error('Failed to call close_split RPC:', error);
    return { success: false, error: error.message };
  }

  return data as CloseSplitResult;
}

/**
 * Get the current split status for an item
 *
 * Returns funding progress, contributor count, and whether fully funded.
 * Celebrant is blocked from viewing (returns null).
 *
 * @param itemId - UUID of the wishlist item
 */
export async function getSplitStatus(
  itemId: string
): Promise<SplitStatus | null> {
  const { data, error } = await supabase.rpc('get_split_status', {
    p_item_id: itemId,
  });

  if (error) {
    console.error('Failed to call get_split_status RPC:', error);
    return null;
  }

  // RPC returns JSONB with success/error pattern
  const result = data as {
    success: boolean;
    error?: string;
    item_price?: number;
    additional_costs?: number | null;
    total_pledged?: number;
    is_fully_funded?: boolean;
    is_open?: boolean;
    contributor_count?: number;
  };

  if (!result.success) {
    console.error('get_split_status returned error:', result.error);
    return null;
  }

  return {
    item_price: result.item_price ?? 0,
    additional_costs: result.additional_costs ?? null,
    total_pledged: result.total_pledged ?? 0,
    is_fully_funded: result.is_fully_funded ?? false,
    is_open: result.is_open ?? false,
    contributor_count: result.contributor_count ?? 0,
  };
}

/**
 * Get suggested equal-split amount for the pledge UI
 *
 * Calculates: (remaining amount) / (remaining members who haven't pledged)
 * This is just a SUGGESTION - users can pledge any amount they want.
 *
 * @param itemId - UUID of the wishlist item
 */
export async function getSuggestedShare(
  itemId: string
): Promise<SuggestedShare | null> {
  const { data, error } = await supabase.rpc('get_suggested_share', {
    p_item_id: itemId,
  });

  if (error) {
    console.error('Failed to call get_suggested_share RPC:', error);
    return null;
  }

  // RPC returns JSONB with success/error pattern
  const result = data as {
    success: boolean;
    error?: string;
    suggested_amount?: number;
    remaining_members?: number;
  };

  if (!result.success) {
    console.error('get_suggested_share returned error:', result.error);
    return null;
  }

  return {
    suggested_amount: result.suggested_amount ?? 0,
    remaining_members: result.remaining_members ?? 0,
  };
}

// ============================================
// SPLIT CONTRIBUTION DIRECT QUERY FUNCTIONS
// ============================================

/**
 * Get all contributors for a split item
 *
 * Direct query through RLS - only returns claims visible to caller.
 * Item owners will get empty results (RLS excludes them).
 * Includes contributor profile info for display.
 *
 * @param itemId - UUID of the wishlist item
 */
export async function getContributors(itemId: string): Promise<SplitContributor[]> {
  const { data: claims, error } = await supabase
    .from('gift_claims')
    .select('id, claimed_by, amount, created_at')
    .eq('wishlist_item_id', itemId)
    .eq('claim_type', 'split')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch contributors:', error);
    return [];
  }

  if (!claims || claims.length === 0) return [];

  // Batch-fetch contributor profiles
  const contributorIds = [...new Set(claims.map((c) => c.claimed_by))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .in('id', contributorIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  return claims.map((c) => {
    const profile = profileMap.get(c.claimed_by);
    return {
      id: c.claimed_by,
      display_name: profile?.display_name ?? null,
      avatar_url: getAvatarUrl(profile?.avatar_url ?? null),
      amount: c.amount ?? 0,
      created_at: c.created_at,
    };
  });
}

/**
 * Get claim summary for celebration headers
 *
 * Returns counts of total items, claimed items, split items, and unclaimed items.
 * Excludes surprise_me and mystery_box items from counts.
 *
 * @param celebrantUserId - The celebrant's user ID
 * @param groupId - The group ID
 */
export async function getClaimSummary(
  celebrantUserId: string,
  groupId: string
): Promise<ClaimSummary> {
  // Get all standard items for this celebrant in this group
  const { data: items, error: itemsError } = await supabase
    .from('wishlist_items')
    .select('id, item_type')
    .eq('user_id', celebrantUserId)
    .eq('group_id', groupId)
    .eq('status', 'active')
    .in('item_type', ['standard']); // Exclude surprise_me and mystery_box

  if (itemsError) {
    console.error('Failed to fetch items for claim summary:', itemsError);
    return {
      total_items: 0,
      claimed_items: 0,
      split_items: 0,
      unclaimed_items: 0,
    };
  }

  if (!items || items.length === 0) {
    return {
      total_items: 0,
      claimed_items: 0,
      split_items: 0,
      unclaimed_items: 0,
    };
  }

  const itemIds = items.map((i) => i.id);

  // Get all claims for these items
  const { data: claims, error: claimsError } = await supabase
    .from('gift_claims')
    .select('wishlist_item_id, claim_type')
    .in('wishlist_item_id', itemIds);

  if (claimsError) {
    console.error('Failed to fetch claims for summary:', claimsError);
    return {
      total_items: items.length,
      claimed_items: 0,
      split_items: 0,
      unclaimed_items: items.length,
    };
  }

  // Group claims by item
  const claimsByItem = new Map<string, Set<'full' | 'split'>>();
  for (const claim of claims || []) {
    if (!claimsByItem.has(claim.wishlist_item_id)) {
      claimsByItem.set(claim.wishlist_item_id, new Set());
    }
    claimsByItem.get(claim.wishlist_item_id)!.add(claim.claim_type);
  }

  // Count by type
  let claimedItems = 0; // Full claims
  let splitItems = 0; // Items with split contributions

  for (const [_itemId, claimTypes] of claimsByItem) {
    if (claimTypes.has('full')) {
      claimedItems++;
    } else if (claimTypes.has('split')) {
      splitItems++;
    }
  }

  const unclaimedItems = items.length - claimedItems - splitItems;

  return {
    total_items: items.length,
    claimed_items: claimedItems,
    split_items: splitItems,
    unclaimed_items: unclaimedItems,
  };
}

// ============================================
// CELEBRATION CONTRIBUTION TYPES (Legacy)
// ============================================

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

// ============================================
// CELEBRATION CONTRIBUTION FUNCTIONS (Legacy)
// ============================================

/**
 * Get all contributions for a celebration
 *
 * Returns contributions with contributor info.
 * RLS automatically excludes celebrant.
 * Ordered by amount DESC (largest contributions first).
 */
export async function getCelebrationContributions(
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

// Legacy alias for backwards compatibility
export const getContributions = getCelebrationContributions;

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
