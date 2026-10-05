import fs from 'fs';
import path from 'path';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyEventsPage from './MyEventsPage';
import { renderWithProviders, sampleUser } from '../../test-utils/renderWithProviders';
import { myEvent } from '../../test-utils/eventFixtures';
import { UserService } from '../../services/api';
import { ApiError } from '../../config/api';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');

const getMyEvents = UserService.getMyEvents as jest.Mock;
const signedIn = { user: sampleUser, isAuthenticated: true, loading: false };
const status = { has_attachment: true, has_assignment: true, ranking_submitted: false, result_position: null, result_total: null };

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const full = () => [
  myEvent({ id: 'o1', name: 'Taller de cerámica', role: 'creator', my_status: null, author_id: 'u-1', created_at: '2026-09-15T10:00:00Z' }),
  myEvent({ id: 'o2', name: 'Feria de ciencias', role: 'creator', stage: 'creation', my_status: null, author_id: 'u-1', created_at: '2026-10-01T10:00:00Z', participation_estimated_end_date: null }),
  myEvent({ id: 'p1', name: 'Concurso de afiches' }),
  myEvent({ id: 'p2', name: 'Hackatón verde', stage: 'voting', my_status: status }),
  myEvent({ id: 'p3', name: 'Fotografía urbana', stage: 'results', my_status: { ...status, ranking_submitted: true, result_position: 2, result_total: 9 } }),
];

beforeEach(() => getMyEvents.mockReset());

describe('MyEventsPage', () => {
  it('TS-53 y TS-54: Organizo y Participo, gestionar navega', async () => {
    getMyEvents.mockResolvedValue(full());
    renderWithProviders(<MyEventsPage />, { route: '/my-events', auth: signedIn });
    await settle();

    expect(screen.getByRole('heading', { level: 1, name: 'Mis eventos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+ Crear evento' })).toHaveAttribute('href', '/events/create');

    const org = screen.getByRole('table', { name: 'Organizo · 2' });
    const names = within(org).getAllByRole('row').slice(1).map((r) => within(r).getByText(/Feria|Taller/).textContent);
    expect(names).toEqual(['Feria de ciencias', 'Taller de cerámica']);
    expect(within(org).getByText('Borrador · no visible')).toBeInTheDocument();
    expect(within(org).getByRole('button', { name: 'Gestionar Feria de ciencias' })).toBeInTheDocument();

    const part = screen.getByRole('table', { name: 'Participo · 3' });
    expect(within(part).getByText('Falta tu archivo')).toBeInTheDocument();
    expect(within(part).getByRole('button', { name: /^Subir archivo/ })).toBeInTheDocument();
    expect(within(part).getByText('Te toca votar')).toBeInTheDocument();
    expect(within(part).getByRole('button', { name: /^Votar/ })).toBeInTheDocument();
    expect(within(part).getByText('Puesto 2 de 9')).toBeInTheDocument();
    expect(within(part).getByRole('button', { name: /^Ver resultados/ })).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: 'Gestionar Taller de cerámica' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/events/o1/manage');
  });

  it('TS-55: sección vacía', async () => {
    getMyEvents.mockResolvedValue([myEvent({ id: 'p1' })]);
    const { unmount } = renderWithProviders(<MyEventsPage />, { route: '/my-events', auth: signedIn });
    await settle();
    expect(screen.getByText('Todavía no has organizado ningún evento.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear evento' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /Organizo/ })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Organizo · 0' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Participo · 1' })).toBeInTheDocument();
    unmount();

    getMyEvents.mockResolvedValue([]);
    renderWithProviders(<MyEventsPage />, { route: '/my-events', auth: signedIn });
    await settle();
    expect(screen.getByText('Todavía no te has inscrito en ningún evento.')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Explorar eventos' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/events');
  });

  it('TS-56: error y reintento', async () => {
    getMyEvents
      .mockRejectedValueOnce(new ApiError({ status: 500, body: { error: 'server text', code: 'RETRIEVAL_ERROR' } }))
      .mockResolvedValueOnce([myEvent()]);
    renderWithProviders(<MyEventsPage />, { route: '/my-events', auth: signedIn });
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tus eventos.');
    expect(screen.queryAllByRole('table')).toHaveLength(0);
    expect(screen.queryByText(/Organizo ·|Participo ·/)).toBeNull();
    expect(screen.queryByText(/server text|RETRIEVAL_ERROR/)).toBeNull();
    userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await settle();
    expect(screen.getByRole('heading', { name: 'Participo · 1' })).toBeInTheDocument();
  });

  it('TS-57: cargando', () => {
    getMyEvents.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<MyEventsPage />, { route: '/my-events', auth: signedIn });
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(2);
    tables.forEach((t) => expect(t).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tus eventos…');
  });

  it('TS-59: CSS mobile-first', () => {
    const css = fs.readFileSync(path.join(__dirname, 'MyEventsPage.css'), 'utf8');
    const at = css.indexOf('@media (min-width: 768px)');
    expect(css.slice(0, at)).toMatch(/\.mye-header\s*\{[^}]*grid-template-columns:\s*1fr/);
    expect(css.slice(at)).toMatch(/\.mye-header\s*\{[^}]*grid-template-columns:\s*9fr 3fr/);
    expect(css).not.toMatch(/@media[^{]*max-width/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
  });
});
