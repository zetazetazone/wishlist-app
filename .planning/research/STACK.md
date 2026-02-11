# Stack Research: v1.5 Localization (i18n)

**Researched:** 2026-02-11
**Overall confidence:** HIGH

## Summary

**Two new npm dependencies required:** `expo-localization@~17.0.8` for device locale detection and `i18next@^25.8.5` + `react-i18next@^16.5.4` for translation management. The existing `@react-native-async-storage/async-storage@^2.2.0` already installed handles language preference persistence. Server-side localization for push notifications requires adding a `preferred_language` column to users table and modifying the existing Edge Function to include localized content.

Key finding: The established pattern is `expo-localization` (device detection) + `i18next`/`react-i18next` (translation engine). This is the official Expo-recommended approach and has the largest ecosystem. The project already has AsyncStorage installed which handles language persistence without additional dependencies.

---

## Recommended Stack

### Core i18n Framework

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `expo-localization` | `~17.0.8` | Device locale detection | Official Expo SDK library; hooks `useLocales()` and `useCalendars()` for reactive locale data; SDK 54 compatible |
| `i18next` | `^25.8.5` | Core translation engine | Industry standard; 25M+ weekly downloads; supports interpolation, pluralization, context; no framework dependencies |
| `react-i18next` | `^16.5.4` | React bindings for i18next | `useTranslation()` hook for component-level translations; React 19 compatible; TypeScript support |

### Supporting Libraries (Already Installed)

| Package | Current Version | Purpose for i18n | Notes |
|---------|-----------------|------------------|-------|
| `@react-native-async-storage/async-storage` | `^2.2.0` | Persist user language preference | Already in dependencies; i18next-react-native-async-storage NOT needed (manual integration is simpler) |
| `@supabase/supabase-js` | `^2.93.3` | Store preferred_language in user profile | Already in dependencies; Edge Functions read this for push notifications |

### What the Stack Does NOT Need

Libraries that are explicitly NOT required:

| Package | Why Not Needed |
|---------|---------------|
| `i18next-react-native-async-storage` | Over-engineered; manual AsyncStorage.getItem/setItem in i18n init is simpler and more transparent |
| `@formatjs/intl-locale` polyfill | Only needed for advanced ICU features; basic pluralization works without polyfills |
| `@formatjs/intl-pluralrules` polyfill | English/Spanish have simple plural rules; polyfill only needed for complex plural languages (Arabic, Polish) |
| `@lingui/react` / `@lingui/core` | Smaller bundle but requires build-time compilation step; i18next is simpler to set up |
| `i18n-js` | Less feature-rich than i18next; no built-in React hooks; Expo docs mention it but recommend i18next for larger apps |
| `react-intl` | ICU MessageFormat complexity not needed for simple English/Spanish; heavier bundle |

---

## Installation

```bash
# Core i18n libraries
npx expo install expo-localization
npm install i18next react-i18next

# OR combined (expo install handles version resolution for expo-localization)
npx expo install expo-localization && npm install i18next@^25.8.5 react-i18next@^16.5.4
```

**Note:** `npx expo install` ensures SDK 54 compatibility for expo-localization. The npm packages (i18next, react-i18next) don't have Expo SDK version constraints.

---

## Version Compatibility with Expo 54

| Package | Version | React 19 | TypeScript 5.9 | Expo SDK 54 | Notes |
|---------|---------|----------|----------------|-------------|-------|
| `expo-localization` | `~17.0.8` | Yes | Yes | Yes | `npx expo install` auto-selects correct version |
| `i18next` | `^25.8.5` | N/A (core) | Yes (requires ^5) | N/A | No React dependency |
| `react-i18next` | `^16.5.4` | Yes | Yes (requires ^5) | N/A | Peer dep: i18next >= 25.6.2, react >= 16.8.0 |

**Verified compatibility:**
- react-i18next v16.5.4 peer deps: `{ i18next: '>= 25.6.2', react: '>= 16.8.0', typescript: '^5' }`
- Project has: React 19.1.0, TypeScript 5.9.2 - all requirements satisfied

