import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from './ForgotPasswordPage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { ApiError } from '../../config/api';
import { UserService } from '../../services/api';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');

const forgot = UserService.forgotPassword as jest.Mock;
const page = (
  <Routes>
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/login" element={<p>login</p>} />
  </Routes>
);
const withState = { initialEntry: { pathname: '/forgot-password', state: { email: 'ana@example.com' } } };
const emailField = () => screen.getByLabelText(/^Email/) as HTMLInputElement;
const send = () => screen.getByRole('button', { name: 'Enviar enlace' });

beforeEach(() => {
  jest.clearAllMocks();
  forgot.mockReset();
});

describe('ForgotPasswordPage', () => {
  it('TS-36: render y precarga', () => {
    const view = renderWithProviders(page, withState);
    expect(screen.getByRole('heading', { level: 1, name: 'Recuperar contraseña' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Recupera el acceso a tus eventos.' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText(/nunca creaste una contraseña, usa esta opción para crearla/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Volver a iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(emailField()).toHaveValue('ana@example.com');
    expect(send()).toBeInTheDocument();
    expect(document.activeElement).toBe(emailField());
    view.unmount();

    renderWithProviders(page, { route: '/forgot-password' });
    expect(emailField()).toHaveValue('');
  });

  it('TS-37: envío exitoso', async () => {
    forgot.mockResolvedValue(undefined);
    renderWithProviders(page, withState);
    userEvent.click(send());
    const status = await screen.findByRole('status');
    expect(forgot).toHaveBeenCalledWith('ana@example.com');
    expect(status).toHaveTextContent('Revisa tu email');
    expect(status).toHaveTextContent(
      'Si hay una cuenta con ana@example.com, te enviamos un enlace. Vence en 1 hora. Revisa también la carpeta de spam.'
    );
    expect(screen.queryByLabelText(/^Email/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Enviar enlace' })).toBeNull();
    expect(screen.queryByText(/nunca creaste una contraseña/)).toBeNull();
    expect(document.activeElement).toBe(status);
    expect(screen.getByRole('link', { name: '← Volver a iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Recuperar contraseña' })).toBeInTheDocument();
  });

  it('TS-38: validación', () => {
    renderWithProviders(page, { route: '/forgot-password' });
    userEvent.type(emailField(), 'ana@');
    userEvent.click(send());
    expect(forgot).not.toHaveBeenCalled();
    expect(screen.getByText('Ingresa un email válido.')).toBeInTheDocument();
  });

  it('TS-39: errores', async () => {
    forgot.mockRejectedValue(new TypeError('Failed to fetch'));
    const view = renderWithProviders(page, withState);
    userEvent.click(send());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
    );
    expect(emailField()).toHaveValue('ana@example.com');
    expect(send()).toBeEnabled();
    view.unmount();

    forgot.mockRejectedValue(new ApiError({ status: 500, body: { error: 'x', code: 'DB_ERROR' } }));
    renderWithProviders(page, withState);
    userEvent.click(send());
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos enviar el enlace. Inténtalo de nuevo.');
  });

  it('TS-40: cargando', async () => {
    forgot.mockReturnValue(new Promise(() => {}));
    renderWithProviders(page, withState);
    userEvent.click(send());
    const busy = await screen.findByRole('button', { name: 'Enviando…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
  });
});
