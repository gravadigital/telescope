import type { AttachmentResult, Event } from '../types';
import {
  afterKey,
  capacityOf,
  detailPill,
  isRegistered,
  nextStepState,
  progressSteps,
  shareAudienceKey,
  shareLinks,
  shareUrl,
  splitResults,
} from './eventDetail';

const now = new Date(2026, 9, 5, 10, 0);

const ev: Event = {
  id: 'e-1',
  title: 'Concurso de afiches',
  description: 'Diseña el afiche del festival de primavera.',
  stage: 'participation',
  date: '2026-10-01',
  organizer: 'Club de Diseño',
  max_participants: 20,
  participant_ids: ['u-2', 'u-3', 'u-4', 'u-5'],
  creator_id: 'u-9',
  is_paused: false,
  is_cancelled: false,
  participation_estimated_end_date: '2026-10-10',
  voting_estimated_end_date: null,
};

const registered = { ...ev, participant_ids: ['u-1', 'u-2'] };

const r = (id: string, pid: string, name: string, file: string, score: number, rank: number): AttachmentResult => ({
  attachment_id: id,
  filename: file,
  participant_id: pid,
  participant_name: name,
  mbc_score: score,
  global_rank: rank,
  adjusted_rank: rank,
  vote_count: 3,
  average_rank: rank,
});

describe('nextStepState', () => {
  it('TS-1 participación sin sesión o no inscrito', () => {
    expect(nextStepState(ev, null, null, null)).toBe('default');
    expect(nextStepState(ev, 'u-1', null, null)).toBe('default');
  });

  it('TS-2 inscrito sin y con propuesta', () => {
    expect(nextStepState(registered, 'u-1', null, null)).toBe('upload');
    expect(nextStepState(registered, 'u-1', { id: 'a-1' }, null)).toBe('submitted');
  });

  it('TS-3 cupo completo', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `p-${i}`);
    expect(nextStepState({ ...ev, participant_ids: ids }, 'u-1', null, null)).toBe('full');
    expect(nextStepState({ ...ev, participant_ids: ids, max_participants: null }, 'u-1', null, null)).toBe('full');
    expect(nextStepState({ ...ev, participant_ids: [...ids.slice(1), 'u-1'] }, 'u-1', null, null)).toBe('upload');
  });

  it('TS-4 pausado', () => {
    expect(nextStepState({ ...registered, is_paused: true }, 'u-1', null, null)).toBe('paused');
    expect(nextStepState({ ...ev, is_paused: true }, 'u-1', null, null)).toBe('paused');
    expect(nextStepState({ ...ev, stage: 'voting', is_paused: true }, 'u-1', null, null)).toBe('paused');
  });

  it('TS-5 votación', () => {
    const voting = { ...ev, stage: 'voting' as const, participant_ids: ['u-1', 'u-2'] };
    const notRegistered = { ...voting, participant_ids: ['u-2'] };
    expect(nextStepState(notRegistered, null, null, null)).toBe('votingNotRegistered');
    expect(nextStepState(notRegistered, 'u-1', null, null)).toBe('votingNotRegistered');
    expect(nextStepState(voting, 'u-1', null, 'none')).toBe('noProposalInVoting');
    expect(nextStepState(voting, 'u-1', null, 'pending')).toBe('vote');
    expect(nextStepState(voting, 'u-1', null, 'completed')).toBe('rankingSent');
    expect(nextStepState(voting, 'u-1', null, null)).toBe('vote');
  });

  it('TS-6 prioridades', () => {
    expect(nextStepState({ ...ev, stage: 'results', is_paused: true }, 'u-1', null, null)).toBe('results');
    expect(nextStepState({ ...ev, stage: 'results', is_cancelled: true }, 'u-1', null, null)).toBe('cancelled');
    expect(nextStepState({ ...ev, is_cancelled: true, is_paused: true }, 'u-1', null, null)).toBe('cancelled');
  });
});

describe('detailPill', () => {
  it('TS-7 píldora con cierre', () => {
    expect(detailPill('default', ev, now)).toEqual({
      key: 'eventDetail.pill.openCloses',
      params: { count: 5 },
      tone: 'onBand',
    });
    expect(detailPill('default', { ...ev, participation_estimated_end_date: '2026-10-05' }, now).key).toBe(
      'eventDetail.pill.openClosesToday'
    );
    expect(detailPill('default', { ...ev, participation_estimated_end_date: '2026-10-06' }, now)).toEqual({
      key: 'eventDetail.pill.openCloses',
      params: { count: 1 },
      tone: 'onBand',
    });
    expect(detailPill('default', { ...ev, participation_estimated_end_date: null }, now).key).toBe(
      'eventDetail.pill.open'
    );
    expect(detailPill('default', { ...ev, participation_estimated_end_date: '2026-10-01' }, now).key).toBe(
      'eventDetail.pill.open'
    );
  });

  it('TS-8 píldoras por estado', () => {
    const keys: Array<[Parameters<typeof detailPill>[0], string]> = [
      ['upload', 'missingFile'],
      ['submitted', 'proposalSent'],
      ['rankingSent', 'rankingSent'],
      ['noProposalInVoting', 'votingInProgress'],
      ['votingNotRegistered', 'votingInProgress'],
      ['results', 'results'],
      ['paused', 'paused'],
      ['cancelled', 'cancelled'],
    ];
    keys.forEach(([state, key]) => {
      expect(detailPill(state, ev, now).key).toBe(`eventDetail.pill.${key}`);
    });
    expect(
      detailPill('vote', { stage: 'voting', participation_estimated_end_date: null, voting_estimated_end_date: '2026-10-12' }, now)
    ).toEqual({ key: 'eventDetail.pill.voteCloses', params: { count: 7 }, tone: 'onBand' });
  });
});

