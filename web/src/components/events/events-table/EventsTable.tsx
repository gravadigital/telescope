import React from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../ui/data-table/DataTable';
import type { DataTableColumn } from '../../ui/data-table/DataTable';
import StatusPill from '../../ui/status-pill/StatusPill';
import ProgressBar from '../../ui/progress-bar/ProgressBar';
import { useT } from '../../../i18n';
import { currentDeadline, myStatusLabel, rowAction, stagePill } from '../../../domain/events';
import type { EventListItem, MyEvent } from '../../../types';
import './EventsTable.css';

type Row = EventListItem | MyEvent;

export interface EventsTableProps {
  variant: 'public' | 'organizer' | 'participant';
  caption: string;
  captionHidden?: boolean;
  rows: EventListItem[] | MyEvent[];
  userId: string | null;
  /** Solo `public`: el ítem de `scope=all` con el mismo id, para resolver la acción. */
  myEventsById?: Record<string, MyEvent>;
  loading?: boolean;
  skeletonRows?: number;
}

const isMyEvent = (row: Row): row is MyEvent => 'role' in row;

const EventsTable: React.FC<EventsTableProps> = ({
  variant,
  caption,
  captionHidden,
  rows,
  userId,
  myEventsById,
  loading,
  skeletonRows,
}) => {
  const { t, fmt } = useT();
  const navigate = useNavigate();

  const eventCell = (row: Row): React.ReactNode => (
    <div className="ev-events-table__event">
      <span className="ev-events-table__name">{row.name}</span>
      {row.description && <span className="ev-events-table__desc">{row.description}</span>}
    </div>
  );

  const stageCell = (row: Row): React.ReactNode => {
    const pill = stagePill(row);
    return (
      <StatusPill tone={pill.tone} icon={pill.icon} size="sm">
        {t(pill.key)}
      </StatusPill>
    );
  };

  const capacityCell = (row: Row): React.ReactNode => {
    const count = row.participants_count;
    if (row.max_participants === null) {
      return <span>{t('events.table.registered', { count })}</span>;
    }
    const max = row.max_participants;
    return (
      <ProgressBar
        size="sm"
        value={count}
        max={max}
        label={t('events.table.capacity', { count, max })}
        valueText={t('events.table.capacityText', { count, max })}
      />
    );
  };

  const dateOrDash = (date: string | null): string => (date ? fmt.date(date) : '—');

  const eventColumn: DataTableColumn<Row> = {
    key: 'event',
    header: t('events.table.event'),
    render: eventCell,
  };
  const stageColumn: DataTableColumn<Row> = {
    key: 'stage',
    header: t('events.table.stage'),
    render: stageCell,
  };
  const capacityColumn: DataTableColumn<Row> = {
    key: 'participants',
    header: t('events.table.participants'),
    render: capacityCell,
  };
  const closeColumn: DataTableColumn<Row> = {
    key: 'close',
    header: t('events.table.close'),
    render: (row) => dateOrDash(currentDeadline(row)),
  };

  let columns: DataTableColumn<Row>[];
  if (variant === 'public') {
    columns = [
      eventColumn,
      stageColumn,
      capacityColumn,
      {
        key: 'created',
        header: t('events.table.created'),
        render: (row) => dateOrDash(row.created_at),
      },
    ];
  } else if (variant === 'organizer') {
    columns = [eventColumn, stageColumn, capacityColumn, closeColumn];
  } else {
    columns = [
      eventColumn,
      stageColumn,
      {
        key: 'myStatus',
        header: t('events.table.myStatus'),
        render: (row) => {
          const label = isMyEvent(row) ? myStatusLabel(row) : null;
          return label ? t(label.key, label.params) : '—';
        },
      },
      closeColumn,
    ];
  }

  return (
    <DataTable<Row>
      caption={caption}
      captionHidden={captionHidden}
      columns={columns}
      rows={rows as Row[]}
      rowKey={(row) => row.id}
      actionHeader={t('events.table.action')}
      loading={loading}
      skeletonRows={skeletonRows}
      rowAction={(row) => {
        const myEvent = isMyEvent(row) ? row : myEventsById?.[row.id];
        const action = rowAction({ event: row, userId, myEvent });
        const label = t(`events.actions.${action.kind}` as const);
        return {
          label,
          accessibleLabel: t('events.actions.accessibleName', { action: label, name: row.name }),
          hint: action.hint ? t(`events.actions.${action.hint}` as const) : undefined,
          variant: action.variant,
          onClick: () => navigate(action.to),
        };
      }}
    />
  );
};

export default EventsTable;
