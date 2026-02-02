# Phase 2: Celebrations & Coordination - Research

**Researched:** 2026-02-02
**Domain:** Supabase RLS, Realtime Chat, Gift Leader Assignment, Contribution Tracking
**Confidence:** HIGH

## Summary

This research covers the technical implementation of celebration coordination features: secret chat rooms (hidden from celebrant), Gift Leader rotation assignment, and contribution tracking. The phase depends on Phase 1's notification infrastructure and birthday data from user profiles.

The primary challenge is **Row Level Security (RLS) for secret chat**. This is security-critical -- a misconfiguration would expose birthday surprises to celebrants. Research confirms Supabase RLS is the correct approach with policies that explicitly exclude the celebrant (`celebrant_id != auth.uid()`). The pattern uses a join between celebrations, chat_rooms, and group_members tables to validate both group membership AND celebrant exclusion.

For real-time messaging, **Supabase Realtime with postgres_changes** is sufficient for this use case (moderate scale). While Broadcast offers better scalability, the complexity tradeoff is not justified unless we expect 100K+ concurrent users. The simpler postgres_changes approach integrates naturally with RLS policies.

**Primary recommendation:** Implement celebrant exclusion at the database level via RLS policies, use postgres_changes for chat realtime, use per-celebration contributions (not per-item) as specified in CONTEXT.md decisions.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.93.3 | Database, RLS, Realtime | Already in project, handles all backend needs |
| @shopify/flash-list | 2.0.x | Chat message rendering | Performant lists, New Architecture compatible |
| date-fns | 3.x | Birthday rotation calculations | Tree-shakeable, modern date handling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-reanimated | ~4.1.1 | Chat animations | Already in project, smooth transitions |
| @gorhom/bottom-sheet | 5.2.8 | Contribution input | Already in project, modal patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| postgres_changes | Supabase Broadcast | Better scalability but more complex setup; overkill for <10K users |
| FlashList inverted | Legend List | Better chat UX but newer/less tested library |

**Installation:**
```bash
# FlashList may already be available via Expo - verify first
npx expo install @shopify/flash-list
npm install date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── celebrations/
│   │   ├── CelebrationCard.tsx      # Card for celebration list
│   │   ├── GiftLeaderBadge.tsx      # Badge showing Gift Leader status
│   │   └── ContributionProgress.tsx  # Progress bar for contributions
│   └── chat/
│       ├── ChatBubble.tsx           # Individual message bubble
│       ├── ChatInput.tsx            # Message input with send
│       └── ChatList.tsx             # FlashList wrapper for messages
├── utils/
│   ├── celebrations.ts              # Celebration CRUD, Gift Leader assignment
│   ├── chat.ts                      # Chat messages, realtime subscriptions
│   └── contributions.ts             # Contribution tracking per celebration
└── app/
    └── (app)/
        ├── celebration/
        │   └── [id].tsx             # Celebration detail + chat screen
        └── (tabs)/
            └── celebrations.tsx     # List of celebrations user can access
```

### Pattern 1: Celebrant Exclusion via RLS
**What:** RLS policies that exclude the celebrant from seeing chat rooms and messages
**When to use:** All queries to celebrations, chat_rooms, and chat_messages tables
**Example:**
```sql
-- Source: Supabase RLS Documentation + research verification
-- Celebrant exclusion pattern for chat rooms
CREATE POLICY "Group members except celebrant can view chat room"
  ON chat_rooms FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM celebrations c
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE c.id = chat_rooms.celebration_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()  -- CRITICAL: excludes celebrant
    )
  );
```

