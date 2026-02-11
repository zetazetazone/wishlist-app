# Pitfalls Research: v1.5 Localization (English + Spanish)

**Domain:** Adding localization to existing React Native/Expo app
**Researched:** 2025-02-11
**Focus:** Extracting hardcoded strings from 140+ files, server-side language persistence, multilingual push notifications via Supabase Edge Functions

## Executive Summary

The critical risks for v1.5 localization center on four themes:

1. **Incomplete string extraction** -- With 140+ files and ~30,000 lines of code, manual extraction will miss strings. Hardcoded text in error messages, validation, utilities, and edge cases creates mixed-language UI that frustrates users and requires multiple remediation passes.

2. **Language switching not propagating** -- React.memo components, cached navigation titles, and stale context prevent immediate UI updates when language changes. Users see mixed-language screens until app restart, creating perception of broken feature.

3. **Server-side language for push notifications** -- The existing Edge Function sends notifications in hardcoded English. User language preference stored only in AsyncStorage is inaccessible server-side. Push notifications in wrong language undermine the entire localization effort.

4. **Cross-device language desync** -- Without server persistence, users setting Spanish on phone see English when logging in on tablet. AsyncStorage is device-local; language preference must sync to Supabase profiles.

---

## Critical Pitfalls

### CRITICAL-01: Incomplete String Extraction Creates Mixed-Language UI

**What goes wrong:** After "completing" localization, users encounter random English text in Spanish mode. Error messages, validation text, empty states, and dynamic strings remain hardcoded throughout the codebase.

**Why it happens:**
- Manual extraction misses strings in utility functions, hooks, and error handlers
- Template literals with embedded text are overlooked
- Toast/alert messages not centralized
- Strings returned from API calls (not in translation scope)
- Team assumes search-and-replace for quotes is sufficient

**Warning signs:**
- No automated tooling configured to detect remaining hardcoded strings
- Extraction done by grepping for quotes rather than AST analysis
- QA tests only happy paths in translated language
- Bug reports trickle in post-launch: "Why is this still in English?"

**Prevention:**

1. **Enable pseudo-localization** during development:
```typescript
// i18n.ts - development mode
if (__DEV__) {
  i18n.use({
    type: 'postProcessor',
    name: 'pseudo',
    process: (value: string) => `[${value.replace(/[aeiou]/g, c =>
      ({ a: 'x', e: 'q', i: 'j', o: 'y', u: 'w' })[c] || c)}]`
  });
}
```
Pseudo-localization transforms "Hello" to "[Hqlly]", making untranslated strings visually obvious.

2. **Add ESLint rule** to fail on hardcoded strings in JSX:
```bash
npm install eslint-plugin-i18next-no-undefined-translation-keys --save-dev
```

3. **Create pre-extraction inventory** using AST scanner:
```bash
# Use i18next-parser or similar to extract all string candidates
npx i18next-parser --config i18next-parser.config.js
```

4. **CI check for missing keys**:
```bash
npx i18n-check --source locales/en.json --target locales/es.json --fail-on-missing
```

**Do NOT** rely on:
- Manual code review (will miss edge cases)
- Simple grep for quotes (too many false positives/negatives)
- Single QA pass through app (coverage too low)

**Suggested phase:** Phase 1 (Foundation) -- tooling must be configured before any string extraction begins.

**Confidence:** HIGH -- This is the #1 reported issue when retrofitting localization. Pattern verified across multiple sources including [Phrase blog](https://phrase.com/blog/posts/react-native-i18n-with-expo-and-i18next-part-1/) and [Intlayer guide](https://intlayer.org/doc/environment/react-native-and-expo).

---

### CRITICAL-02: Language Change Doesn't Update All UI Components

**What goes wrong:** User changes language in settings. Some screens update immediately; others show old language until app restart. Tab bar remains in English, cached list items show old text, memoized components don't re-render.

