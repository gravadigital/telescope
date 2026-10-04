/** Diferencia mínima entre el umbral bueno y el malo (igual al backend). */
export const MIN_THRESHOLD_GAP = 0.1;

export const DEFAULT_THRESHOLDS = {
  quality_good_threshold: 0.6,
  quality_bad_threshold: 0.3,
  adjustment_magnitude: 3,
} as const;

export type ThresholdIssue = 'not_greater' | 'gap_too_small';

/**
 * Replica la validación del backend en centésimos: `0.7 - 0.6` en JS da
 * `0.0999…` y daría un falso error.
 */
export const validateThresholds = (good: number, bad: number): ThresholdIssue | null => {
  const goodCents = Math.round(good * 100);
  const badCents = Math.round(bad * 100);
  if (goodCents <= badCents) return 'not_greater';
  if (goodCents - badCents < Math.round(MIN_THRESHOLD_GAP * 100)) return 'gap_too_small';
  return null;
};

/** `min_evaluations_per_file` recomendado: min(3, m). */
export const recommendedMinEvaluations = (m: number): number => Math.min(3, m);

/**
 * Respuesta de `GET /api/v1/events/{event_id}/voting-config/preview`.
 * `recommended_m` y `max_m` vienen de ese endpoint; no se recalculan en el cliente (DA-5).
 */
export interface VotingConfigPreview {
  participants_count: number;
  participants_with_proposal: number;
  can_open_voting: boolean;
  min_m: number;
  max_m: number;
  recommended_m: number;
  defaults: {
    quality_good_threshold: number;
    quality_bad_threshold: number;
    adjustment_magnitude: number;
  };
}
