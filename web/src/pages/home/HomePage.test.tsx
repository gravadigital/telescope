import fs from 'fs';
import path from 'path';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './HomePage';
import { renderWithProviders, sampleUser } from '../../test-utils/renderWithProviders';
import { listItem, page } from '../../test-utils/eventFixtures';
import { EventService } from '../../services/api';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');

const listEvents = EventService.listEvents as jest.Mock;
const guest = { user: null, isAuthenticated: false, loading: false };
const signedIn = { user: sampleUser, isAuthenticated: true, loading: false };

const items = () => [
  listItem({ id: 'e-1', name: 'Concurso de afiches' }),
  listItem({ id: 'e-2', name: 'Hackatón verde', participation_estimated_end_date: '2026-10-15', max_participants: 30, participants_count: 3 }),
  listItem({ id: 'e-3', name: 'Fotografía urbana', participation_estimated_end_date: '2026-10-20' }),
  listItem({ id: 'e-4', name: 'Taller', participation_estimated_end_date: '2026-10-25' }),
];

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 7, 10, 0));
  listEvents.mockReset();
});
afterEach(() => {
  jest.useRealTimers();
});

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('HomePage', () => {
  it('TS-25: render con abiertos', async () => {
    listEvents.mockResolvedValue(page(items()));
    renderWithProviders(<HomePage />, { auth: guest });
    await settle();

    expect(listEvents).toHaveBeenCalledWith({ stage: 'participation', limit: 100 });
    expect(screen.getByRole('heading', { level: 1, name: 'Concursos donde la comunidad decide quién gana.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar eventos abiertos →' })).toHaveAttribute('href', '/events?stage=participation');
    expect(screen.getByRole('link', { name: 'Crear un evento' })).toHaveAttribute('href', '/login?next=%2Fevents%2Fcreate');

    const featured = screen.getByRole('region', { name: 'Evento destacado' });
    expect(within(featured).getByText('Concurso de afiches')).toBeInTheDocument();
    expect(within(featured).getByText('Inscripción abierta · Cierra en 3 días')).toBeInTheDocument();
    expect(within(featured).getByText('Participación').closest('[aria-current="step"]')).not.toBeNull();
    expect(within(featured).getByText('12 de 20 lugares ocupados')).toBeInTheDocument();
    expect(within(featured).getByRole('link', { name: 'Participar' })).toHaveAttribute('href', '/events/e-1');

    const how = document.getElementById('como-funciona') as HTMLElement;
    expect(within(how).getByRole('heading', { level: 2, name: 'Cuatro etapas, siempre visibles' })).toBeInTheDocument();
    expect(within(how).getAllByRole('listitem')).toHaveLength(4);
    expect(within(how).getByText('01 · Creación')).toBeInTheDocument();
    expect(within(how).getByText('04 · Resultados')).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: 'Abiertos ahora' })).toBeInTheDocument();
    const cards = screen.getAllByRole('link', { name: 'Ver y participar' });
    expect(cards).toHaveLength(3);
    expect(screen.getAllByText('Hackatón verde').length).toBeGreaterThan(0);
    expect(screen.getByText('Fotografía urbana')).toBeInTheDocument();
    expect(screen.queryByText('Taller')).toBeNull();
    expect(screen.getByRole('link', { name: 'Ver todos los eventos →' })).toHaveAttribute('href', '/events');
    expect(screen.getByRole('link', { name: 'Crear mi primer evento' })).toBeInTheDocument();
    expect(screen.queryByText(/demo/i)).toBeNull();
  });

  it('TS-26: con sesión los CTA van directo', async () => {
    listEvents.mockResolvedValue(page(items()));
    renderWithProviders(<HomePage />, { auth: signedIn });
    await settle();
    expect(screen.getByRole('link', { name: 'Crear un evento' })).toHaveAttribute('href', '/events/create');
    expect(screen.getByRole('link', { name: 'Crear mi primer evento' })).toHaveAttribute('href', '/events/create');
  });

  it('TS-27: cierra hoy y sin fecha', async () => {
    listEvents.mockResolvedValue(page([listItem({ participation_estimated_end_date: '2026-10-07' })]));
    const { unmount } = renderWithProviders(<HomePage />, { auth: guest });
    await settle();
    expect(screen.getByText('Inscripción abierta · Cierra hoy')).toBeInTheDocument();
    unmount();

    listEvents.mockResolvedValue(page([listItem({ participation_estimated_end_date: null })]));
    renderWithProviders(<HomePage />, { auth: guest });
    await settle();
    const featured = screen.getByRole('region', { name: 'Evento destacado' });
    expect(within(featured).getByText('Inscripción abierta')).toBeInTheDocument();
    expect(within(featured).queryByText(/Cierra/)).toBeNull();
  });

  it('TS-28: sin eventos abiertos', async () => {
    for (const result of [page([]), page([listItem({ is_paused: true })])]) {
      listEvents.mockResolvedValue(result);
      const { unmount } = renderWithProviders(<HomePage />, { auth: guest });
      await settle();
      expect(screen.getByText('Ahora no hay eventos con inscripción abierta.')).toBeInTheDocument();
      expect(screen.queryByText('Participar')).toBeNull();
      expect(screen.queryByText('Ver y participar')).toBeNull();
      expect(screen.getByRole('heading', { name: 'Cuatro etapas, siempre visibles' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Crear mi primer evento' })).toBeInTheDocument();
      userEvent.click(screen.getByRole('button', { name: 'Ver todos los eventos' }));
      expect(screen.getByTestId('location')).toHaveTextContent('/events');
      unmount();
    }
  });

  it('TS-29: error y reintento', async () => {
    listEvents
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(page([listItem()]));
    renderWithProviders(<HomePage />, { auth: guest });
    await settle();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar los eventos abiertos.');
    expect(screen.queryByRole('region', { name: 'Evento destacado' })).toBeNull();
    expect(screen.queryByText('Failed to fetch')).toBeNull();

    userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await settle();
    expect(listEvents).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText('Concurso de afiches').length).toBeGreaterThan(0);
    expect(screen.queryByText('server text')).toBeNull();
  });

  it('TS-30: cargando', () => {
    listEvents.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<HomePage />, { auth: guest });
    expect(screen.getByRole('status')).toHaveTextContent('Cargando eventos…');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cuatro etapas, siempre visibles' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver y participar' })).toBeNull();
  });

  it('TS-31: ancla #como-funciona', async () => {
    listEvents.mockResolvedValue(page([]));
    const scrollIntoView = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderWithProviders(<HomePage />, { route: '/#como-funciona', auth: guest });
    await settle();
    const heading = screen.getByRole('heading', { name: 'Cuatro etapas, siempre visibles' });
    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.instances[0]).toBe(document.getElementById('como-funciona'));
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(document.activeElement).toBe(heading);
  });

  it('TS-32: en inglés', async () => {
    listEvents.mockResolvedValue(page(items()));
    renderWithProviders(<HomePage />, { auth: guest, locale: 'en' });
    await settle();
    expect(screen.getByRole('heading', { level: 1, name: 'Contests where the community decides who wins.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore open events →' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Four stages, always visible' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Open now' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create my first event' })).toBeInTheDocument();
  });

  it('TS-33: CSS mobile-first', () => {
    const css = fs.readFileSync(path.join(__dirname, 'HomePage.css'), 'utf8');
    const mediaStart = css.indexOf('@media (min-width: 768px)');
    expect(mediaStart).toBeGreaterThan(-1);
    const base = css.slice(0, mediaStart);
    const media = css.slice(mediaStart);
    for (const sel of ['.hm-hero', '.hm-steps', '.hm-open__list', '.hm-banner']) {
      expect(base).toMatch(new RegExp(`${sel.replace('.', '\\.')}\\s*\\{[^}]*grid-template-columns:\\s*1fr`));
    }
    expect(media).toMatch(/\.hm-hero\s*\{[^}]*7fr 5fr/);
    expect(media).toMatch(/\.hm-steps\s*\{[^}]*repeat\(4, 1fr\)/);
    expect(media).toMatch(/\.hm-open__list\s*\{[^}]*repeat\(3, 1fr\)/);
    expect(media).toMatch(/\.hm-banner\s*\{[^}]*9fr 3fr/);
    expect(css).not.toMatch(/@media[^{]*max-width/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
  });

  it('descarta la respuesta si se desmonta', async () => {
    let resolve: (v: unknown) => void = () => {};
    listEvents.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { unmount } = renderWithProviders(<HomePage />, { auth: guest });
    unmount();
    await act(async () => { resolve(page([])); });
    await waitFor(() => expect(listEvents).toHaveBeenCalledTimes(1));
  });
});
