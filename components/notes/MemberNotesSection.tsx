/**
 * MemberNotesSection Component
 *
 * Displays secret notes about a member with add/edit/delete functionality.
 *
 * SECURITY: This component should NOT be rendered if isSubject is true.
 * RLS prevents the subject from seeing notes, but we hide the UI entirely
 * to avoid showing an empty section that might cause confusion.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { VStack, HStack } from '@gluestack-ui/themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import {
  getNotesAboutUser,
  createNote,
  updateNote,
  deleteNote,
  type NoteWithAuthor,
} from '@/lib/memberNotes';
import { NoteCard } from './NoteCard';
import { AddNoteSheet } from './AddNoteSheet';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

interface MemberNotesSectionProps {
  groupId: string;
  aboutUserId: string;
  aboutUserName: string;
  isSubject: boolean; // true if current user IS the about_user
}

/**
 * MemberNotesSection manages notes state and renders NoteCard list.
 * Returns null if current user is the subject (no notes visible to them).
 */
export function MemberNotesSection({
  groupId,
  aboutUserId,
  aboutUserName,
  isSubject,
}: MemberNotesSectionProps) {
  const [notes, setNotes] = useState<NoteWithAuthor[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  // Don't render anything for the subject
  if (isSubject) {
    return null;
  }

  // Fetch current user and notes on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Get current user ID
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        // Fetch notes
        const fetchedNotes = await getNotesAboutUser(groupId, aboutUserId);
        setNotes(fetchedNotes);
      } catch (error) {
        console.error('Failed to load notes:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [groupId, aboutUserId]);

  // Handle creating a new note
  const handleCreateNote = useCallback(
    async (content: string) => {
      try {
        const newNote = await createNote(groupId, aboutUserId, content);
        // Prepend to list (newest first)
        setNotes((prev) => [newNote, ...prev]);
      } catch (error) {
        console.error('Failed to create note:', error);
        Alert.alert('Error', 'Failed to add note. Please try again.');
        throw error; // Re-throw so AddNoteSheet knows it failed
      }
    },
    [groupId, aboutUserId]
  );

  // Handle editing a note (optimistic update with rollback)
  const handleEditNote = useCallback(
    async (noteId: string, newContent: string) => {
      // Find the note for rollback
      const noteIndex = notes.findIndex((n) => n.id === noteId);
      if (noteIndex === -1) return;

      const originalNote = notes[noteIndex];

      // Optimistic update
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, content: newContent } : n
        )
      );

      try {
        await updateNote(noteId, newContent);
      } catch (error) {
        // Rollback on error
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? originalNote : n))
        );
        console.error('Failed to update note:', error);
        throw error;
      }
    },
    [notes]
  );

  // Handle deleting a note (optimistic update with rollback)
  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      // Find the note for rollback
      const noteIndex = notes.findIndex((n) => n.id === noteId);
      if (noteIndex === -1) return;

      const deletedNote = notes[noteIndex];

      // Optimistic update
      setNotes((prev) => prev.filter((n) => n.id !== noteId));

      try {
        await deleteNote(noteId);
      } catch (error) {
        // Rollback on error - restore at original position
        setNotes((prev) => {
          const newNotes = [...prev];
          newNotes.splice(noteIndex, 0, deletedNote);
          return newNotes;
        });
        console.error('Failed to delete note:', error);
        throw error;
      }
    },
    [notes]
  );

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.burgundy[500]} />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.card}>
        {/* Section Header */}
        <HStack justifyContent="space-between" alignItems="center" style={styles.header}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => setIsAddSheetOpen(true)}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="plus"
              size={20}
              color={colors.burgundy[600]}
            />
          </Pressable>
        </HStack>

        {/* Notes List or Empty State */}
        {notes.length > 0 ? (
          <VStack space="md">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isAuthor={note.author_id === currentUserId}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
              />
            ))}
          </VStack>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Be the first to add a note!</Text>
            <Text style={styles.emptySubtext}>
              Help others find the perfect gift for {aboutUserName}
            </Text>
            <Pressable
              style={styles.emptyAddButton}
              onPress={() => setIsAddSheetOpen(true)}
            >
              <MaterialCommunityIcons
                name="note-plus"
                size={18}
                color={colors.white}
              />
              <Text style={styles.emptyAddButtonText}>Add Note</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Add Note Sheet */}
      <AddNoteSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onSubmit={handleCreateNote}
        memberName={aboutUserName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.burgundy[800],
  },
  addButton: {
    backgroundColor: colors.burgundy[50],
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.burgundy[100],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.cream[700],
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.cream[500],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.burgundy[600],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  emptyAddButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});

export default MemberNotesSection;
