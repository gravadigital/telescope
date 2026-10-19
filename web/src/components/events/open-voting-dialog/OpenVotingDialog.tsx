import React, { useEffect, useMemo, useState } from 'react';
import { Button, Callout, Dialog, NumberStepper, StatTile } from '../../ui';
import { CalendarIcon } from '../../ui/icons/Icons';
import {
  ADJUSTMENT_MAX,
  ADJUSTMENT_MIN,
  DEFAULT_DURATION_DAYS,
  MIN_EVALUATIONS_MAX,
  THRESHOLD_STEP,
  addDays,
  formatDateCompact,
  initialVotingDraft,
  recommendedMinEvaluations,
  todayISO,
  validateNewDeadline,
  validateVotingDraft,
} from '../../../domain';
import type { VotingConfigDraft, VotingConfigPreview } from '../../../domain';
import { scopedMessageKeyForError, useT } from '../../../i18n';
import type { TranslationKey } from '../../../i18n';
import { DistributedVotingService, EventService } from '../../../services/api';
import '../../ui/visually-hidden.css';
import './OpenVotingDialog.css';

export interface OpenVotingDialogProps {
  open: boolean;
  eventId: string;
  /** Hoy en ISO `YYYY-MM-DD`; inyectable para tests. */
  today?: string;
  onClose: () => void;
  onDone: () => void;
}

const ERROR_CODES = [
  'INSUFFICIENT_ATTACHMENTS',
  'M_EXCEEDS_EVALUABLE',
  'INVALID_THRESHOLDS',
  'MATH_CONSTRAINT_VIOLATION',
  'INVALID_ESTIMATED_DATE',
  'INVALID_TRANSITION',
  'MISSING_VOTING_CONFIG',
  'FORBIDDEN',
] as const;

type PreviewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: VotingConfigPreview };

type ContentProps = Omit<OpenVotingDialogProps, 'open'>;