describe('progressSteps', () => {
  it('TS-9 tu progreso', () => {
    expect(progressSteps('upload', ev, now)).toEqual([
      { labelKey: 'eventDetail.progress.registration', detailKey: 'eventDetail.progress.confirmed', status: 'done' },
      {
        labelKey: 'eventDetail.progress.upload',
        detailKey: 'eventDetail.progress.pendingCloses',
        params: { count: 5 },
        status: 'current',
      },
      { labelKey: 'eventDetail.progress.vote', detailKey: 'eventDetail.progress.voteLater', status: 'pending' },
      { labelKey: 'eventDetail.progress.results', status: 'pending' },
    ]);
    expect(progressSteps('submitted', ev, now)?.[1]).toMatchObject({ detailKey: 'eventDetail.progress.sent', status: 'done' });
    expect(progressSteps('vote', ev, now)?.[2]).toMatchObject({ detailKey: 'eventDetail.progress.pending', status: 'current' });
    expect(progressSteps('rankingSent', ev, now)?.[2]).toMatchObject({ detailKey: 'eventDetail.progress.voteSent', status: 'done' });
    expect(progressSteps('default', ev, now)).toBeNull();
    expect(progressSteps('results', ev, now)).toBeNull();
  });
});

describe('splitResults', () => {
  const ranking = [
    r('a-5', 'u-5', 'Eva Torres', 'cielo.gif', 0.22, 5),
    r('a-2', 'u-2', 'Bruno Ríos', 'sol.png', 0.74, 1),
    r('a-1', 'u-1', 'Ana Pérez', 'afiche.pdf', 0.4, 4),
    r('a-3', 'u-3', 'Carla Méndez', 'luna.pdf', 0.68, 2),
    r('a-4', 'u-4', 'Diego Sosa', 'mar.jpg', 0.51, 3),
  ];

  it('TS-10 podio y resto sin mutar la entrada', () => {
    const before = ranking.map(x => x.attachment_id);
    const { podium, rest } = splitResults(ranking);
    expect(podium.map(x => x.attachment_id)).toEqual(['a-2', 'a-3', 'a-4']);
    expect(rest.map(x => x.attachment_id)).toEqual(['a-1', 'a-5']);
    expect(ranking.map(x => x.attachment_id)).toEqual(before);
  });

  it('TS-11 pocas propuestas', () => {
    const two = splitResults([r('a-3', 'u-3', 'C', 'l.pdf', 0.6, 2), r('a-2', 'u-2', 'B', 's.png', 0.7, 1)]);
    expect(two.podium).toHaveLength(2);
    expect(two.rest).toEqual([]);
    expect(splitResults([])).toEqual({ podium: [], rest: [] });
  });
});

describe('compartir', () => {
  it('TS-12 enlaces de redes', () => {
    expect(shareUrl('https://telescopio.app', 'e-1')).toBe('https://telescopio.app/events/e-1');
    const links = shareLinks('https://telescopio.app/events/e-1', 'Concurso de afiches');
    expect(links.map(l => l.network)).toEqual(['whatsapp', 'x', 'linkedin', 'facebook', 'email']);
    expect(links.map(l => l.href)).toEqual([
      'https://wa.me/?text=Concurso%20de%20afiches%0Ahttps%3A%2F%2Ftelescopio.app%2Fevents%2Fe-1',
      'https://twitter.com/intent/tweet?text=Concurso%20de%20afiches&url=https%3A%2F%2Ftelescopio.app%2Fevents%2Fe-1',
      'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Ftelescopio.app%2Fevents%2Fe-1',
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Ftelescopio.app%2Fevents%2Fe-1',
      'mailto:?subject=Concurso%20de%20afiches&body=https%3A%2F%2Ftelescopio.app%2Fevents%2Fe-1',
    ]);
  });

  it('TS-13 textos por etapa', () => {
    expect(shareAudienceKey('participation')).toBe('share.audience.participation');
    expect(shareAudienceKey('voting')).toBe('share.audience.voting');
    expect(shareAudienceKey('results')).toBe('share.audience.results');
    expect(afterKey('upload', 'participation')).toBe('eventDetail.after.participation');
    expect(afterKey('vote', 'voting')).toBe('eventDetail.after.voting');
    expect(afterKey('results', 'results')).toBeNull();
    expect(afterKey('cancelled', 'participation')).toBeNull();
  });
});

describe('capacidad', () => {
  it('TS-14', () => {
    expect(capacityOf({ max_participants: null })).toBe(20);
    expect(capacityOf({ max_participants: 8 })).toBe(8);
    expect(isRegistered(ev, null)).toBe(false);
    expect(isRegistered({ participant_ids: ['u-1'] }, 'u-1')).toBe(true);
  });
});
