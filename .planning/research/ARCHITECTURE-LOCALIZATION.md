# Architecture: Localization Integration

**Project:** Wishlist App v1.5 Localization
**Researched:** 2026-02-11
**Scope:** English + Spanish support for existing React Native/Expo app
**Confidence:** HIGH (Expo official docs + established patterns)

---

## System Overview

### Localization Layer in Existing Architecture

```
+------------------------------------------------------------------+
|                         APP ENTRY POINT                          |
|                        app/_layout.tsx                           |
|  +------------------------------------------------------------+  |
|  |                   I18nProvider (NEW)                        |  |
|  |  - Wraps entire app at root level                          |  |
|  |  - Initializes i18next with device locale                  |  |
|  |  - Syncs user preference from Supabase on auth             |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
+--------v--------+  +--------v--------+  +--------v--------+
|   UI SCREENS    |  |   COMPONENTS    |  |   SERVICES      |
|   app/**/*.tsx  |  | components/**/* |  |   lib/*.ts      |
|                 |  |                 |  |                 |
| useTranslation()|  | useTranslation()|  | No changes      |
| t('key')        |  | t('key')        |  | (data layer)    |
+-----------------+  +-----------------+  +-----------------+
                              |
         +--------------------+--------------------+
         |                    |                    |
+--------v--------+  +--------v--------+  +--------v--------+
| TRANSLATION     |  |   LANGUAGE      |  | PUSH NOTIFS     |
| FILES           |  |   PREFERENCE    |  | EDGE FUNCTION   |
|                 |  |                 |  |                 |
| locales/        |  | Supabase:       |  | Query user's    |
|   en.json       |  | users.language  |  | language pref   |
|   es.json       |  |                 |  | before sending  |
+-----------------+  +-----------------+  +-----------------+
```

### Key Integration Principle

**Localization is a cross-cutting concern.** It integrates at:
1. **Provider level** - Root layout wraps app with i18n context
2. **Component level** - Individual components access translations via hook
3. **Data level** - User preference stored in Supabase profiles
4. **Backend level** - Edge Function reads preference for push content

---

## Component Responsibilities

### New Components to Create

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `I18nProvider` | `providers/I18nProvider.tsx` | Initialize i18next, sync with user preference |
| `LanguageSelector` | `components/settings/LanguageSelector.tsx` | UI for changing language in settings |
| Translation files | `locales/en.json`, `locales/es.json` | All UI strings organized by feature |
| `useLanguage` hook | `hooks/useLanguage.ts` | Expose language state and change function |
| i18n config | `lib/i18n.ts` | i18next initialization and configuration |

### Existing Components to Modify

| Component | Change Required | Scope |
|-----------|-----------------|-------|
| `app/_layout.tsx` | Wrap with I18nProvider | Single file, minimal |
| `app/(app)/settings/profile.tsx` | Add language selector link | Single file |
| All 92 screen/component files | Replace hardcoded strings with `t()` calls | Progressive, can be batched |
| `supabase/functions/push/index.ts` | Query user language, use translated content | Single file |
| Database schema | Add `language` column to `users` table | Migration |

### Components That DO NOT Need Changes

| Component | Reason |
|-----------|--------|
| `lib/supabase.ts` | Data layer, no UI strings |
| `lib/notifications.ts` | Push token management, no user-facing strings |
| `lib/*.ts` (most services) | Business logic, return data not UI strings |
| `constants/theme.ts` | Colors/spacing, no text content |
| `utils/*.ts` | Utility functions, no UI strings |

---

## Recommended Project Structure

### Translation Files Organization

```
/home/zetaz/wishlist-app/
+-- locales/                      # NEW: Translation files
|   +-- en.json                   # English translations (default)
|   +-- es.json                   # Spanish translations
|   +-- index.ts                  # Export translations for i18next
|
+-- lib/
|   +-- i18n.ts                   # NEW: i18next configuration
|   +-- supabase.ts               # (existing, no changes)
|   +-- notifications.ts          # (existing, no changes)
|
+-- providers/                    # NEW: Context providers directory
|   +-- I18nProvider.tsx          # Language context provider
|
+-- hooks/
|   +-- useLanguage.ts            # NEW: Language management hook
|   +-- usePushNotifications.ts   # (existing, no changes)
|
+-- components/
|   +-- settings/
|       +-- LanguageSelector.tsx  # NEW: Language picker component
```

### Translation File Structure

Organize translations by feature/screen for maintainability:

