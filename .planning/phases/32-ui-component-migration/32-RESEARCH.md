# Phase 32: UI Component Migration - Research

**Researched:** 2026-02-11
**Domain:** React Native i18n migration, react-i18next component integration, date-fns localization
**Confidence:** HIGH

## Summary

Phase 32 migrates all UI strings across 93 files (30 app screens + 63 components) from hardcoded English to translated strings using the i18next infrastructure established in Phases 30-31. The migration scope includes buttons, labels, headings, placeholders, Alert.alert() messages, and localized date/time formatting.

The project already has a working i18n setup with ~480 translation keys in `src/i18n/locales/{en,es}.json`, useTranslation hook integration in 6 files (language.tsx, profile.tsx, etc.), and TypeScript type declarations for autocomplete. The migration is primarily mechanical: replace hardcoded strings with `t('namespace.key')` calls and localize date formatting using date-fns locale objects.

Date/time localization requires passing the Spanish locale (`es` from `date-fns/locale`) to formatting functions like `format()`, `formatDistanceToNow()`, and `formatRelative()`. The project uses date-fns v4.1.0 which exports locales via tree-shaking friendly imports.

**Primary recommendation:** Execute migration in systematic batches - start with high-traffic screens (wishlist, groups, calendar), then alerts/toasts, then remaining components. Use eslint-plugin-i18next with `markupOnly: true` to detect remaining hardcoded JSX strings. Create a `useLocalizedFormat` hook wrapping date-fns with automatic locale selection.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-i18next | 16.5.4 | useTranslation hook, automatic UI re-renders | Already installed, handles reactivity |
| i18next | 25.8.5 | Translation runtime, t() function | Already installed, core i18n |
| date-fns | 4.1.0 | Date formatting with locale support | Already installed, tree-shakeable locales |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint-plugin-i18next | 6.1.0 | Detect hardcoded JSX strings | Post-migration verification |
| @react-aria/i18n | (bundled) | Additional date/number formatting | Already in dependencies via gluestack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| date-fns locale | Intl.DateTimeFormat | date-fns already in use, consistent API |
| Manual string search | eslint-plugin-i18next | Automated detection more reliable |
| Per-file migration | Batch by feature | Feature batches reduce context switching |

**Installation:**
```bash
npm install --save-dev eslint-plugin-i18next
```

## Architecture Patterns

### Recommended Project Structure
```
src/
|-- i18n/
|   |-- locales/
|   |   |-- en.json        # ~480 keys organized by namespace
|   |   |-- es.json        # Spanish translations
|   |-- index.ts           # i18n initialization
|   |-- resources.ts       # Locale aggregation
|   |-- types/i18next.d.ts # TypeScript augmentation
hooks/
|-- useLanguage.ts         # Language state and switching
|-- useLocalizedFormat.ts  # NEW: Date formatting with locale
lib/
|-- language.ts            # Language persistence logic
utils/
|-- countdown.ts           # Needs t() integration for getCountdownText
|-- deviceCalendar.ts      # Calendar event text needs localization
```

### Pattern 1: Basic Component Translation
**What:** Replace hardcoded strings with t() function calls
**When to use:** All UI text in JSX
**Example:**
```typescript
// Before
<Text>My Wishlist</Text>
<Button title="Save" />

// After
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return (
    <>
      <Text>{t('wishlist.title')}</Text>
      <Button title={t('common.save')} />
    </>
  );
}
```

### Pattern 2: Alert.alert() Translation
**What:** Replace hardcoded Alert titles and messages with translations
**When to use:** All 31 files using Alert.alert()
**Example:**
```typescript
// Before
Alert.alert('Error', 'Failed to load profile');

// After
Alert.alert(
  t('alerts.titles.error'),
  t('alerts.messages.failedLoadProfile')
);

// With confirmation buttons
Alert.alert(
  t('alerts.titles.confirm'),
  t('alerts.messages.confirmRemoveFriend'),
  [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.confirm'), onPress: handleConfirm },
  ]
);
```

