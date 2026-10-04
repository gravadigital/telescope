import {
  DEFAULT_THRESHOLDS,
  MIN_THRESHOLD_GAP,
  recommendedMinEvaluations,
  validateThresholds,
} from './voting';

describe('voting', () => {
  it('TS-85: umbrales', () => {
    expect(validateThresholds(0.6, 0.3)).toBeNull();
    expect(validateThresholds(0.7, 0.6)).toBeNull();
    expect(validateThresholds(0.65, 0.6)).toBe('gap_too_small');
    expect(validateThresholds(0.3, 0.6)).toBe('not_greater');
    expect(validateThresholds(0.5, 0.5)).toBe('not_greater');
  });

  it('TS-86: evaluaciones recomendadas y constantes', () => {
    expect(recommendedMinEvaluations(2)).toBe(2);
    expect(recommendedMinEvaluations(3)).toBe(3);
    expect(recommendedMinEvaluations(5)).toBe(3);
    expect(MIN_THRESHOLD_GAP).toBe(0.1);
    expect(DEFAULT_THRESHOLDS).toEqual({
      quality_good_threshold: 0.6,
      quality_bad_threshold: 0.3,
      adjustment_magnitude: 3,
    });
  });
});