```json
// locales/en.json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "confirm": "Confirm"
  },
  "tabs": {
    "wishlist": "My Wishlist",
    "groups": "Groups",
    "friends": "Friends",
    "celebrations": "Celebrations",
    "calendar": "Calendar"
  },
  "friends": {
    "title": "Friends",
    "count_one": "{{count}} friend",
    "count_other": "{{count}} friends",
    "noFriends": "No Friends Yet",
    "noFriendsHint": "Add friends to see them here",
    "removeTitle": "Remove Friend",
    "removeConfirm": "Are you sure you want to remove {{name}} as a friend?",
    "friendsSince": "Friends since {{date}}"
  },
  "settings": {
    "profile": "Edit Your Profile",
    "language": "Language",
    "languageDescription": "Choose your preferred language",
    "personalDetails": "Personal Details",
    "importantDates": "Important Dates"
  },
  "notifications": {
    "birthdayReminder": {
      "title": "{{name}}'s birthday is coming up!",
      "body": "Don't forget to prepare a gift. {{days}} days left."
    }
  }
}
```

```json
// locales/es.json
{
  "common": {
    "loading": "Cargando...",
    "error": "Error",
    "cancel": "Cancelar",
    "save": "Guardar",
    "delete": "Eliminar",
    "confirm": "Confirmar"
  },
  "tabs": {
    "wishlist": "Mi Lista",
    "groups": "Grupos",
    "friends": "Amigos",
    "celebrations": "Celebraciones",
    "calendar": "Calendario"
  },
  "friends": {
    "title": "Amigos",
    "count_one": "{{count}} amigo",
    "count_other": "{{count}} amigos",
    "noFriends": "Sin Amigos Todavia",
    "noFriendsHint": "Agrega amigos para verlos aqui",
    "removeTitle": "Eliminar Amigo",
    "removeConfirm": "Estas seguro de que quieres eliminar a {{name}} como amigo?",
    "friendsSince": "Amigos desde {{date}}"
  },
  "settings": {
    "profile": "Editar Tu Perfil",
    "language": "Idioma",
    "languageDescription": "Elige tu idioma preferido",
    "personalDetails": "Detalles Personales",
    "importantDates": "Fechas Importantes"
  },
  "notifications": {
    "birthdayReminder": {
      "title": "El cumpleanos de {{name}} se acerca!",
      "body": "No olvides preparar un regalo. Faltan {{days}} dias."
    }
  }
}
```

---

## Data Flow

### Language Detection and Initialization Flow

```
App Launch
    |
    v
+-------------------+
| I18nProvider      |
| initializes       |
+--------+----------+
         |
         v
+-------------------+     +-------------------+
| expo-localization |---->| Device locale     |
| getLocales()      |     | detected (e.g.    |
+-------------------+     | 'es' or 'en')     |
                          +--------+----------+
                                   |
         +-------------------------+
         |
         v
+-------------------+
| Check auth state  |
+--------+----------+
         |
    +----+----+
    |         |
    v         v
No user    User logged in
    |              |
    v              v
Use device    +-------------------+
locale        | Query Supabase    |
    |         | users.language    |
    |         +--------+----------+
    |                  |
    |         +--------+----------+
    |         |                   |
    |         v                   v
    |    Has preference      No preference
    |         |                   |
    |         v                   v
    |    Use stored         Use device locale
    |    preference         Save to Supabase
    |         |                   |
    +----+----+-------------------+
         |
         v
+-------------------+
| i18n.changeLanguage()
| Set app language  |
+-------------------+
```

### Language Change Flow (User Settings)

```
User taps Language in Settings
              |
              v
+---------------------------+
| LanguageSelector renders  |
| Shows: English, Espanol   |
+------------+--------------+
             |
             v
User selects new language
             |
             v
+---------------------------+
| useLanguage hook          |
| changeLanguage(newLang)   |
+------------+--------------+
             |
    +--------+--------+
    |                 |
    v                 v
+-------------+  +------------------+
| i18n.change |  | Supabase update  |
| Language()  |  | users.language   |
+-------------+  +------------------+
    |                 |
    v                 v
UI re-renders    Persisted for
with new         future sessions
translations     and push notifs
```

### Push Notification Language Flow

```
Notification trigger (e.g., birthday reminder cron)
                    |
                    v
+---------------------------------------+
| Edge Function: push/index.ts          |
+------------------+--------------------+
                   |
                   v
+---------------------------------------+
| Query recipient's language preference |
| FROM users WHERE id = target_user_id  |
+------------------+--------------------+
                   |
        +----------+-----------+
        |                      |
        v                      v
   language = 'es'       language = 'en'
        |                  (or null)
        |                      |
        v                      v
+---------------+      +---------------+
| Load Spanish  |      | Load English  |
| notification  |      | notification  |
| template      |      | template      |
+-------+-------+      +-------+-------+
        |                      |
        +----------+-----------+
                   |
                   v
+---------------------------------------+
| Interpolate variables (name, date)    |
| Send via Expo Push Service            |
+---------------------------------------+
```

