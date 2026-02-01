# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- TypeScript 5.9.2 - Core application logic and type definitions
- JavaScript - Node.js configuration files and scripts

**Secondary:**
- JSX/TSX - React Native and web components
- CSS - Tailwind CSS for styling

## Runtime

**Environment:**
- Expo 54.0.33 - React Native development platform
- React Native 0.81.5 - Native mobile framework

**Package Manager:**
- npm - Default Node.js package manager
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 19.1.0 - UI component library
- React Native 0.81.5 - Cross-platform mobile framework
- Expo Router ~6.0.23 - File-based routing for React Native
- React DOM 19.2.4 - Web DOM rendering support

**Styling:**
- Tailwind CSS 3.4.19 - Utility-first CSS framework
- NativeWind 4.2.1 - Tailwind CSS for React Native
- Gluestack UI 1.1.73 - Headless, accessible component library
- @gluestack-ui/config 1.1.20 - Gluestack configuration
- @gluestack-style/react 1.0.57 - Styling system for Gluestack

**Animations & Gestures:**
- React Native Reanimated ~4.1.1 - Performant animations library
- @react-native-gesture-handler ~2.28.0 - Gesture handling
- Moti 0.30.0 - Animation components
- expo-linear-gradient ~15.0.8 - Gradient components
- @gorhom/bottom-sheet 5.2.8 - Bottom sheet modal component

**Navigation & Navigation:**
- expo-router ~6.0.23 - Routing and navigation (file-based)
- react-native-screens ~4.16.0 - Native navigation support
- react-native-safe-area-context 5.6.2 - Safe area handling
- react-native-gesture-handler ~2.28.0 - Gesture support for navigation

**Icons & Utilities:**
- @expo/vector-icons 15.0.3 - Icon library (Material Design, EvilIcons, etc.)
- react-native-svg 15.15.1 - SVG rendering support
- expo-constants 18.0.13 - Application constants and configuration
- expo-linking 8.0.11 - Deep linking support
- expo-status-bar ~3.0.9 - Status bar control
- react-native-url-polyfill 3.0.0 - URL API polyfill for React Native

**Testing:**
- None configured (no Jest, Vitest, or other test runner in dependencies)

**Build/Dev:**
- Babel Preset Expo 54.0.10 - Babel configuration for Expo
- Metro - React Native bundler (built into Expo)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.93.3 - Supabase client for database, auth, and real-time updates
- @react-native-async-storage/async-storage 2.2.0 - Persistent local storage for tokens and session management
- react-native-worklets 0.5.1 - Low-level worklet support for animations

**Infrastructure:**
- expo - Managed development and deployment platform
- expo-router - File-based routing system for navigation

## Configuration

**Environment:**
- `.env` file for sensitive configuration
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key for public access
- Configuration validated in `lib/supabase.ts` at initialization

**Build:**
- `app.json` - Expo app configuration (icons, splash screen, platform-specific settings)
- `babel.config.js` - Babel transformation rules (preset-expo, react-native-reanimated plugin)
- `metro.config.js` - Metro bundler configuration (NativeWind, source extensions, minification)
- `tsconfig.json` - TypeScript compiler options (strict mode enabled, Expo base config)
- `tailwind.config.js` - Tailwind CSS configuration with custom color tokens
- `gluestack-ui.config.ts` - Gluestack component library theme configuration

## Platform Requirements

**Development:**
- Node.js (version managed by `.nvmrc` if present, otherwise follows npm compatibility)
- Expo CLI for local development and testing
- Native development tools for iOS (Xcode) and Android (Android Studio) for native builds

**Production:**
- Deployment target: iOS 13+ and Android 8.0+ (via Expo's managed service)
- Can build for web via `expo start --web`
- Can build native apps via `eas build` (Expo Application Services)

---

*Stack analysis: 2026-02-02*
