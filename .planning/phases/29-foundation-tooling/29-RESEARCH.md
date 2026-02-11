# Phase 29: Foundation & Tooling - Research

**Researched:** 2026-02-11
**Domain:** i18n/Localization infrastructure for React Native/Expo
**Confidence:** HIGH

## Summary

Phase 29 establishes the localization foundation for v1.5: i18next configuration, expo-localization device detection, AsyncStorage persistence, TypeScript type safety, and database schema for server-side language preference. This phase creates the infrastructure that all subsequent localization phases build upon.

The stack is `expo-localization` (device language detection) + `i18next` + `react-i18next` (translation engine). This is the Expo-recommended approach with 25M+ weekly npm downloads. The project already has AsyncStorage installed for session persistence, which handles local language caching without additional dependencies.

**Primary recommendation:** Configure i18next with TypeScript type augmentation from day one. Create the `i18next.d.ts` declaration file alongside the initial configuration to ensure translation keys have autocomplete and compile-time validation. Add a `preferred_language` column to the users table to enable server-side language preference storage.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-localization` | `~17.0.8` | Device locale detection | Official Expo SDK library; `getLocales()` hook for reactive locale data; SDK 54 compatible |
| `i18next` | `^25.8.5` | Core translation engine | 25M+ weekly downloads; interpolation, pluralization, context; TypeScript 5+ support |
| `react-i18next` | `^16.5.4` | React bindings for i18next | `useTranslation()` hook; React 19 compatible; suspended/async loading support |

### Supporting (Already Installed)
| Library | Current Version | Purpose for i18n | Notes |
|---------|-----------------|------------------|-------|
| `@react-native-async-storage/async-storage` | `^2.2.0` | Persist user language preference locally | Already in dependencies; pattern from `lib/supabase.ts` |
| `@supabase/supabase-js` | `^2.93.3` | Store `preferred_language` in user profile | Already in dependencies; syncs across devices |

### What NOT to Install
| Package | Why Not Needed |
|---------|---------------|
| `i18next-react-native-async-storage` | Over-engineered; manual `AsyncStorage.getItem/setItem` is simpler |
| `@formatjs/intl-locale` polyfill | Only needed for complex plural languages; en/es have simple rules |
| `@formatjs/intl-pluralrules` polyfill | Hermes handles en/es plural rules natively |
| `eslint-plugin-i18next` | Phase 29 scope is foundation only; linting added in Phase 32 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| i18next | Lingui | Smaller bundle (10.4KB vs ~15KB) but requires Babel macro setup; adds build complexity |
| i18next | i18n-js | Simpler API but no React hooks; manual re-renders on language change |
| react-i18next | react-intl | ICU MessageFormat is powerful but complex; overkill for en/es only |

**Installation:**
```bash
# Use npx expo install for SDK 54 version resolution
npx expo install expo-localization
npm install i18next@^25.8.5 react-i18next@^16.5.4
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  i18n/                      # NEW: i18n configuration
    index.ts                 # i18next initialization and export
    resources.ts             # Combines all locale resources
    types/
      i18next.d.ts           # TypeScript module augmentation
    locales/
      en.json                # English translations (Phase 30)
      es.json                # Spanish translations (Phase 30)

lib/
  supabase.ts                # (existing) Supabase client
  language.ts                # NEW: Language service (get/set/sync)

hooks/
  useLanguage.ts             # NEW: Language state and change hook
```

### Pattern 1: i18next Initialization with AsyncStorage
**What:** Configure i18next at app startup with device detection and local storage fallback
**When to use:** App initialization in root layout

**Example:**
```typescript
// src/i18n/index.ts
// Source: https://www.i18next.com/overview/configuration-options + Expo Localization Guide
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resources } from './resources';

const LANGUAGE_KEY = '@app_language';
const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Detect device language with fallback
const getDeviceLanguage = (): SupportedLanguage => {
  const deviceLang = getLocales()[0]?.languageCode;
  return SUPPORTED_LANGUAGES.includes(deviceLang as SupportedLanguage)
    ? (deviceLang as SupportedLanguage)
    : 'en';
};

