/**
 * useLanguage hook
 *
 * Exposes current language state and change function for React components.
 * Integrates with react-i18next for reactive updates.
 *
 * Usage:
 * ```tsx
 * const { currentLanguage, changeLanguage, isLoading, supportedLanguages } = useLanguage();
 *
 * // In settings screen:
 * <Button onPress={() => changeLanguage('es')}>Switch to Spanish</Button>
 * ```
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  setLanguagePreference,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '../lib/language';

export interface UseLanguageReturn {
  /** Current active language code */
  currentLanguage: SupportedLanguage;
  /** Change language with loading state management */
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  /** Loading state during language change */
  isLoading: boolean;
  /** List of supported language codes */
  supportedLanguages: readonly SupportedLanguage[];
}

export function useLanguage(): UseLanguageReturn {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const currentLanguage = i18n.language as SupportedLanguage;

  const changeLanguage = useCallback(
    async (language: SupportedLanguage) => {
      if (language === currentLanguage) {
        return; // No-op if same language
      }

      setIsLoading(true);
      try {
        await setLanguagePreference(language);
        // Note: i18n.language updates automatically via setLanguagePreference
        // UI re-renders due to react-i18next bindI18n config
      } catch (error) {
        console.error('[useLanguage] Failed to change language:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [currentLanguage]
  );

  return {
    currentLanguage,
    changeLanguage,
    isLoading,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
