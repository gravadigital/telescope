import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NumberStepper, { NumberStepperProps } from './NumberStepper';

const base = (over: Partial<NumberStepperProps> = {}): NumberStepperProps => ({
  label: 'Propuestas por evaluador',
  min: 1,
  max: 2,
  recommended: 2,
  value: 2,
  help: 'Recomendado: 2 · máximo 2',
  recommendedLabel: 'Recomendado',
  decrementLabel: 'Disminuir',
  incrementLabel: 'Aumentar',
  rangeError: 'Elegí un valor entre 1 y 2.',
  onChange: jest.fn(),
  ...over,
});

describe('NumberStepper', () => {
  it('TS-32: en el máximo deshabilita "Aumentar" y marca el recomendado', () => {
    render(<NumberStepper {...base()} />);
    expect(screen.getByRole('button', { name: 'Aumentar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Disminuir' })).toBeEnabled();
    expect(screen.getByText('Recomendado: 2 · máximo 2')).toBeInTheDocument();
    expect(screen.getByText('Recomendado')).toBeInTheDocument();
  });

  it('TS-33: suma y respeta el mínimo', () => {
    const fn = jest.fn();
    render(<NumberStepper {...base({ value: 1, onChange: fn })} />);
    userEvent.click(screen.getByRole('button', { name: 'Aumentar' }));
    expect(fn).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { name: 'Disminuir' })).toBeDisabled();
    expect(screen.queryByText('Recomendado')).toBeNull();
  });

  it('TS-34: flechas del teclado dentro del rango', () => {
    const fn = jest.fn();
    const { rerender } = render(<NumberStepper {...base({ value: 1, onChange: fn })} />);
    screen.getByRole('spinbutton').focus();
    userEvent.keyboard('{arrowup}');
    expect(fn).toHaveBeenCalledWith(2);

    fn.mockClear();
    rerender(<NumberStepper {...base({ value: 2, onChange: fn })} />);
    userEvent.keyboard('{arrowup}');
    expect(fn).not.toHaveBeenCalled();
  });

  it('TS-35: un valor tipeado fuera de rango muestra el error y no se propaga', () => {
    const fn = jest.fn();
    render(<NumberStepper {...base({ value: 2, onChange: fn })} />);
    const input = screen.getByRole('spinbutton');
    userEvent.clear(input);
    userEvent.type(input, '3');
    fireEvent.blur(input);
    expect(screen.getByText('Elegí un valor entre 1 y 2.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(fn).not.toHaveBeenCalledWith(3);
  });

  it('TS-36: ARIA del spinbutton y botones controlando el input', () => {
    render(<NumberStepper {...base()} />);
    const input = screen.getByRole('spinbutton', { name: 'Propuestas por evaluador' });
    expect(input).toHaveAttribute('aria-valuemin', '1');
    expect(input).toHaveAttribute('aria-valuemax', '2');
    expect(input).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('button', { name: 'Disminuir' })).toHaveAttribute('aria-controls', input.id);
    expect(screen.getByRole('button', { name: 'Aumentar' })).toHaveAttribute('aria-controls', input.id);
  });
});
