import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/button/Button';
import Callout from '../../components/ui/callout/Callout';
import EmptyState from '../../components/ui/empty-state/EmptyState';
import { getFocusableElements } from '../../components/ui/focus';
import { BellIcon } from '../../components/ui/icons/Icons';
import NotificationItem from '../../components/notifications/notification-item/NotificationItem';
import { useNotifications } from '../../context/NotificationsContext';
import { PAGE_LIMIT } from '../../domain/notifications';
import type { NotificationDescription } from '../../domain/notifications';
import { useT } from '../../i18n';
import { NotificationService } from '../../services/api';
import type { AppNotification } from '../../types';
import '../../components/ui/visually-hidden.css';
import './NotificationsPage.css';

type ListState =
  | { status: 'loading'; items: AppNotification[]; cursor: null }
  | { status: 'error'; items: AppNotification[]; cursor: null }
  | { status: 'ready'; items: AppNotification[]; cursor: string | null };

type Phase = 'idle' | 'busy' | 'error';

const SKELETONS = [0, 1, 2, 3, 4];

/** S-12: historial de 90 días, paginado por cursor, con "Marcar todo como leído". */
const NotificationsPage: React.FC = () => {
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, markRead, markAllRead, syncUnreadCount } = useNotifications();
  const [list, setList] = React.useState<ListState>({ status: 'loading', items: [], cursor: null });
  const [more, setMore] = React.useState<Phase>('idle');
  const [markAll, setMarkAll] = React.useState<Phase>('idle');
  const listRef = React.useRef<HTMLUListElement>(null);
  const focusIndex = React.useRef<number | null>(null);
  const active = React.useRef(true);

  const loadFirst = React.useCallback(async () => {
    setList({ status: 'loading', items: [], cursor: null });
    try {
      const page = await NotificationService.list({ limit: PAGE_LIMIT });
      if (!active.current) return;
      setList({ status: 'ready', items: page.notifications, cursor: page.next_cursor });
      syncUnreadCount(page.unread_count);
    } catch {
      if (active.current) setList({ status: 'error', items: [], cursor: null });
    }
  }, [syncUnreadCount]);

  React.useEffect(() => {
    active.current = true;
    void loadFirst();
    return () => {
      active.current = false;
    };
  }, [loadFirst]);

  const loadMore = async () => {
    if (list.status !== 'ready' || list.cursor === null) return;
    setMore('busy');
    try {
      const page = await NotificationService.list({ limit: PAGE_LIMIT, before: list.cursor });
      if (!active.current) return;
      focusIndex.current = list.items.length;
      setList({ status: 'ready', items: [...list.items, ...page.notifications], cursor: page.next_cursor });
      syncUnreadCount(page.unread_count);
      setMore('idle');
    } catch {
      if (active.current) setMore('error');
    }
  };

  // Tras cargar más, el foco va al primer ítem nuevo.
  React.useEffect(() => {
    if (focusIndex.current === null || !listRef.current) return;
    const item = listRef.current.children[focusIndex.current] as HTMLElement | undefined;
    focusIndex.current = null;
    if (item) getFocusableElements(item)[0]?.focus();
  }, [list.items]);

  const handleActivate = (notification: AppNotification, description: NotificationDescription) => {
    if (notification.read_at === null) {
      const readAt = new Date().toISOString();
      setList((current) => ({
        ...current,
        items: current.items.map((n) => (n.id === notification.id ? { ...n, read_at: readAt } : n)),
      }));
      void markRead(notification.id);
    }
    navigate(description.route);
  };

  const handleMarkAll = async () => {
    setMarkAll('busy');
    try {
      await markAllRead();
      if (!active.current) return;
      const readAt = new Date().toISOString();
      setList((current) => ({ ...current, items: current.items.map((n) => (n.read_at ? n : { ...n, read_at: readAt })) }));
      setMarkAll('idle');
    } catch {
      if (active.current) setMarkAll('error');
    }
  };

  // D-7: con historial dentro de la app vuelve atrás; si se entró directo, a /events.
  const handleBack = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (location.key !== 'default') navigate(-1);
    else navigate('/events');
  };

  const loading = list.status === 'loading';
  const empty = list.status === 'ready' && list.items.length === 0;

  return (
    <div className="nt-page">
      <div className="nt-page__header">
        <Link to="/events" className="nt-page__back" onClick={handleBack}>
          {t('notifications.back')}
        </Link>
        <div className="nt-page__intro">
          <p className="nt-page__eyebrow">
            {unreadCount > 0
              ? t('notifications.unreadEyebrow', { count: unreadCount })
              : t('notifications.upToDateEyebrow')}
          </p>
          <h1 className="nt-page__title">{t('notifications.title')}</h1>
          <p className="nt-page__lead">{t('notifications.intro')}</p>
        </div>
        {!loading && !empty && (
          <Button
            variant="secondary"
            className="nt-page__mark"
            disabled={unreadCount === 0}
            loading={markAll === 'busy'}
            onClick={handleMarkAll}
          >
            {t('notifications.markAll')}
          </Button>
        )}
      </div>

      <div className="nt-page__body">
        {markAll === 'error' && <Callout tone="error">{t('notifications.markAllError')}</Callout>}

        {loading && (
          <>
            <p role="status" className="ui-visually-hidden">
              {t('notifications.loading')}
            </p>
            <ul className="nt-page__list" aria-hidden="true">
              {SKELETONS.map((key) => (
                <li key={key} className="nt-page__skeleton" />
              ))}
            </ul>
          </>
        )}

        {list.status === 'error' && (
          <Callout tone="error" action={{ label: t('common.retry'), onClick: () => void loadFirst() }}>
            {t('notifications.loadError')}
          </Callout>
        )}

        {empty && (
          <EmptyState
            variant="inline"
            icon={<BellIcon width={32} height={32} />}
            title={t('notifications.empty')}
            headingLevel={2}
          />
        )}

        {list.status === 'ready' && list.items.length > 0 && (
          <ul ref={listRef} className="nt-page__list">
            {list.items.map((n) => (
              <NotificationItem key={n.id} notification={n} variant="page" onActivate={handleActivate} />
            ))}
          </ul>
        )}

        {more === 'error' && (
          <Callout tone="error" action={{ label: t('common.retry'), onClick: () => void loadMore() }}>
            {t('notifications.loadError')}
          </Callout>
        )}

        {list.status === 'ready' && list.cursor !== null && more !== 'error' && (
          <Button
            variant="secondary"
            className="nt-page__more"
            loading={more === 'busy'}
            loadingLabel={t('notifications.loadingMore')}
            onClick={() => void loadMore()}
          >
            {t('notifications.loadMore')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
