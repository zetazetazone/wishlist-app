# Phase 30: Server Integration & Translation Files - Research

**Researched:** 2026-02-11
**Domain:** i18n server synchronization, Supabase Edge Functions, notification localization
**Confidence:** HIGH

## Summary

Phase 30 completes the i18n infrastructure by adding server-side language preference storage (Supabase profiles table), cross-device sync capability, localized push notifications via Edge Function enhancement, and comprehensive English/Spanish translation files (~400 strings organized by namespace).

The architecture builds on Phase 29's i18next + react-i18next + expo-localization foundation by extending `lib/language.ts` with Supabase sync, creating a `notification_translations` table for server-side notification templates, and enhancing the existing push Edge Function to query user language preference and use localized templates.

**Primary recommendation:** Implement server language sync first (enables cross-device sync), then notification translations table and Edge Function enhancement, finally complete translation files with namespace-based organization (common, auth, groups, wishlist, notifications, profile, settings, calendar, celebrations).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| i18next | 25.8.5 | Translation runtime | Already installed Phase 29, industry standard |
| react-i18next | 16.5.4 | React bindings | Already installed Phase 29, Expo-compatible |
| @supabase/supabase-js | 2.93.3 | Database client | Already installed, handles sync |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-localization | 17.0.8 | Device language detection | Already installed, fallback when no preference |
| @react-native-async-storage/async-storage | 2.2.0 | Local persistence | Already installed, cache before server sync |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database templates | JSON config file | Database allows dynamic updates without deploys, better for notifications |
| Single namespace | Multiple JSON files | Single file simpler but grows unwieldy at 400+ keys |
| Manual translation | AI translation services | Manual ensures cultural appropriateness for Latin American Spanish |

**Installation:**
```bash
# No new packages needed - all dependencies already installed from Phase 29
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── i18n/
│   ├── index.ts              # i18next config (Phase 29)
│   ├── resources.ts          # Namespace aggregator
│   ├── types/
│   │   └── i18next.d.ts      # TypeScript module augmentation
│   └── locales/
│       ├── en/
│       │   ├── common.json       # 40-50 keys: buttons, labels, errors
│       │   ├── auth.json         # 20-30 keys: login, signup, password
│       │   ├── groups.json       # 40-50 keys: groups, members, invites
│       │   ├── wishlist.json     # 50-60 keys: items, claims, splits
│       │   ├── notifications.json # 30-40 keys: notification messages
│       │   ├── profile.json      # 40-50 keys: settings, preferences
│       │   ├── calendar.json     # 20-30 keys: birthdays, dates
│       │   └── celebrations.json # 30-40 keys: celebrations, contributions
│       └── es/
│           └── [same structure]
lib/
├── language.ts               # Extended with server sync
supabase/
├── functions/
│   └── push/
│       └── index.ts          # Enhanced with localization
├── migrations/
│   └── 20260214000001_i18n_server_sync.sql  # preferred_language + notification_translations
```

### Pattern 1: Three-Tier Language Preference Hierarchy
**What:** Server preference takes precedence over local storage, which takes precedence over device detection
**When to use:** App initialization and language change operations
**Example:**
```typescript
// lib/language.ts - Enhanced with server sync
export async function getLanguagePreference(userId?: string): Promise<SupportedLanguage> {
  // Tier 1: Check server (if authenticated)
  if (userId) {
    try {
      const { data } = await supabase
        .from('users')
        .select('preferred_language')
        .eq('id', userId)
        .single();

      if (data?.preferred_language && isSupported(data.preferred_language)) {
        // Cache locally for offline use
        await AsyncStorage.setItem(LANGUAGE_KEY, data.preferred_language);
        return data.preferred_language;
      }
    } catch (error) {
      console.warn('[language] Server fetch failed, using local fallback');
    }
  }

  // Tier 2: Check local storage
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (saved && isSupported(saved)) {
    return saved as SupportedLanguage;
  }

  // Tier 3: Device detection
  return getDeviceLanguage();
}

export async function setLanguagePreference(
  language: SupportedLanguage,
  userId?: string
): Promise<void> {
  // Update i18next immediately
  await i18n.changeLanguage(language);

  // Persist locally for offline access
  await AsyncStorage.setItem(LANGUAGE_KEY, language);

  // Sync to server if authenticated
  if (userId) {
    await supabase
      .from('users')
      .update({ preferred_language: language })
      .eq('id', userId);
  }
}
```

