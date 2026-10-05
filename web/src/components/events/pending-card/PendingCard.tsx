import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../ui/card/Card';
import { useT } from '../../../i18n';
import type { PendingTask } from '../../../domain/events';
import './PendingCard.css';

export interface PendingCardProps {
  task: PendingTask;
}

const PendingCard: React.FC<PendingCardProps> = ({ task }) => {
  const { t, fmt } = useT();
  const { kind, event, deadline } = task;

  const title = t(`events.pending.${kind}Title` as const);
  const action = t(`events.pending.${kind}Action` as const);

  let detail: string | null = null;
  if (kind === 'results') {
    detail = t('events.pending.resultsPosition', {
      position: task.position ?? 0,
      total: task.total ?? 0,
    });
  } else if (deadline) {
    detail = t('events.pending.closes', { date: fmt.date(deadline) });
  }

  return (
    <Card as="article" variant="default" padding="compact" className="ev-pending-card">
      <div className="ev-pending-card__body">
        <h3 className="ev-pending-card__title">{title}</h3>
        <p className="ev-pending-card__event">{event.name}</p>
        {detail && <p className="ev-pending-card__deadline">{detail}</p>}
      </div>
      <Link
        to={`/events/${event.id}`}
        className="ui-button ui-button--sm ui-button--primary ev-pending-card__action"
      >
        {action}
      </Link>
    </Card>
  );
};

export default PendingCard;
