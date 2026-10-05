import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Callout, Dialog, NumberStepper, TextField } from '../../ui';
import { ApiError } from '../../../config/api';
import {
  EVENT_CAPACITY_DEFAULT,
  EVENT_CAPACITY_MAX,
  EVENT_DESCRIPTION_MAX,
  EVENT_NAME_MAX,
  EVENT_ORGANIZER_MAX,
  changedEventFields,
  minCapacityFor,
  validateEventForm,
} from '../../../domain';
import type { EventFormValues } from '../../../domain';
import { messageKeyForError, useT } from '../../../i18n';
import type { TranslationKey } from '../../../i18n';
import { EventService } from '../../../services/api';
import type { Event } from '../../../types';
import './EditEventDialog.css';

interface EditEventDialogProps {
  open: boolean;
  event: Event;
  onClose: () => void;
  onSaved: (event: Event) => void;
}

type InputRef = HTMLInputElement | HTMLTextAreaElement;

const initialValues = (event: Event): EventFormValues => ({
  name: event.title,
  description: event.description,
  organizer: event.organizer ?? '',
  maxParticipants: event.max_participants ?? EVENT_CAPACITY_DEFAULT,
});

const EditEventDialog: React.FC<EditEventDialogProps> = ({ open, event, onClose, onSaved }) => {
  const { t } = useT();
  const initial = useMemo(() => initialValues(event), [event]);
  const [values, setValues] = useState<EventFormValues>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const [serverNameError, setServerNameError] = useState<TranslationKey | null>(null);
  const [apiMinCapacity, setApiMinCapacity] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<TranslationKey | null>(null);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const nameRef = useRef<InputRef>(null);
  const descriptionRef = useRef<InputRef>(null);
  const organizerRef = useRef<InputRef>(null);

  // Cada vez que se abre, vuelve a los datos vigentes del evento.
  useEffect(() => {
    if (!open) return;
    setValues(initial);
    setShowErrors(false);
    setServerNameError(null);
    setApiMinCapacity(null);
    setSaveError(null);
    setLocked(false);
    setSaving(false);
    setConfirmDiscard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const registered = event.participant_ids?.length ?? 0;
  const minCapacity = Math.max(minCapacityFor(registered), apiMinCapacity ?? 0);
  const errors = validateEventForm(values, { minCapacity });
  const errorFor = (field: keyof EventFormValues): TranslationKey | undefined =>
    showErrors ? errors[field] : undefined;
  const nameError = serverNameError ?? errorFor('name');
  const capacityError = errorFor('maxParticipants');
  const translate = (key: TranslationKey | undefined): string | undefined =>
    key ? t(key, { count: minCapacity }) : undefined;

  const hasChanges = Object.keys(changedEventFields(initial, values)).length > 0;

  const requestClose = (): void => {
    if (hasChanges) setConfirmDiscard(true);
    else onClose();
  };

  const handleChange = (e: React.ChangeEvent<InputRef>): void => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (name === 'name') setServerNameError(null);
  };

  const handleSave = async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault();
    if (saving || locked) return;
    setSaveError(null);
    const found = validateEventForm(values, { minCapacity });
    if (Object.keys(found).length > 0) {
      setShowErrors(true);
      const first = (['name', 'description', 'organizer'] as const).find((f) => found[f]);
      if (first === 'name') nameRef.current?.focus();
      else if (first === 'description') descriptionRef.current?.focus();
      else if (first === 'organizer') organizerRef.current?.focus();
      return;
    }
    const changes = changedEventFields(initial, values);
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const updated = await EventService.updateEvent(event.id, changes);
      onSaved(updated);
      onClose();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === 'MAX_PARTICIPANTS_BELOW_REGISTERED') {
        const count = err instanceof ApiError ? err.details.current_count : undefined;
        if (typeof count === 'number') setApiMinCapacity(count);
        setShowErrors(true);
      } else if (code === 'DUPLICATE_EVENT_NAME') {
        setServerNameError('errors.DUPLICATE_EVENT_NAME');
        nameRef.current?.focus();
      } else if (code === 'INVALID_UPDATE_STAGE') {
        setLocked(true);
        setSaveError('editEvent.errors.stageLocked');
      } else if (err instanceof TypeError) {
        setSaveError(messageKeyForError(err));
      } else {
        setSaveError('editEvent.errors.generic');
      }
      setSaving(false);
    }
  };

  const capacityHelp = minCapacity > 1
    ? t('eventForm.capacityMin', { count: minCapacity })
    : t('eventForm.capacityRange');

  const actions = confirmDiscard ? (
    <>
      <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>
        {t('editEvent.discard.keep')}
      </Button>
      <Button onClick={onClose}>{t('editEvent.discard.confirm')}</Button>
    </>
  ) : (
    <>
      <Button variant="secondary" disabled={saving} onClick={requestClose}>
        {t('editEvent.cancel')}
      </Button>
      <Button
        disabled={locked}
        loading={saving}
        loadingLabel={t('editEvent.saving')}
        onClick={() => void handleSave()}
      >
        {t('editEvent.save')}
      </Button>
    </>
  );

  return (
    <Dialog
      open={open}
      size="md"
      title={t('editEvent.title')}
      closeLabel={t('editEvent.close')}
      busy={saving}
      onClose={requestClose}
      actions={actions}
    >
      {confirmDiscard ? (
        <Callout tone="warning" title={t('editEvent.discard.title')} />
      ) : (
        <form className="ev-edit-event-dialog__form" onSubmit={handleSave} noValidate>
          <TextField
            ref={nameRef}
            name="name"
            required
            label={t('eventForm.nameLabel')}
            error={translate(nameError)}
            maxLength={EVENT_NAME_MAX}
            value={values.name}
            onChange={handleChange}
          />
          <TextField
            ref={descriptionRef}
            variant="multiline"
            name="description"
            required
            label={t('eventForm.descriptionLabel')}
            error={translate(errorFor('description'))}
            maxLength={EVENT_DESCRIPTION_MAX}
            value={values.description}
            onChange={handleChange}
          />
          <div className="ev-edit-event-dialog__row">
            <div className="ev-edit-event-dialog__organizer">
              <TextField
                ref={organizerRef}
                name="organizer"
                optional
                optionalLabel={t('eventForm.optional')}
                label={t('eventForm.organizerLabel')}
                error={translate(errorFor('organizer'))}
                maxLength={EVENT_ORGANIZER_MAX}
                value={values.organizer}
                onChange={handleChange}
              />
            </div>
            <div className="ev-edit-event-dialog__capacity">
              <NumberStepper
                value={values.maxParticipants}
                min={minCapacity}
                max={EVENT_CAPACITY_MAX}
                label={t('eventForm.capacityLabelShort')}
                help={capacityHelp}
                error={translate(capacityError)}
                rangeError={t('eventForm.validation.capacityRange')}
                decrementLabel={t('eventForm.capacityDecrement')}
                incrementLabel={t('eventForm.capacityIncrement')}
                onChange={(maxParticipants) => setValues((prev) => ({ ...prev, maxParticipants }))}
              />
            </div>
          </div>
          {saveError && <Callout tone="error">{t(saveError)}</Callout>}
        </form>
      )}
    </Dialog>
  );
};

export default EditEventDialog;
