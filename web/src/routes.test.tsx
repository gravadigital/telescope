import React from 'react';
import { screen } from '@testing-library/react';
import { AppRoutes } from './App';
import { renderWithProviders, sampleUser } from './test-utils/renderWithProviders';
import { EventService, UserService, ApiHealthService } from './services/api';
import { page } from './test-utils/eventFixtures';

jest.mock('./context/AuthContext');
jest.mock('./services/api');
jest.mock('./pages/create-event/CreateEventPage', () => ({
  __esModule: true,
  default: () => <p>crear-evento</p>,
}));
jest.mock('./pages/manage-event/ManageEventPage', () => ({
  __esModule: true,
  default: () => <p>gestion</p>,
}));

const guest = { user: null, isAuthenticated: false, loading: false };

describe('rutas', () => {
  beforeEach(() => {
    (ApiHealthService.checkHealth as jest.Mock).mockResolvedValue(true);
    (EventService.listEvents as jest.Mock).mockResolvedValue(page([]));
    (UserService.getMyEvents as jest.Mock).mockResolvedValue([]);
    (EventService.getEventById as jest.Mock).mockResolvedValue(null);
  });

  it('TS-46: crear evento sin sesión', () => {
    renderWithProviders(<AppRoutes />, { route: '/events/create', auth: guest });
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fevents%2Fcreate');
    expect(screen.queryByText('crear-evento')).toBeNull();
  });

  it('TS-47: gestión sin sesión', () => {
    renderWithProviders(<AppRoutes />, { route: '/events/evt-1/manage', auth: guest });
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fevents%2Fevt-1%2Fmanage');
  });

  it('TS-48: conserva la query', () => {
    renderWithProviders(<AppRoutes />, { route: '/events/create?from=home', auth: guest });
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fevents%2Fcreate%3Ffrom%3Dhome');
  });

  it('con sesión entra a la ruta protegida', () => {
    renderWithProviders(<AppRoutes />, {
      route: '/events/create',
      auth: { user: sampleUser, isAuthenticated: true, loading: false },
    });
    expect(screen.getByText('crear-evento')).toBeInTheDocument();
  });

  it('TS-58: ruta inexistente dentro del layout', () => {
    renderWithProviders(<AppRoutes />, { route: '/no-existe', auth: guest });
    expect(screen.getByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('TS-61: las rutas existentes no caen en la 404', async () => {
    renderWithProviders(<AppRoutes />, { route: '/events', auth: guest });
    expect(await screen.findByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument();
    expect(screen.queryByText('No encontramos esta página')).toBeNull();
  });

  it('TS-58: /my-events exige sesión', () => {
    renderWithProviders(<AppRoutes />, { route: '/my-events', auth: guest });
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fmy-events');
    expect(screen.queryByRole('heading', { name: 'Mis eventos' })).toBeNull();
  });

  it('TS-60: Inicio, Eventos y Mis eventos', async () => {
    const signedIn = { user: sampleUser, isAuthenticated: true, loading: false };
    const cases: Array<[string, typeof guest | typeof signedIn, string]> = [
      ['/', guest, 'Concursos donde la comunidad decide quién gana.'],
      ['/events', guest, 'Eventos'],
      ['/my-events', signedIn, 'Mis eventos'],
    ];
    for (const [route, auth, heading] of cases) {
      const view = renderWithProviders(<AppRoutes />, { route, auth });
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.queryByText('No encontramos esta página')).toBeNull();
      view.unmount();
    }
  });

  it('TS-61: detalle de evento no cae en la 404', async () => {
    (EventService.getEventById as jest.Mock).mockResolvedValue({
      id: 'evt-1',
      title: 'Concurso de afiches',
      description: 'Desc',
      stage: 'participation',
      date: '2026-10-01',
      organizer: 'Club',
      participant_ids: [],
      creator_id: 'org-1',
      is_paused: false,
      is_cancelled: false,
    });
    renderWithProviders(<AppRoutes />, { route: '/events/evt-1', auth: guest });
    expect(await screen.findByRole('heading', { level: 1, name: 'Concurso de afiches' })).toBeInTheDocument();
    expect(screen.queryByText('No encontramos esta página')).toBeNull();
  });

  it('TS-55: auth fuera del chrome global', () => {
    renderWithProviders(<AppRoutes />, { route: '/login', auth: guest });
    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('banner')).toBeNull();
    expect(screen.queryByText('Telescopio · evaluación distribuida entre pares')).toBeNull();
  });

  it('TS-56: con sesión no se ven login ni registro', () => {
    const signedIn = { user: sampleUser, isAuthenticated: true, loading: false };
    const view = renderWithProviders(<AppRoutes />, { route: '/login?next=%2Fevents%2Fabc', auth: signedIn });
    expect(screen.getByTestId('location')).toHaveTextContent('/events/abc');
    view.unmount();
    renderWithProviders(<AppRoutes />, { route: '/register', auth: signedIn });
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/events$/);
  });

  it('TS-57: rutas nuevas resueltas', () => {
    const cases: Array<[string, string, string]> = [
      ['/forgot-password', 'Recuperar contraseña', '/forgot-password'],
      ['/reset-password?token=t1', 'Define tu nueva contraseña', '/reset-password?token=t1'],
      ['/complete-profile', 'Iniciar sesión', '/login'],
      ['/register', 'Crear cuenta', '/register'],
    ];
    cases.forEach(([route, heading, location]) => {
      const view = renderWithProviders(<AppRoutes />, { route, auth: guest });
      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent(location);
      expect(screen.queryByText('No encontramos esta página')).toBeNull();
      view.unmount();
    });
  });

  it('TS-58b: ruta protegida termina en el login nuevo', () => {
    renderWithProviders(<AppRoutes />, { route: '/events/create', auth: guest });
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fevents%2Fcreate');
    expect(screen.getByRole('heading', { level: 2, name: 'Inicia sesión para continuar.' })).toBeInTheDocument();
  });
});
