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
  type Wishlist,
  type WishlistInsert,
  type WishlistUpdate,
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
 */
export function useDefaultWishlist() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlists', 'default', user?.id],
    queryFn: () => getDefaultWishlist(user!.id),
    enabled: !!user,
  });
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
