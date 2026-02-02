# Pitfalls Research: v1.1 Wishlist Polish

**Domain:** React Native wishlist app with multi-user Supabase backend
**Researched:** 2026-02-02
**Focus:** Adding favorites, special items, and profile editing to existing system

## Summary

Adding favorite/priority highlighting, special item types, and profile editing to an existing multi-user wishlist app introduces critical risks around **state synchronization** (local UI vs. remote Supabase updates), **schema migration safety** (constraint changes with existing data), and **race conditions** (concurrent profile edits). The most dangerous pitfall is breaking RLS policies when adding `is_favorite` flags, potentially exposing celebrants to their own gift data. Second is corrupting existing wishlist items when migrating to support special types without proper enum handling and NULL defaults.

---

## Critical Pitfalls

### Pitfall 1: RLS Policy Breakage from Favorite Flag Schema Changes

**Risk:** Adding `is_favorite` boolean to `wishlist_items` table requires updating RLS policies. If migration adds column before updating policies, you create a window where celebrants can see their own wishlist items marked as favorites by others, breaking the core security model.

**What Goes Wrong:**
- Migration adds `is_favorite BOOLEAN DEFAULT false` to table
- Existing RLS policy `"Users can view group wishlist items"` doesn't account for favorite flag
- Celebrant exclusion logic in celebrations relies on RLS, but favorite queries bypass it
- Users temporarily see items they shouldn't during migration window
- Race condition: some clients query during migration, cache corrupted data

**Warning Signs:**
- RLS policy mentions `wishlist_items` but not `is_favorite` filtering
- Migration file adds column without corresponding policy update in same transaction
- No test coverage for "celebrant views group" → "should not see favorite items"
- Frontend queries `wishlist_items` with `.select('*, is_favorite')` without RLS validation

**Prevention:**
1. **Single Transaction Migration:** Add column + update RLS policies in one atomic SQL transaction
2. **Test Before Deploy:** Create test user as celebrant, verify they cannot see `is_favorite=true` on their items
3. **Backend Validation:** Add CHECK constraint `(user_id != auth.uid() OR is_favorite = false)` to prevent self-favoriting
4. **Realtime Subscription Safety:** Update Supabase Realtime subscriptions to filter `is_favorite` by RLS context

**Phase:** Phase 2 (Database Schema) — Must handle in migration file, cannot defer

---

### Pitfall 2: Special Item Type Migration Breaking Existing Data

**Risk:** Adding "Surprise Me" and "Mystery Box" types requires migrating `wishlist_items.amazon_url` from `NOT NULL` to nullable, and adding item_type enum. If not done carefully, existing items get corrupted or queries break.

**What Goes Wrong:**
- Current schema: `amazon_url TEXT NOT NULL` (all items are Amazon products)
- New requirement: "Surprise Me" has no URL, "Mystery Box" has tier instead of URL
- Naive migration: `ALTER TABLE wishlist_items ALTER COLUMN amazon_url DROP NOT NULL`
- Breaks frontend: React Native components assume `amazon_url` always exists → crashes on `undefined.includes()`
- Breaks backend: Edge functions for price scraping assume URL exists
- TypeScript types become unsafe: `WishlistItem.amazon_url` should be `string | null` but codegen hasn't updated

**Warning Signs:**
- Migration drops `NOT NULL` constraint without adding validation replacement
- No TypeScript enum for item types (`type ItemType = 'standard' | 'surprise_me' | 'mystery_box'`)
- Frontend doesn't handle conditional rendering based on item type
- Search/filter logic assumes all items have URLs
- Price validation doesn't account for Mystery Box tiers

**Prevention:**
1. **Add Before Modify:** Add `item_type TEXT CHECK (item_type IN ('standard', 'surprise_me', 'mystery_box')) DEFAULT 'standard'` first
2. **Backfill Existing Data:** `UPDATE wishlist_items SET item_type = 'standard' WHERE item_type IS NULL` before migration
3. **Conditional Constraints:** Use CHECK constraint: `(item_type = 'standard' AND amazon_url IS NOT NULL) OR (item_type != 'standard')`
4. **Type Safety:** Regenerate Supabase types with `npx supabase gen types typescript` immediately after migration
5. **Component Guards:** Add `if (item.item_type === 'standard')` guards before accessing `amazon_url`
6. **Backend Function Updates:** Update Edge Functions to handle null URLs gracefully

**Phase:** Phase 2 (Database Schema) + Phase 3 (UI Implementation) — coordinated deployment required

---