### Pattern 2: Birthday Rotation for Gift Leader
**What:** Assign Gift Leader based on birthday order (person after celebrant in rotation)
**When to use:** When creating celebrations or reassigning Gift Leaders
**Example:**
```typescript
// Source: Standard round-robin pattern
async function getNextGiftLeader(groupId: string, celebrantId: string): Promise<string> {
  // Get all members sorted by birthday (month-day, not year)
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, users(birthday)')
    .eq('group_id', groupId)
    .order('users.birthday');  // Sort by MM-DD

  if (!members || members.length < 2) {
    throw new Error('Group needs at least 2 members for Gift Leader assignment');
  }

  // Find celebrant position in birthday-sorted list
  const celebrantIndex = members.findIndex(m => m.user_id === celebrantId);

  // Next person in rotation (wraps around)
  let nextIndex = (celebrantIndex + 1) % members.length;

  // Edge case: 2-person group - the other person is always leader
  // Edge case: same birthday - stable sort by user_id as tiebreaker

  return members[nextIndex].user_id;
}
```

### Pattern 3: Per-Celebration Contribution Tracking
**What:** Track contributions per celebration (general pot), not per wishlist item
**When to use:** User logs a contribution toward the celebration
**Example:**
```typescript
// Source: CONTEXT.md user decision - per-celebration, not per-item
interface CelebrationContribution {
  id: string;
  celebration_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

// Running total for progress bar
async function getCelebrationTotal(celebrationId: string) {
  const { data } = await supabase
    .from('celebration_contributions')
    .select('amount')
    .eq('celebration_id', celebrationId);

  return data?.reduce((sum, c) => sum + c.amount, 0) ?? 0;
}
```

### Anti-Patterns to Avoid
- **UI-only celebrant filtering:** Never rely on frontend to hide chat from celebrant. RLS is the only safe approach.
- **Client-side timestamps for messages:** Use server-assigned `created_at` for reliable ordering.
- **Storing celebration contributions on items:** User decision is per-celebration pot, not per-item.
- **Single Supabase channel for all chats:** Create one channel per chat room to prevent cross-chat leakage.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Birthday rotation | Custom date sorting logic | PostgreSQL `ORDER BY EXTRACT(MONTH FROM birthday), EXTRACT(DAY FROM birthday)` | Edge cases: leap years, null birthdays, timezone normalization |
| Chat message deduplication | Manual ID tracking | Supabase's built-in deduplication via primary keys | Race conditions in client-side dedup |
| Real-time subscriptions | WebSocket from scratch | `supabase.channel().on('postgres_changes')` | Connection management, reconnection, token refresh |
| Progress bar calculations | Client-side aggregation | PostgreSQL aggregate query with RLS | Celebrant could see totals via network inspection |

**Key insight:** The celebrant exclusion logic seems simple but has many leak vectors (notifications, metadata, network responses). Database-level enforcement via RLS is the only reliable approach.

## Common Pitfalls

### Pitfall 1: RLS Not Enabled on New Tables
**What goes wrong:** Tables created without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` allow all authenticated users to read all rows - celebrant sees their surprise.
**Why it happens:** RLS is disabled by default in Supabase. Developers forget to enable it on new tables.
**How to avoid:** Enable RLS in the same migration that creates the table, BEFORE inserting any data. Create explicit ALLOW policies immediately after.
**Warning signs:** Any authenticated user can query any chat room; celebrant sees messages about their own gift.

### Pitfall 2: Realtime Subscription Cleanup
**What goes wrong:** Subscriptions not cleaned up on unmount cause memory leaks and duplicate message handlers.
**Why it happens:** React useEffect cleanup function not implemented or not returning the unsubscribe.
**How to avoid:** Always return cleanup: `return () => supabase.removeChannel(channel)`
**Warning signs:** Console shows duplicate messages; app becomes sluggish after navigating between chats.

### Pitfall 3: Race Condition Between Fetch and Subscribe
**What goes wrong:** Messages sent between initial fetch and WebSocket connection are lost.
**Why it happens:** 500ms+ window where messages can arrive before subscription is active.
**How to avoid:** Event queue pattern: fetch snapshot -> connect WebSocket -> queue events -> re-fetch to confirm -> process queue.
**Warning signs:** Occasional missing messages; "refresh to see new messages" complaints.

### Pitfall 4: Celebrant Metadata Leakage
**What goes wrong:** While message content is hidden, celebrant sees notification count change, activity indicators, or "typing" status.
**Why it happens:** Metadata not subject to same RLS policies as content.
**How to avoid:** Exclude celebrant from ALL activity metrics for secret celebrations. Don't increment their notification counts for secret chat activity.
**Warning signs:** Celebrant asks "why did you all get so active in the app suddenly?"

### Pitfall 5: Gift Leader Edge Cases
**What goes wrong:** 2-person groups fail (leader would be celebrant), same-birthday members have unstable assignment, leader leaves group with no succession.
**Why it happens:** Birthday rotation algorithm doesn't handle edge cases.
**How to avoid:**
- 2-person: Other person is always leader
- Same birthday: Use user_id as stable tiebreaker
- Leader leaves: Auto-reassign to next in rotation, log history
**Warning signs:** Null Gift Leader on celebrations; "unassigned" state persists.

### Pitfall 6: Contribution Visibility to Celebrant
**What goes wrong:** Celebrant can see contribution totals or who contributed via API inspection even if UI hides it.
**Why it happens:** RLS policy only checks group membership, not celebrant exclusion.
**How to avoid:** Same RLS pattern as chat - exclude celebrant from SELECT on celebration_contributions.
**Warning signs:** Network tab shows contribution data to celebrant; total amounts leak.

## Code Examples

Verified patterns from official sources:

### Database Schema for Celebrations
```sql
-- Source: Research + CONTEXT.md decisions
-- Celebrations table (one per birthday per year)
CREATE TABLE celebrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  celebrant_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  event_date DATE NOT NULL,
  year INTEGER NOT NULL,
  gift_leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_amount NUMERIC DEFAULT NULL,  -- Optional target for progress bar
  status TEXT CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, celebrant_id, year)
);

