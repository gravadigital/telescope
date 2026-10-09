import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from '../notification-bell/NotificationBell';
import { NotificationsProvider } from '../../../context/NotificationsContext';
import { ApiError } from '../../../config/api';
import { NotificationService } from '../../../services/api';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { mockMatchMedia, n1, n2, n3 } from '../../../test-utils/notificationFixtures';

jest.mock('../../../services/api');

const unreadCount = NotificationService.unreadCount as jest.Mock;
const list = NotificationService.list as jest.Mock;
const markRead = NotificationService.markRead as jest.Mock;
const markAllRead = NotificationService.markAllRead as jest.Mock;

const renderBell = () =>
  renderWithProviders(
    <>
      <NotificationsProvider>
        <NotificationBell />
      </NotificationsProvider>
      <button>afuera</button>
    </>,
    { route: '/events' }
  );

const openPanel = async () => {
  const bell = await screen.findByRole('button', { name: /^Notificaciones/ });
  await waitFor(() => expect(unreadCount).toHaveBeenCalled());
  userEvent.click(bell);
  return { bell, dialog: await screen.findByRole('dialog', { name: 'Notificaciones' }) };
};

describe('NotificationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockMatchMedia(true);
    unreadCount.mockResolvedValue(2);
    markRead.mockResolvedValue({ id: 'n-1', read_at: '2026-10-09T12:00:00Z' });
    list.mockResolvedValue({ notifications: [n1, n2], unread_count: 2, next_cursor: null });
  });

  it('TS-33 abre el panel con las 10 recientes, no modal, con el foco en el primer ítem', async () => {
    renderBell();
    const { bell, dialog } = await openPanel();
    expect(bell).toHaveAttribute('aria-expanded', 'true');
    expect(bell).toHaveAttribute('aria-controls', dialog.id);
    expect(list).toHaveBeenCalledWith({ limit: 10 });
    expect(dialog).not.toHaveAttribute('aria-modal');
    expect(within(dialog).getByText('2 nuevas')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Marcar todo como leído' })).toBeInTheDocument();
    const items = await within(dialog).findAllByRole('button', { name: /Ya puedes votar|se inscribieron/ });
    expect(items).toHaveLength(2);
    expect(within(dialog).getByRole('link', { name: 'Ver todas las notificaciones' })).toBeInTheDocument();
    await waitFor(() => expect(items[0]).toHaveFocus());
  });

  it('TS-35 tocar una no leída la marca, baja el contador, cierra y navega', async () => {
    renderBell();
    const { dialog } = await openPanel();
    userEvent.click(await within(dialog).findByRole('button', { name: /Ya puedes votar/ }));
    expect(markRead).toHaveBeenCalledWith('n-1');
    expect(screen.getByTestId('location')).toHaveTextContent('/events/e-1');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' })).toBeInTheDocument();
  });

  it('TS-36 si falla marcar leída igual navega, sin mensaje de error', async () => {
    markRead.mockRejectedValue(new ApiError({ status: 404, body: { code: 'NOTIFICATION_NOT_FOUND' } }));
    renderBell();
    const { dialog } = await openPanel();
    userEvent.click(await within(dialog).findByRole('button', { name: /Ya puedes votar/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/events/e-1');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' })).toBeInTheDocument();
  });

  it('TS-37 tocar una leída no llama a markRead', async () => {
    list.mockResolvedValue({ notifications: [n3], unread_count: 0, next_cursor: null });
    unreadCount.mockResolvedValue(0);
    renderBell();
    const { dialog } = await openPanel();
    userEvent.click(await within(dialog).findByRole('button', { name: /Se canceló/ }));
    expect(markRead).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/events/e-3');
  });

  it('TS-38 marcar todo deja todo leído y el panel abierto', async () => {
    markAllRead.mockResolvedValue({ updated: 2 });
    renderBell();
    const { dialog } = await openPanel();
    await within(dialog).findByRole('button', { name: /Ya puedes votar/ });
    userEvent.click(within(dialog).getByRole('button', { name: 'Marcar todo como leído' }));
    await waitFor(() => expect(within(dialog).queryByText('2 nuevas')).toBeNull());
    expect(within(dialog).queryByText('No leída')).toBeNull();
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('TS-39 si falla marcar todo muestra el error y deja los ítems como estaban', async () => {
    markAllRead.mockRejectedValue(new ApiError({ status: 500, body: { code: 'DB_UPDATE_ERROR' } }));
    renderBell();
    const { dialog } = await openPanel();
    await within(dialog).findByRole('button', { name: /Ya puedes votar/ });
    userEvent.click(within(dialog).getByRole('button', { name: 'Marcar todo como leído' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'No pudimos marcar las notificaciones. Prueba de nuevo.'
    );
    expect(within(dialog).getAllByText('No leída')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Notificaciones, 2 sin leer' })).toBeInTheDocument();
  });

  describe('TS-40 cierre', () => {
    it('Escape cierra y devuelve el foco a la campana', async () => {
      renderBell();
      const { bell } = await openPanel();
      userEvent.keyboard('{esc}');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(bell).toHaveAttribute('aria-expanded', 'false');
      expect(bell).toHaveFocus();
    });

    it('mousedown afuera cierra', async () => {
      renderBell();
      const { bell } = await openPanel();
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(bell).toHaveAttribute('aria-expanded', 'false');
    });

    it('clic en la campana cierra', async () => {
      renderBell();
      const { bell } = await openPanel();
      userEvent.click(bell);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(bell).toHaveAttribute('aria-expanded', 'false');
    });

    it('Tab fuera del panel cierra (no atrapa el foco)', async () => {
      renderBell();
      const { dialog } = await openPanel();
      const all = within(dialog).getByRole('link', { name: 'Ver todas las notificaciones' });
      await within(dialog).findByRole('button', { name: /Ya puedes votar/ });
      act(() => all.focus());
      userEvent.tab();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByRole('button', { name: 'afuera' })).toHaveFocus();
    });
  });

  it('TS-41 carga, error y reintento', async () => {
    let reject: (e: unknown) => void = () => undefined;
    list.mockReturnValueOnce(new Promise((_, r) => { reject = r; }));
    renderBell();
    const { dialog } = await openPanel();
    expect(within(dialog).getByRole('status')).toHaveTextContent('Cargando…');
    expect(dialog.querySelectorAll('.nt-panel__skeleton')).toHaveLength(3);
    await act(async () => {
      reject(new ApiError({ status: 500, body: { code: 'RETRIEVAL_ERROR' } }));
    });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No pudimos cargar tus notificaciones.');
    list.mockResolvedValueOnce({ notifications: [n1], unread_count: 1, next_cursor: null });
    userEvent.click(within(dialog).getByRole('button', { name: 'Reintentar' }));
    expect(await within(dialog).findByRole('button', { name: /Ya puedes votar/ })).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenLastCalledWith({ limit: 10 });
  });

  it('TS-42 vacío', async () => {
    list.mockResolvedValue({ notifications: [], unread_count: 0, next_cursor: null });
    renderBell();
    const { dialog } = await openPanel();
    expect(
      await within(dialog).findByText('Estás al día. Te avisaremos aquí cuando pase algo en tus eventos.')
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/nuevas?$/)).toBeNull();
    expect(within(dialog).queryByRole('button', { name: 'Marcar todo como leído' })).toBeNull();
    expect(within(dialog).getByRole('link', { name: 'Ver todas las notificaciones' })).toBeInTheDocument();
  });

  it('TS-43 ver todas cierra y va a /notifications', async () => {
    renderBell();
    const { dialog } = await openPanel();
    userEvent.click(within(dialog).getByRole('link', { name: 'Ver todas las notificaciones' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/notifications');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('TS-44 inscriptos lleva a la gestión', async () => {
    renderBell();
    const { dialog } = await openPanel();
    userEvent.click(await within(dialog).findByRole('button', { name: /se inscribieron en «Andes»/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/events/e-2/manage');
  });
});
