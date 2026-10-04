import React from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import {
  formatDate,
  formatDateLong,
  formatDateTime,
  formatRelative,
} from '../domain/dates';
import { formatScore } from '../domain/score';
import { es } from './catalogs/es';
import { en } from './catalogs/en';
import { detectLocale, isLocale } from './detect';
import { translate } from './translate';
import type { Catalog, Locale, Params, TranslationKey } from './types';

export const LOCALE_STORAGE_KEY = 'telescopio_locale';

const CATALOGS: Record<Locale, Catalog> = { es, en };

export interface Formatters {
  date: (date: string) => string;
  dateLong: (date: string) => string;
  dateTime: (iso: string) => string;
  relative: (when: Date | string, now?: Date) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  score: (mbcScore: number) => string;
}

export interface I18nContextValue {
  t: (key: TranslationKey, params?: Params) => string;
  locale: Locale;
  setLocale: (next: Locale) => void;
  fmt: Formatters;
}

const I18nContext = React.createContext<I18nContextValue | undefined>(undefined);

export const useT = (): I18nContextValue => {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error('useT must be used within an I18nProvider');
  }
  return context;
};

interface I18nProviderProps {
  children: React.ReactNode;
  /** Solo para tests: fuerza el idioma inicial. */
  initialLocale?: Locale;
}

const browserLocale = (): Locale => {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  return detectLocale(nav?.languages?.[0] ?? nav?.language);
};

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, initialLocale }) => {
  const { getItem, setItem } = useLocalStorage();
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    if (initialLocale) return initialLocale;
    const saved = getItem(LOCALE_STORAGE_KEY);
    return isLocale(saved) ? saved : browserLocale();
  });

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = React.useCallback(
    (next: Locale) => {
      setLocaleState(next);
      setItem(LOCALE_STORAGE_KEY, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const value = React.useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(CATALOGS[locale], locale, key, params),
      fmt: {
        date: (date) => formatDate(date, locale),
        dateLong: (date) => formatDateLong(date, locale),
        dateTime: (iso) => formatDateTime(iso, locale),
        relative: (when, now) => formatRelative(when, locale, now),
        number: (n, options) => new Intl.NumberFormat(locale, options).format(n),
        score: (mbc) => formatScore(mbc, locale),
      },
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
