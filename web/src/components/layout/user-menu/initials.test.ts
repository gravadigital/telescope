import { initials } from './initials';

describe('initials', () => {
  it('TS-44', () => {
    expect(initials('Ana Pérez')).toBe('AP');
    expect(initials('ana')).toBe('A');
    expect(initials('María José de la Cruz')).toBe('MC');
    expect(initials('  ')).toBe('');
    expect(initials('élise martin')).toBe('ÉM');
  });
});
