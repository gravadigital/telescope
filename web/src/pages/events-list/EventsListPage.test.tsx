import fs from 'fs';
import path from 'path';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventsListPage from './EventsListPage';
import { renderWithProviders, sampleUser } from '../../test-utils/renderWithProviders';
import { listItem, myEvent, page } from '../../test-utils/eventFixtures';
import { EventService, UserService } from '../../services/api';
import { ApiError } from '../../config/api';
import type { MyStatus } from '../../types';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');

const listEvents = EventService.listEvents as jest.Mock;
const getMyEvents = UserService.getMyEvents as jest.Mock;
const guest = { user: null, isAuthenticated: false, loading: false };
const signedIn = { user: sampleUser, isAuthenticated: true, loading: false };
const apiErr = (status: number, code: string) => new ApiError({ status, body: { error: 'server text', code } });
const st = (over: Partial<MyStatus> = {}): MyStatus => ({
  has_attachment: true, has_assignment: true, ranking_submitted: false,
  result_position: null, result_total: null, ...over,
});
const empty = () => page([], {
  stageCounts: { participation: 0, voting: 0, results: 0 },
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
});
const basePage = () => page([listItem({ id: 'e-1', participant_ids: ['u-1'] })], {
  pagination: { page: 1, limit: 10, total: 8, totalPages: 1 },
});
const mine = () => [
  myEvent({ id: 'e-1' }),
  myEvent({ id: 'e-2', name: 'Hackatón verde', stage: 'voting', voting_estimated_end_date: '2026-10-12', my_status: st() }),
  myEvent({ id: 'e-3', name: 'Fotografía urbana', stage: 'results', my_status: st({ ranking_submitted: true, result_position: 2, result_total: 9 }) }),
];

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  listEvents.mockReset();
  getMyEvents.mockReset();
  listEvents.mockResolvedValue(basePage());
  getMyEvents.mockResolvedValue(mine());
});

