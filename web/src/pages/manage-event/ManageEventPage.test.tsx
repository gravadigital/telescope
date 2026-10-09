import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import ManageEventPage from './ManageEventPage';
import { AppRoutes } from '../../App';
import { renderWithProviders, sampleUser } from '../../test-utils/renderWithProviders';
import type { ProviderOptions } from '../../test-utils/renderWithProviders';
import {
  ApiHealthService,
  AttachmentService,
  DistributedVotingService,
  EventService,
  UserService,
} from '../../services/api';
import { ApiError } from '../../config/api';
import type {
  Attachment,
  Event,
  EventParticipant,
  User,
  VotingConfiguration,
  VotingResults,
  VotingStatistics,
} from '../../types';
import type { VotingConfigPreview } from '../../domain';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');

const getEvent = EventService.getEventById as jest.Mock;
const getParticipants = EventService.getParticipants as jest.Mock;
const getAttachments = AttachmentService.getEventAttachments as jest.Mock;
const download = AttachmentService.downloadAttachment as jest.Mock;
const getStats = DistributedVotingService.getVotingStatistics as jest.Mock;
const getConfig = DistributedVotingService.getVotingConfig as jest.Mock;

const now = new Date(2026, 9, 5, 10, 0);
const organizer: User = { ...sampleUser, id: 'u-9', name: 'Club de Diseño' };

const base: Event = {
  id: 'e-1',
  title: 'Concurso de logos',
  description: 'Diseña el logo del club.',
  date: '2026-10-01',
  organizer: 'Club de Diseño',
  stage: 'participation',
  max_participants: 20,
  creator_id: 'u-9',
  participant_ids: ['u-2', 'u-3', 'u-4', 'u-5'],
  is_paused: false,
  is_cancelled: false,
  created_at: '2026-10-01T09:00:00Z',
  participation_estimated_end_date: '2026-10-10',
  voting_estimated_end_date: null,
};
const creation: Event = { ...base, stage: 'creation', participant_ids: [], participation_estimated_end_date: null };
const voting: Event = {
  ...base,
  stage: 'voting',
  participant_ids: ['u-2', 'u-3', 'u-4', 'u-5', 'u-6'],
  voting_estimated_end_date: '2026-10-12',
};
const p = (id: string, name: string, day: number): EventParticipant => ({
  id,
  name,
  email: `${name.split(' ')[0].toLowerCase()}@x.com`,
  role: 'participant',
  created_at: `2026-10-0${day}T10:00:00Z`,
});
const participants = [
  p('u-2', 'Bruno Ríos', 2),
  p('u-3', 'Carla Méndez', 2),
  p('u-4', 'Diego Sosa', 3),
  p('u-5', 'Eva Torres', 4),
];
const att = (id: string, pid: string, name: string): Attachment => ({
  id,
  event_id: 'e-1',
  participant_id: pid,
  original_name: name,
  stored_name: '',
  file_size: 1000,
  mime_type: 'image/png',
  uploaded_at: '2026-10-03T12:00:00Z',
});
const attachments = [att('a-2', 'u-2', 'sol.png'), att('a-3', 'u-3', 'luna.pdf'), att('a-4', 'u-4', 'mar.jpg')];
const stats: VotingStatistics = {
  total_assignments: 4,
  completed_assignments: 1,
  total_votes: 2,
  completion_rate: 0.25,
  average_quality_score: 0,
  participants_with_good_quality: 0,
  participants_with_bad_quality: 0,
  participant_voting_status: { 'u-2': true, 'u-3': false, 'u-4': false, 'u-5': false },
};
const config: VotingConfiguration = {
  id: 'vc-1',
  event_id: 'e-1',
  attachments_per_evaluator: 2,
  quality_good_threshold: 0.6,
  quality_bad_threshold: 0.3,
  adjustment_magnitude: 3,
  min_evaluations_per_file: 2,
};

const results: Event = { ...voting, stage: 'results' };
const preview: VotingConfigPreview = {
  participants_count: 4,
  participants_with_proposal: 3,
  can_open_voting: true,
  min_m: 1,
  max_m: 2,
  recommended_m: 2,
  defaults: { quality_good_threshold: 0.6, quality_bad_threshold: 0.3, adjustment_magnitude: 3 },
};
const ranking: VotingResults = {
  id: 'vr-1',
  event_id: 'e-1',
  global_ranking: [],
  participant_qualities: {},
  adjusted_ranking: ['Bruno Ríos', 'Carla Méndez', 'Diego Sosa'].map((name, i) => ({
    attachment_id: `a-${i + 2}`,
    filename: `propuesta-${i + 1}.pdf`,
    participant_id: `u-${i + 2}`,
    participant_name: name,
    mbc_score: 0.8 - i * 0.1,
    global_rank: i + 1,
    adjusted_rank: i + 1,
    vote_count: 3,
    average_rank: i + 1,
  })),
  total_participants: 3,
  total_votes: 6,
  attachments_per_evaluator: 2,
  calculated_at: '2026-10-04T18:00:00Z',
};

