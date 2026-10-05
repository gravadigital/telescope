import fs from 'fs';
import path from 'path';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateEventPage from './CreateEventPage';
import { renderWithProviders, sampleUser } from '../../test-utils/renderWithProviders';
import { ApiError } from '../../config/api';
import { EventService } from '../../services/api';

jest.mock('../../context/AuthContext');
jest.mock('../../services/api');

const createEvent = EventService.createEvent as jest.Mock;
const auth = { user: sampleUser, isAuthenticated: true, loading: false };
const apiErr = (status: number, code: string) =>
  new ApiError({ status, body: { error: 'x', code } });

const renderPage = (locale: 'es' | 'en' = 'es') =>
  renderWithProviders(<CreateEventPage />, { auth, route: '/events/create', locale });

const nameField = () => screen.getByLabelText(/^Nombre del evento/) as HTMLInputElement;
const descField = () => screen.getByLabelText(/^Descripción/) as HTMLTextAreaElement;
const organizerField = () => screen.getByLabelText(/^Organizador/) as HTMLInputElement;
const next = (name: RegExp | string) => userEvent.click(screen.getByRole('button', { name }));

const fillStep1 = (organizer = '') => {
  userEvent.type(nameField(), 'Concurso de afiches');
  userEvent.type(descField(), 'Diseña el afiche del festival');
  if (organizer) userEvent.type(organizerField(), organizer);
};

const goToStep3 = (organizer = 'Club de Diseño') => {
  fillStep1(organizer);
  next('Siguiente: Cupo →');
  userEvent.click(screen.getByRole('button', { name: 'Sumar uno al cupo' }));
  userEvent.click(screen.getByRole('button', { name: 'Sumar uno al cupo' }));
  next('Siguiente: Revisar →');
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CreateEventPage — render y validación', () => {
  it('TS-22: render inicial', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Crear evento' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute('href', '/events');
    const stepsNav = screen.getByRole('navigation', { name: 'Pasos del asistente' });
    ['Identificación', 'Cupo', 'Revisar y crear'].forEach((name) =>
      expect(within(stepsNav).getByText(new RegExp(name))).toBeInTheDocument()
    );
    const current = document.querySelector('[aria-current="step"]') as HTMLElement;
    expect(current).toHaveTextContent('Identificación');
    expect(screen.getAllByText('Paso 1 de 3').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 2, name: '¿De qué se trata tu evento?' })).toBeInTheDocument();
    expect(nameField()).toBeInTheDocument();
    expect(descField()).toBeInTheDocument();
    expect(organizerField()).toBeInTheDocument();
    expect(screen.getByText('Vista previa en la lista')).toBeInTheDocument();
    expect(screen.getByText('Consejo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente: Cupo →' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '← Atrás' })).toBeNull();
    expect(screen.queryByLabelText(/fecha/i)).toBeNull();
  });

  it('TS-23: avanzar con datos inválidos muestra errores y enfoca el primero', () => {
    renderPage();
    userEvent.type(nameField(), 'ab');
    userEvent.type(descField(), 'corta');
    next('Siguiente: Cupo →');
    const nameMsg = screen.getByText('El nombre tiene que tener al menos 3 caracteres.');
    const descMsg = screen.getByText('La descripción tiene que tener al menos 10 caracteres.');
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(nameField().getAttribute('aria-describedby')).toContain(nameMsg.id);
    expect(descField()).toHaveAttribute('aria-invalid', 'true');
    expect(descField().getAttribute('aria-describedby')).toContain(descMsg.id);
    expect(nameField()).toHaveFocus();
    expect(screen.getByRole('heading', { level: 2, name: '¿De qué se trata tu evento?' })).toBeInTheDocument();
  });

  it('TS-24: el error se recalcula al corregir', () => {
    renderPage();
    userEvent.type(nameField(), 'ab');
    userEvent.type(descField(), 'corta');
    next('Siguiente: Cupo →');
    userEvent.type(nameField(), 'c');
    expect(screen.queryByText('El nombre tiene que tener al menos 3 caracteres.')).toBeNull();
    expect(screen.getByText('La descripción tiene que tener al menos 10 caracteres.')).toBeInTheDocument();
  });

  it('TS-25: organizador demasiado largo', () => {
    renderPage();
    fillStep1();
    fireEvent.change(organizerField(), { target: { value: 'a'.repeat(201) } });
    next('Siguiente: Cupo →');
    expect(screen.getByText('Puede tener hasta 200 caracteres.')).toBeInTheDocument();
    expect(organizerField()).toHaveFocus();
    expect(screen.getByRole('heading', { level: 2, name: '¿De qué se trata tu evento?' })).toBeInTheDocument();
  });
});