### Pattern 2: Notification Translation Table
**What:** Database table storing notification templates per type and language
**When to use:** Edge Function needs to send localized push notifications
**Example:**
```sql
-- Migration: notification_translations table
CREATE TABLE public.notification_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  language_code TEXT NOT NULL CHECK (language_code IN ('en', 'es')),
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_type, language_code)
);

-- Enable RLS
ALTER TABLE public.notification_translations ENABLE ROW LEVEL SECURITY;

-- Read-only for service role (Edge Functions use service key)
CREATE POLICY "Service role can read translations"
  ON public.notification_translations
  FOR SELECT
  USING (true);

-- Seed initial data
INSERT INTO public.notification_translations (notification_type, language_code, title_template, body_template) VALUES
  ('friend_request_received', 'en', '{{sender_name}} sent you a friend request', 'Tap to view and respond'),
  ('friend_request_received', 'es', '{{sender_name}} te envio una solicitud de amistad', 'Toca para ver y responder'),
  ('friend_request_accepted', 'en', '{{accepter_name}} accepted your friend request!', 'You are now friends. Tap to view their profile.'),
  ('friend_request_accepted', 'es', '{{accepter_name}} acepto tu solicitud de amistad!', 'Ahora son amigos. Toca para ver su perfil.'),
  -- ... more notification types
;
```

### Pattern 3: Edge Function Localization
**What:** Enhanced push Edge Function that queries user language and applies template
**When to use:** When sending push notifications to users
**Example:**
```typescript
// supabase/functions/push/index.ts - Enhanced
async function getLocalizedNotification(
  supabase: SupabaseClient,
  notificationType: string,
  userId: string,
  variables: Record<string, string>
): Promise<{ title: string; body: string }> {
  // Get user's language preference
  const { data: user } = await supabase
    .from('users')
    .select('preferred_language')
    .eq('id', userId)
    .single();

  const language = user?.preferred_language || 'en';

  // Fetch template
  const { data: template } = await supabase
    .from('notification_translations')
    .select('title_template, body_template')
    .eq('notification_type', notificationType)
    .eq('language_code', language)
    .single();

  if (!template) {
    // Fallback to English
    const { data: fallback } = await supabase
      .from('notification_translations')
      .select('title_template, body_template')
      .eq('notification_type', notificationType)
      .eq('language_code', 'en')
      .single();

    if (!fallback) {
      throw new Error(`No template found for ${notificationType}`);
    }
    template = fallback;
  }

  // Apply variable substitution
  let title = template.title_template;
  let body = template.body_template;

  for (const [key, value] of Object.entries(variables)) {
    title = title.replace(`{{${key}}}`, value);
    body = body.replace(`{{${key}}}`, value);
  }

  return { title, body };
}
```

### Pattern 4: Namespace-Based Translation Organization
**What:** Split translation keys into feature-based namespaces loaded on demand
**When to use:** Apps with 100+ translation keys
**Example:**
```typescript
// src/i18n/resources.ts - Updated for namespaces
import commonEn from './locales/en/common.json';
import commonEs from './locales/es/common.json';
import authEn from './locales/en/auth.json';
import authEs from './locales/es/auth.json';
// ... more imports

export const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    groups: groupsEn,
    wishlist: wishlistEn,
    notifications: notificationsEn,
    profile: profileEn,
    calendar: calendarEn,
    celebrations: celebrationsEn,
  },
  es: {
    common: commonEs,
    auth: authEs,
    groups: groupsEs,
    wishlist: wishlistEs,
    notifications: notificationsEs,
    profile: profileEs,
    calendar: calendarEs,
    celebrations: celebrationsEs,
  },
} as const;

export const defaultNS = 'common';
```

### Anti-Patterns to Avoid
- **Hardcoded notification strings in database triggers:** Move all user-facing text to notification_translations table
- **Storing language in auth.user metadata only:** Also store in public.users for Edge Function access
- **Single monolithic translation file:** Split into 8-10 namespaces for maintainability
- **Client-side notification formatting:** Always format on server to ensure correct language
- **Lazy loading namespaces on mobile:** Load all at startup for offline support

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Variable substitution in templates | Regex replacements | i18next interpolation syntax | Edge cases with escaping, pluralization |
| Language detection | Manual Accept-Language parsing | expo-localization getLocales() | Handles OS variations, region codes |
| Translation file validation | Manual JSON schema | TypeScript module augmentation | Compile-time safety, IDE autocomplete |
| Pluralization | if/else on count | i18next plural suffixes | Handles complex plural rules (Russian, Arabic) |
| Date/number formatting | toLocaleString | i18next with Intl formatters | Consistent with app language, not device |

**Key insight:** i18next handles 90% of translation complexity (interpolation, pluralization, nesting, fallbacks). Focus on organizing keys and writing quality translations, not building translation infrastructure.

## Common Pitfalls

### Pitfall 1: Race Condition on App Start
**What goes wrong:** App renders with device language before server preference loads
**Why it happens:** Server fetch is async, i18next initializes immediately
**How to avoid:**
1. Cache server preference locally after each successful fetch
2. Initialize i18next with cached value first
3. If server value differs after fetch, call changeLanguage() to update
**Warning signs:** Brief flash of wrong language on app open after login

