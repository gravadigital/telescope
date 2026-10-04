import { render, screen, within } from '@testing-library/react';
import ProgressChecklist from './ProgressChecklist';

describe('ProgressChecklist', () => {
  it('TS-66: pasos numerados, ✓ en el completado y paso actual', () => {
    render(
      <ProgressChecklist
        title="Tu progreso"
        doneLabel="completado"
        steps={[
          { label: 'Inscripción', detail: 'Confirmada 1 oct', status: 'done' },
          { label: 'Subir propuesta', detail: 'Pendiente · cierra en 3 días', status: 'current' },
          { label: 'Votar', status: 'pending' },
          { label: 'Ver resultados', status: 'pending' },
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: 'Tu progreso' })).toBeInTheDocument();
    expect(screen.getByRole('list').tagName).toBe('OL');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(within(items[0]).getByText('completado')).toBeInTheDocument();
    expect(items[0].querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(within(items[1]).getByText('2')).toBeInTheDocument();
    expect(within(items[2]).getByText('3')).toBeInTheDocument();
    expect(within(items[3]).getByText('4')).toBeInTheDocument();
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Confirmada 1 oct')).toBeInTheDocument();
  });
});