const updateStage = EventService.updateEventStage as jest.Mock;
const updateDeadline = EventService.updateEstimatedEndDate as jest.Mock;
const updateEvent = EventService.updateEvent as jest.Mock;
const pauseEvent = EventService.pauseEvent as jest.Mock;
const sendReminder = EventService.sendReminder as jest.Mock;
const getPreview = DistributedVotingService.getVotingConfigPreview as jest.Mock;
const getResults = DistributedVotingService.getDistributedResults as jest.Mock;

const signedIn = { user: organizer, isAuthenticated: true, loading: false };

const renderPage = (options: ProviderOptions = {}) =>
  renderWithProviders(
    <Routes>
      <Route path="/events/:eventId/manage" element={<ManageEventPage />} />
    </Routes>,
    { route: '/events/e-1/manage', auth: signedIn, ...options }
  );

const loaded = (name = 'Concurso de logos') => screen.findByRole('heading', { level: 1, name });

/** Tile de métrica por su etiqueta visible. */
const tile = (label: string): HTMLElement => {
  const el = screen
    .getAllByText(label)
    .map((node) => node.closest('.ui-stat-tile'))
    .find((node): node is HTMLElement => node instanceof HTMLElement);
  if (!el) throw new Error(`No hay StatTile "${label}"`);
  return el;
};
const queryTile = (label: string): HTMLElement | null =>
  screen
    .queryAllByText(label)
    .map((node) => node.closest('.ui-stat-tile'))
    .find((node): node is HTMLElement => node instanceof HTMLElement) ?? null;

const row = (name: string): HTMLElement => {
  const cell = screen.getByText(name);
  const tr = cell.closest('tr');
  if (!tr) throw new Error(`No hay fila para ${name}`);
  return tr;
};

