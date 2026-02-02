# Phase 4: Smart Reminders - Research

**Researched:** 2026-02-02
**Domain:** Scheduled push notifications with timezone support, birthday reminder sequences
**Confidence:** HIGH

## Summary

This phase implements scheduled birthday reminder push notifications (4w/2w/1w/day-of sequence) and Gift Leader assignment notifications. The existing infrastructure from Phase 1 (Edge Function + webhook trigger on user_notifications INSERT) provides the push delivery mechanism. The main work is creating a scheduled pg_cron job that calculates which reminders to send based on celebration dates and user timezones, then inserts into user_notifications to trigger push delivery.

The architecture pattern is: **pg_cron job (runs frequently) -> calculates UTC send times from user timezones -> INSERTs to user_notifications -> webhook triggers push Edge Function**. This approach reuses existing infrastructure while adding timezone-aware scheduling logic entirely within PostgreSQL.

**Primary recommendation:** Create a single pg_cron job running every 15 minutes that queries celebrations + user timezones, calculates who should receive reminders at the current UTC time, batches same-day birthdays into grouped notifications, and inserts into user_notifications to trigger existing push delivery.

## Standard Stack

### Core (Already in Place)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-notifications | SDK 52 | Push notification handling | Already configured in Phase 1 |
| Supabase Edge Functions | Deno | Push delivery via Expo Push API | Already deployed as `/push` function |
| pg_cron | Latest | Scheduled job execution | Already enabled for auto-celebrations |
| pg_net | Latest | HTTP requests from Postgres | Standard for calling Edge Functions |

### New Requirements
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns-tz | 3.x | Timezone-aware date handling (if needed client-side) | For displaying "notification sent at 9am your time" |

### No New Libraries Needed

This phase is primarily database-side work. The client already has:
- Push notification registration
- Notification inbox with FlashList
- Navigation from notification tap (via `data` field)

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Database Additions

```
supabase/
  migrations/
    20260202000007_reminder_scheduling.sql    # Reminder job + timezone storage
  functions/
    push/index.ts                             # (existing) May need richContent support
```

### Pattern 1: Timezone-Aware Reminder Scheduling

**What:** Store user timezone, calculate UTC send time per-user, run pg_cron job frequently to catch all users' local 9am.

**When to use:** Per-user timezone respect (locked decision from CONTEXT.md).

**Implementation approach:**

1. **Add timezone column to users table:**
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
```

2. **Create reminder tracking table (prevents duplicate sends):**
```sql
CREATE TABLE IF NOT EXISTS public.reminder_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reminder_type TEXT CHECK (reminder_type IN ('4w', '2w', '1w', 'day_of', 'happy_birthday', 'gift_leader_initial', 'gift_leader_1w')) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(celebration_id, user_id, reminder_type)
);
```

3. **Main reminder function (runs every 15 minutes):**
```sql
CREATE OR REPLACE FUNCTION public.process_birthday_reminders()
RETURNS void AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_reminder RECORD;
BEGIN
  -- Find all users who should receive reminders NOW based on their local time
  -- Target: 9:00 AM local time
  FOR v_reminder IN
    SELECT
      c.id AS celebration_id,
      c.celebrant_id,
      c.event_date,
      c.gift_leader_id,
      c.group_id,
      c.target_amount,
      gm.user_id AS recipient_id,
      u.timezone AS recipient_timezone,
      celebrant.full_name AS celebrant_name,
      celebrant.avatar_url AS celebrant_avatar,
      g.name AS group_name,
      (c.event_date - CURRENT_DATE) AS days_until,
      COALESCE(SUM(cc.amount), 0) AS total_contributed
    FROM celebrations c
    JOIN group_members gm ON gm.group_id = c.group_id
    JOIN users u ON u.id = gm.user_id
    JOIN users celebrant ON celebrant.id = c.celebrant_id
    JOIN groups g ON g.id = c.group_id
    LEFT JOIN celebration_contributions cc ON cc.celebration_id = c.id
    WHERE c.status IN ('upcoming', 'active')
      AND c.event_date >= CURRENT_DATE
      AND c.event_date <= CURRENT_DATE + INTERVAL '28 days'
      -- Check if it's 9:00 AM in user's timezone (within 15 min window)
      AND EXTRACT(HOUR FROM (v_now AT TIME ZONE COALESCE(u.timezone, 'UTC'))) = 9
      AND EXTRACT(MINUTE FROM (v_now AT TIME ZONE COALESCE(u.timezone, 'UTC'))) < 15
    GROUP BY c.id, gm.user_id, u.timezone, celebrant.full_name,
             celebrant.avatar_url, g.name
  LOOP
    -- Determine reminder type and process
    -- (Logic for 4w/2w/1w/day_of, celebrant exclusion, Gift Leader nudges)
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Pattern 2: Notification Batching for Same-Day Birthdays

