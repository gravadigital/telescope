import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotFoundPage from './NotFoundPage';
import { AppLayout } from '../../components/layout';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

jest.mock('../../context/AuthContext');

const tree = (
  <Routes>
    <Route element={<AppLayout />}>
      <Route path="/events" element={<p>lista</p>} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

describe('NotFoundPage', () => {
  beforeEach(() => {
    document.title = 'Telescopio';
  });

  it('TS-58: ruta inexistente', () => {
    renderWithProviders(tree, { route: '/no-existe', locale: 'es' });
    const h1 = screen.getByRole('heading', { level: 1, name: 'No encontramos esta página' });
    expect(screen.getByText('Puede que el enlace esté mal escrito o que el evento ya no esté disponible.')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(document.title).toBe('Página no encontrada · Telescopio');
    expect(h1).toHaveFocus();
  });

  it('TS-59: salidas', () => {
    const first = renderWithProviders(tree, { route: '/no-existe' });
    userEvent.click(screen.getByRole('button', { name: 'Ir a Eventos' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/events');
    first.unmount();

    renderWithProviders(tree, { route: '/no-existe' });
    const links = screen.getAllByRole('link', { name: 'Volver al inicio' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/');
  });

  it('TS-60: en inglés y restaura el título', () => {
    renderWithProviders(tree, { route: '/no-existe', locale: 'en' });
    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find this page" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Events' })).toBeInTheDocument();
    expect(document.title).toBe('Page not found · Telescopio');
    userEvent.click(screen.getByRole('button', { name: 'Go to Events' }));
    expect(document.title).toBe('Telescopio');
  });
});