describe('ManageEventPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.clearAllMocks();
    getEvent.mockResolvedValue(base);
    getParticipants.mockResolvedValue(participants);
    getAttachments.mockResolvedValue(attachments);
    getStats.mockResolvedValue(stats);
    getConfig.mockResolvedValue(config);
    download.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('estructura por etapa', () => {
    it('TS-58: Creación (estructura)', async () => {
      getEvent.mockResolvedValue(creation);
      renderPage();
      expect(await loaded()).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '← Mis eventos' })).toHaveAttribute('href', '/my-events');
      expect(screen.getByText('Borrador · no visible')).toBeInTheDocument();
      expect(screen.getByText('Organizas este evento')).toBeInTheDocument();
      expect(screen.getByText('Club de Diseño · creado el 1 oct 2026')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Editar datos' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Compartir' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Copiar enlace de invitación' })).toBeNull();

      const current = screen.getByRole('listitem', { current: 'step' });
      expect(current).toHaveTextContent('Creación');
      expect(current).toHaveTextContent('Configuras el evento');
      const items = screen.getAllByRole('listitem').filter((li) => li.closest('.ev-stage-timeline'));
      expect(items[1]).toHaveTextContent('Participación');
      expect(items[1]).toHaveTextContent('Sin fecha de cierre');

      const aside = screen.getByRole('complementary', { name: 'Próximo paso' });
      expect(within(aside).getByRole('heading', { level: 2, name: 'Abre la inscripción' })).toBeInTheDocument();
      expect(within(aside).getByRole('button', { name: 'Abrir inscripción →' })).toHaveClass('ui-button--primary');
      expect(within(aside).getByRole('button', { name: 'Pausar evento' })).toHaveClass('ui-button--tertiary');

      expect(screen.getByRole('heading', { level: 2, name: 'Participantes' })).toBeInTheDocument();
      expect(screen.getByText('Todavía no hay inscriptos')).toBeInTheDocument();
      expect(screen.getByText('Cuando abras la inscripción podrás compartir el enlace.')).toBeInTheDocument();
      expect(document.querySelector('.ui-stat-tile')).toBeNull();
      expect(getParticipants).not.toHaveBeenCalled();
      expect(getAttachments).not.toHaveBeenCalled();
      expect(getStats).not.toHaveBeenCalled();
      expect(getConfig).not.toHaveBeenCalled();
    });

    it('TS-60: Participación', async () => {
      renderPage();
      await loaded();
      expect(await screen.findByText('Eva Torres')).toBeInTheDocument();
      expect(screen.getByText('Inscripción abierta · cierra en 5 días')).toBeInTheDocument();
      expect(tile('Inscriptos')).toHaveTextContent('4 / 20');
      expect(tile('Archivos recibidos')).toHaveTextContent('3 / 4');
      expect(tile('Cierre')).toHaveTextContent('5 días');
      expect(queryTile('Rankings enviados')).toBeNull();

      const table = screen.getByRole('table');
      expect(within(table).getAllByRole('row')).toHaveLength(5);
      expect(within(table).getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
      expect(within(table).getByRole('columnheader', { name: 'Inscripción' })).toBeInTheDocument();
      expect(within(row('Eva Torres')).getByText('Falta archivo')).toBeInTheDocument();
      expect(within(row('Bruno Ríos')).getByRole('button', { name: 'Descargar sol.png' })).toBeInTheDocument();

      expect(
        screen.getByText('1 participante todavía no subió su archivo y no va a evaluar ni ser evaluado.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Configurar y abrir votación →' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Recordar a quienes no subieron archivo (1)' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Editar datos' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copiar enlace de invitación' })).toBeInTheDocument();
      expect(getStats).not.toHaveBeenCalled();
      expect(getConfig).not.toHaveBeenCalled();
      expect(getParticipants).toHaveBeenCalledWith('e-1');
      expect(getAttachments).toHaveBeenCalledWith('e-1');
    });

    it('TS-61: Participación con menos de 3 propuestas', async () => {
      getAttachments.mockResolvedValue(attachments.slice(0, 2));
      renderPage();
      expect(
        await screen.findByText(
          'Se necesitan al menos 3 participantes con propuesta para abrir la votación. Hoy hay 2.'
        )
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Configurar y abrir votación →' })).toBeEnabled();
    });

    it('TS-63: Votación', async () => {
      getEvent.mockResolvedValue(voting);
      getParticipants.mockResolvedValue([...participants, p('u-6', 'Fede Gil', 4)]);
      getAttachments.mockResolvedValue([...attachments, att('a-5', 'u-5', 'cielo.gif')]);
      renderPage();
      await loaded();
      expect(await screen.findByText('Fede Gil')).toBeInTheDocument();
      expect(screen.getByText('Votación en curso · cierra en 7 días')).toBeInTheDocument();
      expect(tile('Rankings enviados')).toHaveTextContent('1 de 4');
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '1');
      expect(bar).toHaveAttribute('aria-valuemax', '4');
      expect(queryTile('Archivos recibidos')).toBeNull();
      expect(tile('Cierre')).toHaveTextContent('7 días');

      expect(within(screen.getByRole('table')).getByRole('columnheader', { name: 'Voto' })).toBeInTheDocument();
      expect(within(row('Bruno Ríos')).getByText('✓ Enviado')).toBeInTheDocument();
      expect(within(row('Carla Méndez')).getByText('Pendiente')).toBeInTheDocument();
      expect(within(row('Fede Gil')).getByText('No participa')).toBeInTheDocument();

      expect(await screen.findByText('Configuración aplicada')).toBeInTheDocument();
      expect(
        screen.getByText(
          '2 propuestas por evaluador · mínimo 2 evaluaciones por archivo · ajustes de calidad recomendados'
        )
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cerrar votación y publicar' })).toHaveClass('ui-button--secondary');
      expect(screen.getByText('Faltan 3 de 4 rankings.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Editar datos' })).toBeNull();
      expect(screen.queryByRole('button', { name: /Participación/ })).toBeNull();
      expect(screen.getByRole('button', { name: 'Enviar recordatorio a 3 pendientes' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Compartir' })).toBeInTheDocument();
      expect(getStats).toHaveBeenCalledWith('e-1');
      expect(getConfig).toHaveBeenCalledWith('e-1');
    });

    it('TS-64: Votación completa', async () => {
      getEvent.mockResolvedValue(voting);
      getStats.mockResolvedValue({
        ...stats,
        completed_assignments: 4,
        participant_voting_status: { 'u-2': true, 'u-3': true, 'u-4': true, 'u-5': true },
      });
      renderPage();
      await screen.findByText('Bruno Ríos');
      expect(tile('Rankings enviados')).toHaveTextContent('4 de 4');
      expect(screen.getByRole('button', { name: 'Cerrar votación y publicar' })).toHaveClass('ui-button--primary');
      expect(screen.queryByText(/rankings\.$/)).toBeNull();
      expect(screen.queryByRole('button', { name: /Enviar recordatorio/ })).toBeNull();
    });

    it('TS-65: configuración personalizada, ausente y con error', async () => {
      getEvent.mockResolvedValue(voting);
      getConfig.mockResolvedValueOnce({ ...config, quality_good_threshold: 0.7 });
      const first = renderPage();
      expect(await screen.findByText(/ajustes de calidad personalizados/)).toBeInTheDocument();
      first.unmount();

      getConfig.mockResolvedValueOnce(null);
      const second = renderPage();
      await screen.findByText('Bruno Ríos');
      await waitFor(() => expect(getConfig).toHaveBeenCalledTimes(2));
      expect(screen.queryByText('Configuración aplicada')).toBeNull();
      second.unmount();

      getConfig.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      renderPage();
      expect(await screen.findByText('No pudimos cargar la configuración aplicada.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cerrar votación y publicar' })).toBeEnabled();
      userEvent.click(within(screen.getByText('No pudimos cargar la configuración aplicada.').closest('.ui-callout') as HTMLElement).getByRole('button', { name: 'Reintentar' }));
      expect(await screen.findByText(/ajustes de calidad recomendados/)).toBeInTheDocument();
      expect(getConfig).toHaveBeenCalledTimes(4);
    });

    it('TS-69: sin pendientes de archivo', async () => {
      getAttachments.mockResolvedValue([...attachments, att('a-5', 'u-5', 'cielo.gif')]);
      renderPage();
      await screen.findByText('Eva Torres');
      expect(screen.queryByRole('button', { name: /Recordar a quienes/ })).toBeNull();
      expect(screen.queryByText(/todavía no subi/)).toBeNull();
    });

    it('TS-81: cancelado', async () => {
      getEvent.mockResolvedValue({ ...base, is_cancelled: true });
      renderPage();
      await loaded();
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
      expect(screen.queryByText('Próximo paso')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Pausar evento' })).toBeNull();
      expect(screen.queryByRole('button', { name: /Recordar/ })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Editar datos' })).toBeNull();
    });

    it('TS-84: inglés', async () => {
      renderPage({ locale: 'en' });
      await loaded();
      await screen.findByText('Eva Torres');
      expect(screen.getByText('You organize this event')).toBeInTheDocument();
      expect(tile('Registered')).toHaveTextContent('4 / 20');
      expect(tile('Files received')).toHaveTextContent('3 / 4');
      expect(screen.getByRole('button', { name: 'Set up and open voting →' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: "Remind those who haven't uploaded a file (1)" })).toBeInTheDocument();
    });
  });

  describe('carga, errores y permisos', () => {
    it('AC-8: estado de carga', async () => {
      let resolve: (e: Event) => void = () => undefined;
      getEvent.mockReturnValue(new Promise<Event>((r) => (resolve = r)));
      renderPage();
      expect(screen.getByRole('status')).toHaveTextContent('Cargando gestión…');
      expect(document.querySelector('.ui-stat-tile[aria-busy="true"]')).not.toBeNull();
      await act(async () => resolve(base));
      expect(await loaded()).toBeInTheDocument();
    });

    it('espera a la sesión antes de pedir el evento', () => {
      renderPage({ auth: { user: null, isAuthenticated: false, loading: true } });
      expect(getEvent).not.toHaveBeenCalled();
    });

    it('TS-75: error de participantes y reintento', async () => {
      getParticipants.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      renderPage();
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('No pudimos cargar los participantes.');
      expect(screen.queryByRole('table')).toBeNull();
      expect(screen.queryByText('Todavía no hay inscriptos')).toBeNull();
      expect(tile('Inscriptos')).toHaveTextContent('—');
      expect(tile('Archivos recibidos')).toHaveTextContent('—');
      expect(screen.getByRole('button', { name: 'Configurar y abrir votación →' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: /Recordar a quienes/ })).toBeNull();

      userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
      expect(await screen.findByText('Bruno Ríos')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Configurar y abrir votación →' })).toBeEnabled();
      expect(getParticipants).toHaveBeenCalledTimes(2);
      expect(getAttachments).toHaveBeenCalledTimes(2);
    });

    it('TS-76: error de estadísticas', async () => {
      getEvent.mockResolvedValue(voting);
      getStats.mockRejectedValue(new TypeError('Failed to fetch'));
      renderPage();
      expect(await screen.findByText('No pudimos cargar las estadísticas de votación.')).toBeInTheDocument();
      const callout = screen.getByText('No pudimos cargar las estadísticas de votación.').closest('.ui-callout') as HTMLElement;
      expect(within(callout).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
      await screen.findByText('Bruno Ríos');
      expect(within(row('Bruno Ríos')).getByText('—')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cerrar votación y publicar' })).toBeDisabled();
      // D-9: sin estadísticas no hay N de pendientes, así que el recordatorio no se ofrece.
      expect(screen.queryByRole('button', { name: /recordatorio/i })).toBeNull();

      getStats.mockResolvedValue(stats);
      userEvent.click(within(callout).getByRole('button', { name: 'Reintentar' }));
      expect(await screen.findByText('1 de 4')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cerrar votación y publicar' })).toBeEnabled();
    });

    it('TS-77: sin permiso', async () => {
      getEvent.mockResolvedValue({ ...base, creator_id: 'u-77' });
      renderPage();
      expect(
        await screen.findByRole('heading', { level: 1, name: 'No tienes permiso para gestionar este evento' })
      ).toBeInTheDocument();
      expect(screen.getByText('Solo quien creó el evento puede gestionarlo.')).toBeInTheDocument();
      expect(screen.queryByText('Organizas este evento')).toBeNull();
      expect(screen.queryByRole('link', { name: '← Mis eventos' })).toBeNull();
      userEvent.click(screen.getByRole('button', { name: 'Ir a Eventos' }));
      expect(screen.getByTestId('location')).toHaveTextContent('/events');
      expect(getParticipants).not.toHaveBeenCalled();
      expect(getAttachments).not.toHaveBeenCalled();
      expect(getStats).not.toHaveBeenCalled();
    });

    it('TS-78: sin sesión va al login (AppRoutes)', () => {
      (ApiHealthService.checkHealth as jest.Mock).mockResolvedValue(true);
      (UserService.getMyEvents as jest.Mock).mockResolvedValue([]);
      renderWithProviders(<AppRoutes />, {
        route: '/events/e-1/manage',
        auth: { user: null, isAuthenticated: false, loading: false },
      });
      expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fevents%2Fe-1%2Fmanage');
    });

    it('TS-79: evento inexistente', async () => {
      getEvent.mockRejectedValueOnce(new ApiError({ status: 404, body: { error: 'x', code: 'EVENT_NOT_FOUND' } }));
      const first = renderPage();
      expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeInTheDocument();
      first.unmount();

      getEvent.mockResolvedValueOnce(null);
      const second = renderPage();
      expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeInTheDocument();
      second.unmount();

      getEvent.mockRejectedValueOnce(new ApiError({ status: 400, body: { error: 'x', code: 'INVALID_EVENT_ID' } }));
      renderPage();
      expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeInTheDocument();
    });

    it('TS-80: falla la carga del evento', async () => {
      getEvent.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      renderPage();
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('No pudimos cargar el evento.');
      expect(screen.getByRole('link', { name: 'Ir a Eventos' })).toHaveAttribute('href', '/events');
      userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
      expect(await loaded()).toBeInTheDocument();
    });

    it('TS-83: aviso "Evento creado" (S-014)', async () => {
      getEvent.mockResolvedValue(creation);
      renderPage({ initialEntry: { pathname: '/events/e-1/manage', state: { notice: 'eventCreated' } } });
      await loaded();
      expect(screen.getByRole('status')).toHaveTextContent('Evento creado. Cuando esté listo, abre la inscripción.');
      expect(screen.getByTestId('location-state')).toHaveTextContent('null');
    });
  });

  describe('acciones del encabezado y la tabla', () => {
    it('Editar datos abre EditEventDialog', async () => {
      renderPage();
      await loaded();
      userEvent.click(screen.getByRole('button', { name: 'Editar datos' }));
      expect(screen.getByRole('dialog', { name: 'Editar datos del evento' })).toBeInTheDocument();
    });

    it('Compartir en Votación abre ShareDialog', async () => {
      getEvent.mockResolvedValue(voting);
      renderPage();
      await loaded();
      userEvent.click(screen.getByRole('button', { name: 'Compartir' }));
      expect(screen.getByRole('dialog', { name: 'Concurso de logos' })).toBeInTheDocument();
    });

    it('TS-82: copiar enlace en Participación', async () => {
      const writeText = jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'));
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      renderPage();
      await loaded();
      userEvent.click(screen.getByRole('button', { name: 'Copiar enlace de invitación' }));
      expect(writeText).toHaveBeenCalledWith('http://localhost/events/e-1');
      expect(await screen.findByRole('button', { name: '✓ Copiado' })).toBeInTheDocument();
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(screen.getByRole('button', { name: 'Copiar enlace de invitación' })).toBeInTheDocument();

      userEvent.click(screen.getByRole('button', { name: 'Copiar enlace de invitación' }));
      expect(await screen.findByRole('dialog', { name: 'Concurso de logos' })).toBeInTheDocument();
    });

    it('D-8: descarga desde la tabla y error de descarga', async () => {
      download.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new TypeError('Failed to fetch'));
      renderPage();
      await screen.findByText('Bruno Ríos');
      userEvent.click(screen.getByRole('button', { name: 'Descargar sol.png' }));
      expect(download).toHaveBeenCalledWith('a-2', 'sol.png');
      userEvent.click(screen.getByRole('button', { name: 'Descargar luna.pdf' }));
      expect(await screen.findByText('No pudimos descargar «luna.pdf». Intenta de nuevo.')).toBeInTheDocument();
    });

    it('Participación sin inscriptos: EmptyState con copiar enlace', async () => {
      getEvent.mockResolvedValue({ ...base, participant_ids: [] });
      getParticipants.mockResolvedValue([]);
      getAttachments.mockResolvedValue([]);
      renderPage();
      expect(await screen.findByText('Todavía no hay inscriptos')).toBeInTheDocument();
      expect(screen.getByText('Comparte el enlace de invitación para sumar participantes.')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Copiar enlace de invitación' })).toHaveLength(2);
      expect(screen.queryByRole('table')).toBeNull();
    });

    it('pausado: aviso y próximo paso deshabilitado', async () => {
      getEvent.mockResolvedValue({ ...base, is_paused: true });
      renderPage();
      await screen.findByText('Eva Torres');
      expect(screen.getByText('Pausado')).toBeInTheDocument();
      expect(
        screen.getByText(
          'El evento está pausado. Los participantes no pueden inscribirse, subir propuestas ni votar hasta que lo reanudes.'
        )
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Configurar y abrir votación →' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Recordar a quienes no subieron archivo (1)' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Reanudar evento' })).toBeInTheDocument();
    });
  });

  describe('próximo paso, diálogos y avisos (Task 9)', () => {
    beforeEach(() => {
      getPreview.mockResolvedValue(preview);
      getResults.mockResolvedValue(ranking);
      updateStage.mockResolvedValue({ stage: 'participation' });
      updateDeadline.mockResolvedValue(undefined);
      pauseEvent.mockResolvedValue({ is_paused: true });
    });

    const statusRegion = () =>
      screen.getAllByRole('status').find((el) => el.classList.contains('mep-notice')) as HTMLElement;

    it('TS-58: Creación (próximo paso, Resumen y Después)', async () => {
      getEvent.mockResolvedValue(creation);
      renderPage();
      await loaded();
      const aside = screen.getByRole('complementary', { name: 'Próximo paso' });
      expect(within(aside).getByText('Próximo paso')).toBeInTheDocument();
      expect(
        within(aside).getByText(
          'Mientras esté en creación, nadie puede ver ni sumarse al evento. Revisa que esté todo listo:'
        )
      ).toBeInTheDocument();
      expect(within(aside).getByText('Nombre y descripción')).toBeInTheDocument();
      expect(within(aside).getByText('Cupo: 20 participantes')).toBeInTheDocument();
      expect(within(aside).getByText('Fecha de cierre de inscripción (la defines al abrir)')).toBeInTheDocument();
      const summary = within(aside).getByRole('region', { name: 'Resumen' });
      expect(within(summary).getByText('Participantes')).toBeInTheDocument();
      expect(within(summary).getByText('0 / 20')).toBeInTheDocument();
      expect(within(summary).getByText('Archivos')).toBeInTheDocument();
      expect(within(summary).getByText('0')).toBeInTheDocument();
      expect(within(summary).getByText('Cierre inscripción')).toBeInTheDocument();
      expect(within(summary).getByText('Sin definir')).toBeInTheDocument();
      expect(within(aside).getByText('Después')).toBeInTheDocument();
      expect(
        within(aside).getByText(
          'Los participantes se inscriben y suben su archivo hasta la fecha de cierre que definas.'
        )
      ).toBeInTheDocument();
    });

    it('TS-59: abrir inscripción de punta a punta', async () => {
      getEvent
        .mockResolvedValueOnce(creation)
        .mockResolvedValue({ ...base, participation_estimated_end_date: '2026-10-12' });
      renderPage();
      await loaded();
      userEvent.click(screen.getByRole('button', { name: 'Abrir inscripción →' }));
      const dialog = screen.getByRole('dialog', { name: 'Abrir inscripción' });
      userEvent.click(within(dialog).getByRole('radio', { name: '1 semana' }));
      userEvent.click(within(dialog).getByRole('button', { name: 'Abrir inscripción' }));
      expect(await screen.findByText('Inscripción abierta · cierra en 7 días')).toBeInTheDocument();
      expect(updateStage).toHaveBeenCalledWith('e-1', 'participation', '2026-10-12');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(statusRegion()).toHaveTextContent(
        'Se abrió la inscripción. Comparte el enlace para sumar participantes.'
      );
      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 2, name: 'Pasar a votación' })).toHaveFocus()
      );
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(statusRegion()).toBeEmptyDOMElement();
    });

    it('TS-62: abrir votación de punta a punta (una sola llamada)', async () => {
      getEvent.mockResolvedValueOnce(base).mockResolvedValue(voting);
      updateStage.mockResolvedValue({ stage: 'voting', voting: { configuration: config, assignments_count: 6, total_attachments: 3 } });
      renderPage();
      await screen.findByText('Eva Torres');
      userEvent.click(screen.getByRole('button', { name: 'Configurar y abrir votación →' }));
      const dialog = screen.getByRole('dialog', { name: 'Abrir votación' });
      const confirm = await within(dialog).findByRole('button', { name: 'Abrir votación y asignar' });
      await waitFor(() => expect(confirm).toBeEnabled());
      userEvent.click(confirm);
      expect(await screen.findByText('Se abrió la votación. Se asignaron las propuestas.')).toBeInTheDocument();
      expect(getPreview).toHaveBeenCalledWith('e-1');
      expect(updateStage).toHaveBeenCalledTimes(1);
      expect(updateStage).toHaveBeenCalledWith(
        'e-1',
        'voting',
        '2026-10-12',
        expect.objectContaining({ attachments_per_evaluator: 2 })
      );
      expect(await screen.findByText('Rankings enviados')).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 2, name: 'Publicar resultados' })).toHaveFocus()
      );
    });

    it('TS-66: publicar con faltantes de punta a punta; "Seguir esperando" no llama nada', async () => {
      getEvent.mockResolvedValue(voting);
      const view = renderPage();
      await screen.findByText('Faltan 3 de 4 rankings.');
      userEvent.click(screen.getByRole('button', { name: 'Cerrar votación y publicar' }));
      userEvent.click(screen.getByRole('button', { name: 'Seguir esperando' }));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(updateStage).not.toHaveBeenCalled();
      view.unmount();

      getEvent.mockResolvedValueOnce(voting).mockResolvedValue(results);
      updateStage.mockResolvedValue({ stage: 'results' });
      renderPage();
      await screen.findByText('Faltan 3 de 4 rankings.');
      userEvent.click(screen.getByRole('button', { name: 'Cerrar votación y publicar' }));
      userEvent.click(screen.getByRole('button', { name: 'Publicar igual' }));
      expect(await screen.findByText('Resultados publicados.')).toBeInTheDocument();
      expect(updateStage).toHaveBeenCalledWith('e-1', 'results');
      expect(await screen.findByText('Finalizado · resultados publicados')).toBeInTheDocument();
      expect(await screen.findAllByText('Bruno Ríos')).not.toHaveLength(0);
      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 1, name: 'Concurso de logos' })).toHaveFocus()
      );
    });

    it('TS-67: recordatorio de archivo de punta a punta', async () => {
      sendReminder.mockResolvedValue({ type: 'file', recipients_count: 1 });
      renderPage();
      await screen.findByText('Eva Torres');
      userEvent.click(screen.getByRole('button', { name: 'Recordar a quienes no subieron archivo (1)' }));
      const dialog = screen.getByRole('dialog', { name: 'Recordar que falta el archivo' });
      expect(within(dialog).getByText('Eva Torres')).toBeInTheDocument();
      userEvent.click(within(dialog).getByRole('button', { name: 'Enviar recordatorio' }));
      expect(await screen.findByText('Recordatorio enviado a 1 participante.')).toBeInTheDocument();
      expect(sendReminder).toHaveBeenCalledWith('e-1', 'file');
      expect(screen.queryByRole('dialog')).toBeNull();
      await waitFor(() => expect(getEvent).toHaveBeenCalledTimes(2));
      await screen.findByText('Eva Torres');
      expect(screen.getByRole('button', { name: 'Recordatorio enviado' })).toBeDisabled();
    });

    it('TS-68: recordatorio de voto', async () => {
      getEvent.mockResolvedValue(voting);
      sendReminder.mockResolvedValue({ type: 'vote', recipients_count: 3 });
      renderPage();
      await screen.findByText('Bruno Ríos');
      userEvent.click(await screen.findByRole('button', { name: 'Enviar recordatorio a 3 pendientes' }));
      const dialog = screen.getByRole('dialog', { name: 'Recordar que falta el ranking' });
      expect(within(dialog).getByText('Carla Méndez')).toBeInTheDocument();
      expect(within(dialog).getByText('Diego Sosa')).toBeInTheDocument();
      expect(within(dialog).getByText('Eva Torres')).toBeInTheDocument();
      userEvent.click(within(dialog).getByRole('button', { name: 'Enviar recordatorio' }));
      expect(await screen.findByText('Recordatorio enviado a 3 participantes.')).toBeInTheDocument();
      expect(sendReminder).toHaveBeenCalledWith('e-1', 'vote');
    });

    it('TS-70: posponer de punta a punta', async () => {
      getEvent.mockResolvedValueOnce(base).mockResolvedValue({ ...base, participation_estimated_end_date: '2026-10-17' });
      renderPage();
      await screen.findByText('Eva Torres');
      userEvent.click(screen.getByRole('button', { name: /editar/ }));
      const dialog = screen.getByRole('dialog', { name: 'Posponer el cierre' });
      userEvent.click(within(dialog).getByRole('radio', { name: '+1 semana' }));
      userEvent.click(within(dialog).getByRole('button', { name: 'Posponer cierre' }));
      expect(await screen.findByText('Cierre actualizado.')).toBeInTheDocument();
      expect(updateDeadline).toHaveBeenCalledWith('e-1', 'participation', '2026-10-17');
      await waitFor(() => expect(tile('Cierre')).toHaveTextContent('12 días'));
    });

    it('TS-71: editar datos', async () => {
      updateEvent.mockResolvedValue({ ...base, organizer: 'Club de Fotografía' });
      getEvent.mockResolvedValueOnce(base).mockResolvedValue({ ...base, organizer: 'Club de Fotografía' });
      renderPage();
      await loaded();
      userEvent.click(screen.getByRole('button', { name: 'Editar datos' }));
      const dialog = screen.getByRole('dialog', { name: 'Editar datos del evento' });
      const field = within(dialog).getByLabelText(/^Organizador/);
      userEvent.clear(field);
      userEvent.type(field, 'Club de Fotografía');
      userEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
      expect(await screen.findByText('Datos actualizados.')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(await screen.findByText('Club de Fotografía · creado el 1 oct 2026')).toBeInTheDocument();
    });

    it('TS-72: pausar con confirmación', async () => {
      getEvent.mockResolvedValueOnce(base).mockResolvedValue({ ...base, is_paused: true });
      renderPage();
      await screen.findByText('Eva Torres');
      userEvent.click(screen.getByRole('button', { name: 'Pausar evento' }));
      const dialog = screen.getByRole('alertdialog', { name: '¿Pausar el evento?' });
      expect(
        within(dialog).getByText('Mientras esté pausado nadie puede inscribirse, subir propuestas ni votar.')
      ).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
      userEvent.click(within(dialog).getByRole('button', { name: 'Pausar evento' }));
      expect(await screen.findByText('Pausado')).toBeInTheDocument();
      expect(pauseEvent).toHaveBeenCalledWith('e-1');
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(
        screen.getByText(
          'El evento está pausado. Los participantes no pueden inscribirse, subir propuestas ni votar hasta que lo reanudes.'
        )
      ).toBeInTheDocument();
      await screen.findByText('Eva Torres');
      expect(screen.getByRole('button', { name: 'Configurar y abrir votación →' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Recordar a quienes no subieron archivo (1)' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Reanudar evento' })).toBeInTheDocument();
    });

    it('pausar: el error queda dentro del diálogo', async () => {
      pauseEvent.mockRejectedValue(new TypeError('Failed to fetch'));
      renderPage();
      await screen.findByText('Eva Torres');
      userEvent.click(screen.getByRole('button', { name: 'Pausar evento' }));
      const dialog = screen.getByRole('alertdialog', { name: '¿Pausar el evento?' });
      userEvent.click(within(dialog).getByRole('button', { name: 'Pausar evento' }));
      expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('TS-73: reanudar sin confirmación', async () => {
      getEvent.mockResolvedValueOnce({ ...base, is_paused: true }).mockResolvedValue(base);
      pauseEvent.mockResolvedValue({ is_paused: false });
      renderPage();
      await screen.findByText('Eva Torres');
      userEvent.click(screen.getByRole('button', { name: 'Reanudar evento' }));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(pauseEvent).toHaveBeenCalledWith('e-1');
      expect(await screen.findByRole('button', { name: 'Pausar evento' })).toBeInTheDocument();
      expect(getEvent).toHaveBeenCalledTimes(2);
    });

    it('TS-74: Resultados', async () => {
      getEvent.mockResolvedValue(results);
      renderPage();
      await loaded();
      expect(screen.getByText('Finalizado · resultados publicados')).toBeInTheDocument();
      const podium = await screen.findByRole('list', { name: 'Podio' });
      expect(within(podium).getAllByRole('listitem')).toHaveLength(3);
      expect(await screen.findAllByText('Bruno Ríos')).not.toHaveLength(0);
      expect(await screen.findByText(/2 propuestas por evaluador/)).toBeInTheDocument();
      expect(screen.queryByText('Próximo paso')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Pausar evento' })).toBeNull();
      expect(screen.queryByRole('button', { name: /Recordar|recordatorio/ })).toBeNull();
      expect(screen.queryByRole('heading', { level: 2, name: 'Participantes' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Compartir' })).toBeInTheDocument();
      expect(getResults).toHaveBeenCalledWith('e-1');
      expect(getParticipants).not.toHaveBeenCalled();
    });

    it('recorrido Creación → Participación → Votación → Resultados', async () => {
      const opened = { ...base, participation_estimated_end_date: '2026-10-12' };
      getEvent
        .mockResolvedValueOnce(creation)
        .mockResolvedValueOnce(opened)
        .mockResolvedValueOnce(voting)
        .mockResolvedValue(results);
      updateStage
        .mockResolvedValueOnce({ stage: 'participation' })
        .mockResolvedValueOnce({ stage: 'voting', voting: { configuration: config, assignments_count: 6, total_attachments: 3 } })
        .mockResolvedValueOnce({ stage: 'results' });
      renderPage();
      await loaded();

      userEvent.click(screen.getByRole('button', { name: 'Abrir inscripción →' }));
      userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Abrir inscripción' }));
      expect(await screen.findByRole('heading', { level: 2, name: 'Pasar a votación' })).toBeInTheDocument();
      await screen.findByText('Eva Torres');

      userEvent.click(screen.getByRole('button', { name: 'Configurar y abrir votación →' }));
      const confirm = await within(screen.getByRole('dialog')).findByRole('button', { name: 'Abrir votación y asignar' });
      await waitFor(() => expect(confirm).toBeEnabled());
      userEvent.click(confirm);
      expect(await screen.findByRole('heading', { level: 2, name: 'Publicar resultados' })).toBeInTheDocument();
      await screen.findByText('Faltan 3 de 4 rankings.');

      userEvent.click(screen.getByRole('button', { name: 'Cerrar votación y publicar' }));
      userEvent.click(screen.getByRole('button', { name: 'Publicar igual' }));
      expect(await screen.findByText('Finalizado · resultados publicados')).toBeInTheDocument();
      expect(updateStage.mock.calls.map((c) => c[1])).toEqual(['participation', 'voting', 'results']);
      expect(await screen.findAllByText('Bruno Ríos')).not.toHaveLength(0);
    });
  });

  describe('responsive', () => {
    it('TS-85: mobile · resumen de etapa y próximo paso antes de la tabla', async () => {
      renderPage();
      await screen.findByText('Eva Torres');
      expect(
        screen.getByText((_, el) =>
          Boolean(el?.classList.contains('ev-stage-timeline__summary') && el.textContent?.includes('Cierra el 10 oct 2026'))
        )
      ).toBeInTheDocument();
      const nextTitle = screen.getByRole('heading', { level: 2, name: 'Pasar a votación' });
      const metrics = tile('Inscriptos');
      const table = screen.getByRole('table');
      // eslint-disable-next-line no-bitwise
      expect(nextTitle.compareDocumentPosition(metrics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // eslint-disable-next-line no-bitwise
      expect(metrics.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('TS-86: mobile · arreglo en CSS', () => {
      const css = fs
        .readFileSync(path.join(__dirname, 'ManageEventPage.css'), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '');
      const mediaStart = css.indexOf('@media');
      const baseCss = css.slice(0, mediaStart);
      const media = css.slice(mediaStart);
      expect(baseCss).toMatch(/\.mep-metrics\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
      expect(media).toMatch(/^@media \(min-width: 768px\)/);
      expect(media).toMatch(/\.mep-metrics\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
      expect(media).toMatch(/\.mep-body\s*\{[^}]*grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\)/);
      expect(media).toMatch(/\.mep-main\s*\{[^}]*span 8/);
      expect(media).toMatch(/\.mep-aside\s*\{[^}]*span 4/);
      expect(css.match(/@media/g)).toHaveLength(1);
      expect(css).not.toMatch(/@media[^{]*max-width/);
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css).not.toMatch(/rgba?\(/);
      const selectors = css.match(/(^|\})\s*([^@{}][^{}]*)\{/g) ?? [];
      selectors
        .map((s) => s.replace(/[}{]/g, '').trim())
        .filter((sel) => sel && !sel.startsWith('@'))
        .forEach((sel) => sel.split(',').forEach((one) => expect(one.trim()).toMatch(/^\.mep-/)));
    });
  });
});
