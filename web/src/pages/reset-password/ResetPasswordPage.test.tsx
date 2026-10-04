import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordPage from './ResetPasswordPage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { ApiError } from '../../config/api';
import { UserService } from '../../services/api';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');

const reset = UserService.resetPassword as jest.Mock;
const page = (
  <Routes>
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/login" element={<p>login</p>} />
    <Route path="/forgot-password" element={<p>forgot</p>} />
  </Routes>
);
const apiErr = (status: number, code: string) => new ApiError({ status, body: { error: 'x', code } });
const newPassword = () => screen.getByLabelText(/^Nueva contraseña/) as HTMLInputElement;
const repeat = () => screen.getByLabelText(/^Repite la contraseña/) as HTMLInputElement;
const save = () => screen.getByRole('button', { name: 'Guardar contraseña' });
const fill = (password: string, confirm = password) => {
  userEvent.type(newPassword(), password);
  userEvent.type(repeat(), confirm);
  userEvent.click(save());
};

beforeEach(() => {
  jest.clearAllMocks();
  reset.mockReset();
});

describe('ResetPasswordPage', () => {
  it('TS-41: sin token', () => {
    const h = (name: string) => screen.getByRole('heading', { level: 1, name });
    renderWithProviders(page, { route: '/reset-password' });
    expect(h('El enlace no es válido o venció')).toBeInTheDocument();
    expect(document.activeElement).toBe(h('El enlace no es válido o venció'));
    expect(
      screen.getByText('Los enlaces de recuperación vencen en 1 hora y sirven una sola vez. Pide uno nuevo.')
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña/i)).toBeNull();
    userEvent.click(screen.getByRole('button', { name: 'Pedir un enlace nuevo' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/forgot-password');
  });

  it('TS-42: render con token', () => {
    renderWithProviders(page, { route: '/reset-password?token=abc123' });
    expect(screen.getByRole('heading', { level: 1, name: 'Define tu nueva contraseña' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Un paso más y vuelves a tus eventos.' })
    ).toBeInTheDocument();
    expect(newPassword()).toHaveAttribute('placeholder', 'Al menos 8 caracteres');
    expect(screen.getByRole('button', { name: 'Mostrar' })).toBeInTheDocument();
    expect(repeat()).toBeInTheDocument();
    expect(save()).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
    expect(document.activeElement).toBe(newPassword());
  });

  it('TS-43: validación', () => {
    renderWithProviders(page, { route: '/reset-password?token=abc123' });
    fill('1234567');
    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByText('Usa al menos 8 caracteres.')).toBeInTheDocument();
    userEvent.clear(newPassword());
    userEvent.clear(repeat());
    fill('secreto123', 'secreto124');
    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
  });

  it('TS-44: éxito', async () => {
    reset.mockResolvedValue(undefined);
    const view = renderWithProviders(page, { route: '/reset-password?token=abc123' });
    fill('secreto123');
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Contraseña actualizada' });
    expect(reset).toHaveBeenCalledWith('abc123', 'secreto123');
    expect(document.activeElement).toBe(h1);
    expect(screen.getByText('Ya puedes iniciar sesión con tu nueva contraseña.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña/i)).toBeNull();
    expect(screen.getByText('Ya puedes iniciar sesión con tu nueva contraseña.').closest('[aria-live="polite"]')).not.toBeNull();
    userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    expect(view.auth.login).not.toHaveBeenCalled();
  });

  it('TS-45: token vencido o inválido al guardar', async () => {
    for (const code of ['EXPIRED_RESET_TOKEN', 'INVALID_RESET_TOKEN']) {
      reset.mockRejectedValue(apiErr(400, code));
      const view = renderWithProviders(page, { route: '/reset-password?token=abc123' });
      fill('secreto123');
      expect(await screen.findByRole('heading', { level: 1, name: 'El enlace no es válido o venció' })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
      userEvent.click(screen.getByRole('button', { name: 'Pedir un enlace nuevo' }));
      expect(screen.getByTestId('location')).toHaveTextContent('/forgot-password');
      view.unmount();
    }
  });

  it('TS-46: otros errores', async () => {
    reset.mockRejectedValue(apiErr(500, 'DB_ERROR'));
    const view = renderWithProviders(page, { route: '/reset-password?token=abc123' });
    fill('secreto123');
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar la contraseña. Inténtalo de nuevo.');
    expect(newPassword()).toBeInTheDocument();
    view.unmount();

    reset.mockRejectedValue(apiErr(400, 'INVALID_PASSWORD'));
    renderWithProviders(page, { route: '/reset-password?token=abc123' });
    fill('secreto123');
    expect(
      await screen.findByText('La contraseña no cumple los requisitos. Elige una más segura.')
    ).toBeInTheDocument();
    expect(newPassword()).toHaveAttribute('aria-invalid', 'true');
  });

  it('TS-47: cargando', async () => {
    reset.mockReturnValue(new Promise(() => {}));
    renderWithProviders(page, { route: '/reset-password?token=abc123' });
    fill('secreto123');
    const busy = await screen.findByRole('button', { name: 'Guardando…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
  });
});
