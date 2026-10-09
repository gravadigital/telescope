import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditDeadlineDialog from './EditDeadlineDialog';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { ApiError } from '../../../config/api';
import { I18nProvider } from '../../../i18n/I18nProvider';
import { EventService } from '../../../services/api';

jest.mock('../../../services/api');

const updateEstimatedEndDate = EventService.updateEstimatedEndDate as jest.Mock;

const setup = (stage: 'participation' | 'voting' = 'participation') => {
  const onClose = jest.fn();
  const onDone = jest.fn();
  renderWithProviders(
    <EditDeadlineDialog
      open
      eventId="e-1"
      stage={stage}
      currentDate="2026-10-10"
      onClose={onClose}
      onDone={onDone}
    />
  );
  return { onClose, onDone };
};

const confirmButton = () => screen.getByRole('button', { name: 'Posponer cierre' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EditDeadlineDialog', () => {
  it('TS-53: pospone una semana sobre el cierre actual', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    updateEstimatedEndDate.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { onDone } = setup();
    expect(screen.getByRole('dialog', { name: 'Posponer el cierre' })).toBeInTheDocument();
    expect(screen.getByText('Participación')).toBeInTheDocument();
    expect(screen.getByText('Cierre actual: 10 oct 2026')).toBeInTheDocument();
    expect(screen.getByText('Nuevo cierre')).toBeInTheDocument();
    expect(screen.getByText('sábado, 17 de octubre de 2026')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '+1 semana' })).toHaveAttribute('aria-checked', 'true');
    userEvent.click(screen.getByRole('radio', { name: '+3 días' }));
    expect(screen.getByText('martes, 13 de octubre de 2026')).toBeInTheDocument();
    userEvent.click(screen.getByRole('radio', { name: '+1 semana' }));
    userEvent.click(confirmButton());
    expect(updateEstimatedEndDate).toHaveBeenCalledTimes(1);
    expect(updateEstimatedEndDate).toHaveBeenCalledWith('e-1', 'participation', '2026-10-17');
    expect(screen.getByRole('button', { name: /Guardando…/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    resolve({ previousDate: '2026-10-10', newDate: '2026-10-17' });
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('TS-53: atajos +2 semanas y eyebrow de Votación', () => {
    setup('voting');
    expect(screen.getByText('Votación')).toBeInTheDocument();
    userEvent.click(screen.getByRole('radio', { name: '+2 semanas' }));
    expect(screen.getByText('sábado, 24 de octubre de 2026')).toBeInTheDocument();
    userEvent.click(confirmButton());
    expect(updateEstimatedEndDate).toHaveBeenCalledWith('e-1', 'voting', '2026-10-24');
  });

  it('TS-54: rechaza adelantar el cierre', () => {
    setup();
    userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    const input = screen.getByLabelText('Nuevo cierre', { selector: 'input' });
    expect(input).not.toHaveAttribute('min');
    fireEvent.change(input, { target: { value: '2026-10-08' } });
    expect(
      screen.getByText(
        'El cierre solo se puede posponer. Elige una fecha posterior al 10 oct 2026.'
      )
    ).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    userEvent.click(confirmButton());
    expect(updateEstimatedEndDate).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '2026-10-10' } });
    expect(confirmButton()).toBeDisabled();
  });

  it('TS-55: error de la api dentro del diálogo', async () => {
    updateEstimatedEndDate.mockRejectedValueOnce(
      new ApiError({ status: 400, body: { error: 'x', code: 'CANNOT_ADVANCE_DEADLINE' } })
    );
    const { onDone } = setup();
    userEvent.click(confirmButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Solo puedes posponer la fecha estimada de cierre, no adelantarla.'
    );
    expect(screen.getByRole('dialog', { name: 'Posponer el cierre' })).toBeInTheDocument();
    expect(screen.getByText('sábado, 17 de octubre de 2026')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();

    updateEstimatedEndDate.mockRejectedValueOnce(
      new ApiError({ status: 500, body: { error: 'x', code: 'DB_UPDATE_ERROR' } })
    );
    userEvent.click(confirmButton());
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No pudimos cambiar el cierre. Intenta de nuevo.'
      )
    );
  });

  it('TS-56: ayuda con email y notificación', () => {
    setup();
    expect(
      screen.getByText(
        'El cierre solo se puede posponer. Los participantes reciben un email y una notificación con la nueva fecha.'
      )
    ).toBeInTheDocument();
  });

  it('TS-57: Escape cierra; con la llamada en curso no', () => {
    updateEstimatedEndDate.mockReturnValue(new Promise(() => undefined));
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    userEvent.click(confirmButton());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('al volver a abrir reinicia la fecha y los errores', () => {
    const props = {
      eventId: 'e-1',
      stage: 'participation' as const,
      currentDate: '2026-10-10',
      onClose: jest.fn(),
      onDone: jest.fn(),
    };
    const wrap = (open: boolean) => (
      <I18nProvider initialLocale="es">
        <EditDeadlineDialog open={open} {...props} />
      </I18nProvider>
    );
    const { rerender } = render(wrap(true));
    userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    const input = screen.getByLabelText('Nuevo cierre', { selector: 'input' });
    fireEvent.change(input, { target: { value: '2026-10-08' } });
    expect(confirmButton()).toBeDisabled();
    rerender(wrap(false));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(wrap(true));
    expect(screen.getByText('sábado, 17 de octubre de 2026')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '+1 semana' })).toHaveAttribute('aria-checked', 'true');
    expect(confirmButton()).toBeEnabled();
  });
});
