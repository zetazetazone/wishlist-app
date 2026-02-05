---
phase: 18
plan: 02
subsystem: data-access
tags: [typescript, types, service-layer, supabase, rpc, claims, personal-details, member-notes]
depends_on:
  requires: ["18-01"]
  provides: ["typed-database-types", "claims-service", "personal-details-service", "member-notes-service"]
  affects: ["19-gift-claiming-ui", "20-personal-details-ui", "21-split-contributions-ui", "22-member-notes-ui"]
tech-stack:
  added: []
  patterns: ["rpc-wrapper-functions", "batch-profile-enrichment", "upsert-on-unique", "typed-jsonb-interfaces"]
key-files:
  created:
    - lib/claims.ts
    - lib/personalDetails.ts
    - lib/memberNotes.ts
  modified:
    - types/database.types.ts
decisions:
  - "JSONB columns typed via separate interfaces (PersonalSizes, PersonalPreferences, ExternalLink) rather than inline"
  - "Claims service uses RPC for mutations (claimItem, unclaimItem) and direct queries for reads (getClaimsForItems)"
  - "getItemClaimStatus returns empty array (not error) when RPC fails, matching graceful degradation pattern"
  - "personalDetails upsert casts typed interfaces through unknown to satisfy Supabase JSONB column types"
  - "All service functions return enriched types with user profiles via batch-fetch pattern from contributions.ts"
metrics:
  duration: "2m 16s"
  completed: "2026-02-05"
---

# Phase 18 Plan 02: TypeScript Types & Service Libraries Summary

**One-liner:** Row/Insert/Update types for 3 v1.3 tables plus service modules wrapping RPC and query operations with typed JSONB interfaces and batch profile enrichment.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Add v1.3 table types and convenience exports | 3f346c5 | types/database.types.ts |
| 2 | Create service libraries for claims, details, notes | 487d4b3 | lib/claims.ts, lib/personalDetails.ts, lib/memberNotes.ts |

## What Was Built

### Database Types (types/database.types.ts)
- **gift_claims** table type with Row/Insert/Update shapes (id, wishlist_item_id, claimed_by, claim_type, amount, status, timestamps)
- **member_notes** table type with Row/Insert/Update shapes (id, group_id, about_user_id, author_id, content, created_at)
- **personal_details** table type with Row/Insert/Update shapes (id, user_id, sizes, preferences, external_links, timestamps)
- Convenience exports: `GiftClaim`, `PersonalDetails`, `MemberNote`
- JSONB shape interfaces: `PersonalSizes`, `PersonalPreferences`, `PreferenceTag`, `ExternalLink`

### Claims Service (lib/claims.ts)
- `claimItem(itemId, claimType, amount?)` -- wraps `claim_item()` RPC for atomic claiming
- `unclaimItem(claimId)` -- wraps `unclaim_item()` RPC for instant unclaim
- `getItemClaimStatus(itemIds)` -- wraps `get_item_claim_status()` RPC for celebrant-safe boolean checks
- `getClaimsForItems(itemIds)` -- direct query with batch profile enrichment for non-owner view

### Personal Details Service (lib/personalDetails.ts)
- `getPersonalDetails(userId)` -- fetches with typed JSONB casting
- `upsertPersonalDetails(details)` -- creates or updates via UPSERT on user_id unique constraint

### Member Notes Service (lib/memberNotes.ts)
- `getNotesAboutUser(groupId, aboutUserId)` -- fetches with author profile enrichment
- `createNote(groupId, aboutUserId, content)` -- client-side + DB CHECK validation (280 char max)
- `deleteNote(noteId)` -- author-only delete (no update by design)

## Decisions Made

1. **JSONB typing via separate interfaces**: PersonalSizes, PersonalPreferences, ExternalLink defined as standalone interfaces rather than inline types, enabling reuse across UI components in phases 20-22.
2. **RPC for mutations, queries for reads**: Claims mutations use RPC wrappers (atomic, race-safe); reads use direct Supabase queries through RLS.
3. **Graceful degradation on read errors**: getItemClaimStatus and getClaimsForItems return empty arrays on error rather than throwing, matching the pattern in getNotesAboutUser.
4. **JSONB cast through unknown**: personalDetails upsert casts typed interfaces through `unknown` to satisfy Supabase's generic JSONB column types without losing type safety at the call site.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- TypeScript compilation: no new errors (only pre-existing FlashList/Deno issues)
- All 3 table entries verified in database.types.ts
- All convenience types exported and importable
- All service function signatures match plan specification

## Next Phase Readiness

Phase 18 is now fully complete. Phases 19-22 can import:
- Types from `types/database.types` (GiftClaim, PersonalDetails, MemberNote, JSONB interfaces)
- Service functions from `lib/claims`, `lib/personalDetails`, `lib/memberNotes`
