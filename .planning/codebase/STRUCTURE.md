# Codebase Structure

**Analysis Date:** 2026-02-02

## Directory Layout

```
wishlist-app/
├── app/                          # Expo Router file-based routing (entry point)
│   ├── _layout.tsx               # Root layout with auth setup and providers
│   ├── (app)/                    # Protected app group (behind auth)
│   │   ├── _layout.tsx           # App stack layout, disables headers
│   │   ├── (tabs)/               # Tab navigation group
│   │   │   ├── _layout.tsx       # Tabs configuration with 3 main tabs
│   │   │   ├── index.tsx         # Home screen
│   │   │   ├── wishlist.tsx      # Main wishlist display (luxury theme)
│   │   │   ├── groups.tsx        # Groups list and management
│   │   │   ├── wishlist-simple.tsx    # Backup simple version (hidden)
│   │   │   ├── wishlist-luxury.tsx    # Backup luxury version (hidden)
│   │   │   └── wishlist-old-backup.tsx # Old version (hidden)
│   ├── auth/                     # Auth routes (public)
│   │   ├── _layout.tsx           # Auth stack layout
│   │   ├── login.tsx             # Login screen
│   │   └── signup.tsx            # Signup screen
│   └── group/
│       └── [id].tsx              # Dynamic group detail screen
│
├── components/                   # Reusable UI components organized by feature
│   ├── wishlist/                 # Wishlist-specific components
│   │   ├── LuxuryWishlistCard.tsx    # Card for wishlist item with actions
│   │   ├── WishlistItemCard.tsx      # Alternative card component
│   │   ├── WishlistItemCardSimple.tsx # Simple card variant
│   │   ├── AddItemModal.tsx      # Modal form to add new wishlist item
│   │   └── AddItemBottomSheet.tsx # Alternative bottom sheet variant
│   │   └── LuxuryBottomSheet.tsx # Luxury-themed bottom sheet
│   ├── groups/                   # Group-specific components
│   │   ├── GroupCard.tsx         # Card for displaying a group
│   │   ├── CreateGroupModal.tsx  # Modal form to create group
│   │   └── JoinGroupModal.tsx    # Modal form to join group by code
│   ├── ui/                       # Shared UI primitives
│   │   └── StarRating.tsx        # Star rating component
│   └── auth/                     # Auth-specific components (if any)
│
├── lib/                          # Library and service initialization
│   └── supabase.ts               # Supabase client singleton with config
│
├── utils/                        # Business logic and service functions
│   ├── auth.ts                   # Authentication service functions (signIn, signUp)
│   └── groups.ts                 # Group operations (create, fetch, join, leave, update)
│
├── types/                        # TypeScript type definitions
│   ├── index.ts                  # Type exports barrel file
│   └── database.types.ts         # Database schema interfaces (User, Group, WishlistItem, etc.)
│
├── constants/                    # App-wide constants and configuration
│   ├── theme.ts                  # Design system: colors, typography, spacing, shadows, gradients
│   └── index.ts                  # Exports barrel file
│
├── hooks/                        # Custom React hooks (currently empty)
│   └── README.md                 # Placeholder for future custom hooks
│
├── assets/                       # Static assets (icons, images, fonts)
├── docs/                         # Project documentation
├── supabase/                     # Supabase migrations and edge functions (if any)
├── scripts/                      # Build and utility scripts
│   ├── start-fresh.sh            # Clean start script
│   └── clean.sh                  # Cleanup script
│
├── .expo/                        # Expo metadata (generated)
├── .planning/                    # Planning and documentation
├── .env                          # Environment variables (not committed)
├── .env.example                  # Environment template
├── app.json                      # Expo app configuration
├── babel.config.js               # Babel configuration
├── metro.config.js               # Metro bundler configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── gluestack-ui.config.ts        # Gluestack UI theme configuration
├── tsconfig.json                 # TypeScript configuration
├── nativewind-env.d.ts           # NativeWind type definitions
├── package.json                  # npm dependencies and scripts
├── package-lock.json             # Dependency lock file
├── README.md                     # Project readme
└── node_modules/                 # Dependencies (git-ignored)
```

## Directory Purposes

**app/:**
- Purpose: Expo Router file-based routing system defining all screens and navigation structure
- Contains: Route files (.tsx), layout wrappers, dynamic route parameters
- Key files: `_layout.tsx` (root), `(app)/_layout.tsx` (protected), `(tabs)/_layout.tsx` (tab config)

**components/:**
- Purpose: Reusable, feature-scoped React Native components
- Contains: Functional components with props interfaces, styled with theme constants
- Key files: Feature folders (wishlist/, groups/, ui/), Star rating UI primitive

**lib/:**
- Purpose: Initialization and configuration of external services
- Contains: Supabase client singleton with auth settings
- Key files: `supabase.ts` - exports configured client instance

**utils/:**
- Purpose: Business logic, service functions, and database operations
- Contains: Auth functions (signIn, signUp), group CRUD operations
- Key files: `auth.ts`, `groups.ts` - exported async functions with error handling

**types/:**
- Purpose: TypeScript type definitions and interfaces for app domain
- Contains: Database schema interfaces, authentication types
- Key files: `database.types.ts` (User, Group, WishlistItem, etc.), `index.ts` (barrel export)

**constants/:**
- Purpose: App-wide configuration values for theming and styling
- Contains: Color palettes, typography, spacing scale, shadows, gradients
- Key files: `theme.ts` (design system), `index.ts` (exports)

