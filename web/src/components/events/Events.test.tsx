import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Events from './Events';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { ApiHealthService, EventService } from '../../services/api';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');

describe('Events', () => {
  it('TS-62: "Create Event" sin sesión lleva a /login con next', async () => {
    (ApiHealthService.checkHealth as jest.Mock).mockResolvedValue(true);
    (EventService.getAllEvents as jest.Mock).mockResolvedValue([]);
    renderWithProviders(<Events onViewEventDetail={jest.fn()} />, {
      route: '/events',
      auth: { user: null, isAuthenticated: false },
    });
    userEvent.click(await screen.findByRole('button', { name: 'Create Event' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fevents%2Fcreate');
  });
});
