import { detectLocale } from './detect';

describe('detectLocale', () => {
  it('TS-4: es* -> es, otro -> en', () => {
    expect(detectLocale('es-419')).toBe('es');
    expect(detectLocale('en-GB')).toBe('en');
    expect(detectLocale('')).toBe('en');
    expect(detectLocale(undefined)).toBe('en');
  });
});
