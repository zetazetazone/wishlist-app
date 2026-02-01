# Codebase Concerns

**Analysis Date:** 2026-02-02

## Tech Debt

**Unused Legacy Code Files:**
- Issue: `wishlist-old-backup.tsx` (166 lines) and `wishlist-simple.tsx` (178 lines) are unused backup files cluttering the codebase
- Files: `app/(app)/(tabs)/wishlist-old-backup.tsx`, `app/(app)/(tabs)/wishlist-simple.tsx`
- Impact: Maintenance burden, potential confusion about which code is actually in use, increased bundle size and code review overhead
- Fix approach: Remove these backup files. Use git history if reverting is needed. Single source of truth for each feature.

**Unused Invite Code Generation:**
- Issue: `generateInviteCode()` function defined but never used in `utils/groups.ts` line 7-9
- Files: `utils/groups.ts:7-9`
- Impact: Dead code adds unnecessary complexity. MVP uses group ID as invite code instead of generated codes.
- Fix approach: Remove the unused function. If invite codes are needed in future, implement with proper tracking.

**Multiple Wishlist UI Variants:**
- Issue: Three wishlist implementations exist (`wishlist.tsx`, `wishlist-luxury.tsx`, `wishlist-simple.tsx`) with significant duplication
- Files: `app/(app)/(tabs)/wishlist.tsx` (304 lines), `app/(app)/(tabs)/wishlist-luxury.tsx` (301 lines)
- Impact: Maintenance nightmare - same logic implemented 3 ways, testing becomes expensive, bug fixes need triplication
- Fix approach: Consolidate into single component. Extract common patterns into reusable hooks/components. Use UI theme configuration rather than duplicate implementations.

## Known Bugs

**Auth State Race Condition:**
- Symptoms: Potential double redirect or auth loop when auth state changes during session initialization
- Files: `app/_layout.tsx:16-53`
- Trigger: Fast auth state changes before `initialCheckDone` flag is set; rapid login/logout/login cycles
- Current Behavior: Uses `initialCheckDone` flag to guard against early redirects, but the dependency array includes `segments` which can change frequently
- Impact: Users might see flash of wrong screen or experience navigation loops on slow networks
- Workaround: Clear app cache or login again if stuck in auth loop

**Missing Error Handling for Async Operations:**
- Symptoms: Silent failures when auth operations timeout or network fails
- Files: `app/_layout.tsx:19`, `lib/supabase.ts`, `utils/auth.ts:90-108`
- Trigger: Offline state, slow network, Supabase outage
- Current state: `getCurrentUser()` in auth.ts returns structured error but callers don't validate
- Impact: App proceeds with `null` user state without alerting user. UI renders incorrectly.

**Group Member Count Performance Issue:**
- Symptoms: Slow group list loading, API throttling when user has many groups
- Files: `utils/groups.ts:117-126`
- Trigger: User with >10 groups loads groups list
- Current approach: Loops through each group and makes individual count query (N+1 problem)
- Impact: Group list takes 3-5 seconds to load with 20+ groups
- Fix approach: Batch the member count queries or fetch with a single aggregated query

**Email Validation is Missing:**
- Symptoms: Invalid email formats accepted during signup/login
- Files: `app/auth/login.tsx:28`, `app/auth/signup.tsx:40-44`
- Trigger: User enters "test", "@example.com", or other invalid formats
- Current validation: Only checks for non-empty, no regex or email pattern
- Impact: Invalid emails stored in database, emails unreachable
- Fix approach: Add email regex validation or use native email input validation

## Security Considerations

**Anon Key Exposed in Client Code:**
- Risk: Supabase anon key stored in app.json and environment variables accessible to anyone
- Files: `lib/supabase.ts:6-7`, `gluestack-ui.config.ts` (if it contains config)
- Current mitigation: Supabase anon key is intentionally limited (public read/write only), RLS enforced on database
- Recommendations:
  - Verify RLS policies are enforced on ALL tables (users, groups, wishlist_items, group_members, contributions)
  - Enable Supabase audit logging to monitor data access
  - Consider adding request rate limiting at Supabase level

