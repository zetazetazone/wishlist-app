# Gluestack UI Quick Reference

Fast reference for common Gluestack UI patterns in the Wishlist App.

## Import Pattern

```typescript
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  ButtonText,
  Input,
  InputField,
  Modal,
  ModalBackdrop,
  ModalContent,
  // ... other components
} from '@gluestack-ui/themed';
```

## Layout

| Component | Use Case | Example |
|-----------|----------|---------|
| `Box` | Universal container | `<Box bg="$white" p="$4">` |
| `VStack` | Vertical stack | `<VStack space="md">` |
| `HStack` | Horizontal stack | `<HStack space="sm">` |
| `Center` | Centered content | `<Center flex={1}>` |
| `Divider` | Separator line | `<Divider my="$2" />` |

## Typography

| Component | Use Case | Example |
|-----------|----------|---------|
| `Text` | Body text | `<Text size="md">` |
| `Heading` | Headers | `<Heading size="xl">` |

## Buttons

```typescript
// Primary button
<Button bg="$primary700" onPress={handlePress}>
  <ButtonText>Add Item</ButtonText>
</Button>

// Outline button
<Button variant="outline" action="primary">
  <ButtonText>Cancel</ButtonText>
</Button>

// Icon button
<Button>
  <ButtonIcon as={AddIcon} />
  <ButtonText>Add</ButtonText>
</Button>
```

## Forms

```typescript
// Text input
<Input variant="outline">
  <InputField placeholder="Enter text" value={value} onChangeText={setValue} />
</Input>

// Textarea
<Textarea>
  <TextareaInput placeholder="Description" />
</Textarea>

// Select
<Select>
  <SelectTrigger>
    <SelectInput placeholder="Choose..." />
  </SelectTrigger>
  <SelectPortal>
    <SelectContent>
      <SelectItem label="Option 1" value="1" />
    </SelectContent>
  </SelectPortal>
</Select>

// Checkbox
<Checkbox value="agree">
  <CheckboxIndicator>
    <CheckboxIcon as={CheckIcon} />
  </CheckboxIndicator>
  <CheckboxLabel>I agree</CheckboxLabel>
</Checkbox>
```

## Modal

```typescript
<Modal isOpen={isOpen} onClose={onClose}>
  <ModalBackdrop />
  <ModalContent>
    <ModalHeader>
      <Heading>Title</Heading>
      <ModalCloseButton />
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

## Feedback

```typescript
// Alert
<Alert action="success">
  <AlertIcon as={CheckCircleIcon} />
  <AlertText>Success!</AlertText>
</Alert>

// Spinner
<Spinner size="large" color="$primary500" />

// Toast
const toast = useToast();
toast.show({
  render: ({ id }) => (
    <Toast>
      <ToastTitle>Message</ToastTitle>
    </Toast>
  ),
});
```

## Design Tokens

### Colors
```typescript
// Luxury colors
$burgundy50 to $burgundy900
$gold50 to $gold900
$cream50 to $cream900

// Semantic colors
$primary50 to $primary900   // Burgundy
$secondary50 to $secondary900  // Gold
```

### Spacing
```typescript
$0    // 0px
$1    // 4px
$2    // 8px
$3    // 12px
$4    // 16px
$5    // 20px
$6    // 24px
$8    // 32px
```

### Border Radius
```typescript
$none  // 0
$xs    // 2px
$sm    // 4px
$md    // 6px
$lg    // 8px
$xl    // 12px
$2xl   // 16px
$3xl   // 24px
```

### Font Sizes
```typescript
$xs    // 12px
$sm    // 14px
$md    // 16px
$lg    // 18px
$xl    // 20px
$2xl   // 24px
$3xl   // 30px
```

## Common Patterns

### Form with Validation
```typescript
<VStack space="md" p="$4">
  <Input variant="outline" isInvalid={!!errors.email}>
    <InputField
      placeholder="Email"
      value={email}
      onChangeText={setEmail}
    />
  </Input>
  {errors.email && <Text color="$error500">{errors.email}</Text>}

  <Button onPress={handleSubmit}>
    <ButtonText>Submit</ButtonText>
  </Button>
</VStack>
```

### Card List
```typescript
<VStack space="md">
  {items.map((item) => (
    <Card key={item.id} p="$4">
      <VStack space="sm">
        <Heading size="sm">{item.title}</Heading>
        <Text>{item.description}</Text>
        <HStack space="sm" mt="$2">
          <Button flex={1} variant="outline" onPress={() => handleEdit(item)}>
            <ButtonText>Edit</ButtonText>
          </Button>
          <Button flex={1} action="negative" onPress={() => handleDelete(item)}>
            <ButtonText>Delete</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </Card>
  ))}
</VStack>
```

### Loading State
```typescript
{loading ? (
  <Center flex={1}>
    <Spinner size="large" />
    <Text mt="$2">Loading...</Text>
  </Center>
) : (
  <VStack space="md">
    {/* Content */}
  </VStack>
)}
```

### Empty State
```typescript
<Center flex={1} p="$8">
  <Box bg="$backgroundLight100" borderRadius="$full" p="$6">
    <Icon as={InboxIcon} size="xl" color="$textLight400" />
  </Box>
  <Heading size="md" mt="$4">No Items</Heading>
  <Text color="$textLight600" textAlign="center" mt="$2">
    Add your first item to get started
  </Text>
  <Button mt="$4" onPress={handleAdd}>
    <ButtonText>Add Item</ButtonText>
  </Button>
</Center>
```

## Migration Checklist

- [ ] Replace `View` with `Box`
- [ ] Replace `Text` with `Text` (update styling props)
- [ ] Replace `TouchableOpacity`/`Pressable` with `Button`
- [ ] Replace `TextInput` with `Input` + `InputField`
- [ ] Replace inline styles with design tokens
- [ ] Update color values to use theme colors
- [ ] Update spacing to use spacing tokens
- [ ] Replace custom modals with `Modal` component
- [ ] Replace custom alerts with `Alert` component

## Quick Tips

✅ **DO**
- Use design tokens (`$primary500`) instead of hardcoded colors
- Compose layouts with `VStack` and `HStack`
- Use semantic component names (`Button`, `Input`)
- Leverage built-in variants (`outline`, `solid`, `link`)

❌ **DON'T**
- Don't use inline styles when tokens exist
- Don't mix RN primitives with Gluestack when possible
- Don't hardcode spacing/colors
- Don't skip accessibility props

## Resources

- Full Guide: `docs/GLUESTACK_UI_GUIDE.md`
- Project Rules: `.claude/rules.md`
- Official Docs: https://gluestack.io/ui/docs
