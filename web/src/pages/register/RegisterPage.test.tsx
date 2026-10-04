import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from './RegisterPage';
import { renderWithProviders, sampleUser } from '../../test-utils/renderWithProviders';
import { ApiError } from '../../config/api';
import { UserService } from '../../services/api';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');
jest.mock('@react-oauth/google', () => ({ useGoogleLogin: () => () => undefined }));
jest.mock('../../config/runtime', () => ({
  RUNTIME_CONFIG: { API_URL: 'http://localhost:8080', GOOGLE_CLIENT_ID: 'test-client' },
}));

const guest = { user: null, isAuthenticated: false, loading: false };
const apiErr = (status: number, code: string) =>
  new ApiError({ status, body: { error: 'server text', code } });
const createUser = UserService.createUser as jest.Mock;

const renderRegister = (route = '/register', locale: 'es' | 'en' = 'es') =>
  renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<p>otra</p>} />
    </Routes>,
    { route, auth: guest, locale }
  );

const nameField = () => screen.getByLabelText(/^Nombre completo/) as HTMLInputElement;
const emailField = () => screen.getByLabelText(/^Email/) as HTMLInputElement;
const passwordField = () => screen.getByLabelText(/^Contraseña/) as HTMLInputElement;
const submit = () => screen.getByRole('button', { name: 'Crear cuenta' });

const fillAndSubmit = () => {
  userEvent.type(nameField(), 'Ana Pérez');
  userEvent.type(emailField(), 'ana@example.com');
  userEvent.type(passwordField(), 'secreto123');
  userEvent.click(submit());
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  createUser.mockReset();
});

describe('RegisterPage', () => {
  it('TS-30: render', () => {
    renderRegister('/register?next=%2Fevents%2Fabc');
    expect(screen.getByRole('heading', { level: 1, name: 'Crear cuenta' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Participa en eventos donde la comunidad decide.' })
    ).toBeInTheDocument();
    ['Inscríbete y sube tu propuesta', 'Evalúa a otros participantes', 'Crea tus propios eventos'].forEach((b) =>
      expect(screen.getByText(b)).toBeInTheDocument()
    );
    expect(screen.getByText('¿Ya tienes cuenta?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute('href', '/login?next=%2Fevents%2Fabc');
    expect(screen.getByRole('link', { name: '← Volver al inicio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
    expect(nameField()).toHaveAttribute('placeholder', 'Tu nombre');
    expect(emailField()).toBeInTheDocument();
    expect(passwordField()).toHaveAttribute('placeholder', 'Al menos 8 caracteres');
    const help = screen.getByText('Al menos 8 caracteres.');
    expect(passwordField().getAttribute('aria-describedby')).toContain(help.id);
    expect(screen.getByRole('button', { name: 'Mostrar' })).toBeInTheDocument();
    expect(submit()).toBeInTheDocument();
    expect(document.activeElement).toBe(nameField());
  });

  it('TS-31: alta exitosa', async () => {
    createUser.mockResolvedValue({ user: sampleUser, token: 'jwt-new' });
    const view = renderRegister('/register?next=%2Fevents%2Fabc');
    fillAndSubmit();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/events/abc'));
    expect(createUser).toHaveBeenCalledWith({ name: 'Ana Pérez', email: 'ana@example.com', password: 'secreto123' });
    expect(view.auth.login).toHaveBeenCalledWith(sampleUser, 'jwt-new');
    view.unmount();

    renderRegister('/register');
    fillAndSubmit();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/events$/));
  });

  it('TS-32: validación', () => {
    renderRegister();
    userEvent.type(emailField(), 'ana@example.com');
    userEvent.type(passwordField(), 'corta12');
    userEvent.click(submit());
    expect(createUser).not.toHaveBeenCalled();
    expect(screen.getByText('Usa al menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu nombre.')).toBeInTheDocument();
    expect(document.activeElement).toBe(nameField());
  });

  it('TS-33: email ya registrado', async () => {
    createUser.mockRejectedValue(apiErr(409, 'EMAIL_ALREADY_EXISTS'));
    const view = renderRegister();
    fillAndSubmit();
    expect(
      await screen.findByText('Ya hay una cuenta con este email. Inicia sesión o recupera tu contraseña.')
    ).toBeInTheDocument();
    expect(emailField()).toHaveAttribute('aria-invalid', 'true');
    ['EMAIL_ALREADY_EXISTS', 'server text'].forEach((raw) => expect(document.body).not.toHaveTextContent(raw));
    expect(screen.getByTestId('location')).toHaveTextContent('/register');
    expect(nameField()).toHaveValue('Ana Pérez');
    expect(emailField()).toHaveValue('ana@example.com');
    expect(view.auth.login).not.toHaveBeenCalled();
  });

  it('TS-34: error de sistema y contraseña inválida', async () => {
    createUser.mockRejectedValue(apiErr(500, 'CREATION_ERROR'));
    const view = renderRegister();
    fillAndSubmit();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos crear tu cuenta. Inténtalo de nuevo.');
    expect(alert).not.toHaveTextContent('el evento');
    expect(nameField()).toHaveValue('Ana Pérez');
    expect(emailField()).toHaveValue('ana@example.com');
    expect(passwordField()).toHaveValue('');
    view.unmount();

    createUser.mockRejectedValue(apiErr(400, 'INVALID_PASSWORD'));
    renderRegister();
    fillAndSubmit();
    expect(
      await screen.findByText('La contraseña no cumple los requisitos. Elige una más segura.')
    ).toBeInTheDocument();
    expect(passwordField()).toHaveAttribute('aria-invalid', 'true');
  });

  it('TS-35: cargando y en inglés', async () => {
    createUser.mockReturnValue(new Promise(() => {}));
    const view = renderRegister();
    fillAndSubmit();
    const busy = await screen.findByRole('button', { name: 'Creando cuenta…' });
    expect(busy).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeDisabled();
    view.unmount();

    renderRegister('/register', 'en');
    expect(screen.getByRole('heading', { level: 1, name: 'Sign up' })).toBeInTheDocument();
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Full name/)).toBeInTheDocument();
  });
});
