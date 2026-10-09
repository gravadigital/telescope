import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateQuickPicker, { DateQuickPickerProps } from './DateQuickPicker';

const PRESETS = [
  { days: 3, label: '3 días' },
  { days: 7, label: '1 semana' },
  { days: 14, label: '2 semanas' },
];

const base = (over: Partial<DateQuickPickerProps> = {}): DateQuickPickerProps => ({
  label: '¿Hasta cuándo se pueden inscribir?',
  today: '2026-10-04',
  min: '2026-10-04',
  value: '2026-10-07',
  locale: 'es',
  changeLabel: 'Cambiar',
  presets: PRESETS,
  onChange: jest.fn(),
  ...over,
});

describe('DateQuickPicker', () => {
  it('TS-37: el atajo "1 semana" suma 7 días a hoy', () => {
    const fn = jest.fn();
    render(<DateQuickPicker {...base({ onChange: fn })} />);
    userEvent.click(screen.getByRole('radio', { name: '1 semana' }));
    expect(fn).toHaveBeenCalledWith('2026-10-11');
  });

  it('TS-38: atajo seleccionado y valor legible en región live', () => {
    render(<DateQuickPicker {...base({ value: '2026-10-11' })} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '1 semana' })).toHaveAttribute('aria-checked', 'true');
    const readable = screen.getByText('domingo, 11 de octubre de 2026');
    expect(readable).toHaveAttribute('aria-live', 'polite');
  });

  it('TS-39: ignora una fecha anterior al mínimo', () => {
    const fn = jest.fn();
    const { container } = render(<DateQuickPicker {...base({ onChange: fn })} />);
    userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    const input = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(input).toHaveAttribute('min', '2026-10-04');
    fireEvent.change(input, { target: { value: '2026-10-01' } });
    expect(fn).not.toHaveBeenCalled();
  });

  it('TS-40: fecha custom sin atajo seleccionado', () => {
    const fn = jest.fn();
    const { container, rerender } = render(<DateQuickPicker {...base({ onChange: fn })} />);
    userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    const input = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-10-20' } });
    expect(fn).toHaveBeenCalledWith('2026-10-20');

    rerender(<DateQuickPicker {...base({ value: '2026-10-20' })} />);
    screen.getAllByRole('radio').forEach((r) => expect(r).toHaveAttribute('aria-checked', 'false'));
  });

  it('TS-41: un atajo bajo el mínimo queda deshabilitado', () => {
    const fn = jest.fn();
    render(<DateQuickPicker {...base({ min: '2026-10-10', onChange: fn })} />);
    const short = screen.getByRole('radio', { name: '3 días' });
    expect(short).toHaveAttribute('aria-disabled', 'true');
    userEvent.click(short);
    expect(fn).not.toHaveBeenCalled();
  });

  it('TS-42: postpone usa el cierre actual como base', () => {
    const fn = jest.fn();
    render(
      <DateQuickPicker
        {...base({
          variant: 'postpone',
          value: '2026-10-10',
          min: '2026-10-11',
          presets: [
            { days: 3, label: '+3 días' },
            { days: 7, label: '+1 semana' },
          ],
          onChange: fn,
        })}
      />
    );
    userEvent.click(screen.getByRole('radio', { name: '+3 días' }));
    expect(fn).toHaveBeenCalledWith('2026-10-13');
  });

  it('base explícita: los atajos se suman a `base` aunque el valor inicial sea otro', () => {
    const fn = jest.fn();
    render(
      <DateQuickPicker
        {...base({
          variant: 'postpone',
          base: '2026-10-10',
          value: '2026-10-17',
          min: undefined,
          presets: [
            { days: 3, label: '+3 días' },
            { days: 7, label: '+1 semana' },
          ],
          onChange: fn,
        })}
      />
    );
    expect(screen.getByRole('radio', { name: '+1 semana' })).toHaveAttribute('aria-checked', 'true');
    userEvent.click(screen.getByRole('radio', { name: '+3 días' }));
    expect(fn).toHaveBeenCalledWith('2026-10-13');
  });

  it('TS-43: las flechas mueven la selección', () => {
    const fn = jest.fn();
    render(<DateQuickPicker {...base({ value: '2026-10-11', onChange: fn })} />);
    screen.getByRole('radio', { name: '1 semana' }).focus();
    userEvent.keyboard('{arrowright}');
    expect(fn).toHaveBeenCalledWith('2026-10-18');
    expect(screen.getByRole('radio', { name: '2 semanas' })).toHaveFocus();
  });
});
