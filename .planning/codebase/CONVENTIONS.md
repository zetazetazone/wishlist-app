# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `WishlistItemCard.tsx`, `GroupCard.tsx`)
- Utilities: camelCase (e.g., `auth.ts`, `groups.ts`)
- Types: PascalCase in `types/` directory (e.g., `database.types.ts`)
- Constants: Separate file per domain (e.g., `constants/theme.ts`)

**Functions:**
- Event handlers: `handle[Event]` pattern (e.g., `handleCreate`, `handleOpenLink`, `handleDelete`, `handleShare`)
- Async utilities: camelCase with `async` keyword (e.g., `fetchUserGroups`, `createGroup`, `joinGroup`)
- Helper functions: camelCase (e.g., `generateInviteCode`, `getPriorityColor`, `formatPrice`)
- React components: Default export as PascalCase component name

**Variables:**
- Component props: camelCase with `Props` suffix for interfaces (e.g., `WishlistItemCardProps`)
- State: camelCase with `useState` (e.g., `const [loading, setLoading]`)
- State setters: `set[State]` pattern (e.g., `setLoading`, `setGroups`, `setCreateModalVisible`)
- Extracted values from route params: camelCase (e.g., `const { id } = useLocalSearchParams()`)

**Types:**
- Interfaces: PascalCase (e.g., `AuthUser`, `Group`, `WishlistItem`, `GroupWithMembers`)
- Union types: PascalCase (e.g., `'admin' | 'member'` as inline literals)
- Enums/discriminated unions: Inline string literals in interface properties

## Code Style

**Formatting:**
- Use Expo TypeScript configuration with strict mode enabled (`strict: true` in tsconfig.json)
- No dedicated linter/formatter detected; project appears to follow loose conventions
- Indentation: 2 spaces (based on existing code)
- Semicolons: Used throughout (e.g., lines ending with `;`)
- Quotes: Single quotes for strings in TypeScript, not enforced globally

**Linting:**
- TypeScript strict mode enabled for type safety
- No ESLint or Prettier config found
- No code formatter explicitly configured
- Rely on TypeScript compiler for type checking

## Import Organization

**Order:**
1. React Native core imports (`react-native`)
2. React and React hooks (`react`)
3. Third-party libraries (`expo-*`, `@gluestack-*`, `@react-native-*`, `moti`, `nativewind`)
4. Local utilities and services (`../lib/`, `../utils/`)
5. Local components (`../components/`)
6. Local types (`../types`)
7. Local constants (`../constants/`)
8. Polyfills and side-effects (top of file: `react-native-url-polyfill/auto`)

**Path Aliases:**
- No path aliases detected (`~`, `@`) - using relative paths throughout
- Relative paths follow directory depth: `../../` for moving up levels

**Example import pattern** from `app/group/[id].tsx`:
```typescript
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ... } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { fetchGroupDetails } from '../../utils/groups';
import { Group, User } from '../../types';
import { colors, spacing, borderRadius, shadows } from '../../constants/theme';
```

## Error Handling

**Patterns:**
- Try-catch blocks with error object handling: `catch (error) { console.error('message:', error); return { data: null, error }; }`
- Return pattern: `{ data: T | null, error: any }` - all async utilities return tuple-like object
- Error propagation: Errors wrapped with context messages (e.g., `throw new Error('Failed to create group: ${groupError.message}')`)
- Defensive checks: Guard clauses for null/undefined values (e.g., `if (!user) throw new Error('Not authenticated');`)
- Alert dialogs for user-facing errors: `Alert.alert('Error', errorMessage)` in components

**Error examples** from `utils/groups.ts`:
```typescript
// Standard error handling pattern
try {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return { data, error: null };
} catch (error) {
  console.error('Error message:', error);
  return { data: null, error };
}

// Error checking with context
if (!user) throw new Error('Not authenticated');

// User-friendly error in components
const { data, error } = await createGroup(name.trim(), budgetNum);
if (error) {
  const errorMessage = error instanceof Error
    ? error.message
    : 'Failed to create group. Please try again.';
  Alert.alert('Error', errorMessage);
  return;
}
```

## Logging

**Framework:** Console API (`console.log`, `console.error`)

**Patterns:**
- Development logging: `console.log('message:', value)` for progress tracking
- Error logging: `console.error('context:', error)` for debugging failures
- Verbose logging in utility functions for operational transparency (e.g., `createGroup` logs user creation, group creation, member addition steps)
- No structured logging or remote error tracking detected