### Pattern 3: Date Localization with Hook
**What:** Create reusable hook for localized date formatting
**When to use:** All date/time displays (14 files use date-fns)
**Example:**
```typescript
// hooks/useLocalizedFormat.ts
import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow, formatRelative } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import type { SupportedLanguage } from '@/lib/language';

const localeMap: Record<SupportedLanguage, Locale> = {
  en: enUS,
  es: es,
};

export function useLocalizedFormat() {
  const { i18n } = useTranslation();
  const locale = localeMap[i18n.language as SupportedLanguage] || enUS;

  return {
    format: (date: Date, formatStr: string) =>
      format(date, formatStr, { locale }),
    formatDistanceToNow: (date: Date, options?: { addSuffix?: boolean }) =>
      formatDistanceToNow(date, { ...options, locale }),
    formatRelative: (date: Date, baseDate: Date) =>
      formatRelative(date, baseDate, { locale }),
    locale,
  };
}

// Usage in component
function ClaimTimestamp({ timestamp }: { timestamp: string }) {
  const { formatDistanceToNow, format } = useLocalizedFormat();
  const date = new Date(timestamp);
  const daysDiff = differenceInDays(new Date(), date);

  const displayText = daysDiff < 7
    ? formatDistanceToNow(date, { addSuffix: true }) // "hace 2 horas"
    : format(date, 'PPP');                           // "11 de febrero de 2026"
}
```

### Pattern 4: Countdown Text with Translations
**What:** Replace hardcoded countdown strings with translated versions
**When to use:** utils/countdown.ts, CountdownCard component
**Example:**
```typescript
// utils/countdown.ts - modify to accept t function
export function getCountdownText(
  daysUntil: number,
  t: (key: string, options?: object) => string
): string {
  if (daysUntil === 0) return t('calendar.countdown.today');
  if (daysUntil === 1) return t('calendar.countdown.tomorrow');
  if (daysUntil === -1) return t('common.errors.generic');

  if (daysUntil <= 7) {
    return t('calendar.countdown.daysLeft', { count: daysUntil });
  } else if (daysUntil <= 30) {
    const weeks = Math.floor(daysUntil / 7);
    return t('calendar.countdown.weeksLeft', { count: weeks });
  } else {
    const months = Math.floor(daysUntil / 30);
    return t('calendar.countdown.monthsLeft', { count: months });
  }
}

// CountdownCard.tsx - pass t to utility
const { t } = useTranslation();
const countdownText = getCountdownText(daysUntil, t);
```

### Pattern 5: Pluralization
**What:** Handle singular/plural forms using i18next count
**When to use:** Items counts, member counts, time durations
**Example:**
```typescript
// Translation file
{
  "groups": {
    "member": "member",
    "member_plural": "members"
  },
  "common": {
    "time": {
      "daysAgo": "{{count}} day ago",
      "daysAgo_plural": "{{count}} days ago"
    }
  }
}

// Component usage
t('groups.member', { count: memberCount }) // "1 member" or "5 members"
t('common.time.daysAgo', { count: 3 })     // "3 days ago"
```

### Pattern 6: Interpolation with Variables
**What:** Dynamic values in translated strings
**When to use:** Names, counts, dates, amounts
**Example:**
```typescript
// Translation file
{
  "wishlist": {
    "claim": {
      "claimedBy": "Claimed by {{name}}"
    }
  },
  "profile": {
    "personalDetails": {
      "completeness": "{{percent}}% complete"
    }
  }
}

// Component usage
t('wishlist.claim.claimedBy', { name: claimer.display_name })
t('profile.personalDetails.completeness', { percent: 75 })
```

