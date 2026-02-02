/**
 * ChatList Component
 * FlashList-based message list with realtime updates
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getMessages,
  useChatSubscription,
  type ChatMessage,
} from '../../lib/chat';
import { ChatBubble } from './ChatBubble';
import { supabase } from '../../lib/supabase';

interface ChatListProps {
  chatRoomId: string;
  onLinkedItemPress?: (itemId: string) => void;
}

/**
 * ChatList renders messages with realtime updates
 *
 * Uses FlashList with maintainVisibleContentPosition for chat UX.
 * Subscription is set up internally and cleaned up on unmount.
 */
export function ChatList({ chatRoomId, onLinkedItemPress }: ChatListProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Track message IDs to prevent duplicates from race conditions
  const messageIdsRef = useRef<Set<string>>(new Set());
  const listRef = useRef<FlashList<ChatMessage> | null>(null);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getMessages(chatRoomId);

        // Track all message IDs
        messageIdsRef.current = new Set(data.map(m => m.id));
        setMessages(data);
      } catch (err) {
        console.error('Failed to load messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [chatRoomId]);

  // Handle new message from realtime subscription
  const handleNewMessage = useCallback((newMessage: ChatMessage) => {
    // Deduplicate by message ID (race condition prevention)
    if (messageIdsRef.current.has(newMessage.id)) {
      return;
    }

    messageIdsRef.current.add(newMessage.id);
    setMessages(prev => [...prev, newMessage]);

    // Auto-scroll to bottom for new messages
    // Small delay to ensure FlashList has updated
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Set up realtime subscription
  useChatSubscription(chatRoomId, handleNewMessage);

  // Render individual message
  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble
        message={item}
        isOwnMessage={item.sender_id === currentUserId}
        onLinkedItemPress={onLinkedItemPress}
      />
    ),
    [currentUserId, onLinkedItemPress]
  );

  // Key extractor for FlashList
  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // Loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B1538" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color="#ef4444"
        />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons
          name="chat-outline"
          size={64}
          color="#d1d5db"
        />
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptySubtitle}>
          Start the conversation! Coordinate the gift with your group.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      ref={listRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={keyExtractor}
      estimatedItemSize={80}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      // FlashList v2 pattern for chat UX
      // Note: maintainVisibleContentPosition helps with new message insertion
      onContentSizeChange={() => {
        // Scroll to end when content changes (new messages)
        listRef.current?.scrollToEnd({ animated: false });
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  listContent: {
    paddingVertical: 8,
  },
});
