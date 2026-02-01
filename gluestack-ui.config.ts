import { config as defaultConfig } from '@gluestack-ui/config';
import { createConfig } from '@gluestack-style/react';

// Extend the default Gluestack config with our luxury theme
export const config = createConfig({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      // Luxury Burgundy palette
      burgundy50: '#fdf2f4',
      burgundy100: '#fce7eb',
      burgundy200: '#f9cfd8',
      burgundy300: '#f5a7b9',
      burgundy400: '#ee7594',
      burgundy500: '#e3486f',
      burgundy600: '#ce2c5c',
      burgundy700: '#ad1f4a',
      burgundy800: '#8f1d42',
      burgundy900: '#7a1c3d',

      // Luxury Gold palette
      gold50: '#fffbeb',
      gold100: '#fef3c7',
      gold200: '#fde68a',
      gold300: '#fcd34d',
      gold400: '#fbbf24',
      gold500: '#f59e0b',
      gold600: '#d97706',
      gold700: '#b45309',
      gold800: '#92400e',
      gold900: '#78350f',

      // Luxury Cream palette
      cream50: '#fefefe',
      cream100: '#fefaf5',
      cream200: '#fcf5ea',
      cream300: '#f9ecdc',
      cream400: '#f4e0c9',
      cream500: '#ecd3b0',
      cream600: '#dab785',
      cream700: '#be9562',
      cream800: '#9e7a4e',
      cream900: '#806242',

      // Map to Gluestack primary/secondary
      primary50: '#fdf2f4',
      primary100: '#fce7eb',
      primary200: '#f9cfd8',
      primary300: '#f5a7b9',
      primary400: '#ee7594',
      primary500: '#e3486f',
      primary600: '#ce2c5c',
      primary700: '#ad1f4a',
      primary800: '#8f1d42',
      primary900: '#7a1c3d',

      secondary50: '#fffbeb',
      secondary100: '#fef3c7',
      secondary200: '#fde68a',
      secondary300: '#fcd34d',
      secondary400: '#fbbf24',
      secondary500: '#f59e0b',
      secondary600: '#d97706',
      secondary700: '#b45309',
      secondary800: '#92400e',
      secondary900: '#78350f',
    },
  },
  // Add custom component configurations if needed
});
