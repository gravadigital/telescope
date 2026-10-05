import React from 'react';
import Button from '../button/Button';
import { UploadIcon } from '../icons/Icons';
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILE_BYTES,
  FileRejection,
  fileTypeLabel,
  formatFileSize,
  validateFile,
} from '../../../domain/files';
import { formatDate } from '../../../domain/dates';
import '../visually-hidden.css';
import './FileDropzone.css';

export interface FileDropzoneLabels {
  prompt: string;
  promptAction: string;
  formats: string;
  ready: string;
  change: string;
  /** Con `{name}`. */
  changeAccessible: string;
  /** Con `{date}`. */
  submittedOn: string;
  replace: string;
}

export interface FileDropzoneProps {
  file?: File | null;
  submitted?: { name: string; size: number; date: string };
  error?: string;
  disabled?: boolean;
  uploading?: boolean;
  locale: string;
  labels: FileDropzoneLabels;
  accept?: string;
  maxBytes?: number;
  onSelect: (file: File) => void;
  onReject?: (reason: FileRejection) => void;
  onClear?: () => void;
  /** Se llama al tocar "Reemplazar archivo" (la pantalla sabe que hay un reemplazo en curso). */
  onReplace?: () => void;
}

interface FileChipProps {
  name: string;
  sizeLabel: string;
  status: string;
  actionLabel: string;
  actionAccessibleLabel: string;
  uploading?: boolean;
  disabled?: boolean;
  onAction?: () => void;
}

const FileChip: React.FC<FileChipProps> = ({
  name,
  sizeLabel,
  status,
  actionLabel,
  actionAccessibleLabel,
  uploading,
  disabled,
  onAction,
}) => (
  <div className="ui-file-dropzone__chip">
    <span className="ui-file-dropzone__type">{fileTypeLabel({ name })}</span>
    <div className="ui-file-dropzone__info">
      <span className="ui-file-dropzone__name">{name}</span>
      <span className="ui-file-dropzone__meta">
        <span>{sizeLabel}</span>
        <span> · </span>
        <span>{status}</span>
      </span>
    </div>
    {uploading && <span className="ui-file-dropzone__spinner" aria-hidden="true" />}
    <Button
      variant="tertiary"
      size="sm"
      aria-label={actionAccessibleLabel}
      disabled={disabled || uploading}
      onClick={onAction}
    >
      {actionLabel}
    </Button>
  </div>
);

const FileDropzone: React.FC<FileDropzoneProps> = ({
  file = null,
  submitted,
  error,
  disabled = false,
  uploading = false,
  locale,
  labels,
  accept = ACCEPT_ATTRIBUTE,
  maxBytes = MAX_FILE_BYTES,
  onSelect,
  onReject,
  onClear,
  onReplace,
}) => {
  const uid = React.useId();
  const inputId = `${uid}-input`;
  const errorId = `${uid}-error`;
  const [dragOver, setDragOver] = React.useState(false);
  const [replacing, setReplacing] = React.useState(false);

  // El reemplazo dura hasta que cambia la propuesta enviada (no al elegir archivo):
  // así "Cambiar" durante un reemplazo vuelve a la zona de carga.
  const submittedName = submitted?.name;
  const submittedDate = submitted?.date;
  React.useEffect(() => {
    setReplacing(false);
  }, [submittedName, submittedDate]);

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    if (files.length > 1) {
      onReject?.('multiple');
      return;
    }
    const candidate = files[0];
    const result = validateFile({ name: candidate.name, type: candidate.type, size: candidate.size });
    if (!result.ok) {
      onReject?.(result.reason);
      return;
    }
    if (candidate.size > maxBytes) {
      onReject?.('too_large');
      return;
    }
    onSelect(candidate);
  };

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    handleFiles(files);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(Array.from(event.dataTransfer?.files ?? []));
  };

  if (file) {
    return (
      <div className="ui-file-dropzone">
        <FileChip
          name={file.name}
          sizeLabel={formatFileSize(file.size, locale)}
          status={labels.ready}
          actionLabel={labels.change}
          actionAccessibleLabel={labels.changeAccessible.replace('{name}', file.name)}
          uploading={uploading}
          disabled={disabled}
          onAction={onClear}
        />
      </div>
    );
  }

  if (submitted && !replacing) {
    return (
      <div className="ui-file-dropzone">
        <FileChip
          name={submitted.name}
          sizeLabel={formatFileSize(submitted.size, locale)}
          status={labels.submittedOn.replace('{date}', formatDate(submitted.date, locale))}
          actionLabel={labels.replace}
          actionAccessibleLabel={labels.replace}
          disabled={disabled}
          onAction={() => {
            setReplacing(true);
            onReplace?.();
          }}
        />
      </div>
    );
  }

  const classes = [
    'ui-file-dropzone__zone',
    dragOver ? 'ui-file-dropzone__zone--dragover' : '',
    error ? 'ui-file-dropzone__zone--error' : '',
    disabled ? 'ui-file-dropzone__zone--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="ui-file-dropzone">
      <div
        className={classes}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          id={inputId}
          className="ui-visually-hidden"
          type="file"
          accept={accept}
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          onChange={handleInput}
        />
        <label htmlFor={inputId} className="ui-file-dropzone__label">
          <UploadIcon className="ui-file-dropzone__icon" />
          <span className="ui-file-dropzone__prompt">
            {labels.prompt} <span className="ui-file-dropzone__action">{labels.promptAction}</span>
          </span>
          <span className="ui-file-dropzone__formats">{labels.formats}</span>
        </label>
        {error && (
          <p id={errorId} role="alert" className="ui-file-dropzone__error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default FileDropzone;
