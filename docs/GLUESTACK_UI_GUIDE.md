# Gluestack UI Integration Guide

Complete guide for using Gluestack UI components in the Wishlist App.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Component Usage](#component-usage)
- [Theme Customization](#theme-customization)
- [Migration Guide](#migration-guide)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Overview

Gluestack UI is a universal, styled component library for React Native and Web. It provides:

- **Consistent Design System**: Pre-built components with a unified design language
- **Accessibility**: WCAG compliant components out of the box
- **Theming**: Easy customization with design tokens
- **Performance**: Optimized for React Native performance
- **TypeScript**: Full TypeScript support

## Installation

Gluestack UI is already installed in this project. If you need to reinstall:

```bash
npm install @gluestack-ui/themed @gluestack-style/react react-native-svg --legacy-peer-deps
```

## Configuration

### Theme Configuration

The custom theme is defined in `gluestack-ui.config.ts`:

```typescript
import { config } from '@gluestack-ui/config';
import { createConfig } from '@gluestack-style/react';

export const config = createConfig({
  ...defaultConfig,
  tokens: {
    colors: {
      // Custom luxury color palette
      burgundy50: '#fdf2f4',
      gold50: '#fffbeb',
      cream50: '#fefefe',
      // ... more colors
    },
  },
});
```

### Provider Setup

The app is wrapped with `GluestackUIProvider` in `app/_layout.tsx`:

```typescript
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '../gluestack-ui.config';

export default function RootLayout() {
  return (
    <GluestackUIProvider config={config}>
      {/* Your app */}
    </GluestackUIProvider>
  );
}
```

## Component Usage

### Layout Components

#### Box
Universal container component for layout:

```typescript
import { Box } from '@gluestack-ui/themed';

<Box bg="$primary700" p="$4" borderRadius="$lg">
  {/* Content */}
</Box>
```

#### VStack & HStack
Vertical and horizontal stacking:

```typescript
import { VStack, HStack } from '@gluestack-ui/themed';

<VStack space="md" alignItems="center">
  <Text>Item 1</Text>
  <Text>Item 2</Text>
</VStack>

<HStack space="sm" justifyContent="space-between">
  <Text>Left</Text>
  <Text>Right</Text>
</HStack>
```

### Typography

#### Text & Heading

```typescript
import { Text, Heading } from '@gluestack-ui/themed';

<Heading size="xl" color="$primary800">
  My Wishlist
</Heading>

<Text size="md" color="$textLight600">
  Description text
</Text>
```

### Buttons

#### Basic Button

```typescript
import { Button, ButtonText } from '@gluestack-ui/themed';

<Button
  size="lg"
  variant="solid"
  action="primary"
  onPress={handlePress}
>
  <ButtonText>Add Item</ButtonText>
</Button>
```

#### Button with Icon

```typescript
import { Button, ButtonText, ButtonIcon } from '@gluestack-ui/themed';
import { AddIcon } from '@gluestack-ui/themed';

<Button>
  <ButtonIcon as={AddIcon} />
  <ButtonText>Add Item</ButtonText>
</Button>
```

### Form Components

#### Input

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

#### Textarea

```typescript
import { Textarea, TextareaInput } from '@gluestack-ui/themed';

<Textarea>
  <TextareaInput
    placeholder="Description"
    value={description}
    onChangeText={setDescription}
  />
</Textarea>
```

#### Select

```typescript
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectItem,
} from '@gluestack-ui/themed';

<Select>
  <SelectTrigger>
    <SelectInput placeholder="Select priority" />
  </SelectTrigger>
  <SelectPortal>
    <SelectBackdrop />
    <SelectContent>
      <SelectItem label="High" value="high" />
      <SelectItem label="Medium" value="medium" />
      <SelectItem label="Low" value="low" />
    </SelectContent>
  </SelectPortal>
</Select>
```

### Modal

```typescript
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '@gluestack-ui/themed';

<Modal isOpen={isOpen} onClose={onClose}>
  <ModalBackdrop />
  <ModalContent>
    <ModalHeader>
      <Heading size="lg">Add Gift</Heading>
      <ModalCloseButton />
    </ModalHeader>
    <ModalBody>
      {/* Form fields */}
    </ModalBody>
    <ModalFooter>
      <Button onPress={onClose}>
        <ButtonText>Cancel</ButtonText>
      </Button>
      <Button onPress={handleSubmit}>
        <ButtonText>Submit</ButtonText>
      </Button>
    </ModalFooter>
  </ModalContent>
</Modal>
```

### Feedback Components

#### Alert

```typescript
import { Alert, AlertIcon, AlertText } from '@gluestack-ui/themed';
import { InfoIcon } from '@gluestack-ui/themed';

<Alert action="success" variant="solid">
  <AlertIcon as={InfoIcon} />
  <AlertText>Item added successfully!</AlertText>
</Alert>
```

#### Toast

```typescript
import { useToast, Toast, ToastTitle } from '@gluestack-ui/themed';

const toast = useToast();

toast.show({
  placement: "top",
  render: ({ id }) => (
    <Toast action="success">
      <ToastTitle>Success!</ToastTitle>
    </Toast>
  ),
});
```

#### Spinner

```typescript
import { Spinner } from '@gluestack-ui/themed';

<Spinner size="large" color="$primary500" />
```

### Card

```typescript
import { Card } from '@gluestack-ui/themed';

<Card p="$5" borderRadius="$lg" bg="$backgroundLight0">
  {/* Card content */}
</Card>
```

## Theme Customization

### Using Design Tokens

Gluestack UI uses design tokens for consistent styling:

```typescript
// Color tokens
bg="$primary500"           // Background color
color="$textLight800"      // Text color

// Spacing tokens
p="$4"                     // Padding: 16px
m="$2"                     // Margin: 8px
gap="$3"                   // Gap: 12px

// Size tokens
fontSize="$lg"             // Font size: 18px
borderRadius="$lg"         // Border radius: 12px

// Custom luxury colors
bg="$burgundy700"          // Burgundy color
color="$gold500"           // Gold color
bg="$cream50"              // Cream background
```

### Custom Color Palette

Our luxury theme includes:

- **Burgundy**: `$burgundy50` to `$burgundy900`
- **Gold**: `$gold50` to `$gold900`
- **Cream**: `$cream50` to `$cream900`

## Migration Guide

### From React Native to Gluestack

#### View → Box

```typescript
// Before
<View style={{ padding: 16, backgroundColor: '#fff' }}>
  {/* Content */}
</View>

// After
<Box p="$4" bg="$white">
  {/* Content */}
</Box>
```

#### Text → Text

```typescript
// Before
<Text style={{ fontSize: 18, color: '#333' }}>
  Hello World
</Text>

// After
<Text size="lg" color="$textDark800">
  Hello World
</Text>
```

#### TouchableOpacity → Button

```typescript
// Before
<TouchableOpacity
  style={{ backgroundColor: 'blue', padding: 12 }}
  onPress={handlePress}
>
  <Text style={{ color: 'white' }}>Press Me</Text>
</TouchableOpacity>

// After
<Button bg="$blue500" p="$3" onPress={handlePress}>
  <ButtonText color="$white">Press Me</ButtonText>
</Button>
```

#### TextInput → Input

```typescript
// Before
<TextInput
  style={{ borderWidth: 1, padding: 8 }}
  placeholder="Enter text"
  value={value}
  onChangeText={setValue}
/>

// After
<Input variant="outline">
  <InputField
    placeholder="Enter text"
    value={value}
    onChangeText={setValue}
  />
</Input>
```

#### Modal → Modal

```typescript
// Before
<Modal
  visible={isVisible}
  animationType="slide"
  transparent={true}
>
  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
    {/* Content */}
  </View>
</Modal>

// After
<Modal isOpen={isOpen} onClose={onClose}>
  <ModalBackdrop />
  <ModalContent>
    {/* Content */}
  </ModalContent>
</Modal>
```

## Common Patterns

### Form Layout

```typescript
<VStack space="md" p="$4">
  <Input>
    <InputField placeholder="Name" />
  </Input>

  <Input>
    <InputField placeholder="Email" type="email" />
  </Input>

  <Textarea>
    <TextareaInput placeholder="Description" />
  </Textarea>

  <Button onPress={handleSubmit}>
    <ButtonText>Submit</ButtonText>
  </Button>
</VStack>
```

### Card with Actions

```typescript
<Card>
  <VStack space="sm">
    <Heading size="md">Product Title</Heading>
    <Text>Product description goes here</Text>
    <HStack space="sm" mt="$4">
      <Button flex={1} variant="outline" onPress={handleEdit}>
        <ButtonText>Edit</ButtonText>
      </Button>
      <Button flex={1} action="negative" onPress={handleDelete}>
        <ButtonText>Delete</ButtonText>
      </Button>
    </HStack>
  </VStack>
</Card>
```

### Loading States

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

## Troubleshooting

### Common Issues

#### Issue: Components not rendering

**Solution**: Ensure `GluestackUIProvider` wraps your app in `app/_layout.tsx`

#### Issue: Theme tokens not working

**Solution**: Check that your config is properly imported and passed to the provider

#### Issue: TypeScript errors

**Solution**: Run `npm install` to ensure all types are properly installed

### Best Practices

1. **Always use design tokens** instead of hardcoded values
2. **Prefer Gluestack components** over React Native primitives
3. **Use semantic color names** from the theme (`$primary`, `$success`, etc.)
4. **Leverage variant props** for consistent styling
5. **Test components** across different screen sizes

## Resources

- [Gluestack UI Documentation](https://gluestack.io/ui/docs)
- [Component API Reference](https://gluestack.io/ui/docs/components)
- [Theme Configuration](https://gluestack.io/ui/docs/theme-configuration)
- [Examples Gallery](https://gluestack.io/ui/docs/examples)

## Support

For issues or questions:
- Check the [Gluestack UI GitHub](https://github.com/gluestack/gluestack-ui)
- Review project `.claude/rules.md` for mandatory usage guidelines
