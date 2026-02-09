---
phase: 25-friend-requests-flow
plan: 01
subsystem: database, api
tags: [supabase, postgres, triggers, notifications, push, friends, typescript]

# Dependency graph
requires:
  - phase: 23-database-foundation
    provides: friend_requests table, friends table, accept_friend_request RPC, are_friends() helper
  - phase: 04-02
    provides: user_notifications table, push notification pattern (notify_gift_leader_assigned)
provides:
  - Push notification triggers for friend request sent and accepted events
  - Friend request service functions (7 functions) for complete lifecycle management
affects: [25-02-requests-tab, 25-03-member-profile, push-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER trigger with SET search_path = '' for friend request notifications"
    - "Bidirectional OR query pattern for friend request lookups"
    - "Rate limiting pattern (20 requests/hour) in TypeScript service layer"
    - "Block check before friend request insert"

key-files:
  created:
    - supabase/migrations/20260211000001_friend_request_notifications.sql
  modified:
    - lib/friends.ts

key-decisions:
  - "Trigger fires on INSERT when status='pending' (not all inserts) to avoid notifying on blocked inserts"
  - "Trigger fires on UPDATE when OLD.status='pending' AND NEW.status='accepted' using WHEN clause"
  - "Rate limit check happens client-side in TypeScript (not DB constraint) for better UX feedback"
  - "Block check queries bidirectionally before INSERT to prevent blocked user circumvention"

patterns-established:
  - "Friend request notification pattern: INSERT INTO user_notifications with type, screen, and avatar_url data"
  - "getRelationshipStatus() pattern for member profile button state determination"

# Metrics
duration: 3min
completed: 2026-02-09
---

# Phase 25 Plan 01: Friend Request Notifications & Service Layer Summary

**Push notification triggers for friend request events plus 7 TypeScript service functions for complete request lifecycle management**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-09T22:56:18Z
- **Completed:** 2026-02-09T22:59:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created notification triggers that fire push notifications when user receives friend request or their request is accepted
- Established service functions covering entire friend request lifecycle (send, accept, decline, cancel, block)
- Fixed RPC parameter naming mismatch (user_a/user_b -> p_user_a/p_user_b) in getRelationshipStatus()

## Task Commits

Each task was committed atomically:

1. **Task 1: Create notification triggers migration** - `0e8eba5` (feat)
2. **Task 2: Extend friends service with request functions** - `1117adc` (feat - parameter fix only, functions added in prior run)

## Files Created/Modified

- `supabase/migrations/20260211000001_friend_request_notifications.sql` - Two SECURITY DEFINER trigger functions for friend request notifications
- `lib/friends.ts` - Fixed RPC parameter names to match database function signature

## Decisions Made

- Used WHEN clause on triggers for efficiency (only fire when conditions met, not on every INSERT/UPDATE)
- Followed notify_gift_leader_assigned() pattern exactly for consistency with existing notification infrastructure
- Rate limit of 20 requests/hour enforced in TypeScript for immediate user feedback (vs database constraint)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed RPC parameter naming mismatch**
- **Found during:** Task 2 (Extend friends service)
- **Issue:** getRelationshipStatus() called are_friends RPC with parameters `user_a` and `user_b`, but the RPC function expects `p_user_a` and `p_user_b`
- **Fix:** Updated parameter names to match the database function signature
- **Files modified:** lib/friends.ts
- **Verification:** TypeScript compiles without errors, RPC call will now work correctly
- **Committed in:** 1117adc

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential fix for RPC call to work. No scope creep.

## Issues Encountered

- Service functions were already added by a prior 25-02 plan execution, so Task 2 only needed to fix the RPC parameter names

## User Setup Required

None - no external service configuration required. Push notification infrastructure from v1.0 handles user_notifications -> Edge Function -> Expo Push automatically.

## Next Phase Readiness

- Notification triggers ready to fire when UI calls sendFriendRequest() and acceptFriendRequest()
- Service functions ready for Requests tab UI (25-02) and Member profile integration (25-03)
- All 7 required exports available: getPendingRequests, sendFriendRequest, acceptFriendRequest, declineFriendRequest, cancelFriendRequest, getRelationshipStatus, blockUser

## Self-Check: PASSED

All verification checks passed:
- Migration file exists at expected path
- All 7 service function exports found in lib/friends.ts
- Both task commits exist in git history

---
*Phase: 25-friend-requests-flow*
*Completed: 2026-02-09*
