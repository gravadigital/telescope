import { apiRequest, checkApiHealth, downloadFile, fetchFile, saveBlob, getErrorCode, API_CONFIG } from "../config/api";
import {
  Event,
  EventCreateInput,
  EventUpdate,
  EventListItem,
  EventListPage,
  EventStage,
  MyEvent,
  User,
  EventParticipant,
  VotingConfiguration,
  VotingConfigInput,
  StageUpdateResult,
  ReminderType,
  ReminderResult,
  AnonymousAssignment,
  RankingVote,
  VotingResults,
  VotingStatistics,
  Attachment
} from "../types";
import { automaticEventDates } from "../domain/eventForm";
import { VotingConfigPreview } from "../domain/voting";

// Mantener en sync con `neutralExtensions` de api/internal/handlers/attachment_handler.go
export const NEUTRAL_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export const extensionForMime = (mimeType: string): string =>
  NEUTRAL_EXTENSIONS[mimeType] ?? 'bin';

export const neutralFilename = (position: number, mimeType: string): string =>
  `propuesta-${position}.${extensionForMime(mimeType)}`;


interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "participant" | "organizer" | "admin";
  joined_event_ids?: string[];
  created_event_ids?: string[];
}

// Mapea el detalle de la api (`EventDetail`) al tipo del front.
// `organizer` nunca se inventa: la api ya cae al nombre del autor.
const toEvent = (raw: any): Event => ({
  id: raw.id,
  title: raw.name || raw.title,
  description: raw.description,
  date: raw.start_date || raw.date,
  organizer: raw.organizer ?? '',
  status: raw.status || "active",
  stage: raw.stage || "participation",
  participant_ids: raw.participant_ids || [],
  voteCount: raw.vote_count || { yes: 0, maybe: 0, no: 0 },
  attachmentCount: raw.attachment_count || 0,
  max_participants: raw.max_participants,
  creator_id: raw.author_id || raw.creator_id,
  created_at: raw.created_at,
  updated_at: raw.updated_at,
  // Fechas estimativas (S-003)
  participation_estimated_end_date: raw.participation_estimated_end_date || null,
  voting_estimated_end_date: raw.voting_estimated_end_date || null,
  is_paused: raw.is_paused || false,
  is_cancelled: raw.is_cancelled || false
});

