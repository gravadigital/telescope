import React from 'react';
import fs from 'fs';
import path from 'path';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppHeader from './AppHeader';
import { renderWithProviders, sampleUser } from '../../../test-utils/renderWithProviders';

jest.mock('../../../context/AuthContext');
jest.mock('../../../context/NotificationsContext', () => ({
  useNotifications: () => ({
    unreadCount: 2,
    refresh: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    syncUnreadCount: jest.fn(),
  }),
}));

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
    const language = screen.getByRole('group', { name: 'Idioma: ES' });
    expect(within(language).getByRole('button', { name: 'ES' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(language).getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false');
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
    expect(screen.getByRole('button', { name: 'Notificaciones, 2 sin leer' })).toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Menú de usuario de Ana Pérez' });
    expect(trigger).toHaveTextContent('AP');
    expect(trigger).toHaveTextContent('Ana Pérez');
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Idioma: ES' })).toBeInTheDocument();
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
      within(menu).getByRole('menuitem', { name: 'Notificaciones' }),
      within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }),
    ];
    expect(items.map((i) => i.textContent)).toEqual(['Mis eventos', 'Notificaciones', 'Cerrar sesión']);
    expect(items.map((i) => i.getAttribute('role'))).toEqual([
      'menuitem',
      'menuitem',
      'menuitem',
    ]);
    expect(within(menu).getByRole('menuitemradio', { name: 'Español' })).toHaveAttribute('aria-checked', 'true');
    expect(within(menu).getByRole('menuitemradio', { name: 'English' })).toHaveAttribute('aria-checked', 'false');
  });

  it('el menú de usuario permite cambiar idioma en responsive', () => {
    renderWithProviders(<AppHeader />, { locale: 'es', auth: member });
    userEvent.click(screen.getByRole('button', { name: 'Menú de usuario de Ana Pérez' }));
    userEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument();
    expect(localStorage.getItem('telescopio_locale')).toBe('"en"');
  });

  it('TS-37: cambia el idioma desde el selector junto al usuario', () => {
    renderWithProviders(<AppHeader />, { locale: 'es', auth: member });
    userEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'How it works' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Eventos' })).toBeNull();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('telescopio_locale')).toBe('"en"');
    expect(screen.getByRole('group', { name: 'Language: EN' })).toBeInTheDocument();
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

  it('TS-58: Notificaciones en el menú de usuario navega a /notifications', () => {
    renderWithProviders(<AppHeader />, { auth: member });
    userEvent.click(screen.getByRole('button', { name: 'Menú de usuario de Ana Pérez' }));
    userEvent.click(screen.getByRole('menuitem', { name: 'Notificaciones' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/notifications');
  });

  it('TS-39: selector de idioma del visitante', () => {
    renderWithProviders(<AppHeader />, { locale: 'es', auth: guest });
    const group = screen.getByRole('group', { name: 'Idioma: ES' });
    expect(within(group).getByRole('button', { name: 'ES' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false');
    userEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
    const updated = screen.getByRole('group', { name: 'Language: EN' });
    expect(within(updated).getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
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
      'Crear cuenta',
    ]);
    userEvent.click(within(menu).getByRole('menuitem', { name: 'Eventos' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/events');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('TS-40: login queda visible y el registro pasa al menú mobile', () => {
    renderWithProviders(<AppHeader />, { locale: 'es', auth: guest });
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    userEvent.click(screen.getByRole('button', { name: 'Menú' }));
    const menu = screen.getByRole('menu', { name: 'Navegación principal' });
    userEvent.click(within(menu).getByRole('menuitemradio', { name: 'English' }));
    expect(document.documentElement.lang).toBe('en');

    userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const englishMenu = screen.getByRole('menu', { name: 'Main navigation' });
    expect(within(englishMenu).getByRole('menuitem', { name: 'Sign up' })).toBeInTheDocument();
    userEvent.click(within(englishMenu).getByRole('menuitem', { name: 'Sign up' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/register');
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

  it('TS-41: mobile primero, navegación completa desde 900px', () => {
    expect(rule(base, '.ly-header__menu-toggle')).toMatch(/display:\s*inline-flex/);
    expect(rule(base, '.ly-header__links')).toMatch(/display:\s*none/);
    expect(rule(media, '.ly-header__menu-toggle')).toMatch(/display:\s*none/);
    expect(rule(media, '.ly-header__links')).toMatch(/display:\s*flex/);
    expect(css).not.toMatch(/@media[^{]*max-width/);
    expect(media).toMatch(/@media \(min-width: 900px\)/);
    expect(css).not.toMatch(/slot--notifications\s*\{[^}]*display:\s*none/);
  });

  it('TS-41: accesos móviles con un CTA principal y selector compacto', () => {
    expect(rule(base, '.ly-header__inner')).toMatch(/display:\s*grid/);
    expect(rule(base, '.ly-header__actions')).toMatch(/display:\s*contents/);
    expect(rule(base, '.ly-header__inner')).toMatch(/grid-template-columns:\s*auto minmax\(0, 1fr\) auto/);
    expect(rule(base, '.ly-header__auth')).toMatch(/display:\s*contents/);
    expect(rule(base, '.ly-header__auth-link--login')).toMatch(/display:\s*inline-flex/);
    expect(rule(base, '.ly-header__auth-link--login')).toMatch(/grid-column:\s*3/);
    expect(rule(base, '.ly-header__auth-link--register')).toMatch(/display:\s*none/);
    expect(rule(base, '.ly-header .ly-language-select__flag')).toMatch(/display:\s*none/);
    expect(css).toMatch(/\.ly-header__actions > \.ui-menu\s*\{[^}]*grid-column:\s*3/);
    expect(media).toMatch(/\.ly-header__actions\s*\{[^}]*display:\s*flex/);
    expect(media).toMatch(/\.ly-header \.ly-language-select__flag\s*\{[^}]*display:\s*block/);
    expect(media).toMatch(/\.ly-header__auth-link--register\s*\{[^}]*display:\s*inline-flex/);
  });

  it('TS-41: el nombre del menú de usuario también se ve en responsive', () => {
    const userCss = fs
      .readFileSync(path.join(__dirname, '../user-menu/UserMenu.css'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(rule(userCss, '.ly-user-menu__name')).toMatch(/display:\s*inline/);
    expect(rule(userCss, '.ly-user-menu__name')).toMatch(/text-overflow:\s*ellipsis/);
    expect(rule(userCss, '.ly-user-menu__name')).toMatch(/white-space:\s*nowrap/);
  });
});
