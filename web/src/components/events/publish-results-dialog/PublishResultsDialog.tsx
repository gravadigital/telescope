import React, { useEffect, useId, useRef, useState } from 'react';
import { Button, Callout, Dialog } from '../../ui';
import type { VotingProgress } from '../../../domain';
import { scopedMessageKeyForError, useT } from '../../../i18n';
import type { TranslationKey } from '../../../i18n';
import { EventService } from '../../../services/api';
import './PublishResultsDialog.css';

export interface PublishResultsDialogProps {
  open: boolean;
  eventId: string;
  progress: VotingProgress;
  onClose: () => void;
  onDone: () => void;
}

const PUBLISH_CODES = ['INVALID_TRANSITION', 'FORBIDDEN'];

const PublishResultsDialog: React.FC<PublishResultsDialogProps> = ({
  open,
  eventId,
  progress,
  onClose,
  onDone,
}) => {
  const { t } = useT();
  const textId = useId();
  const missingId = useId();
  const waitRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setError(null);
  }, [open]);

  const hasMissing = progress.missing > 0;

  const handlePublish = async (): Promise<void> => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await EventService.updateEventStage(eventId, 'results');
      onDone();
    } catch (err) {
      setError(scopedMessageKeyForError(err, PUBLISH_CODES, 'manage.publish.error'));
      setBusy(false);
    }
  };

  const actions = (
    <div className="ev-publish-results__actions">
      <Button ref={waitRef} variant="secondary" disabled={busy} onClick={onClose}>
        {t('manage.publish.wait')}
      </Button>
      <Button loading={busy} loadingLabel={t('manage.publish.loading')} onClick={() => void handlePublish()}>
        {hasMissing ? t('manage.publish.confirmAnyway') : t('manage.publish.confirm')}
      </Button>
    </div>
  );

  return (
    <Dialog
      open={open}
      variant="alert"
      size="sm"
      eyebrow={t('manage.publish.eyebrow')}
      title={t('manage.publish.title')}
      closeLabel={t('manage.dialog.close')}
      busy={busy}
      describedBy={hasMissing ? `${textId} ${missingId}` : textId}
      initialFocusRef={waitRef}
      onClose={onClose}
      actions={actions}
    >
      <p id={textId} className="ev-publish-results__text">
        {t('manage.publish.text')}
      </p>
      {hasMissing && (
        <Callout
          tone="warning"
          id={missingId}
          title={t('manage.publish.missingTitle', { missing: progress.missing, total: progress.total })}
        >
          {t('manage.publish.missingText')}
        </Callout>
      )}
      {error && <Callout tone="error">{t(error)}</Callout>}
    </Dialog>
  );
};

export default PublishResultsDialog;