---

## Integration Points with Existing Stack

### 1. Supabase: User Language Preference

Add `preferred_language` column to users table:

```sql
ALTER TABLE public.users
ADD COLUMN preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'es'));
```

**Why server-side storage:**
- Push notifications are generated server-side (Edge Functions)
- System emails (if added) need user's language
- Analytics/admin can see user language distribution
- Single source of truth (not just device-dependent)

### 2. Edge Function: Localized Push Notifications

Modify existing `supabase/functions/push/index.ts` to:
1. Query user's `preferred_language` along with device tokens
2. Pass language to notification content lookup
3. Store translation strings in Edge Function or query from translations table

**Pattern:**
```typescript
// In push/index.ts
const { data: userData } = await supabase
  .from('users')
  .select('preferred_language')
  .eq('id', user_id)
  .single();

const lang = userData?.preferred_language || 'en';
const localizedTitle = translations[notificationType][lang].title;
const localizedBody = translations[notificationType][lang].body;
```

### 3. AsyncStorage: Language Persistence

Reuse existing AsyncStorage for client-side language caching:

```typescript
// In i18n initialization
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = '@app_language';

// Load saved language or detect from device
const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
const deviceLanguage = getLocales()[0]?.languageCode || 'en';
const initialLanguage = savedLanguage || deviceLanguage;

// Save when user changes language
const changeLanguage = async (lang: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
  // Also update Supabase user profile
  await supabase.from('users').update({ preferred_language: lang }).eq('id', userId);
};
```

### 4. expo-localization: Device Detection

```typescript
import { getLocales } from 'expo-localization';

// Get device language code (e.g., 'en', 'es', 'es-MX')
const deviceLanguage = getLocales()[0]?.languageCode;

// Supported languages (expand in future)
const SUPPORTED_LANGUAGES = ['en', 'es'];

// Fallback logic
const initialLanguage = SUPPORTED_LANGUAGES.includes(deviceLanguage)
  ? deviceLanguage
  : 'en'; // English fallback
```

---

## Translation File Structure

Recommended structure for maintainability:

```
src/
  i18n/
    index.ts          # i18next initialization
    resources.ts      # Combines all locale resources
    locales/
      en/
        common.json   # Shared strings (OK, Cancel, etc.)
        home.json     # Home screen strings
        groups.json   # Groups feature strings
        friends.json  # Friends feature strings
        settings.json # Settings screen strings
      es/
        common.json
        home.json
        groups.json
        friends.json
        settings.json
```

**Why namespaced files:**
- Parallel development (different devs can work on different features)
- Lazy loading potential (load only needed namespaces)
- Easier to hand off to translators (one file per feature)
- Clearer ownership and organization

---

## TypeScript Integration

For type-safe translation keys:

```typescript
// src/i18n/types.ts
import 'i18next';
import type common from './locales/en/common.json';
import type home from './locales/en/home.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      home: typeof home;
      // Add other namespaces...
    };
  }
}
```

This provides:
- Autocomplete for translation keys in VSCode
- Compile-time errors for missing/wrong keys
- Refactoring support when renaming keys

---

## Alternatives Considered

| Alternative | Why Not Selected |
|-------------|------------------|
| **Lingui** (`@lingui/react` v5.9.1) | Smaller bundle (10.4KB vs ~15KB) but requires Babel macro setup and extraction CLI; adds build complexity; i18next is simpler for 2-language app |
| **i18n-js** (v4.5.2) | Simpler API but no React hooks; manual re-renders on language change; i18next + react-i18next handles this automatically |
| **react-intl** (v7.x) | ICU MessageFormat is powerful but complex; overkill for simple string translations; larger bundle |
| **Native iOS/Android strings** | Would require ejecting from managed workflow; loses cross-platform consistency; harder to maintain |
| **Server-only translations** | Higher latency; offline mode fails; client-side caching is essential for mobile apps |

