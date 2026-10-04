import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import ForgotPasswordPage from '../forgot-password/ForgotPasswordPage';
import { renderWithProviders, sampleUser } from '../../test-utils/renderWithProviders';
import { ApiError } from '../../config/api';
import { GoogleAuthService, UserService } from '../../services/api';

const mockGoogleLogin = jest.fn();

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');
jest.mock('@react-oauth/google', () => ({
  useGoogleLogin: (opts: unknown) => () => mockGoogleLogin(opts),
}));
let mockGoogleClientId = 'test-client';
jest.mock('../../config/runtime', () => ({
  RUNTIME_CONFIG: {
    API_URL: 'http://localhost:8080',
    get GOOGLE_CLIENT_ID() {
      return mockGoogleClientId;
    },
  },
}));

const guest = { user: null, isAuthenticated: false, loading: false };
const apiErr = (status: number, code: string) =>
  new ApiError({ status, body: { error: 'server text', code } });

const authenticate = UserService.authenticateUser as jest.Mock;
const verify = GoogleAuthService.verify as jest.Mock;

const renderLogin = (route = '/login', locale: 'es' | 'en' = 'es') =>
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<p>otra</p>} />
    </Routes>,
    { route, auth: guest, locale }
  );

const emailField = () => screen.getByLabelText(/^Email/) as HTMLInputElement;
const passwordField = () => screen.getByLabelText(/^Contraseña/) as HTMLInputElement;
const submit = () => screen.getByRole('button', { name: 'Iniciar sesión' });

const fillAndSubmit = (email = 'ana@example.com', password = 'secreto123') => {
  userEvent.type(emailField(), email);
  userEvent.type(passwordField(), password);
  userEvent.click(submit());
};

const googleResponds = (token: string) =>
  mockGoogleLogin.mockImplementation((opts: { onSuccess: (r: { access_token: string }) => void }) =>
    opts.onSuccess({ access_token: token })
  );

beforeEach(() => {
  mockGoogleClientId = 'test-client';
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  authenticate.mockReset();
  verify.mockReset();
  mockGoogleLogin.mockReset();
});

