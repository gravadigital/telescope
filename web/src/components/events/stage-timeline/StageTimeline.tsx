import React from 'react';
import Button from '../../ui/button/Button';
import { CheckIcon } from '../../ui/icons/Icons';
import { STAGE_ORDER, stageStatus } from '../../../domain/stages';
import type { EventStage } from '../../../types';
import '../../ui/visually-hidden.css';
import './StageTimeline.css';

export interface StageTimelineProps {
  current: EventStage;
  stageLabels: Record<EventStage, string>;
  subtitles?: Partial<Record<EventStage, React.ReactNode>>;
  nowLabel: string;
  completedLabel: string;
  pendingLabel: string;
  /** Texto "etapa N de 4" que arma la pantalla. */
  stepOfLabel: string;
  variant?: 'full' | 'compact';
  onEditDeadline?: (stage: EventStage) => void;
  editLabel?: string;
  /** Texto extra del resumen mobile (p. ej. el cierre de la etapa). */
  summaryDetail?: React.ReactNode;
}

const StageTimeline: React.FC<StageTimelineProps> = ({
  current,
  stageLabels,
  subtitles,
  nowLabel,
  completedLabel,
  pendingLabel,
  stepOfLabel,
  variant = 'full',
  onEditDeadline,
  editLabel,
  summaryDetail,
}) => {
  const compact = variant === 'compact';

  return (
    <div className={`ev-stage-timeline ev-stage-timeline--${variant}`}>
      {!compact && (
        <p className="ev-stage-timeline__summary">
          {`${stageLabels[current]} · ${nowLabel} · ${stepOfLabel}`}
          {summaryDetail ? <> {'· '}{summaryDetail}</> : null}
        </p>
      )}
      <ol className={`ev-stage-timeline__list${compact ? ' ev-stage-timeline__list--compact' : ''}`}>
        {STAGE_ORDER.map((stage) => {
          const status = stageStatus(stage, current);
          const editable =
            !compact &&
            status === 'current' &&
            (stage === 'participation' || stage === 'voting') &&
            onEditDeadline &&
            editLabel;
          return (
            <li
              key={stage}
              className={`ev-stage-timeline__item ev-stage-timeline__item--${status}`}
              aria-current={status === 'current' ? 'step' : undefined}
            >
              <span className="ev-stage-timeline__marker">
                {status === 'completed' && <CheckIcon width={14} height={14} />}
              </span>
              <span className="ev-stage-timeline__name">{stageLabels[stage]}</span>
              {status === 'current' && <span className="ev-stage-timeline__now">{nowLabel}</span>}
              {status === 'completed' && <span className="ui-visually-hidden">{completedLabel}</span>}
              {status === 'pending' && <span className="ui-visually-hidden">{pendingLabel}</span>}
              {!compact && subtitles?.[stage] && (
                <span className="ev-stage-timeline__subtitle">{subtitles[stage]}</span>
              )}
              {editable && (
                <Button variant="tertiary" size="sm" onClick={() => onEditDeadline!(stage)}>
                  {editLabel}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default StageTimeline;
