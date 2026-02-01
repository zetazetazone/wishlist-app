/**
 * Luxury Gift Boutique Theme
 *
 * A warm, celebratory aesthetic inspired by elegant gift wrapping
 * and high-end boutiques. Rich burgundy tones with gold accents.
 */

export const colors = {
  // Primary - Deep burgundy/wine
  burgundy: {
    50: '#FDF2F4',
    100: '#FAE5E9',
    200: '#F5CBD4',
    300: '#EDA1B3',
    400: '#E2708D',
    500: '#D54265',
    600: '#C02550',
    700: '#8B1538',
    800: '#6B1229',
    900: '#4A0C1C',
  },

  // Accent - Rich gold/copper
  gold: {
    50: '#FEFCE8',
    100: '#FEF9C3',
    200: '#FEF08A',
    300: '#FDE047',
    400: '#FACC15',
    500: '#D4AF37',
    600: '#B8860B',
    700: '#996515',
    800: '#7C4F11',
    900: '#5F3D0D',
  },

  // Neutral - Warm cream/beige
  cream: {
    50: '#FEFDFB',
    100: '#FBF8F3',
    200: '#F5EFE6',
    300: '#EDE4D3',
    400: '#E1D4BD',
    500: '#D1C2A3',
    600: '#B8A889',
    700: '#9B8C70',
    800: '#7A6F59',
    900: '#5C5345',
  },

  // Semantic colors
  success: '#2D7A4F',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#3B82F6',

  // Utility
  white: '#FFFFFF',
  black: '#1A1A1A',
  transparent: 'transparent',
};

export const typography = {
  // Use system fonts with fallbacks
  // In production, you'd load custom fonts via expo-font
  heading: {
    fontFamily: 'System',
    fontWeight: '700' as const,
  },
  subheading: {
    fontFamily: 'System',
    fontWeight: '600' as const,
  },
  body: {
    fontFamily: 'System',
    fontWeight: '400' as const,
  },
  caption: {
    fontFamily: 'System',
    fontWeight: '300' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  gold: {
    shadowColor: colors.gold[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const gradients = {
  burgundy: ['#8B1538', '#6B1229'],
  gold: ['#D4AF37', '#B8860B'],
  cream: ['#FBF8F3', '#F5EFE6'],
  sunset: ['#D54265', '#B8860B'],
};