### Anti-Patterns to Avoid
- **String concatenation with t():** Use interpolation instead (`t('key', { name })` not `t('prefix') + name`)
- **Inline string literals in JSX:** All user-visible text must use t()
- **Forgetting namespace prefix:** Use full path `t('groups.title')` not `t('title')`
- **Hardcoding date formats:** Always pass locale to date-fns functions
- **Creating new translation keys without adding to both files:** Keep en.json and es.json in sync
- **Using t() outside React components without initialization check:** Ensure i18n is ready first

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| String detection | Grep for quotes manually | eslint-plugin-i18next | Automated, catches edge cases |
| Date locale switching | Manual locale if/else | useLocalizedFormat hook | Centralized, reactive to language changes |
| Plural forms | Custom if/else logic | i18next count interpolation | Handles complex plural rules automatically |
| Translation key typing | Manual key strings | TypeScript module augmentation | Autocomplete, compile-time validation |
| Alert.alert wrappers | Custom alert function | Direct t() calls in Alert.alert | Keep API familiar, less abstraction |

**Key insight:** The i18n infrastructure is complete. Migration is mechanical - focus on thoroughness and verification, not building new abstractions.

## Common Pitfalls

### Pitfall 1: Missing Translation Keys
**What goes wrong:** Raw key displayed like "wishlist.title" instead of "My Wishlist"
**Why it happens:** Key typo, key not added to JSON files, namespace mismatch
**How to avoid:** Use TypeScript autocomplete, run `npx tsc --noEmit` to catch type errors
**Warning signs:** Raw dotted strings appearing in UI during testing

### Pitfall 2: Date Format Not Changing on Language Switch
**What goes wrong:** Dates stay in English format after switching to Spanish
**Why it happens:** Locale not passed to date-fns functions, using cached format
**How to avoid:** Use useLocalizedFormat hook which reads i18n.language reactively
**Warning signs:** "February 11, 2026" instead of "11 de febrero de 2026" in Spanish mode

### Pitfall 3: Alert Buttons Not Translated
**What goes wrong:** Alert shows translated message but "OK", "Cancel" buttons remain English
**Why it happens:** Forgetting to translate button labels in Alert.alert() third parameter
**How to avoid:** Always translate all three parts: title, message, button labels
**Warning signs:** Mixed language alerts during testing

### Pitfall 4: Accessibility Labels Hardcoded
**What goes wrong:** Screen readers announce English text regardless of language
**Why it happens:** accessibilityLabel props forgotten during migration
**How to avoid:** Search for `accessibilityLabel=` and `accessibilityHint=` patterns
**Warning signs:** VoiceOver/TalkBack reads English in Spanish mode

### Pitfall 5: Inconsistent Namespace Usage
**What goes wrong:** Duplicate keys, confusing organization, merge conflicts
**Why it happens:** Not following established namespace structure
**How to avoid:** Reference existing namespace organization (common, auth, groups, wishlist, etc.)
**Warning signs:** Keys like `t('loading')` instead of `t('common.loading')`

### Pitfall 6: Empty State Messages Not Translated
**What goes wrong:** "No groups yet" stays English
**Why it happens:** Empty states often in conditional branches, easy to miss
**How to avoid:** Search for patterns like "No ", "Empty", "yet", "Start", "Add your first"
**Warning signs:** Placeholders and empty states in English after language switch

### Pitfall 7: Inline Conditional Text Not Translated
**What goes wrong:** `{count === 1 ? 'item' : 'items'}` stays English
**Why it happens:** Conditional logic buried in JSX
**How to avoid:** Use i18next pluralization, search for ternary operators with strings
**Warning signs:** Singular/plural words staying English

## Code Examples

Verified patterns from official sources:

### useLocalizedFormat Hook
```typescript
// hooks/useLocalizedFormat.ts
// Source: date-fns documentation + react-i18next patterns
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format as dateFnsFormat, formatDistanceToNow as dateFnsFormatDistance } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import type { SupportedLanguage } from '@/lib/language';

const localeMap: Record<SupportedLanguage, Locale> = {
  en: enUS,
  es: es,
};

export function useLocalizedFormat() {
  const { i18n } = useTranslation();

  const locale = useMemo(() =>
    localeMap[i18n.language as SupportedLanguage] || enUS,
    [i18n.language]
  );

  const format = useCallback(
    (date: Date | number, formatStr: string) =>
      dateFnsFormat(date, formatStr, { locale }),
    [locale]
  );

  const formatDistanceToNow = useCallback(
    (date: Date | number, options?: { addSuffix?: boolean }) =>
      dateFnsFormatDistance(date, { ...options, locale }),
    [locale]
  );

  return { format, formatDistanceToNow, locale };
}
```

