import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Participants from './Participants';
import { EventService } from '../../services/api';

jest.mock('../../services/api');

const mockedGetEventParticipants = EventService.getEventParticipants as jest.MockedFunction<
  typeof EventService.getEventParticipants
>;

const p1 = {
  id: 'u1',
  name: 'Test User',
  email: 't@t.com',
  role: 'participant' as const,
  joinedEventIDs: ['ev-1'],
  createdEventIDs: [],
};

describe('Participants', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('ante un fallo no inventa nombres (TS-4)', async () => {
    mockedGetEventParticipants.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<Participants eventId="ev-1" eventTitle="Test Event" onClose={jest.fn()} />);

    expect(await screen.findByText('❌ Error loading participants')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/María González/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Carlos Rodríguez/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ana López/)).not.toBeInTheDocument();
    expect(screen.queryByText(/participant\(s\) registered/)).not.toBeInTheDocument();
  });

  it('el reintento recupera la lista real (TS-5)', async () => {
    mockedGetEventParticipants
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce([p1]);

    render(<Participants eventId="ev-1" eventTitle="Test Event" onClose={jest.fn()} />);

    await screen.findByText('❌ Error loading participants');

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Test User')).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' && element.textContent === '📊 1 participant registered'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('❌ Error loading participants')).not.toBeInTheDocument();
    expect(mockedGetEventParticipants).toHaveBeenCalledTimes(2);
  });

  it('vacío real muestra el estado vacío, no el de error (TS-6)', async () => {
    mockedGetEventParticipants.mockResolvedValueOnce([]);

    render(<Participants eventId="ev-1" eventTitle="Test Event" onClose={jest.fn()} />);

    expect(await screen.findByText('🌌 No participants registered yet.')).toBeInTheDocument();
    expect(screen.queryByText('❌ Error loading participants')).not.toBeInTheDocument();
  });

  it('un reintento fallido no deja ver la lista anterior (TS-7)', async () => {
    mockedGetEventParticipants
      .mockResolvedValueOnce([p1])
      .mockRejectedValueOnce(new Error('Failed to fetch'));

    const { rerender } = render(
      <Participants eventId="ev-1" eventTitle="Test Event" onClose={jest.fn()} />
    );

    await screen.findByText('Test User');

    rerender(<Participants eventId="ev-2" eventTitle="Test Event" onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('❌ Error loading participants')).toBeInTheDocument();
    });
    expect(screen.queryByText('Test User')).not.toBeInTheDocument();
  });
});
