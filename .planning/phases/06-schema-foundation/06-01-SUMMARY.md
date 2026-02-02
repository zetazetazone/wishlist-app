---
phase: 06-schema-foundation
plan: 01
subsystem: database
tags: [postgresql, supabase, rls, migrations, typescript]

# Dependencies
requires: []
provides:
  - group_favorites table with RLS
  - wishlist_items.item_type column
  - wishlist_items.mystery_box_tier column
  - wishlist_items.surprise_me_budget column
  - TypeScript types for new schema
affects:
  - phase-08 (Special Item Types - uses item_type)
  - phase-09 (Favorite Marking - uses group_favorites)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CHECK constraints for flexible type validation (vs ENUM)
    - Cross-column constraints for data integrity
    - Security definer functions to avoid RLS recursion

# Files
key-files:
  created:
    - supabase/migrations/20260202000011_schema_foundation.sql
  modified:
    - types/database.types.ts

# Decisions
decisions:
  - id: D-0601-1
    choice: CHECK constraint over ENUM for item_type
    rationale: ENUMs cannot have values removed safely; CHECK constraints are more flexible for future changes
    outcome: pending

# Metrics
duration: ~5 minutes
completed: 2026-02-02
---

# Phase 6 Plan 1: Schema Foundation Summary

**One-liner:** PostgreSQL schema extension adding item_type, mystery_box_tier columns to wishlist_items and group_favorites table with RLS policies

## Objective Achieved

Extended the database schema to support Phase 8 (Special Item Types) and Phase 9 (Favorite Marking) by:
1. Adding new columns to wishlist_items for item type classification
2. Creating group_favorites table for favorite marking functionality
3. Implementing proper RLS policies using existing security patterns

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create schema foundation migration | 78875ee | supabase/migrations/20260202000011_schema_foundation.sql |
| 2 | Update TypeScript types | 22374b1 | types/database.types.ts |

## What Was Built

### Schema Changes (Migration 20260202000011)

**wishlist_items extensions:**
- `item_type TEXT CHECK (item_type IN ('standard', 'surprise_me', 'mystery_box')) DEFAULT 'standard'`
- `mystery_box_tier NUMERIC CHECK (mystery_box_tier IN (25, 50, 100))`
- `surprise_me_budget NUMERIC` (nullable)
- Cross-column constraint: `mystery_box_tier_requires_type` ensures tier only set for mystery_box items

**group_favorites table:**
- `id UUID PRIMARY KEY`
- `user_id UUID REFERENCES users(id)`
- `group_id UUID REFERENCES groups(id)`
- `item_id UUID REFERENCES wishlist_items(id)`
- `created_at`, `updated_at` timestamps
- `UNIQUE(user_id, group_id)` enforces one favorite per user per group

**RLS Policies (4 total):**
- SELECT: Users can view favorites in their groups (via `is_group_member()`)
- INSERT: Users can insert own favorites in their groups
- UPDATE: Users can update own favorites
- DELETE: Users can delete own favorites

**Performance Indexes:**
- `idx_wishlist_items_type` on item_type
- `idx_group_favorites_user` on user_id
- `idx_group_favorites_group` on group_id
- `idx_group_favorites_item` on item_id

### TypeScript Types

Updated `types/database.types.ts` with:
- `wishlist_items.item_type: 'standard' | 'surprise_me' | 'mystery_box'`
- `wishlist_items.mystery_box_tier: 25 | 50 | 100 | null`
- `wishlist_items.surprise_me_budget: number | null`
- `group_favorites` table with Row, Insert, Update types

## Decisions Made

### D-0601-1: CHECK constraint over ENUM for item_type
- **Context:** Need to validate item_type values (standard, surprise_me, mystery_box)
- **Options:** PostgreSQL ENUM vs TEXT with CHECK constraint
- **Decision:** CHECK constraint
- **Rationale:** ENUMs cannot have values removed once created (requires ALTER TYPE which is expensive). CHECK constraints can be modified with simple ALTER TABLE. Research confirmed this is Supabase/PostgreSQL best practice.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed FK reference to user_profiles (which is a view)**
- **Found during:** Task 1 migration push
- **Issue:** Migration referenced `user_profiles` but that's a view, not a table
- **Fix:** Changed FK to reference `public.users` table directly
- **Files modified:** supabase/migrations/20260202000011_schema_foundation.sql
- **Commit:** 78875ee (amended)

## Verification Results

- [x] Migration applied successfully to remote Supabase (NOTICE messages confirmed)
- [x] TypeScript types contain group_favorites table
- [x] TypeScript types contain item_type union type
- [x] TypeScript types contain mystery_box_tier union type
- [x] No new TypeScript compilation errors (pre-existing errors remain)

## Success Criteria Status

From ROADMAP.md Phase 6 Success Criteria:

| Criteria | Status |
|----------|--------|
| Database supports group_favorites table with proper RLS policies | PASS |
| Database supports item_type (standard, surprise_me, mystery_box) | PASS |
| Schema migrations apply cleanly without breaking existing data | PASS |
| All RLS policies enforce correct access control for new features | PASS |

## Next Phase Readiness

**Phase 7 (Profile Editing):** Ready - no dependency on this phase
**Phase 8 (Special Item Types):** Ready - item_type column now exists
**Phase 9 (Favorite Marking):** Ready - group_favorites table with RLS now exists
