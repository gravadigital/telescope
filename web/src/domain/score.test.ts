import { formatScore } from './score';

describe('score', () => {
  it('TS-84: mbc_score x 10 con un decimal', () => {
    expect(formatScore(0.892, 'es')).toBe('8,9');
    expect(formatScore(0.892, 'en')).toBe('8.9');
    expect(formatScore(1, 'es')).toBe('10,0');
    expect(formatScore(0, 'en')).toBe('0.0');
    expect(formatScore(0.74, 'es')).toBe('7,4');
  });
});
