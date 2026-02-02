-- Migration: Fix is_read vs read_at schema mismatch
-- Purpose: The app code and TypeScript types expect read_at (TIMESTAMPTZ), but the original
-- migration created is_read (BOOLEAN). This migration fixes the schema to match the code.

-- 1. Drop the existing index on is_read (MUST be done before column drop)
DROP INDEX IF EXISTS idx_user_notifications_is_read;

-- 2. Drop the old is_read column
ALTER TABLE public.user_notifications DROP COLUMN IF EXISTS is_read;

-- 3. Add the new read_at column (nullable TIMESTAMPTZ - NULL means unread)
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 4. Create new index for efficient unread queries
CREATE INDEX IF NOT EXISTS idx_user_notifications_read_at ON public.user_notifications(read_at);

-- 5. Add documentation comment
COMMENT ON COLUMN public.user_notifications.read_at IS 'Timestamp when notification was read. NULL means unread.';
