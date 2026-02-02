# Webhook Setup Guide

This guide explains how to configure the Supabase database webhook for push notification delivery.

## Overview

Supabase webhooks cannot be created via SQL migrations - they must be configured through the Dashboard or Supabase CLI. This webhook is essential for triggering the Edge Function that delivers push notifications to users' devices.

**How it works:**
1. New notification is inserted into `user_notifications` table
2. Database webhook fires on INSERT
3. Webhook calls the `push` Edge Function
4. Edge Function fetches user's device tokens and sends push via Expo Push Service

**Edge Function location:** `supabase/functions/push/index.ts`

## Prerequisites

Before configuring the webhook, ensure:

1. **Edge Function deployed:**
   ```bash
   npx supabase functions deploy push
   ```

2. **Project reference ID** - Found in your Supabase Dashboard URL:
   ```
   https://app.supabase.com/project/<project-ref>
   ```

3. **Anon key** - Found in Supabase Dashboard:
   - Navigate to: **Settings** -> **API**
   - Copy the `anon` `public` key

## Dashboard Configuration (Recommended)

Follow these steps to configure the webhook in the Supabase Dashboard:

### Step 1: Navigate to Webhooks

1. Open your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to: **Database** -> **Webhooks**
4. Click **"Create a new hook"** button

### Step 2: Configure Basic Settings

| Field | Value |
|-------|-------|
| Name | `push-notifications` |
| Table | `user_notifications` |
| Events | Check only **INSERT** |

### Step 3: Configure HTTP Request

| Field | Value |
|-------|-------|
| Type | HTTP Request |
| Method | POST |
| URL | `https://<project-ref>.supabase.co/functions/v1/push` |

Replace `<project-ref>` with your actual project reference ID.

### Step 4: Configure Headers

Add these HTTP headers:

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <anon-key>` |
| `Content-Type` | `application/json` |

Replace `<anon-key>` with your actual anon key.

### Step 5: Save

Click **"Create webhook"** to save the configuration.

## Verification

After configuring the webhook, test that it works correctly.

### Test with SQL Query

Run this in the Supabase SQL Editor:

```sql
-- Insert test notification (run in SQL Editor)
INSERT INTO public.user_notifications (user_id, title, body, data)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Test Notification',
  'Testing webhook configuration',
  '{}'::jsonb
);
```

### Check Edge Function Logs

1. Navigate to: **Edge Functions** -> **push**
2. Click **"Logs"** tab
3. Look for recent invocations
4. Successful log should show:
   - `200` status code
   - Request body containing the notification data

### Check Device for Push

If the user has a registered device token:
- Check your physical device for the push notification
- Note: Push notifications don't work in Expo Go or simulators - you need a development build

## Troubleshooting

### "Function not found" (404)

**Cause:** The Edge Function hasn't been deployed.

**Solution:**
```bash
npx supabase functions deploy push
```

Then verify deployment:
```bash
npx supabase functions list
```

### "Unauthorized" (401)

**Cause:** Wrong anon key or missing Authorization header.

**Solution:**
1. Verify the anon key in Dashboard: **Settings** -> **API**
2. Ensure header format is exactly: `Bearer <key>` (note the space after "Bearer")
3. Check for accidental whitespace or line breaks in the key

### "Connection refused" or "Function crashed"

**Cause:** The Edge Function is crashing during execution.

**Solution:**
1. Check function logs in Dashboard: **Edge Functions** -> **push** -> **Logs**
2. Common issues:
   - Missing environment variables (check Secrets in Edge Functions settings)
   - Database connection errors
   - Invalid payload structure

### Push Not Received on Device

**Possible causes:**

1. **No device token registered** - User hasn't granted push permissions
2. **Invalid Expo token** - Token expired or device unregistered
3. **Expo Go limitation** - Push only works in development/production builds
4. **Notification permissions denied** - Check device notification settings

**Debug steps:**
1. Check `device_tokens` table for the user's token:
   ```sql
   SELECT * FROM public.device_tokens WHERE user_id = '<user-id>';
   ```
2. Check Edge Function logs for Expo Push API errors
3. Verify the app is built with EAS Build (not Expo Go)

### Webhook Not Firing

**Cause:** Webhook not enabled or misconfigured.

**Solution:**
1. Go to **Database** -> **Webhooks**
2. Verify the webhook status is "Enabled"
3. Check the table is `user_notifications`
4. Check only `INSERT` event is selected

## Local Development

For local Supabase development, webhooks need special configuration because the Edge Function runs in a Docker container.

### Local Webhook URL

Use `host.docker.internal` instead of `localhost`:

```
http://host.docker.internal:54321/functions/v1/push
```

**Note:** `localhost` doesn't work from inside the Docker container.

### Local Configuration

When running `supabase start` locally:

1. Create the webhook via Dashboard on your local Supabase Studio: `http://localhost:54323`
2. Use URL: `http://host.docker.internal:54321/functions/v1/push`
3. Headers remain the same (use local anon key from `supabase status`)

### Verify Local Setup

```bash
# Check local Supabase status and get keys
npx supabase status

# Serve functions locally
npx supabase functions serve push

# Test with curl
curl -X POST http://localhost:54321/functions/v1/push \
  -H "Authorization: Bearer <local-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"type":"INSERT","table":"user_notifications","record":{"id":"test","user_id":"test-user","title":"Test","body":"Test body"}}'
```

## Security Notes

1. **Anon key is public** - It's safe to use in webhooks; RLS policies protect data
2. **Service role key** - Never use this in webhooks; it bypasses RLS
3. **Webhook payloads** - Contain the full row data; the Edge Function validates permissions

## Related Documentation

- [Supabase Webhooks Documentation](https://supabase.com/docs/guides/database/webhooks)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Edge Functions Documentation](https://supabase.com/docs/guides/functions)
