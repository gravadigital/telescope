import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OpenVotingDialog from './OpenVotingDialog';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { ApiError } from '../../../config/api';
import type { VotingConfigPreview } from '../../../domain';
import { DistributedVotingService, EventService } from '../../../services/api';

jest.mock('../../../services/api');

const getVotingConfigPreview = DistributedVotingService.getVotingConfigPreview as jest.Mock;
const updateEventStage = EventService.updateEventStage as jest.Mock;

const preview: VotingConfigPreview = {
  participants_count: 4,
  participants_with_proposal: 3,
  can_open_voting: true,
  min_m: 1,
  max_m: 2,
  recommended_m: 2,
  defaults: { quality_good_threshold: 0.6, quality_bad_threshold: 0.3, adjustment_magnitude: 3 },
};

const setup = (open = true) => {
  const onClose = jest.fn();
  const onDone = jest.fn();
  const view = renderWithProviders(
    <OpenVotingDialog open={open} eventId="e-1" today="2026-10-05" onClose={onClose} onDone={onDone} />
  );
  return { onClose, onDone, ...view };
};

const confirmButton = () => screen.getByRole('button', { name: 'Abrir votación y asignar' });
/** StatTile con su etiqueta y valor (texto completo de la tarjeta). */
const tile = (label: string, value: number) =>
  screen.getByText(
    (_, el) => Boolean(el?.classList.contains('ui-stat-tile')) && el?.textContent === `${label}${value}`
  );
const perReviewer = () => screen.getByRole('spinbutton', { name: 'Propuestas por evaluador' });
const openAdvanced = () => userEvent.click(screen.getByText('Ajustes avanzados de calidad'));
const clickTimes = (name: string, times: number) => {
  for (let i = 0; i < times; i += 1) userEvent.click(screen.getByRole('button', { name }));
};

beforeEach(() => {
  jest.clearAllMocks();
  getVotingConfigPreview.mockResolvedValue(preview);
});

