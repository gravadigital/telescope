import { ApiError } from '../config/api';
import { es } from './catalogs/es';
import type { TranslationKey } from './types';

/**
 * Convierte cualquier error en una clave traducible. Nunca usa `err.message`:
 * el texto del servidor no se muestra al usuario.
 */
export const messageKeyForError = (err: unknown): TranslationKey => {
  if (err instanceof ApiError) {
    if (err.code && Object.prototype.hasOwnProperty.call(es.errors, err.code)) {
      return `errors.${err.code}` as TranslationKey;
    }
    return 'errors.generic';
  }
  if (err instanceof TypeError) return 'errors.network';
  return 'errors.generic';
};
