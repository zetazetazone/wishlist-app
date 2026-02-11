/**
 * Language preference service
 *
 * Handles language preference get/set with local persistence via AsyncStorage.
 * Phase 30 will extend this with server sync to Supabase.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../src/i18n';
import { LANGUAGE_KEY, SUPPORTED_LANGUAGES, SupportedLanguage } from '../src/i18n';

// Re-export from i18n for convenience
export { LANGUAGE_KEY, SUPPORTED_LANGUAGES } from '../src/i18n';
export type { SupportedLanguage } from '../src/i18n';

/**
 * Get current language preference from AsyncStorage
 * @returns Saved language or 'en' as default
 */
export async function getLanguagePreference(): Promise<SupportedLanguage> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)) {
      return saved as SupportedLanguage;
    }
  } catch (error) {
    console.warn('[language] Failed to read language preference:', error);
  }
  return 'en';
}

/**
 * Set language preference - updates i18next and persists to AsyncStorage
 * @param language - The language code to set ('en' or 'es')
 *
 * Note: Phase 30 will add optional userId parameter for server sync
 */
export async function setLanguagePreference(language: SupportedLanguage): Promise<void> {
  // Validate language code
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    console.warn(`[language] Invalid language code: ${language}, falling back to 'en'`);
    language = 'en';
  }

  try {
    // 1. Update i18next (triggers UI re-render via bindI18n config)
    await i18n.changeLanguage(language);

    // 2. Persist to AsyncStorage
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
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