describe('EventsListPage', () => {
  it('TS-34: con sesión, pendientes y tabla', async () => {
    renderWithProviders(<EventsListPage />, { route: '/events', auth: signedIn });
    await settle();

    expect(getMyEvents).toHaveBeenCalledWith('u-1');
    expect(listEvents).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Tus pendientes · 3' })).toBeInTheDocument();
    expect(screen.getByText('Cierra el 10 oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Cierra el 12 oct 2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resultados publicados' })).toBeInTheDocument();
    expect(screen.getByText('Quedaste en el puesto 2 de 9')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ranking' })).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Todos · 8', 'Inscripción abierta · 4', 'En votación · 2', 'Finalizados · 2',
    ]);
    expect(screen.getByRole('button', { name: 'Subir archivo Concurso de afiches' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+ Crear evento' })).toHaveAttribute('href', '/events/create');
    expect(screen.queryByRole('button', { name: /refresh/i })).toBeNull();
    expect(screen.queryByText('Cómo participar')).toBeNull();
  });

  it('TS-35: tope de pendientes', async () => {
    const up = (id: string, d: string) => myEvent({ id, name: id, participation_estimated_end_date: d });
    getMyEvents.mockResolvedValue([
      up('u3', '2026-10-30'), up('u1', '2026-10-10'), up('u2', '2026-10-20'),
      myEvent({ id: 'v1', name: 'v1', stage: 'voting', voting_estimated_end_date: '2026-10-09', my_status: st() }),
      myEvent({ id: 'v2', name: 'v2', stage: 'voting', voting_estimated_end_date: '2026-10-11', my_status: st() }),
      myEvent({ id: 'r1', name: 'r1', stage: 'results', my_status: st({ result_position: 1, result_total: 3 }) }),
    ]);
    renderWithProviders(<EventsListPage />, { route: '/events', auth: signedIn });
    await settle();
    expect(screen.getByRole('heading', { level: 2, name: 'Tus pendientes · 6' })).toBeInTheDocument();
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(4);
    expect(cards.map((c) => within(c).getByText(/^[uvr]\d$/).textContent)).toEqual(['u1', 'u2', 'u3', 'v1']);
    expect(screen.getByRole('link', { name: 'Ver todos en Mis eventos' })).toHaveAttribute('href', '/my-events');
  });

  it('TS-36: sin pendientes', async () => {
    getMyEvents.mockResolvedValue([myEvent({ role: 'creator', my_status: null })]);
    renderWithProviders(<EventsListPage />, { route: '/events', auth: signedIn });
    await settle();
    expect(screen.queryByRole('heading', { name: /Tus pendientes/ })).toBeNull();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('TS-37: filtro por etapa', async () => {
    renderWithProviders(<EventsListPage />, { route: '/events', auth: signedIn });
    await settle();
    userEvent.click(screen.getByRole('tab', { name: /Inscripción abierta/ }));
    await settle();
    expect(screen.getByTestId('location')).toHaveTextContent('/events?stage=participation');
    expect(listEvents).toHaveBeenLastCalledWith({ stage: 'participation', page: 1, limit: 10 });
    expect(screen.getByRole('tab', { name: /Inscripción abierta/ })).toHaveAttribute('aria-selected', 'true');
    expect(getMyEvents).toHaveBeenCalledTimes(1);
  });

  it('TS-38: entrada con stage y q', async () => {
    renderWithProviders(<EventsListPage />, { route: '/events?stage=voting&q=verde', auth: signedIn });
    await settle();
    expect(listEvents).toHaveBeenCalledWith({ stage: 'voting', q: 'verde', page: 1, limit: 10 });
    expect(screen.getByRole('tab', { name: /En votación/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('searchbox', { name: 'Buscar eventos' })).toHaveValue('verde');
  });

  it('TS-39: stage=creation se ignora', async () => {
    renderWithProviders(<EventsListPage />, { route: '/events?stage=creation', auth: signedIn });
    await settle();
    expect(listEvents).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(screen.getByRole('tab', { name: /Todos/ })).toHaveAttribute('aria-selected', 'true');
  });

  describe('búsqueda con debounce', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('TS-40 y TS-41: una sola llamada a los 300 ms y región live', async () => {
      renderWithProviders(<EventsListPage />, { route: '/events', auth: signedIn });
      await settle();
      expect(screen.getByText('8 eventos')).toHaveAttribute('aria-live', 'polite');
      listEvents.mockResolvedValue(page([listItem()], { pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } }));

      userEvent.type(screen.getByRole('searchbox', { name: 'Buscar eventos' }), 'afi');
      act(() => { jest.advanceTimersByTime(299); });
      expect(listEvents).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/events$/);
      act(() => { jest.advanceTimersByTime(1); });
      await settle();
      expect(screen.getByTestId('location')).toHaveTextContent('/events?q=afi');
      expect(listEvents).toHaveBeenCalledTimes(2);
      expect(listEvents).toHaveBeenLastCalledWith({ q: 'afi', page: 1, limit: 10 });
      expect(screen.getByText('1 evento')).toHaveAttribute('aria-live', 'polite');
    });
  });

  it('TS-42: sin coincidencias y limpiar', async () => {
    listEvents.mockResolvedValue(empty());
    renderWithProviders(<EventsListPage />, { route: '/events?stage=voting&q=zzz', auth: signedIn });
    await settle();
    expect(screen.getByText('No hay eventos que coincidan con tu búsqueda.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await settle();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/events$/);
    expect(screen.getByRole('searchbox', { name: 'Buscar eventos' })).toHaveValue('');
    expect(screen.getByRole('tab', { name: /Todos/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('TS-43: sin eventos públicos', async () => {
    listEvents.mockResolvedValue(empty());
    renderWithProviders(<EventsListPage />, { route: '/events', auth: guest });
    await settle();
    expect(screen.getByText('Todavía no hay eventos públicos.')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Crear un evento' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fevents%2Fcreate');
  });

  it('TS-44: error de la tabla', async () => {
    listEvents.mockReset();
    listEvents.mockRejectedValueOnce(apiErr(500, 'RETRIEVAL_ERROR')).mockResolvedValueOnce(page([listItem()]));
    renderWithProviders(<EventsListPage />, { route: '/events', auth: guest });
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar los eventos.');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).toBeNull();
    expect(screen.queryByText(/server text|RETRIEVAL_ERROR/)).toBeNull();
    userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await settle();
    expect(screen.getByText('Concurso de afiches')).toBeInTheDocument();
  });

  it('TS-45: error solo en pendientes', async () => {
    getMyEvents.mockReset();
    getMyEvents.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce([myEvent()]);
    renderWithProviders(<EventsListPage />, { route: '/events', auth: signedIn });
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tus pendientes.');
    expect(screen.getByText('Concurso de afiches')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await settle();
    expect(getMyEvents).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('heading', { name: 'Falta subir tu archivo' })).toBeInTheDocument();
  });

  it('TS-46: visitante', async () => {
    renderWithProviders(<EventsListPage />, { route: '/events', auth: guest });
    await settle();
    expect(getMyEvents).not.toHaveBeenCalled();
    expect(screen.getByText('Explorar · 8 eventos públicos')).toBeInTheDocument();
    expect(screen.getByText(/^Mira qué se está evaluando/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Tus pendientes/ })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Cómo participar' })).toBeInTheDocument();
    expect(screen.getByText('Elige un evento con inscripción abierta')).toBeInTheDocument();
    const create = screen.getByRole('link', { name: 'Crear un evento' });
    expect(create).toHaveClass('ui-button--secondary');
    expect(create).toHaveAttribute('href', '/login?next=%2Fevents%2Fcreate');
    expect(screen.getByRole('link', { name: 'Crear cuenta gratis' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('button', { name: 'Participar Concurso de afiches' })).toBeInTheDocument();
    expect(screen.getByText('Requiere cuenta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /refresh|actualizar/i })).toBeNull();
  });

  it('TS-47 y TS-48: paginación', async () => {
    listEvents.mockResolvedValue(page([listItem()], { pagination: { page: 1, limit: 10, total: 23, totalPages: 3 } }));
    renderWithProviders(<EventsListPage />, { route: '/events?stage=voting', auth: guest });
    await settle();
    const nav = screen.getByRole('navigation', { name: 'Paginación' });
    expect(within(nav).getByText('1 de 3')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Anterior' })).toBeDisabled();
    userEvent.click(within(nav).getByRole('button', { name: 'Siguiente' }));
    await settle();
    expect(screen.getByTestId('location')).toHaveTextContent('/events?stage=voting&page=2');
    expect(listEvents).toHaveBeenLastCalledWith({ stage: 'voting', page: 2, limit: 10 });
  });

  it('TS-48: sin paginación con una página', async () => {
    renderWithProviders(<EventsListPage />, { route: '/events', auth: signedIn });
    await settle();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).toBeNull();
  });

  it('TS-49: respuesta vieja descartada', async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    listEvents.mockReset();
    listEvents
      .mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce(page([listItem({ name: 'Nuevo' })]));
    renderWithProviders(<EventsListPage />, { route: '/events', auth: guest });
    userEvent.click(screen.getByRole('tab', { name: 'En votación' }));
    await settle();
    await act(async () => { resolveFirst(page([listItem({ name: 'Viejo' })])); });
    expect(screen.queryByText('Viejo')).toBeNull();
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('TS-50: tabs con teclado', async () => {
    renderWithProviders(<EventsListPage />, { route: '/events', auth: signedIn });
    await settle();
    const all = screen.getByRole('tab', { name: /Todos/ });
    all.focus();
    userEvent.keyboard('{arrowright}');
    await settle();
    const open = screen.getByRole('tab', { name: /Inscripción abierta/ });
    expect(open).toHaveFocus();
    expect(open).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('/events?stage=participation');
  });

  it('TS-51: en inglés', async () => {
    renderWithProviders(<EventsListPage />, { route: '/events', auth: signedIn, locale: 'en' });
    await settle();
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Your to-dos · 3' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'All · 8', 'Registration open · 4', 'Voting · 2', 'Finished · 2',
    ]);
    expect(screen.getByPlaceholderText('Search by name or organizer')).toBeInTheDocument();
  });

  it('TS-52: CSS mobile-first', () => {
    const css = fs.readFileSync(path.join(__dirname, 'EventsListPage.css'), 'utf8');
    const at = css.indexOf('@media (min-width: 768px)');
    const base = css.slice(0, at);
    const media = css.slice(at);
    expect(base).toMatch(/\.evl-toolbar\s*\{[^}]*flex-direction:\s*column/);
    expect(base).toMatch(/\.evl-search\s*\{[^}]*order:\s*-1/);
    expect(base).toMatch(/\.evl-pending__list\s*\{[^}]*grid-template-columns:\s*1fr/);
    expect(media).toMatch(/\.evl-search\s*\{[^}]*order:\s*0/);
    expect(media).toMatch(/\.evl-toolbar\s*\{[^}]*flex-direction:\s*row/);
    expect(media).toMatch(/\.evl-pending__list\s*\{[^}]*repeat\(2, 1fr\)/);
    expect(media).toMatch(/\.evl-header\s*\{[^}]*9fr 3fr/);
    expect(media).toMatch(/\.evl-banner\s*\{[^}]*9fr 3fr/);
    expect(css).not.toMatch(/@media[^{]*max-width/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
  });
});
