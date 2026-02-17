---
phase: quick
plan: 006
type: execute
wave: 1
depends_on: []
files_modified:
  - components/celebrations/CelebrationCard.tsx
  - supabase/migrations/20260218000001_add_overdue_status.sql
  - src/i18n/locales/en.json
  - src/i18n/locales/es.json
autonomous: true

must_haves:
  truths:
    - "Avatar displays profile picture when available, initials fallback otherwise"
    - "Past-date celebrations show 'Overdue' status badge (red)"
    - "Status is computed dynamically from event_date, not stored status field"
    - "Database schema allows 'overdue' status value for future manual archival"
  artifacts:
    - path: "components/celebrations/CelebrationCard.tsx"
      provides: "Dynamic status computation and avatar fallback fix"
    - path: "supabase/migrations/20260218000001_add_overdue_status.sql"
      provides: "Add 'overdue' to celebrations status CHECK constraint"
    - path: "src/i18n/locales/en.json"
      provides: "Translation key for 'Overdue' status"
    - path: "src/i18n/locales/es.json"
      provides: "Spanish translation for 'Overdue' status"
  key_links:
    - from: "CelebrationCard.tsx"
      to: "celebration.event_date"
      via: "Date comparison for dynamic status"
      pattern: "new Date.*event_date"
---

<objective>
Fix two issues in celebration cards: (1) Avatar not showing for some users - ensure fallback to initials works correctly, (2) Status tag should be dynamic based on date comparison - past dates should show "Overdue" instead of "Upcoming"

Purpose: Users see incorrect status for past-due celebrations and missing avatars reduces visual recognition
Output: Celebration cards with proper avatar display and dynamic status computation
</objective>

<execution_context>
@/home/zetaz/.claude/get-shit-done/workflows/execute-plan.md
@/home/zetaz/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/celebrations/CelebrationCard.tsx
@lib/celebrations.ts
@supabase/migrations/20260202000005_celebrations.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add database migration for overdue status</name>
  <files>supabase/migrations/20260218000001_add_overdue_status.sql</files>
  <action>
Create migration to add 'overdue' to the celebrations status CHECK constraint.

The current constraint is: `CHECK (status IN ('upcoming', 'active', 'completed'))`

New constraint should be: `CHECK (status IN ('upcoming', 'active', 'completed', 'overdue'))`

Use ALTER TABLE with DROP CONSTRAINT and ADD CONSTRAINT pattern:
1. DROP the existing status check constraint
2. ADD new check constraint with 'overdue' included

Note: This migration is forward-compatible - we're adding a new allowed value, not changing existing data. The UI will compute overdue dynamically for display, but admins may want to manually set status='overdue' in the future.
  </action>
  <verify>
Run `npx supabase db diff` to verify migration syntax is valid.
Check that no existing data would violate the new constraint (it won't - we're only adding a value).
  </verify>
  <done>
Migration file exists at supabase/migrations/20260218000001_add_overdue_status.sql with proper ALTER TABLE syntax to expand status enum.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add translation keys for Overdue status</name>
  <files>src/i18n/locales/en.json, src/i18n/locales/es.json</files>
  <action>
Add "overdue" key to the celebrations.status namespace in both locale files.

In en.json, add to celebrations.status:
```json
"overdue": "Overdue"
```

In es.json, add to celebrations.status:
```json
"overdue": "Vencido"
```

Place the new key after "active" and before any closing brace, maintaining alphabetical order is not required but consistency with existing structure is.
  </action>
  <verify>
Verify JSON syntax is valid: `npx prettier --check src/i18n/locales/*.json`
Grep for the new keys to confirm they exist.
  </verify>
  <done>
Both en.json and es.json contain celebrations.status.overdue with appropriate translations.
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix avatar display and add dynamic status computation</name>
  <files>components/celebrations/CelebrationCard.tsx</files>
  <action>
Two fixes in CelebrationCard component:

**Fix 1: Avatar display**
The current avatar logic is correct (line 61-69), but the issue is that `celebrantAvatar` may be an empty string `""` which is truthy in JavaScript. Update the condition to check for both null/undefined AND empty string:

Change from:
```tsx
{celebrantAvatar ? (
```

To:
```tsx
{celebrantAvatar && celebrantAvatar.length > 0 ? (
```

**Fix 2: Dynamic status computation**
Update `getStatusInfo` function to compute status dynamically based on event_date rather than the stored status field. The logic should be:

1. Parse `celebration.event_date` to a Date
2. Compare to today's date (at midnight for accurate day comparison)
3. If event_date is in the past (before today) AND status is not 'completed' -> show "Overdue" (red #ef4444)
4. If event_date is today or within 7 days -> show "Active" (green #22c55e)
5. If event_date is more than 7 days in future -> show "Upcoming" (blue #3b82f6)
6. If status is 'completed' -> show "Completed" (gray #6b7280)

Update the function signature to accept the full celebration object:

```tsx
const getDisplayStatus = (celebration: Celebration): { label: string; color: string } => {
  // If manually completed, show completed
  if (celebration.status === 'completed') {
    return { label: t('celebrations.status.completed'), color: '#6b7280' };
  }

  const eventDate = new Date(celebration.event_date);
  const today = new Date();
  // Set both to midnight for day comparison
  eventDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Past date - overdue
    return { label: t('celebrations.status.overdue'), color: '#ef4444' };
  } else if (diffDays <= 7) {
    // Within 7 days - active
    return { label: t('celebrations.status.active'), color: '#22c55e' };
  } else {
    // More than 7 days away - upcoming
    return { label: t('celebrations.status.upcoming'), color: '#3b82f6' };
  }
};

const statusInfo = getDisplayStatus(celebration);
```

Remove the old `getStatusInfo` function that only looked at the stored status field.
  </action>
  <verify>
Run TypeScript check: `npx tsc --noEmit`
Manual test: Navigate to celebrations tab and verify:
1. All cards show either initials or avatar image (no blank avatars)
2. Past-date celebrations show red "Overdue" badge
3. Celebrations within 7 days show green "Active" badge
4. Celebrations more than 7 days away show blue "Upcoming" badge
  </verify>
  <done>
CelebrationCard displays avatars correctly with proper empty-string handling, and status badges are computed dynamically from event_date with Overdue status for past dates.
  </done>
</task>

</tasks>

<verification>
1. `npx supabase db diff` shows valid migration
2. `npx tsc --noEmit` passes without errors
3. All celebration cards show avatar or initials (no blank)
4. Feb 3 birthday (past date) shows red "Overdue" badge
5. Upcoming dates show blue "Upcoming" or green "Active" based on proximity
</verification>

<success_criteria>
- Avatar displays for all users (image if available, initials fallback if not or empty string)
- Status is computed dynamically: past dates show "Overdue", within 7 days "Active", future "Upcoming"
- Database schema allows 'overdue' status value
- Translations exist for all status values in en/es
</success_criteria>

<output>
After completion, create `.planning/quick/006-fix-celebration-card-avatar-and-status/006-SUMMARY.md`
</output>
