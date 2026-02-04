---
status: diagnosed
trigger: "Tapping a member card on the group detail screen navigates to a celebration page that shows 'Celebration not found or access denied' error with a 'Go Back' button."
created: 2026-02-04T00:00:00Z
updated: 2026-02-04T00:08:00Z
---

## Current Focus

hypothesis: CONFIRMED - Member card navigation passes user ID where celebration screen expects celebration ID
test: Traced navigation from MemberCard onPress through celebration screen to getCelebration function
expecting: Found exact mismatch - user ID being passed as celebration ID parameter
next_action: Return diagnosis with root cause and fix recommendation

## Symptoms

expected: Tapping member card should navigate to a valid celebration view
actual: Shows "Celebration not found or access denied" error with "Go Back" button
errors: "Celebration not found or access denied"
reproduction: Tap any member card on group detail screen
started: Phase 14-03 implementation

## Eliminated

## Evidence

- timestamp: 2026-02-04T00:05:00Z
  checked: app/group/[id].tsx line 248
  found: MemberCard onPress navigates to `/(app)/celebration/${member.users.id}` - passes USER ID
  implication: Navigation passes user ID as celebration ID parameter

- timestamp: 2026-02-04T00:06:00Z
  checked: app/(app)/celebration/[id].tsx lines 78, 111-127
  found: Screen expects `id` param to be a celebration ID, calls `getCelebration(id)` which queries celebrations table by ID
  implication: Screen expects celebration record ID, not user ID

- timestamp: 2026-02-04T00:07:00Z
  checked: lib/celebrations.ts lines 467-486
  found: getCelebration() queries celebrations table with `.eq('id', celebrationId)` - expects celebration record ID
  implication: Function will return null when passed a user ID (no celebration with that ID exists)

- timestamp: 2026-02-04T00:08:00Z
  checked: app/(app)/celebration/[id].tsx lines 123-127
  found: When getCelebration returns null, sets error to "Celebration not found or access denied"
  implication: Error message matches reported symptom exactly

## Resolution

root_cause: Member card navigation passes user ID where celebration screen expects celebration ID. The group detail screen navigates to `/(app)/celebration/${member.users.id}` (line 248), but the celebration detail screen expects the route param to be a celebration record ID (not a user ID). When getCelebration() receives a user ID instead of a celebration ID, it returns null because no celebration record exists with that user ID, triggering the "Celebration not found or access denied" error.

fix: The member card should not navigate to a celebration detail screen at all. Based on the app architecture, there are two valid approaches:
1. Navigate to the user's wishlist/profile view instead (e.g., `/user/${member.users.id}` or `/wishlist/${member.users.id}`)
2. Find or create the upcoming birthday celebration for that user in this group, then navigate to that celebration's detail screen

Most likely intended behavior: Member cards should navigate to view that member's wishlist or profile, NOT to a celebration detail. Celebrations are accessed from the Celebrations tab, not from member cards on the group view.

verification: After implementing fix, tap a member card on group detail screen and verify it navigates to the correct destination (likely member's wishlist/profile, not celebration)

files_changed:
- app/group/[id].tsx (line 248: change navigation target from celebration to user profile/wishlist)
