import fs from 'fs';
import path from 'path';
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

describe('EventHero: color de portada (S-021)', () => {
  const heroOf = (container: HTMLElement) => container.querySelector('header.ev-hero') as HTMLElement;

  it('TS-9: aplica el color de portada como variable del hero', () => {
    const { container } = render(
      <MemoryRouter>
        <EventHero title="X" coverColor="peach" />
      </MemoryRouter>
    );
    expect(heroOf(container).style.getPropertyValue('--ev-hero-bg')).toBe('var(--bg-cover-peach)');
  });

  it('TS-10: sin color no pone la variable (el CSS cae al default)', () => {
    const { container } = render(
      <MemoryRouter>
        <EventHero title="X" />
      </MemoryRouter>
    );
    expect(heroOf(container).style.getPropertyValue('--ev-hero-bg')).toBe('');
  });

  describe('EventHero.css', () => {
    const css = fs
      .readFileSync(path.join(__dirname, 'EventHero.css'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const rule = (selector: string) =>
      new RegExp(`${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

    it('TS-9: fondo del color de portada, borde y texto oscuro', () => {
      const hero = rule('.ev-hero');
      expect(hero).toMatch(/background:\s*var\(--ev-hero-bg,\s*var\(--bg-cover-default\)\)/);
      expect(hero).toMatch(/color:\s*var\(--text-primary\)/);
      expect(hero).toMatch(/border-bottom:\s*1px solid var\(--border-default\)/);
      expect(rule('.ev-hero__back')).toMatch(/color:\s*var\(--text-secondary\)/);
      expect(rule('.ev-hero__meta')).toMatch(/color:\s*var\(--text-secondary\)/);
    });

    it('TS-9: ya no usa la banda negra ni el texto inverso', () => {
      expect(css).not.toContain('--bg-band');
      expect(css).not.toContain('--text-inverse');
    });
  });
});
