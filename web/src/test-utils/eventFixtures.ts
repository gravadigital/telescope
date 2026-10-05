import type { EventListItem, EventListPage, MyEvent } from '../types';

export const listItem = (over: Partial<EventListItem> = {}): EventListItem => ({
  id: 'e-1',
  name: 'Concurso de afiches',
  description: 'Diseña el afiche del festival',
  stage: 'participation',
  author_id: 'u-9',
  max_participants: 20,
  participants_count: 12,
  participant_ids: [],
  participation_estimated_end_date: '2026-10-10',
  voting_estimated_end_date: null,
  is_paused: false,
  is_cancelled: false,
  created_at: '2026-09-28T12:00:00Z',
  ...over,
});

export const myEvent = (over: Partial<MyEvent> = {}): MyEvent => {
  const { participant_ids, ...base } = listItem();
  void participant_ids;
  return {
    ...base,
    role: 'participant',
    my_status: {
      has_attachment: false,
      has_assignment: false,
      ranking_submitted: false,
      result_position: null,
      result_total: null,
    },
    ...over,
  };
};

export const page = (items: EventListItem[], over: Partial<EventListPage> = {}): EventListPage => ({
  items,
  pagination: { page: 1, limit: 10, total: items.length, totalPages: 1 },
  stageCounts: { participation: 4, voting: 2, results: 2 },
  ...over,
});
