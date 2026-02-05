import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/**
 * Upload avatar image to Supabase Storage
 * @param userId - The user's ID to associate with the avatar
 * @returns The storage path of the uploaded avatar or null if failed
 */
export async function uploadAvatar(userId: string): Promise<string | null> {
  try {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.error('Media library permissions not granted');
      return null;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    const uri = result.assets[0].uri;

    // Convert image to ArrayBuffer
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    // Generate unique file name
    const fileExt = uri.split('.').pop() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error('Error in uploadAvatar:', error);
    return null;
  }
}

/**
 * Get public URL for an avatar from storage
 * @param path - The storage path of the avatar
 * @returns The public URL or null if failed
 */
export function getAvatarUrl(path: string | null): string | null {
  if (!path) return null;

  try {
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    console.error('Error getting avatar URL:', error);
    return null;
  }
}

/**
 * Upload group photo image to Supabase Storage
 * @param groupId - The group's ID to associate with the photo
 * @returns The storage path of the uploaded photo or null if failed/canceled
 */
export async function uploadGroupPhoto(groupId: string): Promise<string | null> {
  try {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.error('Media library permissions not granted');
      return null;
    }

    // Launch image picker with 16:9 aspect for group headers
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (result.canceled) {
      return null;
    }

    const uri = result.assets[0].uri;

    // Convert image to ArrayBuffer (image picker quality param handles compression)
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    // Generate unique file name in groups folder
    const fileName = `${Date.now()}.jpg`;
    const filePath = `groups/${groupId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading group photo:', error);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error('Error in uploadGroupPhoto:', error);
    return null;
  }
}

/**
 * Get public URL for a group photo from storage
 * @param path - The storage path of the group photo
 * @returns The public URL or null if path is null
 */
export function getGroupPhotoUrl(path: string | null): string | null {
  if (!path) return null;

  try {
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    console.error('Error getting group photo URL:', error);
    return null;
  }
}

/**
 * Upload group photo from a local URI to Supabase Storage
 * Use this when you already have a picked image URI (e.g., from a preview)
 * @param uri - The local image URI to upload
 * @param groupId - The group's ID to associate with the photo
 * @returns The storage path of the uploaded photo or null if failed
 */
export async function uploadGroupPhotoFromUri(uri: string, groupId: string): Promise<string | null> {
  try {
    // Convert image to ArrayBuffer (compression deferred to dev build with expo-image-manipulator)
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    // Generate unique file name in groups folder
    const fileName = `${Date.now()}.jpg`;
    const filePath = `groups/${groupId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading group photo:', error);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error('Error in uploadGroupPhotoFromUri:', error);
    return null;
  }
}
