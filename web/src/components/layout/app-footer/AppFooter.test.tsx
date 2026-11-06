import React from 'react';
import fs from 'fs';
import path from 'path';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppFooter from './AppFooter';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';

describe('AppFooter', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  it('TS-1: marca, navegación y tagline en español', () => {
    renderWithProviders(<AppFooter />, { locale: 'es' });

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'TELESCOPIO' })).toHaveAttribute('href', '/');
    const nav = within(footer).getByRole('navigation', { name: 'Navegación del pie' });
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Eventos' })).toHaveAttribute('href', '/events');
    expect(within(footer).getByText('Telescopio · evaluación distribuida entre pares')).toBeInTheDocument();
  });

  it('TS-2: marca, navegación y tagline en inglés', () => {
    renderWithProviders(<AppFooter />, { locale: 'en' });

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'TELESCOPIO' })).toHaveAttribute('href', '/');
    const nav = within(footer).getByRole('navigation', { name: 'Footer navigation' });
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/events');
    expect(within(footer).getByText('Telescopio · distributed peer review')).toBeInTheDocument();
  });

  it('TS-3: los links navegan con el router, sin recargar', async () => {
    renderWithProviders(<AppFooter />, { locale: 'es', route: '/' });
    expect(screen.getByTestId('location')).toHaveTextContent('/');

    await userEvent.click(screen.getByRole('link', { name: 'Eventos' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/events');

    await userEvent.click(screen.getByRole('link', { name: 'TELESCOPIO' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});

describe('AppFooter.css', () => {
  const read = (file: string) =>
    fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const css = read('AppFooter.css');
  const headerCss = read('../app-header/AppHeader.css');

  const mediaStart = css.indexOf('@media');
  const base = css.slice(0, mediaStart);
  const media = css.slice(mediaStart);
  const rule = (source: string, selector: string) =>
    new RegExp(`${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';
  const declaration = (block: string, property: string) =>
    new RegExp(`${property}:\\s*([^;]+);`).exec(block)?.[1].trim();

  it('TS-4: mismo fondo que el header', () => {
    const footerBg = declaration(rule(css, '.ly-footer'), 'background');
    const headerBg = declaration(rule(headerCss, '.ly-header'), 'background');

    expect(footerBg).toBe('var(--bg-band)');
    expect(footerBg).toBe(headerBg);
    expect(declaration(rule(css, '.ly-footer'), 'color')).toBe('var(--text-inverse)');
  });

  it('TS-5: links y foco con tokens, sin hex literales', () => {
    expect(declaration(rule(css, '.ly-footer__link'), 'color')).toBe('var(--text-inverse-secondary)');
    expect(declaration(rule(css, '.ly-footer__link:hover'), 'color')).toBe('var(--text-inverse)');
    expect(declaration(rule(css, '.ly-footer__brand'), 'color')).toBe('var(--text-signal)');
    expect(css).toMatch(/\.ly-footer__brand:focus-visible/);
    expect(declaration(rule(css, '.ly-footer__link:focus-visible'), 'box-shadow')).toBe('var(--focus-ring)');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('TS-6: mobile primero, un solo corte a 768px', () => {
    expect(declaration(rule(base, '.ly-footer__inner'), 'flex-direction')).toBe('column');
    expect(media).toMatch(/@media \(min-width: 768px\)/);
    expect(declaration(rule(media, '.ly-footer__inner'), 'flex-direction')).toBe('row');
    expect(css).not.toMatch(/@media[^{]*max-width/);
    expect(css.match(/@media/g)).toHaveLength(1);
  });
});