// Initialize with async language detection
const initI18n = async () => {
  // Try local storage first
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  const initialLanguage = (savedLanguage as SupportedLanguage) || getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React already escapes
    react: {
      useSuspense: false, // Disable for React Native
      bindI18n: 'languageChanged loaded', // Re-render on language change
    },
    // Development: log missing keys
    saveMissing: __DEV__,
    missingKeyHandler: (lngs, ns, key) => {
      if (__DEV__) console.warn(`Missing translation: ${key}`);
    },
  });

  return i18n;
};

export { i18n, initI18n, LANGUAGE_KEY, SUPPORTED_LANGUAGES };
export type { SupportedLanguage };
```

### Pattern 2: TypeScript Type-Safe Keys
**What:** Module augmentation for autocomplete and compile-time validation
**When to use:** Always - set up before any translation work begins

**Example:**
```typescript
// src/i18n/types/i18next.d.ts
// Source: https://www.i18next.com/overview/typescript
import 'i18next';
import type { resources } from '../resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: typeof resources['en'];
    // Strict key checking - fails on invalid keys
    strictKeyChecks: true;
  }
}
```

```typescript
// src/i18n/resources.ts
// Using as const for type inference
import en from './locales/en.json';
import es from './locales/es.json';

export const resources = {
  en: { translation: en },
  es: { translation: es },
} as const;

export const defaultNS = 'translation';
```

### Pattern 3: Language Preference Service
**What:** Service layer for language get/set with local + server sync
**When to use:** Any language change operation

**Example:**
```typescript
// lib/language.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, LANGUAGE_KEY, SupportedLanguage, SUPPORTED_LANGUAGES } from '../src/i18n';
import { supabase } from './supabase';

export async function getLanguagePreference(): Promise<SupportedLanguage> {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  return (saved as SupportedLanguage) || 'en';
}

export async function setLanguagePreference(
  language: SupportedLanguage,
  userId?: string
): Promise<void> {
  // 1. Update i18next
  await i18n.changeLanguage(language);

  // 2. Persist locally
  await AsyncStorage.setItem(LANGUAGE_KEY, language);

  // 3. Sync to server (if authenticated)
  if (userId) {
    await supabase
      .from('users')
      .update({ preferred_language: language })
      .eq('id', userId);
  }
}

export async function loadServerLanguagePreference(userId: string): Promise<SupportedLanguage | null> {
  const { data } = await supabase
    .from('users')
    .select('preferred_language')
    .eq('id', userId)
    .single();

  return data?.preferred_language as SupportedLanguage | null;
}
```

### Pattern 4: useLanguage Hook
**What:** React hook exposing language state and change function
**When to use:** Settings screen, anywhere language needs to be changed or displayed

**Example:**
```typescript
// hooks/useLanguage.ts
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import {
  setLanguagePreference,
  loadServerLanguagePreference,
  SupportedLanguage,
  SUPPORTED_LANGUAGES
} from '../lib/language';

