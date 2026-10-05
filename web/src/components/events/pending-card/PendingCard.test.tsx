import fs from 'fs';
import path from 'path';
import { screen } from '@testing-library/react';
import PendingCard from './PendingCard';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { myEvent } from '../../../test-utils/eventFixtures';

describe('PendingCard', () => {
  it('TS-17: archivo', () => {
    renderWithProviders(
      <PendingCard task={{ kind: 'upload', event: myEvent({ id: 'e-1', name: 'Concurso de afiches' }), deadline: '2026-10-10' }} />
    );
    expect(screen.getByRole('heading', { name: 'Falta subir tu archivo' })).toBeInTheDocument();
    expect(screen.getByText('Concurso de afiches')).toBeInTheDocument();
    expect(screen.getByText('Cierra el 10 oct 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Subir archivo' })).toHaveAttribute('href', '/events/e-1');
  });

  it('TS-18: voto y resultados', () => {
    const { unmount } = renderWithProviders(
      <PendingCard task={{ kind: 'vote', event: myEvent({ id: 'e-2', name: 'Hackatón verde', stage: 'voting' }), deadline: '2026-10-12' }} />
    );
    expect(screen.getByRole('heading', { name: 'Te toca votar' })).toBeInTheDocument();
    expect(screen.getByText('Cierra el 12 oct 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Votar' })).toHaveAttribute('href', '/events/e-2');
    unmount();
    renderWithProviders(
      <PendingCard task={{ kind: 'results', event: myEvent({ id: 'e-3', name: 'Fotografía urbana', stage: 'results' }), deadline: null, position: 2, total: 9 }} />
    );
    expect(screen.getByRole('heading', { name: 'Resultados publicados' })).toBeInTheDocument();
    expect(screen.getByText('Quedaste en el puesto 2 de 9')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ranking' })).toHaveAttribute('href', '/events/e-3');
    expect(screen.queryByText(/Cierra el/)).toBeNull();
  });

  it('TS-19: sin cierre', () => {
    renderWithProviders(<PendingCard task={{ kind: 'upload', event: myEvent(), deadline: null }} />);
    expect(screen.queryByText(/Cierra el/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Falta subir tu archivo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Subir archivo' })).toBeInTheDocument();
  });

  it('TS-24: el cierre no se oculta en mobile', () => {
    const css = fs.readFileSync(path.join(__dirname, 'PendingCard.css'), 'utf8');
    const outside = css.replace(/@media[^{]*\{[\s\S]*\}\s*$/, '');
    expect(outside).not.toMatch(/display:\s*none/);
    expect(css).not.toMatch(/@media[^{]*max-width/);
  });
});
