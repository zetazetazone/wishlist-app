# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Mobile-first monolithic React Native application with expo-router file-based routing, Supabase backend for auth and data persistence, and a component-driven UI architecture.

**Key Characteristics:**
- File-based routing with nested layouts via expo-router
- Authentication-gated navigation with Supabase Auth
- Utility-first service layer for database operations
- Reusable component hierarchy organized by feature domain
- Theme-driven styling with centralized design constants

## Layers

**Routing & Navigation:**
- Purpose: Handle app navigation, authentication state, and screen transitions
- Location: `app/`, `app/(app)/`, `app/(app)/(tabs)/`, `app/auth/`, `app/group/`
- Contains: Layout files, screen components, navigation configuration
- Depends on: expo-router, React Native Navigation
- Used by: All screens and entry point

**Authentication:**
- Purpose: Manage user login/signup, session persistence, auth state changes
- Location: `app/auth/` (screens), `lib/supabase.ts` (client), `utils/auth.ts` (logic)
- Contains: Login/signup screens, Supabase client, auth service functions
- Depends on: Supabase, AsyncStorage, Expo Constants
- Used by: Root layout for session protection, all protected routes

**Data Access & Business Logic:**
- Purpose: Coordinate database operations and business rules
- Location: `utils/` (service functions), `lib/supabase.ts` (client)
- Contains: Supabase client initialization, service functions for groups/items
- Depends on: Supabase JS SDK, React hooks for async state
- Used by: Screen components via direct function calls

**UI Components:**
- Purpose: Reusable, domain-organized presentational components
- Location: `components/` (grouped by feature)
- Contains: Card components, modals, input forms, stars rating, themed UI elements
- Depends on: React Native, Gluestack UI, Moti animations, theme constants
- Used by: Screen components for rendering UI

**Design System & Theming:**
- Purpose: Centralized styling, color palette, spacing, shadows, gradients
- Location: `constants/theme.ts`
- Contains: Color definitions, typography rules, spacing scale, border radius, shadow styles, gradient presets
- Depends on: None
- Used by: All components and screens for visual consistency

## Data Flow

**User Authentication Flow:**

1. Root layout (`app/_layout.tsx`) checks session on mount via `supabase.auth.getSession()`
2. If no session → redirect to `/auth/login`
3. User submits credentials via login form (`app/auth/login.tsx`)
4. `signIn()` from `utils/auth.ts` calls Supabase auth endpoint
5. On success → session stored in AsyncStorage
6. Auth state change listener redirects to `/(app)/(tabs)/wishlist`
7. On logout → session cleared, redirect to login

**Data Query Flow:**

1. Screen component uses `useEffect()` to call service function (e.g., `fetchWishlistItems()`)
2. Service function in `utils/` calls Supabase table query
3. Query result → component state update via `useState()`
4. Component re-renders with data
5. Pull-to-refresh triggers refetch

**Item Management Flow:**

1. Add item form (`AddItemModal.tsx`) collects title, URL, price, priority
2. Form submission calls `handleAddItem()` in screen component
3. Screen calls `supabase.from('wishlist_items').insert()`
4. Optimistic state update: new item added to local state
5. Success alert shown, modal closed
6. Deletion: confirmation alert → `supabase.from(...).delete()` → state update

**State Management:**
- Local component state via `useState()` for UI state (forms, modals, loading flags)
- Derived server state: screens fetch fresh data on mount and refresh
- Async state handling: loading → success/error lifecycle with Alert feedback
- No global state manager (Redux/Zustand) - appropriate for simple app scale

## Key Abstractions

**Supabase Client (`lib/supabase.ts`):**
- Purpose: Singleton Supabase client with pre-configured auth settings
- Examples: Initialized with AsyncStorage for session persistence, auto-refresh enabled
- Pattern: Module singleton - exported instance used throughout app
- Initialization: Config via environment variables with error handling

