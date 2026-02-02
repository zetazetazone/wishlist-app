---
phase: 04-smart-reminders
verified: 2026-02-02T18:30:00Z
status: gaps_found
score: 18/21 must-haves verified
gaps:
  - truth: "Same-day birthdays within a group are grouped into single notification"
    status: failed
    reason: "Batching logic is documented but not implemented - sends individual notifications"
    artifacts:
      - path: "supabase/migrations/20260202000007_reminder_scheduling.sql"
        issue: "Lines 338-351: Comment states 'For simplicity in this implementation, batching is handled at the notification level by sending one notification per celebration' - batching is NOT implemented"
    missing:
      - "Array aggregation to group same-day celebrations per group"
      - "Conditional logic to send batched notification vs individual"
      - "Batched notification title/body formatting with multiple names"
  
  - truth: "New group members receive catch-up reminders for missed reminder types"
    status: partial
    reason: "Catch-up logic exists but only sends 'current' reminder, not explicit catch-up sequence"
    artifacts:
      - path: "supabase/migrations/20260202000007_reminder_scheduling.sql"
        issue: "Lines 218-234: Logic detects late joiners but comment states 'This handles catch-up naturally - they get the current appropriate reminder' - doesn't send missed reminder types"
    missing:
      - "Explicit detection of which reminder types were missed"
      - "Logic to send catch-up for each missed type (not just current)"
      - "Differentiation between normal reminder and catch-up reminder"
  
  - truth: "Gift Leader receives notification immediately when celebration is created (30 days out)"
    status: verified_with_caveat
    reason: "Trigger fires on INSERT, but depends on auto-celebration creation setting gift_leader_id"
    artifacts:
      - path: "supabase/migrations/20260202000008_gift_leader_notifications.sql"
        issue: "Trigger works IF gift_leader_id is set on INSERT. Auto-celebration migration needs verification."
    missing:
      - "Verification that auto-celebration creates celebrations WITH gift_leader_id set"
      - "Integration test with create_upcoming_celebrations function"
---

# Phase 04: Smart Reminders Verification Report

**Phase Goal:** Users receive timely birthday reminders and Gift Leaders are notified when assigned

**Verified:** 2026-02-02T18:30:00Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User receives birthday reminder at 9:00 AM their local time | ✅ VERIFIED | Lines 130-131: `EXTRACT(HOUR FROM (NOW() AT TIME ZONE u.timezone)) = 9 AND EXTRACT(MINUTE FROM ...) < 15` |
| 2 | Reminder sequence fires at 4w, 2w, 1w, and day-of | ✅ VERIFIED | Lines 165-175: Conditional logic maps days_until to reminder_type (28='4w', 14='2w', 7='1w', 0='day_of') |
| 3 | Celebrant does NOT receive countdown reminders (only day-of Happy Birthday) | ✅ VERIFIED | Lines 179-216: Celebrant exclusion logic skips 4w/2w/1w, sends 'happy_birthday' on day-of |
| 4 | Same-day birthdays within a group are grouped into single notification | ❌ FAILED | Lines 338-351: Comment explicitly states batching NOT implemented - "sending one notification per celebration" |
| 5 | User can mute reminders per group | ✅ VERIFIED | Lines 56-91: user_group_preferences table with mute_reminders column; Line 154-159: Filter logic in function |
| 6 | Duplicate reminders are prevented even on job retry | ✅ VERIFIED | Line 34: UNIQUE(celebration_id, user_id, reminder_type); Lines 210, 292, 332: INSERT ... ON CONFLICT DO NOTHING |
| 7 | New group members receive catch-up reminders for missed reminder types | ⚠️ PARTIAL | Lines 218-234: Detects late joiners but only sends current reminder, not explicit catch-up for missed types |
| 8 | Gift Leader receives 1-week collection nudge with progress info | ✅ VERIFIED | Lines 256-297: Special 'gift_leader_1w' reminder with contribution progress formatting |
| 9 | Gift Leader receives notification immediately when assigned to celebration | ✅ VERIFIED | Lines 14-76 (migration 08): notify_gift_leader_assigned function with INSERT trigger |
| 10 | Gift Leader receives notification immediately when celebration is created (30 days out) | ⚠️ VERIFIED_WITH_CAVEAT | Trigger fires on INSERT (line 111), but depends on auto-celebration setting gift_leader_id |
| 11 | Old Gift Leader receives notification when reassigned away | ✅ VERIFIED | Lines 81-97 (migration 08): UPDATE logic notifies OLD.gift_leader_id when changed |
| 12 | New Gift Leader receives notification when reassigned to | ✅ VERIFIED | Lines 59-76 (migration 08): NEW.gift_leader_id receives assignment notification |
| 13 | Push notifications can display celebrant avatar image | ✅ VERIFIED | Lines 119-123 (push/index.ts): richContent.image field conditionally added from data.avatar_url |

