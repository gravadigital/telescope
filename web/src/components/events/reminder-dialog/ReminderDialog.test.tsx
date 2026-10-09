import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReminderDialog from './ReminderDialog';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { ApiError } from '../../../config/api';
import { EventService } from '../../../services/api';
import type { EventParticipant, ReminderType } from '../../../types';

jest.mock('../../../services/api');

const sendReminder = EventService.sendReminder as jest.Mock;
const apiErr = (status: number, code: string) => new ApiError({ status, body: { error: 'x', code } });

const p = (id: string, name: string, day: number): EventParticipant => ({
  id,
  name,
  email: `${id}@x.com`,
  role: 'participant',
  created_at: `2026-10-0${day}T10:00:00Z`,
});

const setup = (type: ReminderType, recipients: EventParticipant[]) => {
  const onClose = jest.fn();
  const onDone = jest.fn();
  renderWithProviders(
    <ReminderDialog open eventId="e-1" type={type} recipients={recipients} onClose={onClose} onDone={onDone} />
  );
  return { onClose, onDone };
};

const seven = Array.from({ length: 7 }, (_, i) => p(`u-${10 + i}`, `Persona ${10 + i}`, 3));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ReminderDialog', () => {
  it('TS-48: recordatorio de archivo', () => {
    setup('file', [p('u-5', 'Eva Torres', 4)]);
    const dialog = screen.getByRole('dialog', { name: 'Recordar que falta el archivo' });
    expect(
      within(dialog).getByText(
        '1 participante va a recibir un email y una notificación en la app con el cierre de la etapa.'
      )
    ).toBeInTheDocument();
    const list = within(dialog).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Eva Torres')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar recordatorio' })).toHaveFocus();
  });

  it('TS-49: voto con más de 5 destinatarios', () => {
    setup('vote', seven);
    expect(screen.getByRole('dialog', { name: 'Recordar que falta el ranking' })).toBeInTheDocument();
    expect(screen.getByText(/^7 participantes van a recibir/)).toBeInTheDocument();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Persona 10',
      'Persona 11',
      'Persona 12',
      'Persona 13',
      'Persona 14',
      'y 2 más',
    ]);
    expect(screen.queryByText('Persona 15')).not.toBeInTheDocument();
  });

  it('TS-50: envía el recordatorio', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    sendReminder.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { onDone } = setup('file', [p('u-5', 'Eva Torres', 4)]);
    userEvent.click(screen.getByRole('button', { name: 'Enviar recordatorio' }));
    expect(sendReminder).toHaveBeenCalledTimes(1);
    expect(sendReminder).toHaveBeenCalledWith('e-1', 'file');
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    resolve({ type: 'file', recipients_count: 1 });
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ type: 'file', recipients_count: 1 }));
  });

  it('TS-51: errores', async () => {
    sendReminder.mockRejectedValueOnce(apiErr(409, 'EVENT_PAUSED_OR_CANCELLED'));
    const { onDone, onClose } = setup('vote', seven);
    userEvent.click(screen.getByRole('button', { name: 'Enviar recordatorio' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El evento está pausado; reanúdalo para enviar recordatorios.'
    );
    sendReminder.mockRejectedValueOnce(apiErr(409, 'NO_PENDING_RECIPIENTS'));
    userEvent.click(screen.getByRole('button', { name: 'Enviar recordatorio' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No hay participantes pendientes a quienes enviar el recordatorio.'
      )
    );
    sendReminder.mockRejectedValueOnce(apiErr(500, 'REMINDER_ERROR'));
    userEvent.click(screen.getByRole('button', { name: 'Enviar recordatorio' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('No pudimos enviar el recordatorio. Intenta de nuevo.')
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('TS-52: sin destinatarios', () => {
    setup('file', []);
    expect(screen.getByText('Ya no hay pendientes.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar recordatorio' })).toBeDisabled();
  });

  it('TS-57: Escape cierra, salvo durante el envío', async () => {
    const { onClose } = setup('file', [p('u-5', 'Eva Torres', 4)]);
    userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    sendReminder.mockReturnValue(new Promise(() => undefined));
    userEvent.click(screen.getByRole('button', { name: 'Enviar recordatorio' }));
    await screen.findByRole('button', { name: 'Enviando…' });
    userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