**Why it happens:**
- `React.memo()` components don't receive language as a prop
- Navigation titles computed once at mount, not on language change
- Translation values cached in component state
- `useTranslation` hook returns unstable `t` function causing some components to over-optimize with stale closures

**Warning signs:**
- Tab labels don't change with language switch
- List items show mixed languages
- Headers/footers lag behind body content
- Some screens require navigation away and back to update
- Console shows "App component loading" multiple times (re-render issues)

**Prevention:**

1. **Configure i18next correctly**:
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  react: {
    bindI18n: 'languageChanged loaded',
    useSuspense: false,
  },
});
```

2. **Use key-based remount for root navigator** if global update needed:
```typescript
// App.tsx
const { i18n } = useTranslation();

return (
  <NavigationContainer key={i18n.language}>
    <RootNavigator />
  </NavigationContainer>
);
```

3. **Dynamic tab labels** (not static strings):
```typescript
// _layout.tsx
<Tabs.Screen
  name="home"
  options={{
    tabBarLabel: () => {
      const { t } = useTranslation();
      return t('tabs.home');
    }
  }}
/>
```

4. **Test every screen** with mid-session language switch before marking component complete.

5. **Pin react-i18next version** if experiencing render issues:
```json
"react-i18next": "14.0.2"
```

**Suggested phase:** Phase 1 (Foundation) -- architecture decision affects all component work.

**Confidence:** HIGH -- Multiple GitHub issues document this: [#1442](https://github.com/i18next/react-i18next/issues/1442), [#604](https://github.com/i18next/react-i18next/issues/604), [#1171](https://github.com/i18next/react-i18next/issues/1171).

---

### CRITICAL-03: Push Notifications Sent in Wrong Language

**What goes wrong:** Spanish-speaking user receives push notifications in English. "Maria's birthday is coming up!" instead of "Se acerca el cumpleanos de Maria!"

**Why it happens:**
- Current Edge Function (`supabase/functions/push/index.ts`) uses hardcoded English:
  ```typescript
  const { title, body } = payload.record; // Always English from database
  ```
- User language stored in AsyncStorage -- inaccessible to Edge Function
- No `preferred_language` column in profiles table
- Notification content inserted by client in current UI language, but that's the sender's language, not the recipient's

**Warning signs:**
- Notifications arrive in English regardless of app language setting
- No `language` or `preferred_language` column in Supabase profiles
- Edge Function doesn't query user preferences
- `user_notifications` table has `title`/`body` as plain strings, not translation keys

**Prevention:**

1. **Add language column to profiles**:
```sql
ALTER TABLE profiles ADD COLUMN preferred_language TEXT DEFAULT 'en';
CREATE INDEX idx_profiles_language ON profiles(preferred_language);
```

2. **Sync language to server on change**:
```typescript
// languageService.ts
export async function setLanguage(language: string) {
  // Update locally
  await AsyncStorage.setItem('language', language);
  i18n.changeLanguage(language);

  // Sync to server
  const { data: session } = await supabase.auth.getSession();
  if (session?.session) {
    await supabase
      .from('profiles')
      .update({ preferred_language: language })
      .eq('id', session.session.user.id);
  }
}
```

3. **Create notification translations table**:
```sql
CREATE TABLE notification_translations (
  key TEXT NOT NULL,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (key, language)
);

-- Seed with translations
INSERT INTO notification_translations VALUES
  ('birthday_reminder', 'en', '{{name}}''s birthday is coming up!', 'Don''t forget to check their wishlist'),
  ('birthday_reminder', 'es', 'Se acerca el cumpleanos de {{name}}!', 'No olvides revisar su lista de deseos');
```

4. **Update Edge Function**:
```typescript
// supabase/functions/push/index.ts
// Query recipient's language preference
const { data: profile } = await supabase
  .from('profiles')
  .select('preferred_language')
  .eq('id', user_id)
  .single();

const language = profile?.preferred_language || 'en';

