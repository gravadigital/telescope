import type { AppNotification, NotificationType } from '../types';
import { es } from '../i18n/catalogs/es';
import { en } from '../i18n/catalogs/en';
import { translate } from '../i18n/translate';
import type { Locale } from '../i18n/types';
import { formatDate } from './dates';
import { describe as describeNotification, NOTIFICATIONS_POLL_MS, PAGE_LIMIT, PANEL_LIMIT } from './notifications';

const n1: AppNotification = {
  id: 'n-1',
  type: 'stage_changed',
  data: { stage: 'voting', can_vote: true, assigned_count: 3, deadline: '2026-10-20' },
  event: { id: 'e-1', name: 'Cúmulos 2026', stage: 'voting' },
  read_at: null,
  created_at: '2026-10-09T10:00:00Z',
};

const make = (
  overrides: Partial<AppNotification> & { stage?: 'participation' | 'voting' | 'results' | 'creation' }
): AppNotification => {
  const { stage, ...rest } = overrides;
  return { ...n1, ...rest, event: { ...n1.event, stage: stage ?? n1.event.stage } };
};

const text = (locale: Locale, key: Parameters<typeof translate>[2], params?: Record<string, string | number>) =>
  translate(locale === 'es' ? es : en, locale, key, params);

const render = (n: AppNotification, locale: Locale = 'es') => {
  const d = describeNotification(n, locale);
  if (!d) throw new Error('describe devolvió null');
  return {
    d,
    title: text(locale, d.titleKey, d.params),
    body: d.bodyKey ? text(locale, d.bodyKey, d.params) : null,
    action: text(locale, d.actionKey),
    tag: text(locale, d.tagKey),
  };
};

describe('constantes', () => {
  it('valores de la story', () => {
    expect(NOTIFICATIONS_POLL_MS).toBe(60_000);
    expect(PANEL_LIMIT).toBe(10);
    expect(PAGE_LIMIT).toBe(20);
  });
});

