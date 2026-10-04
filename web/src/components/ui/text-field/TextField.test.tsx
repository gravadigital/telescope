import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextField from './TextField';

describe('TextField', () => {
  it('TS-15: error reemplaza la ayuda y marca el campo inválido', () => {
    render(
      <TextField
        label="Email"
        type="email"
        help="Lo usamos para avisarte."
        error="Usá un email válido."
        value="x"
        onChange={jest.fn()}
      />
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const errorNode = screen.getByText('Usá un email válido.');
    expect(input.getAttribute('aria-describedby')).toContain(errorNode.id);
    expect(screen.queryByText('Lo usamos para avisarte.')).toBeNull();
  });

  it('TS-16: multilínea con contador que se anuncia desde el 90%', () => {
    const props = {
      variant: 'multiline' as const,
      label: 'Comentario',
      optional: true,
      optionalLabel: '(opcional)',
      maxLength: 1000,
      onChange: jest.fn(),
    };
    const { rerender } = render(<TextField {...props} value={'a'.repeat(3)} />);
    const counter = screen.getByText('3 / 1000');
    expect(counter).not.toHaveAttribute('aria-live');
    expect(screen.getByLabelText(/Comentario/)).toHaveAttribute('maxlength', '1000');

    rerender(<TextField {...props} value={'a'.repeat(900)} />);
    expect(screen.getByText('900 / 1000')).toHaveAttribute('aria-live', 'polite');
  });

  it('TS-17: búsqueda con label oculto y botón limpiar', () => {
    const clear = jest.fn();
    render(
      <TextField
        variant="search"
        label="Buscar eventos"
        clearLabel="Limpiar búsqueda"
        value="astro"
        onChange={jest.fn()}
        onClear={clear}
      />
    );
    expect(screen.getByRole('searchbox', { name: 'Buscar eventos' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('TS-18: contraseña con mostrar/ocultar', () => {
    render(
      <TextField
        type="password"
        label="Contraseña"
        showPasswordLabel="Mostrar"
        hidePasswordLabel="Ocultar"
        value="secreto1"
        onChange={jest.fn()}
      />
    );
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveAttribute('type', 'password');
    userEvent.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(input).toHaveAttribute('type', 'text');
    const hide = screen.getByRole('button', { name: 'Ocultar' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');
  });

  it('reenvía el ref y marca required', () => {
    const ref = { current: null as HTMLInputElement | HTMLTextAreaElement | null };
    render(<TextField ref={ref} label="Nombre" required value="" onChange={jest.fn()} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toHaveAttribute('aria-required', 'true');
  });
});
