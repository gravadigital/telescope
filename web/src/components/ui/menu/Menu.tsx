import React from 'react';
import { CheckIcon } from '../icons/Icons';
import './Menu.css';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /**
   * Marca el ítem como opción elegida. En `variant="select"` todos los ítems son opciones;
   * en `actions`, un ítem con `selected` definido (`true` o `false`) se vuelve una opción
   * (`menuitemradio`) y el resto sigue siendo una acción.
   */
  selected?: boolean;
  onSelect: () => void;
}

export interface MenuProps {
  trigger: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  variant?: 'actions' | 'select';
  items: MenuItem[];
  align?: 'start' | 'end';
  /** Nombre accesible del menú. */
  label?: string;
}

const Menu: React.FC<MenuProps> = ({ trigger, variant = 'actions', items, align = 'end', label }) => {
  const menuId = React.useId();
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLSpanElement>(null);
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [pendingFocus, setPendingFocus] = React.useState<number | null>(null);

  const triggerEl = (): HTMLElement | null =>
    wrapperRef.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]') ?? null;

  const openAt = (index: number) => {
    setOpen(true);
    setPendingFocus(index);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerEl()?.focus();
  };

  React.useEffect(() => {
    if (open && pendingFocus !== null) {
      itemRefs.current[pendingFocus]?.focus();
      setPendingFocus(null);
    }
  }, [open, pendingFocus]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const clonedTrigger = React.cloneElement(trigger, {
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      trigger.props.onClick?.(event);
      if (open) setOpen(false);
      else openAt(0);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      trigger.props.onKeyDown?.(event);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        openAt(0);
      }
    },
  } as React.HTMLAttributes<HTMLElement>);

  const move = (current: number, delta: number) => {
    const next = (current + delta + items.length) % items.length;
    itemRefs.current[next]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(index, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(index, -1);
        break;
      case 'Home':
        event.preventDefault();
        itemRefs.current[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        itemRefs.current[items.length - 1]?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
      default:
    }
  };

  return (
    <span ref={wrapperRef} className="ui-menu">
      {clonedTrigger}
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={`ui-menu__panel ui-menu__panel--${align}`}
        >
          {items.map((item, index) => {
            const isRadio = variant === 'select' || item.selected !== undefined;
            return (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role={isRadio ? 'menuitemradio' : 'menuitem'}
              aria-checked={isRadio ? Boolean(item.selected) : undefined}
              tabIndex={-1}
              className="ui-menu__item"
              onKeyDown={(event) => handleKeyDown(event, index)}
              onClick={() => {
                item.onSelect();
                close(true);
              }}
            >
              {item.icon && <span className="ui-menu__icon">{item.icon}</span>}
              <span className="ui-menu__label">{item.label}</span>
              {isRadio && item.selected && <CheckIcon className="ui-menu__check" />}
            </button>
            );
          })}
        </div>
      )}
    </span>
  );
};

export default Menu;