### Pitfall 3: Realtime State Desynchronization on Favorite Toggle

**Risk:** User A favorites an item while viewing User B's wishlist. Supabase Realtime broadcasts update, but React Native local state has stale priority ordering. User A sees item jump to top, then flash back down when re-fetched. Multiple users toggling favorites on same list creates flickering UI.

**What Goes Wrong:**
- User A's local state: `[item1, item2, item3]` (sorted by created_at)
- User A favorites item3 → optimistic update moves it to top: `[item3*, item1, item2]`
- Supabase processes update, Realtime broadcasts: `{id: item3, is_favorite: true}`
- React Native state merges broadcast with local state → duplicate item or wrong order
- User B simultaneously unfavorites item1 → race condition on server
- Final state on User A's device doesn't match server: `[item3*, item1*, item2]` (two favorites, but server only has one)

**Warning Signs:**
- Using `useState` for wishlist items instead of React Query or Zustand
- Optimistic updates don't have rollback logic for failed mutations
- Realtime subscription handler does `setState(prevItems => [...prevItems, newItem])` without deduplication
- No conflict resolution for concurrent favorite toggles
- Flash of incorrect UI when refocusing app tab (cache invalidation issue)

**Prevention:**
1. **Use React Query with Optimistic Updates:** Implement proper mutation with `onMutate`, `onError`, `onSettled` lifecycle
2. **Server as Source of Truth:** Don't optimistically reorder list; only toggle star icon, then refetch
3. **Realtime Deduplication:** Merge Realtime updates by item ID: `setState(prev => prev.map(item => item.id === updated.id ? updated : item))`
4. **Conflict Resolution:** Add `version` or `updated_at` timestamp to resolve "last write wins"
5. **Loading States:** Show skeleton while refetching to avoid jarring UI jumps
6. **Test Concurrency:** Automated test with two clients favoriting simultaneously

**Phase:** Phase 3 (UI Implementation) — critical for multi-user UX quality

