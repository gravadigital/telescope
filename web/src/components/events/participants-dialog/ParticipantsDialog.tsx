import React from 'react';
import { Button, Callout, Dialog, EmptyState } from '../../ui';
import ParticipantsTable from '../participants-table/ParticipantsTable';
import { useT } from '../../../i18n';
import { EventService } from '../../../services/api';
import type { EventParticipant } from '../../../types';
import '../../ui/visually-hidden.css';
import './ParticipantsDialog.css';

export interface ParticipantsDialogProps {
  open: boolean;
  eventId: string;
  count: number;
  max: number;
  onClose: () => void;
}

type LoadState = 'loading' | 'ready' | 'error';

const ParticipantsDialog: React.FC<ParticipantsDialogProps> = ({ open, eventId, count, max, onClose }) => {
  const { t } = useT();
  const [state, setState] = React.useState<LoadState>('loading');
  const [rows, setRows] = React.useState<EventParticipant[]>([]);
  const [attempt, setAttempt] = React.useState(0);

  // Sin caché: cada vez que se abre (o se reintenta) se pide de nuevo.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState('loading');
    EventService.getParticipants(eventId)
      .then((participants) => {
        if (cancelled) return;
        setRows(participants);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [open, eventId, attempt]);

  const title = t('participants.title', { count, max });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title={title}
      closeLabel={t('participants.close')}
      actions={
        <Button variant="secondary" onClick={onClose}>
          {t('participants.close')}
        </Button>
      }
    >
      <div className="ev-participants-dialog">
        {state === 'loading' && (
          <>
            <p role="status" className="ui-visually-hidden">
              {t('participants.loading')}
            </p>
            <ParticipantsTable rows={[]} caption={title} loading />
          </>
        )}
        {state === 'error' && (
          <Callout tone="error" action={{ label: t('common.retry'), onClick: () => setAttempt((n) => n + 1) }}>
            {t('participants.error')}
          </Callout>
        )}
        {state === 'ready' && rows.length === 0 && (
          <EmptyState variant="inline" title={t('participants.empty')} />
        )}
        {state === 'ready' && rows.length > 0 && <ParticipantsTable rows={rows} caption={title} />}
      </div>
    </Dialog>
  );
};

export default ParticipantsDialog;
