import type { AppNotification } from '../types';

export const n1: AppNotification = {
  id: 'n-1',
  type: 'stage_changed',
  data: { stage: 'voting', can_vote: true, assigned_count: 3, deadline: '2026-10-20' },
  event: { id: 'e-1', name: 'Cúmulos 2026', stage: 'voting' },
  read_at: null,
  created_at: '2026-10-09T10:00:00Z',
};

export const n2: AppNotification = {
  id: 'n-2',
  type: 'participant_registered',
  data: { count: 5 },
  event: { id: 'e-2', name: 'Andes', stage: 'participation' },
  read_at: null,
  created_at: '2026-10-08T10:00:00Z',
};

export const n3: AppNotification = {
  id: 'n-3',
  type: 'event_cancelled',
  data: {},
  event: { id: 'e-3', name: 'Patagonia', stage: 'participation' },
  read_at: '2026-10-08T09:00:00Z',
  created_at: '2026-10-07T10:00:00Z',
};

export const mockMatchMedia = (matches: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
      onchange: null,
    }),
  });
};
