import React from 'react';
import { screen } from '@testing-library/react';
import { AppRoutes } from './App';
import { renderWithProviders, sampleUser } from './test-utils/renderWithProviders';
import { EventService, ApiHealthService } from './services/api';

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
    (EventService.getAllEvents as jest.Mock).mockResolvedValue([]);
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
    expect(await screen.findByRole('heading', { name: 'Browse Events' })).toBeInTheDocument();
    expect(screen.queryByText('No encontramos esta página')).toBeNull();
  });

  it('TS-61: detalle de evento no cae en la 404', async () => {
    renderWithProviders(<AppRoutes />, { route: '/events/evt-1', auth: guest });
    await screen.findByRole('banner');
    expect(screen.queryByText('No encontramos esta página')).toBeNull();
  });
});
