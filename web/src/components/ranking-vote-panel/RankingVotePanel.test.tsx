import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RankingVotePanel from './RankingVotePanel';
import {
  DistributedVotingService,
  AttachmentService,
  VoteDraftService,
} from '../../services/api';
import { AnonymousAssignment } from '../../types';

jest.mock('../../services/api', () => ({
  ...jest.requireActual('../../services/api'),
  DistributedVotingService: {
    getParticipantAssignment: jest.fn(),
    getVotingStatistics: jest.fn(),
    submitRankingVotes: jest.fn(),
  },
  AttachmentService: {
    getEventAttachments: jest.fn(),
    downloadAssignedAttachment: jest.fn(),
  },
  VoteDraftService: {
    getDraft: jest.fn(),
    saveDraft: jest.fn(),
  },
}));

const getAssignment = DistributedVotingService.getParticipantAssignment as jest.Mock;
const getStats = DistributedVotingService.getVotingStatistics as jest.Mock;
const submitVotes = DistributedVotingService.submitRankingVotes as jest.Mock;
const getEventAttachments = AttachmentService.getEventAttachments as jest.Mock;
const downloadAssigned = AttachmentService.downloadAssignedAttachment as jest.Mock;
const getDraft = VoteDraftService.getDraft as jest.Mock;

const buildAssignment = (overrides: Partial<AnonymousAssignment> = {}): AnonymousAssignment => ({
  id: 'a1',
  event_id: 'e1',
  is_completed: false,
  completed_at: null,
  attachments: [
    { id: 'f1', label: 'Propuesta 1', mime_type: 'application/pdf', file_size: 1048576, description: 'Mi propuesta de logo' },
    { id: 'f2', label: 'Propuesta 2', mime_type: 'image/png', file_size: 524288, description: null },
    {
      id: 'f3',
      label: 'Propuesta 3',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 2097152,
      description: null,
    },
  ],
  ...overrides,
});

const renderPanel = (onVotesSubmitted = jest.fn()) => {
  render(<RankingVotePanel eventId="e1" participantId="p1" onVotesSubmitted={onVotesSubmitted} />);
  return onVotesSubmitted;
};

