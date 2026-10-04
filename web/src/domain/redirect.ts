const DEFAULT_NEXT = '/events';

/**
 * Destino seguro tras iniciar sesión: solo rutas internas. Rechaza `//host` y `/\host`
 * (los navegadores tratan ambos como URL con host), esquemas y rutas relativas.
 */
export const safeNextPath = (raw: string | null | undefined): string => {
  if (!raw || raw[0] !== '/') return DEFAULT_NEXT;
  if (raw[1] === '/' || raw[1] === '\\') return DEFAULT_NEXT;
  return raw;
};

export const loginPathFor = (path: string): string => `/login?next=${encodeURIComponent(path)}`;
