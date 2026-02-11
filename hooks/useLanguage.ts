/**
 * useLanguage hook
 *
 * Exposes current language state and change function for React components.
 * Integrates with react-i18next for reactive updates.
 * Supports server sync when userId is provided.
 *
 * Usage:
 * ```tsx
 * const { user } = useAuth();
 * const { currentLanguage, changeLanguage, isLoading, supportedLanguages, syncFromServer } = useLanguage(user?.id);
 *
 * // In settings screen:
 * <Button onPress={() => changeLanguage('es')}>Switch to Spanish</Button>
 *
 * // After login:
 * useEffect(() => { syncFromServer(); }, [syncFromServer]);
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getLanguagePreference,
  setLanguagePreference,
  syncLanguageFromServer,
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
  /** Sync language preference from server (call after login) */
  syncFromServer: () => Promise<void>;
}

export function useLanguage(userId?: string): UseLanguageReturn {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    i18n.language as SupportedLanguage
  );

  // Load language preference on mount and when userId changes (login/logout)
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const lang = await getLanguagePreference(userId);
        setCurrentLanguage(lang);
      } catch (error) {
        console.error('[useLanguage] Failed to load language:', error);
      }
    };
    loadLanguage();
  }, [userId]);

  const changeLanguage = useCallback(
    async (language: SupportedLanguage) => {
      if (language === currentLanguage) {
        return; // No-op if same language
      }

      setIsLoading(true);
      try {
        await setLanguagePreference(language, userId);
        setCurrentLanguage(language);
        // Note: i18n.language updates automatically via setLanguagePreference
        // UI re-renders due to react-i18next bindI18n config
      } catch (error) {
        console.error('[useLanguage] Failed to change language:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [currentLanguage, userId]
  );

  const syncFromServer = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const lang = await syncLanguageFromServer(userId);
      setCurrentLanguage(lang);
    } catch (error) {
      console.error('[useLanguage] Server sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return {
    currentLanguage,
    changeLanguage,
    isLoading,
    supportedLanguages: SUPPORTED_LANGUAGES,
    syncFromServer,
  };
}
