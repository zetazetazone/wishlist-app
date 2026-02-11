# Feature Landscape: v1.5 Localization

**Domain:** Mobile App Localization (English + Spanish)
**Researched:** 2026-02-11
**Confidence:** HIGH (verified with official Expo docs and industry best practices)

## Executive Summary

Adding localization to an existing React Native/Expo app requires careful consideration of what users expect versus what creates unnecessary complexity. For a birthday gift coordination app expanding to Spanish-speaking markets, the focus should be on complete UI translation, automatic language detection, user preference persistence, and localized notifications. Advanced features like RTL support or dynamic content translation are anti-features for this scope.

---

## Table Stakes

Features users **expect** by default. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Auto-detect device language on first launch** | Users expect apps to "just work" in their language | Low | `expo-localization` | Use `getLocales()` to detect system language at app start |
| **Fallback to English for unsupported languages** | Non-Spanish speakers shouldn't see broken UI | Low | i18n config | If detected language isn't en/es, default to English |
| **Translated UI text (buttons, labels, headings)** | Core expectation of any localized app | Med | Translation files, i18next | ~60+ screens/components need string extraction |
| **Translated system messages (alerts, toasts, errors)** | Error messages in wrong language = confusing UX | Med | Translation files | Alert.alert(), toast messages throughout app |
| **Localized date/time formatting** | "February 11" vs "11 de febrero" | Low | `date-fns` locale support | Already using date-fns, just add locale parameter |
| **Language setting persistence** | User shouldn't re-select language every session | Low | AsyncStorage | Already have AsyncStorage installed |
| **Language selection in Settings** | Users must be able to override auto-detection | Low | Profile settings UI | Add to existing settings screen |
| **Localized push notification content** | Notifications arriving in wrong language = jarring | Med | Edge function + user preference storage | Server needs to know user's language |
| **Consistent language across app + store listing** | Mismatch harms trust and ratings | Low | N/A (process) | App Store/Play Store descriptions must match |

### Table Stakes Dependencies

```
Device language detection
    |
    v
Fallback logic --> Translation files (en/es)
    |                     |
    v                     v
AsyncStorage persistence --> i18n initialization
                                |
                                v
                          UI renders in correct language
```

---

## Differentiators

Features that **set the product apart**. Not expected, but valued when present.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **In-app language switcher with instant preview** | No app restart required to change language | Med | React context, i18next runtime switching | Better UX than requiring restart |
| **Server-side language preference** | Language syncs across devices/reinstalls | Low | Database column on user_profiles | Add `preferred_language` column |
| **Localized onboarding flow** | First impression in user's language | Low | Translation files | High-value touchpoint |
| **Language-aware notification templates** | Template-based localization on server | Med | Edge function updates, notification_types table | More maintainable than client-side |
| **iOS per-app language setting support** | Users can set app language independent of device | Low | `expo-localization` config plugin | iOS 13+/Android 13+ native feature |
| **TypeScript-safe translation keys** | Auto-complete and type checking for i18n | Low | TypeScript declaration files | Prevents typos in translation keys |
| **Pluralization support** | "1 item" vs "2 items" handled correctly | Low | i18next pluralization | Spanish has simple 2-form plurals like English |
| **Number/currency formatting** | Locale-aware formatting (1,000 vs 1.000) | Low | Intl API | Price displays for wishlist items |

### Differentiator Value Assessment

| Feature | Implementation Effort | User Impact | Recommend for v1.5? |
|---------|----------------------|-------------|---------------------|
| Instant language switch | 4 hours | High | YES - prevents app restart |
| Server-side preference | 2 hours | Medium | YES - cross-device sync |
| Localized onboarding | 2 hours | High | YES - first impression |
| Language-aware notifications | 6 hours | High | YES - core to notification localization |
| iOS per-app language | 1 hour | Medium | YES - minimal effort |
| TypeScript-safe keys | 2 hours | Low (DX) | YES - prevents bugs |
| Pluralization | 1 hour | Low | YES - built into i18next |
| Number formatting | 1 hour | Low | MAYBE - only if prices shown |

---

## Anti-Features

