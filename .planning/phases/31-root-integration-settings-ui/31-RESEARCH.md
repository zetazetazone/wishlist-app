# Phase 31: Root Integration & Settings UI - Research

**Researched:** 2026-02-11
**Domain:** React Native i18n UI integration, language settings UX, react-i18next instant switching
**Confidence:** HIGH

## Summary

Phase 31 completes the i18n user experience by integrating the I18nProvider at the app root and creating a language selector UI in profile settings. The Phase 30 foundation (useLanguage hook, lib/language.ts, translation files, server sync) is fully implemented - this phase focuses purely on UI integration and user-facing language selection.

The architecture leverages the existing react-i18next setup where i18n.changeLanguage() triggers automatic UI re-renders via the `bindI18n: 'languageChanged loaded'` configuration. No I18nProvider wrapper is needed since react-i18next initializes globally and the root _layout.tsx already guards rendering until i18nReady. The language settings screen requires only a simple two-option selector (English/Spanish) following the app's established toggle/card UI patterns.

**Primary recommendation:** Create a dedicated `app/(app)/settings/language.tsx` screen with navigation from profile settings. Use the existing toggle/card UI pattern (like VisibilityToggle or GroupPickerSheet) for language selection. Wire useLanguage hook for instant switching - the existing bindI18n config ensures all translated components re-render automatically.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-i18next | 16.5.4 | React bindings, useTranslation hook, automatic re-renders | Already installed Phase 29-30, handles instant language switching |
| i18next | 25.8.5 | Translation runtime, changeLanguage API | Already installed, provides core i18n functionality |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-native-async-storage/async-storage | 2.2.0 | Local language persistence | Already installed, used by lib/language.ts |
| @gluestack-ui/themed | 1.x | UI components | For consistent styling with existing screens |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated settings screen | Modal/ActionSheet | Dedicated screen provides clearer navigation, consistent with other settings |
| Custom toggle component | Native Picker | Custom toggle matches app aesthetic, better UX for 2 options |
| I18nProvider wrapper | Global initialization | Global init already working, no wrapper needed |

**Installation:**
```bash
# No new packages needed - all dependencies already installed from Phase 29-30
```

## Architecture Patterns

### Recommended Project Structure
```
app/
|-- (app)/
|   |-- settings/
|   |   |-- _layout.tsx       # Add language route
|   |   |-- profile.tsx       # Add navigation to language settings
|   |   |-- language.tsx      # NEW: Language selection screen
hooks/
|-- useLanguage.ts            # Already exists from Phase 30
lib/
|-- language.ts               # Already exists from Phase 30
src/
|-- i18n/
|   |-- index.ts              # Already configured with bindI18n
|   |-- locales/
|       |-- en.json           # Has settings.language keys
|       |-- es.json           # Has settings.language keys
```

### Pattern 1: Instant Language Switching via changeLanguage
**What:** Using i18n.changeLanguage() triggers automatic UI re-render across all components using useTranslation()
**When to use:** Language selector user interaction
**Example:**
```typescript
// The existing useLanguage hook handles all the complexity:
// 1. Calls i18n.changeLanguage() - triggers UI update
// 2. Saves to AsyncStorage - local persistence
// 3. Syncs to Supabase - server persistence
const { currentLanguage, changeLanguage, isLoading } = useLanguage(userId);

// In language settings screen:
const handleLanguageChange = async (lang: SupportedLanguage) => {
  await changeLanguage(lang);
  // UI automatically re-renders due to bindI18n: 'languageChanged loaded'
};
```

### Pattern 2: Language Selector Card UI
**What:** Two-option toggle/card selection matching app's established design patterns
**When to use:** Language selection screen (2 options, visual feedback)
**Example:**
```typescript
// Following VisibilityToggle and GroupPickerSheet patterns
// Source: components/profile/VisibilityToggle.tsx
// Source: components/wishlist/GroupPickerSheet.tsx

const LanguageCard = ({
  language,
  isSelected,
  onSelect,
  nativeName,
  englishName,
  icon
}) => (
  <TouchableOpacity
    style={[
      styles.languageCard,
      isSelected && styles.languageCardSelected
    ]}
    onPress={() => onSelect(language)}
  >
    <View style={styles.radioIndicator}>
      {isSelected && <View style={styles.radioFill} />}
    </View>
    <View style={styles.languageInfo}>
      <Text style={styles.nativeName}>{nativeName}</Text>
      <Text style={styles.englishName}>{englishName}</Text>
    </View>
    {isSelected && (
      <MaterialCommunityIcons name="check" size={20} color={colors.burgundy[600]} />
    )}
  </TouchableOpacity>
);
```

