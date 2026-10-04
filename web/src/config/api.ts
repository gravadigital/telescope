import { ApiConfig } from '../types';
import { RUNTIME_CONFIG } from './runtime';

// Configuración de la API
export const API_CONFIG: ApiConfig = {
  BASE_URL: RUNTIME_CONFIG.API_URL,
  ENDPOINTS: {
    // Usuarios
    USERS: '/api/v1/users',
    USER_AUTHENTICATE: '/api/v1/users/authenticate',

    // Eventos básicos
    EVENTS: '/api/v1/events',
    EVENT_REGISTER: (eventId: string) => `/api/v1/events/${eventId}/register`,
    EVENT_STAGE: (eventId: string) => `/api/v1/events/${eventId}/stage`,
    EVENT_PARTICIPANTS: (eventId: string) => `/api/v1/events/${eventId}/participants`,
    EVENT_SHARE: (eventId: string) => `/api/v1/events/${eventId}/share`,

    // Attachments
    UPLOAD_ATTACHMENT: (eventId: string, participantId: string) =>
      `/api/v1/events/${eventId}/participant/${participantId}/attachment`,
    EVENT_ATTACHMENTS: (eventId: string) =>
      `/api/v1/events/${eventId}/attachments`,
    DOWNLOAD_ATTACHMENT: (attachmentId: string) =>
      `/api/v1/attachments/${attachmentId}/download`,
    DELETE_ATTACHMENT: (attachmentId: string) =>
      `/api/v1/attachments/${attachmentId}`,

    // Sistema de Votación Distribuida (MBC)
    VOTING_CONFIG: (eventId: string) =>
      `/api/v1/events/${eventId}/voting-config`,
    GENERATE_ASSIGNMENTS: (eventId: string) =>
      `/api/v1/events/${eventId}/generate-assignments`,
    GET_ASSIGNMENT: (eventId: string, participantId: string) =>
      `/api/v1/events/${eventId}/participants/${participantId}/assignment`,
    SUBMIT_RANKING_VOTES: (eventId: string, participantId: string) =>
      `/api/v1/events/${eventId}/participants/${participantId}/ranking-votes`,
    DISTRIBUTED_RESULTS: (eventId: string) =>
      `/api/v1/events/${eventId}/distributed-results`,
    VOTING_STATISTICS: (eventId: string) =>
      `/api/v1/events/${eventId}/voting-statistics`,

    // Legacy (mantener por compatibilidad)
    EVENT_ATTACHMENT: (eventId: string, participantId: string) =>
      `/api/v1/events/${eventId}/participant/${participantId}/attachment`,

    // Fechas estimativas (S-003)
    EVENT_ESTIMATED_DATE: (eventId: string) =>
      `/api/v1/events/${eventId}/estimated-end-date`,

    // Pausa de evento
    EVENT_PAUSE: (eventId: string) => `/api/v1/events/${eventId}/pause`,

    // Borrador de votación (S-005)
    VOTE_DRAFT: (eventId: string, participantId: string) =>
      `/api/v1/events/${eventId}/participants/${participantId}/vote-draft`,

    // Google OAuth (E-002.S-03)
    GOOGLE_VERIFY: '/api/v1/auth/google/verify',
    GOOGLE_REGISTER: '/api/v1/auth/google/register',

    // Recuperación de contraseña
    USER_FORGOT_PASSWORD: '/api/v1/users/forgot-password',
    USER_RESET_PASSWORD: '/api/v1/users/reset-password',
  }
};

// Headers por defecto para las peticiones
export const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

const FORM_B_CODE = /^[A-Z][A-Z0-9_]*$/;

/**
 * Error lanzado por apiRequest, uploadFile y downloadFile.
 * Conserva el status HTTP, el `code` estable del backend y los campos extra
 * del body (`details`) para que la pantalla traduzca por `code` (DA-6).
 *
 * - Forma A (handlers): `{ error, code, ...extras }`.
 * - Forma B (middlewares): `{ error: "UNAUTHORIZED", message }` -> code = error.
 * - Forma C (degradada): `{ error: "texto" }` -> sin code.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details: Record<string, unknown>;

  constructor({ status, body }: { status: number; body: unknown }) {
    const data: Record<string, unknown> =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const error = typeof data.error === 'string' ? data.error : undefined;
    const text = typeof data.message === 'string' ? data.message : undefined;
    super(error || text || `HTTP error! status: ${status}`);
    Object.setPrototypeOf(this, ApiError.prototype);
    this.name = 'ApiError';
    this.status = status;
    if (typeof data.code === 'string') {
      this.code = data.code;
    } else if (error && text !== undefined && FORM_B_CODE.test(error)) {
      this.code = error;
    }
    const { error: _error, code: _code, message: _message, ...rest } = data;
    this.details = rest;
  }
}

export type ApiRequestError = ApiError;

export const getErrorCode = (err: unknown): string | undefined => {
  if (err instanceof ApiError) return err.code;
  if (err instanceof Error) {
    const code = (err as Partial<ApiRequestError>).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
};

// Función helper para hacer peticiones a la API con JSON
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  // Get JWT token from localStorage
  // Note: The token is stored directly as a string (not JSON.stringify)
  const token = localStorage.getItem('telescopio_token');

  // Si estamos enviando FormData, no establecer Content-Type (el browser lo hace automáticamente)
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : DEFAULT_HEADERS),
    ...(options.headers as Record<string, string> || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Si recibimos 401 Unauthorized, limpiar la sesión
      if (response.status === 401) {
        console.warn('🔒 Token inválido o expirado. Limpiando sesión...');
        localStorage.removeItem('telescopio_user');
        localStorage.removeItem('telescopio_token');

        // Disparar un evento personalizado para que el AuthContext detecte el cambio
        window.dispatchEvent(new CustomEvent('auth:logout', {
          detail: { reason: 'token_expired' }
        }));

        // NO recargar la página automáticamente - dejar que el AuthContext maneje el estado
        // El usuario verá el mensaje de "log in to participate" y puede volver a loguearse
        // sin perder el contexto de navegación
      }
      
      throw new ApiError({ status: response.status, body: errorData });
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', { endpoint, error });
    throw error;
  }
};

export const uploadFile = async (endpoint: string, formData: FormData): Promise<any> => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  // Get JWT token from localStorage
  // Note: The token is stored directly as a string (not JSON.stringify)
  const token = localStorage.getItem('telescopio_token');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        // No establecer Content-Type aquí - el browser lo hará automáticamente con boundary para multipart
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError({ status: response.status, body: errorData });
    }

    return await response.json();
  } catch (error) {
    console.error('File upload failed:', { endpoint, error });
    throw error;
  }
};

// Descarga un archivo protegido por JWT y dispara el guardado en el navegador.
// No puede ser un <a href> directo: el backend exige Authorization: Bearer.
export const downloadFile = async (endpoint: string, filename: string): Promise<void> => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const token = localStorage.getItem('telescopio_token');

  const response = await fetch(url, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError({ status: response.status, body: errorData });
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

// Helper para verificar conectividad con la API
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.warn('API health check failed:', error);
    return false;
  }
};
