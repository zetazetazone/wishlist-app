# Project Research Summary: v1.5 Localization

**Project:** Wishlist App - Birthday Gift Coordination
**Domain:** Mobile App Localization (English + Spanish)
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

Adding localization to the existing React Native/Expo wishlist app requires a methodical approach to avoid the most common pitfall: incomplete string extraction from 140+ files leading to mixed-language UI. The recommended approach uses the battle-tested `expo-localization` + `i18next` + `react-i18next` stack, which is the official Expo recommendation with the largest ecosystem.

**Key insight:** This project requires both client-side and server-side localization. While most apps focus solely on UI translation, this app's push notification system (driven by Supabase Edge Functions) requires server-side language awareness. The existing architecture stores user preferences only in AsyncStorage (device-local), making server-side localization impossible. The solution is adding a `preferred_language` column to the users table and syncing language changes to both AsyncStorage (offline support) and Supabase (server access + cross-device sync).

**Critical risks identified:** (1) Manual string extraction will miss hardcoded text in error handlers, validation, and utilities—automated tooling is required; (2) React.memo components and cached navigation titles won't update on language change without proper configuration; (3) Push notifications will arrive in English regardless of user preference without server-side language storage; (4) Text expansion (Spanish is ~30% longer than English) will break fixed-width layouts.

**Mitigation strategy:** Phase 1 establishes foundation with automated string detection tools (eslint-plugin, i18next-parser), proper i18next configuration for instant re-rendering, and database schema changes. Phase 2 tackles server integration before any UI work begins. Phase 3 extracts strings with tooling verification. Phase 4-6 handle UI migration, Edge Function updates, and comprehensive testing.

## Key Findings

### Recommended Stack

**Summary:** Three new dependencies required for client-side localization. Server-side changes to existing Supabase infrastructure for notification localization. No polyfills needed for English/Spanish.

**Core technologies:**
- **expo-localization (~17.0.8)**: Device locale detection via `useLocales()` hook — Official Expo SDK library, SDK 54 compatible, reactive locale data
- **i18next (^25.8.5)**: Core translation engine — Industry standard with 25M+ weekly downloads, supports interpolation, pluralization, context, no framework dependencies
- **react-i18next (^16.5.4)**: React bindings with useTranslation() hook — React 19 compatible, TypeScript support, automatic re-rendering on language change

**Supporting infrastructure (already installed):**
- `@react-native-async-storage/async-storage@^2.2.0`: Persist language preference client-side
- `@supabase/supabase-js@^2.93.3`: Store `preferred_language` in user profiles for server access

**Version compatibility verified:** All packages compatible with existing React 19.1.0, TypeScript 5.9.2, Expo SDK 54.

**What NOT to add:**
- `i18next-react-native-async-storage` (over-engineered; manual AsyncStorage integration is simpler)
- `@formatjs/intl-*` polyfills (English/Spanish have simple plural rules; Hermes handles natively)
- `@lingui/react` (smaller bundle but requires build-time compilation; i18next is simpler)
- `react-intl` (ICU MessageFormat overkill for simple translations)

### Expected Features

**Summary:** Localization must cover entire user experience from device detection through push notifications. User-generated content (wishlist items, chat messages) remains in original language.

**Must have (table stakes):**
- Auto-detect device language on first launch (expo-localization)
- Fallback to English for unsupported languages
- Translated UI text (buttons, labels, headings, placeholders, alerts, toasts, errors)
- Localized date/time formatting (date-fns with locale parameter)
- Language setting persistence (AsyncStorage + Supabase)
- Language selection in Settings
- Localized push notification content (Edge Function + user preference)
- Consistent language across app and store listings

**Should have (competitive differentiators):**
- In-app language switcher with instant preview (no restart required)
- Server-side language preference (syncs across devices)
- Localized onboarding flow (high-value first impression)
- Language-aware notification templates (Edge Function reads preference)
- iOS per-app language setting support (iOS 13+/Android 13+ native feature)
- TypeScript-safe translation keys (autocomplete, compile-time validation)
- Pluralization support (built into i18next)