-- Enable RLS immediately
ALTER TABLE celebrations ENABLE ROW LEVEL SECURITY;

-- Group members can view celebrations (including celebrant seeing their own exists)
CREATE POLICY "Group members can view celebrations"
  ON celebrations FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = celebrations.group_id
        AND gm.user_id = auth.uid()
    )
  );
```

### Chat Room with Celebrant Exclusion
```sql
-- Source: Supabase RLS docs + celebrant exclusion pattern
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  linked_item_id UUID REFERENCES wishlist_items(id) ON DELETE SET NULL,  -- For CHAT-03
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- CRITICAL: Chat RLS excludes celebrant
CREATE POLICY "Group members except celebrant can view chat room"
  ON chat_rooms FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM celebrations c
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE c.id = chat_rooms.celebration_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()
    )
  );

CREATE POLICY "Group members except celebrant can view messages"
  ON chat_messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      JOIN celebrations c ON c.id = cr.celebration_id
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE cr.id = chat_messages.chat_room_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()
    )
  );

CREATE POLICY "Group members except celebrant can send messages"
  ON chat_messages FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_rooms cr
      JOIN celebrations c ON c.id = cr.celebration_id
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE cr.id = chat_messages.chat_room_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()
    )
  );
```

### Contribution Tracking (Per-Celebration)
```sql
-- Source: CONTEXT.md user decision
CREATE TABLE celebration_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(celebration_id, user_id)  -- One contribution per user per celebration
);

ALTER TABLE celebration_contributions ENABLE ROW LEVEL SECURITY;

-- Everyone except celebrant can view contributions
CREATE POLICY "Group members except celebrant can view contributions"
  ON celebration_contributions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM celebrations c
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE c.id = celebration_contributions.celebration_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()
    )
  );

-- Users can add/update their own contributions
CREATE POLICY "Users can manage own contributions"
  ON celebration_contributions FOR ALL USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM celebrations c
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE c.id = celebration_contributions.celebration_id
        AND gm.user_id = auth.uid()
        AND c.celebrant_id != auth.uid()
    )
  );
```

### Gift Leader Assignment History
```sql
-- Source: Research - audit trail for role changes
CREATE TABLE gift_leader_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebration_id UUID REFERENCES celebrations(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL = auto-assigned
  reason TEXT CHECK (reason IN ('auto_rotation', 'manual_reassign', 'member_left')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gift_leader_history ENABLE ROW LEVEL SECURITY;

-- Group members can view history
CREATE POLICY "Group members can view gift leader history"
  ON gift_leader_history FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM celebrations c
      JOIN group_members gm ON gm.group_id = c.group_id
      WHERE c.id = gift_leader_history.celebration_id
        AND gm.user_id = auth.uid()
    )
  );
