import React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Callout, Card, Dialog, EmptyState, ProgressBar, StatTile, StatusPill } from '../../components/ui';
import { BellIcon, EditIcon, LinkIcon, ShareIcon } from '../../components/ui/icons/Icons';
import EventHero from '../../components/events/event-hero/EventHero';
import StageTimeline from '../../components/events/stage-timeline/StageTimeline';
import NextStepCard from '../../components/events/next-step-card/NextStepCard';
import ParticipantsTable from '../../components/events/participants-table/ParticipantsTable';
import EditEventDialog from '../../components/events/edit-event-dialog/EditEventDialog';
import ShareDialog from '../../components/events/share-dialog/ShareDialog';
import OpenRegistrationDialog from '../../components/events/open-registration-dialog/OpenRegistrationDialog';
import OpenVotingDialog from '../../components/events/open-voting-dialog/OpenVotingDialog';
import PublishResultsDialog from '../../components/events/publish-results-dialog/PublishResultsDialog';
import ReminderDialog from '../../components/events/reminder-dialog/ReminderDialog';
import EditDeadlineDialog from '../../components/events/edit-deadline-dialog/EditDeadlineDialog';
import EventResults from '../../components/voting/event-results/EventResults';
import NotFoundPage from '../not-found/NotFoundPage';
import { useAuth } from '../../context/AuthContext';
import { ApiError, getErrorCode } from '../../config/api';
import {
  COPY_FEEDBACK_MS,
  MIN_PROPOSALS_TO_VOTE,
  STAGE_ORDER,
  SUCCESS_NOTICE_MS,
  canEditEvent,
  canPause,
  capacityOf,
  currentDeadline,
  daysUntilClose,
  isRecommendedConfig,
  managePill,
  manageStage,
  pendingFiles,
  pendingVotes,
  reminderType,
  shareUrl,
  stageNameKey,
  stageStatus,
  transitionDialog,
  votingProgress,
} from '../../domain';
import type { ManageStage, TransitionDialog } from '../../domain';
import { scopedMessageKeyForError, useT } from '../../i18n';
import type { Params, TranslationKey } from '../../i18n';
import { AttachmentService, DistributedVotingService, EventService } from '../../services/api';
import type {
  Attachment,
  Event,
  EventParticipant,
  EventStage,
  ReminderResult,
  VotingConfiguration,
  VotingStatistics,
} from '../../types';
import '../../components/ui/visually-hidden.css';
import './ManageEventPage.css';

const PAUSE_ERROR_CODES = ['EVENT_CANCELLED', 'FORBIDDEN'];

const NOT_FOUND_CODES = ['EVENT_NOT_FOUND', 'INVALID_EVENT_ID', 'MISSING_EVENT_ID'];

/** Celda / valor vacío del DS. */
const EMPTY_VALUE = '—';

type LoadStatus = 'loading' | 'ready' | 'notFound' | 'forbidden' | 'error';
type BlockStatus = 'idle' | 'loading' | 'ready' | 'error';

interface Block<T> {
  status: BlockStatus;
  data?: T;
}

/** Diálogos de la gestión (`pause` es la confirmación de pausa, D-1). */
export type ManageDialog = TransitionDialog | 'reminder' | 'deadline' | 'edit' | 'share' | 'pause';

interface Notice {
  key: TranslationKey;
  params?: Params;
}

const IDLE: Block<never> = { status: 'idle' };
const LOADING: Block<never> = { status: 'loading' };

/** Bloques que pide cada estado de la gestión (D-5). */
const BLOCKS: Record<ManageStage, { roster: boolean; stats: boolean; config: boolean }> = {
  creation: { roster: false, stats: false, config: false },
  participation: { roster: true, stats: false, config: false },
  voting: { roster: true, stats: true, config: true },
  results: { roster: false, stats: false, config: true },
  cancelled: { roster: false, stats: false, config: false },
};

function settledBlock<T>(result: PromiseSettledResult<T>): Block<T> {
  return result.status === 'fulfilled' ? { status: 'ready', data: result.value } : { status: 'error' };
}