**What:** Group multiple birthdays into a single notification when they occur within the same period.

**When to use:** User decision from CONTEXT.md - "Same-day birthdays: Group into single notification"

**Example output:** "3 birthdays in 2 weeks: Sarah, Mike, and Alex"

**Implementation:**
```sql
-- Group celebrations by event_date and recipient
-- When count > 1, create single batched notification
SELECT
  array_agg(celebrant_name) AS celebrant_names,
  event_date,
  recipient_id,
  COUNT(*) AS birthday_count
FROM reminder_candidates
GROUP BY event_date, recipient_id
HAVING COUNT(*) > 1;
```

### Pattern 3: Gift Leader Notification Flow

**What:** Immediate notification when assigned, plus specific nudges at 1 week out.

**When to use:** Gift Leader assignment and coordination.

**Flow:**
1. **Initial assignment:** Triggered when `celebrations` INSERT occurs (not pg_cron)
2. **1-week nudge:** Triggered by pg_cron reminder job
3. **Reassignment:** Triggered by UPDATE on `celebrations.gift_leader_id`

### Pattern 4: Notification Data Structure for Deep Linking

**What:** Include navigation data in notification `data` field for tap-to-open.

**Structure:**
```json
{
  "type": "birthday_reminder",
  "screen": "celebration",
  "celebration_id": "uuid",
  "group_id": "uuid",
  "action": "open_chat"
}
```

### Anti-Patterns to Avoid

- **Individual cron jobs per user:** Creates thousands of jobs, exhausts pg_cron limits (max 32 concurrent)
- **Edge Function doing timezone calculations:** Slower, harder to debug, uses Deno cold start
- **Storing reminder state only in memory:** Restarts lose state, duplicates sent
- **Sending at server time (UTC):** Users get 3am notifications

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone conversion | Custom UTC offset math | PostgreSQL `AT TIME ZONE` | Handles DST, historical changes |
| Duplicate prevention | In-memory tracking | `reminder_sent` table with UNIQUE constraint | Survives restarts, race conditions |
| Notification batching | Client-side grouping | Database GROUP BY before INSERT | Single notification, correct unread count |
| Push delivery | Custom HTTP calls | Existing Edge Function + webhook | Already tested, handles Expo API |

**Key insight:** PostgreSQL's `AT TIME ZONE` handles all timezone edge cases including DST transitions. Never calculate UTC offsets manually.

## Common Pitfalls

### Pitfall 1: Timezone Drift During DST Transitions
**What goes wrong:** Notifications sent at wrong time when clocks change
**Why it happens:** Using fixed UTC offset instead of named timezone
**How to avoid:** Store IANA timezone names ('America/New_York'), use `AT TIME ZONE`
**Warning signs:** Users in different timezones getting same UTC time

### Pitfall 2: Duplicate Notifications on Job Retry
**What goes wrong:** Same reminder sent multiple times
**Why it happens:** pg_cron job fails mid-execution, retries, no idempotency
**How to avoid:** INSERT with ON CONFLICT DO NOTHING on reminder_sent table
**Warning signs:** Users reporting duplicate notifications

### Pitfall 3: Missing Reminders for New Group Members
**What goes wrong:** User joins group, misses 4w/2w reminders that already passed
**Why it happens:** Reminder state only tracks "sent", not "should have been sent"
**How to avoid:** On group join, catch up user with remaining reminders in sequence
**Warning signs:** New members confused about upcoming birthdays

### Pitfall 4: Celebrant Receiving Countdown Reminders
**What goes wrong:** Birthday person sees "Sarah's birthday in 2 weeks"
**Why it happens:** Forgot celebrant exclusion in recipient query
**How to avoid:** Always include `AND gm.user_id != c.celebrant_id` in reminder queries
**Warning signs:** Users seeing their own birthday reminders

