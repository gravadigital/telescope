import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/button/Button';
import Callout from '../../components/ui/callout/Callout';
import Card from '../../components/ui/card/Card';
import EmptyState from '../../components/ui/empty-state/EmptyState';
import FilterTabs from '../../components/ui/filter-tabs/FilterTabs';
import TextField from '../../components/ui/text-field/TextField';
import EventsTable from '../../components/events/events-table/EventsTable';
import PendingCard from '../../components/events/pending-card/PendingCard';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import {
  EVENTS_PAGE_SIZE,
  PENDING_LIMIT,
  SEARCH_DEBOUNCE_MS,
  parseStageFilter,
  pendingTasks,
} from '../../domain/events';
import type { StageFilter } from '../../domain/events';
import { loginPathFor } from '../../domain/redirect';
import { EventService, UserService } from '../../services/api';
import type { EventListPage, MyEvent, StageCounts } from '../../types';
import '../../components/ui/visually-hidden.css';
import './EventsListPage.css';

const RESULTS_ID = 'evl-results';
const GUEST_STEPS = ['howStep1', 'howStep2', 'howStep3', 'howStep4'] as const;

type ListState = { status: 'loading' | 'ready' | 'error'; data: EventListPage | null };
type PendingState = { status: 'loading' | 'ready' | 'error'; items: MyEvent[] };

const parsePage = (raw: string | null): number => {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
};

