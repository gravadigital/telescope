import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import RequireAuth from './RequireAuth';
import { renderWithProviders, sampleUser } from '../../../test-utils/renderWithProviders';

jest.mock('../../../context/AuthContext');

const guarded = (
  <Routes>
    <Route path="/login" element={<p>pantalla-login</p>} />
    <Route path="/events/create" element={<RequireAuth><p>Contenido</p></RequireAuth>} />
  </Routes>
);

describe('RequireAuth', () => {
  it('TS-49: no redirige mientras se restaura la sesión', () => {
    const view = renderWithProviders(guarded, {
      route: '/events/create',
      auth: { user: null, loading: true },
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/events/create');
    expect(screen.queryByText('Contenido')).toBeNull();
    view.unmount();

    renderWithProviders(guarded, {
      route: '/events/create',
      auth: { user: sampleUser, isAuthenticated: true, loading: false },
    });
    expect(screen.getByText('Contenido')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/events/create');
  });

  it('TS-50: con sesión pasa', () => {
    renderWithProviders(<RequireAuth><p>Contenido</p></RequireAuth>, {
      auth: { user: sampleUser, isAuthenticated: true, loading: false },
    });
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('sin sesión va a /login con next', () => {
    renderWithProviders(guarded, {
      route: '/events/create?from=home',
      auth: { user: null, loading: false },
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fevents%2Fcreate%3Ffrom%3Dhome');
    expect(screen.queryByText('Contenido')).toBeNull();
  });
});
