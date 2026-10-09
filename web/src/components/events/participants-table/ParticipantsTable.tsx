import React from 'react';
import { Button, DataTable, StatusPill } from '../../ui';
import type { DataTableColumn, StatusPillTone } from '../../ui';
import { CheckIcon } from '../../ui/icons/Icons';
import { voteCell } from '../../../domain/manage';
import type { VoteCell } from '../../../domain/manage';
import { useT } from '../../../i18n';
import type { TranslationKey } from '../../../i18n';
import type { Attachment, EventParticipant, EventStage } from '../../../types';
import './ParticipantsTable.css';

interface CommonProps {
  rows: EventParticipant[];
  caption: string;
  loading?: boolean;
}

export interface PublicParticipantsTableProps extends CommonProps {
  variant?: 'public';
}

export interface OrganizerParticipantsTableProps extends CommonProps {
  variant: 'organizer';
  stage: EventStage;
  attachments: Attachment[];
  /** `participant_voting_status` de las estadísticas: quien no figura no participa. */
  votingStatus?: Record<string, boolean>;
  /** Las estadísticas fallaron: la columna Voto muestra "—". */
  voteUnavailable?: boolean;
  onDownload?: (attachment: Attachment) => void;
}

export type ParticipantsTableProps = PublicParticipantsTableProps | OrganizerParticipantsTableProps;

/** Celda vacía del DS (data-table: "—" para vacío). */
const EMPTY_CELL = '—';

const VOTE_PILL: Record<VoteCell, { tone: StatusPillTone; key: TranslationKey }> = {
  sent: { tone: 'success', key: 'manage.participants.voteSent' },
  pending: { tone: 'warning', key: 'manage.participants.votePending' },
  notParticipating: { tone: 'neutral', key: 'manage.participants.voteNotParticipating' },
};

/**
 * Pública (default): nombre y fecha de inscripción, nunca el email.
 * Organizador: nombre, email, archivo y, según la etapa, inscripción o voto.
 */
const ParticipantsTable: React.FC<ParticipantsTableProps> = (props) => {
  const { rows, caption, loading = false } = props;
  const { t, fmt } = useT();

  const registeredAt = (header: string): DataTableColumn<EventParticipant> => ({
    key: 'created_at',
    header,
    render: (row) => <span>{fmt.date(row.created_at.slice(0, 10))}</span>,
  });

  let columns: DataTableColumn<EventParticipant>[];
  if (props.variant === 'organizer') {
    const { stage, attachments, votingStatus, voteUnavailable = false, onDownload } = props;
    const byParticipant = new Map(attachments.map((a) => [a.participant_id, a]));

    const fileColumn: DataTableColumn<EventParticipant> = {
      key: 'file',
      header: t('manage.participants.file'),
      render: (row) => {
        const attachment = byParticipant.get(row.id);
        if (!attachment) {
          return (
            <StatusPill tone="warning" size="sm">
              {t('manage.participants.fileMissing')}
            </StatusPill>
          );
        }
        return (
          <Button
            variant="tertiary"
            size="sm"
            iconStart={<CheckIcon width={16} height={16} />}
            aria-label={t('manage.participants.download', { name: attachment.original_name })}
            onClick={() => onDownload?.(attachment)}
            className="ev-participants-table__file"
          >
            {attachment.original_name}
          </Button>
        );
      },
    };

    const voteColumn: DataTableColumn<EventParticipant> = {
      key: 'vote',
      header: t('manage.participants.vote'),
      render: (row) => {
        if (voteUnavailable) return <span>{EMPTY_CELL}</span>;
        const pill = VOTE_PILL[voteCell(row.id, votingStatus)];
        return (
          <StatusPill tone={pill.tone} size="sm">
            {t(pill.key)}
          </StatusPill>
        );
      },
    };

    columns = [
      { key: 'name', header: t('manage.participants.name') },
      { key: 'email', header: t('manage.participants.email') },
      fileColumn,
      stage === 'voting' ? voteColumn : registeredAt(t('manage.participants.registeredAt')),
    ];
  } else {
    columns = [{ key: 'name', header: t('participants.name') }, registeredAt(t('participants.registeredAt'))];
  }

  return (
    <div className={`ev-participants-table${props.variant === 'organizer' ? ' ev-participants-table--organizer' : ''}`}>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        caption={caption}
        captionHidden
        loading={loading}
        skeletonRows={4}
      />
    </div>
  );
};

export default ParticipantsTable;
