# Phase 22: Secret Notes - Research

**Researched:** 2026-02-09
**Domain:** React Native UI components, Supabase RLS (subject-exclusion pattern), modal/sheet patterns
**Confidence:** HIGH

## Summary

Phase 22 implements the UI layer for secret notes about group members. The database schema (`member_notes` table) and service layer (`lib/memberNotes.ts`) already exist from Phase 18. The primary work is creating UI components for viewing, adding, editing, and deleting notes, plus integrating them into the member profile screen and celebration page.

**Key finding:** The existing schema was designed as "delete-only, no editing" (no UPDATE policy, no `updated_at` column). However, requirement NOTE-05 states "Note author can edit or delete their own notes." This phase must add an UPDATE RLS policy and `updated_at` column to enable editing, or clarify that "edit" means delete-and-recreate.

**Primary recommendation:** Add schema migration for UPDATE capability, then build UI components for notes list, note creation modal, and note editing inline. Integrate notes section into member profile screen (`/member/[id].tsx`) and celebration detail page (`/celebration/[id].tsx`).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Native | 0.74.x | UI framework | Already in use |
| @gluestack-ui/themed | 1.x | Component library | Project's design system |
| expo-router | 3.x | Navigation | Existing routing pattern |
| @supabase/supabase-js | 2.x | Backend client | Existing pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @gorhom/bottom-sheet | 4.x | Note creation modal | Already used throughout app |
| date-fns | 2.x | Timestamp formatting | "5 minutes ago" display |
| react-native-gesture-handler | 2.x | Swipe-to-delete | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bottom sheet modal | Full-screen modal | Bottom sheet is consistent with app's existing add-item patterns |
| Inline edit | Edit modal | Inline is better for short 280-char notes; edit modal adds friction |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
```

## Architecture Patterns

### Recommended Component Structure
```
components/
  notes/
    MemberNotesSection.tsx      # Container with notes list + add button
    NoteCard.tsx                # Single note display with author info
    AddNoteSheet.tsx            # Bottom sheet for creating notes
    EditNoteInline.tsx          # Inline editing (replaces note content)
```

### Pattern 1: Subject-Exclusion Context Pattern
**What:** Pass `isSubject: boolean` prop to notes section to control visibility
**When to use:** Member profile screen (viewing others' profiles)
**Example:**
```typescript
// Source: Existing pattern from celebration detail screen
interface MemberNotesSectionProps {
  groupId: string;
  aboutUserId: string;
  isSubject: boolean;  // true if current user IS the about_user
}

export function MemberNotesSection({ groupId, aboutUserId, isSubject }: MemberNotesSectionProps) {
  // RLS handles the actual filtering, but we hide the section entirely for subjects
  if (isSubject) {
    return null;  // Subject cannot see notes about themselves
  }

  // Fetch and display notes...
}
```

### Pattern 2: Optimistic Updates for Note Operations
**What:** Update UI immediately, rollback on error
**When to use:** Create, edit, delete note operations
**Example:**
```typescript
// Source: Existing pattern from lib/claims.ts
const handleCreateNote = async (content: string) => {
  const tempId = `temp-${Date.now()}`;

  // Optimistic update
  setNotes(prev => [{
    id: tempId,
    content,
    author: currentUser,
    created_at: new Date().toISOString(),
  }, ...prev]);

  try {
    const note = await createNote(groupId, aboutUserId, content);
    // Replace temp note with real one
    setNotes(prev => prev.map(n => n.id === tempId ? note : n));
  } catch (error) {
    // Rollback
    setNotes(prev => prev.filter(n => n.id !== tempId));
    Alert.alert('Error', 'Failed to create note');
  }
};
```

### Pattern 3: Character Counter for 280-char Limit
**What:** Real-time character count display with visual feedback
**When to use:** Note creation and edit forms
**Example:**
```typescript
// Source: Twitter-style character counter pattern
const MAX_CHARS = 280;
const [content, setContent] = useState('');
const remaining = MAX_CHARS - content.length;
const isOverLimit = remaining < 0;

