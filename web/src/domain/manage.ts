import type {
  Attachment,
  Event,
  EventParticipant,
  EventStage,
  ReminderType,
  VotingStatistics,
} from '../types';
import { daysUntilClose } from './dates';

export type ManageStage = 'creation' | 'participation' | 'voting' | 'results' | 'cancelled';

type StageFlags = Pick<Event, 'stage' | 'is_cancelled'>;

/** Estado de la pantalla de gestión: cancelado manda sobre la etapa. */
export const manageStage = (e: StageFlags): ManageStage => (e.is_cancelled ? 'cancelled' : e.stage);

export const canPause = (e: StageFlags): boolean => !e.is_cancelled && e.stage !== 'results';

export const pendingFiles = (
  participants: EventParticipant[],
  attachments: Pick<Attachment, 'participant_id'>[]
): EventParticipant[] => {
  const withFile = new Set(attachments.map((a) => a.participant_id));
  return participants.filter((p) => !withFile.has(p.id));
};

type VotingStatus = Record<string, boolean> | undefined;

/** Pendientes = `false`; quienes no figuran no participan de la votación. */
export const pendingVotes = (participants: EventParticipant[], status: VotingStatus): EventParticipant[] =>
  participants.filter((p) => status?.[p.id] === false);

export type VoteCell = 'sent' | 'pending' | 'notParticipating';

export const voteCell = (participantId: string, status: VotingStatus): VoteCell => {
  const value = status?.[participantId];
  if (value === true) return 'sent';
  return value === false ? 'pending' : 'notParticipating';
};

export interface VotingProgress {
  sent: number;
  total: number;
  missing: number;
  complete: boolean;
}

export const votingProgress = (
  s: Pick<VotingStatistics, 'completed_assignments' | 'total_assignments'>
): VotingProgress => {
  const sent = s.completed_assignments;
  const total = s.total_assignments;
  return { sent, total, missing: Math.max(total - sent, 0), complete: total > 0 && sent === total };
};

export type ManagePillKey =
  | 'manage.pill.draft'
  | 'manage.pill.open'
  | 'manage.pill.openCloses'
  | 'manage.pill.openClosesToday'
  | 'manage.pill.voting'
  | 'manage.pill.votingCloses'
  | 'manage.pill.votingClosesToday'
  | 'manage.pill.results'
  | 'manage.pill.paused'
  | 'manage.pill.cancelled';

export interface ManagePill {
  key: ManagePillKey;
  params?: { count: number };
}

const closingPill = (
  closeDate: string | null | undefined,
  now: Date,
  keys: { base: ManagePillKey; closes: ManagePillKey; today: ManagePillKey }
): ManagePill => {
  if (!closeDate) return { key: keys.base };
  const days = daysUntilClose(closeDate, now);
  if (days >= 1) return { key: keys.closes, params: { count: days } };
  return { key: days === 0 ? keys.today : keys.base };
};

/** Píldora de estado: cancelado > pausado > etapa (con cierre si lo hay y no venció). */
export const managePill = (e: Event, now: Date = new Date()): ManagePill => {
  if (e.is_cancelled) return { key: 'manage.pill.cancelled' };
  if (e.is_paused) return { key: 'manage.pill.paused' };
  switch (e.stage) {
    case 'creation':
      return { key: 'manage.pill.draft' };
    case 'participation':
      return closingPill(e.participation_estimated_end_date, now, {
        base: 'manage.pill.open',
        closes: 'manage.pill.openCloses',
        today: 'manage.pill.openClosesToday',
      });
    case 'voting':
      return closingPill(e.voting_estimated_end_date, now, {
        base: 'manage.pill.voting',
        closes: 'manage.pill.votingCloses',
        today: 'manage.pill.votingClosesToday',
      });
    default:
      return { key: 'manage.pill.results' };
  }
};

export const reminderType = (stage: EventStage): ReminderType | null => {
  if (stage === 'participation') return 'file';
  return stage === 'voting' ? 'vote' : null;
};

/** Destinatarios que se listan antes de "y {n} más". */
export const REMINDER_PREVIEW_LIMIT = 5;
