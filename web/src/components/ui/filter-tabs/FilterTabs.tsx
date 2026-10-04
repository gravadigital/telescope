import React from 'react';
import './FilterTabs.css';

export interface FilterTabOption {
  value: string;
  label: string;
  count?: number;
  /** Nombre accesible completo, p. ej. "Inscripción abierta, 4 eventos". */
  accessibleLabel?: string;
}

export interface FilterTabsProps {
  options: FilterTabOption[];
  value: string;
  onChange: (value: string) => void;
  /** Conteos como skeleton. */
  loading?: boolean;
  /** Id de la lista filtrada (`aria-controls`). */
  controls?: string;
  /** Nombre del tablist. */
  label?: string;
}

const FilterTabs: React.FC<FilterTabsProps> = ({
  options,
  value,
  onChange,
  loading = false,
  controls,
  label,
}) => {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const goTo = (index: number) => {
    tabRefs.current[index]?.focus();
    onChange(options[index].value);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = options.length - 1;
    let target: number | null = null;
    if (event.key === 'ArrowRight') target = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') target = index === 0 ? last : index - 1;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = last;
    if (target === null) return;
    event.preventDefault();
    goTo(target);
  };

  return (
    <div role="tablist" aria-label={label} className="ui-filter-tabs">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={controls}
            aria-label={option.accessibleLabel}
            tabIndex={selected ? 0 : -1}
            className={`ui-filter-tabs__tab${selected ? ' ui-filter-tabs__tab--selected' : ''}`}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span>{option.label}</span>
            {option.count !== undefined &&
              (loading ? (
                <span className="ui-filter-tabs__skeleton" aria-hidden="true" />
              ) : (
                <span> · {option.count}</span>
              ))}
          </button>
        );
      })}
    </div>
  );
};

export default FilterTabs;
