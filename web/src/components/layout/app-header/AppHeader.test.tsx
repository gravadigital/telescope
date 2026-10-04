import React from 'react';
import fs from 'fs';
import path from 'path';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppHeader from './AppHeader';
import { renderWithProviders, sampleUser } from '../../../test-utils/renderWithProviders';

jest.mock('../../../context/AuthContext');

const guest = { user: null, isAuthenticated: false, loading: false };
const member = { user: sampleUser, isAuthenticated: true, loading: false };

describe('AppHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  it('TS-34: barra de visitante', () => {
    const { container } = renderWithProviders(<AppHeader />, { locale: 'es', auth: guest });
    expect(screen.getByRole('banner')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Eventos' })).toHaveAttribute('href', '/events');
    expect(within(nav).getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '/#como-funciona');
    const language = screen.getByRole('button', { name: 'Idioma: ES' });
    expect(language).toHaveTextContent('ES');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: 'TELESCOPIO' })).toHaveAttribute('href', '/');
    expect(screen.queryByText('About')).toBeNull();
    expect(screen.queryByText('See Demo')).toBeNull();
    expect(screen.queryByRole('button', { name: /Menú de usuario/ })).toBeNull();
    expect(container.querySelector('[data-slot="notifications"]')).toBeNull();
  });

  it('TS-35: barra con sesión', () => {
    const { container } = renderWithProviders(<AppHeader />, { locale: 'es', auth: member });
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(within(nav).getAllByRole('link')).toHaveLength(3);
    expect(container.querySelector('[data-slot="notifications"]')).not.toBeNull();
    const trigger = screen.getByRole('button', { name: 'Menú de usuario de Ana Pérez' });
    expect(trigger).toHaveTextContent('AP');
    expect(trigger).toHaveTextContent('Ana Pérez');
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Idioma: ES' })).toBeNull();
  });

  it('no muestra controles de acceso mientras se restaura la sesión', () => {
    renderWithProviders(<AppHeader />, { auth: { user: null, isAuthenticated: false, loading: true } });
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Menú de usuario/ })).toBeNull();
  });

  it('TS-36: contenido del menú de usuario', () => {
    renderWithProviders(<AppHeader />, { locale: 'es', auth: member });
    userEvent.click(screen.getByRole('button', { name: 'Menú de usuario de Ana Pérez' }));
    const menu = screen.getByRole('menu', { name: 'Menú de usuario de Ana Pérez' });
    const items = [
      within(menu).getByRole('menuitem', { name: 'Mis eventos' }),
      within(menu).getByRole('menuitemradio', { name: 'Español' }),
      within(menu).getByRole('menuitemradio', { name: 'English' }),
      within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }),
    ];
    expect(Array.from(menu.children)).toEqual(items);
    expect(items.map((i) => i.textContent)).toEqual(['Mis eventos', 'Español', 'English', 'Cerrar sesión']);
    expect(items.map((i) => i.getAttribute('role'))).toEqual([
      'menuitem',
      'menuitemradio',
      'menuitemradio',
      'menuitem',
    ]);
    expect(items[1]).toHaveAttribute('aria-checked', 'true');
    expect(items[2]).toHaveAttribute('aria-checked', 'false');
  });

  it('TS-37: cambia el idioma desde el menú de usuario', () => {
    renderWithProviders(<AppHeader />, { locale: 'es', auth: member });
    const trigger = screen.getByRole('button', { name: 'Menú de usuario de Ana Pérez' });
    userEvent.click(trigger);
    userEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));
    expect(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'How it works' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Eventos' })).toBeNull();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('telescopio_locale')).toBe('"en"');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: 'User menu for Ana Pérez' })).toHaveFocus();
  });

  it('TS-38: Mis eventos y Cerrar sesión', () => {
    const first = renderWithProviders(<AppHeader />, { auth: member });
    userEvent.click(screen.getByRole('button', { name: 'Menú de usuario de Ana Pérez' }));
    userEvent.click(screen.getByRole('menuitem', { name: 'Mis eventos' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/my-events');
    first.unmount();

    const second = renderWithProviders(<AppHeader />, { auth: member });
    userEvent.click(screen.getByRole('button', { name: 'Menú de usuario de Ana Pérez' }));
    userEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));
    expect(second.auth.logout).toHaveBeenCalledTimes(1);
  });

  it('TS-39: selector de idioma del visitante', () => {
    renderWithProviders(<AppHeader />, { locale: 'es', auth: guest });
    userEvent.click(screen.getByRole('button', { name: 'Idioma: ES' }));
    expect(screen.getByRole('menuitemradio', { name: 'Español' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute('aria-checked', 'false');
    userEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));
    expect(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Language: EN' });
    expect(trigger).toHaveTextContent('EN');
    expect(document.documentElement.lang).toBe('en');
  });

  it('TS-40: navegación mobile en menú desplegable', () => {
    renderWithProviders(<AppHeader />, { locale: 'es', auth: guest });
    userEvent.click(screen.getByRole('button', { name: 'Menú' }));
    const menu = screen.getByRole('menu', { name: 'Navegación principal' });
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Inicio',
      'Eventos',
      'Cómo funciona',
    ]);
    userEvent.click(within(menu).getByRole('menuitem', { name: 'Eventos' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/events');
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('AppHeader.css', () => {
  const css = fs
    .readFileSync(path.join(__dirname, 'AppHeader.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const mediaStart = css.indexOf('@media');
  const base = css.slice(0, mediaStart);
  const media = css.slice(mediaStart);
  const rule = (source: string, selector: string) =>
    new RegExp(`${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';

  it('TS-41: mobile primero, un solo corte a 768px', () => {
    expect(rule(base, '.ly-header__menu-toggle')).toMatch(/display:\s*inline-flex/);
    expect(rule(base, '.ly-header__links')).toMatch(/display:\s*none/);
    expect(rule(media, '.ly-header__menu-toggle')).toMatch(/display:\s*none/);
    expect(rule(media, '.ly-header__links')).toMatch(/display:\s*flex/);
    expect(css).not.toMatch(/@media[^{]*max-width/);
    expect(media).toMatch(/@media \(min-width: 768px\)/);
    expect(css).not.toMatch(/slot--notifications\s*\{[^}]*display:\s*none/);
  });

  it('TS-41: el nombre del menú de usuario solo se ve desde 768px', () => {
    const userCss = fs
      .readFileSync(path.join(__dirname, '../user-menu/UserMenu.css'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const at = userCss.indexOf('@media');
    expect(rule(userCss.slice(0, at), '.ly-user-menu__name')).toMatch(/display:\s*none/);
    expect(rule(userCss.slice(at), '.ly-user-menu__name')).toMatch(/display:\s*inline/);
  });
});
