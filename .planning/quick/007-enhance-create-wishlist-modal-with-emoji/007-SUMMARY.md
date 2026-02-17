---
phase: quick-007
plan: 01
subsystem: wishlists
tags: [wishlist, modal, visibility, owner-type, friends, i18n]
dependency_graph:
  requires: [friends-system, multi-wishlist]
  provides: [wishlist-visibility, wishlist-owner-types]
  affects: [CreateWishlistModal, wishlists-table]
tech_stack:
  added: []
  patterns: [segmented-control, radio-group, friend-picker]
key_files:
  created:
    - supabase/migrations/20260218000002_add_wishlist_owner_fields.sql
  modified:
    - types/database.types.ts
    - lib/wishlists.ts
    - components/wishlist/CreateWishlistModal.tsx
    - src/i18n/locales/en.json
    - src/i18n/locales/es.json
decisions:
  - owner_type CHECK constraint validates field combinations at DB level
  - for_user_id uses ON DELETE SET NULL to preserve wishlist if friend removed
  - Friend picker loads on demand (only when other_user selected)
metrics:
  duration: 3m24s
  completed: 2026-02-17
---

# Quick Task 007: Enhance CreateWishlistModal with Visibility and Owner Controls

Enhanced the CreateWishlistModal with visibility toggle (public/private/friends) and owner type selection (self/other_manual/other_user) with associated form fields for name entry and friend selection.

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 118195c | feat | Add owner fields to wishlists table (migration) |
| 5a7b017 | feat | Add owner types to wishlists module |
| cff0ed7 | feat | Add visibility and owner controls to CreateWishlistModal |

## Implementation Details

### Database Schema (Task 1)

Added three columns to `wishlists` table:
- `owner_type TEXT DEFAULT 'self'` - Who the wishlist is for (self/other_manual/other_user)
- `for_user_id UUID REFERENCES users(id)` - Friend's user_id when owner_type='other_user'
- `for_name TEXT` - Name string when owner_type='other_manual'

CHECK constraint ensures proper field population:
- `owner_type='self'` requires no additional fields
- `owner_type='other_manual'` requires `for_name` NOT NULL
- `owner_type='other_user'` requires `for_user_id` NOT NULL

### TypeScript Types (Task 2)

Added to `types/database.types.ts`:
- `owner_type`, `for_name`, `for_user_id` columns in Row/Insert/Update

Added to `lib/wishlists.ts`:
- `WishlistOwnerType = 'self' | 'other_manual' | 'other_user'`
- `WishlistVisibility = 'public' | 'private' | 'friends'`

### UI Controls (Task 3)

**Visibility Selector** (segmented control):
- Public (globe icon) - default
- Private (lock icon)
- Friends Only (users icon)

**Owner Type Selector** (radio group):
- For myself (account icon) - default
- For someone else (account-edit icon) - shows name input
- For a friend (account-heart icon) - shows friend picker

**Friend Picker**:
- Loads friends list on demand via `getFriends()`
- Shows avatar, name, and checkmark for selected
- Shows "no friends yet" message if empty

**Form Validation**:
- Name required for all wishlists
- `forName` required when owner_type='other_manual'
- `forUserId` required when owner_type='other_user'

### Localization

Added 11 translation keys to both en.json and es.json under `wishlists`:
- visibility, public, private, friendsOnly
- ownerType, forMyself, forOther, forFriend
- enterName, selectFriend, noFriendsYet

## Files Modified

| File | Lines | Changes |
|------|-------|---------|
| 20260218000002_add_wishlist_owner_fields.sql | 31 | New migration |
| types/database.types.ts | +9 | Three new columns in wishlists |
| lib/wishlists.ts | +6 | Two type exports |
| CreateWishlistModal.tsx | +368 | Full rewrite with new controls |
| en.json | +11 | Translation keys |
| es.json | +11 | Translation keys |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] Migration file exists: `supabase/migrations/20260218000002_add_wishlist_owner_fields.sql`
- [x] Contains `ADD COLUMN owner_type`: confirmed
- [x] CreateWishlistModal.tsx exceeds 300 lines: 743 lines
- [x] Commit 118195c exists: confirmed
- [x] Commit 5a7b017 exists: confirmed
- [x] Commit cff0ed7 exists: confirmed
