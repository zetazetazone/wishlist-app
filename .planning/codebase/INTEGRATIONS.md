# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**Database & Backend:**
- Supabase - Backend as a Service (BaaS) platform
  - SDK/Client: `@supabase/supabase-js` 2.93.3
  - Auth: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (stored in `.env`)
  - Usage: All data operations including users, groups, wishlist items, contributions
  - Files: `lib/supabase.ts` - Client initialization with AsyncStorage for token persistence

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: Via Supabase client with URL and anon key
  - Client: `@supabase/supabase-js` (auto-generated types in `types/database.types.ts`)
  - Schema:
    - `users` table - User profiles and metadata
    - `groups` table - Group/team data
    - `group_members` table - Group membership with roles
    - `wishlist_items` table - Individual wish items with URLs and metadata
    - `contributions` table - Gift contributions tracking
    - `events` table - Birthday and custom event tracking

**File Storage:**
- Supabase Storage (referenced as `image_url` field in WishlistItem schema but not actively implemented)
- Local filesystem only for temporary app storage via AsyncStorage

**Caching:**
- AsyncStorage (`@react-native-async-storage/async-storage` 2.2.0)
  - Purpose: Token/session persistence for authentication
  - Configuration: Configured in `lib/supabase.ts` with `persistSession: true` and `autoRefreshToken: true`

## Authentication & Identity

**Auth Provider:**
- Supabase Authentication (built-in)
  - Implementation: Email/password authentication
  - Methods:
    - Sign up: `supabase.auth.signUp()` with metadata (full_name, birthday)
    - Sign in: `supabase.auth.signInWithPassword()`
    - Sign out: `supabase.auth.signOut()`
    - Session management: Auto-refresh via `persistSession: true`
  - Files: `utils/auth.ts` - Authentication utility functions
  - User data automatically created in public.users table via Supabase trigger (handle_new_user)

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Console logging only (`console.log`, `console.error`)
- Distributed throughout utility functions in `utils/auth.ts` and `utils/groups.ts`
- Examples: Group creation logs at `utils/groups.ts:19-88`, user profile logging

## CI/CD & Deployment

**Hosting:**
- Expo Managed Service (via `expo start` commands)
- Buildable to native apps via EAS (Expo Application Services)
- Web support via Metro bundler

**CI Pipeline:**
- None detected in codebase (no GitHub Actions, CircleCI, or similar)
- Scripts available: `npm run start`, `npm run android`, `npm run ios`, `npm run web`

## Environment Configuration

**Required env vars:**
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL (e.g., `https://projectid.supabase.co`)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key for public access

**Secrets location:**
- `.env` file (referenced in `.gitignore`, not committed)
- Variables validated at runtime in `lib/supabase.ts:6-11` with error thrown if missing
- Fallback to `Constants.expoConfig?.extra?.supabaseUrl` for Expo-based configuration

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Database Triggers & Functions

**Server-Side Logic:**
- Supabase trigger: `handle_new_user` function
  - Purpose: Automatically creates user profile in public.users table when new auth user is created
  - Referenced in: `utils/auth.ts:34-36` and `utils/groups.ts:44-48`

## API Integration Patterns

**Data Operations:**
- All database operations use Supabase JavaScript SDK methods:
  - `.from('table_name').select()` - Retrieve data
  - `.from('table_name').insert()` - Create records
  - `.from('table_name').update()` - Modify records
  - `.from('table_name').delete()` - Remove records
  - Chaining with `.eq()`, `.single()`, `.select('*', { count: 'exact' })` for filtering

**Error Handling:**
- Standard pattern: `{ data, error }` destructuring
- Success: Return `{ data, error: null }`
- Failure: Return `{ data: null, error }`
- Examples: `utils/auth.ts`, `utils/groups.ts`

**Session Management:**
- Auto-token refresh enabled via Supabase configuration
- AsyncStorage persistence for offline capability and session retention
- Session detected via `supabase.auth.getSession()` and `supabase.auth.getUser()`

---

*Integration audit: 2026-02-02*
