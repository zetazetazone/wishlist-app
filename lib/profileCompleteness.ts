/**
 * Profile Completeness Calculation
 *
 * Calculates how complete a user's personal details profile is.
 * Used by CompletenessIndicator component for PROF-08.
 *
 * Sections evaluated:
 * - Clothing sizes (at least one filled)
 * - Favorite colors (at least one)
 * - Favorite brands (at least one)
 * - Interests (at least one)
 * - Dislikes (at least one)
 * - External wishlists (at least one link)
 */

import type {
  PersonalSizes,
  PersonalPreferences,
  ExternalLink,
} from '../types/database.types';

export interface CompletenessResult {
  percentage: number;
  filledCount: number;
  totalCount: number;
  missingSections: string[];
}

/**
 * Calculate profile completeness based on filled sections.
 *
 * @param sizes - Clothing sizes object
 * @param preferences - Preferences with colors, brands, interests, dislikes arrays
 * @param externalLinks - Array of external wishlist links
 * @returns Completeness result with percentage and missing sections
 */
export function calculateCompleteness(
  sizes: PersonalSizes,
  preferences: PersonalPreferences,
  externalLinks: ExternalLink[]
): CompletenessResult {
  const sections = [
    {
      name: 'Clothing sizes',
      filled: Object.values(sizes).some((v) => v && v.trim()),
    },
    {
      name: 'Favorite colors',
      filled: (preferences.colors?.length || 0) > 0,
    },
    {
      name: 'Favorite brands',
      filled: (preferences.brands?.length || 0) > 0,
    },
    {
      name: 'Interests',
      filled: (preferences.interests?.length || 0) > 0,
    },
    {
      name: 'Dislikes',
      filled: (preferences.dislikes?.length || 0) > 0,
    },
    {
      name: 'External wishlists',
      filled: externalLinks.length > 0,
    },
  ];

  const filled = sections.filter((s) => s.filled);
  const missing = sections.filter((s) => !s.filled).map((s) => s.name);

  return {
    percentage: Math.round((filled.length / sections.length) * 100),
    filledCount: filled.length,
    totalCount: sections.length,
    missingSections: missing,
  };
}