// Get translated notification
const { data: translation } = await supabase
  .from('notification_translations')
  .select('title, body')
  .eq('key', notification_key)
  .eq('language', language)
  .single();

// Interpolate variables
const title = translation.title.replace('{{name}}', data.name);
const body = translation.body;
```

5. **Change notification insertion** to use keys, not strings:
```typescript
// Instead of inserting final text:
await supabase.from('user_notifications').insert({
  user_id,
  notification_key: 'birthday_reminder', // Key, not final text
  data: { name: celebrant.name, ... }
});
```

**Suggested phase:** Phase 2 (Server Integration) -- requires schema change + Edge Function update.

**Confidence:** HIGH -- This is the most project-specific critical pitfall. The current architecture explicitly doesn't support this.

---

### CRITICAL-04: Language Preference Lost Across Devices

**What goes wrong:** User sets Spanish on iPhone, logs in on iPad, sees English. Must reconfigure language on every device.

**Why it happens:**
- Language stored only in AsyncStorage (device-local storage)
- New device defaults to device locale or app default
- No server-side preference to pull on login

**Warning signs:**
- `AsyncStorage.getItem('language')` without corresponding server fetch
- No language field in user profile query on auth
- Login flow doesn't restore user preferences

**Prevention:**

1. **Store preference server-side** (covered in CRITICAL-03)

2. **Load preference hierarchy on app launch**:
```typescript
// useLanguageInit.ts
export function useLanguageInit() {
  const { data: session } = useSession();

  useEffect(() => {
    async function initLanguage() {
      // Priority: server > local > device
      let language = 'en';

      // 1. Try server (if logged in)
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', session.user.id)
          .single();
        if (profile?.preferred_language) {
          language = profile.preferred_language;
        }
      }

      // 2. Fallback to local storage
      if (!language) {
        language = await AsyncStorage.getItem('language');
      }

      // 3. Fallback to device locale (if supported)
      if (!language) {
        const deviceLocale = Localization.getLocales()[0]?.languageCode;
        if (['en', 'es'].includes(deviceLocale)) {
          language = deviceLocale;
        }
      }

      // Apply
      await i18n.changeLanguage(language);
      await AsyncStorage.setItem('language', language);
    }

    initLanguage();
  }, [session?.user?.id]);
}
```

3. **Sync on change** (covered in CRITICAL-03)

4. **Handle offline gracefully**: Queue server sync for when connectivity returns.

**Suggested phase:** Phase 2 (Server Integration)

**Confidence:** HIGH -- AsyncStorage is explicitly documented as device-local. [Expo Store Data docs](https://docs.expo.dev/develop/user-interface/store-data/).

---

## High-Priority Pitfalls

### HIGH-01: Date/Number/Currency Formatting Mismatches

**What goes wrong:** Date "02/11/2025" means February 11 to US users, November 2 to European users. Birthday countdown shows wrong date.

**Why it happens:**
- Dates formatted with hardcoded patterns or `toLocaleDateString()` without locale
- Numbers use US separators (1,000.50) instead of locale-appropriate (1.000,50)
- String interpolation for dates: `${month}/${day}/${year}`

**Warning signs:**
- Code using `.toLocaleDateString()` without explicit locale parameter
- Manual date string construction
- No `Intl.DateTimeFormat` or `Intl.NumberFormat` usage
- Currency formatted as `$${amount}` string template

**Prevention:**

1. **Create centralized formatting utilities**:
```typescript
// utils/format.ts
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatCurrency(amount: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}
```

2. **Audit all date displays** during string extraction phase

3. **Store dates in ISO format**, format only at display time

4. **Test with contrasting locales**: en-US (MM/DD/YYYY) vs es-ES (DD/MM/YYYY) vs de-DE (DD.MM.YYYY)

**Suggested phase:** Phase 3 (Content Extraction) -- audit during string migration

**Confidence:** HIGH -- [Intl MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat), [Smashing Magazine i18n guide](https://www.smashingmagazine.com/2017/01/internationalizing-react-apps/).

---

### HIGH-02: useTranslation Hook Causes Performance Degradation

**What goes wrong:** Form inputs lag, list scrolling stutters. Every keystroke triggers full component tree re-render because `t` function reference is unstable.

**Why it happens:**
- `useTranslation` returns new `t` function on each render in some versions
- Components with `t` in dependency arrays re-render excessively
- Trans component re-evaluates translations on every render

**Warning signs:**
- Console shows "App component loading" printed multiple times
- React DevTools shows unnecessary renders
- Input fields have visible typing lag
- `useTranslation` used in every component regardless of need

**Prevention:**

1. **Pin to stable version**:
```json
"react-i18next": "14.0.2"
```

2. **Memoize static translations**:
```typescript
const staticText = useMemo(() => ({
  title: t('screen.title'),
  subtitle: t('screen.subtitle'),
}), [t, i18n.language]);
```

3. **Don't use t() in render loops**:
```typescript
// Bad
items.map(item => <Text>{t('item.label')}</Text>)

