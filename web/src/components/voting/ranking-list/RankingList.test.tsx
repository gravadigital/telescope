import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import RankingList from './RankingList';
import type { AttachmentResult } from '../../../types';

const r = (id: string, pid: string, name: string | undefined, file: string, score: number, rank: number): AttachmentResult => ({
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

const rest = [r('a-1', 'u-1', 'Ana Pérez', 'afiche.pdf', 0.4, 4), r('a-5', 'u-5', 'Eva Torres', 'cielo.gif', 0.22, 5)];

describe('RankingList', () => {
  it('TS-43: tabla desde la 4.ª con la fila del usuario resaltada', () => {
    renderWithProviders(<RankingList entries={rest} currentUserId="u-1" />);
    const table = screen.getByRole('table', { name: 'Ranking completo' });
    ['Posición', 'Participante', 'Propuesta', 'Puntaje'].forEach((h) =>
      expect(within(table).getByRole('columnheader', { name: h })).toBeInTheDocument()
    );
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('4');
    expect(rows[0]).toHaveTextContent('Ana Pérez');
    expect(rows[0]).toHaveTextContent('afiche.pdf');
    expect(rows[0]).toHaveTextContent('4,0 pts');
    expect(rows[0]).toHaveTextContent('Tú');
    expect(rows[0]).toHaveClass('ui-data-table__row--highlighted');
    expect(rows[1]).toHaveTextContent('2,2 pts');
    expect(rows[1]).not.toHaveClass('ui-data-table__row--highlighted');
  });

  it('TS-44: nombre ausente se muestra como guion', () => {
    renderWithProviders(<RankingList entries={[r('a-9', 'u-9', undefined, 'x.pdf', 0.1, 4)]} currentUserId={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('TS-45: en inglés', () => {
    renderWithProviders(<RankingList entries={rest} currentUserId="u-1" />, { locale: 'en' });
    expect(screen.getByText('4.0 pts')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });
});