<Text style={[styles.charCount, isOverLimit && styles.charCountError]}>
  {remaining}
</Text>
```

### Anti-Patterns to Avoid
- **Fetching notes without group context:** Notes are per-group scoped; always pass `groupId`
- **Showing notes section to the subject user:** Even though RLS blocks data, hide the UI entirely
- **N+1 author profile fetches:** The existing `getNotesAboutUser` function already batch-fetches author profiles

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subject exclusion check | Manual user ID comparison | RLS + isSubject prop | RLS is the source of truth; prop hides UI |
| Author profile fetching | Separate profile calls | `NoteWithAuthor` type from `lib/memberNotes.ts` | Already batch-fetches |
| Bottom sheet modal | Custom modal | `@gorhom/bottom-sheet` | Consistent with existing app patterns |
| Timestamp formatting | Manual date strings | `date-fns formatDistanceToNow` | Already used in PersonalDetailsReadOnly |

**Key insight:** The service layer (`lib/memberNotes.ts`) handles all data operations including author profile enrichment. UI components should focus on display and user interactions, not data fetching complexity.

## Common Pitfalls

### Pitfall 1: Forgetting Group Context
**What goes wrong:** Notes fetched without `groupId` return notes from ALL groups
**Why it happens:** The member profile screen receives only `userId` in route params
**How to avoid:** Require `groupId` prop when navigating to member profile from a group context
**Warning signs:** Notes appearing that shouldn't be visible in current group

### Pitfall 2: Showing Empty State to Subject
**What goes wrong:** Subject user sees "No notes about this person" message
**Why it happens:** RLS returns 0 rows for subject, but UI renders empty state
**How to avoid:** Check `isSubject` before rendering notes section at all
**Warning signs:** Empty notes section visible to the profile owner

### Pitfall 3: Edit Mode Without Schema Migration
**What goes wrong:** Edit saves fail with "permission denied"
**Why it happens:** Current schema has no UPDATE policy on `member_notes`
**How to avoid:** Phase 22 MUST include migration adding UPDATE policy
**Warning signs:** 403 errors when saving edits

### Pitfall 4: Notes Not Scoped to Current Group in Celebration View
**What goes wrong:** Notes from other groups leak into celebration view
**Why it happens:** Celebration has `group_id`, but passed incorrectly
**How to avoid:** Extract `celebration.group_id` and pass to notes section
**Warning signs:** Notes appearing that reference other groups

## Code Examples

### Fetching Notes (Existing Pattern)
```typescript
// Source: lib/memberNotes.ts (already implemented)
import { getNotesAboutUser, NoteWithAuthor } from '@/lib/memberNotes';

const [notes, setNotes] = useState<NoteWithAuthor[]>([]);

useEffect(() => {
  async function loadNotes() {
    const fetchedNotes = await getNotesAboutUser(groupId, aboutUserId);
    setNotes(fetchedNotes);
  }
  loadNotes();
}, [groupId, aboutUserId]);
```

### Creating a Note (Existing Pattern)
```typescript
// Source: lib/memberNotes.ts (already implemented)
import { createNote } from '@/lib/memberNotes';

