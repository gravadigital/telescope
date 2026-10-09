import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from './NotificationBell';
import { NotificationsProvider } from '../../../context/NotificationsContext';
import { NotificationService } from '../../../services/api';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { mockMatchMedia, n1, n2 } from '../../../test-utils/notificationFixtures';

jest.mock('../../../services/api');

const unreadCount = NotificationService.unreadCount as jest.Mock;
const list = NotificationService.list as jest.Mock;

const renderBell = () =>
  renderWithProviders(
    <NotificationsProvider>
      <NotificationBell />
    </NotificationsProvider>,
    { route: '/events' }
  );

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockMatchMedia(true);
    unreadCount.mockResolvedValue(2);
    list.mockResolvedValue({ notifications: [n1, n2], unread_count: 2, next_cursor: null });
  });

  it('TS-25 muestra el contador y lo incluye en el nombre accesible', async () => {
    renderBell();
    const bell = await screen.findByRole('button', { name: 'Notificaciones, 2 sin leer' });
    expect(bell).toHaveTextContent('2');
    expect(unreadCount).toHaveBeenCalledTimes(1);
  });

  it('TS-26 sin no leídas no muestra número', async () => {
    unreadCount.mockResolvedValue(0);
    renderBell();
    const bell = await screen.findByRole('button', { name: 'Notificaciones' });
    await waitFor(() => expect(unreadCount).toHaveBeenCalled());
    expect(bell).not.toHaveTextContent(/\d/);
  });

  it('TS-45 en mobile navega a /notifications y no abre el panel', async () => {
    mockMatchMedia(false);
    renderBell();
    const bell = await screen.findByRole('button', { name: 'Notificaciones, 2 sin leer' });
    expect(bell).not.toHaveAttribute('aria-expanded');
    userEvent.click(bell);
    expect(screen.getByTestId('location')).toHaveTextContent('/notifications');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(bell).not.toHaveAttribute('aria-expanded');
    expect(list).not.toHaveBeenCalled();
  });

  it('TS-59 en desktop abre el panel con aria-expanded y aria-controls', async () => {
    renderBell();
    const bell = await screen.findByRole('button', { name: 'Notificaciones, 2 sin leer' });
    expect(bell).toHaveAttribute('aria-expanded', 'false');
    userEvent.click(bell);
    const dialog = await screen.findByRole('dialog', { name: 'Notificaciones' });
    expect(bell).toHaveAttribute('aria-expanded', 'true');
    expect(bell).toHaveAttribute('aria-controls', dialog.id);
    expect(screen.getByTestId('location')).toHaveTextContent('/events');
  });
});
