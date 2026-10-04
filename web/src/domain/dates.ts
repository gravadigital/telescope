/**
 * Fechas del dominio. Las fechas sin hora (`YYYY-MM-DD`, o con `T00:00:00Z`
 * de una columna `date`) se toman por su parte `YYYY-MM-DD` en calendario
 * local: nunca `new Date('2026-10-10')`, que se interpreta como UTC.
 */
const DAY_MS = 86400000;

const parseLocalDate = (value: string): Date => {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const pad = (n: number): string => String(n).padStart(2, '0');

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const endOfDay = (date: string): Date => {
  const d = parseLocalDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
};

/** Días calendario hasta el cierre: 0 si cierra hoy, negativo si ya cerró. */
export const daysUntilClose = (date: string, now: Date = new Date()): number =>
  Math.round((parseLocalDate(date).getTime() - startOfDay(now).getTime()) / DAY_MS);

/** Un cierre sigue abierto hasta el fin de su día. */
export const isClosed = (date: string, now: Date = new Date()): boolean =>
  now.getTime() > endOfDay(date).getTime();

export const formatDate = (date: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    parseLocalDate(date)
  );

export const formatDateLong = (date: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseLocalDate(date));

export const formatDateTime = (iso: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

export const formatRelative = (
  when: Date | string,
  locale: string,
  now: Date = new Date()
): string => {
  const target = typeof when === 'string' ? new Date(when) : when;
  const diffSeconds = Math.round((target.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  // Menos de un minuto: "ahora" / "now" (numeric: 'auto' con 0 segundos).
  if (abs < 60) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), 'hour');
  if (abs < 30 * 86400) return rtf.format(Math.round(diffSeconds / 86400), 'day');
  if (abs < 365 * 86400) return rtf.format(Math.round(diffSeconds / (30 * 86400)), 'month');
  return rtf.format(Math.round(diffSeconds / (365 * 86400)), 'year');
};

export const addDays = (date: string, days: number): string => {
  const d = parseLocalDate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

export const todayISO = (now: Date = new Date()): string => toISODate(now);