**Examples** from `utils/groups.ts`:
```typescript
console.log('Creating group for user:', user.id, 'email:', user.email);
console.log('Existing user check:', existingUser ? 'Found' : 'Not found');
console.error('Failed to create user profile:', userCreateError);
console.log('User profile created successfully');
```

## Comments

**When to Comment:**
- Function documentation: JSDoc-style comments for public utility functions (e.g., `/** Create a new group */`)
- Implementation notes: Explanatory comments for non-obvious database behavior (e.g., "User profile is automatically created by trigger")
- Warning comments: Special handling edge cases (e.g., "For MVP, we'll use the group ID as the invite code")

**JSDoc/TSDoc:**
- Minimal usage, found in utility function headers
- Format: `/** [description] */` on line above function
- No parameter or return type documentation in JSDoc (types inferred from TypeScript signatures)

**Example** from `utils/groups.ts`:
```typescript
/**
 * Generate a unique 6-character invite code
 */
function generateInviteCode(): string {
  ...
}

/**
 * Create a new group
 */
export async function createGroup(name: string, budgetLimit: number = 50) {
  ...
}
```

## Function Design

**Size:**
- Utilities: 5-70 lines for single-responsibility functions
- Components: 40-400 lines for screen-sized components with internal JSX
- Handlers: 3-20 lines for event handler methods

**Parameters:**
- Named parameters with interface types for configuration (e.g., `CreateGroupModalProps`)
- Utility functions accept explicit parameters plus destructuring for options
- Event handlers receive typed event objects from React Native

**Return Values:**
- Async utilities: Consistent `{ data: T | null, error: Error | null }` tuple pattern
- Helper functions: Direct return of computed values (e.g., `getPriorityColor() -> string`)
- Event handlers: `void` or `Promise<void>`, primarily for side effects (state updates, navigation)

**Example patterns**:
```typescript
// Async utility pattern
export async function fetchUserGroups() {
  try {
    // ... implementation
    return { data: groupsWithCount, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Helper function pattern
const formatPrice = (price?: number) => {
  if (!price) return null;
  return `$${price.toFixed(2)}`;
};

// Event handler pattern
const handleCreate = async () => {
  setLoading(true);
  const { data, error } = await createGroup(name.trim(), budgetNum);
  setLoading(false);
  if (error) { /* handle error */ }
  // Reset and navigate
  setName('');
  onSuccess();
};
```

## Module Design

**Exports:**
- Utility modules: Named exports for all functions (e.g., `export async function createGroup`)
- Type modules: Named exports for interfaces (e.g., `export interface AuthUser`)
- Components: Default export for screen/page components, named exports for reusable components
- Constants: Re-export pattern for grouping (e.g., `export * from './database.types'` in `types/index.ts`)

**Barrel Files:**
- `types/index.ts`: Re-exports database types and defines additional interfaces
- `constants/index.ts`: Likely aggregates theme constants
- No barrel files in components directory (imports use specific component paths)

**Example** from `types/index.ts`:
```typescript
export * from './database.types';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}
```

## Styling Conventions

**React Native Style:**
- Mix of inline styles and NativeWind Tailwind classes
- Theme constants from `constants/theme.ts`: `colors`, `spacing`, `borderRadius`, `shadows`, `gradients`
- Spread operator for complex style objects: `{ ...shadows.md, ...gradients }`

**Theme Token Usage**:
- Colors: `colors.[colorName].[shade]` (e.g., `colors.burgundy[800]`, `colors.gold[600]`)
- Spacing: `spacing.[size]` (e.g., `spacing.md`, `spacing.lg`)
- Border radius: `borderRadius.[size]` (e.g., `borderRadius.lg`)
- Shadows: `shadows.[intensity]` (e.g., `shadows.md`, `shadows.lg`)

**NativeWind Classes:**
- Used for responsive and flex layouts: `className="flex-row justify-between items-start"`
- Not used for all styling; inline styles preferred for theme-aware colors
- Mix indicates gradual migration or preference for programmatic theme control

**Example** from `components/groups/GroupCard.tsx`:
```typescript
<View
  style={{
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.gold[100],
    ...shadows.md,
  }}
/>
```

---

*Convention analysis: 2026-02-02*
