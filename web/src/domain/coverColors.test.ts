/** @jest-environment node */
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import {
  COVER_COLORS,
  DEFAULT_COVER_COLOR,
  coverColorVar,
  isCoverColor,
} from './coverColors';

const TOKENS = fs.readFileSync(path.join(__dirname, '../styles/tokens.css'), 'utf8');

// Los 16 hex de docs/design-system/web/foundations/color.md → "Portada del evento".
const HEX: Record<string, string> = {
  lavender: '#D9D4FA',
  periwinkle: '#CDD8F9',
  sky: '#B6DEF7',
  ice: '#A8E3E9',
  aqua: '#ADE4D7',
  mint: '#B0E5C2',
  pistachio: '#C5E2A8',
  lemon: '#E3DB90',
  butter: '#F4D49E',
  peach: '#F9D0B9',
  coral: '#F9CFCA',
  rose: '#F8CEDA',
  pink: '#F4CDE9',
  lilac: '#EECEF5',
  sand: '#E2D7CA',
  mist: '#D2D9E4',
};

describe('coverColors', () => {
  it('TS-1: la paleta coincide con el enum CoverColor de api.yaml', () => {
    const file = path.resolve(__dirname, '../../../docs/apis/api.yaml');
    const doc = YAML.parse(fs.readFileSync(file, 'utf8'));
    const apiEnum = doc.components.schemas.CoverColor.enum as string[];

    expect(apiEnum).toHaveLength(16);
    expect([...COVER_COLORS]).toEqual(apiEnum);
    expect(DEFAULT_COVER_COLOR).toBe('lavender');
    expect(doc.components.schemas.CoverColor.default).toBe(DEFAULT_COVER_COLOR);
  });

  it('isCoverColor acepta solo los 16 identificadores', () => {
    expect(isCoverColor('mint')).toBe(true);
    expect(COVER_COLORS.every((id) => isCoverColor(id))).toBe(true);
    for (const bad of ['red', '#ff0000', 'Mint', '', null, undefined, 3]) {
      expect(isCoverColor(bad)).toBe(false);
    }
  });

  it('coverColorVar devuelve la variable CSS del token', () => {
    expect(coverColorVar('peach')).toBe('var(--bg-cover-peach)');
  });
});

describe('tokens de portada', () => {
  it('TS-2: define los 16 colores con los hex de la fundación', () => {
    expect(Object.keys(HEX)).toEqual([...COVER_COLORS]);
    COVER_COLORS.forEach((id) => {
      expect(TOKENS).toMatch(new RegExp(`--ref-color-cover-${id}:\\s*${HEX[id]}\\s*;`, 'i'));
      expect(TOKENS).toContain(`--bg-cover-${id}: var(--ref-color-cover-${id});`);
    });
    expect(TOKENS).toContain('--bg-cover-default: var(--bg-cover-lavender);');
  });
});
