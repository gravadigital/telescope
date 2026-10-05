import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditEventDialog from './EditEventDialog';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { ApiError } from '../../../config/api';
import { EventService } from '../../../services/api';
import type { Event } from '../../../types';

jest.mock('../../../services/api');

const updateEvent = EventService.updateEvent as jest.Mock;
const apiErr = (status: number, code: string, extra: Record<string, unknown> = {}) =>
  new ApiError({ status, body: { error: 'x', code, ...extra } });

const baseEvent: Event = {
  id: 'e-1',
  title: 'Concurso de afiches',
  description: 'Diseña el afiche del festival',
  organizer: 'Club de Diseño',
  max_participants: 20,
  participant_ids: Array.from({ length: 12 }, (_, i) => `p-${i}`),
  stage: 'participation',
  date: '2026-10-06',
};

const setup = (event: Event = baseEvent) => {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  renderWithProviders(<EditEventDialog open event={event} onClose={onClose} onSaved={onSaved} />);
  return { onClose, onSaved };
};

const nameField = () => screen.getByLabelText(/^Nombre del evento/) as HTMLInputElement;
const descField = () => screen.getByLabelText(/^Descripción/) as HTMLTextAreaElement;
const organizerField = () => screen.getByLabelText(/^Organizador/) as HTMLInputElement;
const spin = () => screen.getByRole('spinbutton', { name: /Cupo/ }) as HTMLInputElement;
const save = () => userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
const replace = (el: HTMLElement, value: string) => {
  userEvent.clear(el);
  userEvent.type(el, value);
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EditEventDialog', () => {
  it('TS-44: precarga los datos', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Editar datos del evento' })).toBeInTheDocument();
    expect(nameField()).toHaveValue('Concurso de afiches');
    expect(nameField()).toHaveFocus();
    expect(descField()).toHaveValue('Diseña el afiche del festival');
    expect(organizerField()).toHaveValue('Club de Diseño');
    expect(spin()).toHaveValue(20);
  });

  it('TS-45: mínimo de cupo por inscritos', () => {
    setup();
    fireEvent.change(spin(), { target: { value: '12' } });
    expect(screen.getByText('Mínimo 12: ya hay 12 inscritos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restar uno al cupo' })).toBeDisabled();
  });

  it('TS-46: sin inscritos', () => {
    setup({ ...baseEvent, participant_ids: [] });
    expect(screen.getByText('Entre 1 y 100')).toBeInTheDocument();
    fireEvent.change(spin(), { target: { value: '1' } });
    expect(screen.getByRole('button', { name: 'Restar uno al cupo' })).toBeDisabled();
  });

  it('TS-47: guarda solo lo cambiado', async () => {
    const updated = { ...baseEvent, organizer: 'Club de Fotografía' };
    updateEvent.mockResolvedValue(updated);
    const { onClose, onSaved } = setup();
    replace(organizerField(), 'Club de Fotografía');
    save();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
    expect(updateEvent).toHaveBeenCalledWith('e-1', { organizer: 'Club de Fotografía' });
    expect(onClose).toHaveBeenCalled();
  });

  it('TS-48: sin cambios no llama a la api', () => {
    const { onClose, onSaved } = setup();
    save();
    expect(updateEvent).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('TS-49: validación local', () => {
    setup();
    replace(nameField(), 'ab');
    save();
    expect(screen.getByText('El nombre tiene que tener al menos 3 caracteres.')).toBeInTheDocument();
    expect(nameField()).toHaveFocus();
    expect(updateEvent).not.toHaveBeenCalled();
  });

  it('TS-50: la api rechaza el cupo', async () => {
    updateEvent.mockRejectedValue(apiErr(400, 'MAX_PARTICIPANTS_BELOW_REGISTERED', { current_count: 14 }));
    const { onClose } = setup();
    fireEvent.change(spin(), { target: { value: '12' } });
    save();
    expect(await screen.findByText('El cupo no puede ser menor a los 14 inscritos.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: 'Sumar uno al cupo' }));
    expect(spin()).toHaveValue(14);
    expect(screen.getByRole('button', { name: 'Restar uno al cupo' })).toBeDisabled();
  });

  it('TS-51: etapa bloqueada', async () => {
    updateEvent.mockRejectedValue(apiErr(409, 'INVALID_UPDATE_STAGE', { current_stage: 'voting' }));
    setup();
    replace(organizerField(), 'Otro');
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El evento ya pasó a votación y sus datos no se pueden editar.'
    );
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(organizerField()).toHaveValue('Otro');
  });

  it('TS-52: nombre duplicado', async () => {
    updateEvent.mockRejectedValue(apiErr(409, 'DUPLICATE_EVENT_NAME'));
    setup();
    replace(nameField(), 'Otro evento');
    save();
    expect(await screen.findByText('Ya existe un evento con este nombre. Elige otro.')).toBeInTheDocument();
  });

  it('TS-53: falla genérica y de red', async () => {
    updateEvent.mockRejectedValueOnce(apiErr(500, 'DB_UPDATE_ERROR'));
    const { onClose } = setup();
    replace(organizerField(), 'Otro');
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar los cambios. Inténtalo de nuevo.'
    );
    updateEvent.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    save();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('No pudimos conectar con el servidor.')
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('TS-54: guardando no se puede cerrar', () => {
    updateEvent.mockReturnValue(new Promise(() => undefined));
    const { onClose } = setup();
    replace(organizerField(), 'Otro');
    save();
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    userEvent.keyboard('{esc}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('TS-55: descartar con cambios', () => {
    const { onClose } = setup();
    replace(descField(), 'Una descripción distinta');
    userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('¿Descartar los cambios?')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(descField()).toHaveValue('Una descripción distinta');
    userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(updateEvent).not.toHaveBeenCalled();
  });

  it('TS-56: Escape y × sin cambios cierran directo', () => {
    const first = setup();
    userEvent.keyboard('{esc}');
    expect(first.onClose).toHaveBeenCalledTimes(1);
  });

  it('TS-56: × sin cambios cierra directo', () => {
    const { onClose } = setup();
    userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('¿Descartar los cambios?')).toBeNull();
  });
});
