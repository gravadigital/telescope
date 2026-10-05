import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import ParticipantsTable from './ParticipantsTable';

describe('ParticipantsTable', () => {
  it('TS-35: tabla pública sin email', () => {
    renderWithProviders(
      <ParticipantsTable
        rows={[
          { id: 'u-2', name: 'Bruno Ríos', email: 'b@x.com', role: 'participant', created_at: '2026-10-02T10:00:00Z' },
        ]}
        caption="Participantes · 4 / 20"
      />
    );
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Inscripción' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByText('Bruno Ríos')).toBeInTheDocument();
    expect(screen.getByText('2 oct 2026')).toBeInTheDocument();
    expect(screen.queryByText('b@x.com')).toBeNull();
    const caption = screen.getByText('Participantes · 4 / 20');
    expect(caption.tagName).toBe('CAPTION');
    expect(caption).toHaveClass('ui-visually-hidden');
  });

  it('muestra 4 filas de esqueleto mientras carga', () => {
    renderWithProviders(<ParticipantsTable rows={[]} caption="Participantes" loading />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByRole('row')).toHaveLength(5);
  });
});
