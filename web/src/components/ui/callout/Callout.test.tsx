import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Callout from './Callout';

describe('Callout', () => {
  it('TS-54: error con reintento', () => {
    const retry = jest.fn();
    const { rerender } = render(
      <Callout tone="error" action={{ label: 'Reintentar', onClick: retry }}>
        No pudimos cargar los participantes.
      </Callout>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar los participantes.');
    userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalledTimes(1);

    rerender(
      <Callout tone="error" action={{ label: 'Reintentar', onClick: retry, busy: true }}>
        No pudimos cargar los participantes.
      </Callout>
    );
    expect(screen.getByRole('button', { name: 'Reintentar' })).toHaveAttribute('aria-busy', 'true');
  });

  it('TS-55: info sin rol y con ícono decorativo', () => {
    const { container } = render(
      <Callout tone="info" title="DESPUÉS">
        Al cerrar la inscripción…
      </Callout>
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
