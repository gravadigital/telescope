import React, { useMemo, useRef, useState } from 'react';
import { Button, Callout, DateQuickPicker, Dialog } from '../../ui';
import type { DatePreset } from '../../ui';
import {
  DEFAULT_DURATION_DAYS,
  DURATION_PRESETS,
  addDays,
  todayISO,
  validateNewDeadline,
} from '../../../domain';
import { scopedMessageKeyForError, useT } from '../../../i18n';
import type { TranslationKey } from '../../../i18n';
import { EventService } from '../../../services/api';
import './OpenRegistrationDialog.css';

export interface OpenRegistrationDialogProps {
  open: boolean;
  eventId: string;
  /** Hoy en ISO `YYYY-MM-DD`; inyectable para tests. */
  today?: string;
  onClose: () => void;
  onDone: () => void;
}

const ERROR_CODES = [
  'INVALID_ESTIMATED_DATE',
  'INVALID_TRANSITION',
  'EVENT_NOT_FOUND',
  'FORBIDDEN',
] as const;

type ContentProps = Omit<OpenRegistrationDialogProps, 'open'>;

/** Se monta solo con el diálogo abierto: cada apertura empieza con la fecha inicial y sin errores. */
const OpenRegistrationContent: React.FC<ContentProps> = ({ eventId, today, onClose, onDone }) => {
  const { t, locale } = useT();
  const base = useMemo(() => today ?? todayISO(), [today]);
  const [value, setValue] = useState(() => addDays(base, DEFAULT_DURATION_DAYS));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<TranslationKey | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Foco inicial en el atajo seleccionado (el DateQuickPicker no expone sus botones).
  const initialFocusRef = useMemo<React.RefObject<HTMLElement | null>>(
    () => ({
      get current(): HTMLElement | null {
        return pickerRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ?? null;
      },
    }),
    []
  );

  const presets: DatePreset[] = DURATION_PRESETS.map((days) => ({
    days,
    label: t(`manage.dialog.presets.${days}` as TranslationKey),
  }));

  const issue = validateNewDeadline(value, base);
  const dateError = issue ? t('manage.dialog.dateNotAfterToday') : undefined;

  const handleConfirm = async (): Promise<void> => {
    if (saving || issue) return;
    setSaveError(null);
    setSaving(true);
    try {
      await EventService.updateEventStage(eventId, 'participation', value);
      onDone();
    } catch (err) {
      setSaveError(scopedMessageKeyForError(err, ERROR_CODES, 'manage.openRegistration.error'));
      setSaving(false);
    }
  };

  const actions = (
    <>
      <Button variant="secondary" disabled={saving} onClick={onClose}>
        {t('manage.dialog.cancel')}
      </Button>
      <Button
        disabled={Boolean(issue)}
        loading={saving}
        loadingLabel={t('manage.openRegistration.loading')}
        onClick={() => void handleConfirm()}
      >
        {t('manage.openRegistration.confirm')}
      </Button>
    </>
  );

  return (
    <Dialog
      open
      size="sm"
      eyebrow={t('manage.openRegistration.eyebrow')}
      title={t('manage.openRegistration.title')}
      closeLabel={t('manage.dialog.close')}
      busy={saving}
      initialFocusRef={initialFocusRef}
      onClose={onClose}
      actions={actions}
    >
      <div className="ev-open-registration">
        <p className="ev-open-registration__text">{t('manage.openRegistration.text')}</p>
        <div ref={pickerRef} className="ev-open-registration__field">
          <DateQuickPicker
            variant="fromToday"
            value={value}
            today={base}
            presets={presets}
            locale={locale}
            label={t('manage.openRegistration.dateLabel')}
            help={t('manage.openRegistration.help')}
            error={dateError}
            changeLabel={t('manage.dialog.change')}
            disabled={saving}
            onChange={(next) => {
              setValue(next);
              setSaveError(null);
            }}
          />
        </div>
        {saveError && <Callout tone="error">{t(saveError)}</Callout>}
      </div>
    </Dialog>
  );
};

const OpenRegistrationDialog: React.FC<OpenRegistrationDialogProps> = ({ open, ...rest }) =>
  open ? <OpenRegistrationContent {...rest} /> : null;

export default OpenRegistrationDialog;