describe('CreateEventPage — pasos', () => {
  it('TS-26: avanzar al paso 2', () => {
    renderPage();
    fillStep1();
    next('Siguiente: Cupo →');
    const h2 = screen.getByRole('heading', { level: 2, name: '¿Cuántas personas pueden participar?' });
    expect(h2).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Paso 2 de 3, Cupo');
    expect(screen.getByRole('spinbutton', { name: /Cupo de participantes/ })).toHaveValue(20);
    expect(screen.getByText('Entre 1 y 100')).toBeInTheDocument();
    expect(screen.getByText(/Cuando se completa el cupo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Atrás' })).toBeInTheDocument();
    expect(screen.queryByText('Consejo')).toBeNull();
  });

  it('TS-27: límites del cupo', () => {
    renderPage();
    fillStep1();
    next('Siguiente: Cupo →');
    const spin = screen.getByRole('spinbutton', { name: /Cupo de participantes/ });
    fireEvent.change(spin, { target: { value: '1' } });
    expect(screen.getByRole('button', { name: 'Restar uno al cupo' })).toBeDisabled();
    fireEvent.change(spin, { target: { value: '100' } });
    expect(screen.getByRole('button', { name: 'Sumar uno al cupo' })).toBeDisabled();
  });

  it('TS-28: la vista previa refleja los datos', () => {
    renderPage();
    fillStep1();
    next('Siguiente: Cupo →');
    userEvent.click(screen.getByRole('button', { name: 'Sumar uno al cupo' }));
    userEvent.click(screen.getByRole('button', { name: 'Sumar uno al cupo' }));
    expect(screen.getByText('por Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('0 / 22')).toBeInTheDocument();
    expect(screen.getAllByText('Concurso de afiches').length).toBeGreaterThan(0);
  });

  it('TS-29: resumen', () => {
    renderPage();
    goToStep3();
    expect(screen.getByRole('heading', { level: 2, name: 'Revisa y crea tu evento' })).toBeInTheDocument();
    expect(screen.getAllByText('Concurso de afiches').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Diseña el afiche del festival').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Club de Diseño').length).toBeGreaterThan(0);
    expect(screen.getByText('22 participantes')).toBeInTheDocument();
    ['nombre', 'descripción', 'organizador', 'cupo'].forEach((f) =>
      expect(screen.getByRole('button', { name: `Editar ${f}` })).toBeInTheDocument()
    );
    expect(screen.getByText(/El evento se crea en etapa Creación: nadie más puede verlo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear evento' })).toBeInTheDocument();
  });

  it('TS-30: organizador vacío en el resumen', () => {
    renderPage();
    goToStep3('');
    expect(screen.getByText('Ana Pérez (tu nombre)')).toBeInTheDocument();
  });
});

describe('CreateEventPage — crear', () => {
  it('TS-31: crea el evento y navega a la gestión', async () => {
    createEvent.mockResolvedValue({ id: 'e-9' });
    renderPage();
    goToStep3();
    next('Crear evento');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/events/e-9/manage'));
    expect(createEvent).toHaveBeenCalledWith({
      name: 'Concurso de afiches',
      description: 'Diseña el afiche del festival',
      organizer: 'Club de Diseño',
      max_participants: 22,
    });
    expect(JSON.parse(screen.getByTestId('location-state').textContent ?? 'null')).toEqual({
      notice: 'eventCreated',
    });
  });

  it('TS-32: cargando', () => {
    createEvent.mockReturnValue(new Promise(() => undefined));
    renderPage();
    goToStep3();
    next('Crear evento');
    const busy = screen.getByRole('button', { name: 'Creando evento…' });
    expect(busy).toBeDisabled();
    expect(screen.getByRole('button', { name: '← Atrás' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    userEvent.click(busy);
    expect(createEvent).toHaveBeenCalledTimes(1);
  });

  it('TS-39: nombre duplicado vuelve al paso 1', async () => {
    createEvent.mockRejectedValue(apiErr(409, 'DUPLICATE_EVENT_NAME'));
    renderPage();
    goToStep3();
    next('Crear evento');
    expect(await screen.findByText('Ya existe un evento con este nombre. Elige otro.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '¿De qué se trata tu evento?' })).toBeInTheDocument();
    expect(nameField()).toHaveFocus();
    expect(descField()).toHaveValue('Diseña el afiche del festival');
    expect(organizerField()).toHaveValue('Club de Diseño');
    userEvent.type(nameField(), '2');
    expect(screen.queryByText('Ya existe un evento con este nombre. Elige otro.')).toBeNull();
  });

  it('TS-40: error de payload traducido', async () => {
    createEvent.mockRejectedValue(apiErr(400, 'INVALID_PAYLOAD'));
    renderPage();
    goToStep3();
    next('Crear evento');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Los datos enviados no son válidos. Revísalos e inténtalo de nuevo.');
    expect(screen.getByText('22 participantes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear evento' })).toBeEnabled();
  });

  it('TS-41: sin conexión', async () => {
    createEvent.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPage();
    goToStep3();
    next('Crear evento');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
    );
  });

  it('TS-42: código no contemplado', async () => {
    createEvent.mockRejectedValue(apiErr(400, 'PAST_START_DATE'));
    renderPage();
    goToStep3();
    next('Crear evento');
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos crear el evento. Inténtalo de nuevo.');
    expect(screen.queryByText('x')).toBeNull();
  });
});

describe('CreateEventPage — volver y cancelar', () => {
  it('TS-33: volver con "Atrás"', () => {
    renderPage();
    goToStep3();
    next('← Atrás');
    expect(screen.getByRole('spinbutton', { name: /Cupo de participantes/ })).toHaveValue(22);
    next('← Atrás');
    expect(nameField()).toHaveValue('Concurso de afiches');
    expect(descField()).toHaveValue('Diseña el afiche del festival');
    expect(organizerField()).toHaveValue('Club de Diseño');
  });

  it('TS-34: volver por el indicador', () => {
    renderPage();
    goToStep3();
    next('Identificación, completado');
    expect(nameField()).toHaveValue('Concurso de afiches');
    expect(screen.getByRole('heading', { level: 2, name: '¿De qué se trata tu evento?' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Revisar y crear, completado' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Revisar y crear/ })).toBeNull();
  });

  it('TS-35: volver por "Editar"', () => {
    renderPage();
    goToStep3();
    next('Editar cupo');
    expect(screen.getByRole('spinbutton', { name: /Cupo de participantes/ })).toHaveValue(22);
  });

  it('TS-36: cancelar sin datos', () => {
    renderPage();
    next('Cancelar');
    expect(screen.getByTestId('location')).toHaveTextContent('/events');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('TS-37: cancelar con datos y seguir', () => {
    renderPage();
    userEvent.type(nameField(), 'Afi');
    next('Cancelar');
    const dialog = screen.getByRole('alertdialog', { name: '¿Descartar el evento?' });
    expect(dialog).toHaveTextContent('Se perderá lo que cargaste.');
    expect(screen.getByRole('button', { name: 'Seguir editando' })).toHaveFocus();
    userEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByTestId('location')).toHaveTextContent('/events/create');
    expect(nameField()).toHaveValue('Afi');
  });

  it('TS-38: cancelar con datos y descartar', () => {
    renderPage();
    userEvent.type(nameField(), 'Afi');
    next('Cancelar');
    userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/events$/);
  });
});

describe('CreateEventPage — idioma, responsive y reemplazo', () => {
  it('TS-43: inglés', () => {
    renderPage('en');
    expect(screen.getByRole('heading', { level: 1, name: 'Create event' })).toBeInTheDocument();
    expect(screen.getAllByText('Step 1 of 3').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Next: Limit →' })).toBeInTheDocument();
  });

  it('TS-60: mobile · presencia en el DOM', () => {
    const { container } = renderPage();
    const steps = screen.getAllByText('Paso 1 de 3');
    expect(steps.length).toBe(2);
    const eyebrow = container.querySelector('.cev-eyebrow') as HTMLElement;
    expect(eyebrow).toHaveTextContent('Paso 1 de 3');
    const preview = screen.getByText('Vista previa en la lista');
    expect(
      nameField().compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('TS-63: CSS viejo borrado y sin err.message ni console.log', () => {
    const css = fs.readFileSync(path.join(__dirname, 'CreateEventPage.css'), 'utf-8');
    const tsx = fs.readFileSync(path.join(__dirname, 'CreateEventPage.tsx'), 'utf-8');
    expect(css).not.toMatch(/\.create-event-|\.form-group|\.btn/);
    expect(tsx).not.toContain('err.message');
    expect(tsx).not.toContain('console.log');
  });
});
