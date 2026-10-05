
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'participant' | 'organizer' | 'admin' | 'creator';
  joinedEventIDs: string[];
  createdEventIDs: string[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  stage: 'creation' | 'participation' | 'voting' | 'results';
  date: string;
  organizer?: string;
  shareable_link?: string;
  status?: 'active' | 'cancelled' | 'completed' | 'paused';
  is_paused?: boolean;
  is_cancelled?: boolean;
  participant_ids?: string[];
  voteCount?: {
    yes: number;
    maybe: number;
    no: number;
  };
  attachmentCount?: number;
  max_participants?: number;
  created_at?: string;
  updated_at?: string;
  creator_id?: string;
  
  // Fechas estimativas de cierre de etapas (S-003)
  participation_estimated_end_date?: string | null;
  voting_estimated_end_date?: string | null;
}

// Type alias para reutilizar en otros lugares
export type EventStage = Event['stage'];

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
  joinEvent: (eventId: string) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface ApiConfig {
  BASE_URL: string;
  ENDPOINTS: {
    EVENTS: string;
    USERS: string;
    USER_AUTHENTICATE: string;
    EVENT_REGISTER: (eventId: string) => string;
    EVENT_STAGE: (eventId: string) => string;
    EVENT_PARTICIPANTS: (eventId: string) => string;
    EVENT_SHARE: (eventId: string) => string;
    EVENT_ATTACHMENT: (eventId: string, participantId: string) => string;

    // Nuevos endpoints del sistema de votación distribuida
    VOTING_CONFIG: (eventId: string) => string;
    GENERATE_ASSIGNMENTS: (eventId: string) => string;
    GET_ASSIGNMENT: (eventId: string, participantId: string) => string;
    SUBMIT_RANKING_VOTES: (eventId: string, participantId: string) => string;
    DISTRIBUTED_RESULTS: (eventId: string) => string;
    VOTING_STATISTICS: (eventId: string) => string;
    UPLOAD_ATTACHMENT: (eventId: string, participantId: string) => string;
    EVENT_ATTACHMENTS: (eventId: string) => string;
    DOWNLOAD_ATTACHMENT: (attachmentId: string) => string;
    DELETE_ATTACHMENT: (attachmentId: string) => string;

    // Fechas estimativas (S-003)
    EVENT_ESTIMATED_DATE: (eventId: string) => string;

    // Pausa de evento
    EVENT_PAUSE: (eventId: string) => string;

    // Borrador de votación (S-005)
    VOTE_DRAFT: (eventId: string, participantId: string) => string;

    // Google OAuth (E-002.S-03)
    GOOGLE_VERIFY: string;
    GOOGLE_REGISTER: string;

    // Recuperación de contraseña
    USER_FORGOT_PASSWORD: string;
    USER_RESET_PASSWORD: string;
  };
}

export interface ApiResponse<T = any> {
  data?: T;
  events?: T;
  message?: string;
  error?: string;
}

// Listado de eventos (GET /events) y "mis eventos" (GET /users/{id}/events?scope=all)
export type StageCounts = { participation: number; voting: number; results: number };

export interface EventListItem {
  id: string;
  name: string;
  description: string;
  stage: EventStage;
  author_id: string;
  max_participants: number | null;
  participants_count: number;
  participant_ids: string[];
  participation_estimated_end_date: string | null;
  voting_estimated_end_date: string | null;
  is_paused: boolean;
  is_cancelled: boolean;
  created_at: string;
}

export interface EventListPage {
  items: EventListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stageCounts: StageCounts;
}

export interface MyStatus {
  has_attachment: boolean;
  has_assignment: boolean;
  ranking_submitted: boolean;
  result_position: number | null;
  result_total: number | null;
}

export interface MyEvent extends Omit<EventListItem, 'participant_ids'> {
  role: 'creator' | 'participant';
  my_status: MyStatus | null;
}

// Props para componentes

export interface EventDetailProps {
  event: Event;
  onClose: () => void;
  onRegistered?: () => void;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

export interface ShareableEventInfo {
  title: string;
  description: string;
  share_url: string;
  shareable_link: string;
  image_url: string;
  stage: string;
  start_date: string;
  end_date: string;
  organizer: string;
}

// ========================================
// Sistema de Votación Distribuida (MBC)
// ========================================

export interface VotingConfiguration {
  id: string;
  event_id: string;
  attachments_per_evaluator: number;        // m parameter
  quality_good_threshold: number;            // Q_good (0-1)
  quality_bad_threshold: number;             // Q_bad (0-1)
  adjustment_magnitude: number;              // n parameter
  min_evaluations_per_file: number;
  created_at?: string;
  updated_at?: string;
}

export interface AssignedAttachment {
  id: string;
  label: string;               // "Propuesta N" (N = posición, 1-based)
  mime_type: string;
  file_size: number;
  description: string | null;
}

export interface AnonymousAssignment {
  id: string;
  event_id: string;
  is_completed: boolean;
  completed_at: string | null;
  attachments: AssignedAttachment[];
}

export interface RankingVote {
  attachment_id: string;
  rank: number;                              // 1 = best, higher numbers = worse
  score?: number | null;
  confidence?: number | null;
  notes?: string;
}

export interface AttachmentResult {
  attachment_id: string;
  filename: string;
  participant_id: string;
  participant_name?: string;                 // Name of who uploaded the file
  mbc_score: number;                         // Modified Borda Count score
  global_rank: number;
  adjusted_rank: number;
  vote_count: number;
  average_rank: number;
}

export interface VotingResults {
  id: string;
  event_id: string;
  global_ranking: AttachmentResult[];
  participant_qualities: { [participantId: string]: number };
  adjusted_ranking: AttachmentResult[];
  total_participants: number;
  attachments_per_evaluator: number;
  calculated_at: string;
  updated_at?: string;
}

export interface Attachment {
  id: string;
  event_id: string;
  participant_id: string;
  original_name: string;
  stored_name: string;
  file_size: number;
  mime_type: string;
  description?: string;
  uploaded_at: string;
  url?: string;
}

export interface VotingStatistics {
  total_assignments: number;
  completed_assignments: number;
  total_votes: number;
  completion_rate: number;
  average_quality_score: number;
  participants_with_good_quality: number;
  participants_with_bad_quality: number;
  participant_voting_status?: { [participantId: string]: boolean };
}

export interface EventCreateInput {
  name: string;
  description: string;
  organizer: string;
  max_participants: number;
}

/** Body del PATCH /events/{id}: solo lo que cambió. */
export type EventUpdate = Partial<EventCreateInput>;