/** Se monta solo con el diálogo abierto: cada apertura pide el reparto y empieza sin errores. */
const OpenVotingContent: React.FC<ContentProps> = ({ eventId, today, onClose, onDone }) => {
  const { t, locale } = useT();
  const base = useMemo(() => today ?? todayISO(), [today]);
  const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [date, setDate] = useState(() => addDays(base, DEFAULT_DURATION_DAYS));
  const [draft, setDraft] = useState<VotingConfigDraft | null>(null);
  const [minTouched, setMinTouched] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<TranslationKey | null>(null);

  useEffect(() => {
    let active = true;
    setPreview({ status: 'loading' });
    DistributedVotingService.getVotingConfigPreview(eventId).then(
      (data) => {
        if (!active) return;
        setPreview({ status: 'ready', data });
        setDraft(initialVotingDraft(data));
        setMinTouched(false);
      },
      () => {
        if (active) setPreview({ status: 'error' });
      }
    );
    return () => {
      active = false;
    };
  }, [eventId, attempt]);

  const data = preview.status === 'ready' ? preview.data : null;
  const canOpen = Boolean(data?.can_open_voting && draft);

  const dateId = React.useId();
  const dateErrorId = `${dateId}-error`;
  const advancedId = React.useId();

  const dateIssue = validateNewDeadline(date, base);
  const draftIssue = draft ? validateVotingDraft(draft) : null;
  const thresholdError =
    draftIssue === 'not_greater' || draftIssue === 'gap_too_small'
      ? t('manage.openVoting.thresholdError')
      : undefined;
  const adjustmentError =
    draftIssue === 'adjustment_out_of_range' ? t('manage.openVoting.adjustmentRange') : undefined;
  const confirmDisabled = !canOpen || Boolean(dateIssue) || Boolean(draftIssue);

  const updateDraft = (patch: Partial<VotingConfigDraft>): void => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    setSubmitError(null);
  };

  const changePerReviewer = (m: number): void => {
    if (!draft) return;
    const minEvaluations = minTouched
      ? Math.min(draft.min_evaluations_per_file, m)
      : recommendedMinEvaluations(m);
    updateDraft({ attachments_per_evaluator: m, min_evaluations_per_file: minEvaluations });
  };

  const handleConfirm = async (): Promise<void> => {
    if (submitting || confirmDisabled || !draft) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await EventService.updateEventStage(eventId, 'voting', date, {
        attachments_per_evaluator: draft.attachments_per_evaluator,
        min_evaluations_per_file: draft.min_evaluations_per_file,
        adjustment_magnitude: draft.adjustment_magnitude,
        quality_good_threshold: draft.quality_good_threshold,
        quality_bad_threshold: draft.quality_bad_threshold,
      });
      onDone();
    } catch (err) {
      setSubmitError(scopedMessageKeyForError(err, ERROR_CODES, 'manage.openVoting.error'));
      setSubmitting(false);
    }
  };

  const stepperLabels = (label: string) => ({
    label,
    decrementLabel: t('manage.openVoting.stepperDecrement', { label }),
    incrementLabel: t('manage.openVoting.stepperIncrement', { label }),
  });

  const actions = (
    <div className="ev-open-voting__actions">
      {canOpen && (
        <p className="ev-open-voting__irreversible">{t('manage.openVoting.irreversible')}</p>
      )}
      <div className="ev-open-voting__actions-buttons">
        <Button variant="secondary" disabled={submitting} onClick={onClose}>
          {t('manage.dialog.cancel')}
        </Button>
        <Button
          disabled={confirmDisabled}
          loading={submitting}
          loadingLabel={t('manage.openVoting.loading')}
          onClick={() => void handleConfirm()}
        >
          {t('manage.openVoting.confirm')}
        </Button>
      </div>
    </div>
  );

  const leftOut = data ? data.participants_count - data.participants_with_proposal : 0;
  const advancedVisible = Boolean(data && canOpen && draft);

  return (
    <Dialog
      open
      size="lg"
      scroll="page"
      eyebrow={t('manage.openVoting.eyebrow')}
      title={t('manage.openVoting.title')}
      closeLabel={t('manage.dialog.close')}
      busy={submitting}
      onClose={onClose}
      actions={actions}
    >
      <div className="ev-open-voting">
        <div className="ev-open-voting__main">
          <p className="ev-open-voting__text">{t('manage.openVoting.text')}</p>

          {preview.status === 'loading' && (
            <>
              <p role="status" className="ui-visually-hidden">
                {t('manage.openVoting.previewLoading')}
              </p>
              <div className="ev-open-voting__summary" aria-hidden="true">
                <div className="ev-open-voting__skeleton" />
                <div className="ev-open-voting__skeleton" />
                <div className="ev-open-voting__skeleton" />
              </div>
            </>
          )}

          {preview.status === 'error' && (
            <Callout
              tone="error"
              action={{ label: t('common.retry'), onClick: () => setAttempt((n) => n + 1) }}
            >
              {t('manage.openVoting.previewError')}
            </Callout>
          )}

          {data && (
            <>
              <div className="ev-open-voting__summary">
                <StatTile
                  variant="compact"
                  label={t('manage.openVoting.proposals')}
                  value={data.participants_with_proposal}
                />
                <StatTile
                  variant="compact"
                  label={t('manage.openVoting.reviewers')}
                  value={data.participants_with_proposal}
                />
                {canOpen && draft && (
                  <div
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="ev-open-voting__live"
                  >
                    <StatTile
                      variant="compact"
                      label={t('manage.openVoting.perFile')}
                      value={draft.attachments_per_evaluator}
                    />
                  </div>
                )}
              </div>

              {leftOut > 0 && (
                <Callout tone="warning">{t('manage.openVoting.leftOut', { count: leftOut })}</Callout>
              )}

              {!data.can_open_voting && (
                <Callout tone="error">
                  {t('manage.openVoting.minimum', { count: data.participants_with_proposal })}
                </Callout>
              )}
            </>
          )}

          {data && canOpen && draft && (
            <div className="ev-open-voting__fields">
              <div className="ev-open-voting__field">
                <label htmlFor={dateId} className="ev-open-voting__label">
                  {t('manage.openVoting.dateLabel')}
                  <span aria-hidden="true" className="ev-open-voting__required">
                    {' *'}
                  </span>
                </label>
                <div className={`ev-open-voting__date${dateIssue ? ' ev-open-voting__date--error' : ''}`}>
                  <span className="ev-open-voting__date-value" aria-hidden="true">
                    {formatDateCompact(date, locale)}
                  </span>
                  <CalendarIcon className="ev-open-voting__date-icon" />
                  <input
                    id={dateId}
                    type="date"
                    className="ev-open-voting__date-input"
                    value={date}
                    min={addDays(base, 1)}
                    disabled={submitting}
                    aria-invalid={dateIssue ? true : undefined}
                    aria-describedby={dateIssue ? dateErrorId : undefined}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      setDate(event.target.value);
                      setSubmitError(null);
                    }}
                  />
                </div>
                {dateIssue && (
                  <p id={dateErrorId} className="ev-open-voting__error">
                    {t('manage.dialog.dateNotAfterToday')}
                  </p>
                )}
              </div>
              <div className="ev-open-voting__field">
                <NumberStepper
                  value={draft.attachments_per_evaluator}
                  min={data.min_m}
                  max={data.max_m}
                  label={t('manage.openVoting.perReviewer')}
                  help={t('manage.openVoting.perReviewerHelp', {
                    recommended: data.recommended_m,
                    max: data.max_m,
                  })}
                  decrementLabel={t('manage.openVoting.decrement')}
                  incrementLabel={t('manage.openVoting.increment')}
                  disabled={submitting}
                  onChange={changePerReviewer}
                />
              </div>
            </div>
          )}

        </div>

        {advancedVisible && draft && (
          <div className="ev-open-voting__advanced">
            <button
              type="button"
              className="ev-open-voting__advanced-toggle"
              aria-expanded={advancedOpen}
              aria-controls={advancedId}
              onClick={() => setAdvancedOpen((value) => !value)}
            >
              <span className="ev-open-voting__advanced-copy">
                <span className="ev-open-voting__advanced-title">{t('manage.openVoting.advanced')}</span>
                <span className="ev-open-voting__advanced-hint">{t('manage.openVoting.advancedHint')}</span>
              </span>
              <span className="ev-open-voting__advanced-action">
                {advancedOpen
                  ? t('manage.openVoting.advancedHide')
                  : t('manage.openVoting.advancedShow')}
              </span>
            </button>
            {advancedOpen && (
              <div id={advancedId} className="ev-open-voting__advanced-grid">
                <NumberStepper
                  variant="field"
                  {...stepperLabels(t('manage.openVoting.minEvaluations'))}
                  value={draft.min_evaluations_per_file}
                  min={1}
                  max={Math.min(MIN_EVALUATIONS_MAX, draft.attachments_per_evaluator)}
                  disabled={submitting}
                  onChange={(value) => {
                    setMinTouched(true);
                    updateDraft({ min_evaluations_per_file: value });
                  }}
                />
                <NumberStepper
                  variant="field"
                  {...stepperLabels(t('manage.openVoting.adjustment'))}
                  value={draft.adjustment_magnitude}
                  min={ADJUSTMENT_MIN}
                  max={ADJUSTMENT_MAX}
                  unit={t('manage.openVoting.adjustmentUnit')}
                  error={adjustmentError}
                  rangeError={t('manage.openVoting.adjustmentRange')}
                  disabled={submitting}
                  onChange={(value) => updateDraft({ adjustment_magnitude: value })}
                />
                <NumberStepper
                  variant="field"
                  {...stepperLabels(t('manage.openVoting.goodThreshold'))}
                  value={draft.quality_good_threshold}
                  min={0}
                  max={1}
                  step={THRESHOLD_STEP}
                  help={t('manage.openVoting.goodThresholdHelp')}
                  error={thresholdError}
                  disabled={submitting}
                  onChange={(value) => updateDraft({ quality_good_threshold: value })}
                />
                <NumberStepper
                  variant="field"
                  {...stepperLabels(t('manage.openVoting.badThreshold'))}
                  value={draft.quality_bad_threshold}
                  min={0}
                  max={1}
                  step={THRESHOLD_STEP}
                  help={t('manage.openVoting.badThresholdHelp')}
                  error={thresholdError}
                  disabled={submitting}
                  onChange={(value) => updateDraft({ quality_bad_threshold: value })}
                />
              </div>
            )}
          </div>
        )}

        {submitError && <Callout tone="error">{t(submitError)}</Callout>}
      </div>
    </Dialog>
  );
};

const OpenVotingDialog: React.FC<OpenVotingDialogProps> = ({ open, ...rest }) =>
  open ? <OpenVotingContent {...rest} /> : null;

export default OpenVotingDialog;
