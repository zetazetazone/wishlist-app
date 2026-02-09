/**
 * Member Notes Library
 * Short notes about group members for gift coordination
 *
 * SECURITY: RLS Pattern: Subject Exclusion
 * - Group members can view notes EXCEPT notes about themselves
 * - Only authors can update or delete their own notes
 *
 * Constraints:
 * - Content max 280 characters (enforced by CHECK constraint at DB level)
 * - Notes are scoped per-group (same person can have different notes in different groups)
 * - Authors can only write notes about OTHER members (not themselves)
 */

import { supabase } from './supabase';
import type { MemberNote } from '../types/database.types';

/** Note with author profile info */
export interface NoteWithAuthor extends MemberNote {
  author?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Get all notes about a specific user within a group
 *
 * RLS automatically excludes the note subject -- if the current user
 * IS the about_user_id, this returns empty (subject exclusion pattern).
 * Includes author profile info for display.
 *
 * @param groupId - UUID of the group
 * @param aboutUserId - UUID of the user the notes are about
 */
export async function getNotesAboutUser(
  groupId: string,
  aboutUserId: string
): Promise<NoteWithAuthor[]> {
  const { data: notes, error } = await supabase
    .from('member_notes')
    .select('*')
    .eq('group_id', groupId)
    .eq('about_user_id', aboutUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch member notes:', error);
    return [];
  }

  if (!notes || notes.length === 0) return [];

  // Batch-fetch author profiles
  const authorIds = [...new Set(notes.map((n) => n.author_id))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .in('id', authorIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  return notes.map((n) => {
    const profile = profileMap.get(n.author_id);
    return {
      ...n,
      author: profile
        ? {
            id: profile.id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          }
        : undefined,
    };
  });
}

/**
 * Create a note about a group member
 *
 * RLS validates:
 * - author_id matches current user
 * - about_user_id is NOT the current user (can't write notes about yourself)
 * - Author is a member of the group
 *
 * DB CHECK constraint enforces max 280 characters.
 *
 * @param groupId - UUID of the group
 * @param aboutUserId - UUID of the user the note is about
 * @param content - Note text (max 280 characters)
 */
export async function createNote(
  groupId: string,
  aboutUserId: string,
  content: string
): Promise<NoteWithAuthor> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Client-side validation (DB enforces too via CHECK constraint)
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Note content cannot be empty');
  }
  if (trimmedContent.length > 280) {
    throw new Error('Note content cannot exceed 280 characters');
  }

  const { data: note, error } = await supabase
    .from('member_notes')
    .insert({
      group_id: groupId,
      about_user_id: aboutUserId,
      author_id: user.id,
      content: trimmedContent,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create member note:', error);
    throw new Error(`Failed to create note: ${error.message}`);
  }

  // Fetch author profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  return {
    ...note,
    author: profile
      ? {
          id: profile.id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        }
      : undefined,
  };
}

/**
 * Update an existing note (author only)
 *
 * RLS enforces author-only update. Content max 280 characters.
 *
 * @param noteId - UUID of the note to update
 * @param content - New note text (max 280 characters)
 */
export async function updateNote(
  noteId: string,
  content: string
): Promise<NoteWithAuthor> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Client-side validation
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Note content cannot be empty');
  }
  if (trimmedContent.length > 280) {
    throw new Error('Note content cannot exceed 280 characters');
  }

  const { data: note, error } = await supabase
    .from('member_notes')
    .update({ content: trimmedContent })
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update member note:', error);
    throw new Error(`Failed to update note: ${error.message}`);
  }

  // Fetch author profile for return type
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  return {
    ...note,
    author: profile
      ? {
          id: profile.id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        }
      : undefined,
  };
}

/**
 * Delete a note (author only)
 *
 * RLS enforces author-only delete.
 *
 * @param noteId - UUID of the note to delete
 */
export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('member_notes')
    .delete()
    .eq('id', noteId);

  if (error) {
    console.error('Failed to delete member note:', error);
    throw new Error(`Failed to delete note: ${error.message}`);
  }
}
