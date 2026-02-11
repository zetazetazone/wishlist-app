/**
 * Language preference service
 *
 * Handles language preference get/set with three-tier hierarchy:
 * 1. Server (Supabase users.preferred_language) - when authenticated
 * 2. Local (AsyncStorage) - offline cache
 * 3. Device (expo-localization) - fallback
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from '../src/i18n';
import { LANGUAGE_KEY, SUPPORTED_LANGUAGES, SupportedLanguage } from '../src/i18n';
import { supabase } from './supabase';

// Re-export from i18n for convenience
export { LANGUAGE_KEY, SUPPORTED_LANGUAGES } from '../src/i18n';
export type { SupportedLanguage } from '../src/i18n';

/**
 * Get device language from expo-localization
 * @returns Supported device language or 'en' as fallback
 */
function getDeviceLanguage(): SupportedLanguage {
  try {
    const locales = getLocales();
    const deviceLang = locales[0]?.languageCode;
    return isSupported(deviceLang || '') ? (deviceLang as SupportedLanguage) : 'en';
  } catch {
    // expo-localization native module may not be available (e.g., in Expo Go)
    console.warn('[language] getLocales failed, defaulting to English');
    return 'en';
  }
}

/**
 * Get current language preference with three-tier hierarchy:
 * 1. Server (if userId provided)
 * 2. Local AsyncStorage
 * 3. Device language detection
 *
 * @param userId - Optional user ID for server sync
 * @returns Language preference from highest available tier
 */
export async function getLanguagePreference(userId?: string): Promise<SupportedLanguage> {
  // Tier 1: Check server (if authenticated)
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('preferred_language')
        .eq('id', userId)
        .single();

      if (!error && data?.preferred_language && isSupported(data.preferred_language)) {
        // Cache locally for offline use
        await AsyncStorage.setItem(LANGUAGE_KEY, data.preferred_language);
        return data.preferred_language as SupportedLanguage;
      }
    } catch (error) {
      console.warn('[language] Server fetch failed, using local fallback:', error);
    }
  }

  // Tier 2: Check local storage
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved && isSupported(saved)) {
      return saved as SupportedLanguage;
    }
  } catch (error) {
    console.warn('[language] Failed to read language preference:', error);
  }

  // Tier 3: Device detection (fallback)
  return getDeviceLanguage();
}

/**
 * Set language preference - updates i18next, persists locally, and syncs to server
 * @param language - The language code to set ('en' or 'es')
 * @param userId - Optional user ID for server sync
 */
export async function setLanguagePreference(
  language: SupportedLanguage,
  userId?: string
): Promise<void> {
  // Validate language code
  if (!isSupported(language)) {
    console.warn(`[language] Invalid language code: ${language}, falling back to 'en'`);
    language = 'en';
  }

  try {
    // 1. Update i18next (triggers UI re-render via bindI18n config)
    await i18n.changeLanguage(language);

    // 2. Persist to AsyncStorage (local cache)
    await AsyncStorage.setItem(LANGUAGE_KEY, language);

    // 3. Sync to server if authenticated
    if (userId) {
      const { error } = await supabase
        .from('users')
        .update({ preferred_language: language })
        .eq('id', userId);

      if (error) {
        console.warn('[language] Server sync failed:', error);
        // Don't throw - local preference is set, server can sync later
      }
    }
  } catch (error) {
    console.error('[language] Failed to set language preference:', error);
    throw error;
  }
}

/**
 * Check if a language code is supported
 */
export function isSupported(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Sync language preference from server (for explicit sync, e.g., on login)
 * @param userId - User ID to fetch preference for
 * @returns Language preference from server or current language if sync fails
 */
export async function syncLanguageFromServer(userId: string): Promise<SupportedLanguage> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('preferred_language')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const serverLang = data?.preferred_language;
    if (serverLang && isSupported(serverLang)) {
      // Update i18next and local cache
      await i18n.changeLanguage(serverLang);
      await AsyncStorage.setItem(LANGUAGE_KEY, serverLang);
      return serverLang as SupportedLanguage;
    }
  } catch (error) {
    console.warn('[language] Server sync failed:', error);
  }

  // Return current language if sync fails
  return i18n.language as SupportedLanguage;
}