const ManageEventPage: React.FC = () => {
  const { t, fmt } = useT();
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.id ?? null;

  const [loadStatus, setLoadStatus] = React.useState<LoadStatus>('loading');
  const [event, setEvent] = React.useState<Event | null>(null);
  const [participants, setParticipants] = React.useState<Block<EventParticipant[]>>(IDLE);
  const [attachments, setAttachments] = React.useState<Block<Attachment[]>>(IDLE);
  const [stats, setStats] = React.useState<Block<VotingStatistics>>(IDLE);
  const [config, setConfig] = React.useState<Block<VotingConfiguration | null>>(IDLE);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [openDialog, setOpenDialog] = React.useState<ManageDialog | null>(null);
  // Se conserva entre recargas de la gestión: solo se reinicia al recargar la pestaña (D-9).
  const [reminderSent, setReminderSent] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);
  const [pausing, setPausing] = React.useState(false);
  const [pauseError, setPauseError] = React.useState<TranslationKey | null>(null);
  const [resumeError, setResumeError] = React.useState<TranslationKey | null>(null);

  const pageRef = React.useRef<HTMLDivElement>(null);
  const nextStepRef = React.useRef<HTMLDivElement>(null);
  const pauseCancelRef = React.useRef<HTMLButtonElement>(null);
  /** Etapa desde la que se lanzó una transición: al cambiar, el foco va al nuevo próximo paso. */
  const focusFromStage = React.useRef<EventStage | null>(null);

  const requestRef = React.useRef(0);
  const noticeTimer = React.useRef<number | undefined>(undefined);
  const copyTimer = React.useRef<number | undefined>(undefined);

  // ---------- Avisos ----------
  const showNotice = React.useCallback((key: TranslationKey, params?: Params): void => {
    if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current);
    setNotice({ key, params });
    noticeTimer.current = window.setTimeout(() => {
      noticeTimer.current = undefined;
      setNotice(null);
    }, SUCCESS_NOTICE_MS);
  }, []);

  React.useEffect(
    () => () => {
      if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current);
      if (copyTimer.current !== undefined) window.clearTimeout(copyTimer.current);
    },
    []
  );

  // Aviso "Evento creado" (S-014): llega por el state y se limpia para que recargar no lo repita.
  const arrivedWithCreatedNotice = (location.state as { notice?: string } | null)?.notice === 'eventCreated';
  React.useEffect(() => {
    if (!arrivedWithCreatedNotice) return;
    showNotice('manageEvent.created');
    navigate(location.pathname, { replace: true, state: null });
  }, [arrivedWithCreatedNotice, location.pathname, navigate, showNotice]);

  // ---------- Carga por bloques ----------
  const loadRoster = React.useCallback(async (id: string, request: number): Promise<void> => {
    setParticipants(LOADING);
    setAttachments(LOADING);
    const [loadedParticipants, loadedAttachments] = await Promise.allSettled([
      EventService.getParticipants(id),
      AttachmentService.getEventAttachments(id),
    ]);
    if (request !== requestRef.current) return;
    setParticipants(settledBlock(loadedParticipants));
    setAttachments(settledBlock(loadedAttachments));
  }, []);

  const loadStats = React.useCallback(async (id: string, request: number): Promise<void> => {
    setStats(LOADING);
    const [result] = await Promise.allSettled([DistributedVotingService.getVotingStatistics(id)]);
    if (request !== requestRef.current) return;
    setStats(settledBlock(result));
  }, []);

  const loadConfig = React.useCallback(async (id: string, request: number): Promise<void> => {
    setConfig(LOADING);
    const [result] = await Promise.allSettled([DistributedVotingService.getVotingConfig(id)]);
    if (request !== requestRef.current) return;
    setConfig(settledBlock(result));
  }, []);

  const loadBlocks = React.useCallback(
    async (loaded: Event, request: number): Promise<void> => {
      const needs = BLOCKS[manageStage(loaded)];
      setParticipants(needs.roster ? LOADING : IDLE);
      setAttachments(needs.roster ? LOADING : IDLE);
      setStats(needs.stats ? LOADING : IDLE);
      setConfig(needs.config ? LOADING : IDLE);
      await Promise.all([
        needs.roster ? loadRoster(loaded.id, request) : undefined,
        needs.stats ? loadStats(loaded.id, request) : undefined,
        needs.config ? loadConfig(loaded.id, request) : undefined,
      ]);
    },
    [loadConfig, loadRoster, loadStats]
  );

  /** Pide el evento y, si se puede gestionar, los bloques de su etapa. `silent` no vuelve al skeleton. */
  const loadAll = React.useCallback(
    async (silent: boolean): Promise<void> => {
      if (!eventId) {
        setLoadStatus('notFound');
        return;
      }
      const request = ++requestRef.current;
      if (!silent) setLoadStatus('loading');
      try {
        const loaded = await EventService.getEventById(eventId);
        if (request !== requestRef.current) return;
        if (!loaded) {
          setLoadStatus('notFound');
          return;
        }
        setEvent(loaded);
        if (loaded.creator_id !== userId) {
          setLoadStatus('forbidden');
          return;
        }
        setLoadStatus('ready');
        await loadBlocks(loaded, request);
      } catch (err) {
        if (request !== requestRef.current) return;
        const notFound =
          (err instanceof ApiError && err.status === 404) || NOT_FOUND_CODES.includes(getErrorCode(err) ?? '');
        setLoadStatus(notFound ? 'notFound' : 'error');
      }
    },
    [eventId, userId, loadBlocks]
  );

  /** Recarga el evento y los bloques de su etapa (tras cada diálogo exitoso). */
  const reload = React.useCallback((): Promise<void> => loadAll(true), [loadAll]);

  React.useEffect(() => {
    if (authLoading) return;
    loadAll(false);
    return () => {
      requestRef.current += 1;
    };
  }, [authLoading, loadAll]);

  const retryRoster = (): void => {
    if (event) loadRoster(event.id, requestRef.current);
  };
  const retryStats = (): void => {
    if (event) loadStats(event.id, requestRef.current);
  };
  const retryConfig = (): void => {
    if (event) loadConfig(event.id, requestRef.current);
  };

  // ---------- Acciones ----------
  const handleCopy = async (): Promise<void> => {
    if (!event) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(shareUrl(window.location.origin, event.id));
      if (copyTimer.current !== undefined) window.clearTimeout(copyTimer.current);
      setCopied(true);
      copyTimer.current = window.setTimeout(() => {
        copyTimer.current = undefined;
        setCopied(false);
      }, COPY_FEEDBACK_MS);
    } catch {
      setOpenDialog('share');
    }
  };

  const handleDownload = async (attachment: Attachment): Promise<void> => {
    setDownloadError(null);
    try {
      await AttachmentService.downloadAttachment(attachment.id, attachment.original_name);
    } catch {
      setDownloadError(attachment.original_name);
    }
  };

  const closeDialog = (): void => setOpenDialog(null);

  // Tras un cambio de etapa, foco al título del próximo paso (h1 en Resultados).
  React.useEffect(() => {
    const from = focusFromStage.current;
    if (from === null || loadStatus !== 'ready' || !event || event.stage === from) return;
    focusFromStage.current = null;
    const target =
      event.stage === 'results'
        ? pageRef.current?.querySelector('h1')
        : nextStepRef.current?.querySelector('h2');
    if (target instanceof HTMLElement) {
      target.setAttribute('tabindex', '-1');
      target.focus();
    }
  }, [event, loadStatus]);

  /** Cierre común de los diálogos que terminan bien (D-10). */
  const finishDialog = (key: TranslationKey, params?: Params, stageChanges = false): void => {
    if (stageChanges && event) focusFromStage.current = event.stage;
    closeDialog();
    showNotice(key, params);
    reload();
  };

  const handleReminderDone = (result: ReminderResult): void => {
    setReminderSent(true);
    finishDialog('manage.success.reminderSent', { count: result.recipients_count });
  };

  const handlePauseConfirm = async (): Promise<void> => {
    if (!event || pausing) return;
    setPausing(true);
    setPauseError(null);
    try {
      await EventService.pauseEvent(event.id);
      closeDialog();
      reload();
    } catch (err) {
      setPauseError(scopedMessageKeyForError(err, PAUSE_ERROR_CODES, 'manage.pause.error'));
    } finally {
      setPausing(false);
    }
  };

  const handleResume = async (): Promise<void> => {
    if (!event || pausing) return;
    setPausing(true);
    setResumeError(null);
    try {
      await EventService.pauseEvent(event.id);
      reload();
    } catch (err) {
      setResumeError(scopedMessageKeyForError(err, PAUSE_ERROR_CODES, 'manage.pause.error'));
    } finally {
      setPausing(false);
    }
  };

  const openPauseDialog = (): void => {
    setPauseError(null);
    setOpenDialog('pause');
  };

  // ---------- Render: carga, no encontrado, error, sin permiso ----------
  if (loadStatus === 'loading') {
    return (
      <div className="mep-page">
        <p role="status" className="ui-visually-hidden">
          {t('manage.loading')}
        </p>
        <div className="mep-skeleton mep-skeleton--hero" aria-hidden="true" />
        <div className="mep-container" aria-hidden="true">
          <div className="mep-skeleton mep-skeleton--line" />
          <div className="mep-metrics">
            <StatTile label="" value="" loading />
            <StatTile label="" value="" loading />
          </div>
          <div className="mep-skeleton mep-skeleton--block" />
        </div>
      </div>
    );
  }

  if (loadStatus === 'notFound') return <NotFoundPage />;

  if (loadStatus === 'error' || !event) {
    return (
      <div className="mep-page">
        <div className="mep-container mep-load-error">
          <Callout tone="error" action={{ label: t('common.retry'), onClick: () => loadAll(false) }}>
            {t('manage.loadError')}
          </Callout>
          <Link to="/events" className="mep-load-error__link">
            {t('manage.goToEvents')}
          </Link>
        </div>
      </div>
    );
  }

  if (loadStatus === 'forbidden') {
    return (
      <div className="mep-page">
        <div className="mep-container">
          <EmptyState
            variant="page"
            title={t('manage.forbidden.title')}
            description={t('manage.forbidden.text')}
            action={{ label: t('manage.goToEvents'), onClick: () => navigate('/events') }}
          />
        </div>
      </div>
    );
  }

  // ---------- Render: gestión ----------
  const state = manageStage(event);
  const cancelled = state === 'cancelled';
  const paused = Boolean(event.is_paused) && !cancelled;
  const needs = BLOCKS[state];

  const rosterError = participants.status === 'error' || attachments.status === 'error';
  const rosterReady = participants.status === 'ready' && attachments.status === 'ready';
  const rosterLoading = needs.roster && !rosterReady && !rosterError;
  const statsError = stats.status === 'error';
  const statsReady = stats.status === 'ready';
  const blockError = rosterError || statsError;
  const blocksPending =
    (needs.roster && !rosterReady) || (needs.stats && !statsReady);

  const rows = participants.data ?? [];
  const proposals = attachments.data ?? [];
  const progress = stats.data ? votingProgress(stats.data) : null;
  const votingStatus = stats.data?.participant_voting_status;

  const deadline = currentDeadline({
    stage: event.stage,
    participation_estimated_end_date: event.participation_estimated_end_date ?? null,
    voting_estimated_end_date: event.voting_estimated_end_date ?? null,
  });
  const deadlineText = deadline ? fmt.date(deadline) : null;
  const capacity = capacityOf(event);

  // Pendientes del recordatorio (D-9).
  const reminder = cancelled ? null : reminderType(event.stage);
  const pending =
    reminder === 'file' && rosterReady
      ? pendingFiles(rows, proposals)
      : reminder === 'vote' && rosterReady && statsReady
        ? pendingVotes(rows, votingStatus)
        : [];

  // ---------- Encabezado ----------
  const pill = managePill(event);
  const showEdit = !cancelled && canEditEvent(event.stage);
  const shareAction = ((): React.ReactNode => {
    if (cancelled || event.stage === 'creation') return null;
    if (event.stage === 'participation') {
      return (
        <Button variant="onBand" iconStart={<LinkIcon />} onClick={handleCopy}>
          {copied ? t('manage.copied') : t('manage.copyInvite')}
        </Button>
      );
    }
    return (
      <Button variant="onBand" iconStart={<ShareIcon />} onClick={() => setOpenDialog('share')}>
        {t('manage.share')}
      </Button>
    );
  })();
  const heroActions =
    showEdit || shareAction ? (
      <>
        {showEdit && (
          <Button variant="onBand" iconStart={<EditIcon />} onClick={() => setOpenDialog('edit')}>
            {t('manage.editData')}
          </Button>
        )}
        {shareAction}
      </>
    ) : undefined;

  // ---------- Línea de etapas ----------
  const stageLabels = Object.fromEntries(STAGE_ORDER.map((s) => [s, t(stageNameKey(s))])) as Record<
    EventStage,
    string
  >;
  const closesText = deadlineText
    ? t('manage.timeline.closes', { date: deadlineText })
    : t('manage.timeline.noDeadline');
  const subtitleFor = (stage: EventStage): string | undefined => {
    const status = stageStatus(stage, event.stage);
    switch (stage) {
      case 'creation':
        if (status === 'current') return t('manage.timeline.creationNow');
        return event.created_at ? fmt.date(event.created_at.slice(0, 10)) : undefined;
      case 'participation':
        if (status === 'current') return closesText;
        if (status === 'pending') return t('manage.timeline.noDeadline');
        return attachments.status === 'ready'
          ? t('manage.timeline.files', { count: proposals.length })
          : undefined;
      case 'voting':
        if (status === 'current') return closesText;
        return status === 'pending' ? EMPTY_VALUE : undefined;
      default:
        return status === 'current' ? t('manage.timeline.published') : EMPTY_VALUE;
    }
  };
  const subtitles = Object.fromEntries(STAGE_ORDER.map((s) => [s, subtitleFor(s)])) as Partial<
    Record<EventStage, string>
  >;
  const deadlineEditable =
    !cancelled && !paused && Boolean(deadline) && (event.stage === 'participation' || event.stage === 'voting');

  // ---------- Métricas ----------
  const registeredCount =
    state === 'results' ? event.participant_ids?.length ?? 0 : rosterReady ? rows.length : null;
  const deadlineDays = deadline ? daysUntilClose(deadline) : null;
  const deadlineValue =
    deadlineDays === null
      ? t('manage.metrics.noDeadline')
      : deadlineDays <= 0
        ? t('manage.metrics.closesToday')
        : t('manage.metrics.days', { count: deadlineDays });

  const metrics: React.ReactNode[] = [];
  if (state === 'participation' || state === 'voting' || state === 'results') {
    metrics.push(
      <StatTile
        key="registered"
        label={t('manage.metrics.registered')}
        value={registeredCount ?? EMPTY_VALUE}
        total={registeredCount === null ? undefined : capacity}
        progress={registeredCount !== null}
        loading={state !== 'results' && rosterLoading}
        accessibleText={
          registeredCount === null
            ? undefined
            : t('manage.metrics.registeredA11y', { count: registeredCount, max: capacity })
        }
      />
    );
  }
  if (state === 'participation') {
    metrics.push(
      <StatTile
        key="files"
        label={t('manage.metrics.files')}
        value={rosterReady ? proposals.length : EMPTY_VALUE}
        total={rosterReady ? rows.length : undefined}
        loading={rosterLoading}
        accessibleText={
          rosterReady ? t('manage.metrics.filesA11y', { count: proposals.length, total: rows.length }) : undefined
        }
      />
    );
  }
  if (state === 'voting') {
    metrics.push(
      statsError ? (
        <div key="rankings" className="mep-metric-error">
          <Callout tone="error" action={{ label: t('common.retry'), onClick: retryStats }}>
            {t('manage.participants.statsError')}
          </Callout>
        </div>
      ) : (
        <div key="rankings" className="mep-metric">
          <StatTile
            label={t('manage.metrics.rankings')}
            value={progress ? t('manage.metrics.rankingsValue', { sent: progress.sent, total: progress.total }) : ''}
            loading={!progress}
            accessibleText={
              progress ? t('manage.metrics.rankingsA11y', { sent: progress.sent, total: progress.total }) : undefined
            }
          />
          {progress && (
            <ProgressBar
              value={progress.sent}
              max={progress.total}
              size="sm"
              valueText={t('manage.metrics.rankingsA11y', { sent: progress.sent, total: progress.total })}
            />
          )}
        </div>
      )
    );
  }
  if (state === 'participation' || state === 'voting') {
    metrics.push(<StatTile key="deadline" label={t('manage.metrics.deadline')} value={deadlineValue} />);
  }

  // ---------- Próximo paso ----------
  const dialog = transitionDialog(event.stage);
  const nextStepDisabled = paused || blockError || blocksPending;
  const nextStep = ((): React.ReactNode => {
    if (cancelled || !dialog) return null;
    const action = (label: string) => ({
      label,
      onClick: () => setOpenDialog(dialog),
      disabled: nextStepDisabled,
    });
    const common = { eyebrow: t('manage.nextStep.eyebrow') };
    switch (event.stage) {
      case 'creation':
        return (
          <NextStepCard
            {...common}
            title={t('manage.nextStep.creation.title')}
            description={t('manage.nextStep.creation.text')}
            checklist={[
              { label: t('manage.nextStep.checklist.details'), done: true },
              { label: t('manage.nextStep.checklist.capacity', { count: capacity }), done: true },
              { label: t('manage.nextStep.checklist.deadline'), done: false },
            ]}
            doneLabel={t('events.timeline.completed')}
            pendingLabel={t('events.timeline.pending')}
            primaryAction={action(t('manage.nextStep.creation.action'))}
          />
        );
      case 'participation': {
        let consequence: string | undefined;
        if (rosterReady) {
          const missing = pendingFiles(rows, proposals).length;
          if (proposals.length < MIN_PROPOSALS_TO_VOTE) {
            consequence = t('manage.consequence.minimum', { count: proposals.length });
          } else if (missing > 0) {
            consequence = t('manage.consequence.missingFiles', { count: missing });
          }
        }
        return (
          <NextStepCard
            {...common}
            title={t('manage.nextStep.participation.title')}
            description={t('manage.nextStep.participation.text')}
            consequence={consequence}
            primaryAction={action(t('manage.nextStep.participation.action'))}
          />
        );
      }
      default: {
        const votingDate = event.voting_estimated_end_date;
        return (
          <NextStepCard
            {...common}
            title={t('manage.nextStep.voting.title')}
            description={
              votingDate
                ? t('manage.nextStep.voting.text', { date: fmt.date(votingDate) })
                : t('manage.nextStep.voting.textNoDate')
            }
            consequence={
              progress && progress.missing > 0
                ? t('manage.consequence.missingRankings', { missing: progress.missing, total: progress.total })
                : undefined
            }
            primaryAction={action(t('manage.nextStep.voting.action'))}
            primaryVariant={progress?.complete ? 'primary' : 'secondary'}
          />
        );
      }
    }
  })();

  // ---------- Configuración aplicada ----------
  const configBlock = ((): React.ReactNode => {
    if (!needs.config) return null;
    if (config.status === 'error') {
      return (
        <Callout tone="error" action={{ label: t('common.retry'), onClick: retryConfig }}>
          {t('manage.config.error')}
        </Callout>
      );
    }
    if (config.status !== 'ready' || !config.data) return null;
    const applied = config.data;
    return (
      <Callout tone="info" title={t('manage.config.title')}>
        {t('manage.config.text', {
          count: applied.attachments_per_evaluator,
          min: applied.min_evaluations_per_file,
          quality: isRecommendedConfig(applied) ? t('manage.config.recommended') : t('manage.config.custom'),
        })}
      </Callout>
    );
  })();

  // ---------- Participantes ----------
  const showReminder = reminder !== null && pending.length > 0 && !blockError;
  const reminderButton = showReminder ? (
    <Button
      variant="secondary"
      iconStart={<BellIcon />}
      disabled={paused || reminderSent}
      onClick={() => setOpenDialog('reminder')}
    >
      {reminderSent
        ? t('manage.reminder.sent')
        : t(reminder === 'file' ? 'manage.reminder.file' : 'manage.reminder.vote', { count: pending.length })}
    </Button>
  ) : null;

  const participantsContent = ((): React.ReactNode => {
    if (state === 'creation') {
      return <EmptyState title={t('manage.empty.title')} headingLevel={3} description={t('manage.empty.creation')} />;
    }
    if (!needs.roster) return null;
    if (rosterError) {
      return (
        <Callout tone="error" action={{ label: t('common.retry'), onClick: retryRoster }}>
          {t('manage.participants.error')}
        </Callout>
      );
    }
    if (rosterReady && rows.length === 0) {
      return (
        <EmptyState
          title={t('manage.empty.title')}
          headingLevel={3}
          description={state === 'participation' ? t('manage.empty.participation') : undefined}
          action={
            state === 'participation' ? { label: t('manage.copyInvite'), onClick: handleCopy } : undefined
          }
        />
      );
    }
    return (
      <>
        {downloadError && (
          <Callout tone="error">{t('manage.participants.downloadError', { name: downloadError })}</Callout>
        )}
        <ParticipantsTable
          variant="organizer"
          rows={rows}
          caption={t('manage.participants.caption')}
          loading={!rosterReady}
          stage={event.stage}
          attachments={proposals}
          votingStatus={votingStatus}
          voteUnavailable={statsError}
          onDownload={handleDownload}
        />
      </>
    );
  })();

  const showParticipants = state === 'creation' || needs.roster;
  const showPause = canPause(event);

  return (
    <div className="mep-page" ref={pageRef}>
      <EventHero
        back={{ label: t('manage.back'), to: '/my-events' }}
        pills={
          <>
            <StatusPill tone="onBand">{t(pill.key, pill.params)}</StatusPill>
            <StatusPill tone="onBand">{t('manage.role')}</StatusPill>
          </>
        }
        title={event.title}
        meta={t('manage.meta', {
          organizer: event.organizer ?? '',
          date: event.created_at ? fmt.date(event.created_at.slice(0, 10)) : EMPTY_VALUE,
        })}
        actions={heroActions}
      />

      <div className="mep-container">
        <div role="status" aria-live="polite" className="mep-notice">
          {notice && <Callout tone="success">{t(notice.key, notice.params)}</Callout>}
        </div>

        <StageTimeline
          current={event.stage}
          stageLabels={stageLabels}
          subtitles={subtitles}
          nowLabel={t('events.timeline.now')}
          completedLabel={t('events.timeline.completed')}
          pendingLabel={t('events.timeline.pending')}
          stepOfLabel={t('events.timeline.stepOf', { number: STAGE_ORDER.indexOf(event.stage) + 1 })}
          variant="full"
          onEditDeadline={deadlineEditable ? () => setOpenDialog('deadline') : undefined}
          editLabel={t('manage.timeline.edit')}
          summaryDetail={deadlineText ? t('manage.timeline.closes', { date: deadlineText }) : undefined}
        />

        {paused && <Callout tone="warning">{t('manage.pausedNotice')}</Callout>}

        <div className="mep-body">
          <aside className="mep-aside" aria-label={t('manage.nextStep.eyebrow')}>
            {nextStep && (
              <div className="mep-item mep-item--next" ref={nextStepRef}>
                {nextStep}
              </div>
            )}
            {configBlock && <div className="mep-item mep-item--config">{configBlock}</div>}
            {state === 'creation' && (
              <>
                <div className="mep-item mep-item--summary">
                  <Card variant="subtle" title={t('manage.summary.title')}>
                    <dl className="mep-summary">
                      <div className="mep-summary__row">
                        <dt className="mep-summary__label">{t('manage.summary.participants')}</dt>
                        <dd className="mep-summary__value">{t('manage.summary.participantsValue', { max: capacity })}</dd>
                      </div>
                      <div className="mep-summary__row">
                        <dt className="mep-summary__label">{t('manage.summary.files')}</dt>
                        <dd className="mep-summary__value">{fmt.number(0)}</dd>
                      </div>
                      <div className="mep-summary__row">
                        <dt className="mep-summary__label">{t('manage.summary.deadline')}</dt>
                        <dd className="mep-summary__value">{t('manage.summary.notSet')}</dd>
                      </div>
                    </dl>
                  </Card>
                </div>
                <div className="mep-item mep-item--after">
                  <Callout tone="info" title={t('manage.after.title')}>
                    {t('manage.after.text')}
                  </Callout>
                </div>
              </>
            )}
            {showPause && (
              <div className="mep-item mep-item--pause">
                {resumeError && <Callout tone="error">{t(resumeError)}</Callout>}
                <Button
                  variant="tertiary"
                  fullWidth
                  loading={paused && pausing}
                  onClick={paused ? handleResume : openPauseDialog}
                >
                  {paused ? t('manage.pause.resume') : t('manage.pause.action')}
                </Button>
              </div>
            )}
          </aside>

          {metrics.length > 0 && <div className="mep-metrics mep-item mep-item--metrics">{metrics}</div>}

          <div className="mep-main mep-item mep-item--main">
            {showParticipants && (
              <section className="mep-participants" aria-labelledby="mep-participants-title">
                <div className="mep-participants__header">
                  <h2 id="mep-participants-title" className="mep-participants__title">
                    {t('manage.participants.title')}
                  </h2>
                  {reminderButton}
                </div>
                {participantsContent}
              </section>
            )}
            {state === 'results' && (
              <EventResults eventId={event.id} currentUserId={null} recalculateIfMissing />
            )}
          </div>
        </div>
      </div>

      <EditEventDialog
        open={openDialog === 'edit'}
        event={event}
        onClose={closeDialog}
        onSaved={() => finishDialog('manageEvent.updated')}
      />
      <ShareDialog
        open={openDialog === 'share'}
        eventId={event.id}
        eventName={event.title}
        stage={event.stage}
        onClose={closeDialog}
      />
      <OpenRegistrationDialog
        open={openDialog === 'openRegistration'}
        eventId={event.id}
        onClose={closeDialog}
        onDone={() => finishDialog('manage.success.registrationOpened', undefined, true)}
      />
      <OpenVotingDialog
        open={openDialog === 'openVoting'}
        eventId={event.id}
        onClose={closeDialog}
        onDone={() => finishDialog('manage.success.votingOpened', undefined, true)}
      />
      {progress && (
        <PublishResultsDialog
          open={openDialog === 'publishResults'}
          eventId={event.id}
          progress={progress}
          onClose={closeDialog}
          onDone={() => finishDialog('manage.success.resultsPublished', undefined, true)}
        />
      )}
      {reminder && (
        <ReminderDialog
          open={openDialog === 'reminder'}
          eventId={event.id}
          type={reminder}
          recipients={pending}
          onClose={closeDialog}
          onDone={handleReminderDone}
        />
      )}
      {deadline && (event.stage === 'participation' || event.stage === 'voting') && (
        <EditDeadlineDialog
          open={openDialog === 'deadline'}
          eventId={event.id}
          stage={event.stage}
          currentDate={deadline}
          onClose={closeDialog}
          onDone={() => finishDialog('manage.success.deadlineUpdated')}
        />
      )}
      <Dialog
        open={openDialog === 'pause'}
        onClose={closeDialog}
        variant="alert"
        title={t('manage.pause.confirmTitle')}
        busy={pausing}
        closeLabel={t('manage.dialog.close')}
        describedBy="mep-pause-text"
        initialFocusRef={pauseCancelRef}
        actions={
          <>
            <Button ref={pauseCancelRef} variant="secondary" disabled={pausing} onClick={closeDialog}>
              {t('manage.pause.cancel')}
            </Button>
            <Button loading={pausing} onClick={handlePauseConfirm}>
              {t('manage.pause.action')}
            </Button>
          </>
        }
      >
        <p id="mep-pause-text" className="mep-dialog-text">
          {t('manage.pause.confirmText')}
        </p>
        {pauseError && <Callout tone="error">{t(pauseError)}</Callout>}
      </Dialog>
    </div>
  );
};

export default ManageEventPage;