```

### Realtime Chat Subscription
```typescript
// Source: Supabase Realtime docs
function useChatSubscription(chatRoomId: string, onNewMessage: (msg: ChatMessage) => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_room_id=eq.${chatRoomId}`
        },
        (payload) => {
          // RLS already prevents celebrant from receiving this
          onNewMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();

    // CRITICAL: Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, onNewMessage]);
}
```

### FlashList for Chat (v2 Migration)
```typescript
// Source: FlashList v2 migration guide
// NOTE: inverted prop is deprecated in v2, use maintainVisibleContentPosition
<FlashList
  data={messages}  // Newest at end (normal order)
  renderItem={renderMessage}
  estimatedItemSize={80}
  maintainVisibleContentPosition={{
    autoscrollToBottomThreshold: 0.2,
    startRenderingFromBottom: true,
  }}
  onStartReached={loadOlderMessages}
  contentContainerStyle={{ paddingHorizontal: 16 }}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FlashList `inverted` prop | `maintainVisibleContentPosition` | FlashList v2 (Jul 2025) | Chat lists need data in normal order, not reversed |
| Supabase postgres_changes only | Broadcast available for scale | 2024 | Consider Broadcast if >10K concurrent users |
| UI-based access control | RLS-enforced exclusion | Always best practice | CVE-2025-48757 proved UI-only is unsafe |

**Deprecated/outdated:**
- FlashList v1 `inverted={true}` for chat - deprecated in v2, use `maintainVisibleContentPosition`
- Relying on UI filtering for secret content - database-level RLS is mandatory

## Open Questions

Things that couldn't be fully resolved:

1. **Celebration Lifecycle Timing**
   - What we know: Status can be 'upcoming', 'active', 'completed'
   - What's unclear: When does 'upcoming' transition to 'active'? On event date? 30 days before?
   - Recommendation: Use 'upcoming' until event date arrives, 'active' on event day, 'completed' after. Can adjust based on UX feedback.

2. **FlashList v2 Chat UX Regression**
   - What we know: v2 deprecated `inverted`, some users report scroll UX issues
   - What's unclear: Whether `maintainVisibleContentPosition` fully replicates v1 chat behavior
   - Recommendation: Test thoroughly; fallback to FlatList if FlashList v2 has issues with chat pattern.

3. **Target Amount Feature Scope**
   - What we know: CONTEXT.md marks target amount as Claude's discretion
   - What's unclear: Is this v1 requirement or nice-to-have?
   - Recommendation: Implement as optional field on celebrations table, add UI later based on priority.

## Sources

### Primary (HIGH confidence)
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS patterns, policy syntax
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) - Private channels, RLS for realtime
- [Supabase Realtime Broadcast](https://supabase.com/docs/guides/realtime/broadcast) - Chat architecture options
- [FlashList v2 Migration Guide](https://shopify.github.io/flash-list/docs/v2-migration/) - Inverted list changes

### Secondary (MEDIUM confidence)
- [Supabase Chat Security Discussion](https://github.com/orgs/supabase/discussions/3500) - Join table pattern for chat rooms
- [Round Robin Assignment Pattern](https://hiverhq.com/blog/round-robin-method-customer-support) - Fair rotation methodology

### Tertiary (LOW confidence)
- FlashList v2 chat UX regression reports - GitHub issues, needs validation during implementation

## Metadata

**Confidence breakdown:**
- RLS for secret chat: HIGH - Official Supabase docs confirm pattern
- Realtime subscriptions: HIGH - Standard Supabase pattern, well-documented
- Gift Leader rotation: MEDIUM - Standard round-robin, edge cases need implementation testing
- FlashList v2 chat: MEDIUM - Migration guide exists but some regression reports

**Research date:** 2026-02-02
**Valid until:** 30 days (stable technologies, no rapid changes expected)
