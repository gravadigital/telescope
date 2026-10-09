import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../ui/button/Button';
import Callout from '../../ui/callout/Callout';
import EmptyState from '../../ui/empty-state/EmptyState';
import { getFocusableElements } from '../../ui/focus';
import { ArrowRightIcon, BellIcon } from '../../ui/icons/Icons';
import { useNotifications } from '../../../context/NotificationsContext';
import { PANEL_LIMIT } from '../../../domain/notifications';
import type { NotificationDescription } from '../../../domain/notifications';
import { useT } from '../../../i18n';
import { NotificationService } from '../../../services/api';
import type { AppNotification } from '../../../types';
import NotificationItem from '../notification-item/NotificationItem';
import '../../ui/visually-hidden.css';
import './NotificationPanel.css';

export type PanelCloseReason = 'escape' | 'outside' | 'navigate' | 'blur';

export interface NotificationPanelProps {
  id: string;
  onClose: (reason: PanelCloseReason) => void;
  bellRef: React.RefObject<HTMLButtonElement | null>;
}

const SKELETONS = [0, 1, 2];

/**
 * Popover no modal (O-13, solo desktop) anclado a la campana. Se monta al abrir y pide el listado;
 * no atrapa el foco (D-1): si el foco sale del panel, se cierra.
 */
const NotificationPanel: React.FC<NotificationPanelProps> = ({ id, onClose, bellRef }) => {
  const { t } = useT();
  const navigate = useNavigate();
  const { unreadCount, markRead, markAllRead, syncUnreadCount } = useNotifications();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [markAllError, setMarkAllError] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);
  const active = React.useRef(true);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const page = await NotificationService.list({ limit: PANEL_LIMIT });
      if (!active.current) return;
      setItems(page.notifications);
      syncUnreadCount(page.unread_count);
    } catch {
      if (active.current) setError(true);
    } finally {
      if (active.current) setLoading(false);
    }
  }, [syncUnreadCount]);

  React.useEffect(() => {
    active.current = true;
    panelRef.current?.focus();
    void load();
    return () => {
      active.current = false;
    };
  }, [load]);

  // Al terminar de cargar, el foco va al primer ítem (o al primer enfocable si no hay).
  React.useEffect(() => {
    if (loading || !panelRef.current) return;
    const panel = panelRef.current;
    // Si el usuario ya movió el foco fuera del panel (p. ej. a la campana), no se lo quitamos.
    const current = document.activeElement;
    if (current && current !== document.body && !panel.contains(current)) return;
    const first =
      panel.querySelector<HTMLElement>('.nt-item__button') ?? getFocusableElements(panel)[0] ?? panel;
    first.focus();
  }, [loading]);

  React.useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || bellRef.current?.contains(target)) return;
      onCloseRef.current('outside');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current('escape');
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [bellRef]);

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!next) return;
    if (panelRef.current?.contains(next) || bellRef.current?.contains(next)) return;
    onClose('blur');
  };

  const handleActivate = (notification: AppNotification, description: NotificationDescription) => {
    if (notification.read_at === null) void markRead(notification.id);
    onClose('navigate');
    navigate(description.route);
  };

  const handleMarkAll = async () => {
    setMarkAllError(false);
    setMarkingAll(true);
    try {
      await markAllRead();
      if (!active.current) return;
      const readAt = new Date().toISOString();
      setItems((current) => current.map((n) => (n.read_at ? n : { ...n, read_at: readAt })));
    } catch {
      if (active.current) setMarkAllError(true);
    } finally {
      if (active.current) setMarkingAll(false);
    }
  };

  const empty = !loading && !error && items.length === 0;

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="nt-panel"
      onBlur={handleBlur}
    >
      <div className="nt-panel__header">
        <h2 id={titleId} className="nt-panel__title">
          {t('notifications.title')}
        </h2>
        {!empty && !loading && !error && unreadCount > 0 && (
          <span className="nt-panel__count">{t('notifications.newCount', { count: unreadCount })}</span>
        )}
        {!empty && !loading && !error && (
          <Button
            variant="tertiary"
            size="sm"
            className="nt-panel__mark"
            loading={markingAll}
            onClick={handleMarkAll}
          >
            {t('notifications.markAll')}
          </Button>
        )}
      </div>

      {markAllError && (
        <Callout tone="error">{t('notifications.markAllError')}</Callout>
      )}

      {loading && (
        <>
          <p role="status" className="ui-visually-hidden">
            {t('notifications.loadingPanel')}
          </p>
          <ul className="nt-panel__list" aria-hidden="true">
            {SKELETONS.map((key) => (
              <li key={key} className="nt-panel__skeleton" />
            ))}
          </ul>
        </>
      )}

      {error && (
        <Callout tone="error" action={{ label: t('common.retry'), onClick: () => void load() }}>
          {t('notifications.loadError')}
        </Callout>
      )}

      {empty && (
        <EmptyState
          variant="inline"
          icon={<BellIcon width={32} height={32} />}
          title={t('notifications.empty')}
          headingLevel={3}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="nt-panel__list">
          {items.map((n) => (
            <NotificationItem key={n.id} notification={n} variant="panel" onActivate={handleActivate} />
          ))}
        </ul>
      )}

      <Link to="/notifications" className="nt-panel__all" onClick={() => onClose('navigate')}>
        <span>{t('notifications.viewAll')}</span>
        <ArrowRightIcon width={16} height={16} />
      </Link>
    </div>
  );
};

export default NotificationPanel;
