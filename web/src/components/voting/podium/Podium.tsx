import React from 'react';
import { Card, StatusPill } from '../../ui';
import { useT } from '../../../i18n';
import type { AttachmentResult } from '../../../types';
import './Podium.css';

export interface PodiumProps {
  /** Hasta 3 entradas, ya ordenadas (ver `splitResults`). */
  entries: AttachmentResult[];
  currentUserId: string | null;
}

const Podium: React.FC<PodiumProps> = ({ entries, currentUserId }) => {
  const { t, fmt } = useT();

  return (
    <ol className="vt-podium" aria-label={t('results.podium')}>
      {entries.map((entry) => {
        const isYou = currentUserId !== null && entry.participant_id === currentUserId;
        return (
          <li
            key={entry.attachment_id}
            className={`vt-podium__item${isYou ? ' vt-podium__item--you' : ''}`}
          >
            <Card variant={isYou ? 'raised' : 'default'} padding="default" className="vt-podium__card">
              <p className="vt-podium__place">{t('results.place', { position: entry.adjusted_rank })}</p>
              <p className="vt-podium__name">
                <span>{entry.participant_name || '—'}</span>
                {isYou && (
                  <StatusPill tone="action" size="sm">
                    {t('results.you')}
                  </StatusPill>
                )}
              </p>
              <p className="vt-podium__proposal">{entry.filename}</p>
              <p className="vt-podium__score">{t('common.points', { score: fmt.score(entry.mbc_score) })}</p>
            </Card>
          </li>
        );
      })}
    </ol>
  );
};

export default Podium;
