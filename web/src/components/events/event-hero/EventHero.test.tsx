import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventHero from './EventHero';
import StatusPill from '../../ui/status-pill/StatusPill';
import Button from '../../ui/button/Button';

describe('EventHero', () => {
  it('TS-60: volver, pill, h1, meta y acciones', () => {
    render(
      <MemoryRouter>
        <EventHero
          back={{ label: '← Eventos', to: '/events' }}
          pills={<StatusPill tone="onBand">Inscripción abierta · cierra en 3 días</StatusPill>}
          title="Club de Fotografía"
          meta="Organiza Ana · 4 de 20 participantes"
          actions={<Button variant="onBand">Compartir</Button>}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: '← Eventos' })).toHaveAttribute('href', '/events');
    expect(screen.getByRole('heading', { level: 1, name: 'Club de Fotografía' })).toBeInTheDocument();
    expect(screen.getByText('Organiza Ana · 4 de 20 participantes')).toBeInTheDocument();
    expect(screen.getByText('Inscripción abierta · cierra en 3 días')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compartir' })).toBeInTheDocument();
  });

  it('funciona solo con el título', () => {
    render(
      <MemoryRouter>
        <EventHero title="Sin permiso" />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Sin permiso' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