**Service Functions (e.g., `utils/groups.ts`):**
- Purpose: Encapsulate database operation logic and complex queries
- Examples: `createGroup()`, `fetchUserGroups()`, `joinGroup()`, `fetchGroupDetails()`
- Pattern: Async functions that return `{ data?, error? }` tuple for consistent error handling
- Re-used: Multiple screens call same function to keep logic DRY

**Screen Components:**
- Purpose: Container components that manage data fetching, state, and layout orchestration
- Examples: `wishlist.tsx`, `groups.tsx`, `[id].tsx`
- Pattern: Manage local state for loading/items, call services on mount, compose UI components
- Lifecycle: `useEffect()` for initialization and dependency tracking

**UI Components (Feature-Scoped):**
- Purpose: Reusable, single-responsibility presentation components
- Examples: `LuxuryWishlistCard.tsx` (card with actions), `AddItemModal.tsx` (form modal), `GroupCard.tsx`
- Pattern: Functional components with props interface, accept callbacks for parent communication
- Theme Integration: Import and use `colors`, `spacing`, `shadows`, `borderRadius` from theme

## Entry Points

**Root (`app/_layout.tsx`):**
- Location: `app/_layout.tsx`
- Triggers: App cold start, automatic on each navigation
- Responsibilities: Setup global providers (Gluestack, GestureHandler, SafeAreaProvider), establish auth state listener, protect routes based on session

**App Layout (`app/(app)/_layout.tsx`):**
- Location: `app/(app)/_layout.tsx`
- Triggers: Accessed after auth, hidden from unauthenticated users
- Responsibilities: Configure Stack navigator, disable headers (screens provide custom ones)

**Tabs Layout (`app/(app)/(tabs)/_layout.tsx`):**
- Location: `app/(app)/(tabs)/_layout.tsx`
- Triggers: Accessed from `/(app)`, defines tab bar
- Responsibilities: Configure bottom tab navigation, set active/inactive colors, map tab screens to icons

**Primary Screens:**
- `app/(app)/(tabs)/wishlist.tsx`: Main wishlist display, add/delete items
- `app/(app)/(tabs)/groups.tsx`: List user's groups, create/join groups
- `app/(app)/(tabs)/index.tsx`: Home screen (not yet detailed)
- `app/group/[id].tsx`: Group detail, members, share functionality

## Error Handling

**Strategy:** Try-catch with Supabase error propagation, user-facing alerts via `Alert.alert()`, console logging for debugging.

**Patterns:**
- Service functions wrap Supabase calls in try-catch, return `{ data: null, error: <Error> }` on failure
- Screen components check `error` in response, show Alert with message
- Async operations set `loading` flag to prevent duplicate submissions
- Network errors caught and re-thrown with contextual messages (e.g., "Failed to create user profile")

**Example:** `createGroup()` in `utils/groups.ts` validates user exists, creates profile if needed, then group, handling each step's errors separately.

## Cross-Cutting Concerns

**Logging:**
- Console logging used throughout for debugging (`console.log()`, `console.error()`)
- Particularly verbose in `utils/groups.ts` for complex workflows
- No structured logging framework (appropriate for MVP)

**Validation:**
- Input validation in screen components (e.g., email/password in login form)
- Database schema enforces constraints (PK, FK, not-null)
- Client-side form validation in modals (e.g., required fields before submission)
- No centralized validation framework

**Authentication:**
- Supabase handles credential validation and token management
- Session persistence via AsyncStorage (survives app close/restart)
- Automatic token refresh enabled
- Route protection via root layout session check

**Styling & Theming:**
- All colors from `constants/theme.ts` → centralized updates
- Spacing, border radius, shadows standardized via constants
- Gradients defined in theme and applied via `LinearGradient` component
- Gluestack UI for themed component library (config in `gluestack-ui.config.ts`)
- NativeWind for Tailwind CSS utility support in React Native

---

*Architecture analysis: 2026-02-02*