### Pitfall 5: Rich Content Not Displaying on iOS
**What goes wrong:** Avatar images don't appear in push notifications
**Why it happens:** iOS requires Notification Service Extension for rich media
**How to avoid:** Use `richContent.image` in Expo push payload, ensure HTTPS URLs
**Warning signs:** Images work on Android but not iOS

### Pitfall 6: Per-Group Muting Not Checked
**What goes wrong:** Users still get notifications for muted groups
**Why it happens:** Mute preference table not joined in reminder query
**How to avoid:** Create user_group_preferences table, join and filter in query
**Warning signs:** Users complaining about muted group notifications

## Code Examples

### Send Birthday Reminder Notification

```sql
-- Source: Existing pattern from user_notifications + Edge Function
INSERT INTO public.user_notifications (user_id, title, body, data)
VALUES (
  v_recipient_id,
  '2 weeks until Sarah''s birthday!',
  '$45 of $60 goal collected. Tap to view wishlist.',
  jsonb_build_object(
    'type', 'birthday_reminder',
    'screen', 'celebration',
    'celebration_id', v_celebration_id,
    'group_id', v_group_id,
    'avatar_url', v_celebrant_avatar
  )
);
-- Webhook fires -> Edge Function sends push with this data
```

### Batched Same-Day Birthday Notification

```sql
-- When 3 birthdays are on same day
INSERT INTO public.user_notifications (user_id, title, body, data)
VALUES (
  v_recipient_id,
  '3 birthdays in 2 weeks!',
  'Sarah, Mike, and Alex all have birthdays on Feb 15. Tap to coordinate.',
  jsonb_build_object(
    'type', 'birthday_reminder_batch',
    'screen', 'calendar',
    'date', '2026-02-15',
    'celebration_ids', array_to_json(v_celebration_ids)
  )
);
```

### Gift Leader Assignment Notification (Trigger-Based)

```sql
-- Create trigger on celebrations INSERT/UPDATE
CREATE OR REPLACE FUNCTION notify_gift_leader_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when gift_leader_id is set or changed
  IF NEW.gift_leader_id IS NOT NULL AND
     (TG_OP = 'INSERT' OR OLD.gift_leader_id IS DISTINCT FROM NEW.gift_leader_id) THEN

    -- Notify new Gift Leader
    INSERT INTO public.user_notifications (user_id, title, body, data)
    SELECT
      NEW.gift_leader_id,
      'You''re the Gift Leader for ' || u.full_name || '!',
      g.name || ' - Birthday on ' || TO_CHAR(NEW.event_date, 'Mon DD') ||
      ' (' || (NEW.event_date - CURRENT_DATE) || ' days). Tap to view wishlist.',
      jsonb_build_object(
        'type', 'gift_leader_assigned',
        'screen', 'celebration',
        'celebration_id', NEW.id,
        'group_id', NEW.group_id,
        'celebrant_id', NEW.celebrant_id
      )
    FROM users u, groups g
    WHERE u.id = NEW.celebrant_id AND g.id = NEW.group_id;

    -- If reassignment, notify old leader they're relieved
    IF TG_OP = 'UPDATE' AND OLD.gift_leader_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, title, body, data)
      SELECT
        OLD.gift_leader_id,
        'Gift Leader role reassigned',
        'You''re no longer Gift Leader for ' || u.full_name || '''s birthday.',
        jsonb_build_object(
          'type', 'gift_leader_relieved',
          'screen', 'celebration',
          'celebration_id', NEW.id
        )
      FROM users u
      WHERE u.id = NEW.celebrant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_gift_leader_changed
  AFTER INSERT OR UPDATE OF gift_leader_id ON celebrations
  FOR EACH ROW EXECUTE FUNCTION notify_gift_leader_assigned();
```

### Expo Push with Rich Content (Avatar Image)

