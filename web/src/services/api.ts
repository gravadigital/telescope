import { apiRequest, checkApiHealth, API_CONFIG } from "../config/api";
import {
  Event,
  User,
  VotingConfiguration,
  Assignment,
  RankingVote,
  VotingResults,
  VotingStatistics
} from "../types";

interface CreateEventRequest {
  name: string;
  description: string;
  date: string;
  organizer?: string;
  author_id?: string; // Optional: send user ID as author
  maxParticipants?: number; // Optional: max participants (1-100, default: 20)
}

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

export const EventService = {
  async getAllEvents(): Promise<Event[]> {
    try {
      // Request more events to avoid pagination issues (100 should be enough for now)
      const response = await apiRequest<{ data: any[] }>(`${API_CONFIG.ENDPOINTS.EVENTS}?limit=100`);
      
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.warn("Invalid response format from API:", response);
        throw new Error("No data received");
      }
      
      console.log("✅ Events loaded from backend:", response.data.length);
      
      const events = response.data.map(event => ({
        id: event.id,
        title: event.name || event.title,
        description: event.description,
        date: event.start_date || event.date,
        organizer: event.organizer || "Organizador por determinar",
        status: event.is_paused
          ? "paused" as const
          : event.is_cancelled
            ? "cancelled" as const
            : event.status === "completed"
              ? "completed" as const
              : "active" as const,
        stage: (event.stage as "creation" | "participation" | "voting" | "results") || "participation",
        participant_ids: event.participant_ids || [],
        voteCount: {
          yes: 0,
          maybe: 0,
          no: 0
        },
        attachmentCount: event.attachment_count || 0,
        max_participants: event.max_participants,
        creator_id: event.author_id,
        created_at: event.created_at,
        updated_at: event.updated_at,
        is_paused: event.is_paused || false,
        is_cancelled: event.is_cancelled || false
      }));
      
      return events;
    } catch (error) {
      console.warn("⚠️ Failed to fetch events from API, using fallback:", error);
      
      // Fallback con los IDs reales del backend para que funcione en modo offline
      return [
        {
          id: "68a94135-77f9-42a8-9b43-fea50d6ca524",
          title: "Asignación de Tiempo de Telescopio Q2 2025",
          description: "Evaluación de propuestas para tiempo de telescopio destinado al estudio de galaxias con corrimiento al rojo z > 2.",
          date: "2025-09-23",
          organizer: "Sistema Telescopio",
          status: "active" as const,
          stage: "voting" as const,
          participant_ids: [],
          voteCount: { yes: 5, maybe: 2, no: 0 },
          attachmentCount: 3,
          max_participants: 20
        },
        {
          id: "660e8400-e29b-41d4-a716-446655440000",
          title: "Distributed Telescope Time Allocation 2026",
          description: "Annual telescope time allocation using distributed voting system based on Merrifield & Saari (2009) mathematical framework for fair and efficient proposal evaluation.",
          date: "2026-01-15",
          organizer: "Sistema Telescopio",
          status: "active" as const,
          stage: "results" as const,
          participant_ids: [],
          voteCount: { yes: 8, maybe: 1, no: 0 },
          attachmentCount: 5,
          max_participants: 20
        }
      ];
    }
  },

  async createEvent(eventData: CreateEventRequest): Promise<Event> {
    try {
      console.log("Creating event with data:", eventData);

      const startDate = new Date(eventData.date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);

      // NO enviar author_id - el backend lo toma del token JWT automáticamente
      const requestBody: Record<string, any> = {
        name: eventData.name,
        description: eventData.description,
        start_date: eventData.date,
        end_date: endDate.toISOString().split("T")[0],
        organizer: eventData.organizer || ""
      };

      // Agregar max_participants si se especificó
      if (eventData.maxParticipants && eventData.maxParticipants >= 1 && eventData.maxParticipants <= 100) {
        requestBody.max_participants = eventData.maxParticipants;
      }

      console.log("Sending request body:", requestBody);

      const response = await apiRequest<{ message: string; event: any; code: string }>(
        API_CONFIG.ENDPOINTS.EVENTS,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log("API response:", response);

      // El backend devuelve { event: {...}, message, code }
      const backendEvent = response.event;
      
      if (!backendEvent) {
        throw new Error('Backend did not return event data');
      }
      
      return {
        id: backendEvent.id,
        title: backendEvent.name || backendEvent.title,
        description: backendEvent.description,
        date: backendEvent.start_date || backendEvent.date,
        organizer: eventData.organizer || backendEvent.organizer || "Organizador por determinar",
        status: "active",
        stage: backendEvent.stage || "creation" as const,
        participant_ids: [],
        voteCount: { yes: 0, maybe: 0, no: 0 },
        attachmentCount: 0,
        max_participants: backendEvent.max_participants || eventData.maxParticipants || 20,
        creator_id: backendEvent.author_id
      };
    } catch (error) {
      console.error("Failed to create event with API:", error);
      throw error;
    }
  },

  async getEventById(id: string): Promise<Event | null> {
    try {
      const response = await apiRequest<{ data: any }>(`${API_CONFIG.ENDPOINTS.EVENTS}/${id}`);
      
      if (!response || !response.data) {
        throw new Error("No response from API");
      }

      const event = response.data;
      console.log("✅ Event details loaded from backend:", event.id);

      return {
        id: event.id,
        title: event.name || event.title,
        description: event.description,
        date: event.start_date || event.date,
        organizer: event.organizer || "Organizador por determinar",
        status: event.status || "active",
        stage: event.stage || "participation",
        participant_ids: event.participant_ids || [],
        voteCount: event.vote_count || { yes: 0, maybe: 0, no: 0 },
        attachmentCount: event.attachment_count || 0,
        max_participants: event.max_participants,
        creator_id: event.author_id || event.creator_id,
        created_at: event.created_at,
        updated_at: event.updated_at,
        // Fechas estimativas (S-003)
        participation_estimated_end_date: event.participation_estimated_end_date || null,
        voting_estimated_end_date: event.voting_estimated_end_date || null,
        is_paused: event.is_paused || false,
        is_cancelled: event.is_cancelled || false
      };
    } catch (error) {
      console.warn("⚠️ Failed to fetch event by ID from API, checking fallback data:", error);
      
      // Try to find event in the fallback/demo data
      try {
        const allEvents = await this.getAllEvents();
        const event = allEvents.find(e => e.id === id);
        
        if (event) {
          console.log("📦 Found event in fallback data:", event.title);
          return event;
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
      
      console.error("❌ Event not found:", id);
      return null;
    }
  },

  async updateEventStage(
    eventId: string,
    newStage: string,
    estimatedEndDate?: string
  ): Promise<Event> {
    try {
      const body: { stage: string; estimated_end_date?: string } = {
        stage: newStage
      };

      if (estimatedEndDate) {
        body.estimated_end_date = estimatedEndDate;
      }

      const response = await apiRequest<{ data: any }>(
        API_CONFIG.ENDPOINTS.EVENT_STAGE(eventId),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      // Map response to Event type
      const event = response.data;
      return {
        id: event.id,
        title: event.name || event.title,
        description: event.description,
        date: event.start_date || event.date,
        stage: event.stage,
        participation_estimated_end_date: event.participation_estimated_end_date,
        voting_estimated_end_date: event.voting_estimated_end_date,
        creator_id: event.author_id,
        updated_at: event.updated_at
      } as Event;
    } catch (error) {
      console.error("Failed to update event stage:", error);
      throw error;
    }
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
      console.log('📅 Updating estimated end date:', {
        eventId,
        stage,
        estimatedEndDate
      });

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

      console.log('✅ Estimated end date updated:', response.data);

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
      console.log('🎫 Registering for event:', {
        eventId,
        participantName,
        participantEmail
      });

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

      console.log('✅ Registration successful');
    } catch (error) {
      console.error("❌ Failed to register for event:", error);
      throw error;
    }
  },

  async getEventParticipants(eventId: string): Promise<User[]> {
    try {
      const response = await apiRequest<{ count: number; data: { participants: any[] } }>(
        API_CONFIG.ENDPOINTS.EVENT_PARTICIPANTS(eventId)
      );

      console.log('📊 Participants API Response:', {
        fullResponse: response,
        hasData: !!response.data,
        hasParticipants: !!response.data?.participants,
        participantsCount: response.data?.participants?.length || 0,
        count: response.count
      });

      // El backend devuelve { count, data: { event, participants } }
      const participants = response.data?.participants || [];

      console.log('✅ Parsed participants:', participants);

      return participants.map(participant => ({
        id: participant.id,
        name: participant.name,
        email: participant.email,
        role: participant.role || "participant",
        joinedEventIDs: participant.joined_event_ids || [],
        createdEventIDs: participant.created_event_ids || []
      }));
    } catch (error) {
      console.error("❌ Failed to fetch event participants:", error);
      return [];
    }
  },

  async getShareableEventInfo(eventId: string): Promise<any> {
    try {
      const response = await apiRequest<{ data: any }>(
        API_CONFIG.ENDPOINTS.EVENT_SHARE(eventId)
      );
      
      console.log('✅ Shareable event info loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to fetch shareable event info:", error);
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
      return [];
    }
  }
};

export const AttachmentService = {
  async uploadAttachment(eventId: string, participantId: string, file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiRequest<any>(
        API_CONFIG.ENDPOINTS.UPLOAD_ATTACHMENT(eventId, participantId),
        {
          method: "POST",
          body: formData,
        }
      );

      console.log('✅ Attachment uploaded:', response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to upload attachment:", error);
      throw error;
    }
  },

  async getEventAttachments(eventId: string): Promise<any[]> {
    try {
      console.log('🔍 Fetching attachments for event:', eventId);
      const endpoint = API_CONFIG.ENDPOINTS.EVENT_ATTACHMENTS(eventId);
      console.log('📡 Endpoint:', endpoint);
      
      const response = await apiRequest<{ data: any[] }>(endpoint);
      console.log('✅ Raw attachment response:', response);
      
      return response.data || [];
    } catch (error) {
      console.error("❌ Failed to fetch event attachments:", error);
      throw error;
    }
  }
};

export const VoteService = {
  async submitVote(eventId: string, userId: string, voteType: "yes" | "maybe" | "no"): Promise<any> {
    try {
      const response = await apiRequest<any>(
        `/api/v1/votes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_id: eventId,
            user_id: userId,
            vote_type: voteType
          }),
        }
      );

      return response;
    } catch (error) {
      console.error("Failed to submit vote:", error);
      throw error;
    }
  },

  async getEventVotes(eventId: string): Promise<any[]> {
    try {
      const response = await apiRequest<{ data: any[] }>(`/api/v1/votes?event_id=${eventId}`);
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch event votes:", error);
      return [];
    }
  }
};

// ========================================
// Distributed Voting Service
// ========================================

export const DistributedVotingService = {
  /**
   * Crear configuración de votación para un evento
   */
  async createVotingConfig(
    eventId: string,
    config: Partial<VotingConfiguration>
  ): Promise<VotingConfiguration> {
    try {
      const response = await apiRequest<{ data: VotingConfiguration }>(
        API_CONFIG.ENDPOINTS.VOTING_CONFIG(eventId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        }
      );
      console.log('✅ Voting configuration created:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create voting configuration:', error);
      throw error;
    }
  },

  /**
   * Generar asignaciones distribuidas para todos los participantes
   */
  async generateAssignments(eventId: string): Promise<void> {
    try {
      const response = await apiRequest<{ 
        data: { 
          assignments_count: number;
          total_participants: number;
          total_attachments: number;
          total_evaluations: number;
        };
        message: string;
      }>(
        API_CONFIG.ENDPOINTS.GENERATE_ASSIGNMENTS(eventId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      console.log('✅ Assignments generated:', response.data.assignments_count, 'assignments for', response.data.total_participants, 'participants');
    } catch (error) {
      console.error('Failed to generate assignments:', error);
      throw error;
    }
  },

  /**
   * Obtener la asignación de un participante específico
   */
  async getParticipantAssignment(
    eventId: string,
    participantId: string
  ): Promise<Assignment> {
    try {
      const response = await apiRequest<{ assignment: Assignment }>(
        API_CONFIG.ENDPOINTS.GET_ASSIGNMENT(eventId, participantId)
      );
      console.log('✅ Assignment loaded for participant:', participantId);
      return response.assignment;
    } catch (error) {
      console.error('Failed to get participant assignment:', error);
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
  ): Promise<void> {
    try {
      await apiRequest<{ message: string }>(
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
      console.log('✅ Ranking votes submitted successfully');
    } catch (error) {
      console.error('Failed to submit ranking votes:', error);
      throw error;
    }
  },

  /**
   * Obtener resultados calculados con Modified Borda Count
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
    } catch (err: any) {
      if (err?.message?.includes('404') || err?.message?.includes('DRAFT_NOT_FOUND')) {
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
