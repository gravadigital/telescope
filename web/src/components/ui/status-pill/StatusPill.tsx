import React from 'react';
import { CheckIcon, DotIcon } from '../icons/Icons';
import './StatusPill.css';

export type StatusPillTone = 'success' | 'warning' | 'action' | 'neutral' | 'onBand';

export interface StatusPillProps {
  tone?: StatusPillTone;
  size?: 'sm' | 'md';
  icon?: 'dot' | 'check' | 'none';
  children: React.ReactNode;
}

const StatusPill: React.FC<StatusPillProps> = ({
  tone = 'neutral',
  size = 'md',
  icon = 'none',
  children,
}) => (
  <span
    className={`ui-status-pill ui-status-pill--${tone === 'onBand' ? 'on-band' : tone} ui-status-pill--${size}`}
  >
    {icon === 'dot' && <DotIcon className="ui-status-pill__icon" width={10} height={10} />}
    {icon === 'check' && <CheckIcon className="ui-status-pill__icon" width={14} height={14} />}
    <span className="ui-status-pill__label">{children}</span>
  </span>
);

export default StatusPill;