---

## Integration Points

### 1. Root Layout Integration

**File:** `app/_layout.tsx`

**Current structure:**
```tsx
<GluestackUIProvider>
  <KeyboardProvider>
    <GestureHandlerRootView>
      <BottomSheetModalProvider>
        <SafeAreaProvider>
          <Slot />
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  </KeyboardProvider>
</GluestackUIProvider>
```

**Modified structure:**
```tsx
<I18nProvider>  {/* NEW: Wrap everything */}
  <GluestackUIProvider>
    <KeyboardProvider>
      <GestureHandlerRootView>
        <BottomSheetModalProvider>
          <SafeAreaProvider>
            <Slot />
          </SafeAreaProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </KeyboardProvider>
  </GluestackUIProvider>
</I18nProvider>
```

### 2. Database Schema Integration

**Migration:** Add `language` column to existing `users` table

```sql
-- Migration: Add language preference column
ALTER TABLE public.users
ADD COLUMN language TEXT DEFAULT 'en'
CHECK (language IN ('en', 'es'));

-- Update user_profiles view to expose language
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  id,
  email,
  full_name AS display_name,
  avatar_url,
  birthday,
  language,  -- NEW
  onboarding_completed,
  created_at,
  updated_at
FROM public.users;
```

### 3. Edge Function Integration

**File:** `supabase/functions/push/index.ts`

**Addition needed:**
1. Query user's language preference before building notification
2. Load appropriate translation template
3. Interpolate with user data

```typescript
// In the edge function, after getting user_id:
const { data: userPrefs } = await supabase
  .from('users')
  .select('language')
  .eq('id', user_id)
  .single();

const language = userPrefs?.language || 'en';

// Load translation template based on language
const translations = {
  en: {
    birthdayTitle: "{{name}}'s birthday is coming up!",
    birthdayBody: "Don't forget to prepare a gift. {{days}} days left."
  },
  es: {
    birthdayTitle: "El cumpleanos de {{name}} se acerca!",
    birthdayBody: "No olvides preparar un regalo. Faltan {{days}} dias."
  }
};

const template = translations[language];
const title = template.birthdayTitle.replace('{{name}}', celebrantName);
const body = template.birthdayBody.replace('{{days}}', daysRemaining);
```

### 4. Settings Screen Integration

**File:** `app/(app)/settings/profile.tsx`

Add new link to language settings (similar to existing "Personal Details" and "Important Dates" links):

```tsx
{/* Language Settings Link - NEW */}
<Pressable onPress={() => router.push('/settings/language')}>
  <Box ...>
    <HStack>
      <VStack>
        <Text fontWeight="$semibold">{t('settings.language')}</Text>
        <Text fontSize="$xs" color="$textLight500">
          {t('settings.languageDescription')}
        </Text>
      </VStack>
      <HStack alignItems="center" space="sm">
        <Text fontSize="$sm" color="$textLight500">
          {currentLanguage === 'en' ? 'English' : 'Espanol'}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={20} />
      </HStack>
    </HStack>
  </Box>
</Pressable>
```

### 5. Date/Time Localization Integration

**Current pattern in codebase:**
```tsx
date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
```

**Updated pattern:**
```tsx
const { i18n } = useTranslation();
const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';
date.toLocaleDateString(locale, { month: 'short', year: 'numeric' })
```

Files using `toLocaleDateString` that need updating:
- `components/friends/FriendCard.tsx`
- `app/(app)/celebration/[id].tsx`
- `components/wishlist/WishlistItemCard.tsx`
- `app/(onboarding)/index.tsx`
- `components/celebrations/CelebrationCard.tsx`

---

## Build Order

### Phase Sequence with Dependency Rationale