**Decision rationale:** i18next + react-i18next is the most battle-tested combination with the best documentation, TypeScript support, and React integration. The ~5KB bundle difference vs Lingui is negligible compared to the simpler setup and larger community.

---

## Future Language Expansion

The architecture supports adding languages without code changes:

1. Add new locale folder: `src/i18n/locales/fr/`
2. Add translations to each JSON file
3. Update `resources.ts` to import French resources
4. Add `'fr'` to `SUPPORTED_LANGUAGES` array
5. Add `'fr'` to database CHECK constraint

**Languages to consider:**
- Portuguese (pt) - Large user base in Latin America
- French (fr) - Canada, Western Africa
- German (de) - European market

---

## Confidence Assessment

| Area | Confidence | Evidence |
|------|------------|----------|
| expo-localization v17.0.8 for SDK 54 | HIGH | `npm view` confirmed; Expo docs reference SDK 54 |
| i18next + react-i18next versions | HIGH | npm verified v25.8.5 and v16.5.4; peer deps match project |
| React 19 compatibility | HIGH | react-i18next changelog confirms React 19 support in v15+ |
| TypeScript 5.9 compatibility | HIGH | Both packages require TypeScript ^5; project has 5.9.2 |
| No polyfills needed for en/es | HIGH | English/Spanish have simple plural rules (one/other); Hermes handles this natively |
| AsyncStorage reuse pattern | HIGH | Documented in multiple Expo i18n tutorials; already installed |
| Server-side language preference pattern | HIGH | Standard approach; Supabase schema change is straightforward |
| Edge Function localization | MEDIUM | Requires code changes to existing push function; pattern is sound but implementation untested |

---

## Sources

### Official Documentation
- [Expo Localization SDK](https://docs.expo.dev/versions/latest/sdk/localization/) - API reference for expo-localization
- [Expo Localization Guide](https://docs.expo.dev/guides/localization/) - Best practices for Expo i18n
- [i18next Documentation](https://www.i18next.com/) - Core i18next reference
- [react-i18next Documentation](https://react.i18next.com/) - React bindings reference

### Package Versions (Verified 2026-02-11)
- [expo-localization npm](https://www.npmjs.com/package/expo-localization) - v17.0.8
- [i18next npm](https://www.npmjs.com/package/i18next) - v25.8.5
- [react-i18next npm](https://www.npmjs.com/package/react-i18next) - v16.5.4

### Community Resources
- [Expo Starter: Internationalization](https://starter.obytes.com/guides/internationalization/) - Reference implementation
- [Phrase Blog: React Native i18n with Expo and i18next](https://phrase.com/blog/posts/react-native-i18n-with-expo-and-i18next-part-1/) - Tutorial
- [LaunchToday: Multi-language Support in Expo](https://launchtoday.dev/blog/expo-multi-language-support) - Best practices guide

### Supabase
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) - Server-side TypeScript functions
- [Custom i18n-ready Authentication Emails](https://blog.mansueli.com/creating-customized-i18n-ready-authentication-emails-using-supabase-edge-functions-postgresql-and-resend) - i18n pattern for Edge Functions

---

## Previous Research (Preserved)

### v1.4 Friends System (2026-02-09)
One new npm dependency: `expo-contacts@~15.0.11` for device phonebook access. Single-table friend relationship schema with status field. Phone number normalization for contact matching.

### v1.3 Gift Claims & Personal Details (2026-02-05)
No new npm dependencies needed. gift_claims table with celebrant-exclusion RLS, personal_details with public-read/owner-write, member_notes with subject-exclusion. JSONB for flexible preferences with pg_jsonschema validation.

### v1.2 Group Experience (2026-02-04)
No new dependencies needed. expo-image-picker + Supabase Storage for group photos. Gluestack UI for mode/budget selection. PostgreSQL aggregations for budget calculations.

### v1.1 Wishlist Polish (2026-02-03)
No new dependencies needed. Existing StarRating, expo-image-picker, MaterialCommunityIcons, NativeWind sufficient for all UI polish features.

---
*Research completed: 2026-02-11*