describe('LoginPage', () => {
  it('TS-14: render por defecto', () => {
    renderLogin();
    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Vuelve a donde dejaste tus eventos.' })).toBeInTheDocument();
    [
      'Sigue el estado de los eventos donde participas',
      'Sube tu propuesta y vota cuando te toque',
      'Consulta los rankings finales completos',
    ].forEach((b) => expect(screen.getByText(b)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: '← Volver al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByText('¿No tienes cuenta?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crea una gratis' })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
    expect(screen.getByText('o con tu email')).toBeInTheDocument();
    expect(emailField()).toHaveAttribute('type', 'email');
    expect(emailField()).toHaveAttribute('placeholder', 'nombre@correo.com');
    expect(passwordField()).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Mostrar' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('link', { name: '¿La olvidaste?' })).toHaveAttribute('href', '/forgot-password');
    expect(submit()).toHaveAttribute('type', 'submit');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.activeElement).toBe(emailField());
  });

  it('TS-15: con next', () => {
    renderLogin('/login?next=%2Fevents%2Fabc');
    expect(screen.getByRole('heading', { level: 2, name: 'Inicia sesión para continuar.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crea una gratis' })).toHaveAttribute(
      'href',
      '/register?next=%2Fevents%2Fabc'
    );
  });

  it('TS-16: mostrar y ocultar contraseña', () => {
    renderLogin();
    userEvent.type(passwordField(), 'secreto123');
    userEvent.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(passwordField()).toHaveAttribute('type', 'text');
    expect(passwordField()).toHaveValue('secreto123');
    const hide = screen.getByRole('button', { name: 'Ocultar' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');
    userEvent.click(hide);
    expect(passwordField()).toHaveAttribute('type', 'password');
  });

  it('TS-17: login con next', async () => {
    authenticate.mockResolvedValue({ user: sampleUser, token: 'jwt-abc' });
    const view = renderLogin('/login?next=%2Fevents%2Fabc');
    fillAndSubmit();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/events/abc'));
    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(authenticate).toHaveBeenCalledWith('ana@example.com', 'secreto123');
    expect(view.auth.login).toHaveBeenCalledWith(sampleUser, 'jwt-abc');
  });

  it('TS-18: login sin next', async () => {
    authenticate.mockResolvedValue({ user: sampleUser, token: 'jwt-abc' });
    renderLogin();
    fillAndSubmit();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/events$/));
  });

  it('TS-19: cargando', async () => {
    authenticate.mockReturnValue(new Promise(() => {}));
    renderLogin();
    fillAndSubmit();
    const busy = await screen.findByRole('button', { name: 'Iniciando sesión…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
  });

  it('TS-20: credenciales incorrectas', async () => {
    authenticate.mockRejectedValue(apiErr(401, 'INVALID_CREDENTIALS'));
    const view = renderLogin();
    fillAndSubmit('ana@example.com', 'incorrecta1');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('El correo o la contraseña no son correctos.');
    ['INVALID_CREDENTIALS', 'UNAUTHORIZED', 'server text'].forEach((raw) =>
      expect(document.body).not.toHaveTextContent(raw)
    );
    expect(emailField()).toHaveValue('ana@example.com');
    expect(passwordField()).toHaveValue('');
    expect(document.activeElement).toBe(passwordField());
    expect(view.auth.login).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    expect(submit()).toBeEnabled();
  });

  it('TS-21: cuenta de Google sin contraseña', async () => {
    authenticate.mockRejectedValue(apiErr(401, 'OAUTH_ACCOUNT_NO_PASSWORD'));
    renderLogin();
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta cuenta usa Google para iniciar sesión. Ingresa con Google.'
    );
  });

  it('TS-22: error de red y error desconocido', async () => {
    authenticate.mockRejectedValue(new TypeError('Failed to fetch'));
    const view = renderLogin();
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
    );
    expect(emailField()).toHaveValue('ana@example.com');
    expect(passwordField()).toHaveValue('secreto123');
    view.unmount();

    authenticate.mockRejectedValue(apiErr(500, 'TOKEN_GENERATION_ERROR'));
    renderLogin();
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos iniciar sesión. Inténtalo de nuevo.');
  });

  it('TS-23: validación del cliente', () => {
    renderLogin();
    userEvent.click(submit());
    expect(authenticate).not.toHaveBeenCalled();
    expect(emailField()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Ingresa un email válido.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument();
    expect(document.activeElement).toBe(emailField());
    userEvent.type(emailField(), 'a');
    expect(screen.queryByText('Ingresa un email válido.')).toBeNull();
    userEvent.type(emailField(), 'na@');
    userEvent.tab();
    expect(screen.getByText('Ingresa un email válido.')).toBeInTheDocument();
  });

  it('TS-29: sin Google configurado', () => {
    mockGoogleClientId = '';
    renderLogin();
    expect(screen.queryByRole('button', { name: 'Continuar con Google' })).toBeNull();
    expect(screen.queryByText('o con tu email')).toBeNull();
    expect(emailField()).toBeInTheDocument();
  });

  it('TS-24: "¿La olvidaste?" lleva el email', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>,
      { route: '/login', auth: guest }
    );
    userEvent.type(emailField(), 'ana@example.com');
    userEvent.click(screen.getByRole('link', { name: '¿La olvidaste?' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/forgot-password');
    expect(screen.getByLabelText(/^Email/)).toHaveValue('ana@example.com');
  });

  it('TS-25: en inglés', () => {
    renderLogin('/login', 'en');
    expect(screen.getByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create one for free' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByText('or with your email')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot it?' })).toBeInTheDocument();
  });
});

describe('LoginPage con Google', () => {
  it('TS-26: usuario existente', async () => {
    googleResponds('g-access-token');
    verify.mockResolvedValue({
      status: 'existing_user',
      token: 'jwt-g',
      user: { id: 'u-9', email: 'leo@example.com', username: 'Leo' },
    });
    const view = renderLogin('/login?next=%2Fevents%2Fabc');
    userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/events/abc'));
    expect(verify).toHaveBeenCalledWith('g-access-token');
    expect(view.auth.login).toHaveBeenCalledWith(
      { id: 'u-9', name: 'Leo', email: 'leo@example.com', role: 'participant', joinedEventIDs: [], createdEventIDs: [] },
      'jwt-g'
    );
  });

  it('TS-27: usuario nuevo va a completar perfil sin guardar la credencial', async () => {
    googleResponds('g-access-token');
    verify.mockResolvedValue({
      status: 'new_user',
      google_token: 'g-access-token',
      profile: { email: 'leo@example.com', suggested_name: 'Leo Gómez' },
    });
    const view = renderLogin('/login?next=%2Fevents%2Fabc');
    userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/complete-profile'));
    expect(view.auth.login).not.toHaveBeenCalled();
    expect(JSON.parse(screen.getByTestId('location-state').textContent as string)).toEqual({
      googleToken: 'g-access-token',
      suggestedName: 'Leo Gómez',
      next: '/events/abc',
    });
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
    expect(stored).not.toContain('g-access-token');
  });

  it('TS-28: errores de Google', async () => {
    mockGoogleLogin.mockImplementation((opts: { onError: () => void }) => opts.onError());
    let view = renderLogin();
    userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectarte con Google. Inténtalo de nuevo.');
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled();
    view.unmount();

    googleResponds('g-access-token');
    verify.mockRejectedValue(apiErr(401, 'INVALID_GOOGLE_TOKEN'));
    view = renderLogin();
    userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos validar tu cuenta de Google. Inténtalo de nuevo.'
    );
    view.unmount();

    verify.mockRejectedValue(apiErr(500, 'GOOGLE_API_ERROR'));
    renderLogin();
    userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos conectar con Google. Inténtalo de nuevo en unos minutos.'
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled());
  });
});
