import type { EventStage } from '../types';

export const STAGE_ORDER: readonly EventStage[] = ['creation', 'participation', 'voting', 'results'];

/** Mínimo de participantes con propuesta para abrir la votación (igual al backend). */
export const MIN_PROPOSALS_TO_VOTE = 3;

export type StageStatus = 'completed' | 'current' | 'pending';

export type TransitionDialog = 'openRegistration' | 'openVoting' | 'publishResults';

const TRANSITION_DIALOGS: Record<EventStage, TransitionDialog | null> = {
  creation: 'openRegistration',
  participation: 'openVoting',
  voting: 'publishResults',
  results: null,
};

/** Diálogo que ejecuta el paso siguiente de cada etapa; null en Resultados. */
export const transitionDialog = (stage: EventStage): TransitionDialog | null => TRANSITION_DIALOGS[stage];

export const stageIndex = (stage: EventStage): number => STAGE_ORDER.indexOf(stage);

export const getNextStage = (stage: EventStage): EventStage | null =>
  STAGE_ORDER[stageIndex(stage) + 1] ?? null;


/** Clave i18n del nombre de la etapa (catálogo `stages.*`). */
export const stageNameKey = (stage: EventStage): `stages.${EventStage}.name` => `stages.${stage}.name`;

export const stageStatus = (stage: EventStage, current: EventStage): StageStatus => {
  const diff = stageIndex(stage) - stageIndex(current);
  if (diff < 0) return 'completed';
  return diff === 0 ? 'current' : 'pending';
};
