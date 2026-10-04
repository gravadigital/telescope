import { LOCALES } from './types';
import type { Locale } from './types';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** `es*` -> español; cualquier otro idioma (o ninguno) -> inglés. */
export const detectLocale = (tag?: string): Locale =>
  (tag ?? '').split('-')[0].toLowerCase() === 'es' ? 'es' : 'en';
