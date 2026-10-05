import {
  EMPTY_EVENT_FORM,
  EventFormValues,
  automaticEventDates,
  canEditEvent,
  changedEventFields,
  charCount,
  hasEventFormData,
  minCapacityFor,
  toEventInput,
  validateEventForm,
} from './eventForm';

const valid: EventFormValues = {
  name: 'Concurso de afiches',
  description: 'Diseña el afiche del festival',
  organizer: '',
  maxParticipants: 20,
};

describe('validateEventForm', () => {
  it('acepta un formulario válido (TS-1)', () => {
    expect(validateEventForm(valid)).toEqual({});
  });

  it('valida los límites del nombre recortado (TS-2)', () => {
    expect(validateEventForm({ ...valid, name: '  ab  ' })).toEqual({ name: 'eventForm.validation.nameMin' });
    expect(validateEventForm({ ...valid, name: 'abc' })).toEqual({});
    expect(validateEventForm({ ...valid, name: 'a'.repeat(200) })).toEqual({});
    expect(validateEventForm({ ...valid, name: 'a'.repeat(201) })).toEqual({ name: 'eventForm.validation.nameMax' });
  });

  it('valida los límites de la descripción (TS-3)', () => {
    expect(validateEventForm({ ...valid, description: 'a'.repeat(9) })).toEqual({
      description: 'eventForm.validation.descriptionMin',
    });
    expect(validateEventForm({ ...valid, description: 'a'.repeat(10) })).toEqual({});
    expect(validateEventForm({ ...valid, description: 'a'.repeat(2000) })).toEqual({});
    expect(validateEventForm({ ...valid, description: 'a'.repeat(2001) })).toEqual({
      description: 'eventForm.validation.descriptionMax',
    });
  });

  it('el organizador es opcional y tiene máximo (TS-4)', () => {
    expect(validateEventForm({ ...valid, organizer: '' })).toEqual({});
    expect(validateEventForm({ ...valid, organizer: 'a'.repeat(200) })).toEqual({});
    expect(validateEventForm({ ...valid, organizer: 'a'.repeat(201) })).toEqual({
      organizer: 'eventForm.validation.organizerMax',
    });
  });

  it('cuenta por code points (TS-5)', () => {
    expect(charCount('😀😀😀')).toBe(3);
    expect(validateEventForm({ ...valid, name: '😀😀😀' })).toEqual({});
    expect(validateEventForm({ ...valid, name: '😀'.repeat(200) })).toEqual({});
  });

  it('valida el cupo y el mínimo por inscritos (TS-6)', () => {
    expect(validateEventForm({ ...valid, maxParticipants: 0 })).toEqual({
      maxParticipants: 'eventForm.validation.capacityRange',
    });
    expect(validateEventForm({ ...valid, maxParticipants: 101 })).toEqual({
      maxParticipants: 'eventForm.validation.capacityRange',
    });
    expect(validateEventForm({ ...valid, maxParticipants: 20 })).toEqual({});
    expect(validateEventForm({ ...valid, maxParticipants: 11 }, { minCapacity: 12 })).toEqual({
      maxParticipants: 'eventForm.validation.capacityBelowRegistered',
    });
    expect(validateEventForm({ ...valid, maxParticipants: 12 }, { minCapacity: 12 })).toEqual({});
  });

  it('valida solo los campos pedidos (TS-7)', () => {
    expect(
      validateEventForm(
        { name: 'a', description: '', organizer: '', maxParticipants: 0 },
        { fields: ['maxParticipants'] }
      )
    ).toEqual({ maxParticipants: 'eventForm.validation.capacityRange' });
  });
});

describe('changedEventFields / hasEventFormData', () => {
  const initial: EventFormValues = {
    name: 'Afiches',
    description: 'Diseña el afiche',
    organizer: 'Club',
    maxParticipants: 20,
  };

  it('devuelve solo lo cambiado, recortado (TS-8)', () => {
    expect(
      changedEventFields(initial, {
        name: ' Afiches ',
        description: 'Diseña el afiche',
        organizer: 'Club de Diseño',
        maxParticipants: 15,
      })
    ).toEqual({ organizer: 'Club de Diseño', max_participants: 15 });
  });

  it('sin cambios devuelve {} (TS-9)', () => {
    expect(changedEventFields(initial, { ...initial })).toEqual({});
  });

  it('detecta datos cargados (TS-10)', () => {
    expect(hasEventFormData(EMPTY_EVENT_FORM)).toBe(false);
    expect(hasEventFormData({ ...EMPTY_EVENT_FORM, name: '   ' })).toBe(false);
    expect(hasEventFormData({ ...EMPTY_EVENT_FORM, organizer: 'x' })).toBe(true);
    expect(hasEventFormData({ ...EMPTY_EVENT_FORM, maxParticipants: 21 })).toBe(true);
  });
});

describe('toEventInput / automaticEventDates / etapas', () => {
  it('arma la entrada para crear (TS-11)', () => {
    expect(
      toEventInput({ name: ' Afiches ', description: ' Diseña el afiche ', organizer: '  ', maxParticipants: 30 })
    ).toEqual({ name: 'Afiches', description: 'Diseña el afiche', organizer: '', max_participants: 30 });
  });

  it('la fecha automática usa el calendario local (TS-12)', () => {
    expect(automaticEventDates(new Date(2026, 9, 5, 23, 30))).toEqual({
      start_date: '2026-10-06',
      end_date: '2026-10-07',
    });
  });

  it('etapas editables y mínimo de cupo (TS-13)', () => {
    expect(canEditEvent('creation')).toBe(true);
    expect(canEditEvent('participation')).toBe(true);
    expect(canEditEvent('voting')).toBe(false);
    expect(canEditEvent('results')).toBe(false);
    expect(minCapacityFor(0)).toBe(1);
    expect(minCapacityFor(12)).toBe(12);
  });
});
