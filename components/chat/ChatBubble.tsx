/**
 * ChatBubble Component
 * Individual chat message bubble with sender info and linked items
 */

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalizedFormat } from '../../hooks/useLocalizedFormat';
import type { ChatMessage } from '../../lib/chat';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  onLinkedItemPress?: (itemId: string) => void;
}

export function ChatBubble({
  message,
  isOwnMessage,
  onLinkedItemPress,
}: ChatBubbleProps) {
  const { t } = useTranslation();
  const { formatDistanceToNow } = useLocalizedFormat();

  const senderName = message.sender?.display_name || t('common.unknown');
  const senderInitial = senderName.charAt(0).toUpperCase();

  const formatTimestamp = (dateString: string): string => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <View
      style={[
        styles.container,
        isOwnMessage ? styles.containerOwn : styles.containerOther,
      ]}
    >
      {/* Avatar for other users' messages */}
      {!isOwnMessage && (
        <View style={styles.avatarContainer}>
          {message.sender?.avatar_url ? (
            <Image
              source={{ uri: message.sender.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{senderInitial}</Text>
            </View>
          )}
        </View>
      )}

      <View
        style={[
          styles.bubbleWrapper,
          isOwnMessage ? styles.bubbleWrapperOwn : styles.bubbleWrapperOther,
        ]}
      >
        {/* Sender name for other users */}
        {!isOwnMessage && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}

        {/* Message bubble */}
        <View
          style={[
            styles.bubble,
            isOwnMessage ? styles.bubbleOwn : styles.bubbleOther,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.messageTextOwn : styles.messageTextOther,
            ]}
          >
            {message.content}
          </Text>

          {/* Linked wishlist item card */}
          {message.linked_item && (
            <Pressable
              style={styles.linkedItemCard}
              onPress={() => onLinkedItemPress?.(message.linked_item!.id)}
            >
              {message.linked_item.image_url && (
                <Image
                  source={{ uri: message.linked_item.image_url }}
                  style={styles.linkedItemImage}
                />
              )}
              <View style={styles.linkedItemInfo}>
                <Text style={styles.linkedItemTitle} numberOfLines={2}>
                  {message.linked_item.title}
                </Text>
                {message.linked_item.price !== null && (
                  <Text style={styles.linkedItemPrice}>
                    ${message.linked_item.price.toFixed(2)}
                  </Text>
                )}
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#9ca3af"
              />
            </Pressable>
          )}
        </View>

        {/* Timestamp */}
        <Text
          style={[
            styles.timestamp,
            isOwnMessage ? styles.timestampOwn : styles.timestampOther,
          ]}
        >
          {formatTimestamp(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  containerOwn: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  bubbleWrapper: {
    maxWidth: '75%',
  },
  bubbleWrapperOwn: {
    alignItems: 'flex-end',
  },
  bubbleWrapperOther: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: '#8B1538',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#ffffff',
  },
  messageTextOther: {
    color: '#1f2937',
  },
  linkedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  linkedItemImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 8,
  },
  linkedItemInfo: {
    flex: 1,
  },
  linkedItemTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },
  linkedItemPrice: {
    fontSize: 12,
    color: '#22c55e',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    marginHorizontal: 4,
  },
  timestampOwn: {
    textAlign: 'right',
  },
  timestampOther: {
    textAlign: 'left',
  },
});
