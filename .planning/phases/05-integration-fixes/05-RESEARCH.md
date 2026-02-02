# Phase 5: Integration Fixes - Research

**Researched:** 2026-02-02
**Domain:** Database schema migration, Supabase webhooks, PostgreSQL DDL
**Confidence:** HIGH

## Summary

This phase addresses two specific gaps identified in the v1 milestone audit: a schema mismatch preventing mark-as-read functionality, and missing webhook documentation preventing push notification delivery.

The schema mismatch is straightforward: the migration defines `is_read BOOLEAN` while TypeScript code expects `read_at TIMESTAMPTZ`. The fix requires a new migration that drops the old column and adds the new one. Since this is a gap closure phase with minimal production data, the simpler DROP/ADD approach is acceptable over complex data preservation strategies.

The webhook configuration is a documented Supabase limitation: database webhooks cannot be created via SQL migrations automatically but CAN be created as triggers using the `pg_net` extension. Two options exist: (1) manual Dashboard configuration (documented in Phase 1), or (2) SQL trigger-based webhook using `supabase_functions.http_request`.

**Primary recommendation:** Fix schema with new migration, create SQL trigger for webhook to enable fully automated setup, and document manual Dashboard fallback for production environments.

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|--------------|---------|---------|--------------|
| PostgreSQL | 15+ | Database schema changes | Supabase default |
| pg_net extension | N/A | Async HTTP requests from triggers | Supabase built-in for webhooks |
| Supabase CLI | Latest | Migration management | Standard tooling |

### Supporting
| Library/Tool | Version | Purpose | When to Use |
|--------------|---------|---------|-------------|
| supabase_functions.http_request | N/A | Webhook trigger function | Creating SQL-based webhooks |
| Supabase Dashboard | N/A | Manual webhook configuration | Production setup verification |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DROP/ADD column | RENAME + ALTER TYPE | More complex, unnecessary for minimal data |
| SQL trigger webhook | Dashboard-only webhook | Dashboard doesn't persist to repo, not version-controlled |

**No additional installation required** - all tools already in use.

## Architecture Patterns

### Migration File Pattern
```
supabase/migrations/
├── 20260202000001_notifications.sql      # Original (has is_read)
├── ...
└── 20260202000010_fix_read_at_schema.sql # NEW: Fix schema mismatch
```

### Pattern 1: Schema Migration with DROP/ADD
**What:** Replace boolean flag with nullable timestamp for more information (when vs boolean)
**When to use:** Low-data environments where data preservation is not critical

```sql
-- Source: PostgreSQL ALTER TABLE documentation
-- https://www.postgresql.org/docs/current/ddl-alter.html

-- Step 1: Drop old index that references is_read
DROP INDEX IF EXISTS idx_user_notifications_is_read;

-- Step 2: Drop old column
ALTER TABLE public.user_notifications DROP COLUMN IF EXISTS is_read;

-- Step 3: Add new column (nullable allows for "unread" state)
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Step 4: Create new index
CREATE INDEX IF NOT EXISTS idx_user_notifications_read_at ON public.user_notifications(read_at);
```

### Pattern 2: SQL-Based Webhook Trigger
**What:** Create database webhook as trigger using pg_net extension
**When to use:** When webhook configuration must be version-controlled in migrations

```sql
-- Source: Supabase Database Webhooks documentation
-- https://supabase.com/docs/guides/database/webhooks

-- Create trigger that fires on INSERT to user_notifications
CREATE OR REPLACE TRIGGER push_notification_webhook
AFTER INSERT ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  -- URL: Edge Function endpoint (MUST be replaced with actual project URL)
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push',
  -- HTTP Method
  'POST',
  -- Headers: Authorization with anon key, Content-Type
  '{"Authorization":"Bearer YOUR_ANON_KEY","Content-Type":"application/json"}',
  -- Body: Empty (payload is auto-generated from trigger)
  '{}',
  -- Timeout in milliseconds
  '5000'
);
```

### Anti-Patterns to Avoid
- **Hardcoding secrets in migration files:** Use environment variable placeholders or document manual replacement
- **Assuming Dashboard webhooks persist:** They don't - SQL triggers provide version control
- **Combining DROP + ADD in production without backup:** Always verify data state before destructive operations

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook HTTP requests | Custom trigger function | `supabase_functions.http_request` | Built-in, handles async, has retries |
| Schema diffing | Manual comparison | `supabase db diff` | Automated detection |
| Migration rollback | Custom undo scripts | `supabase db reset` (dev) | Handles dependencies |

**Key insight:** Supabase provides `supabase_functions.http_request` specifically for webhook triggers. Do not create custom HTTP request functions - use the built-in one which handles connection pooling, timeouts, and async execution properly.

## Common Pitfalls

### Pitfall 1: Webhook Trigger URL Hardcoding
**What goes wrong:** Migration file contains production URL/keys, fails in other environments
**Why it happens:** SQL migrations don't support environment variables
**How to avoid:**
- Option A: Use placeholder values and document replacement in setup guide
- Option B: Create webhook via Dashboard (not version-controlled but environment-aware)
- Option C: Use seed.sql for local development, manual setup for production
**Warning signs:** Trigger fails immediately after migration in new environments

### Pitfall 2: Missing Index Cleanup Before DROP COLUMN
**What goes wrong:** `DROP COLUMN` fails because index still references column
**Why it happens:** PostgreSQL protects data integrity
**How to avoid:** Always DROP INDEX before DROP COLUMN in migrations
**Warning signs:** Migration error mentioning dependent objects

