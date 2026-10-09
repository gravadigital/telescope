import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PublishResultsDialog from './PublishResultsDialog';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { ApiError } from '../../../config/api';
import { EventService } from '../../../services/api';
import type { VotingProgress } from '../../../domain';

jest.mock('../../../services/api');

const updateEventStage = EventService.updateEventStage as jest.Mock;
const apiErr = (status: number, code: string) => new ApiError({ status, body: { error: 'x', code } });

const missing: VotingProgress = { sent: 1, total: 4, missing: 3, complete: false };
const complete: VotingProgress = { sent: 4, total: 4, missing: 0, complete: true };

const setup = (progress: VotingProgress = missing) => {
  const onClose = jest.fn();
  const onDone = jest.fn();
  renderWithProviders(
    <PublishResultsDialog open eventId="e-1" progress={progress} onClose={onClose} onDone={onDone} />
  );
  return { onClose, onDone };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PublishResultsDialog', () => {
  it('TS-43: con faltantes', () => {
    setup();
    const dialog = screen.getByRole('alertdialog', { name: '¿Cerrar votación y publicar?' });
    expect(within(dialog).getByText('Votación → Resultados')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Se calcula el ranking final y queda visible para todos. Nadie podrá votar después.')
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Faltan 3 de 4 rankings')).toBeInTheDocument();
    expect(within(dialog).getByText(/^Con pocos votos el resultado es menos confiable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguir esperando' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Publicar igual' })).toBeInTheDocument();
    // describedby = explicación + aviso
    expect(dialog).toHaveAccessibleDescription(/^Se calcula el ranking final.*Faltan 3 de 4 rankings/);
  });

  it('TS-44: seguir esperando cierra sin publicar', () => {
    const { onClose } = setup();
    userEvent.click(screen.getByRole('button', { name: 'Seguir esperando' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(updateEventStage).not.toHaveBeenCalled();
  });

  it('TS-45: publicar igual', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    updateEventStage.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { onDone } = setup();
    userEvent.click(screen.getByRole('button', { name: 'Publicar igual' }));
    expect(updateEventStage).toHaveBeenCalledTimes(1);
    expect(updateEventStage).toHaveBeenCalledWith('e-1', 'results');
    expect(screen.getByRole('button', { name: 'Publicando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Seguir esperando' })).toBeDisabled();
    resolve({ stage: 'results' });
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('TS-46: sin faltantes', () => {
    setup(complete);
    expect(screen.queryByText(/rankings$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Con pocos votos/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar resultados' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar igual' })).not.toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      'Se calcula el ranking final y queda visible para todos. Nadie podrá votar después.'
    );
  });

  it('TS-47: error de publicación', async () => {
    updateEventStage.mockRejectedValue(apiErr(500, 'DB_UPDATE_ERROR'));
    const { onDone, onClose } = setup();
    userEvent.click(screen.getByRole('button', { name: 'Publicar igual' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos publicar los resultados. Intenta de nuevo.'
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar igual' })).toBeEnabled();
    expect(onDone).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('TS-47: código admitido y red', async () => {
    updateEventStage.mockRejectedValueOnce(apiErr(409, 'INVALID_TRANSITION'));
    setup();
    userEvent.click(screen.getByRole('button', { name: 'Publicar igual' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No puedes pasar a esa etapa desde la actual.');
    updateEventStage.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    userEvent.click(screen.getByRole('button', { name: 'Publicar igual' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).not.toHaveTextContent('No puedes pasar a esa etapa desde la actual.')
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('Failed to fetch');
  });

  it('TS-57: Escape no cierra mientras publica', async () => {
    updateEventStage.mockReturnValue(new Promise(() => undefined));
    const { onClose } = setup();
    userEvent.click(screen.getByRole('button', { name: 'Publicar igual' }));
    await screen.findByRole('button', { name: 'Publicando…' });
    userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
