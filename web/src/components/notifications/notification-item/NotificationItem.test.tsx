import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationItem from './NotificationItem';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { n1, n3 } from '../../../test-utils/notificationFixtures';
import type { AppNotification } from '../../../types';

const NOW = new Date('2026-10-09T12:00:00Z');

describe('NotificationItem', () => {
  it('TS-34 ítem no leído en el panel', () => {
    const onActivate = jest.fn();
    renderWithProviders(
      <ul>
        <NotificationItem notification={n1} variant="panel" onActivate={onActivate} now={NOW} />
      </ul>
    );
    const item = screen.getByRole('button', { name: /Ya puedes votar en «Cúmulos 2026»/ });
    expect(item).toHaveTextContent('No leída');
    expect(item).toHaveTextContent('Ir a votar →');
    expect(item).toHaveTextContent('hace 2 horas');
    const row = screen.getByText('Ya puedes votar en «Cúmulos 2026»').closest('li') as HTMLElement;
    expect(row).toHaveClass('nt-item--unread');
    // El punto y el ícono son decorativos; el título en negrita lo da el modificador `--unread` (CSS).
    expect(row.querySelector('.nt-item__dot')).toHaveAttribute('aria-hidden', 'true');
    expect(row.querySelector('.nt-item__icon')).toHaveAttribute('aria-hidden', 'true');
    userEvent.click(item);
    expect(onActivate).toHaveBeenCalledWith(n1, expect.objectContaining({ route: '/events/e-1' }));
  });

  it('un ítem leído no expone "No leída"', () => {
    renderWithProviders(
      <ul>
        <NotificationItem notification={n3} variant="panel" onActivate={jest.fn()} now={NOW} />
      </ul>
    );
    expect(screen.queryByText('No leída')).toBeNull();
  });

  it('TS-21 un tipo desconocido no se renderiza', () => {
    const unknown = { ...n1, type: 'unknown_type' } as unknown as AppNotification;
    renderWithProviders(
      <ul>
        <NotificationItem notification={unknown} variant="panel" onActivate={jest.fn()} />
      </ul>
    );
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('TS-55 en la página la acción es primary si es vigente y secondary si no', () => {
    const onActivate = jest.fn();
    renderWithProviders(
      <ul>
        <NotificationItem notification={n1} variant="page" onActivate={onActivate} now={NOW} />
        <NotificationItem notification={n3} variant="page" onActivate={onActivate} now={NOW} />
      </ul>
    );
    expect(screen.getByRole('button', { name: 'Ir a votar' })).toHaveClass('ui-button--primary');
    expect(screen.getByRole('button', { name: 'Ver evento' })).toHaveClass('ui-button--secondary');
    expect(screen.getByText('Votación')).toBeInTheDocument();
    expect(screen.getByText('Mis eventos')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Ver evento' }));
    expect(onActivate).toHaveBeenCalledWith(n3, expect.objectContaining({ route: '/events/e-3' }));
  });
});
