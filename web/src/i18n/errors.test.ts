import { ApiError } from '../config/api';
import { messageKeyForError } from './errors';
import { es } from './catalogs/es';

describe('messageKeyForError', () => {
  it('TS-17: code del handler', () => {
    const err = new ApiError({ status: 404, body: { error: 'Event not found', code: 'EVENT_NOT_FOUND' } });
    const key = messageKeyForError(err);
    expect(key).toBe('errors.EVENT_NOT_FOUND');
    expect(es.errors.EVENT_NOT_FOUND).not.toContain('EVENT_NOT_FOUND');
    expect(es.errors.EVENT_NOT_FOUND).not.toContain('Event not found');
  });

  it('TS-18: forma B (middleware)', () => {
    const err = new ApiError({ status: 401, body: { error: 'UNAUTHORIZED', message: 'Token missing' } });
    expect(messageKeyForError(err)).toBe('errors.UNAUTHORIZED');
    expect(es.errors.UNAUTHORIZED).not.toContain('Token missing');
  });

  it('TS-19: code desconocido', () => {
    const err = new ApiError({ status: 409, body: { error: 'x', code: 'BRAND_NEW_CODE' } });
    expect(messageKeyForError(err)).toBe('errors.generic');
  });

  it('TS-20: forma legacy sin code', () => {
    const err = new ApiError({ status: 500, body: { error: 'Voting setup failed', details: 'db' } });
    expect(messageKeyForError(err)).toBe('errors.generic');
    expect(es.errors.generic).not.toContain('Voting setup failed');
  });

  it('TS-21: fallo de red', () => {
    expect(messageKeyForError(new TypeError('Failed to fetch'))).toBe('errors.network');
  });

  it('TS-22: valores que no son ApiError', () => {
    expect(messageKeyForError('boom')).toBe('errors.generic');
    expect(messageKeyForError(undefined)).toBe('errors.generic');
    expect(messageKeyForError(new Error('x'))).toBe('errors.generic');
  });

  it('un code heredado de Object.prototype no cuenta como traducido', () => {
    const err = new ApiError({ status: 400, body: { error: 'x', code: 'toString' } });
    expect(messageKeyForError(err)).toBe('errors.generic');
  });
});
