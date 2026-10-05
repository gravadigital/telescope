import type { Attachment, AttachmentResult, Event, EventStage } from '../types';
import type { Params, TranslationKey } from '../i18n/types';
import { daysUntilClose } from './dates';

/** Reglas puras del detalle del evento (S-04). Solo interpretan lo que calcula el backend. */
export const DEFAULT_CAPACITY = 20; // default de la api al inscribir
export const COMMENT_MAX = 1000;
export const COPY_FEEDBACK_MS = 2000;
export const SUCCESS_NOTICE_MS = 5000;

export type NextStepState =
  | 'default'
  | 'upload'
  | 'submitted'
  | 'vote'
  | 'rankingSent'
  | 'noProposalInVoting'
  | 'paused'
  | 'full'
  | 'votingNotRegistered'
  | 'results'
  | 'cancelled';

/** Estado de la asignación del usuario en Votación. `null` = no aplica. */
export type AssignmentStatus = 'none' | 'pending' | 'completed' | null;

type DetailEvent = Pick<
  Event,
  'stage' | 'is_paused' | 'is_cancelled' | 'participant_ids' | 'max_participants'
>;

export const capacityOf = (e: Pick<Event, 'max_participants'>): number =>
  e.max_participants ?? DEFAULT_CAPACITY;

export const isRegistered = (e: Pick<Event, 'participant_ids'>, userId: string | null): boolean =>
  Boolean(userId && e.participant_ids?.includes(userId));

export const isFull = (e: Pick<Event, 'participant_ids' | 'max_participants'>): boolean =>
  (e.participant_ids?.length ?? 0) >= capacityOf(e);

export const nextStepState = (
  event: DetailEvent,
  userId: string | null,
  myAttachment: Pick<Attachment, 'id'> | null,
  assignment: AssignmentStatus
): NextStepState => {
  if (event.is_cancelled) return 'cancelled';
  if (event.stage === 'results') return 'results';
  if (event.is_paused) return 'paused';
  const registered = isRegistered(event, userId);
  if (event.stage === 'participation') {
    if (registered) return myAttachment ? 'submitted' : 'upload';
    return isFull(event) ? 'full' : 'default';
  }
  if (event.stage === 'voting') {
    if (!registered) return 'votingNotRegistered';
    if (assignment === 'none') return 'noProposalInVoting';
    if (assignment === 'completed') return 'rankingSent';
    return 'vote';
  }
  return 'default';
};

type PillTone = 'success' | 'warning' | 'action' | 'neutral' | 'onBand';

export const detailPill = (
  state: NextStepState,
  event: Pick<Event, 'stage' | 'participation_estimated_end_date' | 'voting_estimated_end_date'>,
  now: Date = new Date()
): { key: TranslationKey; params?: Params; tone: PillTone } => {
  const tone: PillTone = 'onBand';
  const withClose = (
    deadline: string | null,
    base: 'open' | 'vote',
    plural: TranslationKey,
    today: TranslationKey
  ): { key: TranslationKey; params?: Params; tone: PillTone } => {
    const days = deadline ? daysUntilClose(deadline, now) : null;
    if (days !== null && days > 0) return { key: plural, params: { count: days }, tone };
    if (days === 0) return { key: today, tone };
    return { key: base === 'open' ? 'eventDetail.pill.open' : 'eventDetail.pill.vote', tone };
  };
  switch (state) {
    case 'default':
    case 'full':
      return withClose(
        event.participation_estimated_end_date ?? null,
        'open',
        'eventDetail.pill.openCloses',
        'eventDetail.pill.openClosesToday'
      );
    case 'upload':
      return { key: 'eventDetail.pill.missingFile', tone };
    case 'submitted':
      return { key: 'eventDetail.pill.proposalSent', tone };
    case 'vote':
      return withClose(
        event.voting_estimated_end_date ?? null,
        'vote',
        'eventDetail.pill.voteCloses',
        'eventDetail.pill.voteClosesToday'
      );
    case 'rankingSent':
      return { key: 'eventDetail.pill.rankingSent', tone };
    case 'noProposalInVoting':
    case 'votingNotRegistered':
      return { key: 'eventDetail.pill.votingInProgress', tone };
    case 'results':
      return { key: 'eventDetail.pill.results', tone };
    case 'paused':
      return { key: 'eventDetail.pill.paused', tone };
    case 'cancelled':
      return { key: 'eventDetail.pill.cancelled', tone };
  }
};

