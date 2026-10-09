import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Callout, DateQuickPicker, Dialog, NumberStepper, StatTile } from '../../ui';
import type { DatePreset } from '../../ui';
import {
  ADJUSTMENT_MAX,
  ADJUSTMENT_MIN,
  DEFAULT_DURATION_DAYS,
  DURATION_PRESETS,
  MIN_EVALUATIONS_MAX,
  THRESHOLD_STEP,
  addDays,
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
  const pickerRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);

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

  // Foco inicial en el campo de cierre (el atajo elegido) cuando aparece.
  useEffect(() => {
    if (!canOpen || focusedRef.current) return;
    const radio = pickerRef.current?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]');
    if (radio) {
      radio.focus();
      focusedRef.current = true;
    }
  }, [canOpen]);

  const presets: DatePreset[] = DURATION_PRESETS.map((days) => ({
    days,
    label: t(`manage.dialog.presets.${days}` as TranslationKey),
  }));

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
    <>
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
    </>
  );

  const leftOut = data ? data.participants_count - data.participants_with_proposal : 0;

  return (
    <Dialog
      open
      size="md"
      eyebrow={t('manage.openVoting.eyebrow')}
      title={t('manage.openVoting.title')}
      closeLabel={t('manage.dialog.close')}
      busy={submitting}
      onClose={onClose}
      actions={actions}
    >
      <div className="ev-open-voting">
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
                <div role="status" aria-live="polite" aria-atomic="true" className="ev-open-voting__live">
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
          <>
            <div className="ev-open-voting__fields">
              <div ref={pickerRef} className="ev-open-voting__field">
                <DateQuickPicker
                  variant="fromToday"
                  value={date}
                  today={base}
                  presets={presets}
                  locale={locale}
                  label={t('manage.openVoting.dateLabel')}
                  error={dateIssue ? t('manage.dialog.dateNotAfterToday') : undefined}
                  changeLabel={t('manage.dialog.change')}
                  disabled={submitting}
                  onChange={(next) => {
                    setDate(next);
                    setSubmitError(null);
                  }}
                />
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

            <details className="ev-open-voting__advanced" open={advancedOpen}>
              <summary
                className="ev-open-voting__summary-toggle"
                onClick={(event) => {
                  event.preventDefault();
                  setAdvancedOpen((value) => !value);
                }}
              >
                <span className="ev-open-voting__advanced-title">{t('manage.openVoting.advanced')}</span>
                <span className="ev-open-voting__advanced-hint">{t('manage.openVoting.advancedHint')}</span>
              </summary>
              {advancedOpen && (
                <div className="ev-open-voting__advanced-grid">
                  <NumberStepper
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
                    {...stepperLabels(t('manage.openVoting.adjustment'))}
                    value={draft.adjustment_magnitude}
                    min={ADJUSTMENT_MIN}
                    max={ADJUSTMENT_MAX}
                    unit={t('manage.openVoting.adjustmentUnit')}
                    help={t('manage.openVoting.adjustmentHelp')}
                    error={adjustmentError}
                    rangeError={t('manage.openVoting.adjustmentRange')}
                    disabled={submitting}
                    onChange={(value) => updateDraft({ adjustment_magnitude: value })}
                  />
                  <NumberStepper
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
            </details>

            <Callout tone="warning">{t('manage.openVoting.irreversible')}</Callout>
          </>
        )}

        {submitError && <Callout tone="error">{t(submitError)}</Callout>}
      </div>
    </Dialog>
  );
};

const OpenVotingDialog: React.FC<OpenVotingDialogProps> = ({ open, ...rest }) =>
  open ? <OpenVotingContent {...rest} /> : null;

export default OpenVotingDialog;
