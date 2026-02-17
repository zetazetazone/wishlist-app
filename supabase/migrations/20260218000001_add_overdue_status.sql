-- Add 'overdue' to celebrations status CHECK constraint
-- This allows past-date celebrations to be manually marked as overdue
-- The UI computes overdue status dynamically from event_date

-- Drop existing constraint
ALTER TABLE public.celebrations
DROP CONSTRAINT celebrations_status_check;

-- Add new constraint with 'overdue' included
ALTER TABLE public.celebrations
ADD CONSTRAINT celebrations_status_check
CHECK (status IN ('upcoming', 'active', 'completed', 'overdue'));

-- Document the change
COMMENT ON COLUMN public.celebrations.status IS 'Status: upcoming, active, completed, or overdue. UI computes overdue dynamically from event_date; this value allows manual archival.';
