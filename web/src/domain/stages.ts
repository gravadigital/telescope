import type { EventStage } from '../types';
import { todayISO } from './dates';

export const STAGE_ORDER: readonly EventStage[] = ['creation', 'participation', 'voting', 'results'];

/** Mínimo de participantes con propuesta para abrir la votación (igual al backend). */
export const MIN_PROPOSALS_TO_VOTE = 3;

export type StageStatus = 'completed' | 'current' | 'pending';

export type StageAdvanceIssue =
  | 'INVALID_TRANSITION'
  | 'MISSING_ESTIMATED_DATE'
  | 'INVALID_ESTIMATED_DATE'
  | 'INSUFFICIENT_ATTACHMENTS';

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

export const requiresEstimatedEndDate = (target: EventStage): boolean =>
  target === 'participation' || target === 'voting';

export interface StageAdvanceInput {
  current: EventStage;
  target: EventStage;
  estimatedEndDate?: string | null;
  participantsWithProposal?: number;
  today?: Date;
}

/**
 * Replica las reglas de `PATCH /events/{id}/stage` del backend y devuelve los
 * mismos `code` para que la pantalla los traduzca con `errors.<code>`.
 */
export const validateStageAdvance = ({
  current,
  target,
  estimatedEndDate,
  participantsWithProposal,
  today = new Date(),
}: StageAdvanceInput): StageAdvanceIssue[] => {
  if (target !== getNextStage(current)) return ['INVALID_TRANSITION'];

  const issues: StageAdvanceIssue[] = [];
  if (requiresEstimatedEndDate(target)) {
    if (!estimatedEndDate) {
      issues.push('MISSING_ESTIMATED_DATE');
    } else if (estimatedEndDate.slice(0, 10) < todayISO(today)) {
      issues.push('INVALID_ESTIMATED_DATE');
    }
  }
  if (target === 'voting' && (participantsWithProposal ?? 0) < MIN_PROPOSALS_TO_VOTE) {
    issues.push('INSUFFICIENT_ATTACHMENTS');
  }
  return issues;
};
