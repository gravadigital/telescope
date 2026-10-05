import React from 'react';
import { DataTable } from '../../ui';
import type { DataTableColumn } from '../../ui';
import { useT } from '../../../i18n';
import type { EventParticipant } from '../../../types';
import './ParticipantsTable.css';

export interface ParticipantsTableProps {
  rows: EventParticipant[];
  caption: string;
  loading?: boolean;
}

/** Variante pública: nombre y fecha de inscripción. Nunca muestra el email. */
const ParticipantsTable: React.FC<ParticipantsTableProps> = ({ rows, caption, loading = false }) => {
  const { t, fmt } = useT();

  const columns: DataTableColumn<EventParticipant>[] = [
    { key: 'name', header: t('participants.name') },
    {
      key: 'created_at',
      header: t('participants.registeredAt'),
      render: (row) => <span>{fmt.date(row.created_at.slice(0, 10))}</span>,
    },
  ];

  return (
    <div className="ev-participants-table">
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