const EventsListPage: React.FC = () => {
  const { t } = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const userId = user?.id ?? null;
  const stage: StageFilter = parseStageFilter(searchParams.get('stage'));
  const urlQuery = (searchParams.get('q') ?? '').trim();
  const page = parsePage(searchParams.get('page'));

  const [query, setQuery] = React.useState(urlQuery);
  const lastCommitted = React.useRef(urlQuery);
  const [list, setList] = React.useState<ListState>({ status: 'loading', data: null });
  const [counts, setCounts] = React.useState<StageCounts | null>(null);
  const [listTick, setListTick] = React.useState(0);
  const [pending, setPending] = React.useState<PendingState>({ status: 'loading', items: [] });
  const [pendingTick, setPendingTick] = React.useState(0);
  const listRequest = React.useRef(0);
  const pendingRequest = React.useRef(0);

  // ---------- Listado público ----------
  React.useEffect(() => {
    const id = ++listRequest.current;
    setList((prev) => ({ status: 'loading', data: prev.data }));
    const params: { q?: string; stage?: Exclude<StageFilter, 'all'>; page: number; limit: number } = {
      page,
      limit: EVENTS_PAGE_SIZE,
    };
    if (urlQuery) params.q = urlQuery;
    if (stage !== 'all') params.stage = stage;
    EventService.listEvents(params)
      .then((result) => {
        if (id !== listRequest.current) return;
        setList({ status: 'ready', data: result });
        setCounts(result.stageCounts);
      })
      .catch(() => {
        if (id !== listRequest.current) return;
        setList({ status: 'error', data: null });
      });
    return () => {
      listRequest.current += 1;
    };
  }, [stage, urlQuery, page, listTick]);

  // ---------- Pendientes (solo con sesión): una vez al montar ----------
  React.useEffect(() => {
    if (!userId) return;
    const id = ++pendingRequest.current;
    setPending({ status: 'loading', items: [] });
    UserService.getMyEvents(userId)
      .then((items) => {
        if (id === pendingRequest.current) setPending({ status: 'ready', items });
      })
      .catch(() => {
        if (id === pendingRequest.current) setPending({ status: 'error', items: [] });
      });
    return () => {
      pendingRequest.current += 1;
    };
  }, [userId, pendingTick]);

  // ---------- Búsqueda con debounce ----------
  const commitQuery = React.useCallback(
    (value: string) => {
      const trimmed = value.trim();
      lastCommitted.current = trimmed;
      if (trimmed === (searchParams.get('q') ?? '').trim()) return;
      const next = new URLSearchParams(searchParams);
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      next.delete('page');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  React.useEffect(() => {
    const handle = setTimeout(() => commitQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, commitQuery]);

  // Navegación atrás/adelante: la URL manda sobre el texto local.
  React.useEffect(() => {
    if (urlQuery === lastCommitted.current) return;
    lastCommitted.current = urlQuery;
    setQuery(urlQuery);
  }, [urlQuery]);

  const changeStage = (value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('stage');
    else next.set('stage', value);
    next.delete('page');
    setSearchParams(next);
  };

  const goToPage = (target: number): void => {
    const next = new URLSearchParams(searchParams);
    if (target > 1) next.set('page', String(target));
    else next.delete('page');
    setSearchParams(next);
  };

  const clearFilters = (): void => {
    lastCommitted.current = '';
    setQuery('');
    setSearchParams({});
  };

  const clearSearch = (): void => {
    setQuery('');
    commitQuery('');
  };

  // ---------- Derivados ----------
  const tasks = React.useMemo(() => pendingTasks(pending.items), [pending.items]);
  const myEventsById = React.useMemo(
    () => Object.fromEntries(pending.items.map((e) => [e.id, e])) as Record<string, MyEvent>,
    [pending.items]
  );
  const createPath = userId ? '/events/create' : loginPathFor('/events/create');
  const total = counts ? counts.participation + counts.voting + counts.results : 0;
  const filtersActive = stage !== 'all' || urlQuery !== '';

  const tabLabel = (label: string, count: number | undefined): string | undefined =>
    count === undefined ? undefined : t('events.list.filterAccessible', { label, count });
  const tabOptions = [
    { value: 'all', label: t('events.list.filterAll'), count: counts ? total : undefined },
    { value: 'participation', label: t('events.list.filterParticipation'), count: counts?.participation },
    { value: 'voting', label: t('events.list.filterVoting'), count: counts?.voting },
    { value: 'results', label: t('events.list.filterResults'), count: counts?.results },
  ].map((option) => ({
    ...option,
    accessibleLabel: option.count === undefined ? undefined : tabLabel(option.label, option.count),
  }));

  const data = list.data;
  const pagination = data?.pagination;

  return (
    <div className="evl-page">
      <div className="evl-header">
        <div className="evl-header__copy">
          {!userId && counts && (
            <p className="evl-eyebrow">{t('events.list.eyebrowGuest', { count: total })}</p>
          )}
          <h1 className="evl-title">{t('events.list.title')}</h1>
          <p className="evl-subtitle">
            {userId ? t('events.list.subtitle') : t('events.list.subtitleGuest')}
          </p>
        </div>
        <Link
          to={createPath}
          className={`ui-button ui-button--md ${userId ? 'ui-button--primary' : 'ui-button--secondary'} evl-header__cta`}
        >
          {userId ? t('events.list.create') : t('events.list.createGuest')}
        </Link>
      </div>

      {userId && (
        <section className="evl-pending">
          {pending.status === 'loading' && (
            <>
              <p role="status" className="ui-visually-hidden">
                {t('events.pending.loading')}
              </p>
              <div className="evl-pending__list" aria-hidden="true">
                {[0, 1].map((n) => (
                  <Card key={n} variant="default" padding="compact">
                    <span className="evl-skeleton evl-skeleton--title" />
                    <span className="evl-skeleton" />
                  </Card>
                ))}
              </div>
            </>
          )}
          {pending.status === 'error' && (
            <Callout
              tone="error"
              action={{ label: t('common.retry'), onClick: () => setPendingTick((n) => n + 1) }}
            >
              {t('events.pending.error')}
            </Callout>
          )}
          {pending.status === 'ready' && tasks.length > 0 && (
            <>
              <h2 className="evl-section-title">
                {t('events.pending.title', { count: tasks.length })}
              </h2>
              <div className="evl-pending__list">
                {tasks.slice(0, PENDING_LIMIT).map((task) => (
                  <PendingCard key={`${task.kind}-${task.event.id}`} task={task} />
                ))}
              </div>
              {tasks.length > PENDING_LIMIT && (
                <Link to="/my-events" className="evl-link">
                  {t('events.pending.seeAll')}
                </Link>
              )}
            </>
          )}
        </section>
      )}

      {!userId && (
        <section className="evl-how">
          <h2 className="evl-section-title">{t('events.list.howTitle')}</h2>
          <ol className="evl-how__steps">
            {GUEST_STEPS.map((key) => (
              <li key={key} className="evl-how__step">
                {t(`events.list.${key}` as const)}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="evl-toolbar">
        <div className="evl-filters">
          <FilterTabs
            options={tabOptions}
            value={stage}
            onChange={changeStage}
            loading={list.status === 'loading' && !counts}
            controls={RESULTS_ID}
            label={t('events.list.filtersLabel')}
          />
        </div>
        <div className="evl-search">
          <TextField
            variant="search"
            label={t('events.list.searchLabel')}
            placeholder={t('events.list.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={clearSearch}
            clearLabel={t('events.list.searchClear')}
          />
        </div>
      </div>

      <p className="ui-visually-hidden" aria-live="polite">
        {list.status === 'ready' && pagination
          ? t('events.list.resultsCount', { count: pagination.total })
          : ''}
      </p>

      <div id={RESULTS_ID} className="evl-results">
        {list.status === 'loading' && (
          <>
            <p role="status" className="ui-visually-hidden">
              {t('events.list.loading')}
            </p>
            <EventsTable
              variant="public"
              caption={t('events.list.title')}
              captionHidden
              rows={[]}
              userId={userId}
              loading
              skeletonRows={5}
            />
          </>
        )}
        {list.status === 'error' && (
          <Callout
            tone="error"
            action={{ label: t('common.retry'), onClick: () => setListTick((n) => n + 1) }}
          >
            {t('events.list.error')}
          </Callout>
        )}
        {list.status === 'ready' && data && data.items.length === 0 && (
          <EmptyState
            variant="inline"
            headingLevel={2}
            title={filtersActive ? t('events.list.noMatches') : t('events.list.noEvents')}
            action={
              filtersActive
                ? { label: t('events.list.clearFilters'), onClick: clearFilters }
                : { label: t('events.list.createGuest'), onClick: () => navigate(createPath) }
            }
          />
        )}
        {list.status === 'ready' && data && data.items.length > 0 && (
          <EventsTable
            variant="public"
            caption={t('events.list.title')}
            captionHidden
            rows={data.items}
            userId={userId}
            myEventsById={myEventsById}
          />
        )}
        {list.status === 'ready' && pagination && pagination.totalPages > 1 && (
          <nav className="evl-pagination" aria-label={t('events.list.paginationLabel')}>
            <Button
              variant="tertiary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              {t('events.list.previous')}
            </Button>
            <span className="evl-pagination__text">
              {t('events.list.pageOf', { page: pagination.page, total: pagination.totalPages })}
            </span>
            <Button
              variant="tertiary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
            >
              {t('events.list.next')}
            </Button>
          </nav>
        )}
      </div>

      {!userId && (
        <Card variant="feature" className="evl-banner">
          <div className="evl-banner__copy">
            <p className="evl-banner__title">{t('events.list.bannerTitle')}</p>
            <p className="evl-banner__text">{t('events.list.bannerText')}</p>
          </div>
          <Link to="/register" className="ui-button ui-button--md ui-button--on-band">
            {t('events.list.bannerCta')}
          </Link>
        </Card>
      )}
    </div>
  );
};

export default EventsListPage;