### Pitfall 2: Notification Language Mismatch
**What goes wrong:** Push notification in wrong language after user changes preference
**Why it happens:** Edge Function cached old preference or queried stale data
**How to avoid:** Always query fresh from users table in Edge Function, don't cache
**Warning signs:** Users report notifications in previous language

### Pitfall 3: Missing Translations Break App
**What goes wrong:** App shows translation key like "wishlist.addItem.title" to user
**Why it happens:** Key exists in English but missing from Spanish file
**How to avoid:**
1. Use i18next `missingKeyHandler` in dev to catch
2. Configure `fallbackLng: 'en'` so missing keys show English
3. Build-time validation script comparing key sets
**Warning signs:** Console warnings about missing keys in development

### Pitfall 4: Database Trigger Hardcoded Strings
**What goes wrong:** Notifications from database triggers bypass translation system
**Why it happens:** Triggers insert title/body directly into user_notifications
**How to avoid:**
1. Triggers insert only notification_type and variables
2. Edge Function looks up localized template
3. Refactor existing triggers to use new pattern
**Warning signs:** Some notifications localized, others always in English

### Pitfall 5: Translation Key Naming Collisions
**What goes wrong:** Key overwritten when merging namespaces or same key different meaning
**Why it happens:** Flat key structure without feature prefixing
**How to avoid:** Use namespace + feature + element pattern: `wishlist.item.claimButton`
**Warning signs:** Translation shows wrong text in certain contexts

### Pitfall 6: Spanish Regional Variations
**What goes wrong:** Users from Spain vs Latin America see awkward phrasing
**Why it happens:** Using vosotros (Spain) when users expect ustedes (Latin America)
**How to avoid:** Stick to neutral Latin American Spanish (ustedes), avoid regional slang
**Warning signs:** User feedback about "unnatural" Spanish

## Code Examples

Verified patterns from official sources:

### Supabase Column Addition for Language Preference
```sql
-- Source: Supabase schema patterns
ALTER TABLE public.users
ADD COLUMN preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'es'));

-- Update user_profiles view to include new column
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

-- Update view trigger for UPDATE
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
```

### i18next Namespace Configuration
```typescript
// Source: i18next documentation
// src/i18n/index.ts - Enhanced
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resources, defaultNS } from './resources';

export const LANGUAGE_KEY = '@app_language';
export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const getDeviceLanguage = (): SupportedLanguage => {
  const locales = getLocales();
  const deviceLang = locales[0]?.languageCode;
  return SUPPORTED_LANGUAGES.includes(deviceLang as SupportedLanguage)
    ? (deviceLang as SupportedLanguage)
    : 'en';
};

export const initI18n = async (): Promise<typeof i18n> => {
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  const initialLanguage = (savedLanguage as SupportedLanguage) || getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    defaultNS,
    ns: ['common', 'auth', 'groups', 'wishlist', 'notifications', 'profile', 'calendar', 'celebrations'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
    },
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
```

### TypeScript Type Safety for Namespaces
```typescript
// Source: i18next TypeScript documentation
// src/i18n/types/i18next.d.ts
import 'i18next';
import type { resources } from '../resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['en'];
  }
}
```

### Translation File Structure Example
```json
// src/i18n/locales/en/common.json
{
  "loading": "Loading...",
  "error": "Error",
  "success": "Success",
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "done": "Done",
    "edit": "Edit",
    "add": "Add",
    "remove": "Remove",
    "retry": "Retry"
  },
  "errors": {
    "generic": "Something went wrong",
    "network": "Network error. Please check your connection.",
    "notFound": "Not found",
    "unauthorized": "Please log in to continue"
  },
  "empty": {
    "noResults": "No results found",
    "noData": "No data available"
  },
  "time": {
    "justNow": "Just now",
    "minutesAgo": "{{count}} minute ago",
    "minutesAgo_plural": "{{count}} minutes ago",
    "hoursAgo": "{{count}} hour ago",
    "hoursAgo_plural": "{{count}} hours ago",
    "daysAgo": "{{count}} day ago",
    "daysAgo_plural": "{{count}} days ago"
  }
}
```