### Pattern 3: Settings Screen Navigation
**What:** Pressable card in profile settings linking to language settings screen
**When to use:** Adding new settings categories
**Example:**
```typescript
// Following pattern from profile.tsx Personal Details link
<Pressable onPress={() => router.push('/settings/language')}>
  <Box
    backgroundColor="$white"
    borderRadius="$lg"
    padding="$4"
    borderWidth={1}
    borderColor="$borderLight200"
  >
    <HStack justifyContent="space-between" alignItems="center">
      <VStack>
        <Text fontWeight="$semibold">{t('settings.language')}</Text>
        <Text fontSize="$xs" color="$textLight500">
          {t(`languages.${currentLanguage}`)}
        </Text>
      </VStack>
      <HStack alignItems="center" space="sm">
        <MaterialCommunityIcons name="translate" size={20} color="#8B1538" />
        <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
      </HStack>
    </HStack>
  </Box>
</Pressable>
```

### Pattern 4: Root Layout i18n Initialization Guard
**What:** The root _layout.tsx already guards rendering until i18n is ready
**When to use:** Prevents flash of untranslated content on app startup
**Example:**
```typescript
// Already implemented in app/_layout.tsx from Phase 30-05
const [i18nReady, setI18nReady] = useState(false);

useEffect(() => {
  initI18n().then(() => setI18nReady(true));
}, []);

// Wait for i18n initialization before rendering
if (!i18nReady) return null;
```

### Anti-Patterns to Avoid
- **Wrapping with I18nProvider:** Not needed - react-i18next initializes globally, useTranslation works without explicit provider
- **Forcing app restart on language change:** i18n.changeLanguage() handles instant re-render via bindI18n config
- **Manual UI state update after language change:** useTranslation auto-updates, avoid useState for current language display
- **Separate language storage logic:** Use existing useLanguage hook, don't duplicate AsyncStorage/Supabase logic
- **ActionSheet for language selection:** 2 options warrant dedicated screen with clear visual hierarchy

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Language switching logic | Custom state management | useLanguage hook | Already handles i18n + AsyncStorage + Supabase sync |
| UI re-rendering on change | forceUpdate/key changes | react-i18next bindI18n | Built-in reactivity, battle-tested |
| Language display names | Hardcoded strings | Translation keys (languages.en, languages.es) | Translations already exist in en.json/es.json |
| Settings navigation | Custom navigation logic | expo-router push | Consistent with existing settings screens |
| Radio/toggle selection | From scratch | Copy VisibilityToggle/GroupPickerSheet pattern | Matches app aesthetic, proven UX |

**Key insight:** Phase 30 built all the infrastructure. Phase 31 is purely UI work - creating a screen and wiring it to the existing hook.

## Common Pitfalls

### Pitfall 1: Not Getting userId from Auth Session
**What goes wrong:** useLanguage called without userId, server sync doesn't work
**Why it happens:** Forgetting to extract user from auth context
**How to avoid:** Access userId via supabase.auth.getUser() or from existing auth flow
**Warning signs:** Language changes locally but doesn't persist across devices

### Pitfall 2: Duplicate Navigation Entry Points
**What goes wrong:** Language settings accessible from multiple inconsistent paths
**Why it happens:** Adding language link in multiple places during development
**How to avoid:** Single entry point from profile settings only (SETT-01 requirement)
**Warning signs:** Multiple ways to reach language settings, confusing navigation

### Pitfall 3: Missing Translation Keys for Settings Labels
**What goes wrong:** Settings labels show raw keys like "settings.language"
**Why it happens:** Not using t() function or missing keys in JSON files
**How to avoid:** Verify keys exist in both en.json and es.json before implementing UI
**Warning signs:** Raw key strings appearing in UI

### Pitfall 4: Loading State During Language Change
**What goes wrong:** UI freezes or shows no feedback during language change
**Why it happens:** Not using isLoading from useLanguage hook
**How to avoid:** Show loading indicator during changeLanguage() operation
**Warning signs:** User taps language option, nothing visible happens for 500ms+

### Pitfall 5: Stack Navigation Title Not Updating
**What goes wrong:** Screen title stays in old language after switching
**Why it happens:** Static title in Stack.Screen options
**How to avoid:** Use dynamic title with t() function or headerTitle render function
**Warning signs:** "Language" stays English after switching to Spanish

## Code Examples

Verified patterns from existing codebase:

