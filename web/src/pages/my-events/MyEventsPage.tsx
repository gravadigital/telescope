import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Callout from '../../components/ui/callout/Callout';
import EmptyState from '../../components/ui/empty-state/EmptyState';
import EventsTable from '../../components/events/events-table/EventsTable';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { UserService } from '../../services/api';
import type { MyEvent } from '../../types';
import '../../components/ui/visually-hidden.css';
import './MyEventsPage.css';

type LoadState = { status: 'loading' | 'ready' | 'error'; items: MyEvent[] };

const byCreatedDesc = (a: MyEvent, b: MyEvent): number =>
  b.created_at.localeCompare(a.created_at);

const MyEventsPage: React.FC = () => {
  const { t } = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? null;
  const [state, setState] = React.useState<LoadState>({ status: 'loading', items: [] });
  const requestId = React.useRef(0);

  const load = React.useCallback(() => {
    if (!userId) return;
    const id = ++requestId.current;
    setState({ status: 'loading', items: [] });
    UserService.getMyEvents(userId)
      .then((items) => {
        if (id === requestId.current) setState({ status: 'ready', items });
      })
      .catch(() => {
        if (id === requestId.current) setState({ status: 'error', items: [] });
      });
  }, [userId]);

  React.useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const organizing = React.useMemo(
    () => state.items.filter((e) => e.role === 'creator').sort(byCreatedDesc),
    [state.items]
  );
  const participating = React.useMemo(
    () => state.items.filter((e) => e.role === 'participant').sort(byCreatedDesc),
    [state.items]
  );

  if (!user) return null;

  const loading = state.status === 'loading';
  const organizingTitle = t('myEvents.organizingTitle', { count: organizing.length });
  const participatingTitle = t('myEvents.participatingTitle', { count: participating.length });

  return (
    <div className="mye-page">
      <div className="mye-header">
        <div className="mye-header__copy">
          <h1 className="mye-title">{t('myEvents.title')}</h1>
          <p className="mye-subtitle">{t('myEvents.subtitle')}</p>
        </div>
        <Link
          to="/events/create"
          className="ui-button ui-button--md ui-button--primary mye-header__cta"
        >
          {t('myEvents.create')}
        </Link>
      </div>

      {state.status === 'error' && (
        <Callout tone="error" action={{ label: t('common.retry'), onClick: load }}>
          {t('myEvents.error')}
        </Callout>
      )}

      {loading && (
        <>
          <p role="status" className="ui-visually-hidden">
            {t('myEvents.loading')}
          </p>
          <section className="mye-section">
            <EventsTable
              variant="organizer"
              caption={t('myEvents.organizingTitle', { count: '…' })}
              captionHidden
              rows={[]}
              userId={userId}
              loading
              skeletonRows={3}
            />
          </section>
          <section className="mye-section">
            <EventsTable
              variant="participant"
              caption={t('myEvents.participatingTitle', { count: '…' })}
              captionHidden
              rows={[]}
              userId={userId}
              loading
              skeletonRows={3}
            />
          </section>
        </>
      )}

      {state.status === 'ready' && (
        <>
          <section className="mye-section">
            <h2 className="mye-section__title">{organizingTitle}</h2>
            {organizing.length > 0 ? (
              <EventsTable
                variant="organizer"
                caption={organizingTitle}
                captionHidden
                rows={organizing}
                userId={userId}
              />
            ) : (
              <EmptyState
                variant="inline"
                headingLevel={3}
                title={t('myEvents.organizingEmpty')}
                action={{
                  label: t('myEvents.organizingEmptyAction'),
                  onClick: () => navigate('/events/create'),
                }}
              />
            )}
          </section>

          <section className="mye-section">
            <h2 className="mye-section__title">{participatingTitle}</h2>
            {participating.length > 0 ? (
              <EventsTable
                variant="participant"
                caption={participatingTitle}
                captionHidden
                rows={participating}
                userId={userId}
              />
            ) : (
              <EmptyState
                variant="inline"
                headingLevel={3}
                title={t('myEvents.participatingEmpty')}
                action={{
                  label: t('myEvents.participatingEmptyAction'),
                  onClick: () => navigate('/events'),
                }}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default MyEventsPage;
