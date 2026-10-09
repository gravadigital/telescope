import type { Attachment, Event, EventParticipant } from '../types';
import {
  REMINDER_PREVIEW_LIMIT,
  canPause,
  manageStage,
  managePill,
  pendingFiles,
  pendingVotes,
  reminderType,
  voteCell,
  votingProgress,
} from './manage';

const p = (id: string, name: string, day = 2): EventParticipant => ({
  id,
  name,
  email: `${id}@x.com`,
  role: 'participant',
  created_at: `2026-10-0${day}T10:00:00Z`,
});

const participants = [
  p('u-1', 'Ana Ruiz', 1),
  p('u-2', 'Bruno Paz'),
  p('u-3', 'Carla Sol', 3),
  p('u-4', 'Dani Vega', 3),
  p('u-5', 'Eva Torres', 4),
];

const att = (participant_id: string): Pick<Attachment, 'participant_id'> => ({ participant_id });
const attachments = [att('u-1'), att('u-2'), att('u-3'), att('u-4')];

const status = { 'u-2': true, 'u-3': false, 'u-4': false, 'u-5': false };

const now = new Date(2026, 9, 5, 12, 0);

const base: Event = {
  id: 'e-1',
  title: 'Concurso',
  description: 'd',
  date: '2026-10-01',
  stage: 'participation',
  is_paused: false,
  is_cancelled: false,
  participation_estimated_end_date: '2026-10-10',
  voting_estimated_end_date: null,
};
const creation: Event = { ...base, stage: 'creation' };
const voting: Event = { ...base, stage: 'voting', voting_estimated_end_date: '2026-10-12' };
const results: Event = { ...base, stage: 'results' };

describe('manage', () => {
  it('TS-9: pendientes de archivo', () => {
    expect(pendingFiles(participants, attachments).map((x) => x.id)).toEqual(['u-5']);
    expect(pendingFiles(participants, [])).toHaveLength(5);
    expect(pendingFiles([], attachments)).toEqual([]);
  });

  it('TS-10: pendientes de voto y celda', () => {
    const all = [...participants, p('u-6', 'Fede Gil', 4)];
    expect(pendingVotes(all, status).map((x) => x.id)).toEqual(['u-3', 'u-4', 'u-5']);
    expect(voteCell('u-2', status)).toBe('sent');
    expect(voteCell('u-3', status)).toBe('pending');
    expect(voteCell('u-6', status)).toBe('notParticipating');
    expect(voteCell('u-2', undefined)).toBe('notParticipating');
    expect(pendingVotes(all, undefined)).toEqual([]);
  });

  it('TS-11: progreso de rankings', () => {
    expect(votingProgress({ completed_assignments: 1, total_assignments: 4 })).toEqual({
      sent: 1,
      total: 4,
      missing: 3,
      complete: false,
    });
    expect(votingProgress({ completed_assignments: 4, total_assignments: 4 })).toEqual({
      sent: 4,
      total: 4,
      missing: 0,
      complete: true,
    });
    expect(votingProgress({ completed_assignments: 0, total_assignments: 0 })).toEqual({
      sent: 0,
      total: 0,
      missing: 0,
      complete: false,
    });
  });

  it('TS-12: estado de pantalla y pausa', () => {
    expect(manageStage({ stage: 'voting', is_cancelled: true })).toBe('cancelled');
    expect(manageStage(base)).toBe('participation');
    expect(canPause(results)).toBe(false);
    expect(canPause({ ...base, is_cancelled: true })).toBe(false);
    expect(canPause(creation)).toBe(true);
  });

  it('TS-13: píldora', () => {
    expect(managePill(creation, now)).toEqual({ key: 'manage.pill.draft' });
    expect(managePill(base, now)).toEqual({ key: 'manage.pill.openCloses', params: { count: 5 } });
    expect(managePill({ ...base, participation_estimated_end_date: '2026-10-05' }, now)).toEqual({
      key: 'manage.pill.openClosesToday',
    });
    expect(managePill({ ...base, participation_estimated_end_date: null }, now)).toEqual({
      key: 'manage.pill.open',
    });
    expect(managePill({ ...base, participation_estimated_end_date: '2026-10-01' }, now)).toEqual({
      key: 'manage.pill.open',
    });
    expect(managePill(voting, now)).toEqual({ key: 'manage.pill.votingCloses', params: { count: 7 } });
    expect(managePill({ ...voting, voting_estimated_end_date: '2026-10-05' }, now)).toEqual({
      key: 'manage.pill.votingClosesToday',
    });
    expect(managePill({ ...voting, voting_estimated_end_date: null }, now)).toEqual({
      key: 'manage.pill.voting',
    });
    expect(managePill(results, now)).toEqual({ key: 'manage.pill.results' });
    expect(managePill({ ...base, is_paused: true }, now)).toEqual({ key: 'manage.pill.paused' });
    expect(managePill({ ...base, is_cancelled: true, is_paused: true }, now)).toEqual({
      key: 'manage.pill.cancelled',
    });
  });

  it('TS-14: tipo de recordatorio', () => {
    expect(reminderType('participation')).toBe('file');
    expect(reminderType('voting')).toBe('vote');
    expect(reminderType('creation')).toBeNull();
    expect(reminderType('results')).toBeNull();
    expect(REMINDER_PREVIEW_LIMIT).toBe(5);
  });
});