### Language Settings Screen Structure
```typescript
// app/(app)/settings/language.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useLanguage, SupportedLanguage } from '@/hooks/useLanguage';
import { colors, spacing, borderRadius } from '@/constants/theme';

const LANGUAGES: Array<{
  code: SupportedLanguage;
  nativeName: string;
  englishName: string;
  flag: string;
}> = [
  { code: 'en', nativeName: 'English', englishName: 'English', flag: 'US' },
  { code: 'es', nativeName: 'Espanol', englishName: 'Spanish', flag: 'ES' },
];

export default function LanguageSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Get userId on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const { currentLanguage, changeLanguage, isLoading } = useLanguage(userId);

  const handleLanguageSelect = async (lang: SupportedLanguage) => {
    if (lang === currentLanguage || isLoading) return;
    await changeLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t('settings.language'),
        }}
      />

      <Text style={styles.description}>
        {t('settings.languageDescription')}
      </Text>

      {LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.languageCard,
            currentLanguage === lang.code && styles.languageCardSelected,
          ]}
          onPress={() => handleLanguageSelect(lang.code)}
          disabled={isLoading}
        >
          {/* Radio indicator */}
          <View style={styles.radioOuter}>
            {currentLanguage === lang.code && (
              <View style={styles.radioInner} />
            )}
          </View>

          {/* Language info */}
          <View style={styles.languageInfo}>
            <Text style={styles.nativeName}>{lang.nativeName}</Text>
            <Text style={styles.englishName}>{lang.englishName}</Text>
          </View>

          {/* Loading or check indicator */}
          {isLoading && currentLanguage === lang.code ? (
            <ActivityIndicator size="small" color={colors.burgundy[600]} />
          ) : currentLanguage === lang.code ? (
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color={colors.burgundy[600]}
            />
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream[50],
    padding: spacing.lg,
  },
  description: {
    fontSize: 14,
    color: colors.cream[700],
    marginBottom: spacing.lg,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.cream[200],
  },
  languageCardSelected: {
    borderColor: colors.burgundy[400],
    backgroundColor: colors.burgundy[50],
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.burgundy[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.burgundy[600],
  },
  languageInfo: {
    flex: 1,
  },
  nativeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.burgundy[900],
  },
  englishName: {
    fontSize: 12,
    color: colors.cream[600],
    marginTop: 2,
  },
});
```

### Profile Settings Navigation Link
```typescript
// Addition to app/(app)/settings/profile.tsx
// Add after "Important Dates" Pressable block

{/* Language Settings Link */}
<Pressable
  onPress={() => router.push('/settings/language')}
>
  <Box
    backgroundColor="$white"
    borderRadius="$lg"
    padding="$4"
    borderWidth={1}
    borderColor="$borderLight200"
  >
    <HStack justifyContent="space-between" alignItems="center">
      <VStack>
        <Text fontWeight="$semibold">{t('settings.language')}</Text>
        <Text fontSize="$xs" color="$textLight500">
          {t(`languages.${currentLanguage}`)}
        </Text>
      </VStack>
      <HStack alignItems="center" space="sm">
        <MaterialCommunityIcons name="translate" size={20} color="#8B1538" />
        <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
      </HStack>
    </HStack>
  </Box>
</Pressable>
```

### Settings Layout Route Addition
```typescript
// Addition to app/(app)/settings/_layout.tsx
<Stack.Screen
  name="language"
  options={{
    title: 'Language', // Will be replaced by t() in screen
  }}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| App restart on language change | i18n.changeLanguage() with bindI18n | i18next default | Instant re-render without restart |
| Custom context for language | useTranslation() hook | react-i18next standard | Simpler API, automatic re-renders |
| I18nProvider wrapper required | Global initialization | react-i18next 11+ | Cleaner component tree |

**Deprecated/outdated:**
- Forcing app reload for language changes: No longer needed with react-i18next bindI18n configuration
- Custom language context providers: useTranslation() handles reactivity automatically

## Open Questions

1. **Should Language Be in Main Settings Tab or Profile?**
   - What we know: Requirements specify "language selector in profile settings"
   - What's unclear: Whether this should be visible on a main settings tab vs nested in profile
   - Recommendation: Follow requirements - accessible from profile settings screen, not top-level tab

2. **Flag Icons for Languages**
   - What we know: Many apps show country flags next to language names
   - What's unclear: Whether to use flag icons or just text
   - Recommendation: Keep text-only for simplicity, flag associations can be controversial (e.g., Spanish spoken in many countries)

3. **Confirmation Before Language Change**
   - What we know: Some apps show confirmation dialog before switching
   - What's unclear: Whether instant switching without confirmation is acceptable
   - Recommendation: Instant switching - the change is easily reversible, no confirmation needed

## Sources

### Primary (HIGH confidence)
- Existing codebase: `hooks/useLanguage.ts`, `lib/language.ts`, `app/_layout.tsx` - verified Phase 30 implementation
- Existing codebase: `components/profile/VisibilityToggle.tsx`, `components/wishlist/GroupPickerSheet.tsx` - UI patterns
- [react-i18next documentation](https://react.i18next.com/latest/i18nextprovider) - I18nextProvider usage
- [i18next API documentation](https://www.i18next.com/overview/api) - changeLanguage behavior

### Secondary (MEDIUM confidence)
- [react-i18next introduction](https://react.i18next.com/) - useTranslation hook patterns
- [React Native i18n 2025 guide](https://medium.com/@devanshtiwari365/how-to-build-a-multi-language-app-with-i18n-in-react-native-2025-edition-24318950dd8c) - current best practices

### Tertiary (LOW confidence)
- N/A - all findings verified against codebase and official docs

## Translation Keys Already Available

The following translation keys from Phase 30 (en.json/es.json) support this phase:

```json
{
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

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and configured
- Architecture: HIGH - Building on verified Phase 30 foundation
- UI Patterns: HIGH - Following existing app components (VisibilityToggle, GroupPickerSheet)
- Pitfalls: HIGH - Based on codebase analysis and react-i18next documentation

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable UI patterns, no moving targets)