// Good
const label = t('item.label');
items.map(item => <Text>{label}</Text>)
```

4. **Only import useTranslation in components that need it**

**Suggested phase:** Phase 1 (Foundation) -- test performance during initial integration

**Confidence:** HIGH -- GitHub issues [#1756](https://github.com/i18next/react-i18next/issues/1756), [#1636](https://github.com/i18next/react-i18next/issues/1636).

---

### HIGH-03: Text Expansion Breaks Layouts

**What goes wrong:** English "Save" button works fine. Spanish "Guardar cambios" overflows container, text truncates, or pushes adjacent elements off-screen.

**Why it happens:**
- Fixed-width containers designed for English
- No buffer for language expansion (Spanish is ~30% longer than English)
- Designs only reviewed in English

**Warning signs:**
- Fixed `width` values on text containers
- `numberOfLines={1}` without `ellipsizeMode`
- Button text specified as specific pixel width
- No visual QA in target language

**Prevention:**

1. **Design with 30-40% text expansion buffer**

2. **Use flexible layouts**:
```typescript
// Good
<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
  <Text style={{ flexShrink: 1 }}>{t('long.text')}</Text>
</View>

// Avoid
<View style={{ width: 100 }}>
  <Text>{t('button.text')}</Text>
</View>
```

3. **Test with pseudolocalization that adds length**:
```typescript
// Pseudo config that doubles text length
process: (value) => `[${value}${value.substring(0, Math.floor(value.length * 0.3))}]`
```

4. **Visual QA in all supported languages** before release

**Suggested phase:** Phase 5 (Testing & QA)

**Confidence:** HIGH -- Standard i18n concern documented in [AutoLocalise best practices](https://www.autolocalise.com/blog/react-native-expo-localization-best-practice).

---

## Technical Debt Patterns

### Anti-Pattern 1: Flat Translation Key Structure

**What to avoid:**
```json
{
  "welcomeTitle": "Welcome",
  "welcomeSubtitle": "Get started",
  "homeTitle": "Home",
  "homeEmptyState": "Nothing here"
}
```

**Why it's debt:** Keys become unmanageable at scale. No indication which screen uses which key. Duplicates emerge. Refactoring is risky.

**Better approach:**
```json
{
  "onboarding": {
    "welcome": {
      "title": "Welcome",
      "subtitle": "Get started"
    }
  },
  "screens": {
    "home": {
      "title": "Home",
      "emptyState": "Nothing here"
    }
  }
}
```

**Phase to establish:** Phase 1 (Foundation)

---

### Anti-Pattern 2: Manual Pluralization Logic

**What to avoid:**
```typescript
const text = count === 0 ? t('noItems') : count === 1 ? t('oneItem') : t('manyItems', { count });
```

**Why it's debt:** Different languages have different plural rules. English has 2 forms, Spanish has 2, Russian has 3, Arabic has 6. Manual conditionals break for languages you add later.

**Better approach:**
```typescript
// en.json
{ "items": "{{count}} item", "items_plural": "{{count}} items" }

