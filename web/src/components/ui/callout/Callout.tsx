import React from 'react';
import Button from '../button/Button';
import { CheckIcon, DotIcon } from '../icons/Icons';
import './Callout.css';

export type CalloutTone = 'info' | 'warning' | 'error' | 'success';

export interface CalloutAction {
  label: string;
  onClick: () => void;
  busy?: boolean;
}

export interface CalloutProps {
  tone?: CalloutTone;
  title?: string;
  /** Permite que un botón lo referencie con `aria-describedby`. */
  id?: string;
  action?: CalloutAction;
  children?: React.ReactNode;
}

const Callout: React.FC<CalloutProps> = ({ tone = 'info', title, id, action, children }) => (
  <div
    id={id}
    className={`ui-callout ui-callout--${tone}`}
    role={tone === 'error' ? 'alert' : undefined}
  >
    {tone === 'success' ? (
      <CheckIcon className="ui-callout__icon" />
    ) : (
      <DotIcon className="ui-callout__icon" />
    )}
    <div className="ui-callout__body">
      {title && <p className="ui-callout__title">{title}</p>}
      {children && <div className="ui-callout__text">{children}</div>}
      {action && (
        <Button
          variant="tertiary"
          size="sm"
          loading={action.busy}
          onClick={action.onClick}
          className="ui-callout__action"
        >
          {action.label}
        </Button>
      )}
    </div>
  </div>
);

export default Callout;
