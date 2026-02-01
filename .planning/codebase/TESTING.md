# Testing Patterns

**Analysis Date:** 2026-02-02

## Test Framework

**Status:** Not detected - no testing infrastructure currently configured

**Notable:**
- No Jest, Vitest, or other test runner found in `package.json`
- No test files (`.test.ts`, `.spec.ts`) in project source directories (only in node_modules)
- No test configuration files (jest.config.js, vitest.config.ts) detected
- TypeScript strict mode enabled (`strict: true` in tsconfig.json) provides compile-time type safety

**Implications:**
- Testing is not yet implemented in this codebase
- All validation is currently manual and runtime-based
- Type safety via TypeScript compiler is the primary quality gate

## Test File Organization

**No tests currently exist** in `/home/zetaz/wishlist-app/`

**Recommended structure** (if implemented):
- Co-located pattern: Tests adjacent to source
  - `components/groups/GroupCard.tsx` → `components/groups/GroupCard.test.tsx`
  - `utils/groups.ts` → `utils/groups.test.ts`
- Or separate directory pattern:
  - `__tests__/` or `tests/` directory at project root
  - Mirror source structure: `tests/utils/groups.test.ts`, `tests/components/groups/GroupCard.test.tsx`

**Preferred approach** for this project: Co-located pattern (matches component organization)

## Test Structure

**No existing test patterns** - but code organization suggests testing would follow:

**Hypothetical unit test structure** based on utility function patterns:

```typescript
// utils/groups.test.ts - suggested pattern
import { createGroup, fetchUserGroups, joinGroup } from './groups';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase');

describe('Groups Utilities', () => {
  describe('createGroup', () => {
    it('should create a group and add creator as admin member', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });

      // Act
      const { data, error } = await createGroup('Test Group', 50);

      // Assert
      expect(error).toBeNull();
      expect(data).toHaveProperty('id');
      expect(data?.name).toBe('Test Group');
    });

    it('should return error when user not authenticated', async () => {
      // Arrange
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

      // Act
      const { data, error } = await createGroup('Test Group', 50);

      // Assert
      expect(data).toBeNull();
      expect(error).toBeDefined();
    });
  });

  describe('joinGroup', () => {
    it('should not allow joining twice', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
      // Mock existing membership
      (supabase.from().select().eq().single as jest.Mock).mockResolvedValue({
        data: { group_id: 'group-1', user_id: 'user-123' }
      });

      // Act
      const { data, error } = await joinGroup('group-1');

      // Assert
      expect(error?.message).toContain('Already a member');
    });
  });
});
```

## Mocking

**Framework:** Not configured, but based on code structure, Jest would be standard

**Patterns** (inferred from code organization):

**Database Mocking:**
```typescript
// Mock Supabase client
jest.mock('../lib/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock individual query chains
mockSupabase.from('groups').select().eq.mockResolvedValue({
  data: [{ id: '1', name: 'Test Group', ... }],
  error: null
});
```

**Authentication Mocking:**
```typescript
// Mock auth state
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    }
  }
}));
```

**React Native Component Mocking:**
```typescript
// Mock react-native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Alert: {
    alert: jest.fn(),
  },
  // ... other components
}));

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'test-id' }),
}));
```

**What to Mock:**
- External services (Supabase, API calls)
- React Router/Navigation hooks
- Native modules (Alert, Share, Linking)
- Heavy animation libraries (Moti, react-native-reanimated)
- Platform-specific modules

**What NOT to Mock:**
- Business logic utility functions
- Type definitions and interfaces
- Theme constants
- Core React hooks (useState, useEffect) - let them run unless behavior testing needed
- Simple helper functions

## Fixtures and Factories

**Currently:** No fixtures or test data builders exist

**Recommended patterns** (based on data structures):

