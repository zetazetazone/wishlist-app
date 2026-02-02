/**
 * Chat Library
 * Real-time chat message CRUD and subscription utilities
 *
 * SECURITY: RLS policies automatically exclude celebrant from chat access.
 * All queries go through Supabase RLS which enforces celebrant exclusion.
 */

import { useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import type { Database } from '../types/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Types from database
type ChatRoomRow = Database['public']['Tables']['chat_rooms']['Row'];
type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];

/**
 * Extended chat message type with sender and linked item info
 */
export interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  linked_item_id: string | null;
  created_at: string;
  sender?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  linked_item?: {
    id: string;
    title: string;
    price: number | null;
    image_url: string | null;
  };
}

/**
 * Chat room type
 */
export interface ChatRoom {
  id: string;
  celebration_id: string;
  created_at: string;
}

/**
 * Get chat room for a celebration
 *
 * RLS enforces celebrant exclusion - returns null if user is celebrant
 * or not a group member.
 */
export async function getChatRoomForCelebration(
  celebrationId: string
): Promise<ChatRoom | null> {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('id, celebration_id, created_at')
    .eq('celebration_id', celebrationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - either doesn't exist or RLS blocked (celebrant)
      return null;
    }
    console.error('Failed to fetch chat room:', error);
    return null;
  }

  return data;
}

/**
 * Get all messages for a chat room
 *
 * Returns messages ordered by created_at ASC (oldest first).
 * RLS automatically excludes celebrant from accessing messages.
 *
 * RACE CONDITION PREVENTION:
 * When setting up realtime, caller should:
 * 1. Fetch initial messages with this function
 * 2. Set up subscription with useChatSubscription
 * 3. Handle potential duplicates by message ID (use a Set or Map)
 */
export async function getMessages(chatRoomId: string): Promise<ChatMessage[]> {
  // Fetch messages
  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_room_id', chatRoomId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('Failed to fetch messages:', messagesError);
    throw new Error(`Failed to fetch messages: ${messagesError.message}`);
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // Collect user IDs and linked item IDs for batch fetching
  const userIds = new Set<string>();
  const itemIds = new Set<string>();

  messages.forEach(m => {
    userIds.add(m.sender_id);
    if (m.linked_item_id) {
      itemIds.add(m.linked_item_id);
    }
  });

  // Fetch sender info from user_profiles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .in('id', Array.from(userIds));

  // Fetch linked items if any
  let itemsMap = new Map<string, { id: string; title: string; price: number | null; image_url: string | null }>();
  if (itemIds.size > 0) {
    const { data: items } = await supabase
      .from('wishlist_items')
      .select('id, title, price, image_url')
      .in('id', Array.from(itemIds));

    if (items) {
      items.forEach(item => {
        itemsMap.set(item.id, item);
      });
    }
  }

  // Create profile lookup map
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // Build enriched messages
  return messages.map(m => {
    const senderProfile = profileMap.get(m.sender_id);
    const linkedItem = m.linked_item_id ? itemsMap.get(m.linked_item_id) : undefined;

    return {
      id: m.id,
      chat_room_id: m.chat_room_id,
      sender_id: m.sender_id,
      content: m.content,
      linked_item_id: m.linked_item_id,
      created_at: m.created_at,
      sender: senderProfile ? {
        id: senderProfile.id,
        display_name: senderProfile.display_name,
        avatar_url: senderProfile.avatar_url,
      } : undefined,
      linked_item: linkedItem,
    };
  });
}

/**
 * Send a message to a chat room
 *
 * RLS validates that:
 * - sender_id matches current user
 * - User is a group member
 * - User is NOT the celebrant
 */
export async function sendMessage(
  chatRoomId: string,
  content: string,
  linkedItemId?: string
): Promise<ChatMessage> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Validate content
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Message content cannot be empty');
  }

  // Insert message
  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert({
      chat_room_id: chatRoomId,
      sender_id: user.id,
      content: trimmedContent,
      linked_item_id: linkedItemId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to send message:', error);
    throw new Error(`Failed to send message: ${error.message}`);
  }

  // Fetch sender info to return complete message
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  // Fetch linked item if present
  let linkedItem;
  if (linkedItemId) {
    const { data: item } = await supabase
      .from('wishlist_items')
      .select('id, title, price, image_url')
      .eq('id', linkedItemId)
      .single();
    linkedItem = item || undefined;
  }

  return {
    id: message.id,
    chat_room_id: message.chat_room_id,
    sender_id: message.sender_id,
    content: message.content,
    linked_item_id: message.linked_item_id,
    created_at: message.created_at,
    sender: profile ? {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    } : undefined,
    linked_item: linkedItem,
  };
}

/**
 * React hook for real-time chat subscription
 *
 * Subscribes to postgres_changes INSERT events on chat_messages table,
 * filtered by chat_room_id. RLS prevents celebrant from receiving events.
 *
 * CRITICAL: Returns cleanup function via useEffect for memory leak prevention.
 * The channel is removed on unmount.
 *
 * Usage:
 * ```typescript
 * useChatSubscription(chatRoomId, (newMessage) => {
 *   setMessages(prev => [...prev, newMessage]);
 * });
 * ```
 *
 * RACE CONDITION NOTE:
 * Messages sent between initial fetch and subscription establishment may be missed.
 * Caller should deduplicate by message ID when adding new messages.
 */
export function useChatSubscription(
  chatRoomId: string | null,
  onNewMessage: (msg: ChatMessage) => void
): void {
  // Memoize callback to prevent unnecessary re-subscriptions
  const handleNewMessage = useCallback(onNewMessage, [onNewMessage]);

  useEffect(() => {
    // Don't subscribe if no chat room ID
    if (!chatRoomId) return;

    let channel: RealtimeChannel | null = null;

    // Async function to set up subscription
    const setupSubscription = async () => {
      // Get current user to enrich messages
      const { data: { user } } = await supabase.auth.getUser();

      channel = supabase
        .channel(`chat:${chatRoomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `chat_room_id=eq.${chatRoomId}`,
          },
          async (payload) => {
            // RLS already prevents celebrant from receiving this event
            const newRow = payload.new as ChatMessageRow;

            // Fetch sender info for the new message
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('id, display_name, avatar_url')
              .eq('id', newRow.sender_id)
              .single();

            // Fetch linked item if present
            let linkedItem;
            if (newRow.linked_item_id) {
              const { data: item } = await supabase
                .from('wishlist_items')
                .select('id, title, price, image_url')
                .eq('id', newRow.linked_item_id)
                .single();
              linkedItem = item || undefined;
            }

            const enrichedMessage: ChatMessage = {
              id: newRow.id,
              chat_room_id: newRow.chat_room_id,
              sender_id: newRow.sender_id,
              content: newRow.content,
              linked_item_id: newRow.linked_item_id,
              created_at: newRow.created_at,
              sender: profile ? {
                id: profile.id,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
              } : undefined,
              linked_item: linkedItem,
            };

            handleNewMessage(enrichedMessage);
          }
        )
        .subscribe();
    };

    setupSubscription();

    // CRITICAL: Cleanup function to prevent memory leaks
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [chatRoomId, handleNewMessage]);
}

/**
 * Delete a message (for future moderation features)
 * Only the sender can delete their own messages
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    throw new Error(`Failed to delete message: ${error.message}`);
  }
}