Features that **seem good but create problems**. Explicitly do NOT build these.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **RTL (Right-to-Left) support** | Neither English nor Spanish require RTL. Adding RTL support now adds complexity with zero user benefit. | Skip entirely. Add only if Hebrew/Arabic support is ever needed. |
| **User-generated content translation** | Wishlist item names, chat messages, and notes are user content. Auto-translating creates confusion ("Did my friend write this?"). | Keep UGC in original language. Focus on UI chrome only. |
| **Dynamic translation fetching from server** | Adds latency, offline fragility, and complexity. For 2 languages, JSON files are fine. | Bundle translations as static JSON files in the app. |
| **Flag-based language selector** | Flags represent countries, not languages. Spanish is spoken in 20+ countries. Can be offensive. | Use language names in native script: "English", "Espanol" |
| **Automatic translation of push notification body** | Notification content often includes user names, item names. Auto-translating mangles these. | Localize notification templates, but interpolate dynamic content as-is. |
| **Regional Spanish variants** | es-MX vs es-ES vs es-AR. For MVP, differences are minor and create translation management burden. | Use neutral "Latin American Spanish" (es) for v1.5. |
| **Machine translation fallback** | When a translation is missing, showing machine-translated text looks unprofessional. | Show English fallback with graceful degradation. |
| **Currency conversion** | Users in different countries may use different currencies, but converting prices adds massive complexity. | Display currency as entered by item creator. |
| **Custom fonts per language** | Spanish uses Latin script like English. No need for different fonts. | Use existing font stack. |
| **Language-specific color schemes** | Cultural color preferences vary, but changing colors based on language is overkill. | Keep consistent brand colors. |

### Anti-Feature Rationale Deep Dive

**Why NOT translate user-generated content?**
- Chat messages: "Quiero ese regalo!" (Spanish) should stay Spanish even if viewer's app is in English
- Wishlist items: "Nintendo Switch" should stay "Nintendo Switch" regardless of language
- Notes: Personal notes between group members shouldn't be altered
- The app is for coordinating with friends/family who likely share a language anyway

**Why NOT use regional Spanish variants?**
- Maintenance burden: 2x translation files per region
- Minor differences: "computadora" (LATAM) vs "ordenador" (Spain) - context makes meaning clear
- User expectation: Most Spanish-language apps use neutral Spanish
- Future option: Can add regional variants in v2.0 if user demand exists

---

## Feature Dependencies

### Translation Infrastructure Dependencies

```
expo-localization (detect device language)
        |
        v
i18next + react-i18next (translation engine)
        |
        v
Translation JSON files (en.json, es.json)
        |
        v
AsyncStorage (persist language preference)
        |
        v
React Context (provide language to components)
```

### Push Notification Localization Dependencies

```
user_profiles table
        |
        +-- preferred_language column (NEW)
        |
        v
device_tokens table (existing)
        |
        v
Edge Function (push/index.ts)
        |
        +-- Query user's preferred_language
        |
        +-- Select notification template by language
        |
        v
Expo Push Service
```

### Component-Level Dependencies

| Feature | Depends On |
|---------|------------|
| Language selection UI | AsyncStorage, i18next changeLanguage() |
| Localized dates | date-fns locale, user language context |
| Localized notifications | Database language preference, Edge function |
| TypeScript-safe keys | Translation file structure, declaration files |
| iOS per-app language | expo-localization config plugin, app.json |

### Existing Feature Integration Points

| Existing Feature | Localization Impact |
|-----------------|---------------------|
| Push notifications | High - Edge function needs language awareness |
| Alert.alert() calls | Medium - All alerts need translation keys |
| Date displays (birthday, celebrations) | Medium - Use date-fns locale |
| Profile settings | Low - Add language selector |
| Onboarding flow | Medium - High-visibility touchpoint |
| Chat messages | None - UGC stays in original language |
| Wishlist items | None - UGC stays in original language |

---

## MVP Definition for v1.5

### Must Have (P0)

These features are required for v1.5 release:

1. **expo-localization + i18next setup** - Core infrastructure
2. **English translation file (en.json)** - Base translations extracted from hardcoded strings
3. **Spanish translation file (es.json)** - Complete translation of all UI strings
4. **Auto-detection on first launch** - Use device language preference
5. **Language persistence** - Store in AsyncStorage
6. **Settings language selector** - Allow manual override
7. **Localized static UI** - All buttons, labels, headings, placeholders
8. **Localized system messages** - Alerts, errors, toasts
9. **Localized date formatting** - Birthdays, celebrations, calendar
10. **Localized push notifications** - Server-side template selection

### Should Have (P1)

Add if time permits:

1. **Instant language switching** - No app restart required
2. **TypeScript-safe translation keys** - Auto-complete support
3. **iOS per-app language support** - Config plugin setup
4. **Server-side language preference** - Sync across devices
5. **Pluralization** - "1 item" vs "2 items"

### Could Have (P2)

Consider for future versions:

1. **Number/currency formatting** - Locale-aware
2. **Additional languages** - Portuguese, French
3. **Regional Spanish variants** - es-MX, es-ES

### Will Not Have (P3)

Explicitly out of scope:

1. RTL support
2. User content translation
3. Machine translation
4. Dynamic translation fetching
5. Currency conversion

---

## Feature Prioritization Matrix

