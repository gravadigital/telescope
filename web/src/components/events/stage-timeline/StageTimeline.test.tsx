import fs from 'fs';
import path from 'path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StageTimeline, { StageTimelineProps } from './StageTimeline';

const props: StageTimelineProps = {
  current: 'participation',
  stageLabels: {
    creation: 'Creación',
    participation: 'Participación',
    voting: 'Votación',
    results: 'Resultados',
  },
  subtitles: {
    creation: 'Evento configurado',
    participation: 'Cierra 10 oct',
    voting: 'Evaluás a otros participantes',
    results: 'Ranking final',
  },
  nowLabel: 'ahora',
  completedLabel: 'completada',
  pendingLabel: 'pendiente',
  stepOfLabel: 'etapa 2 de 4',
};

describe('StageTimeline', () => {
  it('TS-61: estados de las etapas', () => {
    render(<StageTimeline {...props} />);
    expect(screen.getByRole('list').tagName).toBe('OL');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items.map((li) => li.querySelector('.ev-stage-timeline__name')?.textContent)).toEqual([
      'Creación',
      'Participación',
      'Votación',
      'Resultados',
    ]);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(within(items[1]).getByText('ahora')).toBeInTheDocument();
    expect(within(items[0]).getByText('completada')).toBeInTheDocument();
    expect(within(items[2]).getByText('pendiente')).toBeInTheDocument();
    expect(within(items[3]).getByText('pendiente')).toBeInTheDocument();
    expect(screen.getByText(/etapa 2 de 4/)).toBeInTheDocument();
  });

  it('TS-62: editar solo en la etapa actual editable', () => {
    const fn = jest.fn();
    const { rerender } = render(<StageTimeline {...props} onEditDeadline={fn} editLabel="editar" />);
    userEvent.click(screen.getByRole('button', { name: 'editar' }));
    expect(fn).toHaveBeenCalledWith('participation');

    rerender(<StageTimeline {...props} current="creation" onEditDeadline={fn} editLabel="editar" />);
    expect(screen.queryByRole('button', { name: 'editar' })).toBeNull();
    rerender(<StageTimeline {...props} current="results" onEditDeadline={fn} editLabel="editar" />);
    expect(screen.queryByRole('button', { name: 'editar' })).toBeNull();
  });

  it('TS-63: responsive por CSS y variante compacta', () => {
    const css = fs.readFileSync(path.join(__dirname, 'StageTimeline.css'), 'utf8');
    const idx = css.indexOf('@media (min-width: 768px)');
    const base = css.slice(0, idx);
    const desktop = css.slice(idx);
    expect(base).toMatch(/\.ev-stage-timeline__summary\s*\{[^}]*display:\s*block/);
    expect(base).toMatch(/\.ev-stage-timeline__list\s*\{[^}]*display:\s*none/);
    expect(desktop).toMatch(/\.ev-stage-timeline__summary\s*\{[^}]*display:\s*none/);
    expect(desktop).toMatch(/\.ev-stage-timeline__list\s*\{[^}]*display:\s*flex/);

    render(<StageTimeline {...props} variant="compact" onEditDeadline={jest.fn()} editLabel="editar" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items.map((li) => li.querySelector('.ev-stage-timeline__name')?.textContent)).toEqual([
      'Creación',
      'Participación',
      'Votación',
      'Resultados',
    ]);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByText('Cierra 10 oct')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/etapa 2 de 4/)).toBeNull();
  });
});
