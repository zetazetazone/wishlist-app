import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resources, defaultNS } from './resources';

export const LANGUAGE_KEY = '@app_language';
export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Detect device language with fallback to English
const getDeviceLanguage = (): SupportedLanguage => {
  try {
    const locales = getLocales();
    const deviceLang = locales[0]?.languageCode;

    if (deviceLang && SUPPORTED_LANGUAGES.includes(deviceLang as SupportedLanguage)) {
      return deviceLang as SupportedLanguage;
    }
  } catch {
    // expo-localization native module may not be available (e.g., in Expo Go)
    console.warn('[i18n] getLocales failed, defaulting to English');
  }
  return 'en';
};

// Initialize with async language detection
export const initI18n = async (): Promise<typeof i18n> => {
  // Try local storage first, then device language
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  const initialLanguage = (savedLanguage as SupportedLanguage) || getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    defaultNS,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false, // Disable for React Native
      bindI18n: 'languageChanged loaded', // Re-render on language change
    },
    // Development: log missing keys
    saveMissing: __DEV__,
    missingKeyHandler: (_lngs, _ns, key) => {
      if (__DEV__) {
        console.warn(`[i18n] Missing translation key: ${key}`);
      }
    },
  });

  return i18n;
};

export { i18n };
export default i18n;
