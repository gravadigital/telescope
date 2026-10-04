import {
  STAGE_ORDER,
  MIN_PROPOSALS_TO_VOTE,
  getNextStage,
  stageIndex,
  stageNameKey,
  stageStatus,
  requiresEstimatedEndDate,
  validateStageAdvance,
} from './stages';

const today = new Date(2026, 9, 4);

describe('stages', () => {
  it('TS-68: orden y siguiente', () => {
    expect(STAGE_ORDER).toEqual(['creation', 'participation', 'voting', 'results']);
    expect(getNextStage('creation')).toBe('participation');
    expect(getNextStage('voting')).toBe('results');
    expect(getNextStage('results')).toBeNull();
  });

  it('TS-69: clave y estado', () => {
    expect(stageNameKey('voting')).toBe('stages.voting.name');
    expect(stageStatus('creation', 'participation')).toBe('completed');
    expect(stageStatus('participation', 'participation')).toBe('current');
    expect(stageStatus('voting', 'participation')).toBe('pending');
    expect(stageIndex('voting')).toBe(2);
  });

  it('requiresEstimatedEndDate: participation y voting', () => {
    expect(requiresEstimatedEndDate('participation')).toBe(true);
    expect(requiresEstimatedEndDate('voting')).toBe(true);
    expect(requiresEstimatedEndDate('results')).toBe(false);
    expect(requiresEstimatedEndDate('creation')).toBe(false);
  });

  it('TS-70: transición inválida', () => {
    expect(validateStageAdvance({ current: 'creation', target: 'voting', today })).toEqual([
      'INVALID_TRANSITION',
    ]);
    expect(validateStageAdvance({ current: 'participation', target: 'creation', today })).toEqual([
      'INVALID_TRANSITION',
    ]);
  });

  it('TS-71: falta fecha', () => {
    expect(validateStageAdvance({ current: 'creation', target: 'participation', today })).toEqual([
      'MISSING_ESTIMATED_DATE',
    ]);
  });

  it('TS-72: fecha pasada u hoy', () => {
    const evening = new Date(2026, 9, 4, 18, 0);
    expect(
      validateStageAdvance({
        current: 'creation',
        target: 'participation',
        estimatedEndDate: '2026-10-03',
        today: evening,
      })
    ).toEqual(['INVALID_ESTIMATED_DATE']);
    expect(
      validateStageAdvance({
        current: 'creation',
        target: 'participation',
        estimatedEndDate: '2026-10-04',
        today: evening,
      })
    ).toEqual([]);
  });

  it('TS-73: mínimo de propuestas', () => {
    const base = {
      current: 'participation' as const,
      target: 'voting' as const,
      estimatedEndDate: '2026-10-11',
      today,
    };
    expect(validateStageAdvance({ ...base, participantsWithProposal: 2 })).toEqual([
      'INSUFFICIENT_ATTACHMENTS',
    ]);
    expect(validateStageAdvance({ ...base, participantsWithProposal: 3 })).toEqual([]);
    expect(validateStageAdvance(base)).toEqual(['INSUFFICIENT_ATTACHMENTS']);
    expect(MIN_PROPOSALS_TO_VOTE).toBe(3);
  });

  it('TS-74: publicar no requiere fecha', () => {
    expect(validateStageAdvance({ current: 'voting', target: 'results', today })).toEqual([]);
  });
});
