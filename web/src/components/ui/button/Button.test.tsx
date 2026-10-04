import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';
import { CloseIcon } from '../icons/Icons';

describe('Button', () => {
  it('TS-12: primario dispara onClick y tiene type=button', () => {
    const fn = jest.fn();
    render(
      <Button variant="primary" onClick={fn}>
        Enviar propuesta
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Enviar propuesta' });
    userEvent.click(button);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute('type', 'button');
  });

  it('TS-13: en carga muestra el label de carga y no es clickeable', () => {
    const fn = jest.fn();
    render(
      <Button loading loadingLabel="Enviando…" onClick={fn}>
        Enviar
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Enviando…' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    userEvent.click(button);
    expect(fn).not.toHaveBeenCalled();
  });

  it('TS-14: icónico con nombre accesible y svg decorativo', () => {
    render(<Button variant="icon" aria-label="Cerrar" iconStart={<CloseIcon />} />);
    const button = screen.getByRole('button', { name: 'Cerrar' });
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('respeta type=submit y disabled', () => {
    render(
      <Button type="submit" disabled>
        Guardar
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeDisabled();
  });
});
