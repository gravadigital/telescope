import type { VotingConfigPreview } from './voting';
import {
  ADJUSTMENT_MAX,
  ADJUSTMENT_MIN,
  MIN_EVALUATIONS_MAX,
  THRESHOLD_STEP,
  initialVotingDraft,
  isRecommendedConfig,
  validateVotingDraft,
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

  const preview: VotingConfigPreview = {
    participants_count: 4,
    participants_with_proposal: 3,
    can_open_voting: true,
    min_m: 1,
    max_m: 2,
    recommended_m: 2,
    defaults: { quality_good_threshold: 0.6, quality_bad_threshold: 0.3, adjustment_magnitude: 3 },
  };
  const draft = initialVotingDraft(preview);

  it('TS-6: borrador inicial desde el preview', () => {
    expect(draft).toEqual({
      attachments_per_evaluator: 2,
      min_evaluations_per_file: 2,
      adjustment_magnitude: 3,
      quality_good_threshold: 0.6,
      quality_bad_threshold: 0.3,
    });
    expect(initialVotingDraft({ ...preview, recommended_m: 5, max_m: 7 }).min_evaluations_per_file).toBe(3);
    expect([ADJUSTMENT_MIN, ADJUSTMENT_MAX, MIN_EVALUATIONS_MAX, THRESHOLD_STEP]).toEqual([1, 10, 20, 0.05]);
  });

  it('TS-7: validación del borrador', () => {
    expect(validateVotingDraft({ ...draft, quality_good_threshold: 0.3, quality_bad_threshold: 0.6 })).toBe(
      'not_greater'
    );
    expect(validateVotingDraft({ ...draft, quality_good_threshold: 0.6, quality_bad_threshold: 0.55 })).toBe(
      'gap_too_small'
    );
    expect(validateVotingDraft({ ...draft, quality_good_threshold: 0.7, quality_bad_threshold: 0.6 })).toBeNull();
    expect(validateVotingDraft({ ...draft, adjustment_magnitude: 11 })).toBe('adjustment_out_of_range');
    expect(validateVotingDraft(draft)).toBeNull();
  });

  it('TS-8: recomendados vs personalizados', () => {
    const config = { ...draft };
    expect(isRecommendedConfig(config)).toBe(true);
    expect(isRecommendedConfig({ ...config, quality_good_threshold: 0.7 })).toBe(false);
    expect(isRecommendedConfig({ ...config, min_evaluations_per_file: 1 })).toBe(false);
    expect(isRecommendedConfig({ ...config, attachments_per_evaluator: 5, min_evaluations_per_file: 3 })).toBe(
      true
    );
  });
});
