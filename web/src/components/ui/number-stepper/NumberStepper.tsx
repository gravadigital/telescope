import React from 'react';
import Button from '../button/Button';
import { MinusIcon, PlusIcon } from '../icons/Icons';
import './NumberStepper.css';

export interface NumberStepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  recommended?: number;
  recommendedLabel?: string;
  unit?: string;
  label: string;
  help?: string;
  error?: string;
  /** Texto cuando se tipea un valor fuera de rango. */
  rangeError?: string;
  decrementLabel: string;
  incrementLabel: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  min,
  max,
  step = 1,
  recommended,
  recommendedLabel,
  unit,
  label,
  help,
  error,
  rangeError,
  decrementLabel,
  incrementLabel,
  disabled = false,
  onChange,
}) => {
  const inputId = React.useId();
  const messageId = `${inputId}-message`;
  const [draft, setDraft] = React.useState<string>(String(value));
  const [outOfRange, setOutOfRange] = React.useState(false);

  // El valor controlado manda cuando cambia desde afuera.
  React.useEffect(() => {
    setDraft(String(value));
    setOutOfRange(false);
  }, [value]);

  const decimalStep = !Number.isInteger(step);
  const clamp = (n: number): number => Math.min(max, Math.max(min, n));
  // Con paso decimal se ajusta a la grilla del paso y a centésimos (evita 0.6500000001).
  const snap = (n: number): number =>
    decimalStep ? Math.round(Math.round(n / step) * step * 100) / 100 : n;
  const move = (direction: 1 | -1) => {
    const next = clamp(snap(value + direction * step));
    if (next !== value) onChange(next);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setDraft(text);
    if (text.trim() === '') {
      setOutOfRange(false);
      return;
    }
    const parsed = Number(text);
    const allowed = decimalStep ? Number.isFinite(parsed) : Number.isInteger(parsed);
    if (allowed && parsed >= min && parsed <= max) {
      setOutOfRange(false);
      onChange(parsed);
    } else {
      setOutOfRange(true);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(-1);
    }
  };

  // Al salir del campo se vuelve al último valor válido; el aviso queda hasta la próxima edición.
  const handleBlur = () => setDraft(String(value));

  const message = error ?? (outOfRange ? rangeError : undefined);
  const invalid = Boolean(message);

  return (
    <div className={`ui-number-stepper${invalid ? ' ui-number-stepper--error' : ''}`}>
      <label htmlFor={inputId} className="ui-number-stepper__label">
        {label}
      </label>
      <div className="ui-number-stepper__row">
        <Button
          variant="icon"
          aria-label={decrementLabel}
          aria-controls={inputId}
          iconStart={<MinusIcon />}
          disabled={disabled || value <= min}
          onClick={() => move(-1)}
          className="ui-number-stepper__button"
        />
        <input
          id={inputId}
          className="ui-number-stepper__input"
          type="number"
          role="spinbutton"
          inputMode={decimalStep ? 'decimal' : 'numeric'}
          min={min}
          max={max}
          step={step}
          value={draft}
          disabled={disabled}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={message || help ? messageId : undefined}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        <Button
          variant="icon"
          aria-label={incrementLabel}
          aria-controls={inputId}
          iconStart={<PlusIcon />}
          disabled={disabled || value >= max}
          onClick={() => move(1)}
          className="ui-number-stepper__button"
        />
        {unit && <span className="ui-number-stepper__unit">{unit}</span>}
        {recommended !== undefined && recommendedLabel && value === recommended && (
          <span className="ui-number-stepper__badge">{recommendedLabel}</span>
        )}
      </div>
      {message ? (
        <p id={messageId} className="ui-number-stepper__error">
          {message}
        </p>
      ) : (
        help && (
          <p id={messageId} className="ui-number-stepper__help">
            {help}
          </p>
        )
      )}
    </div>
  );
};

export default NumberStepper;
