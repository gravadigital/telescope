import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '../i18n/I18nProvider';
import { ApiError } from '../config/api';
import { NotificationService } from '../services/api';
import { NotificationsProvider, useNotifications } from './NotificationsContext';

jest.mock('../services/api');

const unreadCount = NotificationService.unreadCount as jest.Mock;
const markRead = NotificationService.markRead as jest.Mock;
const markAllRead = NotificationService.markAllRead as jest.Mock;

const setVisibility = (state: 'visible' | 'hidden') =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });

const Probe: React.FC = () => {
  const { unreadCount: count, markRead: mark, markAllRead: markAll, syncUnreadCount } = useNotifications();
  const [error, setError] = React.useState('');
  return (
    <div>
      <p data-testid="count">{count}</p>
      <p data-testid="error">{error}</p>
      <button onClick={() => mark('n-1')}>mark</button>
      <button onClick={() => markAll().catch(() => setError('fail'))}>mark-all</button>
      <button onClick={() => syncUnreadCount(7)}>sync</button>
      <Link to="/other">other</Link>
    </div>
  );
};

const renderProvider = () =>
  render(
    <I18nProvider initialLocale="es">
      <MemoryRouter initialEntries={['/home']}>
        <NotificationsProvider>
          <Routes>
            <Route path="*" element={<Probe />} />
          </Routes>
        </NotificationsProvider>
      </MemoryRouter>
    </I18nProvider>
  );

describe('NotificationsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setVisibility('visible');
    unreadCount.mockResolvedValue(2);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('useNotifications lanza fuera del provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/NotificationsProvider/);
    spy.mockRestore();
  });

  it('TS-25 al montar consulta una sola vez', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
    expect(unreadCount).toHaveBeenCalledTimes(1);
  });

  it('TS-28 polling cada 60 s con la pestaña visible', async () => {
    jest.useFakeTimers();
    renderProvider();
    await act(async () => {});
    expect(unreadCount).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(unreadCount).toHaveBeenCalledTimes(2);
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(unreadCount).toHaveBeenCalledTimes(3);
  });

  it('TS-29 pestaña oculta no consulta; al volver, sí', async () => {
    jest.useFakeTimers();
    renderProvider();
    await act(async () => {});
    setVisibility('hidden');
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(unreadCount).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(unreadCount).toHaveBeenCalledTimes(2);
  });

  it('TS-30 foco y navegación', async () => {
    renderProvider();
    await waitFor(() => expect(unreadCount).toHaveBeenCalledTimes(1));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(unreadCount).toHaveBeenCalledTimes(2);
    userEvent.click(screen.getByRole('link', { name: 'other' }));
    await waitFor(() => expect(unreadCount).toHaveBeenCalledTimes(3));
  });

  it('TS-31 si falla el polling conserva el valor y no muestra error', async () => {
    jest.useFakeTimers();
    unreadCount.mockResolvedValueOnce(2).mockRejectedValueOnce(new ApiError({ status: 500, body: {} }));
    renderProvider();
    await act(async () => {});
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(unreadCount).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('TS-32 anuncia el cambio del contador solo después de la primera carga', async () => {
    jest.useFakeTimers();
    unreadCount.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    const { container } = renderProvider();
    await act(async () => {});
    const live = container.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(live).toBeInTheDocument();
    expect(live).toHaveTextContent('');
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(live).toHaveTextContent('3 notificaciones sin leer');
  });

  it('markRead baja el contador de inmediato y llama al servicio; ignora el error', async () => {
    markRead.mockRejectedValueOnce(new ApiError({ status: 404, body: { code: 'NOTIFICATION_NOT_FOUND' } }));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
    userEvent.click(screen.getByText('mark'));
    await waitFor(() => expect(markRead).toHaveBeenCalledWith('n-1'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('markAllRead deja 0; si falla relanza', async () => {
    markAllRead.mockResolvedValueOnce({ updated: 2 });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
    userEvent.click(screen.getByText('mark-all'));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));

    markAllRead.mockRejectedValueOnce(new ApiError({ status: 500, body: { code: 'DB_UPDATE_ERROR' } }));
    userEvent.click(screen.getByText('sync'));
    expect(screen.getByTestId('count')).toHaveTextContent('7');
    userEvent.click(screen.getByText('mark-all'));
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('fail'));
    expect(screen.getByTestId('count')).toHaveTextContent('7');
  });
});
