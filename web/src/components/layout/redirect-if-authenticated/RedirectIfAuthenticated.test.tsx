import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import RedirectIfAuthenticated from './RedirectIfAuthenticated';
import { renderWithProviders, sampleUser } from '../../../test-utils/renderWithProviders';

jest.mock('../../../context/AuthContext');

const routes = (
  <Routes>
    <Route path="/login" element={<RedirectIfAuthenticated><p>login</p></RedirectIfAuthenticated>} />
    <Route path="*" element={<p>otra</p>} />
  </Routes>
);
const signedIn = { user: sampleUser, isAuthenticated: true, loading: false };

describe('RedirectIfAuthenticated', () => {
  it('TS-11: con sesión, /login va a next', () => {
    renderWithProviders(routes, { route: '/login?next=%2Fevents%2Fabc', auth: signedIn });
    expect(screen.getByTestId('location')).toHaveTextContent('/events/abc');
    expect(screen.queryByText('login')).toBeNull();
  });

  it('TS-12: sin next o con next externo va a Eventos', () => {
    const view = renderWithProviders(routes, { route: '/login', auth: signedIn });
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/events$/);
    view.unmount();
    renderWithProviders(routes, { route: '/login?next=https%3A%2F%2Fevil.com', auth: signedIn });
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/events$/);
  });

  it('TS-13: restaurando sesión no redirige; sin sesión muestra la página', () => {
    const view = renderWithProviders(routes, {
      route: '/login?next=%2Fevents%2Fabc',
      auth: { user: null, loading: true },
    });
    expect(screen.queryByText('login')).toBeNull();
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fevents%2Fabc');
    view.unmount();
    renderWithProviders(routes, {
      route: '/login?next=%2Fevents%2Fabc',
      auth: { user: null, isAuthenticated: false, loading: false },
    });
    expect(screen.getByText('login')).toBeInTheDocument();
  });
});
