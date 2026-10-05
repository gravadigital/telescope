import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EventPreview from '../../components/events/event-preview/EventPreview';
import { Button, Callout, Dialog, NumberStepper, TextField } from '../../components/ui';
import { CheckIcon } from '../../components/ui/icons/Icons';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../config/api';
import {
  EMPTY_EVENT_FORM,
  EVENT_CAPACITY_MAX,
  EVENT_CAPACITY_MIN,
  EVENT_DESCRIPTION_MAX,
  EVENT_NAME_MAX,
  EVENT_ORGANIZER_MAX,
  hasEventFormData,
  toEventInput,
  validateEventForm,
} from '../../domain';
import type { EventFormField, EventFormValues, FieldErrors } from '../../domain';
import { scopedMessageKeyForError, useT } from '../../i18n';
import type { TranslationKey } from '../../i18n';
import { EventService } from '../../services/api';
import './CreateEventPage.css';

type Step = 1 | 2 | 3;
type InputRef = HTMLInputElement | HTMLTextAreaElement;
type TextField3 = 'name' | 'description' | 'organizer';

const STEPS: readonly Step[] = [1, 2, 3];
const STEP_FIELDS: Record<1 | 2, readonly EventFormField[]> = {
  1: ['name', 'description', 'organizer'],
  2: ['maxParticipants'],
};
const FIELD_ORDER: readonly TextField3[] = ['name', 'description', 'organizer'];
const CREATE_EVENT_ERROR_CODES = [
  'INVALID_PAYLOAD',
  'INVALID_MAX_PARTICIPANTS',
  'MAX_PARTICIPANTS_LIMIT_EXCEEDED',
] as const;

const STEP_NAME_KEY: Record<Step, TranslationKey> = {
  1: 'createEvent.steps.identification',
  2: 'createEvent.steps.capacity',
  3: 'createEvent.steps.review',
};
const STEP_QUESTION_KEY: Record<Step, TranslationKey> = {
  1: 'createEvent.questions.identification',
  2: 'createEvent.questions.capacity',
  3: 'createEvent.questions.review',
};
const NEXT_LABEL_KEY: Record<Step, TranslationKey> = {
  1: 'createEvent.nextCapacity',
  2: 'createEvent.nextReview',
  3: 'createEvent.submit',
};

