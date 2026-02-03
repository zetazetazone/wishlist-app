---
status: diagnosed
phase: 04-smart-reminders
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md]
started: 2026-02-02T18:00:00Z
updated: 2026-02-02T18:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Automatic Timezone Detection
expected: When opening the app after signing in, your timezone is automatically detected and saved. You can verify this in Supabase users table (timezone column should show your local timezone).
result: issue
reported: "in the supabase users table i can only find created_at and updated_at fields but not the timezone column"
severity: blocker

### 2. Birthday Reminder Notifications Arrive
expected: If you have upcoming birthdays in your groups, you should receive push notifications at 9:00 AM your local time. Reminders come at 4 weeks, 2 weeks, 1 week, and day-of the birthday.
result: skipped
reason: Requires pg_cron job to run at scheduled time - not practical to test manually

### 3. Celebrant Excluded from Own Birthday Reminders
expected: The birthday person does NOT receive countdown reminders for their own birthday. They only get a "Happy Birthday!" notification on the day itself.
result: skipped
reason: Requires scheduled reminder system - not practical to test manually

### 4. Gift Leader Assignment Notification
expected: When someone is assigned as Gift Leader for a celebration (manually or automatically), they immediately receive a push notification saying "You're the Gift Leader for [Name]'s birthday!"
result: skipped

### 5. Gift Leader Reassignment Notifications
expected: When Gift Leader changes, both old and new Gift Leaders receive notifications. Old gets "Gift Leader role reassigned for [Name]'s birthday", new gets the assignment notification.
result: skipped

### 6. Gift Leader One-Week Nudge
expected: Gift Leader receives a special reminder 1 week before the birthday showing contribution progress (e.g., "$50 of $100 collected from 3 people").
result: skipped
reason: Requires scheduled reminder system

### 7. Group Muting Stops Reminders
expected: If you mute a group (via group settings/preferences), you stop receiving birthday reminders for that group while remaining a member.
result: skipped
reason: Requires notification delivery testing

### 8. Same-Day Birthday Batching
expected: If multiple people in the same group have birthdays on the same day, you receive ONE notification mentioning all of them (e.g., "Alice and Bob's birthdays in 2 weeks!" or "3 birthdays in Family in 2 weeks!").
result: skipped
reason: Requires scheduled reminder system

### 9. New Member Catch-Up Reminder
expected: When joining a group with upcoming birthdays, you receive a catch-up notification showing what you missed (e.g., "Upcoming birthday for Alice in 5 days - You missed earlier reminders").
result: skipped
reason: Requires notification delivery testing

### 10. Rich Push with Avatar Image
expected: Push notifications for celebrations include the celebrant's profile picture (if they have one) as a rich image in the notification.
result: skipped
reason: Requires notification delivery testing

## Summary

total: 10
passed: 0
issues: 1
pending: 0
skipped: 9

## Gaps

- truth: "Timezone is automatically detected and saved to users.timezone column"
  status: failed
  reason: "User reported: I see UTC and it should be Europe/Madrid - timezone column exists but shows default value"
  severity: blocker
  test: 1
  root_cause: "usePushNotifications hook is defined but never used in any component - saveUserTimezone() is never called"
  artifacts:
    - path: "hooks/usePushNotifications.ts"
      issue: "Hook defined with saveUserTimezone() but not imported/used anywhere"
  missing:
    - "Import and call usePushNotifications() in app root (e.g., _layout.tsx or App.tsx)"
  debug_session: ""
