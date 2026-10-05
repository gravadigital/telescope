import React from 'react';
import { DataTable, StatusPill } from '../../ui';
import type { DataTableColumn } from '../../ui';
import { useT } from '../../../i18n';
import type { AttachmentResult } from '../../../types';
import './RankingList.css';

export interface RankingListProps {
  entries: AttachmentResult[];
  currentUserId: string | null;
}

const RankingList: React.FC<RankingListProps> = ({ entries, currentUserId }) => {
  const { t, fmt } = useT();
  const isYou = (row: AttachmentResult): boolean =>
    currentUserId !== null && row.participant_id === currentUserId;

  const columns: DataTableColumn<AttachmentResult>[] = [
    { key: 'position', header: t('results.position'), render: (row) => <span>{row.adjusted_rank}</span> },
    {
      key: 'participant',
      header: t('results.participant'),
      render: (row) => (
        <span className="vt-ranking-list__participant">
          <span>{row.participant_name || '—'}</span>
          {isYou(row) && (
            <StatusPill tone="action" size="sm">
              {t('results.you')}
            </StatusPill>
          )}
        </span>
      ),
    },
    { key: 'filename', header: t('results.proposal') },
    {
      key: 'score',
      header: t('results.score'),
      align: 'end',
      render: (row) => <span>{t('common.points', { score: fmt.score(row.mbc_score) })}</span>,
    },
  ];

  return (
    <div className="vt-ranking-list">
      <DataTable
        columns={columns}
        rows={entries}
        rowKey={(row) => row.attachment_id}
        caption={t('results.ranking')}
        captionHidden
        highlightRow={isYou}
      />
    </div>
  );
};

export default RankingList;
