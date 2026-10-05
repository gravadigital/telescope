import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import ParticipantsDialog from './ParticipantsDialog';
import { EventService } from '../../../services/api';
import type { EventParticipant } from '../../../types';

jest.mock('../../../services/api');

const getParticipants = EventService.getParticipants as jest.Mock;

const person = (id: string, name: string, day: number): EventParticipant => ({
  id,
  name,
  email: `${id}@x.com`,
  role: 'participant',
  created_at: `2026-10-0${day}T10:00:00Z`,
});

const four = [person('u-2', 'Bruno Ríos', 2), person('u-3', 'Carla Méndez', 2), person('u-4', 'Diego Sosa', 3), person('u-5', 'Eva Torres', 4)];

const onClose = jest.fn();
const renderDialog = () =>
  renderWithProviders(<ParticipantsDialog open eventId="e-1" count={4} max={20} onClose={onClose} />);

describe('ParticipantsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('TS-36: muestra los participantes en un diálogo', async () => {
    getParticipants.mockResolvedValue(four);
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Participantes · 4 / 20' });
    expect(await within(dialog).findByText('Bruno Ríos')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('row')).toHaveLength(5);
    expect(within(dialog).getAllByRole('button', { name: 'Cerrar' })).toHaveLength(2);
    expect(getParticipants).toHaveBeenCalledTimes(1);
    expect(getParticipants).toHaveBeenCalledWith('e-1');
    expect(screen.queryByText('u-2@x.com')).toBeNull();
  });

  it('TS-37: cargando muestra el esqueleto y lo anuncia', () => {
    getParticipants.mockReturnValue(new Promise(() => undefined));
    renderDialog();
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByRole('row')).toHaveLength(5);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando participantes…');
  });

  it('TS-38: vacío', async () => {
    getParticipants.mockResolvedValue([]);
    renderDialog();
    expect(await screen.findByText('Todavía no hay inscritos.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('TS-39: error y reintento', async () => {
    getParticipants.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce([four[0]]);
    renderDialog();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los participantes.');
    expect(screen.queryByRole('table')).toBeNull();
    userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Bruno Ríos')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('TS-40: cerrar con el pie y con Escape', async () => {
    getParticipants.mockResolvedValue(four);
    renderDialog();
    await screen.findByText('Bruno Ríos');
    const buttons = screen.getAllByRole('button', { name: 'Cerrar' });
    userEvent.click(buttons[buttons.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
    userEvent.keyboard('{esc}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
