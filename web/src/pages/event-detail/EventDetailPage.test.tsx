import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import EventDetailPage from './EventDetailPage';
import { renderWithProviders, sampleUser } from '../../test-utils/renderWithProviders';
import {
  ApiHealthService,
  AttachmentService,
  DistributedVotingService,
  EventService,
} from '../../services/api';
import { ApiError } from '../../config/api';
import type { AttachmentResult, Attachment, Event, VotingResults } from '../../types';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');
jest.mock('../../components/ranking-vote-panel/RankingVotePanel', () => {
  const ReactActual = jest.requireActual('react');
  return { __esModule: true, default: () => ReactActual.createElement('p', null, 'panel-ranking') };
});

const getEvent = EventService.getEventById as jest.Mock;
const listEvents = EventService.listEvents as jest.Mock;
const register = EventService.registerForEvent as jest.Mock;
const getParticipants = EventService.getParticipants as jest.Mock;
const getAttachments = AttachmentService.getEventAttachments as jest.Mock;
const upload = AttachmentService.uploadAttachment as jest.Mock;
const remove = AttachmentService.deleteAttachment as jest.Mock;
const getAssignment = DistributedVotingService.getParticipantAssignment as jest.Mock;
const getResults = DistributedVotingService.getDistributedResults as jest.Mock;

const now = new Date(2026, 9, 5, 10, 0);

const ev: Event = {
  id: 'e-1',
  title: 'Concurso de afiches',
  description: 'Diseña el afiche del festival de primavera.',
  stage: 'participation',
  date: '2026-10-01',
  organizer: 'Club de Diseño',
  max_participants: 20,
  participant_ids: ['u-2', 'u-3', 'u-4', 'u-5'],
  creator_id: 'u-9',
  is_paused: false,
  is_cancelled: false,
  participation_estimated_end_date: '2026-10-10',
  voting_estimated_end_date: null,
};
const registeredEv: Event = { ...ev, participant_ids: [...(ev.participant_ids ?? []), 'u-1'] };

const myAtt: Attachment = {
  id: 'a-1',
  event_id: 'e-1',
  participant_id: 'u-1',
  original_name: 'afiche.pdf',
  stored_name: '',
  file_size: 2516582,
  mime_type: 'application/pdf',
  description: 'Versión final',
  uploaded_at: '2026-10-03T12:00:00Z',
};