const CreateEventPage: React.FC = () => {
  const { t, locale } = useT();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [values, setValues] = useState<EventFormValues>(EMPTY_EVENT_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [serverNameError, setServerNameError] = useState<TranslationKey | null>(null);
  const [submitError, setSubmitError] = useState<TranslationKey | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const discardTextId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const firstRender = useRef(true);
  const focusNameOnStep = useRef(false);
  const fieldRefs: Record<TextField3, React.RefObject<InputRef | null>> = {
    name: useRef<InputRef>(null),
    description: useRef<InputRef>(null),
    organizer: useRef<InputRef>(null),
  };

  // Al cambiar de paso el foco va al h2 (no corre en el montaje inicial).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (focusNameOnStep.current) {
      focusNameOnStep.current = false;
      fieldRefs.name.current?.focus();
    } else {
      headingRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const stepErrors: FieldErrors<EventFormField> =
    step === 3 ? {} : validateEventForm(values, { fields: STEP_FIELDS[step] });
  const errorFor = (field: EventFormField): TranslationKey | undefined =>
    showErrors ? stepErrors[field] : undefined;
  const nameError = serverNameError ?? errorFor('name');
  const translate = (key: TranslationKey | undefined): string | undefined =>
    key ? t(key) : undefined;

  const goTo = (target: Step): void => {
    setShowErrors(false);
    setSubmitError(null);
    setStep(target);
  };

  const handleChange = (e: React.ChangeEvent<InputRef>): void => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (name === 'name') setServerNameError(null);
  };

  const handleCapacity = (maxParticipants: number): void =>
    setValues((prev) => ({ ...prev, maxParticipants }));

  const create = async (): Promise<void> => {
    if (creating) return;
    setCreating(true);
    setSubmitError(null);
    try {
      const { id } = await EventService.createEvent(toEventInput(values));
      navigate(`/events/${id}/manage`, { state: { notice: 'eventCreated' } });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_EVENT_NAME') {
        setServerNameError('errors.DUPLICATE_EVENT_NAME');
        focusNameOnStep.current = true;
        goTo(1);
      } else {
        setSubmitError(
          scopedMessageKeyForError(err, CREATE_EVENT_ERROR_CODES, 'createEvent.errors.generic')
        );
      }
      setCreating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (step === 3) {
      void create();
      return;
    }
    const errors = validateEventForm(values, { fields: STEP_FIELDS[step] });
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
      if (firstInvalid) fieldRefs[firstInvalid].current?.focus();
      return;
    }
    goTo((step + 1) as Step);
  };

  const handleCancel = (): void => {
    if (hasEventFormData(values)) setConfirmDiscard(true);
    else navigate('/events');
  };

  const capacityHelp = t('eventForm.capacityRange');
  const summary: Array<{ field: string; label: string; value: string; target: Step }> = [
    { field: 'name', label: t('createEvent.review.name'), value: values.name.trim(), target: 1 },
    {
      field: 'description',
      label: t('createEvent.review.description'),
      value: values.description.trim(),
      target: 1,
    },
    {
      field: 'organizer',
      label: t('createEvent.review.organizer'),
      value:
        values.organizer.trim() ||
        t('createEvent.review.organizerFallback', { name: user?.name ?? '' }),
      target: 1,
    },
    {
      field: 'capacity',
      label: t('createEvent.review.capacity'),
      value: t('createEvent.review.capacityValue', { count: values.maxParticipants }),
      target: 2,
    },
  ];

  return (
    <div className="cev-page">
      <nav className="cev-breadcrumb" aria-label={t('createEvent.breadcrumbLabel')}>
        <ol className="cev-breadcrumb__list">
          <li>
            <Link to="/events">{t('createEvent.breadcrumbEvents')}</Link>
          </li>
          <li className="cev-breadcrumb__sep" aria-hidden="true">
            /
          </li>
          <li aria-current="page">{t('createEvent.title')}</li>
        </ol>
      </nav>

      <h1 className="cev-title">{t('createEvent.title')}</h1>

      <nav className="cev-steps" aria-label={t('createEvent.stepsLabel')}>
        <ol className="cev-steps__list">
          {STEPS.map((n) => {
            const name = t(STEP_NAME_KEY[n]);
            if (n < step) {
              return (
                <li key={n} className="cev-steps__item cev-steps__item--done">
                  <button
                    type="button"
                    className="cev-steps__button"
                    aria-label={t('createEvent.stepCompleted', { name })}
                    disabled={creating}
                    onClick={() => goTo(n)}
                  >
                    <span className="cev-steps__marker" aria-hidden="true">
                      <CheckIcon className="cev-steps__check" />
                    </span>
                    <span className="cev-steps__label">{name}</span>
                  </button>
                </li>
              );
            }
            const current = n === step;
            return (
              <li
                key={n}
                className={`cev-steps__item${current ? ' cev-steps__item--current' : ''}`}
                aria-current={current ? 'step' : undefined}
              >
                <span className="cev-steps__marker" aria-hidden="true">
                  {n}
                </span>
                <span className="cev-steps__text">
                  <span className="cev-steps__label">{name}</span>
                  {current && <span className="cev-steps__state">{t('createEvent.stepCurrent')}</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="cev-steps__compact" aria-hidden="true">
          <div className="cev-steps__bar">
            {STEPS.map((n) => (
              <span
                key={n}
                className={`cev-steps__segment${n <= step ? ' cev-steps__segment--on' : ''}`}
              />
            ))}
          </div>
          <span className="cev-steps__compact-text">{t('createEvent.stepOf', { number: step })}</span>
        </div>
      </nav>

      <div className="cev-sr-only" role="status">
        {t('createEvent.stepAnnouncement', { number: step, name: t(STEP_NAME_KEY[step]) })}
      </div>

      <form className="cev-form" onSubmit={handleSubmit} noValidate>
        <div className="cev-wizard">
          <div className="cev-main">
            <p className="cev-eyebrow">{t('createEvent.stepOf', { number: step })}</p>
            <h2 className="cev-question" ref={headingRef} tabIndex={-1}>
              {t(STEP_QUESTION_KEY[step])}
            </h2>

            {step === 1 && (
              <div className="cev-fields">
                <TextField
                  ref={fieldRefs.name}
                  name="name"
                  required
                  label={t('eventForm.nameLabel')}
                  placeholder={t('eventForm.namePlaceholder')}
                  help={t('eventForm.nameHelp')}
                  error={translate(nameError)}
                  maxLength={EVENT_NAME_MAX}
                  value={values.name}
                  onChange={handleChange}
                />
                <TextField
                  ref={fieldRefs.description}
                  variant="multiline"
                  name="description"
                  required
                  label={t('eventForm.descriptionLabel')}
                  help={t('eventForm.descriptionHelp')}
                  error={translate(errorFor('description'))}
                  maxLength={EVENT_DESCRIPTION_MAX}
                  value={values.description}
                  onChange={handleChange}
                />
                <TextField
                  ref={fieldRefs.organizer}
                  name="organizer"
                  optional
                  optionalLabel={t('eventForm.optional')}
                  label={t('eventForm.organizerLabel')}
                  placeholder={t('eventForm.organizerPlaceholder')}
                  help={t('eventForm.organizerHelp')}
                  error={translate(errorFor('organizer'))}
                  maxLength={EVENT_ORGANIZER_MAX}
                  value={values.organizer}
                  onChange={handleChange}
                />
              </div>
            )}

            {step === 2 && (
              <div className="cev-fields">
                <NumberStepper
                  value={values.maxParticipants}
                  min={EVENT_CAPACITY_MIN}
                  max={EVENT_CAPACITY_MAX}
                  label={t('eventForm.capacityLabel')}
                  help={capacityHelp}
                  rangeError={t('eventForm.validation.capacityRange')}
                  decrementLabel={t('eventForm.capacityDecrement')}
                  incrementLabel={t('eventForm.capacityIncrement')}
                  onChange={handleCapacity}
                />
                <p className="cev-hint">{t('createEvent.capacityHelp')}</p>
              </div>
            )}

            {step === 3 && (
              <div className="cev-fields">
                <dl className="cev-summary">
                  {summary.map((row) => (
                    <div key={row.field} className="cev-summary__row">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                      <Button
                        variant="tertiary"
                        size="sm"
                        disabled={creating}
                        aria-label={t('createEvent.review.editField', {
                          field: row.label.toLocaleLowerCase(locale),
                        })}
                        onClick={() => goTo(row.target)}
                      >
                        {t('createEvent.review.edit')}
                      </Button>
                    </div>
                  ))}
                </dl>
                <Callout tone="info">{t('createEvent.visibilityNotice')}</Callout>
                {submitError && <Callout tone="error">{t(submitError)}</Callout>}
              </div>
            )}
          </div>

          <aside className="cev-aside">
            <p className="cev-aside__title">{t('createEvent.preview.title')}</p>
            <EventPreview
              name={values.name}
              description={values.description}
              organizer={values.organizer}
              capacity={values.maxParticipants}
              fallbackOrganizer={user?.name ?? ''}
            />
            {step === 1 && (
              <Callout tone="info" title={t('createEvent.tipTitle')}>
                {t('createEvent.tip')}
              </Callout>
            )}
          </aside>
        </div>

        <div className="cev-actions">
          <div className="cev-actions__cancel">
            <Button variant="tertiary" disabled={creating} onClick={handleCancel}>
              {t('createEvent.cancel')}
            </Button>
          </div>
          {step > 1 && (
            <div className="cev-actions__back">
              <Button
                variant="secondary"
                fullWidth
                disabled={creating}
                onClick={() => goTo((step - 1) as Step)}
              >
                {t('createEvent.back')}
              </Button>
            </div>
          )}
          <div className={`cev-actions__next${step === 1 ? ' cev-actions__next--alone' : ''}`}>
            <Button
              type="submit"
              fullWidth
              loading={creating}
              loadingLabel={t('createEvent.submitting')}
            >
              {t(NEXT_LABEL_KEY[step])}
            </Button>
          </div>
        </div>
      </form>

      <Dialog
        open={confirmDiscard}
        variant="alert"
        size="sm"
        title={t('createEvent.discard.title')}
        closeLabel={t('createEvent.discard.close')}
        describedBy={discardTextId}
        initialFocusRef={keepEditingRef}
        onClose={() => setConfirmDiscard(false)}
        actions={
          <>
            <Button ref={keepEditingRef} variant="secondary" onClick={() => setConfirmDiscard(false)}>
              {t('createEvent.discard.keep')}
            </Button>
            <Button onClick={() => navigate('/events')}>{t('createEvent.discard.confirm')}</Button>
          </>
        }
      >
        <p id={discardTextId}>{t('createEvent.discard.text')}</p>
      </Dialog>
    </div>
  );
};

export default CreateEventPage;
