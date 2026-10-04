import { render, screen } from '@testing-library/react';
import StatusPill from './StatusPill';

describe('StatusPill', () => {
  it('TS-59: texto, ícono decorativo y sin role=status', () => {
    const { container } = render(
      <StatusPill tone="success" icon="check">
        Enviado
      </StatusPill>
    );
    expect(screen.getByText('Enviado')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