```
Phase 1: Foundation (No dependencies)
+------------------------------------------+
| 1.1 Database migration                   |
|     - Add users.language column          |
|     - Update user_profiles view          |
|                                          |
| 1.2 Install npm dependencies             |
|     - expo-localization (already in pkg) |
|     - react-i18next                      |
|     - i18next                            |
|                                          |
| 1.3 Create i18n configuration            |
|     - lib/i18n.ts                        |
|     - Initialize i18next                 |
+------------------------------------------+
          |
          | Database ready, i18n configured
          v
Phase 2: Infrastructure (Depends on Phase 1)
+------------------------------------------+
| 2.1 Create translation files             |
|     - locales/en.json (extract strings)  |
|     - locales/es.json (translate)        |
|                                          |
| 2.2 Create I18nProvider                  |
|     - providers/I18nProvider.tsx         |
|     - Handle device detection            |
|     - Handle user preference sync        |
|                                          |
| 2.3 Create useLanguage hook              |
|     - hooks/useLanguage.ts               |
|     - Expose change function             |
+------------------------------------------+
          |
          | Provider and hooks ready
          v
Phase 3: Integration (Depends on Phase 2)
+------------------------------------------+
| 3.1 Integrate at root layout             |
|     - Wrap app with I18nProvider         |
|                                          |
| 3.2 Create LanguageSelector component    |
|     - components/settings/LanguageSelector|
|                                          |
| 3.3 Add settings screen link             |
|     - app/(app)/settings/profile.tsx     |
|     - New route /settings/language       |
+------------------------------------------+
          |
          | Settings UI complete
          v
Phase 4: UI Migration (Depends on Phase 3)
+------------------------------------------+
| 4.1 Migrate screen by screen             |
|     Priority order:                      |
|     - Tab screens (high visibility)      |
|     - Settings screens                   |
|     - Auth screens                       |
|     - Components                         |
|                                          |
| 4.2 Update date formatting               |
|     - Use locale-aware formatting        |
+------------------------------------------+
          |
          | All UI translated
          v
Phase 5: Backend (Can parallel with Phase 4)
+------------------------------------------+
| 5.1 Update Edge Function                 |
|     - Query user language preference     |
|     - Send translated push notifications |
|                                          |
| 5.2 Add notification templates           |
|     - Define templates in both languages |
+------------------------------------------+
          |
          | Full localization complete
          v
Phase 6: Validation
+------------------------------------------+
| 6.1 End-to-end testing                   |
|     - Device language detection          |
|     - Preference persistence             |
|     - Language switching                 |
|     - Push notification language         |
|                                          |
| 6.2 String coverage check                |
|     - Verify no hardcoded strings remain |
+------------------------------------------+
```

### Build Order Summary Table

| Phase | Name | Dependencies | Estimated Files | Risk |
|-------|------|--------------|-----------------|------|
| 1 | Foundation | None | 3-4 files | Low |
| 2 | Infrastructure | Phase 1 | 4-5 files | Medium |
| 3 | Integration | Phase 2 | 3-4 files | Low |
| 4 | UI Migration | Phase 3 | ~92 files | Medium (tedious) |
| 5 | Backend | Phase 1 (can parallel with 4) | 1-2 files | Low |
| 6 | Validation | All phases | N/A | Low |

### Recommended Implementation Approach

**Phase 4 UI Migration Strategy:**

Given ~92 TSX files need string extraction, recommend:

1. **Batch by feature area** - Migrate one feature completely before moving to next
2. **High-traffic screens first** - Tab screens see most user interaction
3. **Use TypeScript for safety** - Define translation key types to catch missing keys

Suggested feature batching order:
1. Common components (buttons, alerts, loading states)
2. Tab screens (5 screens)
3. Friends feature (3 screens + components)
4. Groups feature (4 screens + components)
5. Celebrations feature (3 screens + components)
6. Calendar feature (2 screens + components)
7. Settings screens (4 screens)
8. Auth screens (3 screens)
9. Remaining components

---

## Technical Decisions

### Why react-i18next over i18n-js

| Criteria | react-i18next | i18n-js |
|----------|---------------|---------|
| React integration | Native hooks (useTranslation) | Requires manual re-renders |
| TypeScript support | First-class | Limited |
| Pluralization | Built-in, ICU format | Basic |
| Interpolation | `{{variable}}` syntax | `%{variable}` syntax |
| Community adoption | Higher | Lower |
| Documentation | Extensive | Basic |

**Decision:** Use `react-i18next` for better React integration and TypeScript support.

### Why Store Preference in Supabase vs AsyncStorage

| Approach | Pros | Cons |
|----------|------|------|
| Supabase only | Single source of truth, sync across devices, Edge Function access | Requires auth, network dependency |
| AsyncStorage only | Works offline, no auth needed | No sync, Edge Function can't access |
| Both (hybrid) | Best of both, offline support + sync | Complexity, potential conflicts |

**Decision:** Store in Supabase `users.language` with AsyncStorage cache for offline access. Edge Function queries Supabase. Hybrid approach balances offline support with server-side needs.

### Why Not Use Expo Config Plugin for Language

Expo's `expo-localization` config plugin allows per-app language settings, but:
- Only affects app store listing language
- Doesn't help with runtime UI translation
- Not needed for EN/ES basic support

