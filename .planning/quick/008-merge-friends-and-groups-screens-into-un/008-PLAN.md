---
phase: quick-008
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(app)/(tabs)/social.tsx
  - app/(app)/(tabs)/friends.tsx
  - app/(app)/(tabs)/groups.tsx
  - app/(app)/(tabs)/_layout.tsx
  - src/i18n/locales/en.json
  - src/i18n/locales/es.json
autonomous: true
must_haves:
  truths:
    - "User sees unified 'People' tab in bottom navigation"
    - "User can switch between Friends and Groups using segmented control"
    - "Header actions update contextually based on active segment"
    - "Existing friend/group functionality preserved (cards, empty states, modals)"
  artifacts:
    - path: "app/(app)/(tabs)/social.tsx"
      provides: "Unified People screen with segmented control"
      min_lines: 150
    - path: "app/(app)/(tabs)/_layout.tsx"
      provides: "Updated tab navigation (4 tabs instead of 5)"
  key_links:
    - from: "app/(app)/(tabs)/social.tsx"
      to: "components/friends/FriendCard"
      via: "import and render in Friends segment"
    - from: "app/(app)/(tabs)/social.tsx"
      to: "components/groups/GroupCard"
      via: "import and render in Groups segment"
---

<objective>
Merge Friends and Groups screens into a unified "People" screen with segmented control navigation.

Purpose: Simplify the app's information architecture by combining two related screens into one, reducing tab bar clutter (5 tabs to 4) and providing a unified social management experience.

Output: Single People tab with Friends/Groups segments, contextual header actions, and preserved existing functionality.
</objective>

<ux_analysis>
## User Persona Analysis

**Maria (Primary Persona - Birthday Organizer)**
- Currently: Switches between Friends/Groups tabs to manage social connections
- Pain point: Mental context switch between two similar concepts
- With unified screen: Single destination for all "people" management

**User Flow Scenarios:**

1. **Empty state user**: Sees combined empty state with clear CTAs for "Find Friends" and "Create Group"
2. **Adding a friend**: People tab > Friends segment active > tap search icon > Discover screen
3. **Creating a group**: People tab > Groups segment > tap Create Group button
4. **Checking friend list**: People tab > Friends segment shows list immediately
5. **Viewing groups**: People tab > tap Groups segment > see all groups

## Design Decision: Segmented Control

Chose segmented control over:
- **Tabs-within-tabs**: More familiar mobile pattern, instant switching, no nested navigation confusion
- **Collapsible sections**: Requires scrolling, less immediate access
- **Single mixed list**: Loses clear separation between friends (individuals) and groups (collections)

The segmented control provides:
- One-tap switching between Friends/Groups
- Contextual header actions (search icon for Friends, none for Groups since buttons are inline)
- Preserved existing card components and empty states
- Consistent burgundy gradient header across both segments
</ux_analysis>

<execution_context>
@/home/zetaz/.claude/get-shit-done/workflows/execute-plan.md
@/home/zetaz/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@app/(app)/(tabs)/friends.tsx
@app/(app)/(tabs)/groups.tsx
@app/(app)/(tabs)/_layout.tsx
@components/friends/FriendCard.tsx
@components/groups/GroupCard.tsx
@components/groups/CreateGroupModal.tsx
@components/groups/JoinGroupModal.tsx
@lib/friends.ts
@utils/groups.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create unified People screen with segmented control</name>
  <files>app/(app)/(tabs)/social.tsx</files>
  <action>
Create new `social.tsx` combining Friends and Groups screens:

1. **State management:**
   - `activeSegment: 'friends' | 'groups'` (default: 'friends')
   - Preserve existing state from both screens (friends[], groups[], loading, refreshing, pendingCount, modal visibility)

2. **Header structure:**
   - Burgundy gradient header (same as current screens)
   - Title changes based on segment: "Friends" / "Groups"
   - Subtitle: "{count} friends" or "{count} groups"
   - Segmented control below title (Friends | Groups buttons)
   - Contextual header icons:
     - Friends segment: search icon (navigate to /discover), requests icon with badge
     - Groups segment: no header icons (Create/Join buttons are inline in content)

3. **Segmented control styling:**
   - Container: white background with rounded corners, inside the gradient header
   - Active segment: burgundy[700] background, white text
   - Inactive segment: transparent background, burgundy[700] text
   - Full width within header padding