```typescript
// tests/fixtures/users.ts
export const mockUsers = {
  admin: {
    id: 'user-admin-1',
    email: 'admin@example.com',
    full_name: 'Admin User',
    avatar_url: null,
    birthday: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  member: {
    id: 'user-member-1',
    email: 'member@example.com',
    full_name: 'Member User',
    avatar_url: null,
    birthday: '1990-05-15',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

// tests/fixtures/groups.ts
export const mockGroups = {
  basic: {
    id: 'group-1',
    name: 'Test Group',
    created_by: 'user-admin-1',
    budget_limit_per_gift: 50,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

// tests/factories/userFactory.ts
export function createMockUser(overrides = {}) {
  return {
    id: `user-${Math.random()}`,
    email: `user-${Math.random()}@example.com`,
    full_name: 'Test User',
    avatar_url: null,
    birthday: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
```

**Location:** `tests/fixtures/` and `tests/factories/` directories at project root

## Coverage

**Requirements:** Not enforced

**Recommendation for MVP:**
- Minimum 70% overall coverage
- 100% coverage for utility functions (business logic)
- 80% coverage for components (user-facing logic)
- Core paths and error cases prioritized over edge cases

## Test Types

**Unit Tests:**
- **Scope:** Individual utility functions (`utils/groups.ts`, `utils/auth.ts`)
- **Approach:**
  - Test each exported function independently
  - Mock external dependencies (Supabase)
  - Verify return shapes and error conditions
  - Test both success and failure paths

**Example** from `utils/groups.ts`:
```typescript
describe('fetchUserGroups', () => {
  it('should fetch groups for authenticated user', async () => {
    // Test successful fetch with member count
  });

  it('should return empty array if user has no groups', async () => {
    // Test edge case
  });

  it('should handle Supabase errors gracefully', async () => {
    // Test error path
  });
});
```

**Integration Tests:**
- **Scope:** Cross-function workflows (create group → fetch group → join group)
- **Approach:**
  - Test complete user flows
  - Use in-memory database or test fixtures
  - Verify state changes across multiple operations
  - Test data consistency

**Example:**
```typescript
describe('Group Creation Flow', () => {
  it('should create group, add creator, and fetch with member count', async () => {
    // 1. Create group
    // 2. Verify creator is admin member
    // 3. Fetch groups for creator
    // 4. Verify member_count matches
  });
});
```

**E2E Tests:**
- **Framework:** Not configured - would recommend Detox for React Native or Playwright for web
- **When:** Not yet implemented
- **Critical paths:**
  - Authentication flow (sign up → sign in → sign out)
  - Group creation and joining
  - Wishlist item management
  - Navigation and screen transitions

## Common Patterns

**Async Testing:**

Hypothetical Jest/Vitest pattern based on async utility style:

```typescript
it('should handle async operations', async () => {
  const result = await createGroup('Test', 50);
  expect(result.error).toBeNull();
  expect(result.data?.id).toBeDefined();
});

// Or with async/await in test
it('should retry on failure', async () => {
  const { data, error } = await joinGroup('group-1');
  if (error) {
    const retryResult = await joinGroup('group-1');
    expect(retryResult.error).toBeDefined();
  }
});
```

**Error Testing:**

```typescript
describe('Error Handling', () => {
  it('should throw on missing authentication', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const { data, error } = await createGroup('Test', 50);
    expect(data).toBeNull();
    expect(error?.message).toContain('Not authenticated');
  });

  it('should format error messages for users', async () => {
    const mockError = new Error('Database connection failed');
    mockSupabase.from().insert().throwError(mockError);

    const { error } = await createGroup('Test', 50);
    expect(error).toBeDefined();
    // Verify error can be displayed to user
  });
});
```

**Navigation Testing:**

```typescript
it('should navigate to group detail on press', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  // In component
  const { getByText } = render(<GroupCard group={mockGroup} onPress={() => mockRouter.push('/group/1')} />);
  fireEvent.press(getByText('Test Group'));

  expect(mockRouter.push).toHaveBeenCalledWith('/group/1');
});
```

## Setup and Teardown

**Not implemented** - but recommended patterns:

```typescript
// Setup: before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Reset Supabase mocks to clean state
  mockSupabase.auth.getUser.mockReset();
});

// Teardown: after each test
afterEach(() => {
  // Clean up any test data if using real database
});

// Setup: before all tests in suite
beforeAll(() => {
  // Initialize test database or mock server
});

// Teardown: after all tests in suite
afterAll(() => {
  // Clean up resources
});
```

---

*Testing analysis: 2026-02-02*
