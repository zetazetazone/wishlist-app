/**
 * ChatInput Component
 * Message input field with send button
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = message.trim().length > 0 && !disabled && !sending;

  const handleSend = async () => {
    if (!canSend) return;

    const content = message.trim();
    setMessage(''); // Clear immediately for better UX

    setSending(true);
    try {
      await onSend(content);
    } catch (error) {
      // Restore message on failure
      setMessage(content);
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={1000}
          editable={!disabled}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
      </View>

      <Pressable
        style={[
          styles.sendButton,
          canSend ? styles.sendButtonActive : styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={!canSend}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <MaterialCommunityIcons
            name="send"
            size={20}
            color={canSend ? '#ffffff' : '#9ca3af'}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  input: {
    fontSize: 15,
    color: '#1f2937',
    minHeight: 24,
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#8B1538',
  },
  sendButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
});