**Defer (explicitly out of scope):**
- RTL support (neither English nor Spanish require it)
- User-generated content translation (wishlist items, chat stay in original language)
- Dynamic translation fetching from server (2 languages don't need this)
- Regional Spanish variants (es-MX vs es-ES; use neutral Latin American Spanish for v1.5)
- Machine translation fallback (unprofessional when missing keys)
- Currency conversion (massive complexity; display as entered)

**String extraction scope:** ~400 unique strings across 140+ files (screens, components, alerts, errors, validation, empty states, loading states).

### Architecture Approach

**Summary:** Localization integrates as cross-cutting concern at four levels: provider (root layout), component (translation hook), data (Supabase preference), backend (Edge Function reads preference).

**Major components:**

1. **I18nProvider (NEW)** — Root-level context provider
   - Wraps entire app at `app/_layout.tsx`
   - Initializes i18next with device locale
   - Syncs user preference from Supabase on auth
   - Provides language state and change function to all components

2. **Translation Files (NEW)** — Namespaced JSON structure
   - `locales/en.json` and `locales/es.json`
   - Organized by feature area: common, tabs, friends, groups, settings, notifications
   - Supports interpolation (`{{variable}}`), pluralization (`_one`, `_other` suffixes)
   - ~400 translation keys total

3. **Database Schema Extension** — Add language column
   - `users.language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es'))`
   - Index for Edge Function queries
   - Exposed via `user_profiles` view

4. **Edge Function Localization (MODIFIED)** — Server-side translation
   - Query user's `preferred_language` before sending notification
   - Load translation template by language
   - Interpolate variables (names, dates)
   - Send via Expo Push Service

5. **Language Preference Hierarchy** — Three-tier fallback
   - Priority: Server (Supabase) > Local (AsyncStorage) > Device (expo-localization)
   - Sync to both storage layers on change
   - Server needed for Edge Functions and cross-device sync
   - Local needed for offline support

**Integration points:**
- Root layout: Wrap with I18nProvider above existing GluestackUIProvider
- Settings: Add language selector link to profile settings
- All 140+ TSX files: Replace hardcoded strings with `t()` calls progressively
- Date formatting: Replace `toLocaleDateString()` with `Intl.DateTimeFormat` + locale parameter
- Edge Function: Add language query + translation template lookup

**Build order rationale:**
1. Foundation first (database, i18n config, tooling) — no dependencies
2. Infrastructure second (translation files, provider, hooks) — depends on foundation
3. Integration third (root layout, settings UI) — depends on infrastructure
4. UI migration fourth (screen by screen) — depends on integration, can batch by feature
5. Backend parallel with UI (Edge Function) — depends only on foundation
6. Validation last (testing, coverage checks) — depends on all phases

### Critical Pitfalls

Research identified 17 pitfalls across 4 severity tiers. Top 5 critical:

1. **Incomplete String Extraction (CRITICAL-01)** — Manual extraction from 140+ files will miss hardcoded strings in error handlers, validation, utilities, creating mixed-language UI
   - **Prevention:** Enable pseudo-localization in dev, add ESLint rule to fail on hardcoded JSX strings, use i18next-parser for AST-based extraction, add CI check for missing keys
   - **Phase:** Phase 1 (Foundation) — tooling must be configured before any extraction work

2. **Language Change Doesn't Update UI (CRITICAL-02)** — React.memo components, cached navigation titles, stale closures prevent instant updates; users see mixed languages until restart
   - **Prevention:** Configure i18next with `bindI18n: 'languageChanged loaded'`, use key-based remount for navigator, make tab labels dynamic functions not static strings, test every screen with mid-session language switch
   - **Phase:** Phase 1 (Foundation) — architecture decision affects all component work

3. **Push Notifications in Wrong Language (CRITICAL-03)** — Edge Function sends English notifications to Spanish users because language stored only in AsyncStorage (inaccessible server-side)
   - **Prevention:** Add `preferred_language` column to profiles, sync language to Supabase on change, create `notification_translations` table, update Edge Function to query user language and load appropriate template
   - **Phase:** Phase 2 (Server Integration) — schema change + Edge Function update required

4. **Language Lost Across Devices (CRITICAL-04)** — AsyncStorage is device-local; Spanish preference on iPhone doesn't transfer to iPad login
   - **Prevention:** Store preference in Supabase users table, implement three-tier load hierarchy (server > local > device), sync both directions on change, queue offline updates for sync
   - **Phase:** Phase 2 (Server Integration) — server-side storage required

5. **Text Expansion Breaks Layouts (HIGH-03)** — Spanish is ~30% longer than English; fixed-width containers designed for English overflow or truncate
   - **Prevention:** Design with 30-40% expansion buffer, use flexible layouts (flexWrap, flexShrink), test with pseudo-localization that adds length, visual QA in all supported languages
   - **Phase:** Phase 5 (Testing & QA) — validate after UI migration complete

## Implications for Roadmap

Based on research, suggested phase structure with strict dependency ordering:

### Phase 1: Foundation & Tooling
**Rationale:** Database schema and automated tooling must exist before any extraction work. Without proper i18next configuration, language switching won't work. Without automated string detection, manual extraction will miss 20-30% of strings (per industry data).

**Delivers:**
- Database migration: `users.language` column with index
- npm dependencies: i18next, react-i18next, expo-localization
- i18n configuration: `lib/i18n.ts` with language detection, fallback, error logging
- Automated tooling: eslint-plugin-i18next, i18next-parser, pseudo-localization in dev mode
- CI checks: Translation coverage validation, missing key detection

**Addresses features:**
- Device language detection (table stakes)
- Fallback to English (table stakes)
- Language persistence infrastructure (table stakes)
- TypeScript-safe translation keys (differentiator)

**Avoids pitfalls:**
- CRITICAL-01 (incomplete extraction via tooling setup)
- CRITICAL-02 (language switch architecture via proper i18next config)
- Anti-patterns 1 & 3 (namespaced keys, missing key detection)

**Dependencies:** None
**Estimated effort:** 1-2 days
**Risk:** Low (configuration and setup only)

---

### Phase 2: Server Integration
**Rationale:** Server-side language preference must be established before UI translation work begins. Push notifications are high-visibility feature; shipping with English-only notifications to Spanish users undermines entire localization effort. Cross-device sync prevents user frustration.

**Delivers:**
- `notification_translations` table with en/es content for all notification types
- Language preference sync service: update both AsyncStorage and Supabase on change
- Language load hierarchy: server > local > device fallback logic
- Updated Edge Function: query user language, load translated template, interpolate variables

**Addresses features:**
- Localized push notifications (table stakes, highest user visibility)
- Server-side language preference (differentiator for cross-device sync)
- Language persistence (table stakes, completed with server sync)

**Avoids pitfalls:**
- CRITICAL-03 (push notifications in wrong language)
- CRITICAL-04 (language lost across devices)
- Supabase-specific gotchas (Edge Function translation loading)

**Dependencies:** Phase 1 (database schema, i18n config)
**Estimated effort:** 2-3 days
**Risk:** Medium (Edge Function changes, new table, preference sync logic)

---

### Phase 3: Translation Infrastructure
**Rationale:** Translation files and provider must be complete before individual components can consume them. Extracting all strings upfront with automated tooling prevents incremental rework.

**Delivers:**
- `locales/en.json`: All ~400 strings extracted with i18next-parser
- `locales/es.json`: Professional Spanish translations (neutral Latin American)
- `providers/I18nProvider.tsx`: Root context provider with preference loading
- `hooks/useLanguage.ts`: Expose language state and change function
- Translation coverage validation: CI ensures 100% coverage before merge

**Addresses features:**
- Translated UI text (table stakes, bulk of work)
- Translated system messages (table stakes, alerts/errors/toasts)
- Pluralization support (differentiator via i18next built-in)

**Avoids pitfalls:**
- CRITICAL-01 (incomplete extraction via automated tooling)
- HIGH-01 (date/number formatting via centralized utilities)
- Anti-pattern 2 (manual pluralization via i18next automatic handling)
- UX-02 (partial translations via 100% coverage requirement)

**Dependencies:** Phase 1 (tooling), Phase 2 (can parallel)
**Estimated effort:** 5-7 days (string extraction, translation, review)
**Risk:** Medium (tedious, high effort, translation quality dependency)

---

### Phase 4: Root Integration & Settings UI
**Rationale:** Provider must wrap app before components can use translations. Settings UI provides user control and visibility of feature.

**Delivers:**
- `app/_layout.tsx`: Wrap with I18nProvider
- `components/settings/LanguageSelector.tsx`: Language picker with instant preview
- `app/(app)/settings/language.tsx`: Dedicated settings screen
- Settings profile link: Navigate to language selection

**Addresses features:**
- Language selection in Settings (table stakes)
- In-app language switcher (differentiator for no-restart UX)
- iOS per-app language setting (differentiator, config only)

**Avoids pitfalls:**
- UX-01 (no in-app language selector)
- UX-03 (unsupported device locale handling via proper fallback)

**Dependencies:** Phase 3 (translation files, provider)
**Estimated effort:** 1-2 days
**Risk:** Low (straightforward integration)

---

### Phase 5: UI Component Migration
**Rationale:** With infrastructure complete, migrate all components systematically. Batch by feature area to maintain coherent QA. High-traffic screens first maximize visible progress.

**Delivers:**
- All 140+ TSX files migrated to use `t()` calls
- Date/time formatting updated to use `Intl` APIs with locale
- Navigation titles and tab labels made dynamic
- Alert/toast/error messages translated

**Implementation approach:**
- Batch 1: Common components (buttons, alerts, loading states)
- Batch 2: Tab screens (5 screens, highest visibility)
- Batch 3-7: Feature areas (Friends, Groups, Celebrations, Calendar, Settings)
- Batch 8: Auth screens
- Batch 9: Remaining components

**Addresses features:**
- Translated UI text (complete table stakes implementation)
- Translated system messages (complete table stakes implementation)
- Localized date/time formatting (table stakes)
- Localized onboarding (differentiator, high-value first impression)

**Avoids pitfalls:**
- HIGH-01 (date/number formatting via Intl APIs)
- HIGH-02 (performance via proper hook usage patterns)

**Dependencies:** Phase 4 (provider integration)
**Estimated effort:** 7-10 days (large scope, 140+ files)
**Risk:** Medium (tedious, high effort, requires discipline to maintain consistency)

---

### Phase 6: Validation & Testing
**Rationale:** Comprehensive testing catches layout issues from text expansion, validates language switching behavior, ensures server integration works end-to-end.

**Delivers:**
- End-to-end testing: device detection, preference persistence, language switching, push notification language
- Layout validation: Spanish text expansion doesn't break UI (30-40% buffer)
- String coverage verification: pseudo-localization reveals any missed hardcoded strings
- Cross-device testing: language preference syncs correctly
- CI integration: automated checks prevent regressions

**Addresses features:**
- Consistent language across app (table stakes validation)

**Avoids pitfalls:**
- HIGH-03 (text expansion breaks layouts via testing + flexible design)
- UX-02 (partial translations via coverage checks)
- Platform-specific gotchas (iOS/Android behavior differences)

**Dependencies:** Phase 5 (all UI migrated)
**Estimated effort:** 3-4 days
**Risk:** Low (validation only, catches issues before release)

---

### Phase Ordering Rationale

**Dependency chain:**
```
Phase 1 (Foundation) — No dependencies
    |
    +-- Phase 2 (Server) — Requires Phase 1 schema
    |
    +-- Phase 3 (Translation Files) — Requires Phase 1 tooling
            |
            v
        Phase 4 (Root Integration) — Requires Phase 3 provider
            |
            v
        Phase 5 (UI Migration) — Requires Phase 4 integration
            |
            v
        Phase 6 (Validation) — Requires Phase 5 completion
```

**Why this order:**
1. **Foundation first** prevents rework — proper configuration and tooling catch problems early
2. **Server second** ensures cross-device sync and notifications work before UI investment
3. **Translation files third** provide complete dataset for all downstream work
4. **Root integration fourth** establishes consumption pattern before bulk migration
5. **UI migration fifth** leverages complete infrastructure, can be parallelized by feature
6. **Validation last** catches integration issues after all pieces assembled

**Why NOT do UI-first:**
- Migrating components without proper i18next config leads to language switch bugs (CRITICAL-02)
- Extracting strings without automated tooling misses 20-30% (CRITICAL-01)
- Building UI without server integration ships broken push notifications (CRITICAL-03)

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Translation Files):** Spanish translation quality—consider professional translation service vs. in-house. Neutral Latin American Spanish vs. regional variants. Translation management process for future updates.
- **Phase 5 (UI Migration):** Per-screen migration strategy—some screens have complex conditional text, interpolation, pluralization. May need per-screen research for proper i18next patterns.

