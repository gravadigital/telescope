import fs from 'fs';
import path from 'path';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventsTable from './EventsTable';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { listItem, myEvent } from '../../../test-utils/eventFixtures';

const publicRows = [
  listItem({ id: 'e-1', name: 'Concurso de afiches', participant_ids: ['u-1'] }),
  listItem({ id: 'e-2', name: 'Taller de cerámica', author_id: 'u-1', max_participants: 10, participants_count: 5 }),
];

describe('EventsTable', () => {
  it('TS-20: variante public con sesión', () => {
    renderWithProviders(
      <EventsTable
        variant="public"
        caption="Eventos"
        rows={publicRows}
        userId="u-1"
        myEventsById={{ 'e-1': myEvent({ id: 'e-1' }) }}
      />
    );
    ['Evento', 'Etapa', 'Participantes', 'Creado'].forEach((h) =>
      expect(screen.getByRole('columnheader', { name: h })).toBeInTheDocument()
    );
    const row1 = screen.getByText('Concurso de afiches').closest('tr') as HTMLElement;
    expect(within(row1).getByText('Diseña el afiche del festival')).toBeInTheDocument();
    expect(within(row1).getByText('Inscripción abierta')).toBeInTheDocument();
    const bar = within(row1).getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '12');
    expect(bar).toHaveAttribute('aria-valuemax', '20');
    expect(within(row1).getByText('12 / 20')).toBeInTheDocument();
    expect(within(row1).getByText('28 sept 2026')).toBeInTheDocument();
    expect(within(row1).getAllByRole('button')).toHaveLength(1);
    expect(within(row1).getByRole('button', { name: 'Subir archivo Concurso de afiches' })).toHaveTextContent('Subir archivo');
    const row2 = screen.getByText('Taller de cerámica').closest('tr') as HTMLElement;
    expect(within(row2).getByRole('button', { name: 'Gestionar Taller de cerámica' })).toHaveTextContent('Gestionar');
  });

  it('TS-21: sin sesión', () => {
    renderWithProviders(
      <EventsTable
        variant="public"
        caption="Eventos"
        userId={null}
        rows={[
          listItem({ id: 'e-1' }),
          listItem({ id: 'e-4', name: 'Fotografía urbana', stage: 'results', max_participants: null, participants_count: 9 }),
        ]}
      />
    );
    const row1 = screen.getByText('Concurso de afiches').closest('tr') as HTMLElement;
    expect(within(row1).getByRole('button', { name: 'Participar Concurso de afiches' })).toBeInTheDocument();
    expect(within(row1).getByText('Requiere cuenta')).toBeInTheDocument();
    const row2 = screen.getByText('Fotografía urbana').closest('tr') as HTMLElement;
    expect(within(row2).getByText('Finalizado')).toBeInTheDocument();
    expect(within(row2).getByText('9 inscritos')).toBeInTheDocument();
    expect(within(row2).queryByRole('progressbar')).toBeNull();
    expect(within(row2).getByRole('button', { name: 'Ver resultados Fotografía urbana' })).toBeInTheDocument();
    expect(within(row2).getByText('Público')).toBeInTheDocument();
  });

  it('TS-22: la acción navega', () => {
    const { unmount } = renderWithProviders(
      <EventsTable variant="public" caption="Eventos" rows={publicRows} userId="u-1" myEventsById={{ 'e-1': myEvent({ id: 'e-1' }) }} />
    );
    userEvent.click(screen.getByRole('button', { name: 'Gestionar Taller de cerámica' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/events/e-2/manage');
    unmount();
    renderWithProviders(
      <EventsTable variant="public" caption="Eventos" rows={publicRows} userId="u-1" myEventsById={{ 'e-1': myEvent({ id: 'e-1' }) }} />
    );
    userEvent.click(screen.getByRole('button', { name: 'Subir archivo Concurso de afiches' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/events/e-1');
  });

  it('TS-23: variantes organizer y participant', () => {
    const { unmount } = renderWithProviders(
      <EventsTable
        variant="organizer"
        caption="Organizo"
        userId="u-1"
        rows={[myEvent({ id: 'e-5', name: 'Feria de ciencias', role: 'creator', stage: 'creation', my_status: null, participants_count: 0, max_participants: 30, participation_estimated_end_date: null, author_id: 'u-1' })]}
      />
    );
    ['Evento', 'Etapa', 'Participantes', 'Cierre'].forEach((h) =>
      expect(screen.getByRole('columnheader', { name: h })).toBeInTheDocument()
    );
    expect(screen.getByText('Borrador · no visible')).toBeInTheDocument();
    expect(screen.getByText('0 / 30')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gestionar Feria de ciencias' })).toBeInTheDocument();
    unmount();

    renderWithProviders(
      <EventsTable
        variant="participant"
        caption="Participo"
        userId="u-1"
        rows={[myEvent({ id: 'e-6', stage: 'voting', voting_estimated_end_date: '2026-10-12', my_status: { has_attachment: true, has_assignment: true, ranking_submitted: false, result_position: null, result_total: null } })]}
      />
    );
    ['Evento', 'Etapa', 'Mi estado', 'Cierre'].forEach((h) =>
      expect(screen.getByRole('columnheader', { name: h })).toBeInTheDocument()
    );
    expect(screen.getByText('Te toca votar')).toBeInTheDocument();
    expect(screen.getByText('12 oct 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Votar/ })).toBeInTheDocument();
  });

  it('TS-24: CSS sin max-width en @media', () => {
    const css = fs.readFileSync(path.join(__dirname, 'EventsTable.css'), 'utf8');
    expect(css).not.toMatch(/@media[^{]*max-width/);
  });
});
