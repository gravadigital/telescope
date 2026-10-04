import { translate } from './translate';
import { es } from './catalogs/es';
import { en } from './catalogs/en';
import { formatScore } from '../domain/score';
import { formatRelative, formatDate } from '../domain/dates';
import { stageNameKey } from '../domain/stages';
import type { Locale, TranslationKey, Params } from './types';

const t = (locale: Locale, key: TranslationKey, params?: Params) =>
  translate(locale === 'es' ? es : en, locale, key, params);

describe('translate', () => {
  it('TS-9: interpolación', () => {
    expect(t('es', 'nav.userMenu', { name: 'Ana Pérez' })).toBe('Menú de usuario de Ana Pérez');
    expect(t('en', 'nav.userMenu', { name: 'Ana Pérez' })).toBe('User menu for Ana Pérez');
  });

  it('deja el placeholder literal si falta el parámetro', () => {
    expect(t('es', 'nav.userMenu')).toBe('Menú de usuario de {name}');
  });

  it('TS-10: plural singular y plural', () => {
    expect(t('es', 'common.participants', { count: 1 })).toBe('1 participante');
    expect(t('es', 'common.participants', { count: 3 })).toBe('3 participantes');
    expect(t('en', 'common.participants', { count: 1 })).toBe('1 participant');
    expect(t('en', 'common.participants', { count: 3 })).toBe('3 participants');
  });

  it('TS-11: cero y números grandes', () => {
    expect(t('es', 'common.participants', { count: 0 })).toBe('0 participantes');
    expect(t('es', 'common.participants', { count: 1000000 })).toBe('1.000.000 participantes');
    expect(t('en', 'common.participants', { count: 1000 })).toBe('1,000 participants');
  });

  it('TS-12: puntaje según idioma', () => {
    expect(t('es', 'common.points', { score: formatScore(0.74, 'es') })).toBe('7,4 pts');
    expect(t('en', 'common.points', { score: formatScore(0.74, 'en') })).toBe('7.4 pts');
  });

  it('TS-13: tiempo relativo', () => {
    const now = new Date('2026-10-04T12:00:00');
    const when = new Date(now.getTime() - 2 * 3600 * 1000);
    expect(formatRelative(when, 'es', now)).toBe('hace 2 horas');
    expect(formatRelative(when, 'en', now)).toBe('2 hours ago');
  });

  it('TS-14: fecha según idioma', () => {
    expect(formatDate('2026-10-10', 'es')).toMatch(/^10 oct\.? 2026$/);
    expect(formatDate('2026-10-10', 'en')).toBe('Oct 10, 2026');
  });

  it('TS-15: nombres de etapa', () => {
    const names = (['creation', 'participation', 'voting', 'results'] as const).map((s) =>
      t('es', stageNameKey(s))
    );
    expect(names).toEqual(['Creación', 'Participación', 'Votación', 'Resultados']);
    const namesEn = (['creation', 'participation', 'voting', 'results'] as const).map((s) =>
      t('en', stageNameKey(s))
    );
    expect(namesEn).toEqual(['Creation', 'Participation', 'Voting', 'Results']);
  });
});
