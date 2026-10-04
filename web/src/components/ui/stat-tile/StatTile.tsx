import React from 'react';
import ProgressBar from '../progress-bar/ProgressBar';
import '../visually-hidden.css';
import './StatTile.css';

export interface StatTileProps {
  label: string;
  value: number | string;
  total?: number;
  unit?: string;
  /** Muestra la barra (requiere `total` y un `value` numérico). */
  progress?: boolean;
  variant?: 'default' | 'compact';
  loading?: boolean;
  /** Lectura completa, p. ej. "Inscriptos: 4 de 20". */
  accessibleText?: string;
}

const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  total,
  unit,
  progress = false,
  variant = 'default',
  loading = false,
  accessibleText,
}) => (
  <div className={`ui-stat-tile ui-stat-tile--${variant}`} aria-busy={loading || undefined}>
    {accessibleText && !loading && <span className="ui-visually-hidden">{accessibleText}</span>}
    <div aria-hidden={accessibleText && !loading ? true : undefined}>
      <p className="ui-stat-tile__label">{label}</p>
      {loading ? (
        <div className="ui-stat-tile__skeleton" />
      ) : (
        <p className="ui-stat-tile__value">
          {value}
          {total !== undefined && <span className="ui-stat-tile__total"> / {total}</span>}
          {unit && <span className="ui-stat-tile__total"> {unit}</span>}
        </p>
      )}
      {!loading && progress && total !== undefined && typeof value === 'number' && (
        <ProgressBar value={value} max={total} />
      )}
    </div>
  </div>
);

export default StatTile;
