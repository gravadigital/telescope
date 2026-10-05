import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ManageEventPage from './ManageEventPage';
import { I18nProvider } from '../../i18n';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { EventService, AttachmentService, DistributedVotingService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../services/api');
jest.mock('../../context/AuthContext');

const mockedGetEventById = EventService.getEventById as jest.MockedFunction<
  typeof EventService.getEventById
>;
const mockedGetEventParticipants = EventService.getEventParticipants as jest.MockedFunction<
  typeof EventService.getEventParticipants
>;
const mockedGetEventAttachments = AttachmentService.getEventAttachments as jest.MockedFunction<
  typeof AttachmentService.getEventAttachments
>;
const mockedGetVotingStatistics = DistributedVotingService.getVotingStatistics as jest.MockedFunction<
  typeof DistributedVotingService.getVotingStatistics
>;
const mockedUpdateEventStage = EventService.updateEventStage as jest.MockedFunction<
  typeof EventService.updateEventStage
>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const organizer = {
  id: 'org-1',
  name: 'Org',
  email: 'org@test.com',
  role: 'organizer' as const,
  joinedEventIDs: [],
  createdEventIDs: [],
};

const baseEvent = {
  id: 'ev-1',
  title: 'Test Event',
  description: 'Desc',
  stage: 'participation' as const,
  date: '2026-09-01T00:00:00Z',
  creator_id: 'org-1',
  max_participants: 20,
  is_paused: false,
};

const p1 = {
  id: 'u1',
  name: 'Test User',
  email: 't@t.com',
  role: 'participant' as const,
  joinedEventIDs: ['ev-1'],
  createdEventIDs: [],
};
const p2 = {
  id: 'u2',
  name: 'Second User',
  email: 's@t.com',
  role: 'participant' as const,
  joinedEventIDs: ['ev-1'],
  createdEventIDs: [],
};
const p3 = {
  id: 'u3',
  name: 'Third User',
  email: 'th@t.com',
  role: 'participant' as const,
  joinedEventIDs: ['ev-1'],
  createdEventIDs: [],
};

const attachment1 = {
  id: 'a1',
  event_id: 'ev-1',
  participant_id: 'u1',
  original_name: 'paper.pdf',
  stored_name: 'x',
  file_size: 10,
  mime_type: 'application/pdf',
  uploaded_at: '2026-09-01T00:00:00Z',
};

const votingStatsBase = {
  total_assignments: 0,
  completed_assignments: 0,
  total_votes: 0,
  completion_rate: 0,
  average_quality_score: 0,
  participants_with_good_quality: 0,
  participants_with_bad_quality: 0,
  participant_voting_status: {},
};

function renderPage() {
  return render(
    <I18nProvider initialLocale="es">
      <MemoryRouter initialEntries={['/events/ev-1/manage']}>
        <Routes>
          <Route path="/events/:eventId/manage" element={<ManageEventPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  );
}

describe('ManageEventPage', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: organizer,
      token: 't',
      login: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
      joinEvent: jest.fn(),
      isAuthenticated: true,
      loading: false,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fallo de participantes se distingue de vacío real (TS-8)', async () => {
    mockedGetEventById.mockResolvedValueOnce(baseEvent as any);
    mockedGetEventParticipants.mockRejectedValueOnce(new Error('Failed to fetch'));
    mockedGetEventAttachments.mockResolvedValueOnce([]);

    renderPage();

    const banner = await screen.findByText('Could not load participants: Failed to fetch.');
    expect(banner.closest('[role="alert"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('No participants have registered yet.')).not.toBeInTheDocument();
    expect(screen.getByText('Participants:')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('vacío real de participantes (TS-9)', async () => {
    mockedGetEventById.mockResolvedValueOnce(baseEvent as any);
    mockedGetEventParticipants.mockResolvedValueOnce([]);
    mockedGetEventAttachments.mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText('No participants have registered yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Could not load participants/)).not.toBeInTheDocument();
  });

  it('reintento de participantes recupera sin volver al spinner (TS-10)', async () => {
    mockedGetEventById.mockResolvedValue(baseEvent as any);
    mockedGetEventParticipants
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce([p1]);
    mockedGetEventAttachments.mockResolvedValue([]);

    renderPage();

    await screen.findByText('Could not load participants: Failed to fetch.');

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Test User')).toBeInTheDocument();
    expect(screen.queryByText('Loading event...')).not.toBeInTheDocument();
    expect(mockedGetEventById).toHaveBeenCalledTimes(1);
  });

  it('fallo de propuestas (TS-11)', async () => {
    mockedGetEventById.mockResolvedValueOnce(baseEvent as any);
    mockedGetEventParticipants.mockResolvedValueOnce([p1]);
    mockedGetEventAttachments.mockRejectedValueOnce(new Error('Failed to fetch'));

    renderPage();

    expect(
      await screen.findByText('Could not load submitted files: Failed to fetch.')
    ).toBeInTheDocument();
    expect(screen.getByText('Files Submitted:')).toBeInTheDocument();
    expect(screen.queryByText('⏳ Pending')).not.toBeInTheDocument();
  });

  it('propuesta real pendiente (regresión) (TS-12)', async () => {
    mockedGetEventById.mockResolvedValueOnce(baseEvent as any);
    mockedGetEventParticipants.mockResolvedValueOnce([p1]);
    mockedGetEventAttachments.mockResolvedValueOnce([]);

    renderPage();

    await screen.findByText('Test User');
    expect(screen.getByText('0 / 1')).toBeInTheDocument();
    expect(screen.getByText('⏳ Pending')).toBeInTheDocument();
    expect(screen.queryByText(/Could not load submitted files/)).not.toBeInTheDocument();
  });

  it('reintento de propuestas (TS-13)', async () => {
    mockedGetEventById.mockResolvedValue(baseEvent as any);
    mockedGetEventParticipants.mockResolvedValue([p1]);
    mockedGetEventAttachments
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce([attachment1]);

    renderPage();

    await screen.findByText('Could not load submitted files: Failed to fetch.');

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('✓ paper.pdf')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });

  it('fallo de estadísticas en voting (TS-14)', async () => {
    mockedGetEventById.mockResolvedValueOnce({ ...baseEvent, stage: 'voting' } as any);
    mockedGetEventParticipants.mockResolvedValueOnce([p1, p2]);
    mockedGetEventAttachments.mockResolvedValueOnce([]);
    mockedGetVotingStatistics.mockRejectedValueOnce(new Error('Failed to fetch'));

    renderPage();

    expect(
      await screen.findByText('Could not load voting statistics: Failed to fetch.')
    ).toBeInTheDocument();
    expect(screen.queryByText('✅ Voting is underway')).not.toBeInTheDocument();
    expect(screen.queryByText(/Not enough evaluations/)).not.toBeInTheDocument();
  });

  it('votación no configurada real (TS-15)', async () => {
    mockedGetEventById.mockResolvedValueOnce({ ...baseEvent, stage: 'voting' } as any);
    mockedGetEventParticipants.mockResolvedValueOnce([p1, p2]);
    mockedGetEventAttachments.mockResolvedValueOnce([]);
    mockedGetVotingStatistics.mockResolvedValueOnce(votingStatsBase as any);

    renderPage();

    await screen.findByText('Test User');
    expect(screen.queryByText(/Could not load voting statistics/)).not.toBeInTheDocument();
  });

  it('votación en curso real (regresión) (TS-16)', async () => {
    mockedGetEventById.mockResolvedValueOnce({ ...baseEvent, stage: 'voting' } as any);
    mockedGetEventParticipants.mockResolvedValueOnce([p1, p2]);
    mockedGetEventAttachments.mockResolvedValueOnce([]);
    mockedGetVotingStatistics.mockResolvedValueOnce({
      ...votingStatsBase,
      participant_voting_status: { u1: true, u2: false },
    } as any);

    renderPage();

    expect(await screen.findByText('✅ Voting is underway')).toBeInTheDocument();
    expect(screen.queryByText(/Could not load voting statistics/)).not.toBeInTheDocument();
  });

  it('sin contadores confiables no se muestra la configuración de votación (TS-17)', async () => {
    mockedGetEventById.mockResolvedValueOnce({ ...baseEvent, stage: 'voting' } as any);
    mockedGetEventParticipants.mockResolvedValueOnce([p1, p2]);
    mockedGetEventAttachments.mockRejectedValueOnce(new Error('Failed to fetch'));
    mockedGetVotingStatistics.mockResolvedValueOnce(votingStatsBase as any);

    renderPage();

    expect(
      await screen.findByText('Could not load submitted files: Failed to fetch.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Not enough evaluations/)).not.toBeInTheDocument();
    expect(screen.queryByText('Ready to start voting')).not.toBeInTheDocument();
  });

  it('etapa results con fallo de participantes (TS-24)', async () => {
    mockedGetEventById.mockResolvedValueOnce({ ...baseEvent, stage: 'results' } as any);
    mockedGetEventParticipants.mockRejectedValueOnce(new Error('Failed to fetch'));
    mockedGetEventAttachments.mockResolvedValueOnce([]);
    mockedGetVotingStatistics.mockResolvedValueOnce({
      ...votingStatsBase,
      participant_voting_status: { u1: true },
    } as any);

    renderPage();

    expect(
      await screen.findByText('Could not load participants: Failed to fetch.')
    ).toBeInTheDocument();
    expect(screen.getByText('Participants:')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Advance to/ })).not.toBeInTheDocument();
  });

  it('avance bloqueado por fallo de participantes (TS-18)', async () => {
    mockedGetEventById.mockResolvedValueOnce(baseEvent as any);
    mockedGetEventParticipants.mockRejectedValueOnce(new Error('Failed to fetch'));
    mockedGetEventAttachments.mockResolvedValueOnce([]);

    renderPage();

    await screen.findByText('Could not load participants: Failed to fetch.');

    expect(screen.getByRole('button', { name: 'Advance to Voting' })).toBeDisabled();
    expect(mockedUpdateEventStage).not.toHaveBeenCalled();
  });

  it('el avance sigue bloqueado tras un reintento de participantes que también falla (TS-19)', async () => {
    // AC-1 deshabilita el botón de avance mientras participantsError esté
    // activo (TS-18). Este test confirma que un reintento fallido no lo
    // rehabilita momentáneamente: loadParticipants limpia el error al
    // empezar (para no arrastrar el mensaje anterior) y lo vuelve a setear
    // si el reintento también falla, así que el botón permanece bloqueado
    // en todo momento — nunca queda una ventana para confirmar el avance
    // sobre datos no verificados.
    mockedGetEventById.mockResolvedValue(baseEvent as any);
    mockedGetEventParticipants.mockRejectedValue(new Error('Failed to fetch'));
    mockedGetEventAttachments.mockResolvedValue([]);

    renderPage();

    await screen.findByText('Could not load participants: Failed to fetch.');
    expect(screen.getByRole('button', { name: 'Advance to Voting' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(mockedGetEventParticipants).toHaveBeenCalledTimes(2));
    await screen.findByText('Could not load participants: Failed to fetch.');
    expect(screen.getByRole('button', { name: 'Advance to Voting' })).toBeDisabled();
    expect(mockedUpdateEventStage).not.toHaveBeenCalled();
  });

  it('avance bloqueado de voting a results por fallo de estadísticas (TS-20)', async () => {
    mockedGetEventById.mockResolvedValueOnce({ ...baseEvent, stage: 'voting' } as any);
    mockedGetEventParticipants.mockResolvedValueOnce([p1, p2]);
    mockedGetEventAttachments.mockResolvedValueOnce([]);
    mockedGetVotingStatistics.mockRejectedValueOnce(new Error('Failed to fetch'));

    renderPage();

    await screen.findByText('Could not load voting statistics: Failed to fetch.');

    expect(screen.getByRole('button', { name: 'Advance to Results' })).toBeDisabled();
    expect(mockedUpdateEventStage).not.toHaveBeenCalled();
  });

  it('avance normal sin errores (regresión) (TS-21)', async () => {
    mockedGetEventById.mockResolvedValue(baseEvent as any);
    mockedGetEventParticipants.mockResolvedValue([p1, p2, p3]);
    mockedGetEventAttachments.mockResolvedValue([]);
    mockedUpdateEventStage.mockResolvedValueOnce(undefined as any);

    renderPage();

    await screen.findByText('Third User');

    await userEvent.click(screen.getByRole('button', { name: 'Advance to Voting' }));
    await screen.findByRole('heading', { name: /Advance to Voting\?/ });

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockedUpdateEventStage).toHaveBeenCalledWith(
        'ev-1',
        'voting',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      );
    });
  });

  it('validación existente sin participantes (regresión) (TS-22)', async () => {
    mockedGetEventById.mockResolvedValue(baseEvent as any);
    mockedGetEventParticipants.mockResolvedValue([]);
    mockedGetEventAttachments.mockResolvedValue([]);

    renderPage();

    await screen.findByText('No participants have registered yet.');

    await userEvent.click(screen.getByRole('button', { name: 'Advance to Voting' }));
    await screen.findByRole('heading', { name: /Advance to Voting\?/ });
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(
      await screen.findByText(
        (_, element) =>
          element?.className === 'stage-modal-error' &&
          element.textContent === '⚠️ Cannot advance: No participants registered yet.'
      )
    ).toBeInTheDocument();
    expect(mockedUpdateEventStage).not.toHaveBeenCalled();
  });

  it('fallo simultáneo de participantes y propuestas (TS-23)', async () => {
    mockedGetEventById.mockResolvedValueOnce(baseEvent as any);
    mockedGetEventParticipants.mockRejectedValueOnce(new Error('Failed to fetch'));
    mockedGetEventAttachments.mockRejectedValueOnce(new Error('Failed to fetch'));

    renderPage();

    expect(
      await screen.findByText('Could not load participants: Failed to fetch.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Could not load submitted files: Failed to fetch.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Advance to Voting' })).toBeDisabled();
  });

  describe('Editar datos (S-014)', () => {
    const renderManage = (initialEntry: { pathname: string; state?: unknown } = {
      pathname: '/events/ev-1/manage',
    }) =>
      renderWithProviders(
        <Routes>
          <Route path="/events/:eventId/manage" element={<ManageEventPage />} />
        </Routes>,
        { auth: { user: organizer, isAuthenticated: true, loading: false }, initialEntry }
      );

    const arrange = (event: object) => {
      mockedGetEventById.mockResolvedValue(event as any);
      mockedGetEventParticipants.mockResolvedValue([]);
      mockedGetEventAttachments.mockResolvedValue([]);
      mockedGetVotingStatistics.mockResolvedValue(votingStatsBase as any);
    };

    it.each([
      ['creation', true],
      ['participation', true],
      ['voting', false],
      ['results', false],
    ])('TS-57: botón "Editar datos" en %s → %s', async (stage, visible) => {
      arrange({ ...baseEvent, stage });
      renderManage();
      await screen.findByRole('heading', { name: 'Test Event' });
      const button = screen.queryByRole('button', { name: 'Editar datos' });
      if (visible) expect(button).toBeInTheDocument();
      else expect(button).toBeNull();
    });

    it('TS-58: edita y ve el cambio', async () => {
      arrange({
        ...baseEvent,
        stage: 'participation',
        participant_ids: [],
        description: 'Diseña el afiche del festival',
      });
      (EventService.updateEvent as jest.Mock).mockResolvedValue({
        ...baseEvent,
        stage: 'participation',
        title: 'Afiches 2026',
      });
      renderManage();
      userEvent.click(await screen.findByRole('button', { name: 'Editar datos' }));
      const name = screen.getByLabelText(/^Nombre del evento/);
      userEvent.clear(name);
      userEvent.type(name, 'Afiches 2026');
      userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      expect(await screen.findByRole('heading', { name: 'Afiches 2026' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByText('Datos actualizados.')).toBeInTheDocument();
    });

    it('TS-59: aviso de creación y state limpio', async () => {
      arrange({ ...baseEvent, stage: 'creation' });
      renderManage({ pathname: '/events/ev-1/manage', state: { notice: 'eventCreated' } });
      expect(
        await screen.findByText('Evento creado. Cuando esté listo, abre la inscripción.')
      ).toBeInTheDocument();
      await waitFor(() => expect(screen.getByTestId('location-state')).toHaveTextContent('null'));
    });
  });
});
