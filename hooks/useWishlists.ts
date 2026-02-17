import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../providers/AuthProvider';
import {
  getWishlists,
  getDefaultWishlist,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  reorderWishlists,
  moveItemToWishlist,
  getCelebrantPublicWishlists,
  getGroupForOthersWishlists,
  updateWishlistVisibility,
  linkWishlistToGroup,
  type Wishlist,
  type WishlistInsert,
  type WishlistUpdate,
  type WishlistVisibility,
} from '../lib/wishlists';

/**
 * Hook to fetch all wishlists for the current user
 */
export function useWishlists() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlists', user?.id],
    queryFn: () => getWishlists(user!.id),
    enabled: !!user,
  });
}

/**
 * Hook to get the default wishlist
 * Invalidates wishlists cache when default is fetched (in case it was auto-created)
 */
export function useDefaultWishlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasInvalidated = useRef(false);

  const query = useQuery({
    queryKey: ['wishlists', 'default', user?.id],
    queryFn: () => getDefaultWishlist(user!.id),
    enabled: !!user,
  });

  // When default wishlist is fetched, invalidate the main wishlists cache once
  // This ensures the picker sees any newly created default wishlist
  useEffect(() => {
    if (query.data && user && !hasInvalidated.current) {
      hasInvalidated.current = true;
      queryClient.invalidateQueries({ queryKey: ['wishlists', user.id] });
    }
  }, [query.data, user, queryClient]);

  return query;
}

/**
 * Hook to create a new wishlist
 */
export function useCreateWishlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (wishlist: WishlistInsert) => createWishlist(wishlist),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists', user?.id] });
    },
  });
}

/**
 * Hook to update a wishlist
 */
export function useUpdateWishlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: WishlistUpdate }) =>
      updateWishlist(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists', user?.id] });
    },
  });
}

/**
 * Hook to delete a wishlist
 */
export function useDeleteWishlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => deleteWishlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists', user?.id] });
    },
  });
}

/**
 * Hook to reorder wishlists with optimistic updates
 */
export function useReorderWishlists() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (updates: Array<{ id: string; sort_order: number }>) =>
      reorderWishlists(updates),
    onMutate: async (updates) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['wishlists', user?.id] });

      // Snapshot the previous value
      const previousWishlists = queryClient.getQueryData<Wishlist[]>(['wishlists', user?.id]);

      // Optimistically update to the new value
      if (previousWishlists) {
        const updatedWishlists = previousWishlists.map((wishlist) => {
          const update = updates.find((u) => u.id === wishlist.id);
          return update ? { ...wishlist, sort_order: update.sort_order } : wishlist;
        });

        // Sort by new sort_order
        updatedWishlists.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

        queryClient.setQueryData(['wishlists', user?.id], updatedWishlists);
      }

      // Return context with previous value
      return { previousWishlists };
    },
    onError: (_error, _updates, context) => {
      // Rollback to previous value on error
      if (context?.previousWishlists) {
        queryClient.setQueryData(['wishlists', user?.id], context.previousWishlists);
      }
    },
    onSuccess: () => {
      // Invalidate to ensure server state is reflected
      queryClient.invalidateQueries({ queryKey: ['wishlists', user?.id] });
    },
  });
}

/**
 * Hook to move an item to a different wishlist
 */
export function useMoveItemToWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, targetWishlistId }: { itemId: string; targetWishlistId: string }) =>
      moveItemToWishlist(itemId, targetWishlistId),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-items'] });
    },
  });
}

/**
 * Hook to fetch public wishlists for a celebrant (for celebration pages)
 */
export function useCelebrantPublicWishlists(celebrantId: string | undefined) {
  return useQuery({
    queryKey: ['wishlists', 'public', celebrantId],
    queryFn: () => getCelebrantPublicWishlists(celebrantId!),
    enabled: !!celebrantId,
  });
}

/**
 * Hook to fetch for-others wishlists linked to a group
 */
export function useGroupForOthersWishlists(groupId: string | undefined) {
  return useQuery({
    queryKey: ['wishlists', 'for-others', groupId],
    queryFn: () => getGroupForOthersWishlists(groupId!),
    enabled: !!groupId,
  });
}

/**
 * Hook to update wishlist visibility
 */
export function useUpdateVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wishlistId, visibility }: { wishlistId: string; visibility: WishlistVisibility }) =>
      updateWishlistVisibility(wishlistId, visibility),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });
}

/**
 * Hook to link/unlink wishlist to group
 */
export function useLinkWishlistToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wishlistId, groupId }: { wishlistId: string; groupId: string | null }) =>
      linkWishlistToGroup(wishlistId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });
}