export function useLanguage() {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const currentLanguage = i18n.language as SupportedLanguage;

  const changeLanguage = useCallback(async (language: SupportedLanguage) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await setLanguagePreference(language, session?.user?.id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync server preference on mount (for cross-device sync)
  useEffect(() => {
    async function syncServerPreference() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const serverLang = await loadServerLanguagePreference(session.user.id);
        if (serverLang && serverLang !== currentLanguage) {
          await setLanguagePreference(serverLang, session.user.id);
        }
      }
    }
    syncServerPreference();
  }, []);

  return {
    currentLanguage,
    changeLanguage,
    isLoading,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
```

### Anti-Patterns to Avoid
- **Hardcoded fallbacks:** Don't use `t('key') || 'Default'` - configure i18next's `missingKeyHandler` instead
- **Inline language detection:** Don't call `getLocales()` in components - use the language service
- **Skipping TypeScript setup:** Don't delay `i18next.d.ts` creation - it's harder to retrofit

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pluralization | Manual count conditionals | i18next `_one`/`_other` suffixes | Language-specific plural rules are complex (Arabic has 6 forms) |
| Interpolation | String concatenation | i18next `{{variable}}` syntax | Word order varies by language |
| Language detection | Manual device locale parsing | `expo-localization.getLocales()` | Handles iOS/Android differences, regional variants |
| Translation loading | Custom JSON loaders | i18next resources config | Handles namespaces, fallbacks, missing keys |

**Key insight:** i18next has solved these problems for 10+ years. Custom solutions will miss edge cases (RTL, plural rules, namespace isolation) that the library handles.

## Common Pitfalls

### Pitfall 1: Language Change Doesn't Update All UI
**What goes wrong:** User changes language, some screens update, others don't until app restart
**Why it happens:** React.memo components, cached navigation titles, stale context
**How to avoid:**
- Configure `react.bindI18n: 'languageChanged loaded'` in i18next init
- Use dynamic tab labels: `tabBarLabel: () => { const { t } = useTranslation(); return t('tabs.home'); }`
- For expo-router, may need `<Stack key={i18n.language}>` to force nav re-render
**Warning signs:** Tab bar stays in old language, list items show mixed languages

### Pitfall 2: AsyncStorage Language Doesn't Persist
**What goes wrong:** Language resets to device default on app restart
**Why it happens:** i18next initialized before AsyncStorage read completes
**How to avoid:**
- Use async initialization pattern (see Pattern 1)
- Load language preference before calling `i18n.init()`
- Consider splash screen extension while loading
**Warning signs:** Language flickers on app startup

### Pitfall 3: TypeScript Types Not Working
**What goes wrong:** No autocomplete, `t('any.key')` accepts invalid keys
**Why it happens:** `i18next.d.ts` not in TypeScript include paths, or missing `as const`
**How to avoid:**
- Place `i18next.d.ts` in `src/` or configure `tsconfig.json` includes
- Use `as const` assertion on resources object
- Enable `strictNullChecks` in tsconfig
**Warning signs:** `t()` accepts any string, no red squiggles on typos

### Pitfall 4: Server Preference Not Syncing
**What goes wrong:** User sets Spanish on phone, sees English on tablet login
**Why it happens:** Only AsyncStorage used, no server sync on auth
**How to avoid:**
- Query `users.preferred_language` on authentication
- Sync server → local on login, local → server on change
- Handle offline gracefully (queue server sync)
**Warning signs:** No `preferred_language` column in database

## Code Examples

### Database Migration for Language Preference
```sql
-- Source: Phase 29 requirement PERS-01, pattern from existing migrations
-- Migration: 20260211000002_language_preference.sql

-- 1. Add preferred_language column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en'
CHECK (preferred_language IN ('en', 'es'));

-- 2. Update user_profiles view to expose language
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  id,
  email,
  full_name AS display_name,
  avatar_url,
  birthday,
  preferred_language,  -- NEW
  onboarding_completed,
  created_at,
  updated_at
FROM public.users;

-- 3. Update view triggers to handle language updates
CREATE OR REPLACE FUNCTION public.user_profiles_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    full_name = COALESCE(NEW.display_name, full_name),
    avatar_url = NEW.avatar_url,
    birthday = COALESCE(NEW.birthday, birthday),
    preferred_language = COALESCE(NEW.preferred_language, preferred_language),
    onboarding_completed = COALESCE(NEW.onboarding_completed, onboarding_completed),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Index for potential analytics queries
CREATE INDEX IF NOT EXISTS idx_users_language ON public.users(preferred_language);

COMMENT ON COLUMN public.users.preferred_language IS 'User language preference: en (English) or es (Spanish)';
```

### Minimal Starter Translation File
```json
// src/i18n/locales/en.json
// Minimal structure for Phase 29 verification - full content in Phase 30
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "cancel": "Cancel",
    "save": "Save",
    "ok": "OK"
  },
  "settings": {
    "language": "Language",
    "languageDescription": "Choose your preferred language"
  },
  "languages": {
    "en": "English",
    "es": "Spanish"
  }
}
```

### Root Layout Integration Point
```typescript
// app/_layout.tsx - Integration point (Phase 31 will complete)
// Source: Existing _layout.tsx pattern

