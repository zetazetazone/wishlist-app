/**
 * NoteCard Component
 *
 * Displays a single secret note with author info and optional actions.
 * Shows author avatar, name, timestamp, and note content.
 * Edit/delete buttons shown only if isAuthor is true.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { HStack, Avatar, AvatarImage, AvatarFallbackText } from '@gluestack-ui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import type { NoteWithAuthor } from '@/lib/memberNotes';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

interface NoteCardProps {
  note: NoteWithAuthor;
  isAuthor: boolean;
  onEdit?: (noteId: string, newContent: string) => Promise<void>;
  onDelete?: (noteId: string) => Promise<void>;
}

const MAX_CHARS = 280;

/**
 * Get initials from a display name.
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/**
 * NoteCard displays a single note with author info and optional edit/delete actions.
 */
export function NoteCard({ note, isAuthor, onEdit, onDelete }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);

  const authorName = note.author?.display_name || 'Unknown';
  const authorInitials = getInitials(note.author?.display_name);
  const avatarUrl = note.author?.avatar_url;

  const charsRemaining = MAX_CHARS - editContent.length;
  const isOverLimit = charsRemaining < 0;
  const isNearLimit = charsRemaining <= 20 && charsRemaining >= 0;

  const handleEditPress = () => {
    setEditContent(note.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!onEdit) return;

    const trimmedContent = editContent.trim();
    if (!trimmedContent) {
      Alert.alert('Error', 'Note cannot be empty');
      return;
    }
    if (trimmedContent.length > MAX_CHARS) {
      Alert.alert('Error', `Note cannot exceed ${MAX_CHARS} characters`);
      return;
    }

    setIsSaving(true);
    try {
      await onEdit(note.id, trimmedContent);
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePress = () => {
    if (!onDelete) return;

    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete(note.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Author Row */}
      <HStack space="sm" alignItems="center" style={styles.authorRow}>
        <Avatar bgColor="$primary500" size="sm">
          {avatarUrl && (
            <AvatarImage source={{ uri: avatarUrl }} alt={authorName} />
          )}
          <AvatarFallbackText>{authorInitials}</AvatarFallbackText>
        </Avatar>

        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.timestamp}>
            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
          </Text>
        </View>
      </HStack>

      {/* Content */}
      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            autoFocus
            maxLength={MAX_CHARS + 50} // Allow slight overflow to show error
            placeholder="Enter your note..."
            placeholderTextColor={colors.cream[400]}
          />
          <View style={styles.editFooter}>
            <Text
              style={[
                styles.charCounter,
                isNearLimit && styles.charCounterWarning,
                isOverLimit && styles.charCounterError,
              ]}
            >
              {charsRemaining}
            </Text>
            <View style={styles.editActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={handleCancelEdit}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  (isOverLimit || isSaving) && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveEdit}
                disabled={isOverLimit || isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <Text style={styles.content}>{note.content}</Text>
      )}

      {/* Author Actions */}
      {isAuthor && !isEditing && (
        <HStack space="md" style={styles.actionsRow}>
          <Pressable
            style={styles.actionButton}
            onPress={handleEditPress}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={18}
              color={colors.burgundy[500]}
            />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={handleDeletePress}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={18}
              color={colors.warning}
            />
          </Pressable>
        </HStack>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  authorRow: {
    marginBottom: spacing.sm,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.burgundy[700],
  },
  timestamp: {
    fontSize: 12,
    color: colors.cream[600],
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.cream[800],
  },
  editContainer: {
    marginTop: spacing.xs,
  },
  editInput: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.cream[800],
    backgroundColor: colors.cream[100],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.cream[200],
  },
  editFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  charCounter: {
    fontSize: 13,
    color: colors.cream[600],
  },
  charCounterWarning: {
    color: colors.warning,
  },
  charCounterError: {
    color: colors.error,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.cream[600],
  },
  saveButton: {
    backgroundColor: colors.burgundy[700],
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  saveButtonDisabled: {
    backgroundColor: colors.cream[300],
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  actionsRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cream[200],
  },
  actionButton: {
    padding: spacing.xs,
  },
});

export default NoteCard;
