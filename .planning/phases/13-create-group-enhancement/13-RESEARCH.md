# Phase 13: Create Group Enhancement - Research

**Researched:** 2026-02-04
**Domain:** React Native form design with conditional fields, photo upload, and mode/budget selection
**Confidence:** HIGH

## Summary

Phase 13 enhances the existing CreateGroupModal with photo upload, description field, mode selection (Greetings/Gifts), and conditional budget approach selection. Research confirms the existing tech stack (React Native, Expo, gluestack-ui, expo-image-manipulator) provides all necessary capabilities without new dependencies.

**Key findings:**
- Existing infrastructure from Phase 12 provides photo upload service and GroupAvatar component
- gluestack-ui supports all needed form components (Textarea, Radio/RadioGroup)
- Conditional field visibility follows standard React pattern (watch state + conditional render)
- Mode selector best implemented as radio group or custom segmented control
- Budget approach selector shown only when mode = 'gifts'

**Primary recommendation:** Extend CreateGroupModal with form fields in logical sections: basic info (name, photo), description, mode selection, conditional budget fields. Use gluestack-ui components for consistency.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Native | 0.81.5 | Mobile framework | Project foundation |
| Expo | ~54.0.33 | Development platform | Simplifies native features |
| gluestack-ui/themed | Latest | UI components | Project UI library |
| expo-image-picker | Built-in | Photo selection | Already used in Phase 12 |
| expo-image-manipulator | Latest | Image compression | Added in Phase 12 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | Latest | Type safety | All components |
| Supabase client | Latest | Database operations | Group creation/updates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gluestack-ui Radio | react-native-radio-buttons-group | More features but adds dependency |
| Custom segmented control | @react-native-segmented-control/segmented-control | iOS-only, deprecated on RN |
| gluestack-ui Textarea | React Native TextInput with multiline | Less accessible, no theme integration |

**Installation:**
No new packages needed - all components available in existing stack.

## Architecture Patterns

### Recommended Project Structure
```
components/groups/
├── CreateGroupModal.tsx      # Main modal (existing, to enhance)
├── GroupAvatar.tsx           # Photo display (exists from Phase 12)
utils/
├── groups.ts                 # createGroup function (exists, to extend)
lib/
├── storage.ts                # uploadGroupPhoto (exists from Phase 12)
types/
└── database.types.ts         # Group type (exists, already has new fields)
```

