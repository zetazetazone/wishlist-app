// TypeScript module augmentation for i18next
// Enables autocomplete and compile-time validation for translation keys
// Source: https://www.i18next.com/overview/typescript

import 'i18next';
import type { resources } from '../resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: (typeof resources)['en'];
  }
}
