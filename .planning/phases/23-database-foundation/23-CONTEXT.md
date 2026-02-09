# Phase 23: Database Foundation - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema for friends, friend requests, and public dates with bidirectional relationship handling and friend-visibility RLS patterns. This is pure infrastructure — no UI, no services, just tables, constraints, policies, and helper functions.

</domain>

<decisions>
## Implementation Decisions

### Friends Table Design
- Ordered bidirectional constraint: `user_a_id < user_b_id` enforces single row per friendship
- Both user IDs are foreign keys to users table
- Created timestamp for friendship age tracking

### Friend Requests Table Design
- Status enum: `pending`, `accepted`, `rejected`, `blocked`
- Sender and receiver user IDs (no ordering constraint — directional)
- Created and updated timestamps for request lifecycle

### Public Dates Table Design
- Month/day columns for annual recurrence (not full date)
- Optional year column for one-time events
- Owner user ID for RLS
- Title and optional description

### Helper Functions
- `are_friends(user_a, user_b)` returns boolean, handles bidirectional check with ordered constraint
- Used by RLS policies to simplify friend-visibility logic

### Phone Number Column
- Add `phone` column to existing users table
- E.164 format (normalized, e.g., +14155551234)
- Nullable — phone not required for account
- Unique constraint for contact matching

### Claude's Discretion
- Index strategy (which columns, partial indexes)
- Exact RLS policy implementation patterns
- Migration ordering and rollback approach
- Trigger functions for status transitions
- Error handling in helper functions
- Phone validation trigger vs. application-level

</decisions>

<specifics>
## Specific Ideas

No specific requirements — architecture decisions from v1.4 research provide sufficient guidance.

Key references from research:
- Bidirectional constraint pattern prevents duplicate friendships
- `are_friends()` centralizes logic to avoid OR-condition complexity in RLS
- E.164 via `libphonenumber-js` happens at application layer (Phase 26)

</specifics>

<deferred>
## Deferred Ideas

None — this is a pure infrastructure phase with clear boundaries.

</deferred>

---

*Phase: 23-database-foundation*
*Context gathered: 2026-02-09*
