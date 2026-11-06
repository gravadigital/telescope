/**
 * Paleta cerrada de colores de portada del evento (REQ-004).
 *
 * Los identificadores y su orden son un contrato con la api (enum `CoverColor` de
 * `docs/apis/api.yaml`, CHECK `valid_cover_color`) y con el Design System
 * (`foundations/color.md`). La api guarda el identificador, nunca el hex.
 */
export const COVER_COLORS = [
  'lavender',
  'periwinkle',
  'sky',
  'ice',
  'aqua',
  'mint',
  'pistachio',
  'lemon',
  'butter',
  'peach',
  'coral',
  'rose',
  'pink',
  'lilac',
  'sand',
  'mist',
] as const;

export type CoverColorId = (typeof COVER_COLORS)[number];

export const DEFAULT_COVER_COLOR: CoverColorId = 'lavender';

export const isCoverColor = (value: unknown): value is CoverColorId =>
  typeof value === 'string' && (COVER_COLORS as readonly string[]).includes(value);

/** Variable CSS del token semántico `bg.cover.{id}`. */
export const coverColorVar = (id: CoverColorId): string => `var(--bg-cover-${id})`;