const handleSubmit = async () => {
  try {
    const newNote = await createNote(groupId, aboutUserId, content);
    setNotes(prev => [newNote, ...prev]);
    onClose();
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

### Deleting a Note (Existing Pattern)
```typescript
// Source: lib/memberNotes.ts (already implemented)
import { deleteNote } from '@/lib/memberNotes';

const handleDelete = async (noteId: string) => {
  Alert.alert(
    'Delete Note',
    'Are you sure you want to delete this note?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(noteId);
          setNotes(prev => prev.filter(n => n.id !== noteId));
        },
      },
    ]
  );
};
```

### Note Card Component Structure
```typescript
// Source: Derived from existing MemberListItem.tsx pattern
interface NoteCardProps {
  note: NoteWithAuthor;
  isAuthor: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function NoteCard({ note, isAuthor, onEdit, onDelete }: NoteCardProps) {
  return (
    <View style={styles.noteCard}>
      {/* Author row */}
      <HStack alignItems="center" space="sm">
        <Avatar size="sm">
          {note.author?.avatar_url ? (
            <AvatarImage source={{ uri: note.author.avatar_url }} />
          ) : (
            <AvatarFallbackText>{note.author?.display_name}</AvatarFallbackText>
          )}
        </Avatar>
        <Text style={styles.authorName}>{note.author?.display_name}</Text>
        <Text style={styles.timestamp}>
          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
        </Text>
      </HStack>

      {/* Content */}
      <Text style={styles.content}>{note.content}</Text>

      {/* Author actions */}
      {isAuthor && (
        <HStack style={styles.actions}>
          <Pressable onPress={onEdit}>
            <MaterialCommunityIcons name="pencil" size={18} color={colors.burgundy[500]} />
          </Pressable>
          <Pressable onPress={onDelete}>
            <MaterialCommunityIcons name="delete" size={18} color={colors.warning} />
          </Pressable>
        </HStack>
      )}
    </View>
  );
}
```

## Schema Changes Required

### Missing: UPDATE Policy for member_notes

The current schema (from Phase 18) has no UPDATE policy:

```sql
-- CURRENT: Delete-only design
CREATE POLICY "Authors can delete own notes"
  ON public.member_notes FOR DELETE
  USING (author_id = (SELECT auth.uid()));
-- NO UPDATE POLICY EXISTS
```

**Required migration for NOTE-05 (edit capability):**

```sql
-- Add UPDATE policy for author-only editing
CREATE POLICY "Authors can update own notes"
  ON public.member_notes FOR UPDATE
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

-- Add updated_at column
ALTER TABLE public.member_notes
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger for updated_at
CREATE TRIGGER set_member_notes_updated_at
  BEFORE UPDATE ON public.member_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

**Service layer addition for `lib/memberNotes.ts`:**

```typescript
export async function updateNote(noteId: string, content: string): Promise<NoteWithAuthor> {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Note content cannot be empty');
  }
  if (trimmedContent.length > 280) {
    throw new Error('Note content cannot exceed 280 characters');
  }

  const { data: note, error } = await supabase
    .from('member_notes')
    .update({ content: trimmedContent })
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update note: ${error.message}`);
  }

  // Fetch author profile...
  return { ...note, author: /* author profile */ };
}
```

## Integration Points

### 1. Member Profile Screen (`/app/(app)/member/[id].tsx`)

**Current state:** Shows PersonalDetailsReadOnly, no notes section

**Required changes:**
- Add `MemberNotesSection` component below personal details
- Pass `groupId` from navigation params (must be added to route)
- Check `isSubject` (current user === profile user)

**Route change needed:**
```typescript
// Current: /member/[id]
// Required: /member/[id]?groupId=xxx OR pass via route state
```

### 2. Celebration Detail Screen (`/app/(app)/celebration/[id].tsx`)

**Current state:** Shows celebrant info, wishlist, chat; no notes section

**Required changes:**
- Add `MemberNotesSection` for the celebrant
- Use `celebration.group_id` for group context
- Check `isCelebrant` (current user === celebrant)

**Placement:** Below celebrant header card, above wishlist section

### 3. TypeScript Types (`types/database.types.ts`)

**Current state:** `MemberNote` type has no `updated_at`

**Required changes after migration:**
```typescript
member_notes: {
  Row: {
    id: string
    group_id: string
    about_user_id: string
    author_id: string
    content: string
    created_at: string
    updated_at: string  // ADD THIS
  }
  // ... Insert, Update types
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Delete-only notes | Edit + Delete notes | Phase 22 | Requires schema migration |
| No notes in celebration view | Notes visible on celebrant | Phase 22 | New integration point |

**Note:** The "delete-only" design from Phase 18 was a simplification. NOTE-05 requires edit capability, so this phase extends the schema.

## Open Questions

1. **Group ID in member profile navigation**
   - What we know: Current route is `/member/[id]` with only user ID
   - What's unclear: How to pass group context for notes scoping
   - Recommendation: Add `groupId` query param or use navigation state; routes from group screens already have group context

2. **Edit UX: Inline vs Modal**
   - What we know: Notes are short (280 chars), edit is infrequent
   - What's unclear: User preference
   - Recommendation: Inline edit (tap to expand into TextInput) for minimal friction

3. **Empty state message when notes exist but none visible**
   - What we know: RLS filters notes; non-members and subjects see 0 rows
   - What's unclear: What to show when user is NOT subject but no notes exist
   - Recommendation: "Be the first to add a note!" prompt with add button

## Sources

### Primary (HIGH confidence)
- `/home/zetaz/wishlist-app/lib/memberNotes.ts` - Existing service layer implementation
- `/home/zetaz/wishlist-app/supabase/migrations/20260206000001_v1.3_claims_details_notes.sql` - Current schema
- `/home/zetaz/wishlist-app/.planning/phases/18-schema-atomic-functions/18-RESEARCH.md` - Schema design rationale
- `/home/zetaz/wishlist-app/types/database.types.ts` - Current TypeScript types
- `/home/zetaz/wishlist-app/app/(app)/member/[id].tsx` - Current member profile implementation
- `/home/zetaz/wishlist-app/app/(app)/celebration/[id].tsx` - Current celebration detail implementation

### Secondary (MEDIUM confidence)
- `/home/zetaz/wishlist-app/components/profile/PersonalDetailsReadOnly.tsx` - UI pattern reference
- `/home/zetaz/wishlist-app/components/wishlist/AddItemBottomSheet.tsx` - Bottom sheet pattern
- `/home/zetaz/wishlist-app/lib/claims.ts` - RPC and error handling patterns

### Verified Patterns
- Bottom sheet modals: `@gorhom/bottom-sheet` used throughout app
- Character counting: Standard 280-char Twitter pattern
- Optimistic updates: Used in claims and contributions features
- Subject exclusion RLS: Documented in Phase 18 research

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all existing patterns
- Architecture: HIGH - Follows established component and service patterns
- Schema changes: HIGH - Clear requirement gap (NOTE-05 vs current schema)
- Integration points: HIGH - Identified specific files and changes needed
- Pitfalls: HIGH - Based on actual schema analysis and RLS review

**Research date:** 2026-02-09
**Valid until:** 60 days (stable React Native/Supabase patterns)

---

## Quick Reference for Planner

### Files to Create
1. `components/notes/MemberNotesSection.tsx` - Container component
2. `components/notes/NoteCard.tsx` - Single note display
3. `components/notes/AddNoteSheet.tsx` - Bottom sheet for creation
4. `supabase/migrations/20260207000001_member_notes_update_policy.sql` - Schema migration

### Files to Modify
1. `lib/memberNotes.ts` - Add `updateNote` function
2. `types/database.types.ts` - Add `updated_at` to MemberNote
3. `app/(app)/member/[id].tsx` - Add notes section
4. `app/(app)/celebration/[id].tsx` - Add notes section for celebrant

### Success Criteria Mapping
| Requirement | Implementation |
|-------------|----------------|
| NOTE-01: Add note about member | `AddNoteSheet` + `createNote()` |
| NOTE-02: Hidden from profile owner | RLS + `isSubject` prop hides UI |
| NOTE-03: Visible to other members | `MemberNotesSection` displays notes |
| NOTE-04: Per-group scoped | Pass `groupId` to all note operations |
| NOTE-05: Author can edit/delete | UPDATE policy + `updateNote()` + `deleteNote()` |