export const EventService = {
  async listEvents(params: {
    q?: string;
    stage?: EventStage;
    page?: number;
    limit?: number;
  }): Promise<EventListPage> {
    const query = new URLSearchParams();
    const q = params.q?.trim();
    if (q) query.append("q", q);
    if (params.stage) query.append("stage", params.stage);
    if (params.page !== undefined) query.append("page", String(params.page));
    if (params.limit !== undefined) query.append("limit", String(params.limit));
    const qs = query.toString();

    try {
      const response = await apiRequest<any>(`${API_CONFIG.ENDPOINTS.EVENTS}${qs ? `?${qs}` : ""}`);
      if (!response || !Array.isArray(response.data)) {
        throw new Error("Invalid response");
      }
      const items: EventListItem[] = response.data.map((e: any) => {
        const participantIds: string[] = e.participant_ids ?? [];
        return {
          id: e.id,
          name: e.name,
          description: e.description,
          stage: e.stage,
          author_id: e.author_id,
          max_participants: e.max_participants ?? null,
          participants_count: e.participants_count ?? participantIds.length,
          participant_ids: participantIds,
          participation_estimated_end_date: e.participation_estimated_end_date ?? null,
          voting_estimated_end_date: e.voting_estimated_end_date ?? null,
          is_paused: e.is_paused ?? false,
          is_cancelled: e.is_cancelled ?? false,
          created_at: e.created_at,
        };
      });
      const pagination = response.pagination ?? {};
      return {
        items,
        pagination: {
          page: pagination.page ?? 1,
          limit: pagination.limit ?? items.length,
          total: pagination.total ?? items.length,
          totalPages: pagination.total_pages ?? 1,
        },
        stageCounts: response.stage_counts ?? { participation: 0, voting: 0, results: 0 },
      };
    } catch (error) {
      console.error("Failed to fetch events from API:", error);
      throw error;
    }
  },

  async createEvent(input: EventCreateInput, now?: Date): Promise<{ id: string }> {
    // El autor sale del JWT: no se envía author_id.
    const response = await apiRequest<{ event: { id: string } }>(API_CONFIG.ENDPOINTS.EVENTS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, ...automaticEventDates(now) }),
    });
    return { id: response.event.id };
  },

  async updateEvent(eventId: string, changes: EventUpdate): Promise<Event> {
    const response = await apiRequest<{ data: any }>(`${API_CONFIG.ENDPOINTS.EVENTS}/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    return toEvent(response.data);
  },

  async getEventById(id: string): Promise<Event | null> {
    try {
      const response = await apiRequest<{ data: any }>(`${API_CONFIG.ENDPOINTS.EVENTS}/${id}`);

      if (!response || !response.data) {
        return null;
      }

      return toEvent(response.data);
    } catch (error) {
      console.error("Failed to fetch event by ID from API:", error);
      throw error;
    }
  },

  async updateEventStage(
    eventId: string,
    newStage: EventStage,
    estimatedEndDate?: string,
    votingConfig?: VotingConfigInput
  ): Promise<StageUpdateResult> {
    const response = await apiRequest<{
      data: { stage: EventStage };
      voting?: StageUpdateResult["voting"];
    }>(API_CONFIG.ENDPOINTS.EVENT_STAGE(eventId), {
      method: "PATCH",
      body: JSON.stringify({
        stage: newStage,
        ...(estimatedEndDate && { estimated_end_date: estimatedEndDate }),
        ...(votingConfig && { voting_config: votingConfig }),
      }),
    });
    return {
      stage: response.data.stage,
      ...(response.voting && { voting: response.voting }),
    };
  },

  /** Envía un recordatorio a los destinatarios pendientes (S-016). */
  async sendReminder(eventId: string, type: ReminderType): Promise<ReminderResult> {
    const response = await apiRequest<{ data: ReminderResult }>(
      API_CONFIG.ENDPOINTS.EVENT_REMINDERS(eventId),
      { method: "POST", body: JSON.stringify({ type }) }
    );
    return { type: response.data.type, recipients_count: response.data.recipients_count };
  },

  /**
   * Update estimated end date for a specific stage (S-003)
   * @param eventId - Event ID
   * @param stage - 'participation' or 'voting'
   * @param estimatedEndDate - New date in YYYY-MM-DD format
   */
  async updateEstimatedEndDate(
    eventId: string,
    stage: 'participation' | 'voting',
    estimatedEndDate: string
  ): Promise<{ previousDate: string | null; newDate: string }> {
    try {
      const response = await apiRequest<{
        data: {
          event_id: string;
          stage: string;
          estimated_end_date: string;
          previous_date: string;
        };
        message: string;
        code: string;
      }>(
        API_CONFIG.ENDPOINTS.EVENT_ESTIMATED_DATE(eventId),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stage,
            estimated_end_date: estimatedEndDate
          }),
        }
      );

      return {
        previousDate: response.data.previous_date || null,
        newDate: response.data.estimated_end_date
      };
    } catch (error) {
      console.error("❌ Failed to update estimated end date:", error);
      throw error;
    }
  },

  async pauseEvent(eventId: string): Promise<{ is_paused: boolean }> {
    try {
      const response = await apiRequest<{ data: { is_paused: boolean }; message: string; code: string }>(
        API_CONFIG.ENDPOINTS.EVENT_PAUSE(eventId),
        { method: "PATCH" }
      );
      return { is_paused: response.data.is_paused };
    } catch (error) {
      console.error("❌ Failed to toggle event pause:", error);
      throw error;
    }
  },

  async registerForEvent(eventId: string, participantName: string, participantEmail: string): Promise<void> {
    try {
      await apiRequest<any>(
        API_CONFIG.ENDPOINTS.EVENT_REGISTER(eventId),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participant_name: participantName,
            participant_email: participantEmail
          }),
        }
      );
    } catch (error) {
      console.error("❌ Failed to register for event:", error);
      throw error;
    }
  },

  /** Participantes con fecha de inscripción (O-08). Solo `role === 'participant'`. */
  async getParticipants(eventId: string): Promise<EventParticipant[]> {
    try {
      const response = await apiRequest<{ data: { participants: any[] } }>(
        API_CONFIG.ENDPOINTS.EVENT_PARTICIPANTS(eventId)
      );
      const participants = response.data?.participants || [];
      return participants
        .filter(p => p.role === 'participant')
        .map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          created_at: p.created_at,
        }));
    } catch (error) {
      console.error("❌ Failed to fetch participants:", error);
      throw error;
    }
  }
};

export const UserService = {
  async createUser(userData: CreateUserRequest): Promise<{ user: User; token: string }> {
    try {
      const response = await apiRequest<{ message: string; user: ApiUser; token: string }>(
        API_CONFIG.ENDPOINTS.USERS,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        }
      );

      const apiUser = response.user;
      return {
        user: {
          id: apiUser.id,
          name: apiUser.name,
          email: apiUser.email,
          role: apiUser.role,
          joinedEventIDs: apiUser.joined_event_ids || [],
          createdEventIDs: apiUser.created_event_ids || []
        },
        token: response.token
      };
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error;
    }
  },

  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await apiRequest<ApiUser>(`${API_CONFIG.ENDPOINTS.USERS}/${id}`);
      
      if (!response) {
        return null;
      }

      return {
        id: response.id,
        name: response.name,
        email: response.email,
        role: response.role,
        joinedEventIDs: response.joined_event_ids || [],
        createdEventIDs: response.created_event_ids || []
      };
    } catch (error) {
      console.error("Failed to fetch user by ID:", error);
      return null;
    }
  },

  async authenticateUser(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      const response = await apiRequest<{ message: string; user: ApiUser; token: string }>(
        API_CONFIG.ENDPOINTS.USER_AUTHENTICATE,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const apiUser = response.user;
      return {
        user: {
          id: apiUser.id,
          name: apiUser.name,
          email: apiUser.email,
          role: apiUser.role,
          joinedEventIDs: apiUser.joined_event_ids || [],
          createdEventIDs: apiUser.created_event_ids || []
        },
        token: response.token
      };
    } catch (error) {
      console.error("Failed to authenticate user:", error);
      throw error;
    }
  },

  async forgotPassword(email: string): Promise<void> {
    await apiRequest<{ message: string }>(API_CONFIG.ENDPOINTS.USER_FORGOT_PASSWORD, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiRequest<{ message: string }>(API_CONFIG.ENDPOINTS.USER_RESET_PASSWORD, {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  },

  async getMyEvents(userId: string): Promise<MyEvent[]> {
    try {
      const response = await apiRequest<any>(
        `${API_CONFIG.ENDPOINTS.USERS}/${userId}/events?scope=all`
      );
      if (!response || !Array.isArray(response.data)) {
        throw new Error("Invalid response");
      }
      return response.data.map((e: any): MyEvent => ({
        id: e.id,
        name: e.name,
        description: e.description,
        stage: e.stage,
        author_id: e.author_id,
        max_participants: e.max_participants ?? null,
        participants_count: e.participants_count ?? 0,
        participation_estimated_end_date: e.participation_estimated_end_date ?? null,
        voting_estimated_end_date: e.voting_estimated_end_date ?? null,
        is_paused: e.is_paused ?? false,
        is_cancelled: e.is_cancelled ?? false,
        created_at: e.created_at,
        role: e.role,
        my_status: e.my_status ?? null,
      }));
    } catch (error) {
      console.error("Failed to fetch my events:", error);
      throw error;
    }
  },

  async getUserEvents(userId: string): Promise<string[]> {
    try {
      const response = await apiRequest<{ data: any[] }>(
        `${API_CONFIG.ENDPOINTS.USERS}/${userId}/events`
      );

      if (!response || !response.data || !Array.isArray(response.data)) {
        console.warn("Invalid response format from getUserEvents:", response);
        return [];
      }

      console.log("✅ User events loaded from backend:", response.data.length);
      
      // Return only the event IDs
      return response.data.map(event => event.id);
    } catch (error) {
      console.error("Failed to fetch user events:", error);
      throw error;
    }
  }
};

export const AttachmentService = {
  async uploadAttachment(eventId: string, participantId: string, file: File, description?: string): Promise<Attachment> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (description) {
        formData.append("description", description);
      }

      const response = await apiRequest<{
        data: {
          id: string;
          filename: string;
          size: number;
          mime_type: string;
          description?: string;
          uploaded_at: string;
        };
      }>(API_CONFIG.ENDPOINTS.UPLOAD_ATTACHMENT(eventId, participantId), {
        method: "POST",
        body: formData,
      });

      // El 201 no trae la forma de `Attachment` del listado: se mapea acá.
      const d = response.data;
      return {
        id: d.id,
        event_id: eventId,
        participant_id: participantId,
        original_name: d.filename,
        stored_name: '',
        file_size: d.size,
        mime_type: d.mime_type,
        description: d.description || undefined,
        uploaded_at: d.uploaded_at,
      };
    } catch (error) {
      console.error("Failed to upload attachment:", error);
      throw error;
    }
  },

  async getEventAttachments(eventId: string): Promise<Attachment[]> {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.EVENT_ATTACHMENTS(eventId);
      const response = await apiRequest<{ data: Attachment[] }>(endpoint);
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch event attachments:", error);
      throw error;
    }
  },

  async downloadAttachment(attachmentId: string, filename: string): Promise<void> {
    await downloadFile(API_CONFIG.ENDPOINTS.DOWNLOAD_ATTACHMENT(attachmentId), filename);
  },

  /**
   * Abre una propuesta asignada al evaluador (S-017). La pestaña (`target`) la abre el
   * componente en el click, de forma sincrónica, para que el navegador no la bloquee.
   * Sin pestaña se descarga con nombre neutro (anonimato).
   */
  async openAssignedAttachment(
    attachmentId: string,
    position: number,
    mimeType: string,
    target: Window | null
  ): Promise<void> {
    try {
      const blob = await fetchFile(API_CONFIG.ENDPOINTS.DOWNLOAD_ATTACHMENT(attachmentId));
      if (!target) {
        saveBlob(blob, neutralFilename(position, mimeType));
        return;
      }
      const url = window.URL.createObjectURL(blob);
      target.location.href = url;
      // Se revoca más tarde para que la pestaña llegue a cargarlo.
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      target?.close();
      throw error;
    }
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    await apiRequest(API_CONFIG.ENDPOINTS.DELETE_ATTACHMENT(attachmentId), {
      method: "DELETE",
    });
  }
};

// ========================================
// Distributed Voting Service
// ========================================

export const DistributedVotingService = {
  /** Vista previa del reparto para el organizador (S-016). */
  async getVotingConfigPreview(eventId: string): Promise<VotingConfigPreview> {
    const response = await apiRequest<{ data: VotingConfigPreview }>(
      API_CONFIG.ENDPOINTS.VOTING_CONFIG_PREVIEW(eventId)
    );
    return response.data;
  },

  /** Configuración aplicada; `null` si el evento aún no abrió la votación. */
  async getVotingConfig(eventId: string): Promise<VotingConfiguration | null> {
    try {
      const response = await apiRequest<{ data: VotingConfiguration }>(
        API_CONFIG.ENDPOINTS.VOTING_CONFIG(eventId)
      );
      return response.data;
    } catch (err) {
      if (getErrorCode(err) === 'CONFIG_NOT_FOUND') return null;
      throw err;
    }
  },

  /**
   * Obtener la asignación de un participante específico
   */
  async getParticipantAssignment(
    eventId: string,
    participantId: string
  ): Promise<AnonymousAssignment | null> {
    try {
      const response = await apiRequest<{
        assignment: AnonymousAssignment;
        event_name: string;
        participant_id: string;
      }>(API_CONFIG.ENDPOINTS.GET_ASSIGNMENT(eventId, participantId));
      return response.assignment;
    } catch (error) {
      // Inscripto sin propuesta: no es un error, simplemente no evalúa
      if (getErrorCode(error) === 'NO_ASSIGNMENT') {
        return null;
      }
      throw error;
    }
  },

  /**
   * Enviar votos de ranking de un participante
   */
  async submitRankingVotes(
    eventId: string,
    participantId: string,
    assignmentId: string,
    rankings: RankingVote[]
  ): Promise<{ replaced: boolean }> {
    const response = await apiRequest<{ message: string; replaced?: boolean }>(
      API_CONFIG.ENDPOINTS.SUBMIT_RANKING_VOTES(eventId, participantId),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: assignmentId,
          rankings
        })
      }
    );
    return { replaced: response.replaced === true };
  },

  /**
   * Obtener resultados calculados con Modified Borda Count
   * (lectura pura, no recalcula; público aunque no haya sesión)
   */
  async getDistributedResults(eventId: string): Promise<VotingResults> {
    try {
      const response = await apiRequest<{ data: VotingResults }>(
        API_CONFIG.ENDPOINTS.DISTRIBUTED_RESULTS(eventId)
      );
      console.log('✅ Distributed voting results loaded');
      return response.data;
    } catch (error) {
      console.error('Failed to get distributed results:', error);
      throw error;
    }
  },

  /**
   * Recalcular y guardar resultados (requiere sesión). Solo como fallback para
   * eventos que entraron a la etapa results sin resultados guardados.
   */
  async recalculateDistributedResults(eventId: string): Promise<VotingResults> {
    const response = await apiRequest<{ data: VotingResults }>(
      `${API_CONFIG.ENDPOINTS.DISTRIBUTED_RESULTS(eventId)}/recalculate`,
      { method: 'POST' }
    );
    return response.data;
  },

  /**
   * Obtener estadísticas de votación del evento
   */
  async getVotingStatistics(eventId: string): Promise<VotingStatistics> {
    try {
      const response = await apiRequest<{ data: VotingStatistics }>(
        API_CONFIG.ENDPOINTS.VOTING_STATISTICS(eventId)
      );
      console.log('✅ Voting statistics loaded');
      return response.data;
    } catch (error) {
      console.error('Failed to get voting statistics:', error);
      throw error;
    }
  }
};

// ========================================
// Vote Draft Service (S-005)
// ========================================

export interface DraftRanking {
  attachment_id: string;
  rank: number;
}

export interface VoteDraftResponse {
  assignment_id: string;
  participant_id: string;
  rankings: DraftRanking[];
  updated_at: string;
}

export const VoteDraftService = {
  /**
   * Restore a participant's saved draft rankings. Returns null if no draft exists yet.
   */
  async getDraft(
    eventId: string,
    participantId: string
  ): Promise<VoteDraftResponse | null> {
    try {
      const response = await apiRequest<{ data: VoteDraftResponse }>(
        API_CONFIG.ENDPOINTS.VOTE_DRAFT(eventId, participantId)
      );
      return response.data;
    } catch (err) {
      const code = getErrorCode(err);
      if (code === 'DRAFT_NOT_FOUND' || code === 'ASSIGNMENT_NOT_FOUND') {
        return null;
      }
      throw err;
    }
  },

  /**
   * Save (upsert) the participant's current ranking selections as a draft.
   */
  async saveDraft(
    eventId: string,
    participantId: string,
    rankings: DraftRanking[]
  ): Promise<void> {
    await apiRequest(
      API_CONFIG.ENDPOINTS.VOTE_DRAFT(eventId, participantId),
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankings }),
      }
    );
  },
};

export const ApiHealthService = {
  async checkHealth(): Promise<boolean> {
    return checkApiHealth();
  }
};

// ========================================
// Google OAuth Service (E-002.S-03)
// ========================================

// Backend returns { id, email, username } (not name)
interface GoogleApiUser {
  id: string;
  email: string;
  username: string;
}

interface GoogleVerifyResponse {
  status: 'existing_user' | 'new_user';
  token?: string;
  user?: GoogleApiUser;
  profile?: { suggested_name: string; email: string };
}

interface GoogleRegisterResponse {
  token: string;
  user: GoogleApiUser;
}

export const GoogleAuthService = {
  async verify(token: string): Promise<GoogleVerifyResponse> {
    const response = await apiRequest<GoogleVerifyResponse>(
      API_CONFIG.ENDPOINTS.GOOGLE_VERIFY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }
    );
    console.log('✅ Google verify response:', response.status);
    return response;
  },

  async register(token: string, username: string): Promise<{ user: User; token: string }> {
    const response = await apiRequest<GoogleRegisterResponse>(
      API_CONFIG.ENDPOINTS.GOOGLE_REGISTER,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username }),
      }
    );
    console.log('✅ Google register successful:', response.user.username);
    const apiUser = response.user;
    return {
      user: {
        id: apiUser.id,
        name: apiUser.username,
        email: apiUser.email,
        role: 'participant',
        joinedEventIDs: [],
        createdEventIDs: [],
      },
      token: response.token,
    };
  },
};