**Phases with standard patterns (skip phase-level research):**
- **Phase 1 (Foundation):** Well-documented i18next setup, standard database column addition
- **Phase 2 (Server Integration):** Established Edge Function patterns, straightforward preference sync
- **Phase 4 (Root Integration):** Standard React context provider pattern
- **Phase 6 (Validation):** Standard testing approaches, no novel patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (i18next ecosystem) | HIGH | Expo official recommendation, 25M+ weekly downloads, React 19 compatible, verified version compatibility |
| Features (table stakes vs. differentiators) | HIGH | Based on mobile localization best practices, Expo docs, industry standards |
| Architecture (cross-cutting integration) | HIGH | Follows established React context patterns, Supabase preference storage is straightforward |
| Pitfalls (critical risks) | HIGH | Verified via GitHub issues, Stack Overflow, community experiences; patterns match documented problems |
| String extraction scope (~400 strings) | MEDIUM | Estimated from codebase analysis; actual count may vary by 10-20% |
| Spanish translation effort | MEDIUM | Assuming professional or native translator; quality dependency outside technical control |
| Edge Function translation | MEDIUM | Pattern is sound but requires manual template management; no automated tooling for notification translation management |
| UI migration effort (140+ files) | MEDIUM | Straightforward but tedious; discipline required to maintain consistency across large surface area |

