import React from 'react';
import { createPortal } from 'react-dom';
import Button from '../button/Button';
import { CloseIcon } from '../icons/Icons';
import { getFocusableElements } from '../focus';
import './Dialog.css';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  variant?: 'default' | 'alert';
  size?: 'sm' | 'md';
  /** Transición de etapa en eyebrow, p. ej. "CREACIÓN → PARTICIPACIÓN". */
  eyebrow?: string;
  title: string;
  /** Acción en curso: no cierra con Escape, backdrop ni ×. */
  busy?: boolean;
  actions?: React.ReactNode;
  closeLabel: string;
  /** Id del texto explicativo (`aria-describedby`). */
  describedBy?: string;
  /** Elemento con el foco inicial (en `alert`, la opción segura). */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  children?: React.ReactNode;
}

const DialogContent: React.FC<DialogProps> = ({
  onClose,
  variant = 'default',
  size = 'sm',
  eyebrow,
  title,
  busy = false,
  actions,
  closeLabel,
  describedBy,
  initialFocusRef,
  children,
}) => {
  const titleId = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  // Siempre la última versión, sin reenganchar listeners ni mover el foco al re-renderizar.
  const latest = React.useRef({ onClose, busy });
  latest.current = { onClose, busy };

  // Foco, inert del resto de la página y bloqueo de scroll: solo mientras está montado.
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const marked: Element[] = [];
    Array.from(document.body.children).forEach((child) => {
      if (child !== rootRef.current && !child.hasAttribute('inert')) {
        child.setAttribute('inert', '');
        marked.push(child);
      }
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current!;
    const focusables = getFocusableElements(panel);
    const preferred = focusables.filter((el) => el !== closeRef.current);
    const target = initialFocusRef?.current ?? preferred[0] ?? closeRef.current ?? panel;
    target.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !latest.current.busy) {
        event.stopPropagation();
        latest.current.onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      marked.forEach((el) => el.removeAttribute('inert'));
      document.body.style.overflow = previousOverflow;
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
    // Solo al montar: el foco inicial no se repite en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const panel = panelRef.current!;
    const focusables = getFocusableElements(panel);
    if (focusables.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleBackdrop = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (variant === 'default' && !busy) onClose();
  };

  return (
    <div ref={rootRef} className="ui-dialog">
      <div className="ui-dialog__backdrop" onClick={handleBackdrop}>
        <div
          ref={panelRef}
          className={`ui-dialog__panel ui-dialog__panel--${size}`}
          role={variant === 'alert' ? 'alertdialog' : 'dialog'}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={describedBy}
          aria-busy={busy || undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <header className="ui-dialog__header">
            <div className="ui-dialog__heading">
              {eyebrow && <p className="ui-dialog__eyebrow">{eyebrow}</p>}
              <h2 id={titleId} className="ui-dialog__title">
                {title}
              </h2>
            </div>
            <Button
              ref={closeRef}
              variant="icon"
              aria-label={closeLabel}
              iconStart={<CloseIcon />}
              disabled={busy}
              onClick={onClose}
            />
          </header>
          <div className="ui-dialog__body">{children}</div>
          {actions && <footer className="ui-dialog__actions">{actions}</footer>}
        </div>
      </div>
    </div>
  );
};

const Dialog: React.FC<DialogProps> = (props) =>
  props.open ? createPortal(<DialogContent {...props} />, document.body) : null;

export default Dialog;
