# Phase 21: Split Contributions & Claim Enhancements - Research

**Researched:** 2026-02-06
**Domain:** Gift coordination with split contributions, real-time notifications, and progress visualization
**Confidence:** HIGH

## Summary

This phase extends the existing gift claims system (Phase 18-19) to enable collaborative gift funding through split contributions. The core architecture is already in place: `gift_claims` table with `claim_type` ('full' or 'split') and `amount` column, RPC functions for atomic claiming, and RLS patterns for celebrant exclusion. The focus is on adding split contribution workflows, progress tracking, and notification triggers.

Key research findings:
1. **Split contributions** build on existing schema — no new tables needed, only new UI and logic flows
2. **Progress visualization** patterns exist (ContributionProgress, BudgetProgressBar) and can be adapted
3. **Push notifications** infrastructure is complete (expo-notifications, Edge Function, device_tokens table)
4. **Claim summaries** require aggregation queries but fit existing patterns

**Primary recommendation:** Leverage existing claims infrastructure, add contribution-specific RPC functions for split operations (pledge, close split), create notification triggers via Supabase database webhooks, and adapt ContributionProgress component for split funding UI.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-notifications | ^0.32.16 | Push notification handling | Official Expo solution for cross-platform notifications |
| @supabase/supabase-js | ^2.93.3 | Database client with RPC | Provides atomic operations and real-time subscriptions |
| react-native | 0.81.5 | Mobile UI framework | Project standard |
| PostgreSQL | Latest | Database with JSONB, triggers | Supabase standard, supports atomic operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date formatting | Already used for timestamp displays |
| @expo/vector-icons | ^15.0.3 | Icon library (MaterialCommunityIcons) | Already used throughout app |
| moti | ^0.30.0 | Animation library | Used for progress bar animations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RPC functions | Direct inserts | RPC provides atomicity and validation, critical for split logic |
| Database webhooks | Client-side notification logic | Webhooks ensure notifications even if app closed |
| expo-notifications | react-native-push-notification | expo-notifications is Expo standard, better integration |

**Installation:**
No new dependencies required — all libraries already present in package.json.

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── claims.ts              # Existing claim operations (claim_item, unclaim_item)
├── contributions.ts       # NEW: Split contribution operations
├── notifications.ts       # Existing notification setup
└── supabase.ts           # Database client

components/
├── wishlist/
│   ├── ClaimButton.tsx           # Extend for split toggle
│   ├── SplitContributionModal.tsx # NEW: Pledge UI
│   └── ContributorsDisplay.tsx    # NEW: Avatar row with amounts
└── celebrations/
    ├── ContributionProgress.tsx  # Adapt for split funding
    └── ClaimSummary.tsx         # NEW: Claim count display

supabase/
├── migrations/
│   └── 20260206000002_split_contributions.sql  # NEW: RPC functions, triggers
└── functions/
    └── push/index.ts            # Existing Edge Function (no changes)
