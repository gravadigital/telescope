import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dialog, { DialogProps } from './Dialog';
import Button from '../button/Button';

const renderDialog = (over: Partial<DialogProps> = {}) => {
  const onClose = jest.fn();
  const utils = render(
    <Dialog
      open
      title="Abrir inscripción"
      eyebrow="CREACIÓN → PARTICIPACIÓN"
      closeLabel="Cerrar"
      onClose={onClose}
      actions={<Button>Abrir inscripción</Button>}
      {...over}
    >
      <p>Cuerpo</p>
      <input aria-label="Fecha" />
    </Dialog>
  );
  return { onClose, ...utils };
};

describe('Dialog', () => {
  it('TS-19: rol, nombre, eyebrow y botón cerrar', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Abrir inscripción' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('CREACIÓN → PARTICIPACIÓN')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

  it('TS-20: foco inicial en el primer control y trampa de Tab', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    const input = screen.getByLabelText('Fecha');
    expect(input).toHaveFocus();

    const buttons = screen.getAllByRole('button');
    const last = buttons[buttons.length - 1];
    const first = screen.getByRole('button', { name: 'Cerrar' });
    last.focus();
    userEvent.tab();
    expect(first).toHaveFocus();
    userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('TS-21: Escape cierra salvo con busy', () => {
    const { onClose, unmount } = renderDialog();
    userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();

    const busy = renderDialog({ busy: true });
    userEvent.keyboard('{Escape}');
    expect(busy.onClose).not.toHaveBeenCalled();
  });

  it('TS-22: devuelve el foco al disparador', () => {
    const Harness: React.FC = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Abrir</button>
          <Dialog open={open} title="Título" closeLabel="Cerrar" onClose={() => setOpen(false)}>
            <input aria-label="Campo" />
          </Dialog>
        </>
      );
    };
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    userEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('TS-23: alert no cierra por backdrop; default sí; el panel nunca', () => {
    const alert = renderDialog({ variant: 'alert' });
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    userEvent.click(document.querySelector('.ui-dialog__backdrop') as HTMLElement);
    expect(alert.onClose).not.toHaveBeenCalled();
    alert.unmount();

    const def = renderDialog();
    userEvent.click(screen.getByText('Cuerpo'));
    expect(def.onClose).not.toHaveBeenCalled();
    userEvent.click(document.querySelector('.ui-dialog__backdrop') as HTMLElement);
    expect(def.onClose).toHaveBeenCalledTimes(1);
  });

  it('TS-24: el resto de la página queda inert mientras está abierto', () => {
    const main = document.createElement('main');
    main.textContent = 'Página';
    document.body.appendChild(main);
    const { rerender } = renderDialog();
    expect(main).toHaveAttribute('inert');
    rerender(
      <Dialog open={false} title="x" closeLabel="Cerrar" onClose={jest.fn()} />
    );
    expect(main).not.toHaveAttribute('inert');
    main.remove();
  });

  it('TS-25: cerrado no renderiza nada', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('usa initialFocusRef y aria-describedby', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <Dialog
        open
        variant="alert"
        title="Publicar"
        closeLabel="Cerrar"
        describedBy="explica"
        initialFocusRef={ref}
        onClose={jest.fn()}
        actions={<Button ref={ref}>Cancelar</Button>}
      >
        <p id="explica">No se puede deshacer.</p>
      </Dialog>
    );
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-describedby', 'explica');
  });

  it('TS-67 (Dialog): CSS mobile-first', () => {
    const css = fs.readFileSync(path.join(__dirname, 'Dialog.css'), 'utf8');
    const [base, desktop] = css.split('@media (min-width: 768px)');
    expect(base).toMatch(/\.ui-dialog__actions\s*\{[^}]*position:\s*sticky;[^}]*bottom:\s*0/);
    expect(base).toMatch(/\.ui-dialog__panel\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%/);
    expect(desktop).toMatch(/max-width:\s*480px/);
    expect(desktop).toMatch(/max-width:\s*560px/);
    expect(desktop).toMatch(/max-height:\s*90vh/);
    expect(css).not.toMatch(/max-width:\s*\d+px\)/);
  });
});
