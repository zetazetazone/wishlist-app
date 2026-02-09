---
phase: quick-004
plan: 01
subsystem: personal-details
tags: [profile, delivery-address, bank-details, visibility]
dependency-graph:
  requires: [personal_details table, preferences JSONB column]
  provides: [DeliveryAddress type, BankDetails type, PersonalDetailsVisibility type, delivery/bank form sections, visibility toggles]
  affects: [personal-details screen, member profile, profile completeness]
tech-stack:
  added: []
  patterns: [JSONB nested storage, visibility-based UI, partial masking]
key-files:
  created:
    - components/profile/DeliveryAddressSection.tsx
    - components/profile/BankDetailsSection.tsx
    - components/profile/VisibilityToggle.tsx
  modified:
    - types/database.types.ts
    - lib/personalDetails.ts
    - lib/profileCompleteness.ts
    - app/(app)/settings/personal-details.tsx
    - components/profile/PersonalDetailsReadOnly.tsx
    - app/(app)/member/[id].tsx
decisions:
  - Store delivery_address, bank_details, visibility in preferences JSONB column (no schema migration)
  - Expose nested fields at top level in TypedPersonalDetails for cleaner API
  - Visibility options: friends_only (default) and public
  - Partial masking shows last 4 characters of IBAN/account numbers
metrics:
  duration: ~5 minutes
  completed: 2026-02-09
---

# Quick Task 004: Add Delivery Address and Bank Details to Personal Details Summary

**One-liner:** Extended personal details with delivery address, bank details, and visibility toggles stored in preferences JSONB column.

## Changes Made

### Task 1: Type Definitions and Service Layer
**Commit:** `54984a3`

Extended the type system and service layer to support new fields:

- Added `DeliveryAddress` interface (street, city, postal_code, country)
- Added `BankDetails` interface (account_holder, iban, account_number, bank_name)
- Added `VisibilitySetting` type ('friends_only' | 'public')
- Added `PersonalDetailsVisibility` interface
- Extended `TypedPersonalDetails` to include new fields at top level
- Updated `getPersonalDetails()` to extract nested fields from preferences JSONB
- Updated `upsertPersonalDetails()` to merge new fields into preferences JSONB
- Updated `calculateCompleteness()` to include 2 new sections (8 total)

**Key pattern:** Store new fields in existing `preferences` JSONB column to avoid database migrations. Extract and expose at top level for cleaner consumer API.

### Task 2: Form Components
**Commit:** `9cdf325`

Created three new profile components:

1. **DeliveryAddressSection.tsx** (115 lines)
   - Street, city, postal code, country inputs
   - Follows SizesSection component pattern
   - HStack layout for city/postal code row

2. **BankDetailsSection.tsx** (150 lines)
   - Account holder, IBAN, account number, bank name inputs
   - Security note with shield icon
   - Field hints explaining IBAN vs account number

3. **VisibilityToggle.tsx** (140 lines)
   - Segmented control pattern with icons
   - Friends Only (account-group) / Public (earth)
   - Contextual hint text explaining visibility

### Task 3: UI Integration
**Commit:** `2bfe625`

Integrated new sections into personal details forms:

- **Personal Details Screen:** Added visibility toggles before each section, state management for new fields, updated save handler
- **PersonalDetailsReadOnly:** Added delivery/bank sections with visibility checks, partial masking for sensitive data, section header icons
- **Member Profile Screen:** Updated to pass new props and calculate completeness with new sections

## Architecture Decisions

1. **JSONB Storage Strategy:** New fields stored in `preferences` JSONB column as nested objects (`preferences.delivery_address`, `preferences.bank_details`, `preferences.visibility`). This avoids schema migrations while maintaining flexibility.

2. **Visibility Logic:**
   - `friends_only` (default): Visible only when `isGroupMember` is true
   - `public`: Visible to all authenticated users

3. **Data Masking:** IBAN and account numbers partially masked (last 4 chars visible) in read-only views for privacy.

4. **Completeness Calculation:** Profile now has 8 sections (was 6):
   - Clothing sizes
   - Favorite colors
   - Favorite brands
   - Interests
   - Dislikes
   - External wishlists
   - Delivery address (street OR city filled)
   - Bank details (IBAN OR account number filled)

## Verification Results

- TypeScript compilation: Pass (no new errors)
- DeliveryAddressSection: 115 lines (min: 60)
- BankDetailsSection: 150 lines (min: 50)
- VisibilityToggle: 140 lines (min: 30)
- All key_links patterns satisfied

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] components/profile/DeliveryAddressSection.tsx exists
- [x] components/profile/BankDetailsSection.tsx exists
- [x] components/profile/VisibilityToggle.tsx exists
- [x] Commit 54984a3 exists
- [x] Commit 9cdf325 exists
- [x] Commit 2bfe625 exists