### Pattern 1: Modal Form with Sections
**What:** Organize complex forms into logical sections with spacing
**When to use:** Forms with 5+ fields requiring visual grouping
**Example:**
```typescript
<Modal visible={visible} onClose={onClose}>
  <ModalBackdrop />
  <ModalContent>
    <ModalHeader>
      <Heading>Create Group</Heading>
      <ModalCloseButton />
    </ModalHeader>
    <ModalBody>
      <VStack space="xl">
        {/* Section 1: Basic Info */}
        <VStack space="md">
          <PhotoUploadSection />
          <NameInput />
        </VStack>

        {/* Section 2: Description */}
        <VStack space="md">
          <DescriptionTextarea />
        </VStack>

        {/* Section 3: Mode Selection */}
        <VStack space="md">
          <ModeSelector />
        </VStack>

        {/* Section 4: Conditional Budget (only if mode = gifts) */}
        {mode === 'gifts' && (
          <VStack space="md">
            <BudgetApproachSelector />
            <BudgetAmountInput />
          </VStack>
        )}
      </VStack>
    </ModalBody>
  </ModalContent>
</Modal>
```
**Source:** [Building React Native forms with UI components - LogRocket Blog](https://blog.logrocket.com/building-react-native-forms-with-ui-components/)

### Pattern 2: Conditional Field Rendering
**What:** Show/hide fields based on parent field selection using state watching
**When to use:** Forms with dependent fields (e.g., budget fields only for 'gifts' mode)
**Example:**
```typescript
const [mode, setMode] = useState<'greetings' | 'gifts'>('gifts');
const [budgetApproach, setBudgetApproach] = useState<'per_gift' | 'monthly' | 'yearly'>('per_gift');

// Conditional rendering
{mode === 'gifts' && (
  <VStack space="md">
    <RadioGroup value={budgetApproach} onChange={setBudgetApproach}>
      <Radio value="per_gift">
        <RadioIndicator><RadioIcon /></RadioIndicator>
        <RadioLabel>Per Gift</RadioLabel>
      </Radio>
      <Radio value="monthly">
        <RadioIndicator><RadioIcon /></RadioIndicator>
        <RadioLabel>Monthly</RadioLabel>
      </Radio>
      <Radio value="yearly">
        <RadioIndicator><RadioIcon /></RadioIndicator>
        <RadioLabel>Yearly</RadioLabel>
      </Radio>
    </RadioGroup>
  </VStack>
)}
```
**Source:** [Conditionally Render Fields Using React Hook Form](https://echobind.com/post/conditionally-render-fields-using-react-hook-form), [Using React Hook Form with react-native - Part II (pre-filled values & conditional fields)](https://dev.to/sankhadeeproy007/using-react-hook-form-with-react-native-part-ii-pre-filled-values-conditional-fields-ik1)

### Pattern 3: Photo Upload with Preview
**What:** Pressable avatar component that triggers photo picker and shows preview
**When to use:** Optional photo upload in forms
**Example:**
```typescript
const [photoPath, setPhotoPath] = useState<string | null>(null);

const handlePhotoUpload = async () => {
  const path = await uploadGroupPhoto(groupId);
  if (path) {
    setPhotoPath(path);
  }
};

<Pressable onPress={handlePhotoUpload}>
  <GroupAvatar
    group={{ name: groupName, photo_url: photoPath }}
    size="2xl"
  />
</Pressable>
<Button variant="link" onPress={handlePhotoUpload}>
  <ButtonText>{photoPath ? 'Change Photo' : 'Add Photo'}</ButtonText>
</Button>
```
**Source:** Existing pattern from app/(app)/settings/profile.tsx and Phase 12 implementation

### Pattern 4: Mode Selector with Radio Group
**What:** Mutually exclusive mode selection using gluestack-ui Radio components
**When to use:** 2-4 mutually exclusive options that are always visible
**Example:**
```typescript
<VStack space="xs">
  <Text fontWeight="$medium">Group Mode</Text>
  <RadioGroup value={mode} onChange={setMode}>
    <VStack space="sm">
      <Radio value="gifts">
        <RadioIndicator>
          <RadioIcon />
        </RadioIndicator>
        <VStack space="xs" flex={1}>
          <RadioLabel>Gifts</RadioLabel>
          <Text fontSize="$xs" color="$textLight600">
            Coordinate gifts with budget tracking
          </Text>
        </VStack>
      </Radio>
      <Radio value="greetings">
        <RadioIndicator>
          <RadioIcon />
        </RadioIndicator>
        <VStack space="xs" flex={1}>
          <RadioLabel>Greetings</RadioLabel>
          <Text fontSize="$xs" color="$textLight600">
            Collect digital birthday greetings
          </Text>
        </VStack>
      </Radio>
    </VStack>
  </RadioGroup>
</VStack>
```
**Source:** [gluestack-ui Radio Component Documentation](https://gluestack.io/ui/docs/components/radio)

### Anti-Patterns to Avoid
- **Modal content too tall:** Don't cram 8+ fields without ScrollView - users on small devices can't reach submit button
- **Unlabeled form controls:** Every input needs a visible label (not just placeholder) for accessibility
- **Dropdowns for 2-3 options:** Radio buttons are faster and clearer for few mutually exclusive options
- **Budget input without validation:** Must validate budget_amount is positive when budget_approach selected
- **Photo upload before group exists:** Can't upload to groups/{groupId}/ path before group created - either generate temp ID or upload after creation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image picker UI | Custom camera/gallery modal | expo-image-picker | Handles permissions, cropping, aspect ratios cross-platform |
| Image compression | Manual canvas/buffer operations | expo-image-manipulator | Optimized native compression, tested across devices |
| Radio button styling | Custom TouchableOpacity + state | gluestack-ui Radio/RadioGroup | Accessible, themed, keyboard navigation |
| Textarea with character limit | TextInput + manual counter | gluestack-ui Textarea + controlled state | Accessible, consistent styling |
| Form validation | Custom validation logic | Database CHECK constraints + client-side validation | Server-side validation prevents invalid data |
| Avatar with fallback | Complex conditional rendering | GroupAvatar component (exists) | Handles initials generation, photo display, fallback |

**Key insight:** Form components are accessibility landmines - use battle-tested UI libraries with WCAG compliance built-in.

## Common Pitfalls

### Pitfall 1: Photo Upload Timing Race Condition
**What goes wrong:** Trying to upload photo to `groups/{groupId}/` path before group record exists in database causes upload to succeed but path is orphaned.
**Why it happens:** Photo upload needs groupId but group isn't created until form submission.
**How to avoid:**
- **Option A (recommended):** Photo upload happens *after* group creation completes successfully
- **Option B:** Generate UUIDv4 for group before form submission, use for upload path
**Warning signs:** Photo uploads succeed but photo_url not displayed, orphaned files in storage
**Example flow:**
```typescript
// CORRECT: Upload after creation
const { data: group, error } = await createGroup(name, budget);
if (!error && group && photoUri) {
  const path = await uploadGroupPhoto(group.id);
  if (path) {
    await updateGroup(group.id, { photo_url: path });
  }
}

// WRONG: Upload before creation
const path = await uploadGroupPhoto('unknown-id'); // Orphaned file
const { data: group } = await createGroup(name, budget);
```

### Pitfall 2: Budget Validation Confusion
**What goes wrong:** User selects budget approach but forgets to enter budget amount, or enters budget without selecting approach - form submits with inconsistent data.
**Why it happens:** budget_approach and budget_amount are interdependent but stored separately.
**How to avoid:**
- Client-side validation: If mode='gifts' AND budget_approach selected → budget_amount required
- Database constraint exists (from Phase 11): `CHECK ((mode = 'gifts' AND budget_approach IS NOT NULL AND budget_amount > 0) OR (mode = 'greetings' AND budget_approach IS NULL AND budget_amount IS NULL))`
- Show validation error before submission
**Warning signs:** Database constraint violation errors, inconsistent budget state
**Example validation:**
```typescript
if (mode === 'gifts') {
  if (!budgetApproach) {
    Alert.alert('Error', 'Please select a budget approach');
    return;
  }
  if (!budgetAmount || budgetAmount <= 0) {
    Alert.alert('Error', 'Please enter a budget amount');
    return;
  }
}
```

### Pitfall 3: Modal Keyboard Overlap
**What goes wrong:** On iOS, keyboard covers input fields or submit button when editing description textarea.
**Why it happens:** Modal content not wrapped in KeyboardAvoidingView or ScrollView.
**How to avoid:**
- Wrap ModalBody content in ScrollView for tall forms
- Use KeyboardAvoidingView with behavior="padding" for iOS
- Existing CreateGroupModal already has this pattern
**Warning signs:** Users report can't see what they're typing, can't reach submit button
**Example:**
```typescript
<Modal visible={visible}>
  <ModalBackdrop />
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ModalContent>
      <ModalBody>
        <ScrollView>
          {/* Form fields */}
        </ScrollView>
      </ModalBody>
    </ModalContent>
  </KeyboardAvoidingView>
</Modal>
```

### Pitfall 4: Uncontrolled Default Values
**What goes wrong:** Mode defaults to 'gifts' in database but useState initializes to undefined - causes flash of wrong content or validation errors.
**Why it happens:** Database DEFAULT doesn't sync automatically to React state.
**How to avoid:** Initialize all form state with same defaults as database schema
**Warning signs:** Conditional fields flicker on mount, validation fails for "required" fields that have defaults
**Example:**
```typescript
// CORRECT: Match database defaults
const [mode, setMode] = useState<'greetings' | 'gifts'>('gifts'); // matches DB DEFAULT
const [budgetApproach, setBudgetApproach] = useState<'per_gift' | 'monthly' | 'yearly' | null>(null);

// WRONG: Undefined initial state
const [mode, setMode] = useState<'greetings' | 'gifts'>(); // undefined
```

### Pitfall 5: Description Character Limit UX
**What goes wrong:** User types long description, doesn't realize there's a limit until save fails or text gets truncated silently.
**Why it happens:** Database has character limit (common practice) but UI doesn't communicate it.
**How to avoid:**
- Show character counter: "250 / 500 characters"
- Disable input at limit OR show warning when approaching limit
- Validate before submission with clear error message
**Warning signs:** Users complain about "lost" text, confusion about why description incomplete
**Example:**
```typescript
const MAX_DESCRIPTION = 500;
<VStack space="xs">
  <Text fontWeight="$medium">Description</Text>
  <Textarea>
    <TextareaInput
      placeholder="What's this group about?"
      value={description}
      onChangeText={setDescription}
      maxLength={MAX_DESCRIPTION}
    />
  </Textarea>
  <Text fontSize="$xs" color="$textLight600">
    {description.length} / {MAX_DESCRIPTION} characters
  </Text>
</VStack>
```

## Code Examples

Verified patterns from official sources:

### gluestack-ui Textarea with Label
```typescript
// Source: https://gluestack.io/ui/docs/components/textarea
import { VStack, Text, Textarea, TextareaInput } from '@gluestack-ui/themed';

<VStack space="xs">
  <Text fontWeight="$medium" color="$textLight700">
    Description
  </Text>
  <Textarea>
    <TextareaInput
      placeholder="What's this group about? (optional)"
      value={description}
      onChangeText={setDescription}
      numberOfLines={4}
      maxLength={500}
    />
  </Textarea>
  <Text fontSize="$xs" color="$textLight600">
    Optional - add context for group members
  </Text>
</VStack>
```

### gluestack-ui Radio Group Pattern
```typescript
// Source: https://gluestack.io/ui/docs/components/radio
import {
  VStack,
  Text,
  Radio,
  RadioGroup,
  RadioIndicator,
  RadioIcon,
  RadioLabel
} from '@gluestack-ui/themed';

<VStack space="xs">
  <Text fontWeight="$medium" color="$textLight700">
    Budget Approach
  </Text>
  <RadioGroup value={budgetApproach} onChange={setBudgetApproach}>
    <VStack space="sm">
      <Radio value="per_gift">
        <RadioIndicator>
          <RadioIcon />
        </RadioIndicator>
        <RadioLabel>Per Gift</RadioLabel>
      </Radio>
      <Radio value="monthly">
        <RadioIndicator>
          <RadioIcon />
        </RadioIndicator>
        <RadioLabel>Monthly</RadioLabel>
      </Radio>
      <Radio value="yearly">
        <RadioIndicator>
          <RadioIcon />
        </RadioIndicator>
        <RadioLabel>Yearly</RadioLabel>
      </Radio>
    </VStack>
  </RadioGroup>
</VStack>
```

### Conditional Field Rendering
```typescript
// Source: React Native best practices
const [mode, setMode] = useState<'greetings' | 'gifts'>('gifts');
const [budgetApproach, setBudgetApproach] = useState<'per_gift' | 'monthly' | 'yearly' | null>(null);
const [budgetAmount, setBudgetAmount] = useState('');

// Only show budget fields when mode = 'gifts'
{mode === 'gifts' && (
  <VStack space="md">
    <Text fontWeight="$medium">Budget Settings</Text>
    <BudgetApproachRadioGroup
      value={budgetApproach}
      onChange={setBudgetApproach}
    />
    {budgetApproach && (
      <Input>
        <InputField
          placeholder="Budget amount"
          value={budgetAmount}
          onChangeText={setBudgetAmount}
          keyboardType="decimal-pad"
        />
      </Input>
    )}
  </VStack>
)}
```

### Photo Upload Integration
```typescript
// Source: Existing Phase 12 implementation
import { uploadGroupPhoto, getGroupPhotoUrl } from '@/lib/storage';
import { GroupAvatar } from '@/components/groups/GroupAvatar';

const [photoPath, setPhotoPath] = useState<string | null>(null);

const handlePhotoUpload = async () => {
  if (!groupId) {
    Alert.alert('Error', 'Create group first');
    return;
  }

  const path = await uploadGroupPhoto(groupId);
  if (path) {
    setPhotoPath(path);
    // Update group record
    await updateGroup(groupId, { photo_url: path });
  }
};

<VStack space="md" alignItems="center">
  <Pressable onPress={handlePhotoUpload}>
    <GroupAvatar
      group={{ name: groupName, photo_url: photoPath }}
      size="2xl"
    />
  </Pressable>
  <Button variant="link" onPress={handlePhotoUpload}>
    <ButtonText>
      {photoPath ? 'Change Photo' : 'Add Group Photo (Optional)'}
    </ButtonText>
  </Button>
</VStack>
```

### Form Validation Before Submission
```typescript
const handleCreate = async () => {
  // Basic validation
  if (!name.trim()) {
    Alert.alert('Error', 'Please enter a group name');
    return;
  }

  // Mode-specific validation
  if (mode === 'gifts') {
    if (!budgetApproach) {
      Alert.alert('Error', 'Please select a budget approach for Gifts mode');
      return;
    }

    const budgetNum = parseFloat(budgetAmount);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }
  }

  // Create group with all fields
  const { data, error } = await createGroup({
    name: name.trim(),
    description: description.trim() || null,
    mode,
    budget_approach: mode === 'gifts' ? budgetApproach : null,
    budget_amount: mode === 'gifts' ? Math.round(budgetNum * 100) : null, // cents
    photo_url: photoPath,
  });

  if (error) {
    Alert.alert('Error', 'Failed to create group');
    return;
  }

  Alert.alert('Success', `Group "${name}" created!`);
  onSuccess();
  onClose();
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dropdown for mode selection | Radio buttons with descriptions | 2024-2025 | Better UX for 2-3 options, faster selection |
| TextInput with multiline | gluestack-ui Textarea | Project adoption | Consistent theming, better accessibility |
| expo-image-picker only | expo-image-picker + expo-image-manipulator | 2024 | Compression reduces storage costs, faster uploads |
| Manual keyboard handling | KeyboardAvoidingView + ScrollView | Standard RN practice | Prevents keyboard overlap issues |
| SegmentedControlIOS | Radio group or custom component | iOS deprecated 2023 | Cross-platform support |

**Deprecated/outdated:**
- **SegmentedControlIOS:** Official RN component deprecated, use community packages or custom implementation
- **Dropdowns for 2-3 options:** UX research shows radio buttons are faster and clearer
- **Upload without compression:** Modern best practice is client-side compression before upload

## Open Questions

Things that couldn't be fully resolved:

1. **Photo upload timing strategy**
   - What we know: Can upload after group creation OR use pre-generated UUID
   - What's unclear: Which approach is better for UX (loading states, error handling)
   - Recommendation: Upload after creation (simpler, no orphaned files risk)

2. **Budget amount input format**
   - What we know: Database stores cents as INTEGER, UI should show dollars
   - What's unclear: Input formatting (decimal pad vs formatted input with $ symbol)
   - Recommendation: Decimal pad for simplicity, convert to cents before save, show validation for negative/invalid

3. **Description field prominence**
   - What we know: Description is optional, helps clarify group purpose
   - What's unclear: Should it be prominent (encouraged) or minimized (truly optional)?
   - Recommendation: Show by default with "optional" label, placeholder suggests use case

## Sources

### Primary (HIGH confidence)
- [gluestack-ui Radio Component](https://gluestack.io/ui/docs/components/radio) - Official component documentation
- [gluestack-ui Textarea Component](https://gluestack.io/ui/docs/components/textarea) - Official component documentation
- Phase 12 implementation - uploadGroupPhoto, GroupAvatar, compression patterns
- Existing codebase - CreateGroupModal.tsx, profile.tsx patterns

### Secondary (MEDIUM confidence)
- [React Native Best Practices 2026 - Aalpha](https://www.aalpha.net/articles/best-practices-for-react-native-development/) - Form best practices
- [Building React Native forms with UI components - LogRocket](https://blog.logrocket.com/building-react-native-forms-with-ui-components/) - Form patterns
- [Conditionally Render Fields Using React Hook Form](https://echobind.com/post/conditionally-render-fields-using-react-hook-form) - Conditional field patterns
- [Using React Hook Form with react-native - Part II](https://dev.to/sankhadeeproy007/using-react-hook-form-with-react-native-part-ii-pre-filled-values-conditional-fields-ik1) - Conditional fields
- [Dropdown Cheat Sheet - Bootcamp](https://medium.com/design-bootcamp/dropdown-cheat-sheet-a-practical-guide-for-ui-ux-designers-3d07903aaaa4) - When to use dropdowns vs other controls
- [10 Best Toggle Switch Components for React And React Native (2026 Update)](https://reactscript.com/best-toggle-switch/) - Toggle/switch patterns

### Tertiary (LOW confidence)
- [React Native Paper RadioButton](https://callstack.github.io/react-native-paper/docs/components/RadioButton/) - Alternative library reference
- [@react-native-segmented-control/segmented-control](https://github.com/react-native-segmented-control/segmented-control) - Segmented control alternative
- [react-native-radio-buttons-group](https://github.com/ThakurBallary/react-native-radio-buttons-group) - Alternative radio implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components exist in current stack, no new dependencies
- Architecture: HIGH - Existing modal pattern proven, Phase 12 provides photo infrastructure
- Pitfalls: MEDIUM - Photo timing and validation issues are common but documented
- Conditional fields: HIGH - Standard React pattern, well-documented

**Research date:** 2026-02-04
**Valid until:** 60 days (stable stack, minimal API changes expected in React Native/Expo)