// Phase 29 prepares the initialization, Phase 31 wraps with provider
import { useEffect, useState } from 'react';
import { initI18n } from '../src/i18n';

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  // Show loading until i18n ready (or use splash screen)
  if (!i18nReady) return null;

  return (
    // ... existing providers
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Localization.locale` | `getLocales()[0].languageCode` | expo-localization 14+ | Old API deprecated, new returns array |
| Manual t function wrapping | `useTranslation()` hook | react-i18next 10+ | Automatic re-renders on language change |
| Any-typed translation keys | TypeScript module augmentation | i18next 23+ | Compile-time key validation |
| Separate namespace JSON files | Single JSON with nested keys | Current recommendation | Simpler for <5 languages |

**Deprecated/outdated:**
- `Localization.locale` - use `getLocales()[0].languageCode` instead
- `i18n.use(languageDetector)` third-party detectors - expo-localization is sufficient
- JSON namespace files for each feature - overkill for 2 languages, single file per locale is simpler

## Open Questions

1. **Translation file format: JSON vs TypeScript?**
   - What we know: TypeScript files with `as const` enable interpolation type inference
   - What's unclear: Whether 400+ strings benefit from TypeScript complexity
   - Recommendation: Start with JSON for translator handoff, generate `.d.ts` if needed

2. **Splash screen extension for language loading?**
   - What we know: AsyncStorage read adds ~50-100ms to startup
   - What's unclear: Whether this is noticeable on production devices
   - Recommendation: Measure in Phase 29, extend splash if >150ms perceived delay

## Sources

### Primary (HIGH confidence)
- [Expo Localization Guide](https://docs.expo.dev/guides/localization/) - Official Expo documentation for i18n
- [Expo Localization SDK](https://docs.expo.dev/versions/latest/sdk/localization/) - expo-localization API reference
- [i18next TypeScript Documentation](https://www.i18next.com/overview/typescript) - Type-safe configuration
- [react-i18next Documentation](https://react.i18next.com/) - React integration patterns

### Secondary (MEDIUM confidence)
- [npm: i18next v25.8.5](https://www.npmjs.com/package/i18next) - Verified version 2026-02-11
- [npm: react-i18next v16.5.4](https://www.npmjs.com/package/react-i18next) - Verified version 2026-02-11
- [npm: expo-localization v17.0.8](https://www.npmjs.com/package/expo-localization) - Verified version 2026-02-11
- [Expo Starter Internationalization](https://starter.obytes.com/guides/internationalization/) - Community reference implementation

### Tertiary (LOW confidence)
- [Phrase Blog: React Native i18n](https://phrase.com/blog/posts/react-native-i18n-with-expo-and-i18next-part-1/) - Tutorial, verify patterns against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - npm versions verified, Expo docs recommend this stack
- Architecture: HIGH - Patterns verified against i18next and react-i18next official docs
- Pitfalls: HIGH - Sourced from GitHub issues (#1442, #604, #1171, #1756) and prior research
- Database schema: HIGH - Follows existing project migration patterns

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable libraries)

---

## Phase 29 Specific Verification Checklist

Per requirements INFRA-01, INFRA-02, INFRA-03, PERS-01:

- [ ] **INFRA-01**: `expo-localization.getLocales()` called in language service
- [ ] **INFRA-02**: `SUPPORTED_LANGUAGES` array with 'en' fallback implemented
- [ ] **INFRA-03**: `i18next.d.ts` file created with CustomTypeOptions
- [ ] **PERS-01**: `AsyncStorage` integration with `LANGUAGE_KEY` constant

Verification commands:
```bash
# TypeScript catches invalid keys
npx tsc --noEmit  # Should fail if t('invalid.key') used

# Language preference persists
# 1. Set language to 'es'
# 2. Force quit app
# 3. Reopen - should still be 'es'

# Device language detection
# 1. Change device language to Spanish
# 2. Fresh install app
# 3. App should default to 'es'
```