describe('describe (domain/notifications)', () => {
  it('TS-7 participación abierta', () => {
    const r = render(
      make({ data: { stage: 'participation', deadline: '2026-10-20' }, stage: 'participation' })
    );
    expect(r.title).toBe('«Cúmulos 2026» abrió la inscripción');
    expect(r.body).toBe('Ya puedes inscribirte y subir tu propuesta.');
    expect(r.action).toBe('Ver evento');
    expect(r.d.route).toBe('/events/e-1');
    expect(r.tag).toBe('Inscripción');
    expect(r.d.isActionable).toBe(true);
  });

  it('TS-8 votación con asignación', () => {
    const r = render(n1);
    expect(r.title).toBe('Ya puedes votar en «Cúmulos 2026»');
    expect(r.body).toBe(
      `Te asignamos 3 propuestas para ordenar. Tienes tiempo hasta el ${formatDate('2026-10-20', 'es')}.`
    );
    expect(r.action).toBe('Ir a votar');
    expect(r.d.route).toBe('/events/e-1');
    expect(r.tag).toBe('Votación');
    expect(r.d.isActionable).toBe(true);
  });

  it('TS-8 plural de la asignación', () => {
    const r = render(make({ data: { stage: 'voting', can_vote: true, assigned_count: 1, deadline: '2026-10-20' } }));
    expect(r.body).toContain('Te asignamos 1 propuesta para ordenar.');
  });

  it('TS-9 votación sin propuesta', () => {
    const r = render(make({ data: { stage: 'voting', can_vote: false, deadline: '2026-10-20' } }));
    expect(r.title).toBe('Empezó la votación en «Cúmulos 2026»');
    expect(r.body).toBe('No participas porque no subiste una propuesta.');
    expect(r.action).toBe('Ver evento');
    expect(r.d.route).toBe('/events/e-1');
    expect(r.d.isActionable).toBe(false);
  });

  it('TS-10 resultados con puesto', () => {
    const r = render(make({ data: { stage: 'results', result_position: 2, result_total: 12 }, stage: 'results' }));
    expect(r.title).toBe('Se publicaron los resultados de «Cúmulos 2026»');
    expect(r.body).toBe('Quedaste en el puesto 2 de 12.');
    expect(r.action).toBe('Ver ranking');
    expect(r.d.route).toBe('/events/e-1');
    expect(r.tag).toBe('Resultados');
    expect(r.d.isActionable).toBe(false);
  });

  it('TS-11 resultados sin puesto', () => {
    const r = render(make({ data: { stage: 'results' }, stage: 'results' }));
    expect(r.body).toBe('Mira el ranking final.');
    expect(r.action).toBe('Ver ranking');
    expect(r.tag).toBe('Resultados');
  });

  it('TS-12 cancelado', () => {
    const r = render(make({ type: 'event_cancelled', data: {} }));
    expect(r.title).toBe('Se canceló «Cúmulos 2026»');
    expect(r.body).toBe('El organizador canceló el evento.');
    expect(r.action).toBe('Ver evento');
    expect(r.d.route).toBe('/events/e-1');
    expect(r.tag).toBe('Mis eventos');
    expect(r.d.isActionable).toBe(false);
  });

  it('TS-13 pausado', () => {
    const r = render(make({ type: 'event_paused', data: {} }));
    expect(r.title).toBe('Se pausó «Cúmulos 2026»');
    expect(r.body).toBe('El organizador pausó el evento por ahora.');
    expect(r.action).toBe('Ver evento');
    expect(r.tag).toBe('Mis eventos');
  });

  it('TS-14 cambio de cierre', () => {
    const voting = render(make({ type: 'deadline_changed', data: { stage: 'voting', new_date: '2026-10-25' } }));
    expect(voting.title).toBe('Cambió el cierre de «Cúmulos 2026»');
    expect(voting.body).toBe(`La votación ahora cierra el ${formatDate('2026-10-25', 'es')}.`);
    expect(voting.action).toBe('Ver evento');
    expect(voting.tag).toBe('Votación');
    const participation = render(
      make({ type: 'deadline_changed', data: { stage: 'participation', new_date: '2026-10-25' } })
    );
    expect(participation.body).toBe(`La inscripción ahora cierra el ${formatDate('2026-10-25', 'es')}.`);
    expect(participation.tag).toBe('Inscripción');
  });

  it('TS-15 inscripciones (plural, sin cuerpo)', () => {
    const one = render(make({ type: 'participant_registered', data: { count: 1 } }));
    expect(one.title).toBe('1 persona se inscribió en «Cúmulos 2026»');
    expect(one.d.bodyKey).toBeNull();
    const many = render(make({ type: 'participant_registered', data: { count: 5 } }));
    expect(many.title).toBe('5 personas se inscribieron en «Cúmulos 2026»');
    expect(many.action).toBe('Ver inscriptos');
    expect(many.d.route).toBe('/events/e-1/manage');
    expect(many.tag).toBe('Inscripción');
  });

  it('TS-16 inscripción confirmada', () => {
    const r = render(make({ type: 'registration_confirmed', data: {}, stage: 'participation' }));
    expect(r.title).toBe('Te inscribiste en «Cúmulos 2026»');
    expect(r.body).toBe('Ya puedes subir tu propuesta.');
    expect(r.action).toBe('Subir archivo');
    expect(r.d.route).toBe('/events/e-1');
    expect(r.d.isActionable).toBe(true);
  });

  it('TS-17 ranking enviado / reemplazado', () => {
    const first = render(make({ type: 'ranking_submitted', data: { replaced: false } }));
    expect(first.title).toBe('Enviaste tu ranking en «Cúmulos 2026»');
    expect(first.body).toBe('Lo puedes modificar hasta que cierre la votación.');
    expect(first.action).toBe('Ver mi ranking');
    expect(first.tag).toBe('Votación');
    const again = render(make({ type: 'ranking_submitted', data: { replaced: true } }));
    expect(again.title).toBe('Actualizaste tu ranking en «Cúmulos 2026»');
    expect(again.body).toBe(first.body);
    expect(again.action).toBe(first.action);
  });

  it('TS-18 recordatorio de archivo', () => {
    const r = render(make({ type: 'file_reminder', data: { deadline: '2026-10-20' }, stage: 'participation' }));
    expect(r.title).toBe('Falta tu archivo en «Cúmulos 2026»');
    expect(r.body).toBe(`La inscripción cierra el ${formatDate('2026-10-20', 'es')}.`);
    expect(r.action).toBe('Subir archivo');
    expect(r.d.route).toBe('/events/e-1');
    expect(r.d.isActionable).toBe(true);
  });

  it('TS-19 recordatorio de voto', () => {
    const r = render(make({ type: 'vote_reminder', data: { deadline: '2026-10-20' }, stage: 'voting' }));
    expect(r.title).toBe('Falta tu ranking en «Cúmulos 2026»');
    expect(r.body).toBe(`La votación cierra el ${formatDate('2026-10-20', 'es')}.`);
    expect(r.action).toBe('Ir a votar');
    expect(r.d.isActionable).toBe(true);
  });

  it('TS-20 dato faltante = sin cuerpo', () => {
    const a = describeNotification(
      make({ type: 'file_reminder', data: { deadline: null }, stage: 'participation' }),
      'es'
    );
    expect(a).not.toBeNull();
    expect(a!.bodyKey).toBeNull();
    expect(a!.titleKey).toBeTruthy();
    expect(a!.actionKey).toBeTruthy();
    const b = describeNotification(make({ data: { stage: 'voting', can_vote: true } }), 'es');
    expect(b).not.toBeNull();
    expect(b!.bodyKey).toBeNull();
    expect(b!.actionKey).toBeTruthy();
  });

  it('TS-21 tipo desconocido', () => {
    expect(describeNotification({ ...n1, type: 'unknown_type' as NotificationType }, 'es')).toBeNull();
  });

  it('TS-22 acción ya no vigente', () => {
    const d = describeNotification(make({ stage: 'results' }), 'es');
    expect(d!.isActionable).toBe(false);
    expect(d!.route).toBe('/events/e-1');
  });

  it('TS-23 inglés', () => {
    const many = render(make({ type: 'participant_registered', data: { count: 5 } }), 'en');
    expect(many.title).toBe('5 people registered for «Cúmulos 2026»');
    const one = render(make({ type: 'participant_registered', data: { count: 1 } }), 'en');
    expect(one.title).toBe('1 person registered for «Cúmulos 2026»');
    const voting = render(n1, 'en');
    expect(voting.title).toBe('Voting is open in «Cúmulos 2026»');
    expect(voting.body).toContain('We assigned you 3 proposals');
  });
});