**Sources:**
- [React Query Cache Invalidation](https://medium.com/@kennediowusu/react-query-cache-invalidation-why-your-mutations-work-but-your-ui-doesnt-update-a1ad23bc7ef1)
- [TanStack Query Invalidation Guide](https://tanstack.com/query/v4/docs/framework/react/guides/query-invalidation)
- [Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)

---

### Pitfall 4: Profile Edit Race Conditions Overwriting Concurrent Changes

**Risk:** User edits profile (name, birthday, photo) from multiple devices or tabs. Without optimistic locking, last write wins, silently discarding changes from other session.

**What Goes Wrong:**
- Device A loads profile: `{full_name: "Alice", birthday: "1990-01-01", avatar_url: null}`
- Device B loads same profile state
- Device A updates name to "Alice Smith" → saves to Supabase
- Device B uploads new avatar, then saves: `{full_name: "Alice", birthday: "1990-01-01", avatar_url: "avatar.jpg"}`
- Device B overwrites Device A's name change with stale "Alice"
- User sees name reverted without explanation, assumes app is buggy

**Warning Signs:**
- Profile update sends entire `users` row instead of partial PATCH
- No `updated_at` timestamp check before saving
- No conflict detection or user notification on save failure
- Background avatar upload queued after profile form submission → delayed write with stale data
- Profile editing screen doesn't re-fetch on app foregrounding

**Prevention:**
1. **Optimistic Locking:** Check `updated_at` on save: `UPDATE users SET ... WHERE id = ? AND updated_at = ?`
2. **Partial Updates:** Only send changed fields: `supabase.from('users').update({full_name}).eq('id', userId)`
3. **Conflict Detection:** If `updated_at` mismatch, fetch latest and prompt user to merge changes
4. **Sequential Updates:** Upload avatar first, get URL, then save profile in single transaction
5. **Real-time Sync:** Subscribe to `users` table changes, show toast if profile updated elsewhere
6. **Debounce Saves:** Wait 500ms after last keystroke before auto-saving to reduce save frequency

**Phase:** Phase 4 (Profile Editing) — must implement before launch to avoid data loss

**Sources:**
- [Race Conditions in React Native](https://dev.to/paulocappa/race-conditions-in-react-native-5bjb)
- [Data Concurrency and Consistency](https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/data-concurrency-and-consistency.html)

---

## Moderate Pitfalls

### Pitfall 5: Mystery Box Tier Validation Missing

**Risk:** User creates Mystery Box item with invalid tier (e.g., €75 instead of €25/€50/€100), causing UI breakage when rendering tier badges.

**What Goes Wrong:**
- Database schema allows any integer for `mystery_box_tier`
- Frontend maps `tier → badge_color` with switch statement, no default case
- User manually POSTs to API with tier=75 → app crashes on render
- Gift Leader sees blank tier badge, doesn't know budget target

**Warning Signs:**
- No CHECK constraint: `mystery_box_tier INTEGER CHECK (mystery_box_tier IN (25, 50, 100))`
- Frontend assumes tier is always valid: `const color = tierColors[item.tier]` without fallback
- No server-side validation in Edge Functions or RLS policies

**Prevention:**
1. **Database Constraint:** `ALTER TABLE wishlist_items ADD CONSTRAINT valid_mystery_tier CHECK (mystery_box_tier IS NULL OR mystery_box_tier IN (25, 50, 100))`
2. **TypeScript Literal:** `type MysteryTier = 25 | 50 | 100` instead of `number`
3. **Frontend Validation:** Check tier before form submission, show error if invalid
4. **Default Fallback:** `const color = tierColors[item.tier] ?? 'gray'` for unknown tiers

**Phase:** Phase 2 (Database Schema) — add constraint during migration, test in Phase 3

**Sources:**
- [TypeScript Enums in React Native](https://blog.logrocket.com/complete-guide-typescript-enums-react-native/)

---

### Pitfall 6: Favorite-Per-Group Uniqueness Not Enforced

**Risk:** Requirement states "one favorite per group" but database doesn't enforce it. User exploits bug by favoriting multiple items in same group via rapid clicks or API manipulation.

**What Goes Wrong:**
- Database has `is_favorite BOOLEAN` but no uniqueness constraint
- Frontend disables favorite button after first click, but network lag allows double-submit
- User favorites item A and item B in rapid succession → both saved as favorite
- Other group members see two pinned items at top, violating UX expectation
- Gift Leader confused about which item is "most wanted"

**Warning Signs:**
- No partial unique index: `CREATE UNIQUE INDEX ... WHERE is_favorite = true`
- Frontend only disables button, no backend validation
- Multiple items with `is_favorite=true` exist in test data without error

**Prevention:**
1. **Unique Partial Index:** `CREATE UNIQUE INDEX unique_favorite_per_group ON wishlist_items(user_id, group_id) WHERE is_favorite = true`
2. **Backend Trigger:** Before insert/update, unfavorite existing favorite in same group
3. **Frontend Optimistic Lock:** Disable all favorite buttons in group when one toggled
4. **Error Handling:** Catch unique constraint violation, show "Only one favorite allowed" message

**Phase:** Phase 2 (Database Schema) — critical for data integrity

---

### Pitfall 7: Supabase Realtime Connection Loss on Background/Foreground

**Risk:** React Native app goes to background (user switches apps), Realtime WebSocket disconnects. On foreground, subscription doesn't reconnect properly, missing updates to favorites or new items.

**What Goes Wrong:**
- User A backgrounds app while viewing wishlist
- Supabase Realtime connection times out after 30 seconds
- User B favorites an item while User A is backgrounded
- User A foregrounds app → Realtime doesn't auto-reconnect on iOS Safari or Android Chrome
- User A sees stale wishlist state, doesn't realize item was favorited
- User A manually favorites same item → conflict error

**Warning Signs:**
- No `AppState` listener to detect background/foreground transitions
- Realtime subscriptions don't have reconnect logic in `useEffect` cleanup
- No "Reconnecting..." UI indicator when WebSocket drops
- High error rate in Supabase logs: `TIMED_OUT` or `heartbeat_timeout`

**Prevention:**
1. **AppState Monitoring:** Use `AppState.addEventListener` to refetch on foreground
2. **Manual Reconnect:** Call `supabase.removeAllChannels()` then resubscribe on foreground
3. **Offline Indicator:** Show yellow banner "Connection lost, retrying..." when WebSocket down
4. **Cache Invalidation:** Force refetch with `queryClient.invalidateQueries(['wishlist'])` on foreground
5. **Exponential Backoff:** Retry Realtime connection with 1s, 2s, 4s delays

**Phase:** Phase 3 (UI Implementation) — affects all Realtime features, not just favorites

**Sources:**
- [Supabase Realtime Troubleshooting](https://supabase.com/docs/guides/realtime/troubleshooting)
- [GitHub Discussion: Reliable Realtime Updates](https://github.com/orgs/supabase/discussions/5641)

---

### Pitfall 8: Profile Photo Upload Fails Silently Without Rollback

**Risk:** User selects new profile photo, uploads to Supabase Storage, but network fails mid-upload. Form saves with `avatar_url: null`, deleting previous photo reference without user realizing.

**What Goes Wrong:**
- User edits profile, selects new photo
- Frontend uploads to Supabase Storage bucket
- Upload succeeds, returns URL `avatar_url: "avatars/uuid.jpg"`
- Profile update API call fails with 500 error (timeout, RLS issue, etc.)
- Frontend doesn't rollback uploaded file → orphaned file in storage
- User retries, uploads same photo again → duplicate files, storage bloat
- Previous `avatar_url` lost, user's old photo gone forever

**Warning Signs:**
- Upload and profile update happen in separate async calls
- No try/catch around profile mutation to delete uploaded file on failure
- Storage bucket has many files with 0 references in database
- No loading state between upload success and profile save

**Prevention:**
1. **Two-Phase Commit:** Upload file, save URL to local state, only commit profile update on success
2. **Rollback on Failure:** If profile save fails, delete uploaded file: `supabase.storage.from('avatars').remove([filePath])`
3. **Transaction Pattern:** Save profile with `old_avatar_url` and `new_avatar_url`, cleanup old file on success
4. **Retry Logic:** Use exponential backoff for profile update, don't delete uploaded file immediately
5. **Storage Cleanup:** Scheduled job to delete avatars not referenced in `users.avatar_url`

**Phase:** Phase 4 (Profile Editing) — UX quality issue, moderate severity

---

## Minor Pitfalls

### Pitfall 9: Star Rating Display Stays Vertical on Android After Fix

**Risk:** Fixing horizontal star rating layout for iOS but not testing on Android. Platform-specific CSS differences cause stars to remain vertical on Android despite fix.

**What Goes Wrong:**
- Developer fixes star layout with `flexDirection: 'row'` on iOS simulator
- Deploys to production without Android testing
- Android uses different flex engine (Fabric vs legacy), stars still vertical
- User reports bug, team thinks it's already fixed

**Warning Signs:**
- No `Platform.OS === 'android'` conditional styles
- Testing only on iOS simulator or single platform
- No screenshot comparisons between iOS/Android in PR review

**Prevention:**
1. **Cross-Platform Testing:** Test on both iOS simulator AND Android emulator before PR
2. **Platform-Specific Styles:** Use `Platform.select()` if needed for Android/iOS differences
3. **Visual Regression Tests:** Screenshot tests with Playwright for both platforms
4. **Device Farm:** Run on real devices via Firebase Test Lab or BrowserStack

**Phase:** Phase 1 (Bugfix) — low risk, but easy to miss

**Sources:**
- [React Native New Architecture Migration](https://dev.to/sherry_walker_bba406fb339/the-react-native-new-architecture-migration-process-for-2026-27l3)

---

### Pitfall 10: Profile Birthday Edit Invalidates Existing Celebrations

**Risk:** User changes birthday from "Jan 15" to "Jan 20" after celebrations already created. Existing celebration for Jan 15 persists, new one created for Jan 20, causing duplicate celebrations.

**What Goes Wrong:**
- User completes onboarding with birthday "1990-01-15"
- Auto-celebration created for Jan 15 across all groups
- User realizes mistake, edits profile to "1990-01-20"
- No cascade: old celebration remains, new one created
- Gift Leader assigned to Jan 15 celebration, but user expects Jan 20
- Group members confused about which celebration is real

**Warning Signs:**
- No database trigger on `users.birthday` update to cascade to `celebrations`
- Profile edit doesn't warn user "This will update X celebrations"
- No cleanup logic in Edge Function for stale celebrations

**Prevention:**
1. **Cascade Update:** Create trigger: `ON UPDATE users.birthday` → `UPDATE celebrations.event_date`
2. **Soft Delete:** Mark old celebration as `cancelled`, create new one
3. **User Confirmation:** Show modal "Changing birthday will update 3 celebrations. Continue?"
4. **One-Way Edit:** Only allow birthday edit during onboarding grace period (first 7 days)
5. **Admin Override:** Require group admin approval for birthday changes after celebration created

**Phase:** Phase 4 (Profile Editing) — edge case, but causes UX confusion

---

## Integration-Specific Warnings

### Multi-User Wishlist Domain
| Concern | Risk Area | Mitigation |
|---------|-----------|------------|
| **Concurrent Edits** | Multiple users edit same group's wishlists simultaneously | Use React Query optimistic updates with conflict resolution |
| **Cache Invalidation** | Stale favorite status after other user toggles | Subscribe to Realtime `wishlist_items` changes, invalidate on update |
| **Permission Drift** | RLS policies don't cover new `is_favorite` field | Test celebrant exclusion with new schema before deploy |

### React Native + Supabase Integration
| Concern | Risk Area | Mitigation |
|---------|-----------|------------|
| **Realtime Reconnect** | WebSocket drops on background/foreground transition | Implement `AppState` listener with manual reconnect |
| **Type Safety** | TypeScript types outdated after schema migration | Run `supabase gen types` in CI/CD pipeline post-migration |
| **Offline Behavior** | Mutations fail when offline, no retry queue | Use TanStack Query with offline support and retry logic |

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|-----------|-----------|
| **RLS Policy Risks** | HIGH | Verified celebrant exclusion is RLS-based in existing codebase, migration timing is critical |
| **Schema Migration Pitfalls** | HIGH | Found specific Supabase CLI bugs with CHECK constraints, reviewed DB migration best practices 2026 |
| **Realtime Sync Issues** | HIGH | Multiple sources confirm iOS/Android Realtime disconnect issues, common React Native problem |
| **Race Conditions** | MEDIUM | General concurrent update patterns well-documented, specific to profile editing extrapolated |
| **Favorite-Per-Group Constraint** | HIGH | Unique partial index is standard SQL pattern, requirement clearly states "one per group" |
| **Special Item Types** | MEDIUM | TypeScript enum pitfalls documented, NULL constraint migration is standard, but tier validation specifics extrapolated |
| **Android Layout Differences** | MEDIUM | Platform-specific CSS issues common in React Native, but star rating specifics assumed |
| **Birthday Edit Cascade** | LOW | Extrapolated from celebration auto-creation logic in PROJECT.md, no external sources on this specific edge case |

**Overall Confidence:** MEDIUM-HIGH (75%)

Research based on:
- Verified Supabase Realtime issues with mobile apps (iOS/Android disconnect patterns)
- Documented PostgreSQL migration best practices for constraint changes
- React Query cache invalidation patterns for multi-user apps
- Known React Native cross-platform rendering differences
- Wishlist app UX patterns from e-commerce domain research
- Existing codebase analysis (migrations, RLS policies, schema structure)

**Gaps:**
- No specific sources on "favorite-per-group" implementation in similar apps (extrapolated from requirement)
- Limited birthday cascade update precedent (edge case, low frequency)
- Android Fabric vs legacy renderer differences for star rating (assumption based on general knowledge)

---

## Sources

**State Management & Synchronization:**
- [React Native State Management Pitfalls](https://theonetechnologies.com/blog/post/optimizing-state-management-in-react-native-pitfalls-and-best-practices)
- [React Query Cache Invalidation](https://medium.com/@kennediowusu/react-query-cache-invalidation-why-your-mutations-work-but-your-ui-doesnt-update-a1ad23bc7ef1)
- [TanStack Query Invalidation Guide](https://tanstack.com/query/v4/docs/framework/react/guides/query-invalidation)

**Supabase Realtime & Concurrency:**
- [Supabase Realtime Troubleshooting](https://supabase.com/docs/guides/realtime/troubleshooting)
- [Reliable Realtime Updates Discussion](https://github.com/orgs/supabase/discussions/5641)
- [Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)

**Database Migration Safety:**
- [Laravel Database Migrations](https://laravel.com/docs/12.x/migrations)
- [Rails Migration Best Practices 2026](https://www.railscarma.com/blog/rails-data-migration-best-practices-guide/)
- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase CLI Check Constraint Bug](https://github.com/supabase/cli/issues/3483)

**Race Conditions & Concurrency:**
- [Race Conditions in React Native](https://dev.to/paulocappa/race-conditions-in-react-native-5bjb)
- [Data Concurrency and Consistency](https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/data-concurrency-and-consistency.html)

**TypeScript & Type Safety:**
- [TypeScript Enums in React Native](https://blog.logrocket.com/complete-guide-typescript-enums-react-native/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/docs/basic/troubleshooting/types/)

**React Native Architecture:**
- [React Native New Architecture Migration](https://dev.to/sherry_walker_bba406fb339/the-react-native-new-architecture-migration-process-for-2026-27l3)

**Wishlist UX Patterns:**
- [Designing Wishlists in E-Commerce](https://thestory.is/en/journal/designing-wishlists-in-e-commerce/)
- [Wishlist Implementation Mistakes](https://medium.com/@ShruShri/wishlist-an-underutilized-customer-engagement-tool-5add88104817)
