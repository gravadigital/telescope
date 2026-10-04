import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompleteProfilePage from './CompleteProfilePage';
import { renderWithProviders, buildAuth } from '../../test-utils/renderWithProviders';
import { I18nProvider } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../config/api';
import { GoogleAuthService } from '../../services/api';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');

const register = GoogleAuthService.register as jest.Mock;
const state = { googleToken: 'g-access-token', suggestedName: 'Leo Gómez', next: '/events/abc' };
const googleUser = {
  id: 'u-9',
  name: 'Leo Gómez',
  email: 'leo@example.com',
  role: 'participant',
  joinedEventIDs: [],
  createdEventIDs: [],
};
const apiErr = (status: number, code: string) => new ApiError({ status, body: { error: 'x', code } });

const page = (
  <Routes>
    <Route path="/complete-profile" element={<CompleteProfilePage />} />
    <Route path="/login" element={<p>login</p>} />
  </Routes>
);
const withState = (s: unknown = state) => ({ initialEntry: { pathname: '/complete-profile', state: s } });
const nameField = () => screen.getByLabelText(/^Nombre/) as HTMLInputElement;
const proceed = () => screen.getByRole('button', { name: 'Continuar' });

beforeEach(() => {
  jest.clearAllMocks();
  register.mockReset();
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => window.history.replaceState(null, '', '/'));

describe('CompleteProfilePage', () => {
  it('TS-48: acceso directo va a /login', () => {
    renderWithProviders(page, { route: '/complete-profile' });
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.queryByText('Elige tu nombre')).toBeNull();
  });

  it('TS-49: el token sale del historial (recarga)', () => {
    (useAuth as jest.Mock).mockReturnValue(buildAuth());
    window.history.replaceState({ usr: state, key: 'k1', idx: 0 }, '', '/complete-profile');
    const tree = (
      <I18nProvider initialLocale="es">
        <BrowserRouter>{page}</BrowserRouter>
      </I18nProvider>
    );
    const first = render(tree);
    expect(nameField()).toHaveValue('Leo Gómez');
    expect(JSON.stringify(window.history.state)).not.toContain('g-access-token');
    first.unmount();

    render(tree);
    expect(screen.getByText('login')).toBeInTheDocument();
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
    expect(stored).not.toContain('g-access-token');
  });

  it('TS-50: render con estado', () => {
    renderWithProviders(page, withState());
    expect(screen.getByRole('heading', { level: 1, name: 'Elige tu nombre' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Ya casi estás.' })).toBeInTheDocument();
    expect(
      screen.getByText('Es el nombre que ven los organizadores y el que aparece en los resultados de los eventos.')
    ).toBeInTheDocument();
    expect(nameField()).toHaveValue('Leo Gómez');
    expect(document.activeElement).toBe(nameField());
    expect(nameField().selectionStart).toBe(0);
    expect(nameField().selectionEnd).toBe(9);
    expect(proceed()).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('TS-51: guardar y volver a next', async () => {
    register.mockResolvedValue({ user: googleUser, token: 'jwt-g2' });
    const view = renderWithProviders(page, withState());
    userEvent.click(proceed());
    await waitForLocation('/events/abc');
    expect(register).toHaveBeenCalledWith('g-access-token', 'Leo Gómez');
    expect(view.auth.login).toHaveBeenCalledWith(googleUser, 'jwt-g2');
    view.unmount();

    renderWithProviders(page, withState({ googleToken: 'g-access-token', suggestedName: 'Leo Gómez' }));
    userEvent.click(proceed());
    await waitForLocation('/events');
    screen.getAllByTestId('location').forEach((el) => expect(el).toHaveTextContent(/^\/events$/));
  });

  it('TS-51b: el nombre se envía recortado', async () => {
    register.mockResolvedValue({ user: googleUser, token: 'jwt-g2' });
    renderWithProviders(page, withState());
    userEvent.clear(nameField());
    userEvent.type(nameField(), '  Leo  ');
    userEvent.click(proceed());
    await waitForLocation('/events/abc');
    expect(register).toHaveBeenCalledWith('g-access-token', 'Leo');
  });

  it('TS-52: nombre corto', () => {
    renderWithProviders(page, withState());
    userEvent.clear(nameField());
    userEvent.type(nameField(), 'Al');
    userEvent.click(proceed());
    expect(register).not.toHaveBeenCalled();
    expect(screen.getByText('Usa al menos 3 caracteres.')).toBeInTheDocument();
  });

  it('TS-53: nombre en uso', async () => {
    register.mockRejectedValue(apiErr(409, 'USERNAME_ALREADY_EXISTS'));
    renderWithProviders(page, withState());
    userEvent.click(proceed());
    expect(await screen.findByText('Ese nombre ya está en uso. Prueba con otro.')).toBeInTheDocument();
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(proceed()).toBeEnabled();
    expect(screen.getByTestId('location')).toHaveTextContent('/complete-profile');
  });

  it('TS-54: errores de sistema', async () => {
    register.mockRejectedValue(apiErr(500, 'INTERNAL_ERROR'));
    const view = renderWithProviders(page, withState());
    userEvent.click(proceed());
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu nombre. Inténtalo de nuevo.');
    expect(proceed()).toBeEnabled();
    view.unmount();

    register.mockRejectedValue(apiErr(401, 'INVALID_GOOGLE_TOKEN'));
    renderWithProviders(page, withState());
    userEvent.click(proceed());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos validar tu cuenta de Google. Inténtalo de nuevo.'
    );
    expect(proceed()).toBeEnabled();
  });
});

async function waitForLocation(path: string): Promise<void> {
  await waitFor(() => {
    const locs = screen.getAllByTestId('location');
    expect(locs[locs.length - 1]).toHaveTextContent(path);
  });
}