**Insufficient Input Validation:**
- Risk: SQL injection potential and data integrity issues
- Files: `utils/groups.ts:14`, `components/wishlist/AddItemModal.tsx:35-42`
- Current validation: Only Amazon URL and title trimming, basic length checks
- Recommendations:
  - Validate all user inputs: group names (max length, special chars), prices (must be numeric, positive)
  - Implement strict HTML/script injection prevention for product titles
  - Add server-side validation rules to Supabase RLS policies

**No Password Strength Requirements:**
- Risk: Weak passwords accepted during signup
- Files: `app/auth/signup.tsx:34-36`
- Current validation: Minimum 6 characters only (very low)
- Impact: Users can create accounts with passwords like "123456" or "password"
- Fix approach: Enforce minimum 8 characters, require mixed case and numbers, add complexity meter

**Missing CORS and HTTPS Enforcement:**
- Risk: Man-in-the-middle attacks on API calls
- Files: `lib/supabase.ts` configuration
- Current state: Using public Supabase URL, protocol not explicitly enforced
- Recommendations: Ensure HTTPS-only communication, validate certificate pinning for critical connections

## Performance Bottlenecks

**Large Component Files:**
- Problem: Several components exceed 300 lines, making testing and maintenance difficult
- Files:
  - `components/wishlist/AddItemModal.tsx` (402 lines)
  - `app/group/[id].tsx` (394 lines)
  - `components/wishlist/LuxuryBottomSheet.tsx` (349 lines)
- Cause: Mixed concerns - form logic, styling, validation all in one file
- Improvement path: Extract form state into custom hooks, separate styled components, break into smaller testable units
- Performance impact: Large bundle size per screen, slower renders, harder to optimize

**N+1 Database Query in Group Fetching:**
- Problem: Group member count fetched separately for each group (line 117-126 in groups.ts)
- Files: `utils/groups.ts:117-126`
- Cause: Loop through groups then call count query per group
- Current: ≈150ms per group × N groups
- Fix: Use batch query or aggregate function: 1 query instead of N
- Impact: 10 groups = 1.5s delay; 20 groups = 3s delay

**Missing Lazy Loading and Pagination:**
- Problem: All wishlist items and group members loaded at once
- Files: `app/(app)/(tabs)/wishlist.tsx:44-61`, `utils/groups.ts:147-161`
- Impact: First load slow, memory usage high with large lists, renders all items even if not visible
- Improvement path: Implement pagination or infinite scroll, load items on demand

**Console.log Statements in Production:**
- Problem: Excessive logging throughout groups.ts slows down operations
- Files: `utils/groups.ts:19, 28, 32, 38, 48, 50, 55, 71, 74, 88, 91`
- Impact: Logs slower than actual database operations on some networks
- Fix: Remove console statements or use environment-based logging

## Fragile Areas

**Auth Flow is Tightly Coupled to Router:**
- Files: `app/_layout.tsx:12-52`
- Why fragile: Auth state changes directly trigger router navigation. Changes to segment logic or routing structure break auth
- Safe modification: Extract auth logic into a custom hook (`useAuthNavigation()`), separate concerns between auth and routing
- Test coverage: No test file for auth flow, untested redirect logic

**Group Detail Screen Navigation:**
- Files: `app/group/[id].tsx:122`
- Why fragile: Uses hardcoded route string `/(app)/(tabs)/groups` for back button, breaks if routes change
- Safe modification: Use router.back() consistently, avoid hardcoded routes
- Test coverage: No navigation tests, brittle hardcoded paths

**Modal State Management in Wishlist Components:**
- Files: `components/wishlist/AddItemModal.tsx` and `components/wishlist/AddItemBottomSheet.tsx` (both ~350+ lines)
- Why fragile: Modal visibility state managed by parent component with open/close props, easy to desynchronize
- Safe modification: Use context for modal state or extract into custom hook, avoid prop drilling
- Test coverage: No unit tests for form validation or submission logic

**Untyped Group Type Casting:**
- Files: `app/group/[id].tsx:50`
- Why fragile: Uses `as GroupWithMembers` type assertion without validation - data structure mismatch will silently fail
- Safe modification: Add runtime validation using schema validator (Zod/Joi), validate API response shape
- Impact: UI will break silently if API response structure changes