**hooks/:**
- Purpose: Custom React hooks for shared stateful logic
- Contains: Currently empty, placeholder for future hooks
- Key files: None yet

**assets/:**
- Purpose: Static files like icons, images, fonts
- Contains: App icons, splash screens
- Usage: Referenced in app.json and component imports

**scripts/:**
- Purpose: Build, development, and utility automation scripts
- Contains: Fresh start script, cleanup script
- Key files: `start-fresh.sh`, `clean.sh`

**docs/:**
- Purpose: Project documentation and design guides
- Contains: UI redesign documents, design summaries
- Key files: Markdown documentation files

## Key File Locations

**Entry Points:**
- `app/_layout.tsx`: Root layout - app initialization, Supabase setup, auth state listener, provider setup
- `app/(app)/(tabs)/_layout.tsx`: Tab navigation configuration - defines 3 main tabs (Home, Wishlist, Groups)
- `app/auth/_layout.tsx`: Auth flow - login and signup screens

**Configuration:**
- `app.json`: Expo app metadata (name, version, plugins)
- `gluestack-ui.config.ts`: Gluestack UI theming configuration
- `tailwind.config.js`: Tailwind CSS utility configuration
- `tsconfig.json`: TypeScript compiler options
- `metro.config.js`: React Native bundler configuration
- `.env`: Runtime configuration (Supabase URL, API key)

**Core Logic:**
- `lib/supabase.ts`: Supabase client initialization with AsyncStorage persistence
- `utils/auth.ts`: Sign in, sign up, logout functions
- `utils/groups.ts`: Create, fetch, join, leave, update group functions
- `types/database.types.ts`: Database schema interfaces

**Testing:**
- No test files currently present
- No test configuration files (jest.config.js, vitest.config.js)

**Styling/Theming:**
- `constants/theme.ts`: Design system - colors (burgundy, gold, cream), spacing, shadows, gradients
- `gluestack-ui.config.ts`: Gluestack component theming
- `tailwind.config.js`: Tailwind configuration

## Naming Conventions

**Files:**
- Screen files: kebab-case or camelCase + `.tsx` (e.g., `wishlist.tsx`, `login.tsx`, `[id].tsx`)
- Component files: PascalCase + `.tsx` (e.g., `LuxuryWishlistCard.tsx`, `GroupCard.tsx`)
- Utility files: camelCase + `.ts` (e.g., `groups.ts`, `auth.ts`)
- Type files: camelCase + `.ts` (e.g., `database.types.ts`)
- Config files: kebab-case or camelCase + `.js`/`.ts` (e.g., `tailwind.config.js`)

**Directories:**
- Feature folders: lowercase (e.g., `wishlist/`, `groups/`, `auth/`)
- Route groups: parentheses (e.g., `(app)/`, `(tabs)/`) - Expo Router convention
- Dynamic routes: brackets (e.g., `[id].tsx`) - Expo Router convention

**Components:**
- PascalCase for all component files (React convention)
- Props interfaces: `<ComponentName>Props` format
- Exported as default or named export

**Functions:**
- Utility functions: camelCase, verb-first (e.g., `fetchUserGroups`, `createGroup`)
- Return type: `{ data?: T, error?: Error }` for consistency
- Async-first for all database operations

## Where to Add New Code

**New Feature:**
- Primary code: `app/(app)/(tabs)/[feature-name].tsx` (screen) + `components/[feature-name]/` (components)
- Tests: No test directory exists - consider adding `__tests__/` or `.test.tsx` files
- Services: Add to `utils/[feature-name].ts` if database operations needed

**New Component/Module:**
- Implementation: `components/[feature-folder]/[ComponentName].tsx`
- Props interface: Define interface `<ComponentName>Props` at top of file
- Styling: Import and use `colors`, `spacing`, `shadows`, `borderRadius` from `constants/theme.ts`
- Theme integration: Use Gluestack UI components with theme config

**Utilities:**
- Shared helpers: Add to `utils/` directory with descriptive name
- Service functions: Follow `{ data?, error? }` return pattern
- Async operations: Use async/await with proper error handling

**New Types:**
- Database types: Add interface to `types/database.types.ts`
- App types: Add to `types/index.ts` or export from database.types.ts
- Component props: Define inline in component file as `<ComponentName>Props`

**Styling:**
- New colors: Add to `colors` object in `constants/theme.ts`
- New spacing: Add to `spacing` object in `constants/theme.ts`
- New shadows: Add to `shadows` object in `constants/theme.ts`
- Gradients: Add to `gradients` object in `constants/theme.ts`

## Special Directories

**app/:**
- Purpose: Expo Router routing system
- Generated: No, manually maintained
- Committed: Yes
- Rules: File/folder structure maps directly to routes; `_layout.tsx` for nested layouts; `[id].tsx` for dynamic params

**node_modules/:**
- Purpose: npm package dependencies
- Generated: Yes, by `npm install`
- Committed: No (in .gitignore)
- Usage: Do not modify; update via package.json

**.expo/:**
- Purpose: Expo project metadata and cache
- Generated: Yes, by `expo` CLI
- Committed: No (in .gitignore)
- Usage: Auto-managed, do not modify

**.planning/:**
- Purpose: GSD (Goal-Structured Development) planning documents
- Generated: Yes, by planning tools
- Committed: Yes
- Contents: Architecture, structure, testing, conventions analysis

**.env:**
- Purpose: Runtime environment configuration
- Generated: No, manually created from .env.example
- Committed: No (in .gitignore)
- Contents: Supabase URL, API key, other secrets

---

*Structure analysis: 2026-02-02*