**Overall confidence:** HIGH — The technical approach is well-established and verified. Primary risks are execution discipline (complete string extraction) and translation quality (professional Spanish content).

### Gaps to Address

**Translation quality and maintenance:**
- Spanish translations require native speaker or professional service
- Translation management process for future content updates not defined
- Regional variant decision (neutral LATAM vs. es-MX/es-ES/es-AR) deferred to translator recommendation
- How to handle translation updates when new features add strings

**String extraction completeness:**
- Estimated ~400 strings based on codebase scan, but actual count TBD
- Edge cases in dynamic string construction may require custom handling
- Third-party library strings (e.g., date-fns, Gluestack UI) may have limited translation support

**Performance impact:**
- Bundle size increase with translation files (~20KB per language acceptable, verified)
- Re-render performance with useTranslation hook requires monitoring (potential issue per HIGH-02)
- Suggested: Performance budget validation in Phase 6

**Future expansion path:**
- Adding 3rd language (Portuguese, French) would require translation file only (architecture supports)
- RTL languages (Arabic, Hebrew) would require layout refactoring (explicitly out of scope for v1.5)
- Translation management platform (Phrase, Crowdin) needed at 5+ languages (not needed for v1.5)

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Expo Localization Guide](https://docs.expo.dev/guides/localization/) — Best practices, device detection, setup patterns
- [Expo Localization SDK](https://docs.expo.dev/versions/latest/sdk/localization/) — API reference for expo-localization v17.0.8
- [i18next Documentation](https://www.i18next.com/) — Core translation engine configuration
- [react-i18next Documentation](https://react.i18next.com/) — React integration, hooks, best practices
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) — Server-side TypeScript functions
- [Supabase Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications) — Notification patterns

**Package Versions (Verified 2026-02-11):**
- [expo-localization npm](https://www.npmjs.com/package/expo-localization) — v17.0.8
- [i18next npm](https://www.npmjs.com/package/i18next) — v25.8.5
- [react-i18next npm](https://www.npmjs.com/package/react-i18next) — v16.5.4

### Secondary (MEDIUM confidence)

**Community Implementation Guides:**
- [Expo Starter: Internationalization](https://starter.obytes.com/guides/internationalization/) — Reference implementation for i18next + Expo
- [LaunchToday: Multi-language Support in Expo](https://launchtoday.dev/blog/expo-multi-language-support) — Step-by-step setup guide
- [Phrase Blog: React Native i18n with Expo and i18next](https://phrase.com/blog/posts/react-native-i18n-with-expo-and-i18next-part-1/) — Tutorial with common pitfalls
- [AutoLocalise Best Practices](https://www.autolocalise.com/blog/react-native-expo-localization-best-practice) — 2025 best practices guide

**Best Practices & Patterns:**
- [Mobile app localization best practices 2025](https://lingohub.com/blog/mobile-app-localization-in-2025-best-practices-for-global-success)
- [10 UI Localization Best Practices for Developers](https://daily.dev/blog/10-ui-localization-best-practices-for-developers)
- [Minimum Viable Localization Guide](https://poeditor.com/blog/minimum-viable-localization-mvl/)
- [Top Challenges in Mobile App Localization](https://technolex.com/articles/mobile-application-localization-main-problems/)

**Notification Localization:**
- [How to send iOS notifications in different languages](https://www.holdapp.com/blog/how-to-send-ios-notifications-in-different-languages)
- [Localizing iOS notification content](https://medium.com/@yureka_81375/localizing-ios-notification-content-based-on-your-application-language-or-device-language-4cb63f3a65fd)
- [Custom i18n-ready Authentication Emails - Supabase Edge Functions](https://blog.mansueli.com/creating-customized-i18n-ready-authentication-emails-using-supabase-edge-functions-postgresql-and-resend)

### Tertiary (LOW confidence, needs validation)

**GitHub Issues (react-i18next known bugs):**
- [#1442: React.memo components not re-rendering](https://github.com/i18next/react-i18next/issues/1442)
- [#604: Language change not propagating](https://github.com/i18next/react-i18next/issues/604)
- [#1171: Translations not re-rendered](https://github.com/i18next/react-i18next/issues/1171)
- [#1756: useTranslation render performance](https://github.com/i18next/react-i18next/issues/1756)
- [#1636: useTranslation causing re-renders](https://github.com/i18next/react-i18next/issues/1636)

**Tooling:**
- [eslint-plugin-i18next-no-undefined-translation-keys](https://www.npmjs.com/package/eslint-plugin-i18next-no-undefined-translation-keys)
- [i18n-check](https://lingual.dev/blog/i18n-check-end-to-end-react-i18n-testing/)
- [i18next-parser](https://www.i18next.com/how-to/extracting-translations)

---

*Research completed: 2026-02-11*
*Ready for roadmap: YES*
*Recommended approach: Validated against Expo official docs, i18next best practices, and existing codebase patterns*
