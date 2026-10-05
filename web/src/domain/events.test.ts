import {
  pendingTasks, PENDING_LIMIT, rowAction, stagePill, myStatusLabel, currentDeadline,
  openEvents, parseStageFilter,
} from './events';
import { listItem, myEvent } from '../test-utils/eventFixtures';
import type { MyStatus } from '../types';

const st = (over: Partial<MyStatus> = {}): MyStatus => ({
  has_attachment: true, has_assignment: true, ranking_submitted: false,
  result_position: null, result_total: null, ...over,
});

describe('pendingTasks', () => {
  it('arma los tres tipos (TS-5)', () => {
    const r = pendingTasks([
      myEvent({ id: 'a', stage: 'participation' }),
      myEvent({ id: 'b', stage: 'voting', voting_estimated_end_date: '2026-10-12', my_status: st() }),
      myEvent({ id: 'c', stage: 'results', my_status: st({ ranking_submitted: true, result_position: 2, result_total: 9 }) }),
    ]);
    expect(r.map((t) => [t.kind, t.event.id, t.deadline])).toEqual([
      ['upload', 'a', '2026-10-10'], ['vote', 'b', '2026-10-12'], ['results', 'c', null],
    ]);
    expect(r[2]).toMatchObject({ position: 2, total: 9 });
  });

  it('no son pendientes (TS-6)', () => {
    expect(pendingTasks([
      myEvent({ role: 'creator', my_status: null }),
      myEvent({ my_status: st() }),
      myEvent({ stage: 'voting', my_status: st({ has_assignment: false }) }),
      myEvent({ stage: 'voting', my_status: st({ ranking_submitted: true }) }),
      myEvent({ stage: 'results', my_status: st({ result_position: null, result_total: null }) }),
    ])).toEqual([]);
  });

  it('excluye pausados y cancelados (TS-7)', () => {
    const r = pendingTasks([
      myEvent({ is_paused: true }),
      myEvent({ stage: 'voting', is_cancelled: true, my_status: st() }),
      myEvent({ stage: 'results', is_paused: true, my_status: st({ result_position: 1, result_total: 5 }) }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'results', position: 1, total: 5 });
  });

  it('ordena por tipo y cierre (TS-8)', () => {
    const v = (id: string, d: string) => myEvent({ id, stage: 'voting', voting_estimated_end_date: d, my_status: st() });
    const u = (id: string, d: string | null) => myEvent({ id, participation_estimated_end_date: d });
    const r = pendingTasks([
      myEvent({ id: 'r', stage: 'results', my_status: st({ result_position: 1, result_total: 2 }) }),
      v('v2', '2026-10-20'), u('u2', '2026-10-15'), v('v1', '2026-10-09'), u('u3', null), u('u1', '2026-10-08'),
    ]);
    expect(r.map((t) => t.event.id)).toEqual(['u1', 'u2', 'u3', 'v1', 'v2', 'r']);
    expect(PENDING_LIMIT).toBe(4);
  });
});

describe('rowAction', () => {
  it('autor y resultados (TS-9)', () => {
    expect(rowAction({ event: listItem({ author_id: 'u-1' }), userId: 'u-1' }))
      .toEqual({ kind: 'manage', variant: 'secondary', to: '/events/e-1/manage' });
    expect(rowAction({ event: listItem({ stage: 'results' }), userId: null }))
      .toEqual({ kind: 'results', variant: 'secondary', to: '/events/e-1', hint: 'public' });
    expect(rowAction({ event: listItem({ stage: 'results' }), userId: 'u-1' }))
      .toEqual({ kind: 'results', variant: 'secondary', to: '/events/e-1' });
  });

  it('participación (TS-10)', () => {
    expect(rowAction({ event: listItem(), userId: null }))
      .toEqual({ kind: 'participate', variant: 'primary', to: '/events/e-1', hint: 'requiresAccount' });
    expect(rowAction({ event: listItem(), userId: 'u-1' }))
      .toEqual({ kind: 'participate', variant: 'primary', to: '/events/e-1' });
    const reg = listItem({ participant_ids: ['u-1'] });
    expect(rowAction({ event: reg, userId: 'u-1', myEvent: myEvent() }).kind).toBe('upload');
    expect(rowAction({ event: reg, userId: 'u-1', myEvent: myEvent({ my_status: st() }) }))
      .toMatchObject({ kind: 'view', variant: 'secondary' });
    expect(rowAction({ event: reg, userId: 'u-1', myEvent: undefined }))
      .toMatchObject({ kind: 'view', variant: 'secondary' });
  });

  it('votación y pausado (TS-11)', () => {
    const ev = listItem({ stage: 'voting' });
    expect(rowAction({ event: ev, userId: 'u-1', myEvent: myEvent({ stage: 'voting', my_status: st() }) }))
      .toMatchObject({ kind: 'vote', variant: 'primary' });
    expect(rowAction({ event: ev, userId: 'u-1', myEvent: myEvent({ stage: 'voting', my_status: st({ ranking_submitted: true }) }) }).kind).toBe('view');
    expect(rowAction({ event: listItem({ is_paused: true }), userId: 'u-1' }).kind).toBe('view');
  });
});

describe('presentación', () => {
  it('stagePill (TS-12)', () => {
    const f = { is_paused: false, is_cancelled: false };
    expect(stagePill({ stage: 'participation', ...f })).toEqual({ key: 'events.pill.participation', tone: 'success', icon: 'dot' });
    expect(stagePill({ stage: 'voting', ...f })).toEqual({ key: 'events.pill.voting', tone: 'action', icon: 'none' });
    expect(stagePill({ stage: 'results', ...f })).toEqual({ key: 'events.pill.results', tone: 'neutral', icon: 'none' });
    expect(stagePill({ stage: 'creation', ...f })).toEqual({ key: 'events.pill.draft', tone: 'neutral', icon: 'none' });
    expect(stagePill({ stage: 'participation', is_paused: true, is_cancelled: false })).toEqual({ key: 'events.pill.paused', tone: 'warning', icon: 'none' });
    expect(stagePill({ stage: 'voting', is_paused: true, is_cancelled: true })).toEqual({ key: 'events.pill.cancelled', tone: 'neutral', icon: 'none' });
  });

  it('myStatusLabel y currentDeadline (TS-13)', () => {
    expect(myStatusLabel(myEvent())).toEqual({ key: 'events.myStatus.missingFile' });
    expect(myStatusLabel(myEvent({ my_status: st() }))).toEqual({ key: 'events.myStatus.proposalSent' });
    expect(myStatusLabel(myEvent({ stage: 'voting', my_status: st() }))).toEqual({ key: 'events.myStatus.toVote' });
    expect(myStatusLabel(myEvent({ stage: 'voting', my_status: st({ ranking_submitted: true }) }))).toEqual({ key: 'events.myStatus.rankingSent' });
    expect(myStatusLabel(myEvent({ stage: 'voting', my_status: st({ has_assignment: false }) }))).toEqual({ key: 'events.myStatus.notVoting' });
    expect(myStatusLabel(myEvent({ stage: 'results', my_status: st({ result_position: 2, result_total: 9 }) })))
      .toEqual({ key: 'events.myStatus.position', params: { position: 2, total: 9 } });
    expect(myStatusLabel(myEvent({ stage: 'results', my_status: st() }))).toBeNull();
    expect(currentDeadline(myEvent())).toBe('2026-10-10');
    expect(currentDeadline(myEvent({ stage: 'voting', voting_estimated_end_date: '2026-10-12' }))).toBe('2026-10-12');
    expect(currentDeadline(myEvent({ stage: 'results' }))).toBeNull();
  });

  it('openEvents (TS-14)', () => {
    const r = openEvents([
      listItem({ id: 'a', participation_estimated_end_date: '2026-10-20' }),
      listItem({ id: 'b', participation_estimated_end_date: '2026-10-09', participants_count: 3 }),
      listItem({ id: 'c', participation_estimated_end_date: '2026-10-09', participants_count: 8 }),
      listItem({ id: 'd', participation_estimated_end_date: null }),
      listItem({ id: 'e', is_paused: true }),
      listItem({ id: 'f', stage: 'voting' }),
    ]);
    expect(r.map((e) => e.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('parseStageFilter (TS-15)', () => {
    expect(['participation', 'voting', 'results', 'creation', 'foo', null].map(parseStageFilter))
      .toEqual(['participation', 'voting', 'results', 'all', 'all', 'all']);
  });
});