```typescript
// supabase/functions/push/index.ts - enhanced for avatar support
// Source: Expo Push Notifications documentation
const messages: ExpoPushMessage[] = tokens.map((token: DeviceToken) => ({
  to: token.expo_push_token,
  sound: 'default',
  title,
  body,
  data: data || {},
  channelId: 'default',
  // Rich content for avatar image (requires array format)
  ...(data?.avatar_url && {
    richContent: {
      image: data.avatar_url
    }
  })
}));

// IMPORTANT: Send as array for richContent to work
const response = await fetch(EXPO_PUSH_URL, {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(messages), // Already an array
});
```

### User Group Preferences (Muting)

```sql
-- Table for per-group notification preferences
CREATE TABLE IF NOT EXISTS public.user_group_preferences (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  mute_reminders BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- In reminder query, exclude muted groups
LEFT JOIN user_group_preferences ugp ON ugp.user_id = gm.user_id AND ugp.group_id = c.group_id
WHERE COALESCE(ugp.mute_reminders, FALSE) = FALSE
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate cron job per timezone | Single job with `AT TIME ZONE` | PostgreSQL 9.1+ | Scales to any number of users |
| Fixed UTC offset | IANA timezone names | Best practice | Handles DST correctly |
| Expo push without images | `richContent.image` field | Expo SDK 50+ | Avatar display in notifications |
| Individual notifications | Notification grouping | Android 7+ / iOS 12+ | Better UX for multiple events |

**Deprecated/outdated:**
- `expo-notifications` channel creation before permission request: Now standard practice for Android 13+
- Storing timezone as numeric offset: Use IANA names for DST handling

## Claude's Discretion Recommendations

Based on CONTEXT.md delegation:

### Time of Day for Notifications
**Recommendation:** 9:00 AM local time
- Morning gives users time to act during the day
- Not too early (5-7am feels intrusive)
- Before work for most users
- Industry standard for reminder apps

### Notification Grouping Threshold
**Recommendation:** Same calendar day = grouped
- Simple, predictable rule
- Matches user mental model ("birthdays on the same day")
- No edge cases with "within 24 hours"

### Gift Leader Nudge Wording
**Recommendation:**
- Initial (30 days): "You're the Gift Leader for {name}! {group} - Birthday on {date} ({days} days). Tap to view wishlist."
- 1-week nudge: "1 week until {name}'s birthday! Have you collected contributions? ${current} of ${goal} so far."

### Error Handling for Failed Push Delivery
**Recommendation:**
- Log errors but don't retry immediately (Expo handles retries)
- Track `DeviceNotRegistered` errors to clean stale tokens
- Don't create duplicate notifications on push failure (notification was created, just delivery failed)

## Open Questions

1. **Collecting user timezone**
   - What we know: Need IANA timezone string stored in users table
   - What's unclear: How/when to collect from user? Onboarding? Settings? Auto-detect?
   - Recommendation: Use `Intl.DateTimeFormat().resolvedOptions().timeZone` on app open, store automatically, let user override in settings

2. **Expo rich content iOS support**
   - What we know: iOS requires Notification Service Extension for images
   - What's unclear: Whether expo-notifications SDK 52 handles this automatically
   - Recommendation: Test on physical iOS device, may need NotificationServiceExtension target

## Sources

### Primary (HIGH confidence)
- Existing codebase: supabase/functions/push/index.ts, supabase/migrations/20260202000001_notifications.sql
- Existing codebase: supabase/migrations/20260202000006_auto_celebrations.sql (pg_cron pattern)
- [Supabase Cron Documentation](https://supabase.com/docs/guides/cron) - Scheduling patterns
- [Supabase Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) - pg_net integration

### Secondary (MEDIUM confidence)
- [Expo Push Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/) - richContent field
- [GitHub Expo Discussion #27980](https://github.com/expo/expo/discussions/27980) - richContent array format requirement
- [pg_cron GitHub](https://github.com/citusdata/pg_cron) - Timezone configuration
- [Android Notification Groups](https://developer.android.com/develop/ui/views/notifications/group) - Grouping pattern

### Tertiary (LOW confidence)
- Community patterns for per-user timezone scheduling (verified with PostgreSQL AT TIME ZONE docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing infrastructure, no new libraries
- Architecture: HIGH - Pattern follows existing pg_cron job from Phase 3
- Pitfalls: HIGH - Based on actual issues from similar implementations
- Rich content (images): MEDIUM - Expo docs confirm feature, iOS behavior needs testing

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable domain)
