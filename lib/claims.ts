/**
 * Claims Library
 * Gift claim operations via RPC functions and direct queries
 *
 * SECURITY: Claims use RPC functions (claim_item, unclaim_item) which are
 * SECURITY DEFINER and handle all validation atomically. Direct queries
 * go through RLS which excludes the item owner (celebrant) from viewing claims.
 *
 * RLS Pattern: Celebrant Partial Visibility
 * - Item owner is BLOCKED from SELECT on gift_claims
 * - Item owner gets boolean status via get_item_claim_status() RPC
 * - Non-owner group members see full claim details
 */

import { supabase } from './supabase';
import { getAvatarUrl } from './storage';
import type { Database, GiftClaim } from '../types/database.types';

/** Claim with claimer profile info */
export interface ClaimWithUser extends GiftClaim {
  claimer?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

/** Result shape returned by claim_item() and unclaim_item() RPC functions */
export interface ClaimRpcResult {
  success: boolean;
  claim_id?: string;
  error?: string;
}

/** Result shape returned by get_item_claim_status() RPC function */
export interface ItemClaimStatus {
  wishlist_item_id: string;
  is_claimed: boolean;
}

/**
 * Claim a wishlist item (full or split)
 *
 * Calls the atomic claim_item() RPC function which handles:
 * - Authentication check
 * - Ownership validation (cannot claim own item)
 * - Group membership check
 * - Item type guard (blocks surprise_me, mystery_box)
 * - Full/split mutual exclusion
 * - Race condition prevention via SELECT FOR UPDATE SKIP LOCKED
 *
 * @param itemId - UUID of the wishlist item to claim
 * @param claimType - 'full' for entire item, 'split' for partial contribution
 * @param amount - Dollar amount for split claims (required when claimType is 'split')
 */
export async function claimItem(
  itemId: string,
  claimType: 'full' | 'split' = 'full',
  amount?: number
): Promise<ClaimRpcResult> {
  const { data, error } = await supabase.rpc('claim_item', {
    p_item_id: itemId,
    p_claim_type: claimType,
    p_amount: amount ?? null,
  });

  if (error) {
    console.error('Failed to call claim_item RPC:', error);
    return { success: false, error: error.message };
  }

  return data as ClaimRpcResult;
}

/**
 * Unclaim a previously claimed item
 *
 * Calls the atomic unclaim_item() RPC function which:
 * - Deletes only the caller's own claim
 * - No time limit on unclaiming
 *
 * @param claimId - UUID of the claim to remove
 */
export async function unclaimItem(claimId: string): Promise<ClaimRpcResult> {
  const { data, error } = await supabase.rpc('unclaim_item', {
    p_claim_id: claimId,
  });

  if (error) {
    console.error('Failed to call unclaim_item RPC:', error);
    return { success: false, error: error.message };
  }

  return data as ClaimRpcResult;
}

/**
 * Get claim status for items owned by the current user (celebrant-safe)
 *
 * Uses get_item_claim_status() SECURITY DEFINER RPC which bypasses
 * gift_claims RLS to check existence. Only returns boolean is_claimed
 * for items owned by the caller -- no claimer identity leaked.
 *
 * @param itemIds - Array of wishlist item UUIDs to check
 */
export async function getItemClaimStatus(
  itemIds: string[]
): Promise<ItemClaimStatus[]> {
  if (itemIds.length === 0) return [];

  console.log('[getItemClaimStatus] Calling RPC with item IDs:', itemIds);

  const { data, error } = await supabase.rpc('get_item_claim_status', {
    p_item_ids: itemIds,
  });

  if (error) {
    console.error('[getItemClaimStatus] RPC error:', error);
    return [];
  }

  console.log('[getItemClaimStatus] RPC returned:', data);

  return (data as ItemClaimStatus[]) || [];
}

/**
 * Get all claims for a list of items (non-owner view with claimer profiles)
 *
 * Direct query through RLS -- only returns claims visible to the caller.
 * Item owners will get empty results (RLS excludes them).
 * Includes claimer profile info for display.
 *
 * @param itemIds - Array of wishlist item UUIDs to fetch claims for
 */
export async function getClaimsForItems(
  itemIds: string[]
): Promise<ClaimWithUser[]> {
  if (itemIds.length === 0) return [];

  const { data: claims, error } = await supabase
    .from('gift_claims')
    .select('*')
    .in('wishlist_item_id', itemIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch claims:', error);
    return [];
  }

  if (!claims || claims.length === 0) return [];

  // Batch-fetch claimer profiles
  const claimerIds = [...new Set(claims.map((c) => c.claimed_by))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .in('id', claimerIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  return claims.map((c) => {
    const profile = profileMap.get(c.claimed_by);
    return {
      ...c,
      claimer: profile
        ? {
            id: profile.id,
            display_name: profile.display_name,
            // Convert storage path to public URL
            avatar_url: getAvatarUrl(profile.avatar_url),
          }
        : undefined,
    };
  });
}
