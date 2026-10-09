import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OpenRegistrationDialog from './OpenRegistrationDialog';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { ApiError } from '../../../config/api';
import { I18nProvider } from '../../../i18n/I18nProvider';
import { EventService } from '../../../services/api';

jest.mock('../../../services/api');

const updateEventStage = EventService.updateEventStage as jest.Mock;

const setup = (open = true) => {
  const onClose = jest.fn();
  const onDone = jest.fn();
  const view = renderWithProviders(
    <OpenRegistrationDialog
      open={open}
      eventId="e-1"
      today="2026-10-05"
      onClose={onClose}
      onDone={onDone}
    />
  );
  return { onClose, onDone, ...view };
};

const confirmButton = () => screen.getByRole('button', { name: 'Abrir inscripción' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('OpenRegistrationDialog', () => {
  it('TS-30: por defecto muestra hoy + 1 semana', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Abrir inscripción' })).toBeInTheDocument();
    expect(screen.getByText('Creación → Participación')).toBeInTheDocument();
    expect(
      screen.getByText(
        'El evento pasa a ser público. Las personas van a poder inscribirse y subir su archivo.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('¿Hasta cuándo se pueden inscribir?')).toBeInTheDocument();
    expect(screen.getByText('lunes, 12 de octubre de 2026')).toBeInTheDocument();
    const week = screen.getByRole('radio', { name: '1 semana' });
    expect(week).toHaveAttribute('aria-checked', 'true');
    expect(week).toHaveFocus();
    expect(screen.getByRole('radio', { name: '3 días' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '2 semanas' })).toBeInTheDocument();
    expect(
      screen.getByText('Se muestra a los participantes. Puedes posponerla después.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
    expect(confirmButton()).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('TS-31: confirma con la fecha elegida', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    updateEventStage.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { onDone } = setup();
    userEvent.click(screen.getByRole('radio', { name: '2 semanas' }));
    expect(screen.getByText('lunes, 19 de octubre de 2026')).toBeInTheDocument();
    userEvent.click(confirmButton());
    expect(updateEventStage).toHaveBeenCalledTimes(1);
    expect(updateEventStage).toHaveBeenCalledWith('e-1', 'participation', '2026-10-19');
    expect(screen.getByRole('button', { name: /Abriendo…/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(onDone).not.toHaveBeenCalled();
    resolve({ stage: 'participation' });
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('TS-32: rechaza una fecha no posterior a hoy', () => {
    setup();
    userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    const input = screen.getByLabelText('¿Hasta cuándo se pueden inscribir?', { selector: 'input' });
    expect(input).not.toHaveAttribute('min');
    fireEvent.change(input, { target: { value: '2026-10-05' } });
    expect(screen.getByText('Elige una fecha posterior a hoy.')).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    userEvent.click(confirmButton());
    expect(updateEventStage).not.toHaveBeenCalled();
  });

  it('TS-33: error de la api dentro del diálogo, con la fecha conservada', async () => {
    updateEventStage.mockRejectedValue(
      new ApiError({ status: 500, body: { error: 'x', code: 'DB_UPDATE_ERROR' } })
    );
    const { onDone } = setup();
    userEvent.click(screen.getByRole('radio', { name: '3 días' }));
    userEvent.click(confirmButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos abrir la inscripción. Intenta de nuevo.'
    );
    expect(screen.getByRole('dialog', { name: 'Abrir inscripción' })).toBeInTheDocument();
    expect(screen.getByText('jueves, 8 de octubre de 2026')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '3 días' })).toHaveAttribute('aria-checked', 'true');
    expect(confirmButton()).toBeEnabled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('TS-33: un código admitido usa su mensaje; red usa errors.network', async () => {
    updateEventStage.mockRejectedValueOnce(
      new ApiError({ status: 400, body: { error: 'x', code: 'INVALID_TRANSITION' } })
    );
    setup();
    userEvent.click(confirmButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No puedes pasar a esa etapa desde la actual.'
    );
    updateEventStage.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    userEvent.click(confirmButton());
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
      )
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('Failed to fetch');
  });

  it('TS-57: Escape cierra; con la llamada en curso no', () => {
    updateEventStage.mockReturnValue(new Promise(() => undefined));
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    userEvent.click(confirmButton());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('al volver a abrir reinicia la fecha y los errores', async () => {
    updateEventStage.mockRejectedValue(
      new ApiError({ status: 500, body: { error: 'x', code: 'DB_UPDATE_ERROR' } })
    );
    const onClose = jest.fn();
    const onDone = jest.fn();
    const props = { eventId: 'e-1', today: '2026-10-05', onClose, onDone };
    const wrap = (open: boolean) => (
      <I18nProvider initialLocale="es">
        <OpenRegistrationDialog open={open} {...props} />
      </I18nProvider>
    );
    const { rerender } = render(wrap(true));
    userEvent.click(screen.getByRole('radio', { name: '2 semanas' }));
    userEvent.click(confirmButton());
    await screen.findByRole('alert');
    rerender(wrap(false));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(wrap(true));
    expect(screen.getByText('lunes, 12 de octubre de 2026')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cerrado no renderiza nada', () => {
    setup(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
