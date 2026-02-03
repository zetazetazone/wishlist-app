---
phase: 02-celebrations-coordination
plan: 02
subsystem: chat-contributions
tags: [supabase-realtime, chat, contributions, flashlist, react-native]
dependency-graph:
  requires: [02-01-celebrations-foundation]
  provides: [realtime-chat, contribution-tracking, chat-ui-components]
  affects: []
tech-stack:
  added: []
  patterns: [realtime-subscription-cleanup, upsert-contribution, deduplicate-by-id]
key-files:
  created:
    - lib/chat.ts
    - lib/contributions.ts
    - components/chat/ChatBubble.tsx
    - components/chat/ChatInput.tsx
    - components/chat/ChatList.tsx
    - components/celebrations/ContributionProgress.tsx
    - components/celebrations/ContributionModal.tsx
  modified:
    - app/(app)/celebration/[id].tsx
decisions:
  - id: chat-001
    decision: Realtime subscription with proper cleanup in useEffect return
    impact: Prevents memory leaks from orphaned channel subscriptions
  - id: chat-002
    decision: Batch fetch sender profiles and linked items to avoid N+1 queries
    impact: Efficient message loading with enriched data
  - id: contributions-001
    decision: UPSERT pattern for contributions (one per user per celebration)
    impact: Simplifies add/update flow, prevents duplicate contributions
metrics:
  duration: ~8 minutes
  completed: 2026-02-02
---

# Phase 02 Plan 02: Real-time Chat & Contribution Tracking Summary

Real-time secret chat and contribution tracking for celebration coordination, excluding celebrant via RLS.

## What Was Built

### Chat Library (lib/chat.ts)
Full CRUD and realtime subscription for chat messages:
- `getChatRoomForCelebration()` - Get chat room by celebration ID
- `getMessages()` - Fetch messages with sender/linked item enrichment
- `sendMessage()` - Send message with optional wishlist item link
- `useChatSubscription()` - React hook for realtime with cleanup
- `deleteMessage()` - Remove message (owner only via RLS)

**Key Pattern:** Race condition prevention documented - caller should fetch initial messages, then subscribe, and deduplicate by message ID.

### Contributions Library (lib/contributions.ts)
Per-celebration contribution tracking:
- `getContributions()` - All contributions with contributor info
- `addContribution()` - UPSERT pattern (insert or update)
- `updateContribution()` - Update existing contribution
- `getCelebrationTotal()` - Sum of all contributions
- `getCurrentUserContribution()` - User's own contribution
- `deleteContribution()` - Remove contribution

**Key Decision:** Per-celebration pot, not per-item. Gift Leader coordinates the fund.

### Chat UI Components
- **ChatBubble.tsx** - Message bubble with sender avatar, timestamp, linked item card
- **ChatInput.tsx** - Text input with send button, keyboard handling
- **ChatList.tsx** - FlashList with realtime subscription, empty state

### Contribution UI Components
- **ContributionProgress.tsx** - Progress bar (total vs optional target)
- **ContributionModal.tsx** - Bottom sheet for add/update contribution

### Celebration Detail Integration
Updated `app/(app)/celebration/[id].tsx` (1193 lines) with:
- Contribution section with progress bar and contributor list
- Chat section with ChatList and ChatInput
- KeyboardAvoidingView for proper keyboard handling
- Refresh contributions after modal save

## Security

All chat and contribution access enforced at RLS level:
- Celebrant CANNOT see chat messages (RLS blocks)
- Celebrant CANNOT see contributions (RLS blocks)
- Only message sender can delete their message
- Only contribution owner can update/delete their contribution

## Commits

| Hash | Type | Description |
|------|------|-------------|
| (part of v1.0) | feat | Add real-time chat utilities with subscription cleanup |
| (part of v1.0) | feat | Add contribution tracking with UPSERT pattern |
| (part of v1.0) | feat | Create chat UI components with FlashList |
| (part of v1.0) | feat | Integrate chat and contributions into celebration detail |

## Key Files

### Libraries
- `lib/chat.ts` - 355 lines, 5 exports, realtime subscription hook
- `lib/contributions.ts` - 313 lines, 6 exports, UPSERT pattern

### Components
- `components/chat/ChatBubble.tsx` - Message rendering with linked items
- `components/chat/ChatInput.tsx` - Input with send button
- `components/chat/ChatList.tsx` - FlashList with realtime updates
- `components/celebrations/ContributionProgress.tsx` - Progress visualization
- `components/celebrations/ContributionModal.tsx` - Contribution management

### Screens
- `app/(app)/celebration/[id].tsx` - 1193 lines with full chat and contribution integration

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| chat-001 | Cleanup realtime channel in useEffect return | Memory leak prevention critical for chat subscriptions |
| chat-002 | Batch profile and item fetches | Avoid N+1 queries on message list |
| contributions-001 | UPSERT on (celebration_id, user_id) | One contribution per user simplifies UI and data model |

## Deviations from Plan

None - plan executed as written. All components created, integrated, and tested.

## Testing Notes

**Chat functionality:**
1. Send message - appears immediately
2. Second device in same group - receives message in real-time
3. Linked wishlist item - displays as tappable card in message

**Celebrant exclusion (SECURITY CRITICAL):**
1. Log in as celebrant
2. Navigate to your own celebration
3. Chat section should not be visible / return empty
4. If chat is visible, RLS is broken

**Contributions:**
1. Add contribution - progress bar updates
2. Update contribution - amount changes
3. Multiple users contribute - all visible in list

## Files Created/Modified

**Created:**
- lib/chat.ts
- lib/contributions.ts
- components/chat/ChatBubble.tsx
- components/chat/ChatInput.tsx
- components/chat/ChatList.tsx
- components/celebrations/ContributionProgress.tsx
- components/celebrations/ContributionModal.tsx

**Modified:**
- app/(app)/celebration/[id].tsx (integrated chat and contributions)
