---
phase: 27-public-dates-management
plan: 01
status: complete
subsystem: Public Dates Foundation
tags: [service-layer, ui-components, date-handling, crud]
dependency_graph:
  requires:
    - Phase 23 (public_dates table schema and RLS policies)
  provides:
    - lib/publicDates.ts service functions (getMyPublicDates, createPublicDate, updatePublicDate, deletePublicDate)
    - components/profile/PublicDateCard.tsx display component
  affects:
    - Phase 27 Plan 02 (will use PublicDateCard and service functions)
tech_stack:
  added:
    - lib/publicDates.ts (TypeScript service module)
    - components/profile/PublicDateCard.tsx (React Native component)
  patterns:
    - Service layer pattern (following lib/friends.ts)
    - Card component pattern (following FriendCard.tsx)
    - Month offset handling (database 1-12, Date constructor 0-11)
key_files:
  created:
    - lib/publicDates.ts: "Public dates CRUD service with types and functions"
    - components/profile/PublicDateCard.tsx: "Reusable card for displaying public dates"
decisions:
  - decision: "Use month - 1 when constructing Date objects for formatting"
    rationale: "JavaScript Date constructor expects 0-indexed months (0-11), but database stores 1-indexed (1-12)"
    impact: "Prevents off-by-one month errors in display"
  - decision: "Calendar heart icon for public dates"
    rationale: "Distinguishes public dates from friend cards while maintaining visual consistency"
    impact: "Consistent iconography across date-related features"
  - decision: "Separate onEdit and onDelete handlers"
    rationale: "Card tap for edit, explicit delete button for destructive action"
    impact: "Prevents accidental deletions"
metrics:
  duration_minutes: 2
  completed: 2026-02-10T11:42:12Z
  tasks_completed: 2/2
  commits: 2
  files_created: 2
  files_modified: 0
  lines_added: 334
---

# Phase 27 Plan 01: Public Dates Service & Card Component

Service layer and display component for public dates management - types, CRUD operations, and card UI.

## Tasks Completed

### Task 1: Create public dates service library (3a446e7)
**Files:** lib/publicDates.ts

Created TypeScript service module following lib/friends.ts pattern:

**Types:**
- `PublicDate` interface matching database schema (id, user_id, title, description, month, day, year, timestamps)
- `PublicDateInput` interface for create/update operations (title, description, month, day, year)

**Functions:**
- `getMyPublicDates()`: Fetch current user's public dates, ordered by month/day (chronological)
- `createPublicDate(input)`: Insert new public date with trimmed strings and null-coalesced year
- `updatePublicDate(id, input)`: Partial update with automatic updated_at timestamp
- `deletePublicDate(id)`: Delete with RLS enforcement

**Key Implementation Details:**
- Returns empty array on auth failure (graceful degradation)
- Throws errors on CRUD failures for proper error handling
- Documents month indexing (1-12 in DB, 0-11 in JS Date)
- Trims title and description, converts empty strings to null

### Task 2: Create PublicDateCard component (0c8b61c)
**Files:** components/profile/PublicDateCard.tsx

Created React Native card component following FriendCard.tsx pattern:

**Display Structure:**
- Left: Calendar heart icon (56x56 burgundy circle)
- Center: Title (bold burgundy), formatted date (MMMM d), year indicator, optional description
- Right: Delete button (trash icon, red)

**Date Formatting:**
- Uses `format(new Date(2000, date.month - 1, date.day), 'MMMM d')` from date-fns
- Shows "(Annual)" for null year, "(2026)" for specific year
- Critical documentation: month - 1 offset for Date constructor

**Styling:**
- White card with gold border, burgundy accents
- Staggered slide-in animation (150ms base + 50ms per index)
- Follows theme constants (colors, spacing, borderRadius, shadows)

**Interaction:**
- Entire card tappable for edit
- Separate delete button with hit slop for accessibility
- Active opacity feedback on press

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

✅ **TypeScript compilation:** Both files compile successfully
✅ **Service exports:** 4 async functions (getMyPublicDates, createPublicDate, updatePublicDate, deletePublicDate)
✅ **Component exports:** PublicDateCard function and default export
✅ **Date formatting:** Correct month offset (month - 1) documented and implemented
✅ **Pattern consistency:** Follows lib/friends.ts and FriendCard.tsx patterns

## Success Criteria

- [x] lib/publicDates.ts exports PublicDate type, PublicDateInput type, and 4 CRUD functions
- [x] components/profile/PublicDateCard.tsx exports functional component with proper typing
- [x] Both files compile without TypeScript errors
- [x] Date formatting correctly handles 1-indexed database months

## Next Phase Readiness

**Phase 27 Plan 02 (Public Dates Screen):**
- ✅ Service functions ready for screen integration
- ✅ Card component ready for FlatList rendering
- ✅ Types available for form state management

**Blockers:** None

**Concerns:** None

## Self-Check: PASSED

**Created files verified:**
```bash
✓ lib/publicDates.ts exists
✓ components/profile/PublicDateCard.tsx exists
```

**Commits verified:**
```bash
✓ 3a446e7 feat(27-01): create public dates service library
✓ 0c8b61c feat(27-01): create PublicDateCard component
```

**Exports verified:**
```bash
✓ 2 interfaces exported from lib/publicDates.ts
✓ 4 async functions exported from lib/publicDates.ts
✓ PublicDateCard function exported from component
✓ Default export present in component
```

**Critical patterns verified:**
```bash
✓ Month offset documented: "month - 1 because Date constructor uses 0-indexed months"
✓ Date formatting uses: new Date(2000, date.month - 1, date.day)
✓ Service pattern matches lib/friends.ts
✓ Card pattern matches FriendCard.tsx
```
