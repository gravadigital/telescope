import React, { useEffect, useId, useRef, useState } from 'react';
import { Button, Callout, Dialog } from '../../ui';
import { ApiError } from '../../../config/api';
import { REMINDER_PREVIEW_LIMIT } from '../../../domain';
import { scopedMessageKeyForError, useT } from '../../../i18n';
import type { TranslationKey } from '../../../i18n';
import { EventService } from '../../../services/api';
import type { EventParticipant, ReminderResult, ReminderType } from '../../../types';
import './ReminderDialog.css';

export interface ReminderDialogProps {
  open: boolean;
  eventId: string;
  type: ReminderType;
  recipients: EventParticipant[];
  onClose: () => void;
  onDone: (result: ReminderResult) => void;
}

const REMINDER_CODES = ['NO_PENDING_RECIPIENTS', 'INVALID_EVENT_STAGE', 'FORBIDDEN'];

const errorKeyFor = (err: unknown): TranslationKey => {
  if (err instanceof ApiError && err.code === 'EVENT_PAUSED_OR_CANCELLED') return 'manage.reminderDialog.paused';
  return scopedMessageKeyForError(err, REMINDER_CODES, 'manage.reminderDialog.error');
};

const ReminderDialog: React.FC<ReminderDialogProps> = ({
  open,
  eventId,
  type,
  recipients,
  onClose,
  onDone,
}) => {
  const { t } = useT();
  const textId = useId();
  const sendRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setError(null);
  }, [open]);

  const count = recipients.length;
  const empty = count === 0;
  const shown = recipients.slice(0, REMINDER_PREVIEW_LIMIT);
  const rest = count - shown.length;

  const handleSend = async (): Promise<void> => {
    if (busy || empty) return;
    setError(null);
    setBusy(true);
    try {
      const result = await EventService.sendReminder(eventId, type);
      onDone(result);
    } catch (err) {
      setError(errorKeyFor(err));
      setBusy(false);
    }
  };

  const actions = (
    <div className="ev-reminder__actions">
      <Button variant="secondary" disabled={busy} onClick={onClose}>
        {t('manage.dialog.cancel')}
      </Button>
      <Button
        ref={sendRef}
        disabled={empty}
        loading={busy}
        loadingLabel={t('manage.reminderDialog.loading')}
        onClick={() => void handleSend()}
      >
        {t('manage.reminderDialog.confirm')}
      </Button>
    </div>
  );

  return (
    <Dialog
      open={open}
      size="sm"
      title={t(type === 'file' ? 'manage.reminderDialog.fileTitle' : 'manage.reminderDialog.voteTitle')}
      closeLabel={t('manage.dialog.close')}
      busy={busy}
      describedBy={textId}
      initialFocusRef={empty ? undefined : sendRef}
      onClose={onClose}
      actions={actions}
    >
      {empty ? (
        <p id={textId} className="ev-reminder__text">
          {t('manage.reminderDialog.none')}
        </p>
      ) : (
        <>
          <p id={textId} className="ev-reminder__text">
            {t('manage.reminderDialog.text', { count })}
          </p>
          <ul className="ev-reminder__list">
            {shown.map((r) => (
              <li key={r.id} className="ev-reminder__item">
                {r.name}
              </li>
            ))}
            {rest > 0 && (
              <li className="ev-reminder__item ev-reminder__item--more">
                {t('manage.reminderDialog.more', { count: rest })}
              </li>
            )}
          </ul>
        </>
      )}
      {error && <Callout tone="error">{t(error)}</Callout>}
    </Dialog>
  );
};

export default ReminderDialog;