```

### Pattern 1: Atomic Split Operations via RPC
**What:** All split contribution logic (pledge, close split, opt out) uses PostgreSQL RPC functions with SELECT FOR UPDATE for atomicity.

**When to use:** Any operation that modifies contribution state or checks funding status.

**Example:**
```sql
-- pledge_contribution: Add a split contribution to an item
CREATE OR REPLACE FUNCTION public.pledge_contribution(
  p_item_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item RECORD;
  v_user_id UUID;
  v_total_pledged NUMERIC;
  v_claim_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock the item to prevent concurrent modifications
  SELECT wi.id, wi.price, wi.user_id, wi.group_id
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = p_item_id
  FOR UPDATE;

  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Verify split is open (must have at least one split claim with claim_type='split')
  IF NOT EXISTS (
    SELECT 1 FROM public.gift_claims
    WHERE wishlist_item_id = p_item_id AND claim_type = 'split'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Split not open for this item');
  END IF;

  -- Check if user already pledged
  IF EXISTS (
    SELECT 1 FROM public.gift_claims
    WHERE wishlist_item_id = p_item_id AND claimed_by = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already pledged');
  END IF;

  -- Calculate total pledged so far
  SELECT COALESCE(SUM(amount), 0) INTO v_total_pledged
  FROM public.gift_claims
  WHERE wishlist_item_id = p_item_id AND claim_type = 'split';

  -- Check if pledge would exceed item price
  IF v_total_pledged + p_amount > v_item.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pledge exceeds remaining amount');
  END IF;

  -- Insert the pledge
  INSERT INTO public.gift_claims (wishlist_item_id, claimed_by, claim_type, amount)
  VALUES (p_item_id, v_user_id, 'split', p_amount)
  RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object('success', true, 'claim_id', v_claim_id);
END;
$$;
```

**Why this pattern:**
- SELECT FOR UPDATE prevents race conditions where multiple users pledge simultaneously
- Atomic validation ensures total pledges never exceed item price
- SECURITY DEFINER enforces RLS while maintaining atomicity
- Returns structured JSONB for consistent error handling

### Pattern 2: Database Webhooks for Notifications
**What:** Use Supabase database webhooks to trigger push notifications on claim events (split invite, fully funded, canceled).

**When to use:** Any event that requires notifying multiple users asynchronously.

**Example:**
```sql
-- Trigger function to notify contributors when split is fully funded
CREATE OR REPLACE FUNCTION public.notify_split_fully_funded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item RECORD;
  v_total_pledged NUMERIC;
  v_contributor RECORD;
BEGIN
  -- Get item details
  SELECT wi.id, wi.title, wi.price, wi.user_id
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = NEW.wishlist_item_id;

  -- Calculate total pledged
  SELECT COALESCE(SUM(amount), 0) INTO v_total_pledged
  FROM public.gift_claims
  WHERE wishlist_item_id = NEW.wishlist_item_id AND claim_type = 'split';

  -- If fully funded, notify all contributors
  IF v_total_pledged >= v_item.price THEN
    FOR v_contributor IN
      SELECT DISTINCT claimed_by
      FROM public.gift_claims
      WHERE wishlist_item_id = NEW.wishlist_item_id AND claim_type = 'split'
    LOOP
      INSERT INTO public.user_notifications (user_id, title, body, data)
      VALUES (
        v_contributor.claimed_by,
        'Split Fully Funded!',
        v_item.title || ' for [celebrant] is fully funded!',
        jsonb_build_object(
          'type', 'split_fully_funded',
          'item_id', v_item.id,
          'item_title', v_item.title
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to gift_claims table
CREATE TRIGGER trigger_notify_split_fully_funded
AFTER INSERT ON public.gift_claims
FOR EACH ROW
WHEN (NEW.claim_type = 'split')
EXECUTE FUNCTION public.notify_split_fully_funded();
```

**Why this pattern:**
- Database triggers ensure notifications fire even if client disconnects
- Webhook to Edge Function (existing `push` function) handles Expo Push Service
- Separates notification logic from business logic
- Supports batch operations (notify all contributors in one trigger)

### Pattern 3: Aggregate Queries for Claim Summaries
**What:** Use PostgreSQL aggregate functions to compute claim counts and contribution totals efficiently.

**When to use:** Displaying claim summaries in celebration headers and wishlist sections.

**Example:**
```typescript
// lib/contributions.ts
export interface ClaimSummary {
  total_items: number;
  claimed_items: number;
  split_items: number;
  unclaimed_items: number;
}

export async function getClaimSummary(
  celebrantUserId: string,
  groupId: string
): Promise<ClaimSummary> {
  const { data, error } = await supabase.rpc('get_claim_summary', {
    p_user_id: celebrantUserId,
    p_group_id: groupId,
  });

  if (error || !data) {
    console.error('Failed to fetch claim summary:', error);
    return { total_items: 0, claimed_items: 0, split_items: 0, unclaimed_items: 0 };
  }

  return data;
}

// RPC function (SQL)
CREATE OR REPLACE FUNCTION public.get_claim_summary(
  p_user_id UUID,
  p_group_id UUID
)
RETURNS TABLE(
  total_items BIGINT,
  claimed_items BIGINT,
  split_items BIGINT,
  unclaimed_items BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(wi.id) AS total_items,
    COUNT(gc.id) FILTER (WHERE gc.claim_type = 'full') AS claimed_items,
    COUNT(DISTINCT gc.wishlist_item_id) FILTER (WHERE gc.claim_type = 'split') AS split_items,
    COUNT(wi.id) FILTER (WHERE gc.id IS NULL) AS unclaimed_items
  FROM public.wishlist_items wi
  LEFT JOIN public.gift_claims gc ON gc.wishlist_item_id = wi.id
  WHERE wi.user_id = p_user_id
    AND wi.group_id = p_group_id
    AND wi.item_type NOT IN ('surprise_me', 'mystery_box');
END;
$$;
```

**Why this pattern:**
- Single RPC call provides all summary data (efficient)
- PostgreSQL FILTER clause enables conditional aggregation
- LEFT JOIN ensures unclaimed items are counted
- STABLE + SECURITY DEFINER allows calling from any user context

### Pattern 4: Optimistic UI with Rollback
**What:** Update UI immediately on user action, then revert if server operation fails.

**When to use:** Pledge contributions, opt-out actions, claim operations for responsive UX.

**Example:**
```typescript
// components/wishlist/SplitContributionModal.tsx
const [pledgeAmount, setPledgeAmount] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);

async function handlePledge() {
  setIsSubmitting(true);

  // Optimistic update: add current user to contributors list
  const optimisticContributor = {
    id: userId,
    display_name: currentUser.display_name,
    avatar_url: currentUser.avatar_url,
    amount: parseFloat(pledgeAmount),
  };
  setContributors([...contributors, optimisticContributor]);

  // Server operation
  const result = await pledgeContribution(itemId, parseFloat(pledgeAmount));

  if (!result.success) {
    // Rollback optimistic update
    setContributors(contributors.filter(c => c.id !== userId));
    Alert.alert('Pledge Failed', result.error || 'Unknown error');
  } else {
    // Success: close modal and refresh
    onClose();
    onPledgeSuccess?.();
  }

  setIsSubmitting(false);
}
```

**Why this pattern:**
- Immediate feedback improves perceived performance
- Rollback on failure maintains data consistency
- User sees their action immediately rather than waiting for server
- Common pattern in React Native apps (Instagram, Twitter, etc.)

### Anti-Patterns to Avoid

- **Client-side contribution validation only:** Always validate contribution totals server-side to prevent over-pledging via race conditions or malicious clients.
- **Unconstrained split closure:** Allowing unclaim when contributions exist creates orphaned pledges. Block unclaim via RPC validation.
- **Polling for progress updates:** Use Supabase real-time subscriptions instead of polling for contribution updates.
- **Notification spam:** Only send notifications on significant events (split invite, fully funded, canceled) — not every individual pledge.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push notification delivery | Custom webhook + API client | Existing Edge Function (`supabase/functions/push`) + Expo Push Service | Already handles batching, retry logic, device token management |
| Contribution progress bar | Custom View with animations | Adapt `ContributionProgress.tsx` | Already implements progress bar with percentage, currency formatting, contributor count |
| Avatar display with tap-to-reveal | Custom touchable + modal | Extend `ClaimerAvatar.tsx` pattern | Already implements modal popup on tap, handles missing avatars |
| Claim aggregation | Client-side filtering/counting | PostgreSQL RPC with aggregate functions | Database aggregation is orders of magnitude faster than client-side for large datasets |
| Atomic operations | Sequential client calls | PostgreSQL RPC with SELECT FOR UPDATE | Prevents race conditions that client-side logic cannot handle |

**Key insight:** This project already has robust patterns for notifications, progress visualization, atomic database operations, and avatar display. The temptation will be to build new components from scratch, but adapting existing patterns ensures consistency and leverages battle-tested logic.

## Common Pitfalls

### Pitfall 1: Race Conditions in Split Contributions
**What goes wrong:** Multiple users pledge simultaneously, total exceeds item price.

**Why it happens:** Client-side validation checks current total, then issues INSERT. Between check and insert, another pledge completes.

**How to avoid:**
- All pledge logic in RPC function with SELECT FOR UPDATE SKIP LOCKED
- Recalculate total within transaction, reject if over price
- Return structured error with remaining amount

**Warning signs:**
- Split contributions show total > item price
- Users report "successful" pledges that don't appear
- Contribution count mismatches individual pledge sums

### Pitfall 2: Notification Trigger Loops
**What goes wrong:** Notification trigger inserts into `user_notifications`, which triggers webhook, which inserts another notification, creating infinite loop.

**Why it happens:** Trigger fires on INSERT to `user_notifications`, and trigger itself inserts into `user_notifications`.

**How to avoid:**
- Notification triggers only fire on `gift_claims` table events
- Edge Function webhook listens to `user_notifications` INSERT (downstream, no loop)
- Never trigger notifications from within notification-sending logic

**Warning signs:**
- Exponential growth in `user_notifications` table
- Users receive duplicate/repeated notifications
- Edge Function logs show recursive calls

### Pitfall 3: Celebrant Visibility Leaks
**What goes wrong:** Celebrant sees split contribution details (who pledged, how much) defeating the surprise.

**Why it happens:** RLS policy allows item owner to query `gift_claims` for their own items, or client code fetches claims without checking user role.

**How to avoid:**
- Maintain existing RLS: "Non-owners can view claims on group items" (celebrant excluded from SELECT)
- Use `get_item_claim_status()` RPC for celebrant view (boolean only, no amounts/names)
- Never pass `claim` prop to celebrant-rendered components

**Warning signs:**
- ClaimButton visible to celebrant with split details
- ContributorsDisplay renders for celebrant
- Celebrant can see claimer names in item cards

### Pitfall 4: Unclaim with Existing Contributions
**What goes wrong:** Claimer unclaims item with split contributions, leaving contributors with orphaned pledges and no item.

**Why it happens:** `unclaim_item()` RPC only checks claim ownership, not existence of other contributors.

**How to avoid:**
- Add validation to `unclaim_item()`: `IF EXISTS (SELECT 1 FROM gift_claims WHERE wishlist_item_id = ... AND claimed_by != v_user_id) THEN RETURN error`
- Show warning dialog client-side: "This item has X contributors. Unclaiming will notify them."
- Send cancellation notifications to all contributors

**Warning signs:**
- Contributors report seeing progress bar, then item becomes unclaimable
- `gift_claims` rows with `claim_type='split'` but no corresponding full claim
- Users confused about "disappeared" contributions

### Pitfall 5: Split State Ambiguity
**What goes wrong:** Users don't know if split is "open for pledges" vs "closed but not fully funded" vs "fully funded".

**Why it happens:** No explicit split state tracking — state is implicit from claim_type and amounts.

**How to avoid:**
- Derive state from data: `is_open = EXISTS(claim with claim_type='split') AND total < price`
- UI shows clear states: "Open for contributions", "Closed by claimer", "Fully funded"
- Claimer has explicit "Close Split" button that converts their claim to cover remaining amount

**Warning signs:**
- Users try to pledge to closed splits
- "Pledge" button visible but non-functional
- Confusion about whether more contributions needed

## Code Examples

Verified patterns from official sources and existing codebase:

### Database Trigger for Split Invite Notifications
```sql
-- Source: Adapted from existing webhook pattern in 20260202000001_notifications.sql
-- Trigger on gift_claims INSERT when claim_type='split' and it's the first split claim

CREATE OR REPLACE FUNCTION public.notify_split_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item RECORD;
  v_claimer RECORD;
  v_member RECORD;
BEGIN
  -- Only trigger for the FIRST split claim (split invite)
  IF NEW.claim_type != 'split' THEN
    RETURN NEW;
  END IF;

  -- Check if this is the first split claim for this item
  IF (SELECT COUNT(*) FROM public.gift_claims WHERE wishlist_item_id = NEW.wishlist_item_id AND claim_type = 'split') > 1 THEN
    RETURN NEW; -- Not the first, skip notification
  END IF;

  -- Get item and claimer details
  SELECT wi.id, wi.title, wi.user_id AS celebrant_id, wi.group_id
  INTO v_item
  FROM public.wishlist_items wi
  WHERE wi.id = NEW.wishlist_item_id;

  SELECT up.display_name, up.avatar_url
  INTO v_claimer
  FROM public.user_profiles up
  WHERE up.id = NEW.claimed_by;

  -- Notify all group members except celebrant and claimer
  FOR v_member IN
    SELECT DISTINCT gm.user_id
    FROM public.group_members gm
    WHERE gm.group_id = v_item.group_id
      AND gm.user_id != v_item.celebrant_id
      AND gm.user_id != NEW.claimed_by
  LOOP
    INSERT INTO public.user_notifications (user_id, title, body, data)
    VALUES (
      v_member.user_id,
      'Split Invite',
      v_claimer.display_name || ' invited you to split ' || v_item.title,
      jsonb_build_object(
        'type', 'split_invite',
        'item_id', v_item.id,
        'item_title', v_item.title,
        'claimer_id', NEW.claimed_by,
        'claimer_name', v_claimer.display_name,
        'avatar_url', v_claimer.avatar_url
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_split_invite
AFTER INSERT ON public.gift_claims
FOR EACH ROW
EXECUTE FUNCTION public.notify_split_invite();
```

### Client-Side Contribution Progress Component
```typescript
// Source: Adapted from components/celebrations/ContributionProgress.tsx
// Extends existing component for split funding visualization

interface SplitContributionProgressProps {
  itemPrice: number;
  contributors: Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    amount: number;
  }>;
  isCelebrant?: boolean; // Hide details for celebrant
}

export function SplitContributionProgress({
  itemPrice,
  contributors,
  isCelebrant = false,
}: SplitContributionProgressProps) {
  const totalPledged = contributors.reduce((sum, c) => sum + c.amount, 0);
  const progressPercent = Math.min(100, (totalPledged / itemPrice) * 100);
  const isFullyFunded = totalPledged >= itemPrice;

  // Celebrant sees only boolean status (no amounts/names)
  if (isCelebrant) {
    return (
      <View style={styles.celebrantView}>
        {isFullyFunded ? (
          <Text style={styles.celebrantText}>✓ Taken</Text>
        ) : (
          <Text style={styles.celebrantText}>• In Progress</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%` },
              isFullyFunded && styles.progressFillComplete,
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          ${totalPledged.toFixed(0)} of ${itemPrice.toFixed(0)}
        </Text>
      </View>

      {/* Contributor Avatars */}
      <View style={styles.contributorsRow}>
        {contributors.map((contributor) => (
          <View key={contributor.id} style={styles.contributorItem}>
            <ClaimerAvatar claimer={contributor} size={32} />
            <Text style={styles.contributorAmount}>
              ${contributor.amount.toFixed(0)}
            </Text>
          </View>
        ))}
      </View>

      {/* Fully Funded Badge */}
      {isFullyFunded && (
        <View style={styles.fullyFundedBadge}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#22c55e" />
          <Text style={styles.fullyFundedText}>Fully funded!</Text>
        </View>
      )}
    </View>
  );
}
```

### Real-Time Subscription for Live Updates
```typescript
// Source: Supabase real-time documentation + existing patterns
// Subscribe to gift_claims changes for live progress updates

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ClaimWithUser } from '../lib/claims';

export function useSplitContributions(itemId: string) {
  const [contributors, setContributors] = useState<ClaimWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    async function fetchContributors() {
      const { data } = await supabase
        .from('gift_claims')
        .select(`
          *,
          claimer:user_profiles!claimed_by(id, display_name, avatar_url)
        `)
        .eq('wishlist_item_id', itemId)
        .eq('claim_type', 'split')
        .order('created_at', { ascending: true });

      setContributors(data || []);
      setLoading(false);
    }

    fetchContributors();

    // Real-time subscription
    const channel = supabase
      .channel(`split-contributions-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gift_claims',
          filter: `wishlist_item_id=eq.${itemId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.claim_type === 'split') {
            // Fetch new contributor profile and add to list
            fetchContributors();
          } else if (payload.eventType === 'DELETE') {
            setContributors((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId]);

  return { contributors, loading };
}
```

### Claim Summary RPC Function
```sql
-- Source: PostgreSQL aggregate patterns + existing RPC pattern from 20260206000001_v1.3_claims_details_notes.sql
-- Provides claim count summary for celebration headers

CREATE OR REPLACE FUNCTION public.get_celebration_claim_summary(
  p_celebration_id UUID,
  p_group_id UUID
)
RETURNS TABLE(
  total_items BIGINT,
  claimed_count BIGINT,
  split_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_celebrant_id UUID;
BEGIN
  -- Get celebrant user_id from celebration
  SELECT user_id INTO v_celebrant_id
  FROM public.celebrations
  WHERE id = p_celebration_id;

  IF v_celebrant_id IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(DISTINCT wi.id) AS total_items,
    COUNT(DISTINCT gc.wishlist_item_id) FILTER (WHERE gc.claim_type = 'full') AS claimed_count,
    COUNT(DISTINCT gc.wishlist_item_id) FILTER (WHERE gc.claim_type = 'split') AS split_count
  FROM public.wishlist_items wi
  LEFT JOIN public.gift_claims gc ON gc.wishlist_item_id = wi.id
  WHERE wi.user_id = v_celebrant_id
    AND wi.group_id = p_group_id
    AND wi.item_type NOT IN ('surprise_me', 'mystery_box');
END;
$$;

COMMENT ON FUNCTION public.get_celebration_claim_summary IS
  'Returns claim count summary for celebration header. Excludes special items (surprise_me, mystery_box).';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Claims as wishlist_items columns | Separate gift_claims table | Phase 18 (v1.3) | Prevents RLS leaks, enables split contributions |
| Client-side claim validation | PostgreSQL RPC with SELECT FOR UPDATE | Phase 18 (v1.3) | Eliminates race conditions |
| Polling for updates | Supabase real-time subscriptions | Phase 18 (v1.3) | Real-time UI updates without polling overhead |
| Manual notification sending | Database triggers + webhook | v1.0 (Phase 6) | Reliable async notifications |
| Tooltip for claimer name | Modal popup | Phase 19 (v1.3) | Better touch targets on mobile |

**Deprecated/outdated:**
- **Inline claim status columns:** Phase 18 moved to separate table to prevent RLS visibility leaks
- **Client-side claim locking:** Now uses SELECT FOR UPDATE SKIP LOCKED at database level

## Open Questions

Things that couldn't be fully resolved:

1. **Shipping/delivery cost addition**
   - What we know: User wants claimer to add shipping costs before splitting
   - What's unclear: Should this be a separate field or added to item price? How does it affect "fully funded" calculation?
   - Recommendation: Add `additional_costs` NUMERIC column to wishlist_items (nullable), include in total for split calculations. Display as "Item: $X + Shipping: $Y = Total: $Z"

2. **Split closing behavior**
   - What we know: Claimer can "close" split by covering remaining amount
   - What's unclear: Should claimer be able to close split BEFORE any other pledges (i.e., cancel the split invite)?
   - Recommendation: Allow close only after at least one other pledge exists. If no pledges yet, use "Cancel Split" which converts back to no-claim state.

3. **Opt-out vs. "Already Claimed" distinction**
   - What we know: Members who claimed another item can opt out to avoid double-spending
   - What's unclear: Is opt-out a silent client-side filter (don't show pledge UI) or explicit database record?
   - Recommendation: Client-side filter only — query user's existing claims, hide pledge button if user has any full or split claims. No database record needed for opt-out.

4. **Split claim icon vs. full claim icon**
   - What we know: Different icons for full vs. split claims
   - What's unclear: Exact icon choices (gift icon for full, gift-split icon for split?)
   - Recommendation: Use `MaterialCommunityIcons`: "gift" for full claims, "gift-open" or "account-multiple" for split claims. Test both and choose based on visual clarity.

5. **Timestamp format for claim indicators**
   - What we know: Timestamps shown on hover/tap only
   - What's unclear: Relative ("2 hours ago") vs. exact ("Feb 6, 2:30pm")
   - Recommendation: Use relative format with date-fns `formatDistanceToNow()` for recent claims (<7 days), exact format for older claims. Consistent with existing celebration date display pattern.

## Sources

### Primary (HIGH confidence)
- **Existing codebase:**
  - `supabase/migrations/20260206000001_v1.3_claims_details_notes.sql` - gift_claims schema, RPC functions, RLS policies
  - `lib/claims.ts` - claim operations, RPC call patterns, error handling
  - `components/celebrations/ContributionProgress.tsx` - progress bar implementation
  - `components/wishlist/ClaimerAvatar.tsx` - avatar display with modal popup
  - `lib/notifications.ts` - expo-notifications setup, token management
  - `supabase/functions/push/index.ts` - Edge Function webhook pattern
  - `.planning/STATE.md` - architectural decisions, RLS patterns
  - `.planning/phases/21-split-contributions-claim-enhancements/21-CONTEXT.md` - user decisions

### Secondary (MEDIUM confidence)
- **expo-notifications documentation:** Push notification setup patterns, Android notification channels
- **Supabase documentation:** Real-time subscriptions, database webhooks, RPC function patterns
- **PostgreSQL documentation:** SELECT FOR UPDATE, aggregate functions with FILTER clause, trigger patterns

### Tertiary (LOW confidence)
- None — all findings verified against existing codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions verified in package.json
- Architecture: HIGH - Patterns directly adapted from existing Phase 18-19 claims implementation
- Pitfalls: HIGH - Identified from existing RLS patterns, PostgreSQL concurrency patterns, and webhook architecture

**Research date:** 2026-02-06
**Valid until:** 30 days (stable technologies, established patterns)
