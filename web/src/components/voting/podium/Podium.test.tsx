import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import Podium from './Podium';
import type { AttachmentResult } from '../../../types';

const r = (id: string, pid: string, name: string, file: string, score: number, rank: number): AttachmentResult => ({
  attachment_id: id,
  filename: file,
  participant_id: pid,
  participant_name: name,
  mbc_score: score,
  global_rank: rank,
  adjusted_rank: rank,
  vote_count: 3,
  average_rank: rank,
});

const podium = [
  r('a-2', 'u-2', 'Bruno Ríos', 'sol.png', 0.74, 1),
  r('a-3', 'u-3', 'Carla Méndez', 'luna.pdf', 0.68, 2),
  r('a-4', 'u-4', 'Diego Sosa', 'mar.jpg', 0.51, 3),
];

describe('Podium', () => {
  it('TS-41: 3 puestos en orden', () => {
    renderWithProviders(<Podium entries={podium} currentUserId={null} />);
    const list = screen.getByRole('list', { name: 'Podio' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Puesto 1');
    expect(items[0]).toHaveTextContent('Bruno Ríos');
    expect(items[0]).toHaveTextContent('sol.png');
    expect(items[0]).toHaveTextContent('7,4 pts');
    expect(items[1]).toHaveTextContent('Puesto 2');
    expect(items[1]).toHaveTextContent('6,8 pts');
    expect(items[2]).toHaveTextContent('Puesto 3');
    expect(items[2]).toHaveTextContent('5,1 pts');
  });

  it('TS-42: resalta al usuario con "Tú"', () => {
    renderWithProviders(<Podium entries={podium} currentUserId="u-3" />);
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveTextContent('Tú');
    expect(items[1]).toHaveClass('vt-podium__item--you');
    expect(items[0]).not.toHaveClass('vt-podium__item--you');
  });

  it('TS-44: sin nombre muestra un guion', () => {
    renderWithProviders(
      <Podium entries={[{ ...podium[0], participant_name: undefined }]} currentUserId={null} />
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('TS-45: en inglés usa punto decimal', () => {
    renderWithProviders(<Podium entries={podium} currentUserId="u-2" />, { locale: 'en' });
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Place 1');
    expect(items[0]).toHaveTextContent('7.4 pts');
    expect(items[0]).toHaveTextContent('You');
  });
});