### Pitfall 3: IF NOT EXISTS vs IF EXISTS Confusion
**What goes wrong:** Migration fails on re-run or is silently skipped
**Why it happens:** Using wrong conditional for operation type
**How to avoid:**
- `DROP ... IF EXISTS` - Safe removal (skip if doesn't exist)
- `CREATE ... IF NOT EXISTS` - Safe creation (skip if exists)
- `ADD COLUMN IF NOT EXISTS` - Safe addition
**Warning signs:** Migrations behave differently on fresh vs existing databases

### Pitfall 4: Webhook Payload Format Mismatch
**What goes wrong:** Edge Function receives wrong data structure
**Why it happens:** Assuming Dashboard webhook format equals trigger format
**How to avoid:** SQL triggers with `supabase_functions.http_request` auto-generate payload with:
```json
{
  "type": "INSERT",
  "table": "user_notifications",
  "schema": "public",
  "record": { ... new row data ... },
  "old_record": null
}
```
**Warning signs:** Edge Function logs show unexpected payload structure

### Pitfall 5: Local Development Webhook URL
**What goes wrong:** Webhook calls `localhost` but database is in Docker
**Why it happens:** Docker containers have isolated networking
**How to avoid:** Use `host.docker.internal` instead of `localhost` for local development
**Warning signs:** Connection refused errors in Supabase logs

## Code Examples

### Schema Migration (Complete)
```sql
-- Source: Project milestone audit + PostgreSQL documentation
-- File: supabase/migrations/20260202000010_fix_read_at_schema.sql

-- Fix schema mismatch: is_read (BOOLEAN) -> read_at (TIMESTAMPTZ)
-- This allows tracking WHEN a notification was read, not just IF it was read.

-- 1. Drop existing index on is_read (must be done before column drop)
DROP INDEX IF EXISTS idx_user_notifications_is_read;

-- 2. Drop old column
ALTER TABLE public.user_notifications DROP COLUMN IF EXISTS is_read;

-- 3. Add new column with proper type
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 4. Create new index for efficient unread queries
CREATE INDEX IF NOT EXISTS idx_user_notifications_read_at
ON public.user_notifications(read_at);

-- 5. Add comment for documentation
COMMENT ON COLUMN public.user_notifications.read_at IS
'Timestamp when notification was read. NULL means unread.';
```

### Webhook Trigger (Template)
```sql
-- Source: Supabase Database Webhooks documentation
-- File: supabase/migrations/20260202000011_notification_webhook.sql
-- NOTE: This is a TEMPLATE. Replace placeholders before deployment.

-- IMPORTANT: Replace these placeholders:
-- - YOUR_PROJECT_REF: Your Supabase project reference ID
-- - YOUR_ANON_KEY: Your Supabase anon/public key

-- Drop existing trigger if any (for idempotency)
DROP TRIGGER IF EXISTS push_notification_webhook ON public.user_notifications;

-- Create webhook trigger
CREATE TRIGGER push_notification_webhook
AFTER INSERT ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push',
  'POST',
  '{"Authorization":"Bearer YOUR_ANON_KEY","Content-Type":"application/json"}',
  '{}',
  '5000'
);

-- Add comment for documentation
COMMENT ON TRIGGER push_notification_webhook ON public.user_notifications IS
'Triggers push notification Edge Function when notification is created';
```

### Mark-as-Read TypeScript (Existing Code Reference)
```typescript
// Source: app/(app)/(tabs)/notifications.tsx lines 108-122
// This code already expects read_at - migration brings schema into alignment

const handleNotificationPress = async (notification: NotificationWithDetails) => {
  if (!notification.read_at) {
    await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notification.id);

    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id
          ? { ...n, read_at: new Date().toISOString() }
          : n
      )
    );
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| is_read BOOLEAN | read_at TIMESTAMPTZ | Phase 1 Plan 02 (code) | Provides when-read info, not just if-read |
| Dashboard webhooks only | SQL trigger webhooks | Supabase docs | Version-controlled infrastructure |
| Manual webhook setup | Trigger-based automation | pg_net extension | Repeatable deployments |

**Deprecated/outdated:**
- `is_read BOOLEAN` pattern: Replaced by `read_at TIMESTAMPTZ` for more information
- Dashboard-only webhook configuration: SQL triggers now preferred for version control

## Open Questions

### 1. Environment Variable Handling in Migrations
**What we know:** SQL migrations cannot use environment variables directly
**What's unclear:** Best practice for multi-environment webhook URLs in migrations
**Recommendation:** Use template approach with documented replacement steps. For production, consider Dashboard configuration as authoritative with migration as local-dev convenience.

### 2. Webhook Trigger vs Dashboard Webhook Behavior Parity
**What we know:** Both trigger Edge Functions on table events
**What's unclear:** Whether payload format is identical between approaches
**Recommendation:** The existing Edge Function already handles the webhook payload format. Test with actual trigger to verify compatibility. Payload format should be identical per Supabase documentation.

## Sources

### Primary (HIGH confidence)
- [Supabase Database Webhooks Documentation](https://supabase.com/docs/guides/database/webhooks) - SQL trigger syntax, payload format
- [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/ddl-alter.html) - DDL syntax
- Project codebase analysis - Verified mismatch locations

### Secondary (MEDIUM confidence)
- [Supabase Database Migrations Guide](https://supabase.com/docs/guides/deployment/database-migrations) - Migration workflow
- [PostgreSQL Schema Migration Best Practices](https://medium.com/miro-engineering/sql-migrations-in-postgresql-part-1-bc38ec1cbe75) - Safe migration patterns

### Tertiary (LOW confidence)
- None required - this is well-documented territory

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Supabase/PostgreSQL tooling
- Architecture: HIGH - Straightforward DDL and trigger creation
- Pitfalls: HIGH - Based on official documentation and project-specific evidence

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable domain)