describe('RankingVotePanel', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    getAssignment.mockResolvedValue(buildAssignment());
    getDraft.mockResolvedValue(null);
    getStats.mockResolvedValue({
      total_assignments: 4,
      completed_assignments: 2,
      total_votes: 6,
      completion_rate: 0.5,
      average_quality_score: 0,
      participants_with_good_quality: 0,
      participants_with_bad_quality: 0,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('muestra las propuestas de la asignación como "Propuesta N" (TS-11)', async () => {
    renderPanel();

    expect(await screen.findByText('Propuesta 1')).toBeInTheDocument();
    expect(screen.getByText('Propuesta 2')).toBeInTheDocument();
    expect(screen.getByText('Propuesta 3')).toBeInTheDocument();
    expect(screen.getByText('PDF · 1.00 MB')).toBeInTheDocument();
    expect(screen.getByText('PNG · 0.50 MB')).toBeInTheDocument();
    expect(screen.getByText('DOCX · 2.00 MB')).toBeInTheDocument();
    expect(screen.getByText('Mi propuesta de logo')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
    expect(screen.getByRole('combobox', { name: 'Rank for Propuesta 1' })).toBeInTheDocument();
    expect(getEventAttachments).not.toHaveBeenCalled();
  });

  it('no afirma que el voto pese más (TS-25)', async () => {
    renderPanel();
    await screen.findByText('Propuesta 1');

    expect(screen.queryByText(/carries weight/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/more influence/i)).not.toBeInTheDocument();
  });

  it('no muestra datos de autoría (TS-12)', async () => {
    renderPanel();
    await screen.findByText('Propuesta 1');

    expect(screen.queryByText(/Uploaded:/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('descarga una propuesta con su posición y MIME (TS-13)', async () => {
    downloadAssigned.mockResolvedValue(undefined);
    renderPanel();
    await screen.findByText('Propuesta 1');

    const buttons = screen.getAllByRole('button', { name: /Download \/ View File/ });
    userEvent.click(buttons[0]);

    expect(downloadAssigned).toHaveBeenCalledWith('f1', 1, 'application/pdf');
  });

  it('muestra el error de descarga sin ocultar la lista (TS-14)', async () => {
    downloadAssigned.mockRejectedValue(new Error('Forbidden'));
    renderPanel();
    await screen.findByText('Propuesta 2');

    const buttons = screen.getAllByRole('button', { name: /Download \/ View File/ });
    userEvent.click(buttons[1]);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not download "Propuesta 2": Forbidden.');
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
  });

  it('avisa al inscripto sin asignación (TS-15)', async () => {
    getAssignment.mockResolvedValue(null);
    renderPanel();

    expect(await screen.findByText('You are not taking part in this vote.')).toBeInTheDocument();
    expect(
      screen.getByText('Only participants who submitted a proposal evaluate the others.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit Rankings' })).not.toBeInTheDocument();
    expect(getDraft).not.toHaveBeenCalled();
  });

  it('muestra el error de carga (TS-16)', async () => {
    getAssignment.mockRejectedValue(new Error('Failed to fetch'));
    renderPanel();

    expect(
      await screen.findByText('Failed to load your assignment: Failed to fetch.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('restaura el borrador sobre las propuestas de la asignación (TS-17)', async () => {
    getDraft.mockResolvedValue({
      assignment_id: 'a1',
      participant_id: 'p1',
      rankings: [{ attachment_id: 'f2', rank: 1 }],
      updated_at: '2026-10-04T12:00:00Z',
    });
    renderPanel();
    await screen.findByText('Propuesta 1');

    expect(await screen.findByDisplayValue('1 (Best)')).toBe(
      screen.getByRole('combobox', { name: 'Rank for Propuesta 2' })
    );
    expect(screen.getByRole('combobox', { name: 'Rank for Propuesta 1' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Rank for Propuesta 3' })).toHaveValue('');
  });

  it('envía el ranking con los ids de la asignación (TS-18)', async () => {
    submitVotes.mockResolvedValue(undefined);
    const onVotesSubmitted = renderPanel();
    await screen.findByText('Propuesta 1');

    userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rank for Propuesta 1' }), '1');
    userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rank for Propuesta 2' }), '2');
    userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rank for Propuesta 3' }), '3');
    userEvent.click(screen.getByRole('button', { name: 'Submit Rankings' }));

    await screen.findByText('Propuesta 1');
    await new Promise((r) => setTimeout(r, 0));
    expect(submitVotes).toHaveBeenCalledWith('e1', 'p1', 'a1', [
      { attachment_id: 'f1', rank: 1 },
      { attachment_id: 'f2', rank: 2 },
      { attachment_id: 'f3', rank: 3 },
    ]);
    expect(onVotesSubmitted).toHaveBeenCalledTimes(1);
    expect(getAssignment).toHaveBeenCalledTimes(2);
  });

  it('mantiene la validación de ranking incompleto (TS-19)', async () => {
    renderPanel();
    await screen.findByText('Propuesta 1');

    userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rank for Propuesta 1' }), '1');
    userEvent.click(screen.getByRole('button', { name: 'Submit Rankings' }));

    expect(
      await screen.findByText('Please rank all assigned attachments before submitting')
    ).toBeInTheDocument();
    expect(submitVotes).not.toHaveBeenCalled();
  });

  it('muestra la asignación completada sin puntaje de calidad (TS-20)', async () => {
    getAssignment.mockResolvedValue(
      buildAssignment({ is_completed: true, completed_at: '2026-10-04T12:00:00Z' })
    );
    renderPanel();

    expect(await screen.findByText('✅ Assignment Completed')).toBeInTheDocument();
    expect(
      screen.getByText('You have already submitted your rankings for this event.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Your quality score/)).not.toBeInTheDocument();
    expect(getDraft).not.toHaveBeenCalled();
  });
});
