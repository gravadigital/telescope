import type { es } from './catalogs/es';

export type Locale = 'es' | 'en';
export const LOCALES: readonly Locale[] = ['es', 'en'];

export type Plural = { readonly __plural: true; one: string; other: string };

export const plural = (forms: { one: string; other: string }): Plural => ({
  __plural: true,
  ...forms,
});

type Widen<T> = T extends string
  ? string
  : T extends Plural
  ? Plural
  : { [K in keyof T]: Widen<T[K]> };

/** Forma del catálogo, derivada de `es`: una clave faltante o de más en `en` no compila. */
export type Catalog = Widen<typeof es>;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | Plural ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TranslationKey = Leaves<Catalog>;

export type Params = Record<string, string | number>;
