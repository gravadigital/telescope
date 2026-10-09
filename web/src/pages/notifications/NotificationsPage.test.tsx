import React from 'react';
import { Link } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationsPage from './NotificationsPage';
import { NotificationsProvider, useNotifications } from '../../context/NotificationsContext';
import { ApiError } from '../../config/api';
import { NotificationService } from '../../services/api';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { n1, n2, n3 } from '../../test-utils/notificationFixtures';
import type { AppNotification } from '../../types';

jest.mock('../../services/api');

const unreadCount = NotificationService.unreadCount as jest.Mock;
const list = NotificationService.list as jest.Mock;
const markRead = NotificationService.markRead as jest.Mock;
const markAllRead = NotificationService.markAllRead as jest.Mock;

const CURSOR = '2026-09-30T08:15:30.000123Z';

const Counter: React.FC = () => {
  const { unreadCount: count } = useNotifications();
  return <p data-testid="bell-count">{count}</p>;
};

const renderPage = (options: Parameters<typeof renderWithProviders>[1] = {}) =>
  renderWithProviders(
    <NotificationsProvider>
      <Counter />
      <Link to="/notifications">ir</Link>
      <NotificationsPage />
    </NotificationsProvider>,
    { route: '/notifications', ...options }
  );

describe('NotificationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    unreadCount.mockResolvedValue(2);
    markRead.mockResolvedValue({ id: 'n-1', read_at: '2026-10-09T12:00:00Z' });
    list.mockResolvedValue({ notifications: [n1, n2], unread_count: 2, next_cursor: CURSOR });
  });

  it('TS-47 muestra encabezado, bajada, ítems en orden y cargar más', async () => {
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando notificaciones…');
    expect(await screen.findByRole('heading', { level: 1, name: 'Notificaciones' })).toBeInTheDocument();
    await screen.findByText('Ya puedes votar en «Cúmulos 2026»');
    expect(list).toHaveBeenCalledWith({ limit: 20 });
    expect(screen.getByText('2 SIN LEER')).toBeInTheDocument();
    expect(
      screen.getByText('Todo lo que pasa en los eventos donde participas u organizas. Se guardan durante 90 días.')
    ).toBeInTheDocument();
    const titles = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(titles[0]).toContain('Cúmulos 2026');
    expect(titles[1]).toContain('Andes');
    expect(screen.getByRole('button', { name: 'Cargar más' })).toBeInTheDocument();
  });

  it('TS-48 cargar más agrega al final y lleva el foco al primer ítem nuevo', async () => {
    list.mockResolvedValueOnce({ notifications: [n1, n2], unread_count: 2, next_cursor: CURSOR });
    list.mockResolvedValueOnce({ notifications: [n3], unread_count: 2, next_cursor: null });
    renderPage();
    userEvent.click(await screen.findByRole('button', { name: 'Cargar más' }));
    expect(list).toHaveBeenLastCalledWith({ limit: 20, before: CURSOR });
    const action = await screen.findByRole('button', { name: 'Ver evento' });
    await waitFor(() => expect(action).toHaveFocus());
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('TS-49 si falla cargar más conserva la lista y reintenta con el mismo cursor', async () => {
    list.mockResolvedValueOnce({ notifications: [n1, n2], unread_count: 2, next_cursor: CURSOR });
    list.mockRejectedValueOnce(new ApiError({ status: 500, body: { code: 'RETRIEVAL_ERROR' } }));
    renderPage();
    userEvent.click(await screen.findByRole('button', { name: 'Cargar más' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus notificaciones.');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    list.mockResolvedValueOnce({ notifications: [n3], unread_count: 2, next_cursor: null });
    userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith({ limit: 20, before: CURSOR }));
    expect(await screen.findByText('Se canceló «Patagonia»')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('TS-50 vacío', async () => {
    list.mockResolvedValue({ notifications: [], unread_count: 0, next_cursor: null });
    unreadCount.mockResolvedValue(0);
    renderPage();
    expect(
      await screen.findByText('Estás al día. Te avisaremos aquí cuando pase algo en tus eventos.')
    ).toBeInTheDocument();
    expect(screen.getByText('ESTÁS AL DÍA')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar todo como leído' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
  });

  it('TS-51 error de carga con reintento', async () => {
    list.mockRejectedValueOnce(new ApiError({ status: 500, body: { code: 'RETRIEVAL_ERROR' } }));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus notificaciones.');
    expect(screen.queryByRole('listitem')).toBeNull();
    userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Ya puedes votar en «Cúmulos 2026»')).toBeInTheDocument();
  });

  it('TS-52 marcar todo deja todo leído y el contador en 0', async () => {
    markAllRead.mockResolvedValue({ updated: 2 });
    renderPage();
    await screen.findByText('Ya puedes votar en «Cúmulos 2026»');
    userEvent.click(screen.getByRole('button', { name: 'Marcar todo como leído' }));
    expect(await screen.findByText('ESTÁS AL DÍA')).toBeInTheDocument();
    expect(screen.queryByText('No leída')).toBeNull();
    expect(screen.getByTestId('bell-count')).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: 'Marcar todo como leído' })).toBeDisabled();
  });

  it('si falla marcar todo muestra el aviso y deja los ítems como estaban', async () => {
    markAllRead.mockRejectedValue(new ApiError({ status: 500, body: { code: 'DB_UPDATE_ERROR' } }));
    renderPage();
    await screen.findByText('Ya puedes votar en «Cúmulos 2026»');
    userEvent.click(screen.getByRole('button', { name: 'Marcar todo como leído' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos marcar las notificaciones. Prueba de nuevo.');
    expect(screen.getAllByText('No leída')).toHaveLength(2);
    expect(screen.getByText('2 SIN LEER')).toBeInTheDocument();
  });

  it('TS-53 sin no leídas el botón queda visible y deshabilitado', async () => {
    const read = (n: AppNotification): AppNotification => ({ ...n, read_at: '2026-10-09T09:00:00Z' });
    list.mockResolvedValue({ notifications: [read(n1), read(n2)], unread_count: 0, next_cursor: null });
    unreadCount.mockResolvedValue(0);
    renderPage();
    await screen.findByText('Ya puedes votar en «Cúmulos 2026»');
    expect(screen.getByRole('button', { name: 'Marcar todo como leído' })).toBeDisabled();
    expect(screen.getByText('ESTÁS AL DÍA')).toBeInTheDocument();
  });

  it('TS-54 tocar la acción marca leída, baja el contador y navega', async () => {
    renderPage();
    await screen.findByText('Ya puedes votar en «Cúmulos 2026»');
    userEvent.click(screen.getByRole('button', { name: 'Ir a votar' }));
    expect(markRead).toHaveBeenCalledWith('n-1');
    expect(screen.getByTestId('location')).toHaveTextContent('/events/e-1');
    expect(screen.getByTestId('bell-count')).toHaveTextContent('1');
  });

  it('TS-55 un solo primary por ítem: vigente primary, el resto de contorno', async () => {
    renderPage();
    await screen.findByText('Ya puedes votar en «Cúmulos 2026»');
    expect(screen.getByRole('button', { name: 'Ir a votar' })).toHaveClass('ui-button--primary');
    expect(screen.getByRole('button', { name: 'Ver inscriptos' })).toHaveClass('ui-button--secondary');
  });

  it('TS-56a Volver con entrada directa va a /events', async () => {
    renderPage();
    await screen.findByText('Ya puedes votar en «Cúmulos 2026»');
    userEvent.click(screen.getByRole('link', { name: '← Volver' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/events');
    expect(screen.getByTestId('location')).not.toHaveTextContent('/notifications');
  });

  it('TS-56b Volver con historial usa navigate(-1)', async () => {
    renderPage({ initialEntry: { pathname: '/my-events' } });
    userEvent.click(screen.getByRole('link', { name: 'ir' }));
    await screen.findByText('Ya puedes votar en «Cúmulos 2026»');
    userEvent.click(screen.getByRole('link', { name: '← Volver' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/my-events');
  });

  it('TS-57 en inglés', async () => {
    renderPage({ locale: 'en' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument();
    await screen.findByText('Voting is open in «Cúmulos 2026»');
    expect(screen.getByText('2 UNREAD')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Back' })).toBeInTheDocument();
  });
});
