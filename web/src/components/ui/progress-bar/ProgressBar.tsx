import React from 'react';
import './ProgressBar.css';

export interface ProgressBarProps {
  value: number;
  max: number;
  tone?: 'action' | 'success' | 'warning';
  size?: 'sm' | 'md';
  /** Texto visible (siempre el número, además de la barra). */
  label?: string;
  /** Texto accesible traducido. */
  valueText?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  tone = 'action',
  size = 'md',
  label,
  valueText,
}) => {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="ui-progress-bar">
      <div
        className={`ui-progress-bar__track ui-progress-bar__track--${size}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={valueText}
      >
        <div
          className={`ui-progress-bar__fill ui-progress-bar__fill--${tone}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {label && <span className="ui-progress-bar__label">{label}</span>}
    </div>
  );
};

export default ProgressBar;
