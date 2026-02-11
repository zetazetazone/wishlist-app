/**
 * Localized date formatting hook
 *
 * Wraps date-fns formatting functions with automatic locale selection
 * based on the current i18n language.
 */

import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  format as dateFnsFormat,
  formatDistanceToNow as dateFnsFormatDistance,
  formatRelative as dateFnsFormatRelative,
} from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { SupportedLanguage } from '@/lib/language';

const localeMap: Record<SupportedLanguage, Locale> = {
  en: enUS,
  es: es,
};

export function useLocalizedFormat() {
  const { i18n } = useTranslation();

  const locale = useMemo(
    () => localeMap[i18n.language as SupportedLanguage] || enUS,
    [i18n.language]
  );

  const format = useCallback(
    (date: Date | number, formatStr: string) =>
      dateFnsFormat(date, formatStr, { locale }),
    [locale]
  );

  const formatDistanceToNow = useCallback(
    (date: Date | number, options?: { addSuffix?: boolean }) =>
      dateFnsFormatDistance(date, { ...options, locale }),
    [locale]
  );

  const formatRelative = useCallback(
    (date: Date | number, baseDate: Date) =>
      dateFnsFormatRelative(date, baseDate, { locale }),
    [locale]
  );

  return {
    format,
    formatDistanceToNow,
    formatRelative,
    locale,
  };
}
