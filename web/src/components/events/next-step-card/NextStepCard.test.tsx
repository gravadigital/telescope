import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NextStepCard from './NextStepCard';

describe('NextStepCard', () => {
  it('TS-64: título, checklist, consecuencia asociada y acciones', () => {
    const p = jest.fn();
    const s = jest.fn();
    render(
      <NextStepCard
        eyebrow="PRÓXIMO PASO"
        title="Pasar a votación"
        description="Se cierra la inscripción…"
        checklist={[
          { label: 'Nombre y descripción', done: true },
          { label: 'Fecha de cierre', done: false },
        ]}
        doneLabel="listo"
        pendingLabel="pendiente"
        consequence="1 participante todavía no subió su archivo y no va a evaluar ni ser evaluado."
        primaryAction={{ label: 'Configurar y abrir votación →', onClick: p }}
        secondaryAction={{ label: 'Pausar evento', onClick: s }}
      >
        <p>extra</p>
      </NextStepCard>
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Pasar a votación' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('listo');
    expect(items[1]).toHaveTextContent('pendiente');

    const primary = screen.getByRole('button', { name: 'Configurar y abrir votación →' });
    const callout = screen.getByText(/1 participante todavía/).closest('[id]') as HTMLElement;
    expect(primary).toHaveAttribute('aria-describedby', callout.id);
    userEvent.click(primary);
    userEvent.click(screen.getByRole('button', { name: 'Pausar evento' }));
    expect(p).toHaveBeenCalledTimes(1);
    expect(s).toHaveBeenCalledTimes(1);
    expect(screen.getByText('extra')).toBeInTheDocument();
  });

  it('TS-65: deshabilitado y variante secundaria', () => {
    const { rerender } = render(
      <NextStepCard title="Paso" primaryAction={{ label: 'Seguir', onClick: jest.fn(), disabled: true }} />
    );
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeDisabled();

    rerender(
      <NextStepCard
        title="Paso"
        primaryVariant="secondary"
        primaryAction={{ label: 'Seguir', onClick: jest.fn() }}
      />
    );
    expect(screen.getByRole('button', { name: 'Seguir' })).toHaveClass('ui-button--secondary');
  });

  it('TS-67 (NextStepCard): el primario ocupa el ancho completo en mobile', () => {
    const css = fs.readFileSync(path.join(__dirname, 'NextStepCard.css'), 'utf8');
    const idx = css.indexOf('@media (min-width: 768px)');
    expect(css.slice(0, idx)).toMatch(/\.ev-next-step__primary\s*\{[^}]*width:\s*100%/);
    expect(css.slice(idx)).toMatch(/\.ev-next-step__primary\s*\{[^}]*width:\s*auto/);
  });
});
