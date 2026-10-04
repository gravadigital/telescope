/**
 * Reglas de archivo de la propuesta. Iguales a las del backend
 * (`attachment_handler.go`, MAX_FILE_SIZE por defecto de 10 MB).
 */
export const ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const ALLOWED_EXTENSIONS: readonly string[] = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'pdf',
  'txt',
  'doc',
  'docx',
];

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const ACCEPT_ATTRIBUTE: string = [
  ...ALLOWED_MIME_TYPES,
  ...ALLOWED_EXTENSIONS.map((e) => `.${e}`),
].join(',');

export type FileRejection = 'too_large' | 'invalid_type' | 'multiple';

export type FileValidation = { ok: true } | { ok: false; reason: 'too_large' | 'invalid_type' };

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
};

/** El tipo se evalúa antes que el tamaño. Sin MIME decide la extensión. */
export const validateFile = (file: { name: string; type: string; size: number }): FileValidation => {
  const typeOk = file.type
    ? ALLOWED_MIME_TYPES.includes(file.type)
    : ALLOWED_EXTENSIONS.includes(extensionOf(file.name));
  if (!typeOk) return { ok: false, reason: 'invalid_type' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'too_large' };
  return { ok: true };
};

/** KB sin decimales por debajo de 1 MB; MB con un decimal. Base 1024. */
export const formatFileSize = (bytes: number, locale: string): string => {
  if (bytes < 1024 * 1024) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(bytes / 1024))} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(mb)} MB`;
};

/** Extensión en mayúsculas ("PDF"). */
export const fileTypeLabel = (file: { name: string }): string => extensionOf(file.name).toUpperCase();
