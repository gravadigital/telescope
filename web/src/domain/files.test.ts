import {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_BYTES,
  ACCEPT_ATTRIBUTE,
  validateFile,
  formatFileSize,
  fileTypeLabel,
} from './files';

describe('files', () => {
  it('TS-75: tamaño', () => {
    expect(validateFile({ name: 'a.pdf', type: 'application/pdf', size: 10485760 })).toEqual({ ok: true });
    expect(validateFile({ name: 'a.pdf', type: 'application/pdf', size: 10485761 })).toEqual({
      ok: false,
      reason: 'too_large',
    });
  });

  it('TS-76: tipo', () => {
    expect(validateFile({ name: 'a.svg', type: 'image/svg+xml', size: 10 })).toEqual({
      ok: false,
      reason: 'invalid_type',
    });
    expect(validateFile({ name: 'notas.docx', type: '', size: 10 })).toEqual({ ok: true });
    expect(validateFile({ name: 'x.exe', type: '', size: 10 })).toEqual({
      ok: false,
      reason: 'invalid_type',
    });
    expect(validateFile({ name: 'grande.exe', type: 'application/x-msdownload', size: 20000000 })).toEqual({
      ok: false,
      reason: 'invalid_type',
    });
  });

  it('TS-77: constantes iguales al backend', () => {
    expect(ALLOWED_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    expect(ALLOWED_EXTENSIONS).toEqual(['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'doc', 'docx']);
    expect(MAX_FILE_BYTES).toBe(10485760);
    const parts = ACCEPT_ATTRIBUTE.split(',');
    ALLOWED_MIME_TYPES.forEach((m) => expect(parts).toContain(m));
    ALLOWED_EXTENSIONS.forEach((e) => expect(parts).toContain(`.${e}`));
  });

  it('TS-78: formato', () => {
    expect(formatFileSize(2516582, 'es')).toBe('2,4 MB');
    expect(formatFileSize(2516582, 'en')).toBe('2.4 MB');
    expect(formatFileSize(512000, 'es')).toBe('500 KB');
    expect(fileTypeLabel({ name: 'Propuesta.final.PDF' })).toBe('PDF');
  });
});