**Score:** 18/21 truths verified (11 full ✅, 2 partial ⚠️, 1 failed ❌)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260202000007_reminder_scheduling.sql` | Contains process_birthday_reminders | ✅ VERIFIED | Lines 97-361: Function exists with SECURITY DEFINER, handles all reminder types |
| `hooks/usePushNotifications.ts` | Contains Intl.DateTimeFormat | ✅ VERIFIED | Line 18: `Intl.DateTimeFormat().resolvedOptions().timeZone` for timezone detection |
| `supabase/migrations/20260202000008_gift_leader_notifications.sql` | Contains notify_gift_leader_assigned | ✅ VERIFIED | Lines 14-101: Function exists with INSERT/UPDATE trigger logic |
| `supabase/functions/push/index.ts` | Contains richContent | ✅ VERIFIED | Lines 35-37, 119-123: richContent interface and conditional addition |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| pg_cron job | process_birthday_reminders function | cron.schedule every 15 minutes | ✅ WIRED | Lines 398-402: `cron.schedule('process-birthday-reminders', '*/15 * * * *', ...)` |
| process_birthday_reminders | user_notifications | INSERT statement | ✅ WIRED | Lines 192, 266, 301: Multiple INSERT INTO public.user_notifications |
| usePushNotifications | users.timezone | Supabase update | ✅ WIRED | Lines 21-24: `.from('users').update({ timezone }).eq('id', userId)` |
| celebrations INSERT/UPDATE trigger | notify_gift_leader_assigned | AFTER INSERT OR UPDATE OF gift_leader_id | ✅ WIRED | Line 111: CREATE TRIGGER on_gift_leader_changed |
| notify_gift_leader_assigned | user_notifications | INSERT statement | ✅ WIRED | Lines 59, 82: INSERT INTO public.user_notifications |
| push Edge Function | Expo Push API | richContent.image field | ✅ WIRED | Lines 119-123: Conditionally spreads richContent object with image |

### Requirements Coverage

All Phase 04 requirements from ROADMAP.md are addressed:
- ✅ Birthday reminder scheduling system
- ✅ Timezone-aware delivery at 9:00 AM local time
- ⚠️ Same-day batching (not implemented - gap)
- ✅ Celebrant exclusion from countdown reminders
- ✅ Group muting preferences
- ✅ Gift Leader assignment notifications
- ✅ Gift Leader 1-week nudge
- ✅ Rich push content with avatar images

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| supabase/migrations/20260202000007_reminder_scheduling.sql | 338-351 | TODO comment - batching not implemented | ⚠️ Warning | Users receive multiple notifications for same-day birthdays in same group |
| supabase/migrations/20260202000007_reminder_scheduling.sql | 218-234 | Catch-up logic incomplete | ⚠️ Warning | New members don't receive explicit catch-up reminders for missed types |
| supabase/migrations/20260202000007_reminder_scheduling.sql | 115-120 | Unused batch variables | ℹ️ Info | Variables v_batch_key, v_batched_celebrations, etc. declared but never used |

### Human Verification Required

#### 1. Timezone Detection and Delivery

**Test:** Create celebration 7 days out, set device timezone to known value, wait for 9:00 AM local time
**Expected:** Receive push notification at 9:00 AM sharp (within 15-min window)
**Why human:** Requires waiting for cron job execution and testing across timezones

#### 2. Celebrant Exclusion

**Test:** As celebrant, create celebration for yourself in 4 weeks
**Expected:** Do NOT receive 4w/2w/1w reminders; DO receive "Happy Birthday" on day-of
**Why human:** Requires testing user experience as celebrant over time

#### 3. Gift Leader Immediate Notification

**Test:** Create new celebration with gift_leader_id set, or update existing celebration's gift_leader_id
**Expected:** 
- New leader receives "You're the Gift Leader" notification immediately
- Old leader (on reassignment) receives "role reassigned" notification
**Why human:** Requires testing trigger timing and notification delivery

#### 4. Gift Leader 1-Week Nudge

**Test:** Create celebration 7 days out with yourself as Gift Leader, add some contributions, wait for 9:00 AM
**Expected:** Receive special nudge notification with contribution progress ($X of $Y collected)
**Why human:** Requires testing contribution calculation and formatting

#### 5. Rich Push Content with Avatar

**Test:** Create notification with avatar_url in data payload, check push notification on physical device
**Expected:** Avatar image displays in push notification (Android immediately, iOS may vary)
**Why human:** Rich content rendering varies by platform and requires physical device testing

#### 6. Group Muting

**Test:** Insert mute_reminders=true in user_group_preferences, verify no reminders for that group
**Expected:** No birthday reminder notifications for muted group
**Why human:** Requires testing database state and notification filtering

#### 7. Duplicate Prevention on Retry

**Test:** Manually run process_birthday_reminders() multiple times in sequence
**Expected:** Same reminder sent only once (not duplicated)
**Why human:** Requires manual function execution and database inspection

#### 8. Auto-Celebration Integration

**Test:** Verify create_upcoming_celebrations() function sets gift_leader_id when creating celebrations
**Expected:** Gift Leader receives assignment notification when auto-celebration runs
**Why human:** Requires checking auto-celebration migration and pg_cron integration

### Gaps Summary

**Gap 1: Same-day batching not implemented**
The plan explicitly required batching same-day birthdays within a group into a single notification. The implementation declares batch-related variables (v_batch_key, v_batched_celebrations, etc.) but never uses them. Lines 338-351 contain a comment acknowledging that batching is NOT implemented: "For simplicity in this implementation, batching is handled at the notification level by sending one notification per celebration."

**Impact:** Users receive multiple individual notifications instead of one consolidated notification when multiple group members have birthdays on the same day.

**Fix required:**
- Implement array aggregation to collect same-day celebrations per group
- Add conditional logic to detect batching opportunity
- Format batched notification with multiple names: "{count} birthdays in {group_name} in {time}!"

**Gap 2: Catch-up logic incomplete**
The plan required "New group members receive catch-up reminders for missed reminder types." The implementation detects late joiners (lines 218-234) but the comment states "This handles catch-up naturally - they get the current appropriate reminder" - meaning it only sends the CURRENT reminder, not explicit catch-up for missed types.

**Impact:** If a user joins a group 10 days before a birthday, they should receive catch-up for missed '4w' and '2w' reminders. Currently they only get the '1w' reminder when they hit the 7-day mark.

**Fix required:**
- Detect which reminder types were missed based on join date
- Send catch-up reminders for each missed type (or consolidate into single catch-up)
- Differentiate catch-up reminders from normal reminders in notification content

**Gap 3: Auto-celebration integration unverified**
The Gift Leader assignment trigger (migration 08) depends on the auto-celebration creation (migration 06) setting gift_leader_id on INSERT. This integration needs verification.

**Impact:** If auto-celebration doesn't set gift_leader_id, Gift Leaders won't receive immediate assignment notifications when celebrations are auto-created.

**Fix required:**
- Verify migration 06 (create_upcoming_celebrations) sets gift_leader_id
- Add integration test confirming trigger fires when auto-celebration runs
- Document dependency between migrations 06 and 08

---

_Verified: 2026-02-02T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
