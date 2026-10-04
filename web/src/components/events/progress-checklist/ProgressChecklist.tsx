import React from 'react';
import Card from '../../ui/card/Card';
import { CheckIcon } from '../../ui/icons/Icons';
import '../../ui/visually-hidden.css';
import './ProgressChecklist.css';

export interface ProgressStep {
  label: string;
  detail?: string;
  status: 'done' | 'current' | 'pending';
}

export interface ProgressChecklistProps {
  title: string;
  headingLevel?: 2 | 3 | 4;
  steps: ProgressStep[];
  doneLabel: string;
}

const ProgressChecklist: React.FC<ProgressChecklistProps> = ({
  title,
  headingLevel = 2,
  steps,
  doneLabel,
}) => (
  <Card title={title} headingLevel={headingLevel} className="ev-progress-checklist">
    <ol className="ev-progress-checklist__list">
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={`ev-progress-checklist__step ev-progress-checklist__step--${step.status}`}
          aria-current={step.status === 'current' ? 'step' : undefined}
        >
          <span className="ev-progress-checklist__marker">
            {step.status === 'done' ? (
              <>
                <CheckIcon width={14} height={14} />
                <span className="ui-visually-hidden">{doneLabel}</span>
              </>
            ) : (
              <span aria-hidden="true">{index + 1}</span>
            )}
          </span>
          <span className="ev-progress-checklist__text">
            <span className="ev-progress-checklist__label">{step.label}</span>
            {step.detail && <span className="ev-progress-checklist__detail">{step.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  </Card>
);

export default ProgressChecklist;