4. **Content area:**
   - ScrollView with RefreshControl (refreshes active segment's data)
   - If activeSegment === 'friends': render FriendCards list or friends empty state
   - If activeSegment === 'groups': render action buttons + GroupCards list or groups empty state

5. **Data loading:**
   - Load both friends and groups on mount (parallel fetch)
   - Refresh only active segment's data on pull-to-refresh
   - useFocusEffect for pendingCount (friends requests badge)

6. **Modals:**
   - Include CreateGroupModal and JoinGroupModal (from groups screen)
   - Modal visibility state managed in this component

Import and reuse: FriendCard, GroupCard, CreateGroupModal, JoinGroupModal, getFriends, fetchUserGroups, getPendingRequests, removeFriend
  </action>
  <verify>
Run `npx tsc --noEmit` - no type errors in social.tsx
File contains SegmentedControl, both FriendCard and GroupCard renders, both modals
  </verify>
  <done>
Unified People screen exists with working segment switching, contextual headers, and preserved card rendering
  </done>
</task>

<task type="auto">
  <name>Task 2: Update tab navigation and deprecate old screens</name>
  <files>
    app/(app)/(tabs)/_layout.tsx
    app/(app)/(tabs)/friends.tsx
    app/(app)/(tabs)/groups.tsx
  </files>
  <action>
1. **Update _layout.tsx:**
   - Replace separate Friends and Groups tabs with single "People" tab
   - Use icon "account-multiple" (represents both friends and groups)
   - Point to social.tsx route
   - Hide friends.tsx and groups.tsx routes (href: null)
   - New tab order: My Wishlist, People, Celebrations, Calendar

2. **Keep friends.tsx and groups.tsx** (do not delete):
   - Add comment at top: `// DEPRECATED: Use social.tsx - unified People screen`
   - Keep as hidden routes for potential deep link compatibility during transition

3. **Tab configuration for social.tsx:**
   ```tsx
   <Tabs.Screen
     name="social"
     options={{
       title: 'People',
       headerShown: false,
       tabBarIcon: ({ color, size }) => (
         <MaterialCommunityIcons name="account-multiple" size={size} color={color} />
       ),
     }}
   />
   ```
  </action>
  <verify>
Run app, confirm 4 tabs visible (Wishlist, People, Celebrations, Calendar)
Tap People tab shows unified screen with segmented control
  </verify>
  <done>
Tab bar shows 4 tabs, People tab opens unified social screen, old routes hidden but preserved
  </done>
</task>

<task type="auto">
  <name>Task 3: Add i18n keys for People screen</name>
  <files>
    src/i18n/locales/en.json
    src/i18n/locales/es.json
  </files>
  <action>
Add new translation keys for the unified People screen:

**English (en.json) - add under root level:**
```json
"people": {
  "title": "People",
  "segments": {
    "friends": "Friends",
    "groups": "Groups"
  }
}
```

**Spanish (es.json) - add under root level:**
```json
"people": {
  "title": "Personas",
  "segments": {
    "friends": "Amigos",
    "groups": "Grupos"
  }
}
```

Keep existing "friends" and "groups" sections unchanged - they contain strings still used by the segments (empty states, card labels, modals).
  </action>
  <verify>
JSON files are valid (no syntax errors)
Keys can be accessed via t('people.title'), t('people.segments.friends'), t('people.segments.groups')
  </verify>
  <done>
i18n keys exist for People screen in both English and Spanish
  </done>
</task>

</tasks>

<verification>
1. App compiles without errors: `npx expo start`
2. Tab bar shows 4 tabs: My Wishlist, People, Celebrations, Calendar
3. People tab opens unified screen with segmented control
4. Tapping "Friends" segment shows friends list (or empty state)
5. Tapping "Groups" segment shows group action buttons and groups list (or empty state)
6. Header icons change contextually (search/requests for Friends, none for Groups)
7. Pull-to-refresh works on both segments
8. Create Group and Join Group modals work from Groups segment
9. Friend request badge shows count when pending requests exist
10. Navigation to /discover, /requests works from Friends segment
11. Navigation to /group/[id] works from Groups segment
</verification>

<success_criteria>
- Unified People screen replaces separate Friends and Groups tabs
- Tab bar reduced from 5 to 4 tabs
- Segmented control allows switching between Friends/Groups content
- All existing functionality preserved (cards, empty states, modals, navigation)
- i18n keys added for both languages
- No regression in user flows (add friend, create group, view lists)
</success_criteria>

<output>
After completion, create `.planning/quick/008-merge-friends-and-groups-screens-into-un/008-SUMMARY.md`
</output>
