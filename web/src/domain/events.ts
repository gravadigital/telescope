import type { EventListItem, EventStage, MyEvent } from '../types';
import type { Params, TranslationKey } from '../i18n/types';

/** Reglas puras de los listados de eventos. Solo interpretan lo que calcula el backend. */
export const SEARCH_DEBOUNCE_MS = 300;
export const PENDING_LIMIT = 4;
export const EVENTS_PAGE_SIZE = 10;

type PillTone = 'success' | 'warning' | 'action' | 'neutral';

// ---------- Pendientes ----------

export type PendingKind = 'upload' | 'vote' | 'results';

export type PendingTask = {
  kind: PendingKind;
  event: MyEvent;
  deadline: string | null;
  position?: number;
  total?: number;
};

const KIND_ORDER: Record<PendingKind, number> = { upload: 0, vote: 1, results: 2 };

const compareDeadline = (a: string | null, b: string | null): number => {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
};

export const pendingTasks = (events: MyEvent[]): PendingTask[] => {
  const tasks: PendingTask[] = [];
  for (const event of events) {
    const status = event.my_status;
    if (event.role !== 'participant' || !status) continue;
    const blocked = event.is_paused || event.is_cancelled;

    if (event.stage === 'participation' && !status.has_attachment && !blocked) {
      tasks.push({
        kind: 'upload',
        event,
        deadline: event.participation_estimated_end_date ?? null,
      });
    } else if (
      event.stage === 'voting' &&
      status.has_assignment &&
      !status.ranking_submitted &&
      !blocked
    ) {
      tasks.push({ kind: 'vote', event, deadline: event.voting_estimated_end_date ?? null });
    } else if (
      event.stage === 'results' &&
      !event.is_cancelled &&
      status.result_position !== null &&
      status.result_total !== null
    ) {
      tasks.push({
        kind: 'results',
        event,
        deadline: null,
        position: status.result_position,
        total: status.result_total,
      });
    }
  }
  return tasks.sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      compareDeadline(a.deadline, b.deadline) ||
      a.event.name.localeCompare(b.event.name)
  );
};

// ---------- Acción de fila ----------

export type RowActionKind = 'manage' | 'participate' | 'upload' | 'view' | 'vote' | 'results';

export type RowAction = {
  kind: RowActionKind;
  variant: 'primary' | 'secondary';
  to: string;
  hint?: 'requiresAccount' | 'public';
};

export interface RowActionInput {
  event: Pick<EventListItem, 'id' | 'stage' | 'author_id' | 'is_paused' | 'is_cancelled'> & {
    participant_ids?: string[];
  };
  userId: string | null;
  myEvent?: MyEvent;
}

export const rowAction = ({ event, userId, myEvent }: RowActionInput): RowAction => {
  const detail = `/events/${event.id}`;
  const view: RowAction = { kind: 'view', variant: 'secondary', to: detail };

  if (userId && event.author_id === userId) {
    return { kind: 'manage', variant: 'secondary', to: `${detail}/manage` };
  }
  if (event.stage === 'results') {
    return {
      kind: 'results',
      variant: 'secondary',
      to: detail,
      ...(userId ? {} : { hint: 'public' as const }),
    };
  }
  if (event.is_paused || event.is_cancelled) return view;

  const myStatus = myEvent?.my_status ?? null;
  const registered =
    myEvent?.role === 'participant' || Boolean(userId && event.participant_ids?.includes(userId));

  if (event.stage === 'participation') {
    if (!registered) {
      return {
        kind: 'participate',
        variant: 'primary',
        to: detail,
        ...(userId ? {} : { hint: 'requiresAccount' as const }),
      };
    }
    if (myStatus?.has_attachment === false) {
      return { kind: 'upload', variant: 'primary', to: detail };
    }
    return view;
  }
  if (event.stage === 'voting' && myStatus?.has_assignment && !myStatus.ranking_submitted) {
    return { kind: 'vote', variant: 'primary', to: detail };
  }
  return view;
};

// ---------- Presentación ----------

export const stagePill = (
  e: Pick<EventListItem, 'stage' | 'is_paused' | 'is_cancelled'>
): { key: TranslationKey; tone: PillTone; icon: 'dot' | 'none' } => {
  if (e.is_cancelled) return { key: 'events.pill.cancelled', tone: 'neutral', icon: 'none' };
  if (e.is_paused) return { key: 'events.pill.paused', tone: 'warning', icon: 'none' };
  switch (e.stage) {
    case 'creation':
      return { key: 'events.pill.draft', tone: 'neutral', icon: 'none' };
    case 'participation':
      return { key: 'events.pill.participation', tone: 'success', icon: 'dot' };
    case 'voting':
      return { key: 'events.pill.voting', tone: 'action', icon: 'none' };
    default:
      return { key: 'events.pill.results', tone: 'neutral', icon: 'none' };
  }
};

export const myStatusLabel = (
  e: MyEvent
): { key: TranslationKey; params?: Params } | null => {
  const status = e.my_status;
  if (!status) return null;
  if (e.stage === 'participation') {
    return {
      key: status.has_attachment ? 'events.myStatus.proposalSent' : 'events.myStatus.missingFile',
    };
  }
  if (e.stage === 'voting') {
    if (!status.has_assignment) return { key: 'events.myStatus.notVoting' };
    return {
      key: status.ranking_submitted ? 'events.myStatus.rankingSent' : 'events.myStatus.toVote',
    };
  }
  if (e.stage === 'results' && status.result_position !== null && status.result_total !== null) {
    return {
      key: 'events.myStatus.position',
      params: { position: status.result_position, total: status.result_total },
    };
  }
  return null;
};

export const currentDeadline = (
  e: Pick<
    EventListItem,
    'stage' | 'participation_estimated_end_date' | 'voting_estimated_end_date'
  >
): string | null => {
  if (e.stage === 'participation') return e.participation_estimated_end_date ?? null;
  if (e.stage === 'voting') return e.voting_estimated_end_date ?? null;
  return null;
};

// ---------- Inicio ----------

export const openEvents = (items: EventListItem[]): EventListItem[] =>
  items
    .filter((e) => e.stage === 'participation' && !e.is_paused && !e.is_cancelled)
    .sort(
      (a, b) =>
        compareDeadline(
          a.participation_estimated_end_date ?? null,
          b.participation_estimated_end_date ?? null
        ) ||
        b.participants_count - a.participants_count ||
        a.name.localeCompare(b.name)
    );

// ---------- Filtro de la URL ----------

export type StageFilter = 'all' | Exclude<EventStage, 'creation'>;

export const parseStageFilter = (raw: string | null): StageFilter =>
  raw === 'participation' || raw === 'voting' || raw === 'results' ? raw : 'all';
