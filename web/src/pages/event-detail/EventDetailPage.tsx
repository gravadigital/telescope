import React from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, Callout, Card, FileDropzone, StatusPill, TextField } from '../../components/ui';
import { ShareIcon } from '../../components/ui/icons/Icons';
import EventHero from '../../components/events/event-hero/EventHero';
import StageTimeline from '../../components/events/stage-timeline/StageTimeline';
import NextStepCard from '../../components/events/next-step-card/NextStepCard';
import ProgressChecklist from '../../components/events/progress-checklist/ProgressChecklist';
import ShareDialog from '../../components/events/share-dialog/ShareDialog';
import ParticipantsDialog from '../../components/events/participants-dialog/ParticipantsDialog';
import EventResults from '../../components/voting/event-results/EventResults';
import RankingVotePanel from '../../components/ranking-vote-panel/RankingVotePanel';
import NotFoundPage from '../not-found/NotFoundPage';
import { useAuth } from '../../context/AuthContext';
import { ApiError, getErrorCode } from '../../config/api';
import {
  COMMENT_MAX,
  SUCCESS_NOTICE_MS,
  afterKey,
  capacityOf,
  detailPill,
  isRegistered,
  nextStepState,
  progressSteps,
} from '../../domain/eventDetail';
import type { AssignmentStatus, NextStepState } from '../../domain/eventDetail';
import { currentDeadline } from '../../domain/events';
import type { FileRejection } from '../../domain/files';
import { loginPathFor } from '../../domain/redirect';
import { STAGE_ORDER, stageNameKey } from '../../domain/stages';
import { scopedMessageKeyForError, useT } from '../../i18n';
import type { TranslationKey } from '../../i18n';
import {
  AttachmentService,
  DistributedVotingService,
  EventService,
} from '../../services/api';
import type { AnonymousAssignment, Attachment, Event, EventStage, VotingResults } from '../../types';
import '../../components/ui/visually-hidden.css';
import './EventDetailPage.css';

const REGISTER_ERROR_CODES = [
  'MAX_PARTICIPANTS_REACHED',
  'EVENT_PAUSED',
  'INVALID_REGISTRATION_STAGE',
  'ALREADY_REGISTERED',
] as const;

const UPLOAD_ERROR_CODES = [
  'FILE_TOO_LARGE',
  'INVALID_FILE_TYPE',
  'EVENT_PAUSED',
  'INVALID_EVENT_STAGE',
  'DUPLICATE_ATTACHMENT',
  'DESCRIPTION_TOO_LONG',
] as const;

const NOT_FOUND_CODES = ['EVENT_NOT_FOUND', 'INVALID_EVENT_ID', 'MISSING_EVENT_ID'];

const REJECTION_KEYS: Record<FileRejection, TranslationKey> = {
  too_large: 'eventDetail.upload.tooLarge',
  invalid_type: 'eventDetail.upload.invalidType',
  multiple: 'eventDetail.upload.multiple',
};

type LoadStatus = 'loading' | 'ready' | 'notFound' | 'error';

