import { render, screen } from '@testing-library/react';
import Card from './Card';

describe('Card', () => {
  it('TS-59: section con título es una región con nombre', () => {
    render(
      <Card variant="raised" title="Tu próximo paso" eyebrow="TU PRÓXIMO PASO">
        x
      </Card>
    );
    expect(screen.getByRole('region', { name: 'Tu próximo paso' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Tu próximo paso' })).toBeInTheDocument();
    expect(screen.getByText('TU PRÓXIMO PASO')).toBeInTheDocument();
  });

  it('interactive como enlace', () => {
    render(
      <Card variant="interactive" as="a" href="/events/1">
        Evento
      </Card>
    );
    expect(screen.getByRole('link', { name: 'Evento' })).toHaveAttribute('href', '/events/1');
  });
});
