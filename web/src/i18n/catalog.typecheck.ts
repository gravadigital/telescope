/**
 * CA-4: verificado por `npm run typecheck`. Cada `@ts-expect-error` debe consumirse;
 * si la derivación del tipo `Catalog` se rompe, queda sin usar y `tsc` falla.
 */
import { en } from './catalogs/en';
import { plural } from './types';
import type { Catalog } from './types';

// @ts-expect-error falta `nav.events`
export const missingKey: Catalog = { ...en, nav: { ...en.nav, events: undefined } };

// @ts-expect-error clave de más `nav.extra`
export const extraKey: Catalog = { ...en, nav: { ...en.nav, extra: 'x' } };

// @ts-expect-error `common.participants` debe ser plural, no string
export const wrongShape: Catalog = { ...en, common: { ...en.common, participants: 'x' } };

export const ok: Catalog = { ...en, common: { ...en.common, participants: plural({ one: 'a', other: 'b' }) } };