const EventDetailPage: React.FC = () => {
  const { t, locale, fmt } = useT();
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading: authLoading, joinEvent } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? null;

  const [loadStatus, setLoadStatus] = React.useState<LoadStatus>('loading');
  const [event, setEvent] = React.useState<Event | null>(null);
  const [myAttachment, setMyAttachment] = React.useState<Attachment | null>(null);
  const [assignment, setAssignment] = React.useState<AnonymousAssignment | null | undefined>(undefined);
  const [assignmentFailed, setAssignmentFailed] = React.useState(false);
  const [results, setResults] = React.useState<VotingResults | null>(null);
  const [openEvents, setOpenEvents] = React.useState(0);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [participantsOpen, setParticipantsOpen] = React.useState(false);

  // Acciones del bloque "Tu próximo paso".
  const [registering, setRegistering] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [comment, setComment] = React.useState('');
  const [replacing, setReplacing] = React.useState(false);
  const [fileError, setFileError] = React.useState<TranslationKey | null>(null);
  const [actionError, setActionError] = React.useState<TranslationKey | null>(null);
  const [notice, setNotice] = React.useState(false);

  const requestRef = React.useRef(0);
  const noticeTimer = React.useRef<number | undefined>(undefined);

  const clearNotice = React.useCallback((): void => {
    if (noticeTimer.current !== undefined) {
      window.clearTimeout(noticeTimer.current);
      noticeTimer.current = undefined;
    }
    setNotice(false);
  }, []);

  React.useEffect(
    () => () => {
      if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current);
    },
    []
  );

  // ---------- Carga ----------
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
        // Un evento en Creación no existe para quien no es su autor (el autor ya fue redirigido).
        if (!loaded || (loaded.stage === 'creation' && loaded.creator_id !== userId)) {
          setLoadStatus('notFound');
          return;
        }

        let attachment: Attachment | null = null;
        let nextAssignment: AnonymousAssignment | null | undefined;
        let failedAssignment = false;
        const mine = userId !== null && loaded.creator_id !== userId && isRegistered(loaded, userId);
        if (mine && !loaded.is_cancelled) {
          if (loaded.stage === 'participation') {
            const attachments = await AttachmentService.getEventAttachments(loaded.id);
            attachment = attachments.find((a) => a.participant_id === userId) ?? null;
          } else if (loaded.stage === 'voting') {
            try {
              nextAssignment = await DistributedVotingService.getParticipantAssignment(loaded.id, userId!);
            } catch {
              failedAssignment = true;
            }
          }
        }
        if (request !== requestRef.current) return;
        setEvent(loaded);
        setMyAttachment(attachment);
        setAssignment(nextAssignment);
        setAssignmentFailed(failedAssignment);
        setLoadStatus('ready');
      } catch (err) {
        if (request !== requestRef.current) return;
        const notFound =
          (err instanceof ApiError && err.status === 404) ||
          NOT_FOUND_CODES.includes(getErrorCode(err) ?? '');
        setLoadStatus(notFound ? 'notFound' : 'error');
      }
    },
    [eventId, userId]
  );

  React.useEffect(() => {
    if (authLoading) return;
    setResults(null);
    setSelectedFile(null);
    setComment('');
    setReplacing(false);
    setFileError(null);
    setActionError(null);
    loadAll(false);
    return () => {
      requestRef.current += 1;
    };
  }, [authLoading, loadAll]);

  const isResultsStage = event?.stage === 'results';
  React.useEffect(() => {
    if (!isResultsStage) return;
    let cancelled = false;
    EventService.listEvents({ stage: 'participation', limit: 1 })
      .then((page) => {
        if (!cancelled) setOpenEvents(page.stageCounts.participation);
      })
      .catch(() => {
        if (!cancelled) setOpenEvents(0);
      });
    return () => {
      cancelled = true;
    };
  }, [isResultsStage]);

  // ---------- Acciones ----------
  const handleRegister = async (): Promise<void> => {
    if (!event) return;
    if (!user) {
      navigate(loginPathFor(`/events/${event.id}`));
      return;
    }
    clearNotice();
    setActionError(null);
    setRegistering(true);
    try {
      await EventService.registerForEvent(event.id, user.name, user.email);
      joinEvent(event.id);
      await loadAll(true);
    } catch (err) {
      setActionError(scopedMessageKeyForError(err, REGISTER_ERROR_CODES, 'eventDetail.errors.register'));
      const code = getErrorCode(err);
      if (code === 'ALREADY_REGISTERED' || code === 'MAX_PARTICIPANTS_REACHED') {
        await loadAll(true);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleSelect = (file: File): void => {
    setSelectedFile(file);
    setFileError(null);
    setActionError(null);
  };

  const handleReject = (reason: FileRejection): void => {
    setFileError(REJECTION_KEYS[reason]);
  };

  const handleClear = (): void => {
    setSelectedFile(null);
    setFileError(null);
  };

  const handleReplace = (): void => {
    setReplacing(true);
    setComment(myAttachment?.description ?? '');
    setActionError(null);
    clearNotice();
  };

  const handleSend = async (): Promise<void> => {
    if (!event || !user || !selectedFile || sending) return;
    clearNotice();
    setActionError(null);
    setSending(true);
    let deletedPrevious = false;
    try {
      // La api admite una sola propuesta por participante: reemplazar es borrar y volver a subir.
      if (myAttachment) {
        try {
          await AttachmentService.deleteAttachment(myAttachment.id);
          deletedPrevious = true;
        } catch (err) {
          setActionError(scopedMessageKeyForError(err, [], 'eventDetail.errors.replace'));
          return;
        }
      }
      const uploaded = await AttachmentService.uploadAttachment(
        event.id,
        user.id,
        selectedFile,
        comment.trim()
      );
      setMyAttachment(uploaded);
      setSelectedFile(null);
      setComment('');
      setReplacing(false);
      setNotice(true);
      noticeTimer.current = window.setTimeout(() => {
        noticeTimer.current = undefined;
        setNotice(false);
      }, SUCCESS_NOTICE_MS);
    } catch (err) {
      if (deletedPrevious) {
        // Sin propuesta vigente: se vuelve a "Sube tu propuesta" con lo elegido conservado.
        setMyAttachment(null);
        setReplacing(false);
      }
      setActionError(scopedMessageKeyForError(err, UPLOAD_ERROR_CODES, 'eventDetail.errors.upload'));
    } finally {
      setSending(false);
    }
  };

  // ---------- Render ----------
  if (loadStatus === 'loading') {
    return (
      <div className="edp-page">
        <p role="status" className="ui-visually-hidden">
          {t('eventDetail.loading')}
        </p>
        <div className="edp-skeleton edp-skeleton--hero" aria-hidden="true" />
        <div className="edp-container">
          <div className="edp-skeleton edp-skeleton--block" aria-hidden="true" />
          <div className="edp-skeleton edp-skeleton--block" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (loadStatus === 'notFound') return <NotFoundPage />;

  if (loadStatus === 'error' || !event) {
    return (
      <div className="edp-page">
        <div className="edp-container edp-load-error">
          <Callout tone="error" action={{ label: t('common.retry'), onClick: () => loadAll(false) }}>
            {t('eventDetail.loadError')}
          </Callout>
          <Link to="/events" className="edp-load-error__link">
            {t('eventDetail.goToEvents')}
          </Link>
        </div>
      </div>
    );
  }

  if (userId && event.creator_id === userId) {
    return <Navigate to={`/events/${event.id}/manage`} replace />;
  }

  const assignmentStatus: AssignmentStatus =
    assignment === undefined ? null : assignment === null ? 'none' : assignment.is_completed ? 'completed' : 'pending';
  const state: NextStepState = nextStepState(event, userId, myAttachment, assignmentStatus);
  const pill = detailPill(state, event);
  const deadline = currentDeadline({
    stage: event.stage,
    participation_estimated_end_date: event.participation_estimated_end_date ?? null,
    voting_estimated_end_date: event.voting_estimated_end_date ?? null,
  });
  const deadlineText = deadline ? fmt.date(deadline) : null;
  const participantCount = event.participant_ids?.length ?? 0;
  const capacity = capacityOf(event);
  const meta = [
    t('eventDetail.meta', { organizer: event.organizer ?? '', count: participantCount, max: capacity }),
    isResultsStage && results ? t('eventDetail.metaFinished', { date: fmt.date(results.calculated_at.slice(0, 10)) }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const stageLabels = Object.fromEntries(
    STAGE_ORDER.map((s) => [s, t(stageNameKey(s))])
  ) as Record<EventStage, string>;
  const subtitles = Object.fromEntries(
    STAGE_ORDER.map((s) => [
      s,
      s === event.stage && deadlineText
        ? t('eventDetail.timeline.closes', { date: deadlineText })
        : t(`eventDetail.timeline.${s}` as TranslationKey),
    ])
  ) as Record<EventStage, string>;

  const steps = progressSteps(state, event);
  const after = afterKey(state, event.stage);
  const canViewParticipants = userId !== null;

  const uploadText = (kind: 'upload' | 'submitted'): string =>
    deadlineText
      ? t(`eventDetail.nextStep.${kind}.text` as TranslationKey, { date: deadlineText })
      : t(`eventDetail.nextStep.${kind}.textNoDate` as TranslationKey);

  const fileZone = (): React.ReactNode => (
    <>
      <FileDropzone
        key={myAttachment?.id ?? 'none'}
        file={selectedFile}
        submitted={
          myAttachment
            ? {
                name: myAttachment.original_name,
                size: myAttachment.file_size,
                date: myAttachment.uploaded_at.slice(0, 10),
              }
            : undefined
        }
        error={fileError ? t(fileError) : undefined}
        uploading={sending}
        locale={locale}
        labels={{
          prompt: t('eventDetail.upload.prompt'),
          promptAction: t('eventDetail.upload.promptAction'),
          formats: t('eventDetail.upload.formats'),
          ready: t('eventDetail.upload.ready'),
          change: t('eventDetail.upload.change'),
          changeAccessible: t('eventDetail.upload.changeAccessible', { name: '{name}' }),
          submittedOn: t('eventDetail.upload.submittedOn', { date: '{date}' }),
          replace: t('eventDetail.upload.replace'),
        }}
        onSelect={handleSelect}
        onReject={handleReject}
        onClear={handleClear}
        onReplace={handleReplace}
      />
      {selectedFile && (
        <TextField
          variant="multiline"
          label={t('eventDetail.comment.label')}
          optional
          optionalLabel={t('eventDetail.comment.optional')}
          help={t('eventDetail.comment.help')}
          maxLength={COMMENT_MAX}
          name="comment"
          value={comment}
          disabled={sending}
          onChange={(e) => setComment(e.target.value)}
        />
      )}
      {(state === 'upload' || replacing) && (
        <div className="edp-submit">
          <Button
            size="lg"
            disabled={!selectedFile}
            loading={sending}
            loadingLabel={t('eventDetail.submitting')}
            onClick={handleSend}
          >
            {myAttachment ? t('eventDetail.submitReplace') : t('eventDetail.submit')}
          </Button>
          <p className="edp-submit__help">
            {selectedFile ? t('eventDetail.submitHelpReady') : t('eventDetail.submitHelpEmpty')}
          </p>
        </div>
      )}
    </>
  );

  const feedback = (
    <>
      <div role="status" aria-live="polite">
        {notice && <Callout tone="success">{t('eventDetail.received')}</Callout>}
      </div>
      {actionError && <Callout tone="error">{t(actionError)}</Callout>}
    </>
  );

  const nextStep = (): React.ReactNode => {
    const common = { eyebrow: t('eventDetail.nextStep.eyebrow') };
    switch (state) {
      case 'default':
        return (
          <NextStepCard
            {...common}
            title={t('eventDetail.nextStep.default.title')}
            description={t('eventDetail.nextStep.default.text')}
            primaryAction={{
              label: t('eventDetail.register'),
              onClick: handleRegister,
              loading: registering,
              loadingLabel: t('eventDetail.registering'),
            }}
          >
            <ul className="edp-requirements" aria-label={t('eventDetail.requirements.label')}>
              <li>{t('eventDetail.requirements.formats')}</li>
              <li>{t('eventDetail.requirements.size')}</li>
              {deadlineText && <li>{t('eventDetail.requirements.closes', { date: deadlineText })}</li>}
            </ul>
            {feedback}
          </NextStepCard>
        );
      case 'upload':
      case 'submitted':
        return (
          <NextStepCard
            {...common}
            title={t(`eventDetail.nextStep.${state}.title` as TranslationKey)}
            description={uploadText(state)}
          >
            {fileZone()}
            {feedback}
          </NextStepCard>
        );
      case 'paused':
      case 'full':
      case 'noProposalInVoting':
        return (
          <NextStepCard {...common} title={t(`eventDetail.nextStep.${state}.title` as TranslationKey)}>
            <Callout tone="warning">{t(`eventDetail.nextStep.${state}.text` as TranslationKey)}</Callout>
            {feedback}
          </NextStepCard>
        );
      case 'vote':
      case 'rankingSent':
        return (
          <NextStepCard
            {...common}
            title={
              assignment
                ? t(`eventDetail.nextStep.${state}.title` as TranslationKey, {
                    count: assignment.attachments.length,
                  })
                : t('eventDetail.pill.vote')
            }
            description={assignment ? t(`eventDetail.nextStep.${state}.text` as TranslationKey) : undefined}
          >
            {assignmentFailed && (
              <Callout tone="error" action={{ label: t('common.retry'), onClick: () => loadAll(true) }}>
                {t('eventDetail.errors.assignment')}
              </Callout>
            )}
            {assignment && user && (
              <RankingVotePanel
                eventId={event.id}
                participantId={user.id}
                onVotesSubmitted={() => {
                  loadAll(true);
                }}
              />
            )}
          </NextStepCard>
        );
      case 'votingNotRegistered':
      case 'cancelled':
        return (
          <NextStepCard
            {...common}
            title={t(`eventDetail.nextStep.${state}.title` as TranslationKey)}
            description={t(`eventDetail.nextStep.${state}.text` as TranslationKey)}
          />
        );
      case 'results':
        return (
          <NextStepCard
            title={t('eventDetail.nextStep.results.title')}
            description={
              results
                ? t('eventDetail.nextStep.results.text', {
                    participants: t('common.participants', { count: results.total_participants }),
                    evaluations: t('results.evaluations', { count: results.total_votes }),
                  })
                : undefined
            }
          >
            <EventResults eventId={event.id} currentUserId={userId} onLoaded={setResults} />
          </NextStepCard>
        );
    }
  };

  const detailRows: Array<{ label: string; value: React.ReactNode }> = [
    { label: t('eventDetail.details.organizer'), value: event.organizer || '—' },
  ];
  if (isResultsStage && results) {
    detailRows.push(
      { label: t('eventDetail.details.evaluations'), value: fmt.number(results.total_votes) },
      { label: t('eventDetail.details.finished'), value: fmt.date(results.calculated_at.slice(0, 10)) }
    );
  } else if (deadlineText && (event.stage === 'participation' || event.stage === 'voting')) {
    detailRows.push({
      label: t('eventDetail.details.closes', { stage: stageLabels[event.stage] }),
      value: deadlineText,
    });
  }
  detailRows.push({
    label: t('eventDetail.details.participants'),
    value: (
      <span className="edp-details__participants">
        <span>{t('eventDetail.details.participantsValue', { count: participantCount, max: capacity })}</span>
        {canViewParticipants && (
          <Button
            variant="tertiary"
            size="sm"
            aria-label={t('eventDetail.details.viewAccessible')}
            onClick={() => setParticipantsOpen(true)}
          >
            {t('eventDetail.details.view')}
          </Button>
        )}
      </span>
    ),
  });

  return (
    <div className="edp-page">
      <EventHero
        back={{ label: t('eventDetail.back'), to: '/events' }}
        pills={
          <StatusPill tone={pill.tone}>{t(pill.key, pill.params)}</StatusPill>
        }
        title={event.title}
        meta={meta}
        actions={
          <Button variant="onBand" iconStart={<ShareIcon />} onClick={() => setShareOpen(true)}>
            {t('eventDetail.share')}
          </Button>
        }
      />

      <div className="edp-container">
        <StageTimeline
          current={event.stage}
          stageLabels={stageLabels}
          subtitles={subtitles}
          nowLabel={t('events.timeline.now')}
          completedLabel={t('events.timeline.completed')}
          pendingLabel={t('events.timeline.pending')}
          stepOfLabel={t('events.timeline.stepOf', { number: STAGE_ORDER.indexOf(event.stage) + 1 })}
          summaryDetail={deadlineText ? t('eventDetail.timeline.closes', { date: deadlineText }) : undefined}
        />

        <div className="edp-body">
          <div className="edp-main">
            <div className="edp-item edp-item--next">{nextStep()}</div>
            <section className="edp-item edp-item--about edp-about">
              <h2 className="edp-about__title">{t('eventDetail.about')}</h2>
              <p className="edp-about__text">{event.description}</p>
            </section>
          </div>

          <aside className="edp-aside" aria-label={t('eventDetail.details.title')}>
            {steps && (
              <div className="edp-item edp-item--progress">
                <ProgressChecklist
                  title={t('eventDetail.progress.title')}
                  doneLabel={t('eventDetail.progress.done')}
                  steps={steps.map((step) => ({
                    label: t(step.labelKey),
                    detail: step.detailKey ? t(step.detailKey, step.params) : undefined,
                    status: step.status,
                  }))}
                />
              </div>
            )}
            {(state === 'vote' || state === 'rankingSent') && (
              <div className="edp-item edp-item--how">
                <Callout tone="info" title={t('eventDetail.howVoteCounts.title')}>
                  {t('eventDetail.howVoteCounts.text')}
                </Callout>
              </div>
            )}
            <div className="edp-item edp-item--details">
              <Card title={t('eventDetail.details.title')}>
                <dl className="edp-details">
                  {detailRows.map((row) => (
                    <div key={row.label} className="edp-details__row">
                      <dt className="edp-details__label">{row.label}</dt>
                      <dd className="edp-details__value">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </div>
            {after && (
              <div className="edp-item edp-item--after">
                <Callout tone="info" title={t('eventDetail.after.title')}>
                  {t(after)}
                </Callout>
              </div>
            )}
          </aside>
        </div>

        {isResultsStage && openEvents > 0 && (
          <div className="edp-banner">
            <Card variant="feature" eyebrow={t('eventDetail.banner.title')} className="edp-banner__card">
              <p className="edp-banner__text">{t('eventDetail.banner.text', { count: openEvents })}</p>
              {!user && <p className="edp-banner__text">{t('eventDetail.banner.guest')}</p>}
            </Card>
            <div className="edp-banner__actions">
              <Link to="/events" className="ui-button ui-button--primary ui-button--md ui-button--full">
                {t('eventDetail.banner.cta')}
              </Link>
              {!user && (
                <Link to="/register" className="ui-button ui-button--secondary ui-button--md ui-button--full">
                  {t('eventDetail.banner.createAccount')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <ShareDialog
        open={shareOpen}
        eventId={event.id}
        eventName={event.title}
        stage={event.stage}
        onClose={() => setShareOpen(false)}
      />
      {canViewParticipants && (
        <ParticipantsDialog
          open={participantsOpen}
          eventId={event.id}
          count={participantCount}
          max={capacity}
          onClose={() => setParticipantsOpen(false)}
        />
      )}
    </div>
  );
};

export default EventDetailPage;
