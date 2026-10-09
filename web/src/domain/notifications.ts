import type { AppNotification } from '../types';
import type { Locale, TranslationKey } from '../i18n/types';
import { formatDate } from './dates';

export const NOTIFICATIONS_POLL_MS = 60_000;
export const PANEL_LIMIT = 10;
export const PAGE_LIMIT = 20;

export type NotificationTag = 'registration' | 'voting' | 'results' | 'myEvents';

export interface NotificationDescription {
  titleKey: TranslationKey;
  bodyKey: TranslationKey | null;
  params: Record<string, string | number>;
  actionKey: TranslationKey;
  route: string;
  tagKey: TranslationKey;
  tag: NotificationTag;
  isActionable: boolean;
}

const TAG_KEYS: Record<NotificationTag, TranslationKey> = {
  registration: 'notifications.tags.registration',
  voting: 'notifications.tags.voting',
  results: 'notifications.tags.results',
  myEvents: 'notifications.tags.myEvents',
};

const str = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/**
 * Compone qué mostrar de una notificación (DA-2): claves de catálogo, parámetros, ruta, etiqueta y
 * prominencia de la acción, a partir de `type` + `data` + evento vigente. Un dato faltante deja el
 * ítem sin cuerpo (D-4); un tipo desconocido devuelve `null` y el ítem no se muestra.
 */
export const describe = (n: AppNotification, locale: Locale): NotificationDescription | null => {
  const data = n.data ?? {};
  const params: Record<string, string | number> = { event: n.event.name };
  const eventRoute = `/events/${n.event.id}`;
  const inStage = (stage: AppNotification['event']['stage']): boolean => n.event.stage === stage;

  const build = (
    titleKey: TranslationKey,
    bodyKey: TranslationKey | null,
    actionKey: TranslationKey,
    tag: NotificationTag,
    isActionable: boolean,
    route: string = eventRoute
  ): NotificationDescription => ({
    titleKey,
    bodyKey,
    params,
    actionKey,
    route,
    tagKey: TAG_KEYS[tag],
    tag,
    isActionable,
  });

  const withDate = (value: unknown, bodyKey: TranslationKey): TranslationKey | null => {
    const date = str(value);
    if (date === null) return null;
    params.date = formatDate(date, locale);
    return bodyKey;
  };

  switch (n.type) {
    case 'stage_changed': {
      const stage = data.stage;
      if (stage === 'participation') {
        return build(
          'notifications.types.participationOpened.title',
          'notifications.types.participationOpened.body',
          'notifications.actions.viewEvent',
          'registration',
          inStage('participation')
        );
      }
      if (stage === 'voting') {
        if (data.can_vote === true) {
          const count = num(data.assigned_count);
          let bodyKey: TranslationKey | null = null;
          if (count !== null) {
            bodyKey = withDate(data.deadline, 'notifications.types.votingAssigned.body');
            if (bodyKey) params.count = count;
          }
          return build(
            'notifications.types.votingAssigned.title',
            bodyKey,
            'notifications.actions.vote',
            'voting',
            inStage('voting')
          );
        }
        return build(
          'notifications.types.votingNoProposal.title',
          'notifications.types.votingNoProposal.body',
          'notifications.actions.viewEvent',
          'voting',
          false
        );
      }
      if (stage === 'results') {
        const position = num(data.result_position);
        const total = num(data.result_total);
        let bodyKey: TranslationKey = 'notifications.types.results.bodyNoPosition';
        if (position !== null && total !== null) {
          params.position = position;
          params.total = total;
          bodyKey = 'notifications.types.results.bodyPosition';
        }
        return build(
          'notifications.types.results.title',
          bodyKey,
          'notifications.actions.viewRanking',
          'results',
          false
        );
      }
      return null;
    }
    case 'event_cancelled':
      return build(
        'notifications.types.cancelled.title',
        'notifications.types.cancelled.body',
        'notifications.actions.viewEvent',
        'myEvents',
        false
      );
    case 'event_paused':
      return build(
        'notifications.types.paused.title',
        'notifications.types.paused.body',
        'notifications.actions.viewEvent',
        'myEvents',
        false
      );
    case 'deadline_changed': {
      const stage = data.stage;
      if (stage !== 'participation' && stage !== 'voting') return null;
      const bodyKey = withDate(
        data.new_date,
        stage === 'voting'
          ? 'notifications.types.deadlineChanged.bodyVoting'
          : 'notifications.types.deadlineChanged.bodyParticipation'
      );
      return build(
        'notifications.types.deadlineChanged.title',
        bodyKey,
        'notifications.actions.viewEvent',
        stage === 'voting' ? 'voting' : 'registration',
        false
      );
    }
    case 'participant_registered': {
      const count = num(data.count);
      if (count === null) return null;
      params.count = count;
      return build(
        'notifications.types.registered.title',
        null,
        'notifications.actions.viewRegistrations',
        'registration',
        false,
        `${eventRoute}/manage`
      );
    }
    case 'registration_confirmed':
      return build(
        'notifications.types.registrationConfirmed.title',
        'notifications.types.registrationConfirmed.body',
        'notifications.actions.uploadFile',
        'registration',
        inStage('participation')
      );
    case 'ranking_submitted':
      return build(
        data.replaced === true
          ? 'notifications.types.rankingSubmitted.titleReplaced'
          : 'notifications.types.rankingSubmitted.title',
        'notifications.types.rankingSubmitted.body',
        'notifications.actions.viewMyRanking',
        'voting',
        false
      );
    case 'file_reminder':
      return build(
        'notifications.types.fileReminder.title',
        withDate(data.deadline, 'notifications.types.fileReminder.body'),
        'notifications.actions.uploadFile',
        'registration',
        inStage('participation')
      );
    case 'vote_reminder':
      return build(
        'notifications.types.voteReminder.title',
        withDate(data.deadline, 'notifications.types.voteReminder.body'),
        'notifications.actions.vote',
        'voting',
        inStage('voting')
      );
    default:
      return null;
  }
};
