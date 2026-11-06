import React from 'react';
import Button from '../../ui/button/Button';
import { describe } from '../../../domain/notifications';
import type { NotificationDescription, NotificationTag } from '../../../domain/notifications';
import { useT } from '../../../i18n';
import type { AppNotification } from '../../../types';
import '../../ui/visually-hidden.css';
import './NotificationItem.css';

const TAG_SYMBOLS: Record<NotificationTag, string> = {
  registration: '!',
  voting: '↑',
  results: '✓',
  myEvents: '+',
};

/** Símbolo específico por tipo de notificación y sub-tipo de etapa, más su clase de color. */
type SymbolInfo = { symbol: string; symbolClass: string };

const symbolFor = (notification: AppNotification, tag: NotificationTag): SymbolInfo => {
  const type = notification.type;
  const data = notification.data ?? {};
  const stage = data.stage;

  if (type === 'stage_changed') {
    if (stage === 'results') return { symbol: '✓', symbolClass: 'check' };
    if (stage === 'voting' && data.can_vote === true) return { symbol: '↑', symbolClass: 'arrow' };
    if (stage === 'participation') return { symbol: '+', symbolClass: 'plus' };
  }
  if (type === 'participant_registered') return { symbol: '+', symbolClass: 'plus' };
  if (type === 'registration_confirmed') return { symbol: '✓', symbolClass: 'check' };
  if (type === 'ranking_submitted') return { symbol: '↑', symbolClass: 'arrow' };
  if (type === 'file_reminder') return { symbol: '!', symbolClass: 'exclamation' };
  if (type === 'vote_reminder') return { symbol: '↑', symbolClass: 'arrow' };
  if (type === 'event_cancelled' || type === 'event_paused') return { symbol: '+', symbolClass: 'plus' };
  if (type === 'deadline_changed') return { symbol: '+', symbolClass: 'plus' };

  const fallback = TAG_SYMBOLS[tag];
  return { symbol: fallback, symbolClass: fallback === '✓' ? 'check' : fallback === '↑' ? 'arrow' : fallback === '!' ? 'exclamation' : 'plus' };
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
  const time = (
    <time dateTime={notification.created_at} className="nt-item__time">
      {fmt.relative(notification.created_at, now)}
    </time>
  );

  const content = (
    <>
      {unread && <span className="nt-item__dot" aria-hidden="true" />}
      <span
        className={`nt-item__icon nt-item__icon--${description.tag} nt-item__icon--symbol-${symbolFor(notification, description.tag).symbolClass}`}
        aria-hidden="true"
      >
        {symbolFor(notification, description.tag).symbol}
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
            <span className={`nt-item__tag nt-item__tag--${description.tag}`}>
              {t(description.tagKey)}
            </span>
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
