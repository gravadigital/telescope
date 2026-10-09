import {
  STAGE_ORDER,
  MIN_PROPOSALS_TO_VOTE,
  getNextStage,
  stageIndex,
  stageNameKey,
  stageStatus,
  transitionDialog,
} from './stages';
import * as stages from './stages';

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

  it('TS-1: diálogo de cada transición', () => {
    expect(transitionDialog('creation')).toBe('openRegistration');
    expect(transitionDialog('participation')).toBe('openVoting');
    expect(transitionDialog('voting')).toBe('publishResults');
    expect(transitionDialog('results')).toBeNull();
  });

  it('TS-2: regla vieja eliminada', () => {
    expect(stages).not.toHaveProperty('validateStageAdvance');
    expect(stages).not.toHaveProperty('requiresEstimatedEndDate');
    expect(MIN_PROPOSALS_TO_VOTE).toBe(3);
  });
});
