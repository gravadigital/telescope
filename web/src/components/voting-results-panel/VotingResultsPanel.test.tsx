import React from 'react';
import { render, screen } from '@testing-library/react';
import VotingResultsPanel from './VotingResultsPanel';
import { DistributedVotingService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../services/api');
jest.mock('../../context/AuthContext');

const mockedService = DistributedVotingService as jest.Mocked<typeof DistributedVotingService>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const setAuthenticated = (isAuthenticated: boolean): void => {
  mockedUseAuth.mockReturnValue({
    user: null,
    token: null,
    login: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
    joinEvent: jest.fn(),
    isAuthenticated,
    loading: false,
    openAuthModal: jest.fn(),
  });
};

const storedResults = {
  id: 'r1',
  event_id: 'ev-1',
  global_ranking: [],
  adjusted_ranking: [
    {
      attachment_id: 'a1',
      filename: 'winner.pdf',
      participant_name: 'Ana',
      mbc_score: 1,
    },
  ],
  participant_qualities: {},
  total_participants: 3,
  attachments_per_evaluator: 2,
  calculated_at: '2026-09-28T00:00:00Z',
} as any;

const statistics = {
  total_assignments: 3,
  completed_assignments: 3,
  total_votes: 6,
  completion_rate: 1,
  average_quality_score: 0.8,
  participants_with_good_quality: 3,
  participants_with_bad_quality: 0,
};

describe('VotingResultsPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('muestra el ranking guardado sin recalcular (TS-1)', async () => {
    setAuthenticated(false);
    mockedService.getDistributedResults.mockResolvedValue(storedResults);
    mockedService.getVotingStatistics.mockResolvedValue(statistics);

    render(<VotingResultsPanel eventId="ev-1" />);

    expect(await screen.findByText('winner.pdf')).toBeInTheDocument();
    expect(mockedService.recalculateDistributedResults).not.toHaveBeenCalled();
  });

  it('un visitante sin sesión ve el estado vacío si no hay resultados guardados (TS-2)', async () => {
    setAuthenticated(false);
    mockedService.getDistributedResults.mockRejectedValue(new Error('RESULTS_NOT_CALCULATED'));
    mockedService.getVotingStatistics.mockResolvedValue(statistics);

    render(<VotingResultsPanel eventId="ev-1" />);

    expect(await screen.findByText('No results available yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Failed to load voting results/)).not.toBeInTheDocument();
    expect(mockedService.recalculateDistributedResults).not.toHaveBeenCalled();
  });

  it('con sesión recalcula una vez y muestra el ranking (TS-3)', async () => {
    setAuthenticated(true);
    mockedService.getDistributedResults
      .mockRejectedValueOnce(new Error('RESULTS_NOT_CALCULATED'))
      .mockResolvedValueOnce(storedResults);
    mockedService.getVotingStatistics.mockResolvedValue(statistics);
    mockedService.recalculateDistributedResults.mockResolvedValueOnce(storedResults);

    render(<VotingResultsPanel eventId="ev-1" />);

    expect(await screen.findByText('winner.pdf')).toBeInTheDocument();
    expect(mockedService.recalculateDistributedResults).toHaveBeenCalledTimes(1);
  });

  it('un fallo real se muestra como error (TS-4)', async () => {
    setAuthenticated(false);
    mockedService.getDistributedResults.mockRejectedValue(new Error('Failed to fetch'));
    mockedService.getVotingStatistics.mockResolvedValue(statistics);

    render(<VotingResultsPanel eventId="ev-1" />);

    expect(await screen.findByText('Failed to load voting results: Failed to fetch')).toBeInTheDocument();
  });
});
