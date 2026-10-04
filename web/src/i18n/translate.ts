import type { Catalog, Locale, Params, Plural, TranslationKey } from './types';

const isPlural = (value: unknown): value is Plural =>
  typeof value === 'object' && value !== null && (value as Plural).__plural === true;

const resolve = (catalog: Catalog, key: string): string | Plural | undefined => {
  let node: unknown = catalog;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node === 'string' || isPlural(node)) return node;
  return undefined;
};

/** Traducción pura (sin React): interpolación `{name}` y plurales con `Intl.PluralRules`. */
export const translate = (
  catalog: Catalog,
  locale: Locale,
  key: TranslationKey,
  params?: Params
): string => {
  const leaf = resolve(catalog, key);
  if (leaf === undefined) return key;

  let template: string;
  if (isPlural(leaf)) {
    const category = new Intl.PluralRules(locale).select(Number(params?.count ?? 0));
    template = category === 'one' ? leaf.one : leaf.other;
  } else {
    template = leaf;
  }

  const numberFormat = new Intl.NumberFormat(locale);
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    if (!params || !(name in params)) return placeholder;
    const value = params[name];
    return typeof value === 'number' ? numberFormat.format(value) : String(value);
  });
};
