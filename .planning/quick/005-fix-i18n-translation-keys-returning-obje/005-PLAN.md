---
quick: 005
type: bugfix
title: "Fix i18n translation keys returning objects instead of strings"
files_modified:
  - src/i18n/locales/en.json
  - src/i18n/locales/es.json
  - app/(app)/celebration/[id].tsx
autonomous: true
---

<objective>
Fix i18n translation keys that return `[object Object]` instead of translated strings on the Celebration detail screen.

Purpose: The tab labels and section headers display `[object Object]` because duplicate keys in the JSON files cause objects to overwrite simple strings.

Output: Translation keys resolve to proper strings for Chat tab, Gift Leader section, and Contributions section.
</objective>

<context>
@.planning/STATE.md
@src/i18n/locales/en.json
@app/(app)/celebration/[id].tsx
</context>

<root_cause>
In `en.json` and `es.json`, the `celebrations` namespace has duplicate keys:

1. **`chat`**: Line 680 has `"chat": "Chat"` (string for tab label), but line 714 has `"chat": { "title": "Group Chat", ... }` (object). JSON parse keeps the LAST occurrence, so the object overwrites the string.

2. **`contributions`**: Line 681 has `"contributions": "Contributions"` (string for section header), but line 695 has `"contributions": { "title": "Contributions", ... }` (object). Object overwrites string.

3. **`giftLeader`**: Line 686 only has `"giftLeader": { "title": "Gift Leader", ... }` (object), but code calls `t('celebrations.giftLeader')` expecting a string.

When `t()` receives an object, React renders it as `[object Object]`.
</root_cause>

<tasks>

<task type="auto">
  <name>Task 1: Remove duplicate simple string keys from JSON files</name>
  <files>
    - src/i18n/locales/en.json
    - src/i18n/locales/es.json
  </files>
  <action>
Remove the duplicate simple string keys that are being overwritten by objects anyway.

In `en.json`:
- Remove line 680: `"chat": "Chat",`
- Remove line 681: `"contributions": "Contributions",`

In `es.json`:
- Remove line 680: `"chat": "Chat",`
- Remove line 681: `"contributions": "Contribuciones",`

These removals are safe because the objects already contain `.title` keys with the same values. The duplicate strings were causing confusion and served no purpose since they were being overwritten.
  </action>
  <verify>
Run `npx tsc --noEmit` to ensure no type errors. Grep for the removed keys to confirm they're gone:
```bash
grep -n '"chat":' src/i18n/locales/en.json | wc -l  # Should be 1 (the object)
grep -n '"contributions":' src/i18n/locales/en.json | wc -l  # Should be 1 (the object)
```
  </verify>
  <done>
No duplicate simple string keys exist in JSON files. Each key (`chat`, `contributions`, `giftLeader`) exists only once as an object.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update TSX to use nested .title keys</name>
  <files>app/(app)/celebration/[id].tsx</files>
  <action>
Update the translation calls to use the nested `.title` keys:

1. Line 628 (Chat tab label):
   Change: `{t('celebrations.chat')}`
   To: `{t('celebrations.chat.title')}`

2. Line 785 (Gift Leader section header):
   Change: `{t('celebrations.giftLeader')}`
   To: `{t('celebrations.giftLeader.title')}`

3. Line 838 (Contributions section header):
   Change: `{t('celebrations.contributions')}`
   To: `{t('celebrations.contributions.title')}`

Note: The nested objects already have appropriate `.title` values:
- `celebrations.chat.title` = "Group Chat" (en) / "Chat del grupo" (es)
- `celebrations.giftLeader.title` = "Gift Leader" (en) / "Lider de regalos" (es)
- `celebrations.contributions.title` = "Contributions" (en) / "Contribuciones" (es)
  </action>
  <verify>
Run app and navigate to a celebration detail screen:
1. Verify Chat tab shows "Group Chat" (not "[object Object]")
2. Verify Gift Leader section shows "Gift Leader" (not "[object Object]")
3. Verify Contributions section shows "Contributions" (not "[object Object]")
4. Switch to Spanish and verify translations work
  </verify>
  <done>
All three translation calls use nested `.title` keys and render proper strings instead of `[object Object]`.
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes
2. App compiles without errors
3. Celebration detail screen shows proper text for:
   - Chat tab label
   - Gift Leader section header
   - Contributions section header
4. Both English and Spanish translations work correctly
</verification>

<success_criteria>
- No `[object Object]` text appears on the Celebration detail screen
- All affected translation keys resolve to proper localized strings
- Both en.json and es.json have clean key structures (no duplicates)
</success_criteria>

<output>
After completion, create `.planning/quick/005-fix-i18n-translation-keys-returning-obje/005-SUMMARY.md`
</output>