describe('OpenVotingDialog', () => {
  it('TS-34: mientras carga el preview muestra el estado y no deja confirmar', () => {
    getVotingConfigPreview.mockReturnValue(new Promise(() => undefined));
    setup();
    expect(getVotingConfigPreview).toHaveBeenCalledWith('e-1');
    expect(screen.getByRole('dialog', { name: 'Abrir votación' })).toBeInTheDocument();
    expect(screen.getByText('Participación → Votación')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Calculando el reparto…');
    expect(confirmButton()).toBeDisabled();
  });

  it('TS-35: resumen, campos y avanzados cerrados', async () => {
    setup();
    expect(await screen.findByText('Propuestas')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Se cierra la inscripción y el sistema reparte las propuestas entre los participantes que subieron la suya. Nadie evalúa su propio archivo.'
      )
    ).toBeInTheDocument();
    expect(tile('Propuestas', 3)).toBeInTheDocument();
    expect(tile('Evaluadores', 3)).toBeInTheDocument();
    expect(within(screen.getByRole('status')).getByText('Evaluaciones por archivo')).toBeInTheDocument();
    expect(tile('Evaluaciones por archivo', 2)).toBeInTheDocument();
    expect(
      screen.getByText('1 inscripto no subió su propuesta: no va a evaluar ni ser evaluado.')
    ).toBeInTheDocument();
    expect(screen.getByText('Cierre de la votación')).toBeInTheDocument();
    expect(screen.getByText('lunes, 12 de octubre de 2026')).toBeInTheDocument();
    const week = screen.getByRole('radio', { name: '1 semana' });
    expect(week).toHaveAttribute('aria-checked', 'true');
    await waitFor(() => expect(week).toHaveFocus());
    expect(perReviewer()).toHaveValue(2);
    expect(screen.getByText('Recomendado: 2 · máximo 2')).toBeInTheDocument();
    expect(screen.getByText('Ajustes avanzados de calidad')).toBeInTheDocument();
    expect(screen.queryByText('Umbral de evaluador confiable')).not.toBeInTheDocument();
    expect(
      screen.getByText('No se puede volver a Participación ni rehacer el reparto.')
    ).toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('TS-36: sin inscriptos afuera no muestra el aviso', async () => {
    getVotingConfigPreview.mockResolvedValue({ ...preview, participants_count: 3 });
    setup();
    await screen.findByText('Propuestas');
    expect(screen.queryByText(/no subió su propuesta|no subieron su propuesta/)).not.toBeInTheDocument();
  });

  it('TS-37: tope de m y recálculo anunciado en región live', async () => {
    setup();
    await screen.findByText('Propuestas');
    expect(screen.getByRole('button', { name: 'Una propuesta más por evaluador' })).toBeDisabled();
    userEvent.click(screen.getByRole('button', { name: 'Una propuesta menos por evaluador' }));
    expect(perReviewer()).toHaveValue(1);
    expect(tile('Evaluaciones por archivo', 1)).toBeInTheDocument();
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(within(live).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Una propuesta menos por evaluador' })).toBeDisabled();
  });

  it('TS-37: evaluaciones mínimas siguen a m mientras no se toquen; si se tocaron se acotan', async () => {
    getVotingConfigPreview.mockResolvedValue({ ...preview, participants_count: 6, participants_with_proposal: 6, max_m: 5, recommended_m: 4 });
    setup();
    await screen.findByText('Propuestas');
    openAdvanced();
    const minEval = () => screen.getByRole('spinbutton', { name: 'Evaluaciones mínimas por archivo' });
    expect(minEval()).toHaveValue(3);
    clickTimes('Una propuesta menos por evaluador', 2);
    expect(minEval()).toHaveValue(2);
    clickTimes('Una propuesta más por evaluador', 3);
    expect(minEval()).toHaveValue(3);
    clickTimes('Subir Evaluaciones mínimas por archivo', 2);
    expect(minEval()).toHaveValue(5);
    clickTimes('Una propuesta menos por evaluador', 2);
    expect(minEval()).toHaveValue(3);
    clickTimes('Una propuesta más por evaluador', 1);
    expect(minEval()).toHaveValue(3);
  });

  it('TS-38: menos de 3 propuestas bloquea y oculta los campos', async () => {
    getVotingConfigPreview.mockResolvedValue({
      ...preview,
      participants_count: 5,
      participants_with_proposal: 2,
      can_open_voting: false,
      max_m: 1,
      recommended_m: 1,
    });
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Se necesitan al menos 3 participantes con propuesta para abrir la votación. Hoy hay 2.'
    );
    expect(tile('Propuestas', 2)).toBeInTheDocument();
    expect(tile('Evaluadores', 2)).toBeInTheDocument();
    expect(screen.queryByText('Evaluaciones por archivo')).not.toBeInTheDocument();
    expect(screen.queryByText('Cierre de la votación')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByText('Ajustes avanzados de calidad')).not.toBeInTheDocument();
    expect(
      screen.queryByText('No se puede volver a Participación ni rehacer el reparto.')
    ).not.toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  it('TS-39: umbrales inválidos marcan los dos campos y bloquean', async () => {
    setup();
    await screen.findByText('Propuestas');
    openAdvanced();
    const good = () => screen.getByRole('spinbutton', { name: 'Umbral de evaluador confiable' });
    const bad = () => screen.getByRole('spinbutton', { name: 'Umbral de evaluador poco confiable' });
    expect(good()).toHaveValue(0.6);
    expect(bad()).toHaveValue(0.3);
    expect(screen.getByRole('spinbutton', { name: 'Peso del ajuste por calidad' })).toHaveValue(3);
    clickTimes('Bajar Umbral de evaluador confiable', 6);
    clickTimes('Subir Umbral de evaluador poco confiable', 6);
    expect(good()).toHaveValue(0.3);
    expect(bad()).toHaveValue(0.6);
    const message = 'El umbral confiable tiene que superar al poco confiable por al menos 0,1.';
    expect(screen.getAllByText(message)).toHaveLength(2);
    expect(good()).toHaveAttribute('aria-invalid', 'true');
    expect(bad()).toHaveAttribute('aria-invalid', 'true');
    expect(confirmButton()).toBeDisabled();

    clickTimes('Subir Umbral de evaluador confiable', 6);
    clickTimes('Bajar Umbral de evaluador poco confiable', 1);
    expect(good()).toHaveValue(0.6);
    expect(bad()).toHaveValue(0.55);
    expect(screen.getAllByText(message)).toHaveLength(2);
    expect(confirmButton()).toBeDisabled();

    clickTimes('Bajar Umbral de evaluador poco confiable', 1);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });

  it('TS-40: confirma en una sola llamada con la configuración', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    updateEventStage.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { onDone } = setup();
    await screen.findByText('Propuestas');
    userEvent.click(confirmButton());
    expect(updateEventStage).toHaveBeenCalledTimes(1);
    expect(updateEventStage).toHaveBeenCalledWith('e-1', 'voting', '2026-10-12', {
      attachments_per_evaluator: 2,
      min_evaluations_per_file: 2,
      adjustment_magnitude: 3,
      quality_good_threshold: 0.6,
      quality_bad_threshold: 0.3,
    });
    expect(screen.getByRole('button', { name: /Abriendo votación…/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    resolve({ stage: 'voting' });
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(getVotingConfigPreview).toHaveBeenCalledTimes(1);
  });

  it('TS-41: errores de apertura por code, con los valores conservados', async () => {
    updateEventStage
      .mockRejectedValueOnce(new ApiError({ status: 500, body: { error: 'x', code: 'VOTING_SETUP_ERROR' } }))
      .mockRejectedValueOnce(new ApiError({ status: 400, body: { error: 'x', code: 'M_EXCEEDS_EVALUABLE' } }));
    const { onDone } = setup();
    await screen.findByText('Propuestas');
    userEvent.click(confirmButton());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos abrir la votación. El evento sigue en Participación; intenta de nuevo.'
    );
    expect(perReviewer()).toHaveValue(2);
    userEvent.click(confirmButton());
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'La cantidad de propuestas a evaluar supera las que hay disponibles. Reduce ese número.'
      )
    );
    expect(screen.getByRole('dialog', { name: 'Abrir votación' })).toBeInTheDocument();
    expect(perReviewer()).toHaveValue(2);
    expect(confirmButton()).toBeEnabled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('TS-42: si falla el preview permite reintentar', async () => {
    getVotingConfigPreview.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos calcular el reparto.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Failed to fetch');
    expect(confirmButton()).toBeDisabled();
    userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Propuestas')).toBeInTheDocument();
    expect(getVotingConfigPreview).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });

  it('valida la fecha de cierre', async () => {
    setup();
    await screen.findByText('Propuestas');
    userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    const input = screen.getByLabelText('Cierre de la votación', { selector: 'input' });
    fireEvent.change(input, { target: { value: '2026-10-05' } });
    expect(screen.getByText('Elige una fecha posterior a hoy.')).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  it('TS-57: Escape cierra; con la llamada en curso no', async () => {
    updateEventStage.mockReturnValue(new Promise(() => undefined));
    const { onClose } = setup();
    await screen.findByText('Propuestas');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    userEvent.click(confirmButton());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cerrado no renderiza nada ni pide el preview', () => {
    setup(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getVotingConfigPreview).not.toHaveBeenCalled();
  });
});
