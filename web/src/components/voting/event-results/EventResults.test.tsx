import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import EventResults from './EventResults';
import { DistributedVotingService } from '../../../services/api';
import { ApiError } from '../../../config/api';
import type { AttachmentResult, VotingResults } from '../../../types';

jest.mock('../../../services/api');

const getResults = DistributedVotingService.getDistributedResults as jest.Mock;
const recalculate = DistributedVotingService.recalculateDistributedResults as jest.Mock;

const r = (id: string, pid: string, name: string, file: string, score: number, rank: number): AttachmentResult => ({
  attachment_id: id,
  filename: file,
  participant_id: pid,
  participant_name: name,
  mbc_score: score,
  global_rank: rank,
  adjusted_rank: rank,
  vote_count: 3,
  average_rank: rank,
});

const results: VotingResults = {
  id: 'vr-1',
  event_id: 'e-1',
  global_ranking: [],
  participant_qualities: {},
  adjusted_ranking: [
    r('a-5', 'u-5', 'Eva Torres', 'cielo.gif', 0.22, 5),
    r('a-2', 'u-2', 'Bruno Ríos', 'sol.png', 0.74, 1),
    r('a-1', 'u-1', 'Ana Pérez', 'afiche.pdf', 0.4, 4),
    r('a-3', 'u-3', 'Carla Méndez', 'luna.pdf', 0.68, 2),
    r('a-4', 'u-4', 'Diego Sosa', 'mar.jpg', 0.51, 3),
  ],
  total_participants: 5,
  total_votes: 12,
  attachments_per_evaluator: 3,
  calculated_at: '2026-10-04T18:00:00Z',
};

const NOTE =
  'El puntaje combina los rankings de todos los participantes, en una escala de 0 a 10. La propuesta de quien evaluó con coherencia sube posiciones; la de quien no, baja.';

describe('EventResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('TS-46: podio, tabla, nota y onLoaded', async () => {
    getResults.mockResolvedValue(results);
    const onLoaded = jest.fn();
    renderWithProviders(<EventResults eventId="e-1" currentUserId="u-1" onLoaded={onLoaded} />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando resultados…');
    expect(await screen.findByRole('list', { name: 'Podio' })).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(onLoaded).toHaveBeenCalledWith(results);
  });

  it('TS-47: sin resultados no es un error y nunca recalcula', async () => {
    getResults.mockRejectedValueOnce(
      new ApiError({ status: 404, body: { error: 'RESULTS_NOT_CALCULATED', message: 'x' } })
    );
    const { unmount } = renderWithProviders(<EventResults eventId="e-1" currentUserId={null} />);
    expect(await screen.findByText('Los resultados todavía no están disponibles.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Podio' })).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();

    getResults.mockResolvedValueOnce({ ...results, adjusted_ranking: [] });
    renderWithProviders(<EventResults eventId="e-1" currentUserId={null} />);
    expect(await screen.findByText('Los resultados todavía no están disponibles.')).toBeInTheDocument();
    expect(recalculate).not.toHaveBeenCalled();
  });

  it('TS-48: error con reintento y sin "pesa más"', async () => {
    getResults.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(results);
    renderWithProviders(<EventResults eventId="e-1" currentUserId={null} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los resultados.');
    userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('list', { name: 'Podio' })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/pesa|weight/i);
  });

  it('solo podio cuando hay 3 o menos propuestas', async () => {
    getResults.mockResolvedValue({ ...results, adjusted_ranking: results.adjusted_ranking.slice(1, 3) });
    renderWithProviders(<EventResults eventId="e-1" currentUserId={null} />);
    expect(await screen.findByRole('list', { name: 'Podio' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