**Decision:** Skip config plugin, use runtime i18next for UI translation.

---

## Patterns to Follow

### Pattern 1: Translation Hook Usage

**What:** Use `useTranslation` hook from react-i18next in every component with user-facing strings.

**When:** Any component that renders text visible to users.

**Example:**
```typescript
import { useTranslation } from 'react-i18next';

export function FriendCard({ friend, onPress }: Props) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{friend.name}</Text>
      <Text>{t('friends.friendsSince', { date: formatDate(friend.createdAt) })}</Text>
    </TouchableOpacity>
  );
}
```

### Pattern 2: Pluralization

**What:** Use i18next plural suffixes for count-dependent strings.

**When:** Any string that changes based on quantity (0, 1, many).

**Example:**
```json
// en.json
{
  "friends": {
    "count_zero": "No friends",
    "count_one": "{{count}} friend",
    "count_other": "{{count}} friends"
  }
}
```

```typescript
t('friends.count', { count: friends.length })
// 0 friends -> "No friends"
// 1 friend -> "1 friend"
// 5 friends -> "5 friends"
```

### Pattern 3: Locale-Aware Date Formatting

**What:** Use Intl.DateTimeFormat with current language locale.

**When:** Any date/time display.

**Example:**
```typescript
const { i18n } = useTranslation();

const formatDate = (date: Date) => {
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';
  return date.toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric'
  });
};
// en: "February 11"
// es: "11 de febrero"
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Inline Strings

**What:** Hardcoding user-facing strings directly in JSX.

**Why bad:** Cannot be translated, scattered across codebase.

**Instead:**
```typescript
// BAD
<Text>Loading...</Text>

// GOOD
<Text>{t('common.loading')}</Text>
```

### Anti-Pattern 2: String Concatenation for Messages

**What:** Building translated strings with string concatenation.

**Why bad:** Word order varies by language, breaks translations.

**Instead:**
```typescript
// BAD
t('greeting') + ' ' + userName + '!'

// GOOD (use interpolation)
t('greeting', { name: userName })
// where translation is: "Hello, {{name}}!"
```

### Anti-Pattern 3: Translating Dynamic Data

**What:** Attempting to translate user-generated content or database values.

**Why bad:** Impossible to maintain translations for dynamic content.

**Instead:**
Only translate static UI strings. User names, item titles, descriptions stay in their original language.

---

## Scalability Considerations

| Concern | At 2 Languages | At 5 Languages | At 10+ Languages |
|---------|----------------|----------------|------------------|
| Translation files | Manual JSON | JSON per language | Translation management platform (Phrase, Crowdin) |
| Build size | Negligible (+~20KB) | Moderate (+~50KB) | Consider lazy loading translations |
| Maintenance | In-house | In-house or freelance | Professional translation service |
| RTL support | Not needed (EN/ES both LTR) | May need (Arabic, Hebrew) | Definitely need RTL handling |

**Current scope (EN/ES):** Simple JSON files, no special tooling needed.

**Future expansion path:**
1. Keep translation keys stable
2. Add new language JSON files
3. If >5 languages: consider Crowdin or similar for translator workflow

---

## Sources

- [Expo Localization Guide](https://docs.expo.dev/guides/localization/) - Official documentation for expo-localization
- [react-i18next Documentation](https://react.i18next.com/) - React integration for i18next
- [Supabase Push Notifications Guide](https://supabase.com/docs/guides/functions/examples/push-notifications) - Edge Function patterns
- [React Native / Expo Starter Internationalization](https://starter.obytes.com/guides/internationalization/) - Community patterns
- [LaunchToday Expo Multi-Language Guide](https://launchtoday.dev/blog/expo-multi-language-support) - Step-by-step setup
- [AutoLocalise Best Practices](https://www.autolocalise.com/blog/react-native-expo-localization-best-practice) - Best practices for 2025

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Library choice (react-i18next) | HIGH | Expo docs recommend, mature ecosystem |
| Device locale detection | HIGH | expo-localization is well-documented |
| Translation file structure | HIGH | Standard i18next JSON format |
| Provider integration | HIGH | Standard React context pattern |
| Supabase preference storage | HIGH | Simple column addition to existing table |
| Edge Function translation | MEDIUM | Requires manual template management |
| UI migration effort | MEDIUM | Tedious but straightforward (~92 files) |
| Date/number formatting | HIGH | Intl APIs well-supported |

---

*Research completed: 2026-02-11*
*Sources: Expo official documentation, react-i18next documentation, existing codebase analysis*
