import React, { useMemo, useRef, useState } from 'react';
import { Button, Callout, DateQuickPicker, Dialog } from '../../ui';
import type { DatePreset } from '../../ui';
import {
  DEFAULT_DURATION_DAYS,
  DURATION_PRESETS,
  addDays,
  validatePostpone,
} from '../../../domain';
import { scopedMessageKeyForError, useT } from '../../../i18n';
import type { TranslationKey } from '../../../i18n';
import { EventService } from '../../../services/api';
import './EditDeadlineDialog.css';

export type DeadlineStage = 'participation' | 'voting';

export interface EditDeadlineDialogProps {
  open: boolean;
  eventId: string;
  stage: DeadlineStage;
  /** Cierre vigente de la etapa, ISO `YYYY-MM-DD`. */
  currentDate: string;
  onClose: () => void;
  onDone: () => void;
}

const ERROR_CODES = [
  'CANNOT_ADVANCE_DEADLINE',
  'INVALID_ESTIMATED_DATE',
  'INVALID_STAGE_FOR_EDIT',
  'FORBIDDEN',
] as const;

const EYEBROW: Record<DeadlineStage, TranslationKey> = {
  participation: 'manage.deadline.eyebrowParticipation',
  voting: 'manage.deadline.eyebrowVoting',
};

type ContentProps = Omit<EditDeadlineDialogProps, 'open'>;

/** Se monta solo con el diálogo abierto: cada apertura empieza con la fecha inicial y sin errores. */
const EditDeadlineContent: React.FC<ContentProps> = ({
  eventId,
  stage,
  currentDate,
  onClose,
  onDone,
}) => {
  const { t, locale, fmt } = useT();
  const current = currentDate.slice(0, 10);
  const [value, setValue] = useState(() => addDays(current, DEFAULT_DURATION_DAYS));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<TranslationKey | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const initialFocusRef = useMemo<React.RefObject<HTMLElement | null>>(
    () => ({
      get current(): HTMLElement | null {
        return pickerRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ?? null;
      },
    }),
    []
  );

  // Los atajos cuentan desde el cierre actual, no desde el valor inicial (cierre + 7).
  const presets: DatePreset[] = DURATION_PRESETS.map((days) => ({
    days,
    label: t(`manage.dialog.postponePresets.${days}` as TranslationKey),
  }));

  const currentLabel = fmt.date(current);
  const issue = validatePostpone(value, current);
  const dateError = issue ? t('manage.deadline.notPostponed', { date: currentLabel }) : undefined;

  const handleConfirm = async (): Promise<void> => {
    if (saving || issue) return;
    setSaveError(null);
    setSaving(true);
    try {
      await EventService.updateEstimatedEndDate(eventId, stage, value);
      onDone();
    } catch (err) {
      setSaveError(scopedMessageKeyForError(err, ERROR_CODES, 'manage.deadline.error'));
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
        loadingLabel={t('manage.deadline.loading')}
        onClick={() => void handleConfirm()}
      >
        {t('manage.deadline.confirm')}
      </Button>
    </>
  );

  return (
    <Dialog
      open
      size="sm"
      eyebrow={t(EYEBROW[stage])}
      title={t('manage.deadline.title')}
      closeLabel={t('manage.dialog.close')}
      busy={saving}
      initialFocusRef={initialFocusRef}
      onClose={onClose}
      actions={actions}
    >
      <div className="ev-edit-deadline">
        <p className="ev-edit-deadline__current">
          {t('manage.deadline.current', { date: currentLabel })}
        </p>
        <div ref={pickerRef} className="ev-edit-deadline__field">
          <DateQuickPicker
            variant="postpone"
            base={current}
            value={value}
            presets={presets}
            locale={locale}
            label={t('manage.deadline.label')}
            help={t('manage.deadline.help')}
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

const EditDeadlineDialog: React.FC<EditDeadlineDialogProps> = ({ open, ...rest }) =>
  open ? <EditDeadlineContent {...rest} /> : null;

export default EditDeadlineDialog;
