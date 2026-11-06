import React, { useEffect, useId, useRef, useState } from 'react';
import { Button, Callout, Dialog, ProgressBar } from '../../ui';
import Countdown from '../countdown/Countdown';
import { endOfDay } from '../../../domain/dates';
import type { VotingProgress } from '../../../domain';
import { scopedMessageKeyForError, useT } from '../../../i18n';
import type { TranslationKey } from '../../../i18n';
import { EventService } from '../../../services/api';
import './PublishResultsDialog.css';

export interface PublishResultsDialogProps {
  open: boolean;
  eventId: string;
  progress: VotingProgress;
  votingDeadline: string | null;
  /** Propuestas que todavía no tienen ningún voto: si se publica, quedan sin posición. */
  unevaluated?: number;
  onClose: () => void;
  onDone: () => void;
}

const PUBLISH_CODES = ['INVALID_TRANSITION', 'FORBIDDEN'];

const PublishResultsDialog: React.FC<PublishResultsDialogProps> = ({
  open,
  eventId,
  progress,
  votingDeadline,
  unevaluated = 0,
  onClose,
  onDone,
}) => {
  const { t, fmt } = useT();
  const textId = useId();
  const missingId = useId();
  const unevaluatedId = useId();
  const waitRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setError(null);
  }, [open]);

  const hasMissing = progress.missing > 0;
  const hasUnevaluated = unevaluated > 0;
  const describedBy = [textId, hasMissing && missingId, hasUnevaluated && unevaluatedId].filter(Boolean).join(' ');

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
        {hasMissing || hasUnevaluated ? t('manage.publish.confirmAnyway') : t('manage.publish.confirm')}
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
      describedBy={describedBy}
      initialFocusRef={waitRef}
      onClose={onClose}
      actions={actions}
    >
      <p id={textId} className="ev-publish-results__text">
        {t('manage.publish.text')}
      </p>
      {open && votingDeadline && (
        <div className="ev-publish-results__countdown">
          <Countdown
            title={t('manage.countdown.voting.title')}
            expiredText={t('manage.countdown.voting.expired')}
            units={{
              days: t('manage.countdown.voting.days'),
              hours: t('manage.countdown.voting.hours'),
              minutes: t('manage.countdown.voting.minutes'),
              seconds: t('manage.countdown.voting.seconds'),
            }}
            target={endOfDay(votingDeadline)}
            footer={t('manage.countdown.voting.footer', { date: fmt.date(votingDeadline) })}
          />
        </div>
      )}
      {hasMissing && (
        <Callout
          tone="warning"
          id={missingId}
          title={t('manage.publish.missingTitle', { missing: progress.missing, total: progress.total })}
        >
          <div className="ev-publish-results__missing">
            <ProgressBar
              value={progress.sent}
              max={progress.total}
              size="sm"
              tone="warning"
              valueText={t('manage.metrics.rankingsA11y', { sent: progress.sent, total: progress.total })}
            />
            <p className="ev-publish-results__missing-text">{t('manage.publish.missingText')}</p>
          </div>
        </Callout>
      )}
      {hasUnevaluated && (
        <Callout
          tone="warning"
          id={unevaluatedId}
          title={t('manage.publish.unevaluatedTitle', { count: unevaluated })}
        >
          {t('manage.publish.unevaluatedText', { count: unevaluated })}
        </Callout>
      )}
      {error && <Callout tone="error">{t(error)}</Callout>}
    </Dialog>
  );
};

export default PublishResultsDialog;