## Scaling Limits

**Current Capacity:**
- Database: Using Supabase free tier limitations (note: pricing tier not specified)
- Real-time: No real-time subscriptions implemented, group updates are manual refresh only
- Users: Single user auth flow, no scaling limits on users per group

**Limit: Group Collaboration Features:**
- Problem: Manual refresh only - if Person A adds item, Person B doesn't see it until manual refresh
- Scaling path: Implement real-time subscriptions using Supabase `.on()` for live updates
- Alternative: Use polling with exponential backoff

**Limit: Image Storage:**
- Problem: Product images not captured/stored (image_url field defined but unused)
- Scaling path: Implement image storage via Supabase Storage bucket with cleanup strategy

**Limit: Budget Enforcement:**
- Problem: budget_limit_per_gift stored but not validated or enforced at API level
- Scaling path: Add RLS policy to prevent contributions exceeding budget

## Dependencies at Risk

**No Testing Framework:**
- Risk: No unit tests, integration tests, or E2E tests detected
- Impact: Regressions undetected, refactoring dangerous, confidence in changes low
- Migration plan: Install Jest/Vitest, add test files for utils/auth.ts and utils/groups.ts, target ≥70% coverage

**Outdated/Unverified Dependencies:**
- Risk: Many Expo dependencies lock in specific versions (e.g., expo@54.0.33, react-native@0.81.5)
- Impact: Security vulnerabilities, platform incompatibilities, missing fixes
- Action: Run `npm audit` regularly, review package.json lock regularly

**Missing Error Boundary:**
- Risk: No error boundary component wrapping app
- Impact: Single unhandled error crashes entire app
- Fix: Add react-error-boundary package, wrap RootLayout with ErrorBoundary

## Missing Critical Features

**Email Verification:**
- Problem: Signup doesn't require email verification; unverified accounts can access full features
- Blocks: Spam/bot accounts possible, invalid emails break features
- Implementation: Configure Supabase email confirmation, handle confirmed_at check properly

**Password Reset Flow:**
- Problem: No password reset functionality implemented
- Blocks: Users locked out if they forget password
- Implementation: Add forgot-password screen, implement Supabase password recovery flow

**User Profile Management:**
- Problem: No profile edit screen to update name, birthday, avatar
- Blocks: Can't update email, birthday, profile image after signup
- Implementation: Add profile edit screen, implement update user endpoint

**Delete Account:**
- Problem: No ability to delete account or data
- Blocks: Can't comply with GDPR/data deletion requests
- Implementation: Add account deletion flow with confirmation, cascade delete related data

**Offline Support:**
- Problem: App requires constant internet connection, no offline queuing
- Blocks: Can't use app in areas with poor connectivity
- Implementation: Use AsyncStorage for offline queue, sync when back online

## Test Coverage Gaps

**Untested Auth Flow:**
- What's not tested: Login success/failure, signup validation, auth state changes, redirect logic
- Files: `utils/auth.ts`, `app/_layout.tsx`, `app/auth/login.tsx`, `app/auth/signup.tsx`
- Risk: Auth bugs undetected in production, critical path untested
- Priority: High (blocks all features)

**Untested Group Operations:**
- What's not tested: Create group, join group, member validation, budget enforcement
- Files: `utils/groups.ts`, `components/groups/CreateGroupModal.tsx`
- Risk: Data corruption, duplicate groups, authorization bypasses
- Priority: High (core feature)

**Untested Wishlist Operations:**
- What's not tested: Add item, delete item, update priority, filter/sort
- Files: `app/(app)/(tabs)/wishlist.tsx`, `components/wishlist/AddItemModal.tsx`
- Risk: Data loss, items not persisting, sync issues
- Priority: High (user-facing)

**Missing Component Testing:**
- What's not tested: Modal interactions, form validation, UI state transitions
- Files: All `.tsx` files under `components/`
- Risk: Regression in UI logic, unexpected behavior in edge cases
- Priority: Medium

---

*Concerns audit: 2026-02-02*
