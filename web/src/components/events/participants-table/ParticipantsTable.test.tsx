import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import ParticipantsTable from './ParticipantsTable';
import type { Attachment, EventParticipant } from '../../../types';

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

const p = (id: string, name: string, day: number): EventParticipant => ({
  id,
  name,
  email: `${name.split(' ')[0].toLowerCase()}@x.com`,
  role: 'participant',
  created_at: `2026-10-0${day}T10:00:00Z`,
});

const participants: EventParticipant[] = [p('u-2', 'Bruno Ríos', 2), p('u-3', 'Carla Méndez', 3), p('u-5', 'Eva Torres', 3)];

const att = (id: string, participantId: string, name: string): Attachment => ({
  id,
  event_id: 'e-1',
  participant_id: participantId,
  original_name: name,
  stored_name: `${id}.bin`,
  file_size: 1000,
  mime_type: 'image/png',
  uploaded_at: '2026-10-03T10:00:00Z',
});

const attachments: Attachment[] = [att('a-2', 'u-2', 'sol.png'), att('a-3', 'u-3', 'luna.pdf')];

const rowOf = (name: string): HTMLElement => {
  const row = screen.getAllByRole('row').find((r) => within(r).queryByText(name));
  if (!row) throw new Error(`no row for ${name}`);
  return row;
};

describe('ParticipantsTable · organizador', () => {
  it('TS-23: columnas de Participación, descarga y "Falta archivo"', () => {
    renderWithProviders(
      <ParticipantsTable
        variant="organizer"
        stage="participation"
        rows={participants}
        attachments={attachments}
        caption="Participantes del evento"
        onDownload={jest.fn()}
      />
    );
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Nombre', 'Email', 'Archivo', 'Inscripción']);
    const bruno = within(rowOf('Bruno Ríos'));
    expect(bruno.getByText('bruno@x.com')).toBeInTheDocument();
    const download = bruno.getByRole('button', { name: 'Descargar sol.png' });
    expect(download).toHaveTextContent('sol.png');
    expect(bruno.getByText('2 oct 2026')).toBeInTheDocument();
    expect(within(rowOf('Eva Torres')).getByText('Falta archivo')).toBeInTheDocument();
    expect(within(rowOf('Eva Torres')).queryByRole('button')).toBeNull();
  });

  it('TS-24: descarga con el attachment de la fila', () => {
    const onDownload = jest.fn();
    renderWithProviders(
      <ParticipantsTable
        variant="organizer"
        stage="participation"
        rows={participants}
        attachments={attachments}
        caption="Participantes del evento"
        onDownload={onDownload}
      />
    );
    userEvent.click(screen.getByRole('button', { name: 'Descargar sol.png' }));
    expect(onDownload).toHaveBeenCalledWith(attachments[0]);
  });

  it('TS-25: columna Voto en Votación y "—" sin estadísticas', () => {
    const rows = [...participants, p('u-6', 'Fede Gil', 4)];
    const votingStatus = { 'u-2': true, 'u-3': false, 'u-5': false };
    const { unmount } = renderWithProviders(
      <ParticipantsTable
        variant="organizer"
        stage="voting"
        rows={rows}
        attachments={attachments}
        votingStatus={votingStatus}
        caption="Participantes del evento"
      />
    );
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Nombre', 'Email', 'Archivo', 'Voto']);
    expect(within(rowOf('Bruno Ríos')).getByText('✓ Enviado')).toBeInTheDocument();
    expect(within(rowOf('Carla Méndez')).getByText('Pendiente')).toBeInTheDocument();
    expect(within(rowOf('Fede Gil')).getByText('No participa')).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <ParticipantsTable
        variant="organizer"
        stage="voting"
        rows={rows}
        attachments={attachments}
        votingStatus={votingStatus}
        voteUnavailable
        caption="Participantes del evento"
      />
    );
    expect(screen.queryByText('✓ Enviado')).toBeNull();
    expect(screen.queryByText('Pendiente')).toBeNull();
    for (const name of ['Bruno Ríos', 'Carla Méndez', 'Eva Torres', 'Fede Gil']) {
      const cells = within(rowOf(name)).getAllByRole('cell');
      expect(cells[cells.length - 1]).toHaveTextContent(/^—$/);
    }
  });

  it('TS-26: la variante pública no muestra Email ni Archivo', () => {
    renderWithProviders(<ParticipantsTable rows={participants} caption="x" />);
    expect(screen.queryByRole('columnheader', { name: 'Email' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Archivo' })).toBeNull();
    expect(screen.queryByText('bruno@x.com')).toBeNull();
  });
});
