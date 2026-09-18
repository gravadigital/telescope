import { ApiConfig } from '../types';

// Configuración de la API
export const API_CONFIG: ApiConfig = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
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
    EVENT_VOTE: (eventId: string) => `/api/v1/events/${eventId}/vote`,
    EVENT_RESULTS: (eventId: string) => `/api/v1/events/${eventId}/results`,

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

// Función helper para hacer peticiones a la API con JSON
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  // Get JWT token from localStorage
  // Note: The token is stored directly as a string (not JSON.stringify)
  const token = localStorage.getItem('telescopio_token');

  console.log('🌐 API Request Debug:', {
    endpoint,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
    method: options.method || 'GET',
    isFormData: options.body instanceof FormData
  });

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

  console.log('📤 Request Headers:', config.headers);

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
      
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
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
      throw new Error(errorData.error || `Upload failed! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('File upload failed:', { endpoint, error });
    throw error;
  }
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
