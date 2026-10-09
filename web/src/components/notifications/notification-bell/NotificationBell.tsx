import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../ui/button/Button';
import { BellIcon } from '../../ui/icons/Icons';
import { useNotifications } from '../../../context/NotificationsContext';
import { useT } from '../../../i18n';
import NotificationPanel from '../notification-panel/NotificationPanel';
import type { PanelCloseReason } from '../notification-panel/NotificationPanel';
import './NotificationBell.css';

const DESKTOP_QUERY = '(min-width: 768px)';

/** Mismo corte que el CSS; sin `matchMedia` (jsdom) se asume mobile. */
const isDesktop = (): boolean =>
  typeof window.matchMedia === 'function' && Boolean(window.matchMedia(DESKTOP_QUERY)?.matches);

/** Campana con contador: en desktop abre el panel (O-13), en mobile navega a /notifications (D-10). */
const NotificationBell: React.FC = () => {
  const { t } = useT();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const bellRef = React.useRef<HTMLButtonElement>(null);
  const panelId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [desktop, setDesktop] = React.useState(isDesktop);

  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(DESKTOP_QUERY);
    if (!query || typeof query.addEventListener !== 'function') return undefined;
    const onChange = () => {
      const next = isDesktop();
      setDesktop(next);
      if (!next) setOpen(false);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const label =
    unreadCount > 0 ? t('notifications.bellWithCount', { count: unreadCount }) : t('notifications.bell');

  const handleClick = () => {
    if (isDesktop()) {
      setDesktop(true);
      setOpen((current) => !current);
    } else {
      setDesktop(false);
      navigate('/notifications');
    }
  };

  const handleClose = (reason: PanelCloseReason) => {
    setOpen(false);
    if (reason === 'escape') bellRef.current?.focus();
  };

  const panelOpen = desktop && open;

  return (
    <span className="nt-bell">
      <Button
        ref={bellRef}
        variant="icon"
        aria-label={label}
        aria-haspopup={desktop ? 'dialog' : undefined}
        aria-expanded={desktop ? open : undefined}
        aria-controls={panelOpen ? panelId : undefined}
        className="nt-bell__button"
        onClick={handleClick}
      >
        <BellIcon width={24} height={24} />
        {unreadCount > 0 && (
          <span className="nt-bell__count" aria-hidden="true">
            {unreadCount}
          </span>
        )}
      </Button>
      {panelOpen && <NotificationPanel id={panelId} onClose={handleClose} bellRef={bellRef} />}
    </span>
  );
};

export default NotificationBell;
