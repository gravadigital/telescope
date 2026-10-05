import type { EventCreateInput, EventStage, EventUpdate } from '../types';
import type { TranslationKey } from '../i18n/types';
import type { FieldErrors } from './auth';
import { addDays, todayISO } from './dates';

export const EVENT_NAME_MIN = 3;
export const EVENT_NAME_MAX = 200;
export const EVENT_DESCRIPTION_MIN = 10;
export const EVENT_DESCRIPTION_MAX = 2000;
export const EVENT_ORGANIZER_MAX = 200;
export const EVENT_CAPACITY_MIN = 1;
export const EVENT_CAPACITY_MAX = 100;
export const EVENT_CAPACITY_DEFAULT = 20;

export interface EventFormValues {
  name: string;
  description: string;
  organizer: string;
  maxParticipants: number;
}

export type EventFormField = keyof EventFormValues;

export const EVENT_FORM_FIELDS: readonly EventFormField[] = [
  'name',
  'description',
  'organizer',
  'maxParticipants',
];

export const EMPTY_EVENT_FORM: EventFormValues = {
  name: '',
  description: '',
  organizer: '',
  maxParticipants: EVENT_CAPACITY_DEFAULT,
};

/** El backend cuenta runas: se cuentan code points, no unidades UTF-16. */
export const charCount = (value: string): number => Array.from(value).length;

export const minCapacityFor = (registered: number): number =>
  Math.max(EVENT_CAPACITY_MIN, registered);

export const canEditEvent = (stage: EventStage): boolean =>
  stage === 'creation' || stage === 'participation';

const compact = <K extends string>(errors: FieldErrors<K>): FieldErrors<K> =>
  Object.fromEntries(Object.entries(errors).filter(([, v]) => v !== undefined)) as FieldErrors<K>;

const nameError = (value: string): TranslationKey | undefined => {
  const count = charCount(value.trim());
  if (count < EVENT_NAME_MIN) return 'eventForm.validation.nameMin';
  if (count > EVENT_NAME_MAX) return 'eventForm.validation.nameMax';
  return undefined;
};

const descriptionError = (value: string): TranslationKey | undefined => {
  const count = charCount(value.trim());
  if (count < EVENT_DESCRIPTION_MIN) return 'eventForm.validation.descriptionMin';
  if (count > EVENT_DESCRIPTION_MAX) return 'eventForm.validation.descriptionMax';
  return undefined;
};

const organizerError = (value: string): TranslationKey | undefined =>
  charCount(value.trim()) > EVENT_ORGANIZER_MAX ? 'eventForm.validation.organizerMax' : undefined;

const capacityError = (value: number, minCapacity: number): TranslationKey | undefined => {
  if (!Number.isInteger(value) || value < EVENT_CAPACITY_MIN || value > EVENT_CAPACITY_MAX) {
    return 'eventForm.validation.capacityRange';
  }
  if (value < minCapacity) {
    return minCapacity > EVENT_CAPACITY_MIN
      ? 'eventForm.validation.capacityBelowRegistered'
      : 'eventForm.validation.capacityRange';
  }
  return undefined;
};

export const validateEventForm = (
  values: EventFormValues,
  options: { minCapacity?: number; fields?: readonly EventFormField[] } = {}
): FieldErrors<EventFormField> => {
  const { minCapacity = EVENT_CAPACITY_MIN, fields = EVENT_FORM_FIELDS } = options;
  const all: FieldErrors<EventFormField> = {
    name: nameError(values.name),
    description: descriptionError(values.description),
    organizer: organizerError(values.organizer),
    maxParticipants: capacityError(values.maxParticipants, minCapacity),
  };
  return compact(
    Object.fromEntries(fields.map((field) => [field, all[field]])) as FieldErrors<EventFormField>
  );
};

export const toEventInput = (values: EventFormValues): EventCreateInput => ({
  name: values.name.trim(),
  description: values.description.trim(),
  organizer: values.organizer.trim(),
  max_participants: values.maxParticipants,
});

export const changedEventFields = (
  initial: EventFormValues,
  values: EventFormValues
): EventUpdate => {
  const changes: EventUpdate = {};
  if (values.name.trim() !== initial.name.trim()) changes.name = values.name.trim();
  if (values.description.trim() !== initial.description.trim()) {
    changes.description = values.description.trim();
  }
  if (values.organizer.trim() !== initial.organizer.trim()) {
    changes.organizer = values.organizer.trim();
  }
  if (values.maxParticipants !== initial.maxParticipants) {
    changes.max_participants = values.maxParticipants;
  }
  return changes;
};

export const hasEventFormData = (values: EventFormValues): boolean =>
  values.name.trim() !== '' ||
  values.description.trim() !== '' ||
  values.organizer.trim() !== '' ||
  values.maxParticipants !== EVENT_CAPACITY_DEFAULT;

/** Fecha automática: inicio mañana y cierre pasado mañana, en calendario local. */
export const automaticEventDates = (
  now: Date = new Date()
): { start_date: string; end_date: string } => {
  const today = todayISO(now);
  return { start_date: addDays(today, 1), end_date: addDays(today, 2) };
};