const r = (id: string, pid: string, name: string | undefined, file: string, score: number, rank: number): AttachmentResult => ({
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
const resultsEv: Event = {
  ...ev,
  stage: 'results',
  participant_ids: ['u-1', 'u-2', 'u-3', 'u-4', 'u-5'],
};

const guest = { user: null, isAuthenticated: false, loading: false };
const signedIn = () => ({
  user: sampleUser,
  isAuthenticated: true,
  loading: false,
  joinEvent: jest.fn(),
});

const pdfFile = (): File => {
  const f = new File(['x'], 'propuesta.pdf', { type: 'application/pdf' });
  Object.defineProperty(f, 'size', { value: 2516582 });
  return f;
};

const renderPage = (auth: Record<string, unknown> = guest, locale: 'es' | 'en' = 'es') =>
  renderWithProviders(
    <Routes>
      <Route path="/events/:eventId" element={<EventDetailPage />} />
      <Route path="/events/:eventId/manage" element={<p>gestion</p>} />
      <Route path="/login" element={<p>login</p>} />
    </Routes>,
    { route: '/events/e-1', auth, locale }
  );

const loaded = async () => screen.findByRole('heading', { level: 1 });
const dropzoneInput = () => screen.getByLabelText(/Arrastra tu archivo/) as HTMLInputElement;

describe('EventDetailPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    getEvent.mockResolvedValue(ev);
    getAttachments.mockResolvedValue([]);
    getAssignment.mockResolvedValue(null);
    getResults.mockResolvedValue(results);
    getParticipants.mockResolvedValue([]);
    listEvents.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 1, total: 3, totalPages: 3 },
      stageCounts: { participation: 3, voting: 1, results: 2 },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('estructura y carga', () => {
    it('TS-49: visitante en Participación', async () => {
      renderPage();
      expect(await screen.findByRole('heading', { level: 1, name: 'Concurso de afiches' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '← Eventos' })).toHaveAttribute('href', '/events');
      expect(screen.getByText('Inscripción abierta · cierra en 5 días')).toBeInTheDocument();
      expect(screen.getByText('Organiza Club de Diseño · 4 de 20 participantes')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Compartir' })).toBeInTheDocument();
      expect(screen.getByText('Tu próximo paso')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Inscríbete para participar' })).toBeInTheDocument();
      expect(screen.getByText('Imagen o documento')).toBeInTheDocument();
      expect(screen.getByText('Máx. 10 MB')).toBeInTheDocument();
      expect(screen.getByText('Cierre: 10 oct 2026')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Sobre el evento' })).toBeInTheDocument();
      expect(screen.getByText('Diseña el afiche del festival de primavera.')).toBeInTheDocument();
      const aside = screen.getByRole('complementary');
      expect(within(aside).getByRole('heading', { level: 2, name: 'Detalles' })).toBeInTheDocument();
      expect(within(aside).getByText('Club de Diseño')).toBeInTheDocument();
      expect(within(aside).getByText('Cierre de Participación')).toBeInTheDocument();
      expect(within(aside).getByText('4 / 20')).toBeInTheDocument();
      expect(within(aside).getByText('Después')).toBeInTheDocument();
      expect(within(aside).getByText(/Al cerrar la inscripción, el organizador abre la votación/)).toBeInTheDocument();
      expect(screen.queryByText('Tu progreso')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Ver participantes' })).toBeNull();
      const current = screen.getByRole('listitem', { current: 'step' });
      expect(current).toHaveTextContent('Participación');
      expect(current).toHaveTextContent('Ahora');
      expect(ApiHealthService.checkHealth).not.toHaveBeenCalled();
    });

    it('TS-72: no encontrada (404, null, Creación)', async () => {
      getEvent.mockRejectedValueOnce(new ApiError({ status: 404, body: { error: 'x', code: 'EVENT_NOT_FOUND' } }));
      const first = renderPage();
      expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ir a Eventos' })).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/events/e-1');
      first.unmount();

      getEvent.mockResolvedValueOnce(null);
      const second = renderPage();
      expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeInTheDocument();
      second.unmount();

      getEvent.mockResolvedValueOnce({ ...ev, stage: 'creation' });
      renderPage();
      expect(await screen.findByRole('heading', { level: 1, name: 'No encontramos esta página' })).toBeInTheDocument();
    });

    it('TS-73: el autor va a la gestión y se espera a la sesión', async () => {
      getEvent.mockResolvedValue({ ...ev, creator_id: 'u-1' });
      renderPage(signedIn());
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/events/e-1/manage'));
      expect(screen.getByText('gestion')).toBeInTheDocument();
    });

    it('TS-73: con la sesión cargando no pide el evento', async () => {
      const view = renderPage({ ...guest, loading: true });
      expect(getEvent).not.toHaveBeenCalled();
      view.unmount();
      renderPage({ ...guest, loading: false });
      await loaded();
      expect(getEvent).toHaveBeenCalledTimes(1);
    });

    it('TS-74: error de carga con reintento', async () => {
      getEvent.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(ev);
      renderPage();
      expect(screen.getByRole('status')).toHaveTextContent('Cargando evento…');
      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el evento.');
      expect(screen.getByRole('link', { name: 'Ir a Eventos' })).toHaveAttribute('href', '/events');
      userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
      expect(await screen.findByRole('heading', { level: 1, name: 'Concurso de afiches' })).toBeInTheDocument();
    });

    it('TS-75: diálogos de participantes y de compartir', async () => {
      getParticipants.mockResolvedValue([
        { id: 'u-2', name: 'Bruno Ríos', email: 'b@x.com', role: 'participant', created_at: '2026-10-02T10:00:00Z' },
      ]);
      renderPage(signedIn());
      await loaded();
      const view = screen.getByRole('button', { name: 'Ver participantes' });
      userEvent.click(view);
      const dialog = await screen.findByRole('dialog', { name: 'Participantes · 4 / 20' });
      expect(await within(dialog).findByText('Bruno Ríos')).toBeInTheDocument();
      expect(getParticipants).toHaveBeenCalledWith('e-1');
      userEvent.keyboard('{esc}');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(view).toHaveFocus();

      userEvent.click(screen.getByRole('button', { name: 'Compartir' }));
      const share = await screen.findByRole('dialog', { name: 'Concurso de afiches' });
      expect(within(share).getByRole('button', { name: 'Copiar' })).toHaveFocus();
      expect(ApiHealthService.checkHealth).not.toHaveBeenCalled();
    });

    it('TS-76: sin avance de etapa y en inglés', async () => {
      renderPage({ ...signedIn(), user: { ...sampleUser, role: 'admin' } });
      await loaded();
      expect(screen.queryByRole('button', { name: /advance|avanzar/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /configur/i })).toBeNull();
    });

    it('TS-76: en inglés', async () => {
      renderPage(guest, 'en');
      await loaded();
      expect(screen.getByRole('link', { name: '← Events' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Sign up to take part' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign up for the event' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Details' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    });

    it('TS-77: en mobile "Tu próximo paso" va primero en el DOM', async () => {
      getEvent.mockResolvedValue(registeredEv);
      renderPage(signedIn());
      const next = (await screen.findByRole('heading', { level: 2, name: 'Sube tu propuesta' })).closest('section')!;
      ['Tu progreso', 'Sobre el evento', 'Detalles', 'Después'].forEach((name) => {
        const other = screen.getByText(name);
        expect(next.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });
      const summary = document.querySelector('.ev-stage-timeline__summary') as HTMLElement;
      expect(summary).toHaveTextContent('Cierra el 10 oct 2026');
      expect(summary).toHaveTextContent('Participación · Ahora · Etapa 2 de 4');
    });
  });

  describe('Participación', () => {
    it('TS-50: sin sesión "Inscribirme" lleva al login con next', async () => {
      renderPage();
      await loaded();
      userEvent.click(screen.getByRole('button', { name: 'Inscribirme al evento' }));
      expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fevents%2Fe-1');
      expect(register).not.toHaveBeenCalled();
    });

    it('TS-51: inscribirse pasa a "Sube tu propuesta"', async () => {
      const auth = signedIn();
      getEvent.mockResolvedValueOnce(ev).mockResolvedValueOnce(registeredEv);
      let resolve: () => void = () => undefined;
      register.mockReturnValue(new Promise<void>((res) => { resolve = res; }));
      renderPage(auth);
      await loaded();
      userEvent.click(screen.getByRole('button', { name: 'Inscribirme al evento' }));
      expect(screen.getByRole('button', { name: 'Inscribiendo…' })).toBeDisabled();
      await act(async () => {
        resolve();
      });
      expect(register).toHaveBeenCalledWith('e-1', 'Ana Pérez', 'ana@example.com');
      expect(auth.joinEvent).toHaveBeenCalledWith('e-1');
      expect(await screen.findByRole('heading', { level: 2, name: 'Sube tu propuesta' })).toBeInTheDocument();
      expect(screen.getByText('Inscrito · falta tu archivo')).toBeInTheDocument();
      const progress = screen.getByRole('heading', { level: 2, name: 'Tu progreso' }).closest('section')!;
      expect(within(progress).getByText('Confirmada')).toBeInTheDocument();
      expect(within(progress).getByText('Pendiente · cierra en 5 días')).toBeInTheDocument();
      expect(screen.getByText('Organiza Club de Diseño · 5 de 20 participantes')).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/Registered|inscripción confirmada/i);
    });

    it('TS-52: errores de inscripción por code', async () => {
      register.mockRejectedValueOnce(
        new ApiError({
          status: 400,
          body: { error: 'x', code: 'MAX_PARTICIPANTS_REACHED', current_count: 20, max_participants: 20 },
        })
      );
      const first = renderPage(signedIn());
      await loaded();
      userEvent.click(screen.getByRole('button', { name: 'Inscribirme al evento' }));
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('El cupo está completo. No quedan lugares en este evento.');
      expect(alert.closest('section')).toHaveTextContent('Tu próximo paso');
      await waitFor(() => expect(getEvent).toHaveBeenCalledTimes(2));
      first.unmount();

      register.mockRejectedValueOnce(new ApiError({ status: 500, body: { error: 'server-secret', code: 'REGISTRATION_ERROR' } }));
      renderPage(signedIn());
      await loaded();
      userEvent.click(screen.getByRole('button', { name: 'Inscribirme al evento' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos inscribirte. Intenta de nuevo.');
      expect(document.body.textContent).not.toContain('server-secret');
    });

    describe('inscrito sin propuesta', () => {
      beforeEach(() => {
        getEvent.mockResolvedValue(registeredEv);
      });

      it('TS-53: elegir un archivo válido', async () => {
        renderPage(signedIn());
        await screen.findByRole('heading', { level: 2, name: 'Sube tu propuesta' });
        expect(screen.getByText('Puedes reemplazarla las veces que quieras hasta el 10 oct 2026.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Enviar propuesta' })).toBeDisabled();
        expect(screen.getByText('Elige un archivo para continuar')).toBeInTheDocument();
        userEvent.upload(dropzoneInput(), pdfFile());
        expect(screen.getByText('PDF')).toBeInTheDocument();
        expect(screen.getByText('propuesta.pdf')).toBeInTheDocument();
        expect(screen.getByText('2,4 MB')).toBeInTheDocument();
        expect(screen.getByText('listo para enviar')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cambiar archivo propuesta.pdf' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Comentario/)).toBeInTheDocument();
        expect(screen.getByText('0 / 1000')).toBeInTheDocument();
        expect(screen.getByText('Lo verán los evaluadores junto a tu archivo.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Enviar propuesta' })).toBeEnabled();
        expect(screen.getByText('Podrás reemplazarlo hasta el cierre')).toBeInTheDocument();
      });

      it('TS-54: enviar la propuesta', async () => {
        let resolve: (a: Attachment) => void = () => undefined;
        upload.mockReturnValue(new Promise<Attachment>((res) => { resolve = res; }));
        renderPage(signedIn());
        await screen.findByRole('heading', { level: 2, name: 'Sube tu propuesta' });
        userEvent.upload(dropzoneInput(), pdfFile());
        userEvent.type(screen.getByLabelText(/Comentario/), 'Versión final');
        userEvent.click(screen.getByRole('button', { name: 'Enviar propuesta' }));
        expect(screen.getByRole('button', { name: 'Enviando propuesta…' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Cambiar archivo propuesta.pdf' })).toBeDisabled();
        await act(async () => {
          resolve({ ...myAtt, original_name: 'propuesta.pdf' });
        });
        expect(upload).toHaveBeenCalledWith('e-1', 'u-1', expect.any(File), 'Versión final');
        const status = screen
          .getAllByRole('status')
          .find((el) => el.textContent?.includes('Recibimos tu propuesta.'));
        expect(status).toBeDefined();
        expect(screen.getByRole('heading', { level: 2, name: 'Tu propuesta está enviada' })).toBeInTheDocument();
        expect(screen.getByText('Enviada el 3 oct 2026')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reemplazar archivo' })).toBeInTheDocument();
        const progress = screen.getByRole('heading', { level: 2, name: 'Tu progreso' }).closest('section')!;
        expect(within(progress).getByText('Enviada')).toBeInTheDocument();
        expect(screen.getByText('Propuesta enviada')).toBeInTheDocument();
        act(() => {
          jest.advanceTimersByTime(5000);
        });
        expect(screen.queryByText('Recibimos tu propuesta.')).toBeNull();
      });

      it('TS-55: el comentario llega a 1000 caracteres', async () => {
        renderPage(signedIn());
        await screen.findByRole('heading', { level: 2, name: 'Sube tu propuesta' });
        userEvent.upload(dropzoneInput(), pdfFile());
        const field = screen.getByLabelText(/Comentario/) as HTMLTextAreaElement;
        expect(field).toHaveAttribute('maxlength', '1000');
        fireEvent.change(field, { target: { value: 'a'.repeat(1000) } });
        expect(screen.getByText('1000 / 1000')).toBeInTheDocument();
      });

      it('TS-56: rechazo por tamaño', async () => {
        renderPage(signedIn());
        await screen.findByRole('heading', { level: 2, name: 'Sube tu propuesta' });
        const big = new File(['x'], 'grande.pdf', { type: 'application/pdf' });
        Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
        userEvent.upload(dropzoneInput(), big);
        expect(screen.getByRole('alert')).toHaveTextContent('El archivo supera los 10 MB.');
        expect(screen.queryByText('grande.pdf')).toBeNull();
        expect(screen.getByRole('button', { name: 'Enviar propuesta' })).toBeDisabled();
        expect(upload).not.toHaveBeenCalled();
      });

      it('TS-57: rechazo por tipo', async () => {
        renderPage(signedIn());
        await screen.findByRole('heading', { level: 2, name: 'Sube tu propuesta' });
        fireEvent.change(dropzoneInput(), {
          target: { files: [new File(['x'], 'virus.exe', { type: 'application/x-msdownload' })] },
        });
        expect(screen.getByRole('alert')).toHaveTextContent(
          'Ese formato no está permitido. Usa JPG, PNG, GIF, WebP, PDF, TXT, DOC o DOCX.'
        );
      });

      it('TS-58: falla de subida conserva archivo y comentario', async () => {
        upload.mockRejectedValueOnce(new ApiError({ status: 500, body: { error: 'x', code: 'FILE_SAVE_ERROR' } }));
        renderPage(signedIn());
        await screen.findByRole('heading', { level: 2, name: 'Sube tu propuesta' });
        userEvent.upload(dropzoneInput(), pdfFile());
        userEvent.type(screen.getByLabelText(/Comentario/), 'Hola');
        userEvent.click(screen.getByRole('button', { name: 'Enviar propuesta' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos enviar tu propuesta. Intenta de nuevo.');
        expect(screen.getByText('propuesta.pdf')).toBeInTheDocument();
        expect(screen.getByLabelText(/Comentario/)).toHaveValue('Hola');
        expect(screen.getByRole('button', { name: 'Enviar propuesta' })).toBeEnabled();
      });

      it('TS-58: error con code conocido', async () => {
        upload.mockRejectedValueOnce(new ApiError({ status: 400, body: { error: 'x', code: 'FILE_TOO_LARGE' } }));
        renderPage(signedIn());
        await screen.findByRole('heading', { level: 2, name: 'Sube tu propuesta' });
        userEvent.upload(dropzoneInput(), pdfFile());
        userEvent.click(screen.getByRole('button', { name: 'Enviar propuesta' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('El archivo es demasiado grande. Sube uno más liviano.');
      });
    });

    describe('reemplazo', () => {
      beforeEach(() => {
        getEvent.mockResolvedValue(registeredEv);
        getAttachments.mockResolvedValue([myAtt]);
      });

      const startReplace = async () => {
        renderPage(signedIn());
        await screen.findByRole('heading', { level: 2, name: 'Tu propuesta está enviada' });
        userEvent.click(screen.getByRole('button', { name: 'Reemplazar archivo' }));
        userEvent.upload(dropzoneInput(), pdfFile());
      };

      it('TS-59: reemplazar sin modal: primero DELETE y después POST', async () => {
        remove.mockResolvedValue(undefined);
        upload.mockResolvedValue({ ...myAtt, id: 'a-2', original_name: 'propuesta.pdf' });
        await startReplace();
        expect(screen.getByLabelText(/Comentario/)).toHaveValue('Versión final');
        userEvent.click(screen.getByRole('button', { name: 'Enviar nueva versión' }));
        await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
        expect(remove).toHaveBeenCalledWith('a-1');
        expect(upload).toHaveBeenCalledWith('e-1', 'u-1', expect.any(File), 'Versión final');
        expect(remove.mock.invocationCallOrder[0]).toBeLessThan(upload.mock.invocationCallOrder[0]);
        expect(await screen.findByText('Recibimos tu propuesta.')).toBeInTheDocument();
        expect(screen.getByText('propuesta.pdf')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).toBeNull();
      });

      it('TS-60: falla el DELETE y nada cambia', async () => {
        remove.mockRejectedValue(new ApiError({ status: 500, body: { error: 'x', code: 'DB_DELETE_ERROR' } }));
        await startReplace();
        userEvent.click(screen.getByRole('button', { name: 'Enviar nueva versión' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos reemplazar tu propuesta. Intenta de nuevo.');
        expect(upload).not.toHaveBeenCalled();
        expect(screen.getByText('propuesta.pdf')).toBeInTheDocument();
        const progress = screen.getByRole('heading', { level: 2, name: 'Tu progreso' }).closest('section')!;
        expect(within(progress).getByText('Enviada')).toBeInTheDocument();
      });

      it('TS-61: DELETE ok y POST falla: vuelve a "Sube tu propuesta" y reintenta solo el POST', async () => {
        remove.mockResolvedValue(undefined);
        upload.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await startReplace();
        userEvent.click(screen.getByRole('button', { name: 'Enviar nueva versión' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(
          'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
        );
        expect(screen.getByRole('heading', { level: 2, name: 'Sube tu propuesta' })).toBeInTheDocument();
        expect(screen.getByText('propuesta.pdf')).toBeInTheDocument();
        expect(screen.getByLabelText(/Comentario/)).toHaveValue('Versión final');
        upload.mockResolvedValueOnce({ ...myAtt, id: 'a-3', original_name: 'propuesta.pdf' });
        userEvent.click(screen.getByRole('button', { name: 'Enviar propuesta' }));
        await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
        expect(remove).toHaveBeenCalledTimes(1);
      });
    });

    it('TS-62: pausado', async () => {
      getEvent.mockResolvedValue({ ...registeredEv, is_paused: true });
      const first = renderPage(signedIn());
      expect(await screen.findByRole('heading', { level: 2, name: 'El evento está pausado' })).toBeInTheDocument();
      expect(screen.getByText('Evento pausado')).toBeInTheDocument();
      expect(screen.getByText(/Por ahora no se puede inscribir ni subir propuestas/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Inscribirme al evento' })).toBeNull();
      expect(screen.queryByLabelText(/Arrastra tu archivo/)).toBeNull();
      expect(screen.queryByRole('button', { name: /Enviar propuesta/ })).toBeNull();
      first.unmount();

      getEvent.mockResolvedValue({ ...ev, is_paused: true });
      renderPage(guest);
      expect(await screen.findByRole('heading', { level: 2, name: 'El evento está pausado' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Inscribirme al evento' })).toBeNull();
    });

    it('TS-63: cupo completo', async () => {
      getEvent.mockResolvedValue({
        ...ev,
        participant_ids: Array.from({ length: 20 }, (_, i) => `p-${i}`),
      });
      renderPage(signedIn());
      expect(await screen.findByRole('heading', { level: 2, name: 'El cupo está completo' })).toBeInTheDocument();
      expect(screen.getByText('No quedan lugares en este evento.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Inscribirme al evento' })).toBeNull();
      expect(within(screen.getByRole('complementary')).getByText('20 / 20')).toBeInTheDocument();
    });
  });

  describe('Votación', () => {
    const voting: Event = {
      ...ev,
      stage: 'voting',
      voting_estimated_end_date: '2026-10-12',
      participant_ids: ['u-1', 'u-2'],
    };

    it('TS-64: inscrito sin propuesta', async () => {
      getEvent.mockResolvedValue(voting);
      getAssignment.mockResolvedValue(null);
      renderPage(signedIn());
      expect(await screen.findByRole('heading', { level: 2, name: 'No participas en esta votación' })).toBeInTheDocument();
      expect(getAssignment).toHaveBeenCalledWith('e-1', 'u-1');
      expect(screen.getByText('Votación en curso')).toBeInTheDocument();
      expect(screen.getByText(/No subiste una propuesta durante la inscripción/)).toBeInTheDocument();
      expect(screen.queryByText('panel-ranking')).toBeNull();
      expect(screen.getByText('Al cerrar la votación se publica el ranking final para todos.')).toBeInTheDocument();
    });

    it('TS-65: sin inscripción', async () => {
      getEvent.mockResolvedValue({ ...voting, participant_ids: ['u-2'] });
      const first = renderPage(guest);
      expect(await screen.findByRole('heading', { level: 2, name: 'La votación está en curso' })).toBeInTheDocument();
      expect(screen.getByText(/Los participantes están evaluando las propuestas/)).toBeInTheDocument();
      expect(screen.getByText(/Al cerrar la votación se publica el ranking final/)).toBeInTheDocument();
      first.unmount();
      renderPage(signedIn());
      expect(await screen.findByRole('heading', { level: 2, name: 'La votación está en curso' })).toBeInTheDocument();
      expect(getAssignment).not.toHaveBeenCalled();
    });

    it('TS-66: con asignación', async () => {
      getEvent.mockResolvedValue(voting);
      const assignment = {
        id: 'as-1',
        event_id: 'e-1',
        is_completed: false,
        completed_at: null,
        attachments: [1, 2, 3].map((n) => ({
          id: `f${n}`,
          label: `Propuesta ${n}`,
          mime_type: 'application/pdf',
          file_size: 100,
          description: null,
        })),
      };
      getAssignment.mockResolvedValue(assignment);
      const first = renderPage(signedIn());
      expect(await screen.findByRole('heading', { level: 2, name: 'Ordena las 3 propuestas' })).toBeInTheDocument();
      expect(screen.getByText('Te toca votar · cierra en 7 días')).toBeInTheDocument();
      expect(screen.getByText('panel-ranking')).toBeInTheDocument();
      const aside = screen.getByRole('complementary');
      expect(within(aside).getByText('¿Cómo cuenta tu voto?')).toBeInTheDocument();
      expect(within(aside).getByText(/Tu orden se compara con el de los demás evaluadores/)).toBeInTheDocument();
      const progress = within(aside).getByRole('heading', { level: 2, name: 'Tu progreso' }).closest('section')!;
      expect(within(progress).getByText('Pendiente')).toBeInTheDocument();
      first.unmount();

      getAssignment.mockResolvedValue({ ...assignment, is_completed: true });
      renderPage(signedIn());
      expect(await screen.findByRole('heading', { level: 2, name: 'Tu ranking está enviado' })).toBeInTheDocument();
      expect(screen.getByText('Ranking enviado')).toBeInTheDocument();
    });

    it('error al cargar la asignación con reintento', async () => {
      getEvent.mockResolvedValue(voting);
      getAssignment.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(null);
      renderPage(signedIn());
      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus propuestas asignadas.');
      expect(screen.queryByText('panel-ranking')).toBeNull();
      userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
      expect(await screen.findByRole('heading', { level: 2, name: 'No participas en esta votación' })).toBeInTheDocument();
    });
  });

  describe('Resultados y cancelado', () => {
    beforeEach(() => {
      getEvent.mockResolvedValue(resultsEv);
    });

    it('TS-67: resultados públicos', async () => {
      renderPage(guest);
      expect(await screen.findByRole('heading', { level: 2, name: 'Así votó la comunidad' })).toBeInTheDocument();
      expect(screen.getByText('Finalizado · resultados publicados')).toBeInTheDocument();
      expect(await screen.findByText('5 participantes · 12 evaluaciones')).toBeInTheDocument();
      expect(screen.getByText(/Finalizó el 4 oct 2026/)).toBeInTheDocument();
      const podium = screen.getByRole('list', { name: 'Podio' });
      expect(within(podium).getAllByRole('listitem')).toHaveLength(3);
      const table = screen.getByRole('table', { name: 'Ranking completo' });
      expect(within(table).getAllByRole('row')).toHaveLength(3);
      expect(within(table).getByText('4,0 pts')).toBeInTheDocument();
      expect(screen.getByText(/El puntaje combina los rankings/)).toBeInTheDocument();
      expect(screen.queryByText('Tú')).toBeNull();
      expect(screen.queryByText('Después')).toBeNull();
      expect(await screen.findByText('¿Te gustó?')).toBeInTheDocument();
      expect(screen.getByText('Hay 3 eventos con inscripción abierta ahora.')).toBeInTheDocument();
      expect(screen.getByText('Crea tu cuenta para participar en el próximo.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Ver eventos' })).toHaveAttribute('href', '/events');
      expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/register');
      expect(listEvents).toHaveBeenCalledWith({ stage: 'participation', limit: 1 });
    });

    it('TS-68: con sesión se resalta la fila propia', async () => {
      renderPage(signedIn());
      const table = await screen.findByRole('table', { name: 'Ranking completo' });
      const row = within(table).getByText('Ana Pérez').closest('tr')!;
      expect(row).toHaveClass('ui-data-table__row--highlighted');
      expect(within(row).getByText('Tú')).toBeInTheDocument();
      expect(await screen.findByText('¿Te gustó?')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Crear cuenta' })).toBeNull();
    });

    it('TS-69: sin eventos abiertos o con falla no hay banner', async () => {
      listEvents.mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 1, total: 0, totalPages: 0 },
        stageCounts: { participation: 0, voting: 0, results: 2 },
      });
      const first = renderPage(guest);
      await screen.findByRole('table', { name: 'Ranking completo' });
      await waitFor(() => expect(listEvents).toHaveBeenCalled());
      expect(screen.queryByText('¿Te gustó?')).toBeNull();
      expect(screen.queryByRole('link', { name: 'Ver eventos' })).toBeNull();
      first.unmount();

      listEvents.mockRejectedValue(new TypeError('Failed to fetch'));
      renderPage(guest);
      await screen.findByRole('table', { name: 'Ranking completo' });
      expect(screen.queryByText('¿Te gustó?')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('TS-70: resultados sin ranking', async () => {
      getResults.mockRejectedValue(
        new ApiError({ status: 404, body: { error: 'RESULTS_NOT_CALCULATED', message: 'x' } })
      );
      renderPage(guest);
      expect(await screen.findByText('Los resultados todavía no están disponibles.')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Así votó la comunidad' })).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Podio' })).toBeNull();
      expect(screen.queryByRole('table')).toBeNull();
      expect(screen.queryByText(/evaluaciones/)).toBeNull();
    });

    it('TS-71: cancelado', async () => {
      getEvent.mockResolvedValue({ ...ev, is_cancelled: true });
      const first = renderPage(signedIn());
      expect(await screen.findByRole('heading', { level: 2, name: 'Este evento fue cancelado' })).toBeInTheDocument();
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
      const card = screen.getByRole('heading', { level: 2, name: 'Este evento fue cancelado' }).closest('section')!;
      expect(within(card).queryAllByRole('button')).toHaveLength(0);
      expect(screen.queryByText('Después')).toBeNull();
      first.unmount();

      getEvent.mockResolvedValue({ ...ev, stage: 'voting', is_cancelled: true });
      renderPage(signedIn());
      expect(await screen.findByRole('heading', { level: 2, name: 'Este evento fue cancelado' })).toBeInTheDocument();
    });
  });
});
