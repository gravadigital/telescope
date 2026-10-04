import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider, useT } from './I18nProvider';
import type { Locale } from './types';

let api: ReturnType<typeof useT>;
const Probe: React.FC = () => {
  api = useT();
  return (
    <div data-testid="probe">
      {api.t('nav.events')}|{api.locale}
    </div>
  );
};

const setNavigatorLanguage = (language: string) => {
  jest.spyOn(window.navigator, 'language', 'get').mockReturnValue(language);
  jest.spyOn(window.navigator, 'languages', 'get').mockReturnValue([]);
};

describe('I18nProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });
  afterEach(() => jest.restoreAllMocks());

  it('TS-1: navegador en inglés', () => {
    setNavigatorLanguage('en-US');
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId('probe')).toHaveTextContent('Events|en');
    expect(document.documentElement.lang).toBe('en');
  });

  it.each(['es', 'es-AR', 'es-MX', 'ES-es'])('TS-2: variante de español %s', (lang) => {
    setNavigatorLanguage(lang);
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId('probe')).toHaveTextContent('Eventos|es');
    expect(document.documentElement.lang).toBe('es');
  });

  it.each(['fr-FR', 'pt-BR'])('TS-3: %s cae a inglés', (lang) => {
    setNavigatorLanguage(lang);
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId('probe')).toHaveTextContent('Events|en');
  });

  it('TS-5: la preferencia guardada gana al navegador', () => {
    setNavigatorLanguage('en-US');
    localStorage.setItem('telescopio_locale', '"es"');
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId('probe')).toHaveTextContent('Eventos|es');
  });

  it('TS-6: un valor guardado inválido se ignora', () => {
    setNavigatorLanguage('es-AR');
    localStorage.setItem('telescopio_locale', '"de"');
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId('probe')).toHaveTextContent('Eventos|es');
  });

  it('TS-7: localStorage no disponible', () => {
    setNavigatorLanguage('es-AR');
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId('probe')).toHaveTextContent('Eventos|es');
    act(() => api.setLocale('en'));
    expect(screen.getByTestId('probe')).toHaveTextContent('Events|en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('TS-8: cambio sin recargar y recordado', () => {
    setNavigatorLanguage('en-US');
    render(<I18nProvider><Probe /></I18nProvider>);
    const node = screen.getByTestId('probe');
    act(() => api.setLocale('es' as Locale));
    expect(screen.getByTestId('probe')).toBe(node);
    expect(node).toHaveTextContent('Eventos|es');
    expect(document.documentElement.lang).toBe('es');
    expect(localStorage.getItem('telescopio_locale')).toBe('"es"');

    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getAllByTestId('probe')[1]).toHaveTextContent('Eventos|es');
  });

  it('TS-16: useT fuera del provider lanza', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow('useT must be used within an I18nProvider');
  });

  it('fmt delega en los helpers de dominio con el idioma activo', () => {
    render(<I18nProvider initialLocale="en"><Probe /></I18nProvider>);
    expect(api.fmt.score(0.74)).toBe('7.4');
    expect(api.fmt.date('2026-10-10')).toBe('Oct 10, 2026');
    expect(api.fmt.number(1000)).toBe('1,000');
  });

  it('TS-13/TS-14: fmt.relative y fmt.date según idioma', () => {
    const now = new Date('2026-10-04T12:00:00');
    const when = new Date(now.getTime() - 2 * 3600 * 1000);
    const { unmount } = render(<I18nProvider initialLocale="es"><Probe /></I18nProvider>);
    expect(api.fmt.relative(when, now)).toBe('hace 2 horas');
    expect(api.fmt.date('2026-10-10')).toMatch(/^10 oct\.? 2026$/);
    expect(api.t('common.points', { score: api.fmt.score(0.74) })).toBe('7,4 pts');
    unmount();
    render(<I18nProvider initialLocale="en"><Probe /></I18nProvider>);
    expect(api.fmt.relative(when, now)).toBe('2 hours ago');
    expect(api.t('common.points', { score: api.fmt.score(0.74) })).toBe('7.4 pts');
  });
});
