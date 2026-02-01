# Project-Specific Rules for Wishlist App

This file contains project-specific rules that Claude Code should follow for this project.

---

## UI Component Library

### Rule: Always Use Gluestack UI Components

**When:** Building any UI components or screens.

**Mandatory Actions:**

1. **Primary Component Library:** Use `@gluestack-ui/themed` for ALL UI components
   - ❌ NEVER use plain React Native components when a Gluestack equivalent exists
   - ✅ ALWAYS prefer Gluestack components for buttons, inputs, modals, cards, etc.

2. **Component Import Pattern:**
   ```typescript
   import {
     Button,
     ButtonText,
     Input,
     InputField,
     Box,
     Text,
     VStack,
     HStack,
   } from '@gluestack-ui/themed';
   ```

3. **Gluestack Component Priority:**
   - **Layout:** Use `Box`, `VStack`, `HStack`, `Center`, `Divider`
   - **Typography:** Use `Text`, `Heading`
   - **Forms:** Use `Input`, `InputField`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Slider`
   - **Buttons:** Use `Button`, `ButtonText`, `ButtonIcon`, `ButtonSpinner`, `ButtonGroup`
   - **Feedback:** Use `Alert`, `Toast`, `Progress`, `Spinner`, `Skeleton`
   - **Overlay:** Use `Modal`, `AlertDialog`, `Popover`, `Tooltip`, `Menu`
   - **Data Display:** Use `Badge`, `Avatar`, `Card`, `Accordion`
   - **Media:** Use `Image`, `Icon`

4. **When to Use React Native Components:**
   - ✅ `ScrollView` - No Gluestack equivalent
   - ✅ `FlatList` / `SectionList` - For lists
   - ✅ `KeyboardAvoidingView` - For keyboard handling
   - ✅ `SafeAreaView` - For safe areas
   - ✅ Custom platform-specific features not in Gluestack

5. **Styling Approach:**
   ```typescript
   // ✅ CORRECT: Use Gluestack style props
   <Box bg="$primary500" p="$4" borderRadius="$lg">
     <Text color="$white">Hello</Text>
   </Box>

   // ❌ INCORRECT: Don't use inline styles when Gluestack props exist
   <View style={{ backgroundColor: 'blue', padding: 16 }}>
     <Text style={{ color: 'white' }}>Hello</Text>
   </View>
   ```

6. **Theme Integration:**
   - Use Gluestack design tokens: `$primary500`, `$spacing4`, `$borderRadius-lg`
   - Maintain consistency with the luxury theme (burgundy, gold, cream colors)
   - Map existing color constants to Gluestack theme tokens

### Examples

**✅ CORRECT - Button Component:**
```typescript
import { Button, ButtonText } from '@gluestack-ui/themed';

<Button
  bg="$primary700"
  borderRadius="$lg"
  p="$4"
  onPress={handlePress}
>
  <ButtonText color="$white" fontSize="$lg">
    Add to Wishlist
  </ButtonText>
</Button>
```

**❌ INCORRECT - Using TouchableOpacity:**
```typescript
import { TouchableOpacity, Text } from 'react-native';

<TouchableOpacity
  style={{ backgroundColor: 'blue', padding: 16 }}
  onPress={handlePress}
>
  <Text style={{ color: 'white' }}>Add to Wishlist</Text>
</TouchableOpacity>
```

**✅ CORRECT - Form Input:**
```typescript
import { Input, InputField } from '@gluestack-ui/themed';

<Input variant="outline" size="md">
  <InputField
    placeholder="Enter product name"
    value={title}
    onChangeText={setTitle}
  />
</Input>
```

**✅ CORRECT - Modal:**
```typescript
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Heading,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';

<Modal isOpen={isOpen} onClose={onClose}>
  <ModalBackdrop />
  <ModalContent>
    <ModalHeader>
      <Heading size="lg">Add Gift</Heading>
    </ModalHeader>
    <ModalBody>
      {/* Content */}
    </ModalBody>
    <ModalFooter>
      <Button onPress={onClose}>
        <ButtonText>Close</ButtonText>
      </Button>
    </ModalFooter>
  </ModalContent>
