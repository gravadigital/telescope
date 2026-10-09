import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NOTIFICATIONS_POLL_MS } from '../domain/notifications';
import { useT } from '../i18n';
import { NotificationService } from '../services/api';
import '../components/ui/visually-hidden.css';

export interface NotificationsContextValue {
  unreadCount: number;
  refresh(): Promise<void>;
  /** Optimista: baja el contador y después marca en la api; un error se ignora (se corrige en el próximo polling). */
  markRead(id: string): Promise<void>;
  /** Éxito → contador en 0; error → se relanza para que la pantalla muestre su aviso. */
  markAllRead(): Promise<void>;
  /** Actualiza el contador con el `unread_count` que ya trae un listado (D-9). */
  syncUnreadCount(n: number): void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const useNotifications = (): NotificationsContextValue => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

/** Contador de no leídas con el polling de ADR-009; se monta solo con sesión. */
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useT();
  const { pathname } = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const inFlight = useRef(false);
  const loaded = useRef(false);
  const current = useRef(0);
  const mounted = useRef(true);
  const announce = useRef<(count: number) => string>(() => '');
  announce.current = (count) => t('notifications.announce', { count });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const apply = useCallback((count: number) => {
    current.current = count;
    setUnreadCount(count);
  }, []);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const count = await NotificationService.unreadCount();
      if (!mounted.current) return;
      const changed = count !== current.current;
      const wasLoaded = loaded.current;
      loaded.current = true;
      apply(count);
      if (wasLoaded && changed && count > 0) setAnnouncement(announce.current(count));
    } catch {
      // El contador conserva el último valor y se reintenta en el próximo ciclo.
    } finally {
      inFlight.current = false;
    }
  }, [apply]);

  // Al montar y después de cada navegación.
  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const isVisible = () => document.visibilityState === 'visible';
    const interval = window.setInterval(() => {
      if (isVisible()) void refresh();
    }, NOTIFICATIONS_POLL_MS);
    const onVisibility = () => {
      if (isVisible()) void refresh();
    };
    const onFocus = () => void refresh();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const markRead = useCallback(
    async (id: string) => {
      apply(Math.max(0, current.current - 1));
      try {
        await NotificationService.markRead(id);
      } catch {
        // Ajena, vencida o inexistente: el contador se corrige en el próximo polling.
      }
    },
    [apply]
  );

  const markAllRead = useCallback(async () => {
    await NotificationService.markAllRead();
    if (mounted.current) apply(0);
  }, [apply]);

  const syncUnreadCount = useCallback((n: number) => apply(n), [apply]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refresh, markRead, markAllRead, syncUnreadCount }}>
      {children}
      <span aria-live="polite" className="ui-visually-hidden">
        {announcement}
      </span>
    </NotificationsContext.Provider>
  );
};
