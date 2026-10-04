import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from './AuthPage';
import { AppLayout } from '../../components/layout';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

jest.mock('../../context/AuthContext');
jest.mock('../../components/auth/Auth', () => ({
  __esModule: true,
  default: ({ initialMode, onClose }: { initialMode: string; onClose: () => void }) => (
    <button type="button" data-mode={initialMode} onClick={onClose}>
      fake-login
    </button>
  ),
}));

const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="*" element={<p>otra</p>} />
      </Route>
    </Routes>,
    { route }
  );

describe('AuthPage', () => {
  it('TS-53: vuelve a next tras iniciar sesión', () => {
    renderAt('/login?next=%2Fevents%2Fcreate');
    userEvent.click(screen.getByText('fake-login'));
    expect(screen.getByTestId('location')).toHaveTextContent('/events/create');
  });

  it('TS-54: un next externo se ignora', () => {
    renderAt('/login?next=https%3A%2F%2Fotro-sitio.com');
    userEvent.click(screen.getByText('fake-login'));
    expect(screen.getByTestId('location')).toHaveTextContent('/events');
  });

  it('TS-55: sin next va a /events', () => {
    renderAt('/login');
    userEvent.click(screen.getByText('fake-login'));
    expect(screen.getByTestId('location')).toHaveTextContent('/events');
  });

  it('TS-56: modos y layout', () => {
    const login = renderAt('/login');
    expect(screen.getByText('fake-login')).toHaveAttribute('data-mode', 'login');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    login.unmount();
    renderAt('/register');
    expect(screen.getByText('fake-login')).toHaveAttribute('data-mode', 'register');
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('TS-57: /register también respeta next', () => {
    renderAt('/register?next=%2Fevents%2Fevt-1');
    userEvent.click(screen.getByText('fake-login'));
    expect(screen.getByTestId('location')).toHaveTextContent('/events/evt-1');
  });
});
