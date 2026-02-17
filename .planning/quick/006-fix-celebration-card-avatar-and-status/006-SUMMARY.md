---
phase: quick
plan: 006
subsystem: celebrations-ui
tags: [bugfix, ui, celebrations, avatar, status]
key-files:
  created:
    - supabase/migrations/20260218000001_add_overdue_status.sql
  modified:
    - components/celebrations/CelebrationCard.tsx
    - src/i18n/locales/en.json
    - src/i18n/locales/es.json
decisions:
  - Status computed dynamically from event_date, not stored status field
  - 7-day threshold for Active status (within 7 days)
  - Database schema allows overdue for future manual archival
metrics:
  duration: 2m 18s
  completed: 2026-02-17
---

# Quick 006: Fix Celebration Card Avatar and Status Summary

Dynamic status computation based on event_date with avatar empty-string fix

## One-Liner

Celebration cards now compute status dynamically from event_date (Overdue/Active/Upcoming) and properly handle empty avatar URLs

## Commits

| # | Hash | Type | Description |
|---|------|------|-------------|
| 1 | acbcbfd | chore | Add overdue status to celebrations constraint |
| 2 | 32baae2 | feat | Add overdue status translation keys |
| 3 | 640cef2 | fix | Fix avatar display and add dynamic status computation |

## What Changed

### Database Migration
- Added `overdue` to celebrations status CHECK constraint
- Allows manual archival of past celebrations in future admin features
- Backward compatible - only adds a new allowed value

### Translation Keys
- Added `celebrations.status.overdue` to en.json ("Overdue")
- Added `celebrations.status.overdue` to es.json ("Vencido")

### CelebrationCard Component

**Avatar Fix:**
- Changed `{celebrantAvatar ?` to `{celebrantAvatar && celebrantAvatar.length > 0 ?`
- Empty strings (`""`) are truthy in JavaScript but fail to render as images
- Now properly falls back to initials placeholder

**Status Computation:**
- Replaced `getStatusInfo(status)` with `getDisplayStatus(celebration)`
- Status now computed dynamically from `event_date`:
  - **Completed** (gray): Manual completion respected
  - **Overdue** (red `#ef4444`): Past dates not marked completed
  - **Active** (green `#22c55e`): Within 7 days of today
  - **Upcoming** (blue `#3b82f6`): More than 7 days away

## Verification

- [x] Migration file valid SQL syntax
- [x] Translation keys present in both en.json and es.json
- [x] TypeScript passes for CelebrationCard.tsx (no new errors)
- [x] JSON files pass Prettier formatting check

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- FOUND: supabase/migrations/20260218000001_add_overdue_status.sql
- FOUND: components/celebrations/CelebrationCard.tsx (modified)
- FOUND: src/i18n/locales/en.json (modified)
- FOUND: src/i18n/locales/es.json (modified)

Commits verified:
- FOUND: acbcbfd
- FOUND: 32baae2
- FOUND: 640cef2
