import React from 'react';
import { Card, ProgressBar, StatusPill } from '../../ui';
import { stagePill } from '../../../domain';
import { useT } from '../../../i18n';
import './EventPreview.css';

interface EventPreviewProps {
  name: string;
  description: string;
  organizer: string;
  capacity: number;
  /** Se muestra cuando el organizador está vacío (nombre del usuario en sesión). */
  fallbackOrganizer: string;
}

/** Cómo se verá el evento en la lista cuando abra la inscripción. Decorativa: no recibe foco. */
const EventPreview: React.FC<EventPreviewProps> = ({
  name,
  description,
  organizer,
  capacity,
  fallbackOrganizer,
}) => {
  const { t } = useT();
  const pill = stagePill({ stage: 'participation', is_paused: false, is_cancelled: false });
  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const shownOrganizer = organizer.trim() || fallbackOrganizer;

  return (
    <div className="ev-event-preview" aria-hidden="true">
      <Card variant="default">
        <div className="ev-event-preview__body">
          <StatusPill tone={pill.tone} icon={pill.icon} size="sm">
            {t(pill.key)}
          </StatusPill>
          <p
            className={`ev-event-preview__name${trimmedName ? '' : ' ev-event-preview__placeholder'}`}
          >
            {trimmedName || t('createEvent.preview.namePlaceholder')}
          </p>
          <p
            className={`ev-event-preview__desc${
              trimmedDescription ? '' : ' ev-event-preview__placeholder'
            }`}
          >
            {trimmedDescription || t('createEvent.preview.descriptionPlaceholder')}
          </p>
          <p className="ev-event-preview__organizer">
            {t('createEvent.preview.by', { organizer: shownOrganizer })}
          </p>
          <ProgressBar
            size="sm"
            value={0}
            max={capacity}
            label={t('events.table.capacity', { count: 0, max: capacity })}
            valueText={t('events.table.capacityText', { count: 0, max: capacity })}
          />
        </div>
      </Card>
    </div>
  );
};

export default EventPreview;
