import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventDetailPage from './EventDetailPage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { ApiHealthService, EventService, AttachmentService } from '../../services/api';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');

describe('EventDetailPage', () => {
  it('TS-63: "Participate" sin sesión lleva a /login con next', async () => {
    (ApiHealthService.checkHealth as jest.Mock).mockResolvedValue(true);
    (EventService.getEventById as jest.Mock).mockResolvedValue({
      id: 'evt-1',
      title: 'Evento',
      description: 'Desc',
      stage: 'participation',
      date: '2026-10-01T00:00:00Z',
      creator_id: 'org-1',
      participant_ids: [],
    });
    (AttachmentService.getEventAttachments as jest.Mock).mockResolvedValue([]);
    renderWithProviders(<EventDetailPage eventId="evt-1" onBack={jest.fn()} />, {
      route: '/events/evt-1',
      auth: { user: null, isAuthenticated: false },
    });
    userEvent.click(await screen.findByRole('button', { name: 'Participate' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fevents%2Fevt-1');
  });
});
