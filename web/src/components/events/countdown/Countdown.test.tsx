import { act, render, screen } from '@testing-library/react';
import Countdown, { getCountdownParts } from './Countdown';

const units = { days: 'DÍAS', hours: 'HORAS', minutes: 'MIN', seconds: 'SEG' };

const base = {
  title: 'LA INSCRIPCIÓN CIERRA EN',
  expiredText: 'Inscripción cerrada',
  units,
  footer: '10 oct 2026 · 23:59 (ART)',
};

describe('Countdown', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('calcula días/horas/min/seg hasta el cierre', () => {
    const parts = getCountdownParts(
      new Date(2026, 9, 10, 23, 59, 59).getTime(),
      new Date(2026, 9, 5, 12, 0, 0).getTime()
    );
    expect(parts).toMatchObject({ days: 5, hours: 11, minutes: 59, seconds: 59, expired: false });
  });

  it('muestra el mensaje fijo al vencer', () => {
    render(
      <Countdown
        {...base}
        target={new Date(2026, 9, 1, 0, 0, 0)}
        now={new Date(2026, 9, 16, 0, 0, 0).getTime()}
      />
    );
    expect(screen.getByText('Inscripción cerrada')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('muestra las cajas con ceros a la izquierda', () => {
    render(
      <Countdown
        {...base}
        target={new Date(2026, 9, 10, 23, 59, 59)}
        now={new Date(2026, 9, 5, 12, 0, 10).getTime()}
      />
    );
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByText('05')).toBeInTheDocument();
    expect(screen.getByText('10 oct 2026 · 23:59 (ART)')).toBeInTheDocument();
  });

  it('avanza cada segundo', () => {
    jest.useFakeTimers();
    render(<Countdown {...base} target={new Date(Date.now() + 10000)} />);
    const first = screen.getByRole('timer').textContent;
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('timer').textContent).not.toBe(first);
  });
});
