import { render, screen } from '@testing-library/react';
import StatTile from './StatTile';

describe('StatTile', () => {
  it('TS-57: texto accesible y sin "0" falso al cargar', () => {
    const { rerender } = render(
      <StatTile label="Inscriptos" value={4} total={20} accessibleText="Inscriptos: 4 de 20" />
    );
    expect(screen.getByText('Inscriptos: 4 de 20')).toBeInTheDocument();

    rerender(
      <StatTile label="Inscriptos" value={0} total={20} loading accessibleText="Inscriptos: 4 de 20" />
    );
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.queryByText(/4/)).toBeNull();
  });
});
