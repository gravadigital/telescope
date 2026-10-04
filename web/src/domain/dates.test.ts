import {
  endOfDay,
  daysUntilClose,
  isClosed,
  formatDate,
  formatDateLong,
  formatRelative,
  addDays,
  todayISO,
} from './dates';

describe('dates', () => {
  it('TS-79: fin del día', () => {
    const expected = new Date(2026, 9, 10, 23, 59, 59, 999).getTime();
    expect(endOfDay('2026-10-10').getTime()).toBe(expected);
    expect(endOfDay('2026-10-10T00:00:00Z').getTime()).toBe(expected);
  });

  it('TS-80: días al cierre', () => {
    const now = new Date(2026, 9, 7, 10, 0);
    expect(daysUntilClose('2026-10-10', now)).toBe(3);
    expect(daysUntilClose('2026-10-07', now)).toBe(0);
    expect(daysUntilClose('2026-10-06', now)).toBe(-1);
    expect(isClosed('2026-10-07', new Date(2026, 9, 7, 23, 0))).toBe(false);
    expect(isClosed('2026-10-07', new Date(2026, 9, 8, 0, 1))).toBe(true);
  });

  it('TS-81: formateo', () => {
    const d = new Date(2026, 9, 1);
    expect(formatDate('2026-10-01', 'es')).toBe(
      new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
    );
    expect(formatDate('2026-10-01', 'es')).toBe('1 oct 2026');
    expect(formatDate('2026-10-01', 'en')).toBe('Oct 1, 2026');
    expect(formatDateLong('2026-10-01', 'es')).toBe('jueves, 1 de octubre de 2026');
    expect(formatDateLong('2026-10-01', 'en')).toBe('Thursday, October 1, 2026');
  });

  it('TS-82: relativas', () => {
    const now = new Date(2026, 9, 4, 12, 0);
    expect(formatRelative(new Date(2026, 9, 4, 10, 0), 'es', now)).toBe('hace 2 horas');
    expect(formatRelative(new Date(2026, 9, 4, 10, 0), 'en', now)).toBe('2 hours ago');
    expect(formatRelative(new Date(2026, 9, 3, 12, 0), 'es', now)).toBe('ayer');
    expect(formatRelative(new Date(2026, 9, 4, 11, 59, 50), 'es', now)).toBe('ahora');
  });

  it('TS-83: aritmética de fechas', () => {
    expect(addDays('2026-10-04', 7)).toBe('2026-10-11');
    expect(addDays('2026-10-28', 7)).toBe('2026-11-04');
    expect(todayISO(new Date(2026, 9, 4, 23, 30))).toBe('2026-10-04');
  });
});