// Code
const text = t('items', { count });
```

i18next handles plural rules per locale automatically.

**Phase to establish:** Phase 3 (Content Extraction)

---

### Anti-Pattern 3: Hardcoded Fallbacks

**What to avoid:**
```typescript
const title = t('screen.title') || 'Default Title';
```

**Why it's debt:** Missing translations are hidden. Production shows mixed languages without triggering errors. No visibility into translation gaps.

**Better approach:**
```typescript
// Configure i18next to log missing keys in development
i18n.init({
  saveMissing: __DEV__,
  missingKeyHandler: (lng, ns, key) => {
    console.warn(`Missing translation: ${lng}/${ns}/${key}`);
  },
});
```

**Phase to establish:** Phase 1 (Foundation)

---

## Integration Gotchas

### Expo-Specific: Platform Locale Behavior Differences

**Issue:** On iOS, device language change restarts app. On Android, it doesn't. Language detection code may see stale locale on Android.

**Solution:**
```typescript
import { AppState } from 'react-native';
import * as Localization from 'expo-localization';

useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      // Re-check device locale (Android only)
      const currentLocale = Localization.getLocales()[0];
      // Update if device setting changed
    }
  });
  return () => subscription.remove();
}, []);
```

**Source:** [Expo Localization Guide](https://docs.expo.dev/guides/localization/)

---

### Expo-Specific: Expo Go RTL Limitation

**Issue:** RTL layout testing doesn't work in Expo Go. The launcher resets RTL preferences.

**Impact:** Can't test RTL layouts (Arabic, Hebrew) during development without dev build.

**Solution:** For current milestone (English + Spanish only), this is not blocking. Document for future RTL language support.

**Source:** [Expo GitHub #1969](https://github.com/expo/expo/issues/1969)

---

### Supabase-Specific: Edge Function Translation Loading

**Issue:** Edge Functions are stateless. Loading translation files on every push notification adds latency.

**Solutions:**
1. **Recommended for this project:** Store translations in database table (see CRITICAL-03)
2. **Alternative:** Hardcode small set of notification messages in Edge Function
3. **Advanced:** Use Deno KV or caching (overkill for <20 notification types)

---

## UX Pitfalls

### UX-01: No In-App Language Selector

**What goes wrong:** User's device is English but they want app in Spanish. Only option is changing entire device language.

**Prevention:** Add Language option to Settings screen with:
- Current language displayed
- Picker showing supported languages
- Native language names: "Espanol" not "Spanish"
- Immediate preview of change

**Phase:** Phase 4 (UX Polish)

---

### UX-02: Shipping Partial Translations

**What goes wrong:** Team ships with 80% Spanish translations. Users encounter random English phrases, app looks unprofessional.

**Prevention:**
1. CI check: fail if coverage < 100%
2. Don't enable language until 100% translated
3. Better to have 1 complete language than 2 partial

**Phase:** Phase 5 (Testing & QA)

---

### UX-03: Unsupported Device Locale Crashes

**What goes wrong:** Device set to Portuguese. App only supports en/es. User sees broken UI or raw translation keys.

**Prevention:**
```typescript
const SUPPORTED = ['en', 'es'];
const deviceLang = Localization.getLocales()[0]?.languageCode;
const language = SUPPORTED.includes(deviceLang) ? deviceLang : 'en';
```

**Phase:** Phase 1 (Foundation)

---

## "Looks Done But Isn't" Checklist

### String Coverage
- [ ] All visible text uses translation keys
- [ ] Error messages translated (form validation, network errors, auth errors)
- [ ] Toast/alert messages translated
- [ ] Navigation titles and tab labels use dynamic translation
- [ ] Placeholder text in inputs translated
- [ ] Accessibility labels (`accessibilityLabel`, `accessibilityHint`) translated
- [ ] Empty states and loading messages translated
- [ ] Push notification content translated

### Data Formatting
- [ ] Dates formatted with `Intl.DateTimeFormat` and explicit locale
- [ ] Numbers use `Intl.NumberFormat` with locale
- [ ] Currency respects locale format
- [ ] Time displays respect locale (12h vs 24h consideration)

### Language Switching
- [ ] UI updates immediately without restart
- [ ] Tab bar labels update
- [ ] Navigation stack titles update
- [ ] All screens tested after mid-session language switch
- [ ] Memoized components re-render correctly

### Server Integration
- [ ] `preferred_language` column exists in profiles
- [ ] Language preference syncs to server on change
- [ ] New device login loads correct language from server
- [ ] Edge Function sends notifications in user's language
- [ ] Notification translations table seeded for all notification types

### Quality Gates
- [ ] CI fails on missing translation keys
- [ ] Translation coverage is 100% for all shipped languages
- [ ] No truncated text in Spanish (longer language)
- [ ] Layouts handle 30-40% text expansion
- [ ] Tested on both iOS and Android in both languages

---

## Pitfall-to-Phase Mapping

| Phase | Pitfalls to Address | Priority |
|-------|---------------------|----------|
| **Phase 1: Foundation** | CRITICAL-01 (tooling), CRITICAL-02 (architecture), HIGH-02 (performance), Anti-patterns 1 & 3, UX-03 | Critical |
| **Phase 2: Server Integration** | CRITICAL-03 (push), CRITICAL-04 (cross-device), Supabase gotchas | Critical |
| **Phase 3: Content Extraction** | HIGH-01 (dates/numbers), Anti-pattern 2 (plurals), String extraction across 140+ files | High |
| **Phase 4: UX Polish** | UX-01 (selector), Language preference UI | Medium |
| **Phase 5: Testing & QA** | HIGH-03 (layouts), UX-02 (coverage), Platform testing, CI checks | High |

---

## Sources

### Official Documentation
- [Expo Localization Guide](https://docs.expo.dev/guides/localization/)
- [Expo Localization SDK](https://docs.expo.dev/versions/latest/sdk/localization/)
- [react-i18next Documentation](https://react.i18next.com/)
- [React Native I18nManager](https://reactnative.dev/docs/i18nmanager)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications)
- [Expo Store Data](https://docs.expo.dev/develop/user-interface/store-data/)
- [Intl.NumberFormat MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)

### Community Resources
- [Phrase React Native i18n Guide](https://phrase.com/blog/posts/react-native-i18n-with-expo-and-i18next-part-1/)
- [AutoLocalise Best Practices](https://www.autolocalise.com/blog/react-native-expo-localization-best-practice)
- [React Internationalization Guide](https://www.smashingmagazine.com/2017/01/internationalizing-react-apps/)
- [RTL in Expo Guide](https://geekyants.com/blog/implementing-rtl-right-to-left-in-react-native-expo---a-step-by-step-guide)

### GitHub Issues (react-i18next)
- [#1442: React.memo components not re-rendering](https://github.com/i18next/react-i18next/issues/1442)
- [#604: Language change not propagating](https://github.com/i18next/react-i18next/issues/604)
- [#1171: Translations not re-rendered](https://github.com/i18next/react-i18next/issues/1171)
- [#1756: useTranslation render performance](https://github.com/i18next/react-i18next/issues/1756)
- [#1636: useTranslation causing re-renders](https://github.com/i18next/react-i18next/issues/1636)

### Tools
- [eslint-plugin-i18next-no-undefined-translation-keys](https://www.npmjs.com/package/eslint-plugin-i18next-no-undefined-translation-keys)
- [i18n-check](https://lingual.dev/blog/i18n-check-end-to-end-react-i18n-testing/)
- [i18next-parser](https://www.i18next.com/how-to/extracting-translations)
