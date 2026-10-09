import React from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { ApiError } from '../../config/api';
import {
  DRAFT_DEBOUNCE_MS,
  hasChanged,
  initialOrder,
  isValidOrder,
  submittedRankingKey,
  toRankings,
} from '../../domain/ranking';
import { SUCCESS_NOTICE_MS } from '../../domain/eventDetail';
import { scopedMessageKeyForError } from '../../i18n';
import type { TranslationKey } from '../../i18n';
import { DistributedVotingService, VoteDraftService } from '../../services/api';
import type { VoteDraftResponse } from '../../services/api';
import type { AnonymousAssignment } from '../../types';

/** Lo que la carga de la pantalla trajo: la asignación y el borrador (si había). */
export interface RankingSource {
  assignment: AnonymousAssignment;
  draft: VoteDraftResponse | null;
}

interface RankingState {
  order: string[];
  /** Referencia de lo enviado (D-1); `null` si todavía no envió. */
  submitted: string[] | null;
  completed: boolean;
}

interface UseRankingVoteArgs {
  eventId: string | undefined;
  userId: string | null;
  source: RankingSource | null;
  /** El envío falló porque la votación ya no está abierta: la página recarga. */
  onVotingClosed: () => void;
}

// D-1: orden en pantalla y referencia de lo enviado.
const deriveState = (
  source: RankingSource | null,
  readLocal: (key: string) => unknown
): RankingState => {
  if (!source) return { order: [], submitted: null, completed: false };
  const { assignment, draft } = source;
  const attachments = assignment.attachments;
  const assigned = attachments.map((a) => a.id);
  const rankings = draft?.rankings ?? [];
  const usefulDraft = rankings.some((r) => assigned.includes(r.attachment_id));
  const draftOrder = usefulDraft ? initialOrder(attachments, rankings) : null;

  let submitted: string[] | null = null;
  if (assignment.is_completed) {
    const local = readLocal(submittedRankingKey(assignment.id));
    submitted = isValidOrder(local, attachments) ? local : draftOrder ?? assigned;
  }
  return {
    order: draftOrder ?? submitted ?? assigned,
    submitted,
    completed: assignment.is_completed,
  };
};

/**
 * Estado del ranking del participante: orden, borrador con debounce, envío / reenvío
 * y la referencia de lo enviado (S-017).
 */
export const useRankingVote = ({ eventId, userId, source, onVotingClosed }: UseRankingVoteArgs) => {
  const { getItem, setItem } = useLocalStorage();
  const [state, setState] = React.useState<RankingState>(() => deriveState(source, getItem));
  const [prevSource, setPrevSource] = React.useState(source);
  if (source !== prevSource) {
    setPrevSource(source);
    setState(deriveState(source, getItem));
  }

  const [draftSaved, setDraftSaved] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<TranslationKey | null>(null);
  const [received, setReceived] = React.useState(false);
  const draftTimer = React.useRef<number | undefined>(undefined);
  const noticeTimer = React.useRef<number | undefined>(undefined);

  const cancelDraft = React.useCallback((): void => {
    if (draftTimer.current !== undefined) {
      window.clearTimeout(draftTimer.current);
      draftTimer.current = undefined;
    }
  }, []);

  React.useEffect(() => {
    cancelDraft();
    setDraftSaved(false);
  }, [source, cancelDraft]);

  React.useEffect(
    () => () => {
      cancelDraft();
      if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current);
    },
    [cancelDraft]
  );

  const change = (next: string[]): void => {
    if (!eventId || !userId) return;
    setState((prev) => ({ ...prev, order: next }));
    setDraftSaved(false);
    setError(null);
    cancelDraft();
    draftTimer.current = window.setTimeout(async () => {
      draftTimer.current = undefined;
      try {
        await VoteDraftService.saveDraft(eventId, userId, toRankings(next));
        setDraftSaved(true);
      } catch {
        setError('eventDetail.errors.saveDraft');
      }
    }, DRAFT_DEBOUNCE_MS);
  };

  const submit = async (): Promise<void> => {
    const assignment = source?.assignment;
    if (!eventId || !userId || !assignment || submitting) return;
    const order = state.order;
    cancelDraft();
    setError(null);
    setDraftSaved(false);
    setReceived(false);
    setSubmitting(true);
    try {
      await DistributedVotingService.submitRankingVotes(
        eventId,
        userId,
        assignment.id,
        toRankings(order)
      );
      setItem(submittedRankingKey(assignment.id), order);
      setState({ order, submitted: order, completed: true });
      setReceived(true);
      if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => {
        noticeTimer.current = undefined;
        setReceived(false);
      }, SUCCESS_NOTICE_MS);
      // Sin endpoint para leer lo enviado, el borrador acompaña al envío (best effort).
      void (async () => {
        try {
          await VoteDraftService.saveDraft(eventId, userId, toRankings(order));
        } catch {
          /* el aviso de éxito no depende del borrador */
        }
      })();
    } catch (err) {
      const stage = err instanceof ApiError ? err.details.current_stage : undefined;
      if (err instanceof ApiError && err.status === 400 && typeof stage === 'string' && stage !== 'voting') {
        setError('eventDetail.errors.votingClosed');
        onVotingClosed();
      } else {
        setError(scopedMessageKeyForError(err, [], 'eventDetail.errors.submitRanking'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return {
    order: state.order,
    submitted: state.submitted,
    completed: state.completed,
    canResubmit: state.completed ? hasChanged(state.order, state.submitted) : true,
    draftSaved,
    received,
    submitting,
    error,
    setError,
    change,
    submit,
  };
};