### Screen Migration Example
```typescript
// app/(app)/(tabs)/groups.tsx - BEFORE
<Text>My Groups</Text>
<Text>{groups.length} {groups.length === 1 ? 'group' : 'groups'}</Text>
<Text>Create Group</Text>
<Text>Join Group</Text>
<Text>No Groups Yet</Text>
<Text>Create a new group or join one{'\n'}with an invite code</Text>

// app/(app)/(tabs)/groups.tsx - AFTER
import { useTranslation } from 'react-i18next';

export default function GroupsScreen() {
  const { t } = useTranslation();
  // ... existing code ...

  return (
    <>
      <Text>{t('groups.myGroups')}</Text>
      <Text>
        {groups.length} {t('groups.group', { count: groups.length })}
      </Text>
      <Text>{t('groups.createGroup')}</Text>
      <Text>{t('groups.joinGroup')}</Text>
      <Text>{t('groups.empty.noGroups')}</Text>
      <Text>{t('groups.empty.noGroupsDescription')}</Text>
    </>
  );
}
```

### Alert Migration Example
```typescript
// BEFORE
Alert.alert('Success!', 'Gift added to your wishlist!');
Alert.alert('Error', 'Failed to delete item');
Alert.alert(
  'Remove Friend',
  'Are you sure you want to remove this friend?',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: handleRemove },
  ]
);

// AFTER
Alert.alert(t('alerts.titles.added'), t('alerts.messages.itemAddedSuccess'));
Alert.alert(t('alerts.titles.error'), t('alerts.messages.failedDeleteItem'));
Alert.alert(
  t('friends.removeFriend'),
  t('alerts.messages.confirmRemoveFriend'),
  [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.remove'), style: 'destructive', onPress: handleRemove },
  ]
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global locale setting | Per-function locale passing | date-fns v2+ | More explicit, tree-shakeable |
| moment.js for localization | date-fns + locale imports | 2020+ | Smaller bundle, better tree-shaking |
| Manual plural logic | i18next count interpolation | i18next standard | Handles complex plural rules (Russian, Arabic) |
| Separate namespace files | Single nested JSON | Project decision | Simpler imports, less file management |

**Deprecated/outdated:**
- moment.js: No longer recommended, date-fns preferred for bundle size
- Global locale mutations: Pass locale explicitly to each function
- Using _1, _2 plural suffixes: Use _one, _other, _few, etc. per ICU/CLDR

## Migration Scope Analysis

### Files Requiring Migration

**App Screens (30 files):**
- `app/(app)/(tabs)/index.tsx` - Wishlist main screen, ~50 hardcoded strings
- `app/(app)/(tabs)/groups.tsx` - Groups screen, ~20 strings
- `app/(app)/(tabs)/calendar.tsx` - Calendar screen with date formatting
- `app/(app)/(tabs)/friends.tsx` - Friends list, ~15 strings
- `app/(app)/(tabs)/notifications.tsx` - Notifications, date formatting
- `app/(app)/(tabs)/celebrations.tsx` - Celebrations, ~20 strings
- `app/(app)/settings/profile.tsx` - Already partially migrated
- `app/(app)/settings/personal-details.tsx` - Form labels, ~30 strings
- `app/(app)/settings/public-dates.tsx` - Date management, ~15 strings
- `app/auth/login.tsx` - Auth form, ~15 strings
- `app/auth/signup.tsx` - Auth form, ~15 strings
- `app/(onboarding)/index.tsx` - Onboarding flow, ~20 strings
- (+ remaining 18 screens with varying complexity)

**Components (63 files):**
- `components/wishlist/*` (17 files) - Cards, modals, badges
- `components/groups/*` (12 files) - Group cards, modals, sections
- `components/profile/*` (11 files) - Profile sections, toggles
- `components/calendar/*` (3 files) - Date formatting critical
- `components/friends/*` (2 files) - Friend cards
- `components/notes/*` (3 files) - Note cards
- `components/chat/*` (3 files) - Chat messages
- (+ remaining components)

**Utilities (2 files):**
- `utils/countdown.ts` - getCountdownText needs t() parameter
- `utils/deviceCalendar.ts` - Calendar event strings (lower priority)

### Files with Alert.alert() (31 files):
All require alert message translation - see Grep results above.

### Files with Date Formatting (14 files):
All need locale parameter added to date-fns functions.

## Verification Strategy

### ESLint Plugin Configuration
```javascript
// .eslintrc.js or eslint.config.js
module.exports = {
  plugins: ['i18next'],
  rules: {
    'i18next/no-literal-string': [
      'warn',
      {
        markupOnly: true,
        ignoreAttribute: [
          'testID',
          'name',
          'style',
          'source',
          'key',
          'type',
          'accessibilityRole',
        ],
        ignoreComponent: ['Trans'],
      },
    ],
  },
};
```

### Post-Migration Verification Commands
```bash
# Run eslint to find remaining hardcoded strings
npx eslint "app/**/*.tsx" "components/**/*.tsx" --rule 'i18next/no-literal-string: warn'

