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
