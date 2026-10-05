import { screen } from '@testing-library/react';
import EventPreview from './EventPreview';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';

const base = {
  name: 'Concurso de afiches',
  description: 'Diseña el afiche del festival',
  organizer: 'Club de Diseño',
  capacity: 20,
  fallbackOrganizer: 'Ana Pérez',
};

describe('EventPreview', () => {
  it('TS-19: muestra los datos y no es interactiva', () => {
    const { container } = renderWithProviders(<EventPreview {...base} />);
    expect(screen.getByText('Inscripción abierta')).toBeInTheDocument();
    expect(screen.getByText('Concurso de afiches')).toBeInTheDocument();
    expect(screen.getByText('Diseña el afiche del festival')).toBeInTheDocument();
    expect(screen.getByText('por Club de Diseño')).toBeInTheDocument();
    expect(screen.getByText('0 / 20')).toBeInTheDocument();
    expect((container.firstElementChild as HTMLElement).getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('button, a')).toBeNull();
  });

  it('TS-20: campos vacíos usan placeholders y el nombre del usuario', () => {
    renderWithProviders(
      <EventPreview {...base} name="" description="" organizer="  " capacity={35} />
    );
    expect(screen.getByText('Nombre del evento')).toBeInTheDocument();
    expect(screen.getByText('La descripción aparecerá aquí.')).toBeInTheDocument();
    expect(screen.getByText('por Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('0 / 35')).toBeInTheDocument();
  });

  it('TS-21: inglés', () => {
    renderWithProviders(<EventPreview {...base} />, { locale: 'en' });
    expect(screen.getByText('Registration open')).toBeInTheDocument();
    expect(screen.getByText('by Club de Diseño')).toBeInTheDocument();
    expect(screen.getByText('0 / 20')).toBeInTheDocument();
  });
});
