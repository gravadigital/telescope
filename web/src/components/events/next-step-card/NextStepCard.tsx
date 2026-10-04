import React from 'react';
import Card from '../../ui/card/Card';
import Button from '../../ui/button/Button';
import Callout from '../../ui/callout/Callout';
import { CheckIcon } from '../../ui/icons/Icons';
import '../../ui/visually-hidden.css';
import './NextStepCard.css';

export interface NextStepAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

export interface NextStepChecklistItem {
  label: string;
  done: boolean;
}

export interface NextStepCardProps {
  eyebrow?: string;
  title: string;
  description?: string;
  checklist?: NextStepChecklistItem[];
  doneLabel?: string;
  pendingLabel?: string;
  /** Advertencia asociada al botón primario con `aria-describedby`. */
  consequence?: string;
  primaryAction?: NextStepAction;
  primaryVariant?: 'primary' | 'secondary';
  secondaryAction?: NextStepAction;
  /** Contenido propio de la pantalla, entre la descripción y las acciones. */
  children?: React.ReactNode;
}

const NextStepCard: React.FC<NextStepCardProps> = ({
  eyebrow,
  title,
  description,
  checklist,
  doneLabel,
  pendingLabel,
  consequence,
  primaryAction,
  primaryVariant = 'primary',
  secondaryAction,
  children,
}) => {
  const consequenceId = React.useId();

  return (
    <Card variant="raised" padding="spacious" eyebrow={eyebrow} title={title} className="ev-next-step">
      {description && <p className="ev-next-step__description">{description}</p>}
      {checklist && checklist.length > 0 && (
        <ul className="ev-next-step__checklist">
          {checklist.map((item) => (
            <li
              key={item.label}
              className={`ev-next-step__check ev-next-step__check--${item.done ? 'done' : 'pending'}`}
            >
              <span className="ev-next-step__mark" aria-hidden="true">
                {item.done && <CheckIcon width={14} height={14} />}
              </span>
              <span>{item.label}</span>
              <span className="ui-visually-hidden">{item.done ? doneLabel : pendingLabel}</span>
            </li>
          ))}
        </ul>
      )}
      {children}
      {consequence && (
        <Callout tone="warning" id={consequenceId}>
          {consequence}
        </Callout>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="ev-next-step__actions">
          {primaryAction && (
            <Button
              size="lg"
              variant={primaryVariant}
              className="ev-next-step__primary"
              disabled={primaryAction.disabled}
              loading={primaryAction.loading}
              loadingLabel={primaryAction.loadingLabel}
              aria-describedby={consequence ? consequenceId : undefined}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="tertiary"
              disabled={secondaryAction.disabled}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default NextStepCard;