### Notification Types and Templates
```sql
-- All notification types currently in the codebase
-- Source: Analyzed from supabase/migrations/*

-- Notification types to template:
-- 1. friend_request_received - from notify_friend_request_sent()
-- 2. friend_request_accepted - from notify_friend_request_accepted()
-- 3. birthday_greeting - from reminder scheduling
-- 4. gift_leader_week_reminder - from reminder scheduling
-- 5. birthday_reminder_batch - batch birthday reminders
-- 6. contribution_reminder - weekly contribution reminders
-- 7. item_claimed - from claim notifications
-- 8. split_invite - from open_split
-- 9. split_fully_funded - from contribution notifications
-- 10. split_canceled - from cancel notifications
-- 11. gift_leader_assigned - from gift leader notifications
-- 12. gift_leader_reassigned - from gift leader notifications
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single translation file | Namespace-based organization | i18next best practice | Maintainability at scale |
| Device-only language | Server-synced preference | Modern mobile apps | Cross-device consistency |
| Hardcoded notification text | Template-based localization | Current standard | Proper i18n for notifications |
| Manual JSON editing | TypeScript-validated keys | 2023+ | Compile-time safety |

**Deprecated/outdated:**
- i18n-js: Older library, i18next is now Expo's recommendation
- Per-device language settings: Users expect preferences to sync

## Open Questions

1. **Translation Quality Assurance**
   - What we know: Need professional-quality neutral Latin American Spanish
   - What's unclear: Who reviews translations for cultural appropriateness?
   - Recommendation: Plan for human review of Spanish translations, possibly native speaker QA

2. **Edge Function Refactoring Scope**
   - What we know: Need to update push/index.ts for localization
   - What's unclear: Should database triggers also be refactored to stop inserting title/body directly?
   - Recommendation: For Phase 30, enhance Edge Function only. Phase 31 can refactor triggers to use notification_type + variables pattern for full server-side localization

3. **Offline Language Change**
   - What we know: App works offline with AsyncStorage cache
   - What's unclear: Should language changes queue for server sync when offline?
   - Recommendation: Yes, use same pattern as other offline-first features

## Sources

### Primary (HIGH confidence)
- Expo Documentation: Localization guide (https://docs.expo.dev/guides/localization/)
- i18next Documentation: Namespaces and configuration (https://www.i18next.com/principles/namespaces)
- Supabase Documentation: Edge Functions and push notifications (https://supabase.com/docs/guides/functions)

### Secondary (MEDIUM confidence)
- GitHub Discussion: Supabase email template internationalization patterns (https://github.com/orgs/supabase/discussions/6160)
- Supabase Blog: Custom i18n authentication emails pattern (https://blog.mansueli.com/creating-customized-i18n-ready-authentication-emails-using-supabase-edge-functions-postgresql-and-resend)

### Tertiary (LOW confidence)
- Community patterns for notification templates table design (synthesized from multiple WebSearch sources)

## Notification Types Inventory

Based on codebase analysis, these notification types need English and Spanish templates:

| Type Key | Current English Title | Context |
|----------|----------------------|---------|
| `friend_request_received` | "{{name}} sent you a friend request" | Friend request notification |
| `friend_request_accepted` | "{{name}} accepted your friend request!" | Friend acceptance |
| `birthday_day_of` | "Happy Birthday!" | Day-of celebration |
| `gift_leader_week_reminder` | "1 week left - have you collected contributions?" | Gift leader reminder |
| `birthday_reminder` | "Heads up: {{name}}'s birthday in {{days}} days!" | Upcoming birthday |
| `contribution_reminder` | "Weekly contribution reminder" | Periodic reminder |
| `item_claimed` | "Item Claimed" | Someone claimed an item |
| `split_invite` | "Split Invite" | Invited to contribute |
| `split_fully_funded` | "Split Fully Funded!" | Split goal reached |
| `split_canceled` | "Split Canceled" | Split was canceled |
| `gift_leader_assigned` | "You're the Gift Leader" | New assignment |
| `gift_leader_reassigned` | "Gift Leader Reassigned" | Reassignment |

## Translation Key Count Estimate

Based on codebase grep analysis:
- App screens: ~320 string occurrences across 28 files
- Components: ~340 string occurrences across 59 files
- **After deduplication and filtering non-user-facing strings: ~400 unique translation keys**

Recommended namespace distribution:
| Namespace | Estimated Keys | Coverage |
|-----------|---------------|----------|
| common | 50-60 | Buttons, labels, errors, time formatting |
| auth | 25-30 | Login, signup, password reset |
| groups | 45-55 | Groups, members, invites, settings |
| wishlist | 60-70 | Items, claims, splits, contributions |
| notifications | 35-40 | All notification messages |
| profile | 50-60 | Settings, preferences, personal details |
| calendar | 25-30 | Birthdays, dates, reminders |
| celebrations | 35-40 | Celebrations, gift leader, contributions |

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Building on established Phase 29 foundation
- Architecture: HIGH - Patterns verified against i18next and Supabase docs
- Pitfalls: HIGH - Based on common i18n issues documented in community
- Notification inventory: HIGH - Direct codebase analysis

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable technology domain)
