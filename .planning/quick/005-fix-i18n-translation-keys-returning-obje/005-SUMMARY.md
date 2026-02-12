---
quick: 005
type: bugfix
subsystem: i18n
tags: [i18n, react-i18next, json, translations]

key-files:
  modified:
    - src/i18n/locales/en.json
    - src/i18n/locales/es.json
    - app/(app)/celebration/[id].tsx

completed: 2026-02-12
duration: 5min
---

# Quick Task 005: Fix i18n Translation Keys Returning Objects

**Fixed duplicate JSON keys causing [object Object] display on Celebration detail screen by removing conflicting simple string keys and updating TSX to use nested .title paths**

## Performance

- **Duration:** 5 min
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Removed duplicate `chat` and `contributions` simple string keys from en.json and es.json
- Added `chatTab` key for the tab label (since chat.title is "Group Chat", not "Chat")
- Updated celebration/[id].tsx to use correct translation key paths

## Task Commits

1. **Task 1: Remove duplicate JSON keys** - `8483f08` (fix)
2. **Task 2: Update TSX translation calls** - `2cde090` (fix)

## Files Modified

- `src/i18n/locales/en.json` - Removed duplicate `chat`/`contributions` strings, added `chatTab`
- `src/i18n/locales/es.json` - Removed duplicate `chat`/`contributions` strings, added `chatTab`
- `app/(app)/celebration/[id].tsx` - Updated 3 translation calls to use correct keys

## Root Cause

The `celebrations` namespace in JSON files had duplicate keys:
1. `"chat": "Chat"` (line 680) was overwritten by `"chat": { "title": "Group Chat", ... }` (line 714)
2. `"contributions": "Contributions"` (line 681) was overwritten by `"contributions": { "title": "Contributions", ... }` (line 695)

JSON parsing keeps the LAST occurrence, so the nested objects overwrote the simple strings. When `t('celebrations.chat')` was called, it received an object, which React rendered as `[object Object]`.

## Fix Applied

**JSON files:**
- Removed `"chat": "Chat"` - replaced with `"chatTab": "Chat"` for tab label
- Removed `"contributions": "Contributions"` - nested `.title` has same value

**TSX file:**
- `t('celebrations.chat')` -> `t('celebrations.chatTab')` (tab label)
- `t('celebrations.giftLeader')` -> `t('celebrations.giftLeader.title')` (section header)
- `t('celebrations.contributions')` -> `t('celebrations.contributions.title')` (section header)

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation passes (pre-existing errors unrelated to this fix)
- Each key now exists only once in JSON files
- Translation calls use correct nested paths

---
*Quick Task: 005*
*Completed: 2026-02-12*
