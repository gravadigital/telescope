import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('TS-58: título con el nivel pedido y acción', () => {
    const fn = jest.fn();
    render(
      <EmptyState
        title="Todavía no hay inscriptos"
        description="Compartí el enlace de invitación."
        headingLevel={3}
        action={{ label: 'Compartir', onClick: fn }}
      />
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'Todavía no hay inscriptos' })
    ).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Compartir' }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('page usa h1 por defecto y acción como enlace con href', () => {
    render(<EmptyState variant="page" title="No existe" action={{ label: 'Volver', href: '/' }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'No existe' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/');
  });
});
