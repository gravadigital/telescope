import React from 'react';
import { addDays, formatDateLong, todayISO } from '../../../domain/dates';
import '../visually-hidden.css';
import './DateQuickPicker.css';

export interface DatePreset {
  days: number;
  label: string;
}

export interface DateQuickPickerProps {
  variant?: 'fromToday' | 'postpone';
  /** ISO `YYYY-MM-DD`. */
  value: string;
  min?: string;
  /** Hoy en ISO; inyectable para tests. */
  today?: string;
  /** ISO desde el que se suman los atajos; tiene prioridad sobre el default de la variante. */
  base?: string;
  presets?: DatePreset[];
  locale: string;
  label: string;
  help?: string;
  error?: string;
  changeLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const DateQuickPicker: React.FC<DateQuickPickerProps> = ({
  variant = 'fromToday',
  value,
  min,
  today,
  base: baseProp,
  presets = [],
  locale,
  label,
  help,
  error,
  changeLabel,
  disabled = false,
  onChange,
}) => {
  const uid = React.useId();
  const labelId = `${uid}-label`;
  const messageId = `${uid}-message`;
  const [initialValue] = React.useState(value);
  const [editing, setEditing] = React.useState(false);
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // postpone: la base es el cierre actual al montar, para que el atajo no se acumule.
  const base = baseProp ?? (variant === 'postpone' ? initialValue : today ?? todayISO());
  const targets = presets.map((p) => addDays(base, p.days));
  const isBlocked = (iso: string): boolean => min !== undefined && iso < min;
  const selectedIndex = targets.findIndex((t) => t === value);
  const tabStop = selectedIndex >= 0 ? selectedIndex : targets.findIndex((t) => !isBlocked(t));

  const choose = (index: number) => {
    if (disabled || isBlocked(targets[index])) return;
    onChange(targets[index]);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (!forward && !backward) return;
    event.preventDefault();
    const dir = forward ? 1 : -1;
    for (let step = 1; step <= targets.length; step += 1) {
      const next = (index + dir * step + targets.length * step) % targets.length;
      if (!isBlocked(targets[next])) {
        refs.current[next]?.focus();
        choose(next);
        return;
      }
    }
  };

  const handleDate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    if (!next || isBlocked(next)) return;
    onChange(next);
  };

  const message = error ?? help;

  return (
    <div className={`ui-date-quick-picker${error ? ' ui-date-quick-picker--error' : ''}`}>
      <span id={labelId} className="ui-date-quick-picker__label">
        {label}
      </span>
      <div className="ui-date-quick-picker__value-row">
        <p className="ui-date-quick-picker__value" aria-live="polite">
          {value ? formatDateLong(value, locale) : ''}
        </p>
        <button
          type="button"
          className="ui-date-quick-picker__change"
          disabled={disabled}
          onClick={() => setEditing((v) => !v)}
        >
          {changeLabel}
        </button>
      </div>
      {editing && (
        <input
          type="date"
          className="ui-date-quick-picker__date"
          aria-labelledby={labelId}
          min={min}
          value={value}
          disabled={disabled}
          onChange={handleDate}
        />
      )}
      <div role="radiogroup" aria-labelledby={labelId} className="ui-date-quick-picker__presets">
        {presets.map((preset, index) => {
          const blocked = isBlocked(targets[index]);
          const selected = index === selectedIndex;
          return (
            <button
              key={preset.days}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={blocked || undefined}
              disabled={disabled}
              tabIndex={index === tabStop ? 0 : -1}
              className={`ui-date-quick-picker__preset${
                selected ? ' ui-date-quick-picker__preset--selected' : ''
              }`}
              onClick={() => choose(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {message && (
        <p
          id={messageId}
          className={error ? 'ui-date-quick-picker__error' : 'ui-date-quick-picker__help'}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default DateQuickPicker;