</Modal>
```

### Component Migration Strategy

When encountering existing React Native components:

1. **Identify** the React Native component
2. **Find** the Gluestack equivalent
3. **Replace** with Gluestack component
4. **Update** styles to use design tokens
5. **Test** for functionality and visual consistency

### Reference Documentation

- Gluestack UI Docs: https://gluestack.io/ui/docs
- Component API: https://gluestack.io/ui/docs/components
- Theme Configuration: https://gluestack.io/ui/docs/theme-configuration

---

## SQL Migration Management

### Rule: All SQL Files Must Be Created as Migrations

**When:** Any time a SQL file is created or database schema changes are needed.

**Mandatory Actions:**

1. **Location:** Create ALL SQL files in `supabase/migrations/` directory
   - ❌ NEVER create SQL files in `docs/`, root, or any other directory
   - ✅ ALWAYS use `supabase/migrations/`

2. **Naming Convention:** Use timestamp-based naming
   ```
   Format: YYYYMMDDHHMMSS_description.sql
   Example: 20260201143022_add_user_preferences.sql
   ```

   Generate timestamp with:
   ```bash
   date +%Y%m%d%H%M%S
   ```

3. **File Creation Process:**
   ```bash
   # Step 1: Generate timestamped filename
   TIMESTAMP=$(date +%Y%m%d%H%M%S)
   FILENAME="supabase/migrations/${TIMESTAMP}_description_here.sql"

   # Step 2: Create the migration file
   touch $FILENAME

   # Step 3: Write SQL content to the file
   ```

4. **Documentation Requirements:**
   - Add descriptive comments at the top of each migration file
   - Document the purpose and any important notes
   - Include rollback strategy if applicable

   Example header:
   ```sql
   -- Migration: Add user preferences table
   -- Created: 2026-02-01
   -- Purpose: Store user-specific app preferences
   -- Rollback: DROP TABLE user_preferences;
   ```

5. **Update Migration Log:**
   - After creating a migration, add an entry to `supabase/README.md`
   - Include the migration filename and brief description
   - Format:
     ```markdown
     ### YYYYMMDDHHMMSS_description.sql
     - Brief description of what this migration does
     - Any important notes or dependencies
     ```

### Examples

**✅ CORRECT:**
```bash
# Create new migration for adding email verification
TIMESTAMP=$(date +%Y%m%d%H%M%S)
cat > supabase/migrations/${TIMESTAMP}_add_email_verification.sql << 'EOF'
-- Add email verification fields to users table
ALTER TABLE public.users
  ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN verification_token TEXT,
  ADD COLUMN verification_sent_at TIMESTAMPTZ;
EOF
```

**❌ INCORRECT:**
```bash
# Don't create SQL files in other locations
touch database-changes.sql  # Wrong: root directory
touch docs/new-table.sql    # Wrong: docs directory
touch sql/migration.sql     # Wrong: custom directory
```

### Migration Workflow

1. **Before Creating:**
   - Verify `supabase/migrations/` directory exists
   - Review existing migrations to avoid conflicts
   - Plan the change carefully

2. **During Creation:**
   - Use timestamp-based naming (YYYYMMDDHHMMSS_description.sql)
   - Add clear comments explaining the change
   - Include both forward migration and rollback notes

3. **After Creation:**
   - Update `supabase/README.md` with the new migration
   - Test the SQL in Supabase SQL Editor before committing
   - Verify no syntax errors or conflicts
   - Commit to version control with descriptive commit message

### Cleanup Rule

**When encountering SQL files outside `supabase/migrations/`:**

1. Review the SQL file content
2. Create a properly named migration file in `supabase/migrations/`
3. Copy content to the new migration file
4. Delete the original misplaced SQL file
5. Update `supabase/README.md`

### Exception Handling

**The ONLY exception:** If creating a one-time script for data analysis or temporary operations:
- Add a comment at the top: `-- TEMPORARY: Not a migration`
- Store in `supabase/temp/` directory (git-ignored)
- Delete after use

---

## File Organization Principles

### General Rules

1. **New Directories:** Before creating a new directory, verify it follows best practices
2. **No Temporary Files in Root:** Keep project root clean of temporary/test files
3. **Documentation Location:** All markdown documentation goes in `docs/`
4. **Configuration Files:** Keep root-level config files to minimum necessary

### Standard Directory Structure

```
wishlist-app/
├── .claude/              # Project-specific Claude rules
├── app/                  # Expo Router screens
├── assets/               # Static files
├── components/           # React components
├── constants/            # App constants
├── docs/                 # Documentation (markdown only)
├── hooks/                # Custom React hooks
├── lib/                  # Third-party integrations
├── supabase/             # Database migrations
│   └── migrations/       # Timestamped SQL files
├── types/                # TypeScript definitions
└── utils/                # Utility functions
```

---

## Enforcement

Claude Code should:
- ✅ Automatically suggest migrations in `supabase/migrations/` for any database changes
- ✅ Use timestamp-based naming automatically
- ✅ Refuse to create SQL files in other locations
- ✅ Prompt to clean up any SQL files found outside migrations directory
- ✅ Update README when creating new migrations

Last Updated: 2026-02-01
