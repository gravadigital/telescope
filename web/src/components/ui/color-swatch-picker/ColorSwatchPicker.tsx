import React from 'react';
import { COVER_COLORS, coverColorVar } from '../../../domain/coverColors';
import type { CoverColorId } from '../../../domain/coverColors';
import { CheckIcon } from '../icons/Icons';
import './ColorSwatchPicker.css';

export interface ColorSwatchPickerProps {
  value: CoverColorId;
  onChange: (id: CoverColorId) => void;
  label: string;
  help?: string;
  disabled?: boolean;
  /** Nombre de cada color en el idioma activo: es lo que lee el lector de pantalla. */
  names: Record<CoverColorId, string>;
  /** Apunta a la muestra elegida: sirve de foco inicial dentro de un diálogo. */
  selectedRef?: React.Ref<HTMLButtonElement>;
}

const MOBILE_COLUMNS = 4;
const DESKTOP_COLUMNS = 8;

// Mismo corte que la grilla del CSS (único breakpoint, 768px).
const columnsNow = (): number =>
  window.matchMedia?.('(min-width: 768px)').matches ? DESKTOP_COLUMNS : MOBILE_COLUMNS;

const assignRef = (ref: React.Ref<HTMLButtonElement> | undefined, node: HTMLButtonElement | null): void => {
  if (typeof ref === 'function') ref(node);
  else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
};

const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({
  value,
  onChange,
  label,
  help,
  disabled = false,
  names,
  selectedRef,
}) => {
  const baseId = React.useId();
  const labelId = `${baseId}-label`;
  const helpId = `${baseId}-help`;
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // Como un radiogroup nativo: las flechas mueven el foco y eligen; no dan la vuelta en los bordes.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columnsNow(),
      ArrowUp: -columnsNow(),
    };
    if (event.key in step) {
      event.preventDefault();
      const next = index + step[event.key];
      if (next < 0 || next >= COVER_COLORS.length) return;
      refs.current[next]?.focus();
      onChange(COVER_COLORS[next]);
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onChange(COVER_COLORS[index]);
    }
  };

  return (
    <div className="ui-swatch-picker">
      <span id={labelId} className="ui-swatch-picker__label">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={help ? helpId : undefined}
        className="ui-swatch-picker__grid"
      >
        {COVER_COLORS.map((id, index) => {
          const selected = id === value;
          return (
            <button
              key={id}
              ref={(node) => {
                refs.current[index] = node;
                if (selected) assignRef(selectedRef, node);
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={names[id]}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              className="ui-swatch-picker__swatch"
              onClick={() => onChange(id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span
                className="ui-swatch-picker__dot"
                style={{ '--swatch-color': coverColorVar(id) } as React.CSSProperties}
              >
                {selected && <CheckIcon className="ui-swatch-picker__check" />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="ui-swatch-picker__name">{names[value]}</p>
      {help && (
        <p id={helpId} className="ui-swatch-picker__help">
          {help}
        </p>
      )}
    </div>
  );
};

export default ColorSwatchPicker;