export interface DetailProgressStep {
  labelKey: TranslationKey;
  detailKey?: TranslationKey;
  params?: Params;
  status: 'done' | 'current' | 'pending';
}

export const progressSteps = (
  state: NextStepState,
  event: Pick<Event, 'participation_estimated_end_date'>,
  now: Date = new Date()
): DetailProgressStep[] | null => {
  if (state !== 'upload' && state !== 'submitted' && state !== 'vote' && state !== 'rankingSent') {
    return null;
  }
  const registration: DetailProgressStep = {
    labelKey: 'eventDetail.progress.registration',
    detailKey: 'eventDetail.progress.confirmed',
    status: 'done',
  };
  const results: DetailProgressStep = {
    labelKey: 'eventDetail.progress.results',
    status: 'pending',
  };

  let upload: DetailProgressStep;
  if (state === 'upload') {
    const deadline = event.participation_estimated_end_date;
    const days = deadline ? daysUntilClose(deadline, now) : null;
    upload =
      days !== null && days > 0
        ? {
            labelKey: 'eventDetail.progress.upload',
            detailKey: 'eventDetail.progress.pendingCloses',
            params: { count: days },
            status: 'current',
          }
        : {
            labelKey: 'eventDetail.progress.upload',
            detailKey: 'eventDetail.progress.pending',
            status: 'current',
          };
  } else {
    upload = {
      labelKey: 'eventDetail.progress.upload',
      detailKey: 'eventDetail.progress.sent',
      status: 'done',
    };
  }

  let vote: DetailProgressStep;
  if (state === 'vote') {
    vote = {
      labelKey: 'eventDetail.progress.vote',
      detailKey: 'eventDetail.progress.pending',
      status: 'current',
    };
  } else if (state === 'rankingSent') {
    vote = {
      labelKey: 'eventDetail.progress.vote',
      detailKey: 'eventDetail.progress.voteSent',
      status: 'done',
    };
  } else {
    vote = {
      labelKey: 'eventDetail.progress.vote',
      detailKey: 'eventDetail.progress.voteLater',
      status: 'pending',
    };
  }
  return [registration, upload, vote, results];
};

/** Podio = las 3 primeras por `adjusted_rank`; el resto desde la 4.ª. No muta la entrada. */
export const splitResults = (
  ranking: AttachmentResult[]
): { podium: AttachmentResult[]; rest: AttachmentResult[] } => {
  const sorted = [...ranking].sort((a, b) => a.adjusted_rank - b.adjusted_rank);
  return { podium: sorted.slice(0, 3), rest: sorted.slice(3) };
};

export const shareUrl = (origin: string, eventId: string): string => `${origin}/events/${eventId}`;

export type ShareNetwork = 'whatsapp' | 'x' | 'linkedin' | 'facebook' | 'email';

export const shareLinks = (
  url: string,
  name: string
): { network: ShareNetwork; href: string }[] => {
  const u = encodeURIComponent(url);
  const n = encodeURIComponent(name);
  return [
    { network: 'whatsapp', href: `https://wa.me/?text=${encodeURIComponent(`${name}\n${url}`)}` },
    { network: 'x', href: `https://twitter.com/intent/tweet?text=${n}&url=${u}` },
    { network: 'linkedin', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { network: 'facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { network: 'email', href: `mailto:?subject=${n}&body=${u}` },
  ];
};

export const shareAudienceKey = (stage: EventStage): TranslationKey => {
  if (stage === 'participation') return 'share.audience.participation';
  if (stage === 'results') return 'share.audience.results';
  return 'share.audience.voting';
};

export const afterKey = (state: NextStepState, stage: EventStage): TranslationKey | null => {
  if (state === 'results' || state === 'cancelled') return null;
  if (stage === 'participation') return 'eventDetail.after.participation';
  if (stage === 'voting') return 'eventDetail.after.voting';
  return null;
};