| Feature | User Impact | Effort | Risk | Priority |
|---------|-------------|--------|------|----------|
| i18n infrastructure setup | High | Low | Low | P0 |
| English translation file | High | Med | Low | P0 |
| Spanish translation file | High | Med | Med | P0 |
| Device language detection | High | Low | Low | P0 |
| AsyncStorage persistence | Med | Low | Low | P0 |
| Settings language selector | Med | Low | Low | P0 |
| UI string translation | High | High | Low | P0 |
| Alert/error translation | Med | Med | Low | P0 |
| Date formatting | Med | Low | Low | P0 |
| Push notification localization | High | Med | Med | P0 |
| Instant language switch | Med | Med | Low | P1 |
| TypeScript-safe keys | Low | Low | Low | P1 |
| iOS per-app language | Low | Low | Low | P1 |
| Server-side preference | Med | Low | Low | P1 |
| Pluralization | Low | Low | Low | P1 |
| Number formatting | Low | Low | Low | P2 |
| Additional languages | Med | High | Low | P2 |

---

## String Extraction Scope

Based on codebase analysis, these areas need string extraction:

### High-Volume Areas (Estimate: 200+ strings)

| Area | File Count | Estimated Strings |
|------|------------|-------------------|
| Screen titles and headings | ~30 screens | 60 |
| Button labels | ~50 components | 80 |
| Form placeholders | ~20 forms | 40 |
| Alert messages | ~40 alerts | 60 |
| Empty states | ~15 screens | 30 |
| Loading states | ~20 screens | 25 |
| Error messages | ~30 catch blocks | 45 |
| Tab labels | 1 file | 5 |
| Onboarding | 1 flow | 15 |

### Low-Volume Areas (Estimate: 50 strings)

| Area | Estimated Strings |
|------|-------------------|
| Settings labels | 15 |
| Profile sections | 10 |
| Notification templates | 10 |
| Validation messages | 15 |

**Total Estimated: ~400 unique strings**

---

## Translation Quality Requirements

### For Spanish (es.json)

- Professional translation (not machine translation)
- Neutral Latin American Spanish
- Consistent terminology throughout app
- Contextual appropriateness (formal/informal tone matching existing UI)
- Technical terms preserved (e.g., "wishlist" may stay as-is or use "lista de deseos")

### Translation Key Conventions

```typescript
// Hierarchical structure by feature area
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "auth": {
    "login": "Log In",
    "signup": "Sign Up"
  },
  "wishlist": {
    "addItem": "Add Item",
    "emptyState": "No items yet"
  },
  "notifications": {
    "birthdayReminder": "{{name}}'s birthday is coming up!"
  }
}
```

---

## Sources

### Official Documentation
- [Expo Localization Guide](https://docs.expo.dev/guides/localization/)
- [Apple Developer Localization](https://developer.apple.com/localization/)

### Best Practices & Patterns
- [Adding multi-language support to Expo app](https://launchtoday.dev/blog/expo-multi-language-support)
- [Mobile app localization best practices 2025](https://lingohub.com/blog/mobile-app-localization-in-2025-best-practices-for-global-success)
- [Best Practices for Localization in React Native and Expo 2025](https://www.autolocalise.com/blog/react-native-expo-localization-best-practice)
- [Top language selector UX examples](https://simplelocalize.io/blog/posts/ui-design-language-selector-examples/)
- [10 UI Localization Best Practices for Developers](https://daily.dev/blog/10-ui-localization-best-practices-for-developers)

### MVP & Anti-Patterns
- [Minimum Viable Localization Guide](https://poeditor.com/blog/minimum-viable-localization-mvl/)
- [Top Challenges in Mobile App Localization](https://technolex.com/articles/mobile-application-localization-main-problems/)
- [Mobile app localization best practices - Lokalise](https://lokalise.com/blog/best-practices-to-remember-when-localizing-mobile-apps/)
- [App Localization Best Practices - Attrock](https://attrock.com/blog/app-localization-best-practices/)

### Push Notification Localization
- [How to send iOS notifications in different languages](https://www.holdapp.com/blog/how-to-send-ios-notifications-in-different-languages)
- [Localizing iOS notification content](https://medium.com/@yureka_81375/localizing-ios-notification-content-based-on-your-application-language-or-device-language-4cb63f3a65fd)

### i18n Implementation
- [Internationalization guide - Obytes Expo Starter](https://starter.obytes.com/guides/internationalization/)
- [Internationalization and localization in React Native - LogRocket](https://blog.logrocket.com/internationalization-and-localization-in-react-native/)
- [How to Build a Multi-Language App with i18n in React Native 2025](https://medium.com/@devanshtiwari365/how-to-build-a-multi-language-app-with-i18n-in-react-native-2025-edition-24318950dd8c)