# TypeScript check for translation key errors
npx tsc --noEmit

# Manual test: Switch to Spanish and verify critical screens
# - Wishlist main screen
# - Groups screen
# - Calendar with dates
# - All Alert.alert dialogs
```

## Open Questions

1. **Should countdown.ts accept t function or use i18next directly?**
   - What we know: Currently returns hardcoded English strings
   - What's unclear: Whether to pass t as parameter or import i18n directly
   - Recommendation: Pass t as parameter for testability and explicit dependency

2. **How to handle device calendar event strings?**
   - What we know: deviceCalendar.ts creates calendar events with titles like "{name}'s Birthday"
   - What's unclear: Whether device calendars respect app language or system language
   - Recommendation: Translate event titles, but note device OS may override display

3. **Should accessibilityLabel always match visible text?**
   - What we know: Best practice is accessibility labels should provide context
   - What's unclear: Whether to add additional context beyond visible text translation
   - Recommendation: Start by translating visible text, enhance accessibility labels in separate pass

## Sources

### Primary (HIGH confidence)
- [react-i18next useTranslation hook](https://react.i18next.com/latest/usetranslation-hook) - Official hook documentation
- [i18next pluralization](https://www.i18next.com/translation-function/plurals) - Plural rules and count parameter
- [date-fns i18n documentation](https://github.com/date-fns/date-fns/blob/main/docs/i18n.md) - Locale usage patterns
- [eslint-plugin-i18next](https://github.com/edvardchen/eslint-plugin-i18next) - Hardcoded string detection
- Existing codebase: `src/i18n/locales/*.json`, `hooks/useLanguage.ts`, `app/(app)/settings/language.tsx`

### Secondary (MEDIUM confidence)
- [date-fns locale usage](https://deepwiki.com/date-fns/date-fns/4.1-using-locales) - Tree-shaking friendly imports
- [Complete React i18n guide](https://phrase.com/blog/posts/localizing-react-apps-with-i18next/) - Best practices 2024
- [i18next pluralization guide](https://medium.com/@meleklassoued/implementing-pluralization-with-i18next-in-react-a-complete-guide-79fdf2418b38) - Implementation patterns

### Tertiary (LOW confidence)
- N/A - All critical findings verified against official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified
- Architecture patterns: HIGH - Following established patterns from Phase 31
- Migration scope: HIGH - Based on actual file count and grep analysis
- Pitfalls: HIGH - Based on codebase analysis and official documentation
- Date localization: HIGH - date-fns locale API is stable and well-documented

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable patterns, established infrastructure)
