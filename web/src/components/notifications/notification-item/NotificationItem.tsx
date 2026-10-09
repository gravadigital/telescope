import React from 'react';
import Button from '../../ui/button/Button';
import { BellIcon, CheckIcon, TrophyIcon, UsersIcon } from '../../ui/icons/Icons';
import type { IconProps } from '../../ui/icons/Icons';
import { describe } from '../../../domain/notifications';
import type { NotificationDescription, NotificationTag } from '../../../domain/notifications';
import { useT } from '../../../i18n';
import type { AppNotification } from '../../../types';
import '../../ui/visually-hidden.css';
import './NotificationItem.css';

const TAG_ICONS: Record<NotificationTag, React.FC<IconProps>> = {
  registration: UsersIcon,
  voting: CheckIcon,
  results: TrophyIcon,
  myEvents: BellIcon,
};

export interface NotificationItemProps {
  notification: AppNotification;
  variant: 'panel' | 'page';
  onActivate: (notification: AppNotification, description: NotificationDescription) => void;
  /** Reloj fijo para tests. */
  now?: Date;
}

/** Ítem compartido por el panel (el ítem entero es un botón) y la página (la acción es un botón). */
const NotificationItem: React.FC<NotificationItemProps> = ({ notification, variant, onActivate, now }) => {
  const { t, locale, fmt } = useT();
  const description = describe(notification, locale);
  if (!description) return null;

  const unread = notification.read_at === null;
  const Icon = TAG_ICONS[description.tag];
  const time = (
    <time dateTime={notification.created_at} className="nt-item__time">
      {fmt.relative(notification.created_at, now)}
    </time>
  );

  const content = (
    <>
      {unread && <span className="nt-item__dot" aria-hidden="true" />}
      <span className="nt-item__icon" aria-hidden="true">
        <Icon width={20} height={20} />
      </span>
      <span className="nt-item__content">
        {unread && <span className="ui-visually-hidden">{t('notifications.unread')}</span>}
        <span className="nt-item__title">{t(description.titleKey, description.params)}</span>
        {description.bodyKey && (
          <span className="nt-item__body">{t(description.bodyKey, description.params)}</span>
        )}
        {variant === 'panel' ? (
          <span className="nt-item__meta">
            <span className="nt-item__action-text">{`${t(description.actionKey)} →`}</span>
            <span aria-hidden="true">·</span>
            {time}
          </span>
        ) : (
          <span className="nt-item__meta">
            <span className="nt-item__tag">{t(description.tagKey)}</span>
            <span aria-hidden="true">·</span>
            {time}
          </span>
        )}
      </span>
    </>
  );

  const classes = ['nt-item', `nt-item--${variant}`, unread ? 'nt-item--unread' : ''].filter(Boolean).join(' ');

  if (variant === 'panel') {
    return (
      <li className={classes}>
        <button type="button" className="nt-item__button" onClick={() => onActivate(notification, description)}>
          {content}
        </button>
      </li>
    );
  }

  return (
    <li className={classes}>
      <div className="nt-item__row">{content}</div>
      <Button
        size="sm"
        variant={description.isActionable ? 'primary' : 'secondary'}
        className="nt-item__action"
        onClick={() => onActivate(notification, description)}
      >
        {t(description.actionKey)}
      </Button>
    </li>
  );
};

export default NotificationItem;
